import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { LegalDoc } from '../models/LegalDoc.js'
import { requireAuth, signAccess, signRefresh } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import { smsService } from '../services/smsService.js'
import { serializeBranding } from '../lib/mediaUrl.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'
import {
  buildSsoAuthorizeUrl,
  emailAllowedForTenant,
  exchangeSsoCode,
  parseSsoState,
  resolveSsoProviders,
  SSO_PROVIDERS,
  ssoProviderConfigured,
  ssoProviderLabel,
} from '../lib/loginOidc.js'
import {
  generateOtpCode,
  hashOtp,
  maskDestination,
  otpTtlMinutes,
  resolveTwoFactorMethod,
  shouldChallengeTwoFactor,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
} from '../lib/loginTwoFactor.js'
import {
  hashConsumedJti,
  mintLoginToken,
  parseLoginToken,
  verifyLegacyLoginToken,
} from '../lib/loginTokenAuth.js'

const router = Router()
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const PASSWORD_RESET_EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60)

function buildResetPasswordUrl(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/reset-password?token=${encodeURIComponent(token)}`
}

function frontendBase(app = 'u') {
  if (app === 'a') {
    return (process.env.ADMIN_URL || 'http://localhost:5174').replace(/\/$/, '')
  }
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function caps(user, tenant) {
  return [...new Set([...(tenant.capabilities || []), ...(user.capabilities || [])])]
}

function sessionPayload(user, tenant) {
  return {
    accessToken: signAccess({
      sub: user._id.toString(),
      empId: tenant._id.toString(),
      roles: user.roles,
    }),
    refreshToken: signRefresh({
      sub: user._id.toString(),
      empId: tenant._id.toString(),
      roles: user.roles,
    }),
    user: {
      id: user._id,
      usuario: user.usuario,
      idExterno: user.idExterno,
      nombre: user.nombre,
      apellido: user.apellido || '',
      email: user.email || '',
      telefono: user.telefono || '',
      avatarUrl: user.avatarUrl || '',
      emailVerified: Boolean(user.emailVerifiedAt && user.email),
      pendingEmail: user.pendingEmail || '',
      roles: user.roles,
      capabilities: caps(user, tenant),
      termsAcceptedVersion: user.termsAcceptedVersion || '',
      needsTerms: false,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorMethod: user.twoFactorMethod || 'email',
    },
    tenant: {
      id: tenant._id,
      empCodigo: tenant.empCodigo,
      nombre: tenant.nombre,
      allowDesktop: tenant.allowDesktop,
      branding: serializeBranding(tenant.branding),
      themeMode: tenant.themeMode || 'system',
      uxShell: tenant.uxShell || 'connectia',
      homeVariant: tenant.homeVariant === 'genz' ? 'genz' : 'classic',
      uiLocale: tenant.uiLocale === 'es-CL' ? 'es-CL' : 'es-AR',
      ugc: {
        enabled: Boolean(tenant.ugc?.enabled),
        requireApproval: tenant.ugc?.requireApproval !== false,
      },
    },
  }
}

async function currentTermsVersion(tenantId) {
  const doc =
    (await LegalDoc.findOne({ tenantId, tipo: 'terms', vigente: true }).sort({ createdAt: -1 })) ||
    (await LegalDoc.findOne({ tenantId: null, tipo: 'terms', vigente: true }).sort({ createdAt: -1 }))
  return doc
}

async function attachTermsMeta(payload, user, tenant) {
  const terms = await currentTermsVersion(tenant._id)
  const version = terms?.version || ''
  payload.user.needsTerms = Boolean(version && user.termsAcceptedVersion !== version)
  payload.terms = terms ? { version: terms.version, titulo: terms.titulo } : null
  return payload
}

async function issueSession(user, tenant) {
  const payload = sessionPayload(user, tenant)
  const refreshHash = hashToken(payload.refreshToken)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-9), refreshHash]
  user.failedLoginAttempts = 0
  user.lockUntil = null
  user.lastLoginAt = new Date()
  user.twoFactorCodeHash = ''
  user.twoFactorExpires = null
  await user.save()
  return attachTermsMeta(payload, user, tenant)
}

async function failLogin(user) {
  if (!user) return
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
  if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_MS)
    user.failedLoginAttempts = 0
  }
  await user.save()
}

function isLocked(user) {
  return user.lockUntil && user.lockUntil.getTime() > Date.now()
}

async function sendTwoFactorChallenge(user, tenant, req) {
  const method = resolveTwoFactorMethod(user, tenant)
  const code = generateOtpCode()
  const ttl = otpTtlMinutes()
  user.twoFactorCodeHash = hashOtp(code)
  user.twoFactorExpires = new Date(Date.now() + ttl * 60 * 1000)
  await user.save()

  let sent = { success: false }
  if (method === 'sms') {
    sent = await smsService.sendTwoFactorCode(user.telefono, {
      code,
      brandName: tenant.nombre || 'Connectia',
      expiresInMinutes: ttl,
    })
  } else {
    sent = await emailService.sendTwoFactorEmail(user.email, {
      nombre: user.nombre || user.usuario,
      code,
      expiresInMinutes: ttl,
      brandName: tenant.nombre || 'Connectia',
    })
  }

  if (!sent?.success) {
    const err = new Error(
      method === 'sms'
        ? 'No se pudo enviar el SMS de verificaci?n'
        : 'No se pudo enviar el email de verificaci?n',
    )
    err.status = 500
    throw err
  }

  const challengeToken = signTwoFactorChallenge({
    userId: user._id.toString(),
    empId: tenant._id.toString(),
    method,
  })

  const meta = reqMeta(req)
  recordActivity({
    tenantId: tenant._id,
    userId: user._id,
    action: 'login_2fa_challenge',
    ...meta,
  })

  return {
    requires2fa: true,
    challengeToken,
    method,
    destination: maskDestination(method, user.email, user.telefono),
    expiresInMinutes: ttl,
    ...(sent.devFallback ? { devFallback: true } : {}),
  }
}

async function findOrProvisionSsoUser(tenant, identity, provider) {
  const authConfig = tenant.authConfig || {}
  if (!identity.email && !identity.sub) {
    const err = new Error('El IdP no devolvi? email ni subject')
    err.status = 400
    throw err
  }
  if (identity.email && !emailAllowedForTenant(identity.email, authConfig)) {
    const err = new Error('El dominio de email no est? autorizado para esta comunidad')
    err.status = 403
    throw err
  }

  let user = null
  if (identity.sub) {
    user = await User.findOne({
      tenantId: tenant._id,
      [`ssoSubjects.${provider}`]: identity.sub,
      activo: true,
    })
  }
  if (!user && identity.email) {
    user = await User.findOne({
      tenantId: tenant._id,
      email: identity.email,
      activo: true,
    })
  }

  const origenMap = { microsoft: 'ENTRA', google: 'GOOGLE', okta: 'OKTA' }

  if (!user) {
    if (!authConfig.ssoAutoProvision) {
      const err = new Error(
        'No hay una cuenta vinculada a este acceso SSO. Pedile a un admin que te invite o active auto-alta.',
      )
      err.status = 404
      throw err
    }
    const baseUser =
      identity.email?.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') || `sso_${provider}`
    let usuario = baseUser.toLowerCase().slice(0, 40) || `sso_${Date.now()}`
    const clash = await User.findOne({ tenantId: tenant._id, usuario })
    if (clash) usuario = `${usuario}_${crypto.randomBytes(2).toString('hex')}`
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    user = await User.create({
      tenantId: tenant._id,
      usuario,
      passwordHash,
      nombre: identity.givenName || identity.name || usuario,
      apellido: identity.familyName || '',
      email: identity.email || '',
      emailVerifiedAt: identity.email ? new Date() : null,
      roles: ['member'],
      activo: true,
      origen: origenMap[provider] || 'SSO',
      ssoSubjects: identity.sub ? { [provider]: identity.sub } : {},
    })
    return user
  }

  if (identity.sub) {
    if (!user.ssoSubjects) user.ssoSubjects = new Map()
    user.ssoSubjects.set(provider, identity.sub)
  }
  if (identity.email && !user.email) {
    user.email = identity.email
    user.emailVerifiedAt = new Date()
  }
  if (!user.origen || user.origen === 'MANUAL') {
    user.origen = origenMap[provider] || user.origen
  }
  await user.save()
  return user
}

function redirectLoginError(app, message) {
  const base = frontendBase(app)
  return `${base}/login?ssoError=${encodeURIComponent(message)}`
}

function redirectLoginSuccess(app, tokens, returnTo = '/') {
  const base = frontendBase(app)
  const q = new URLSearchParams({
    sso: '1',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    redirect: returnTo || '/',
  })
  return `${base}/login?${q}`
}

/** Pre-login: ADR-GAPS ?A ? no enumerar usuarios */
router.post('/pre-login', async (req, res, next) => {
  try {
    const { empCodigo, host } = req.body || {}
    let tenant = null
    if (empCodigo) {
      tenant = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase() })
    } else if (host) {
      const sub = String(host).split('.')[0]?.toUpperCase()
      if (sub) tenant = await Tenant.findOne({ empCodigo: sub })
    }
    if (!tenant || !tenant.activo) {
      return res.json({
        found: false,
        loginMethods: ['password', 'id'],
        allowDesktop: true,
        branding: { primary: '#8554C9', secondary: '#6B3FA0' },
        ssoProviders: [],
      })
    }
    const methods = tenant.loginMethods?.length ? tenant.loginMethods : ['password', 'id']
    res.json({
      found: true,
      empId: tenant._id,
      empCodigo: tenant.empCodigo,
      nombre: tenant.nombre,
      loginMethods: methods,
      allowDesktop: tenant.allowDesktop,
      branding: serializeBranding(tenant.branding),
      uxShell: tenant.uxShell || 'connectia',
      themeMode: tenant.themeMode || 'system',
      ssoProviders: resolveSsoProviders(methods),
      authConfig: {
        twoFactorRequired: Boolean(tenant.authConfig?.twoFactorRequired),
        ssoAutoProvision: Boolean(tenant.authConfig?.ssoAutoProvision),
      },
      availableSso: SSO_PROVIDERS.map((id) => ({
        id,
        label: ssoProviderLabel(id),
        enabled: methods.map((m) => String(m).toLowerCase()).includes(id),
        configured: ssoProviderConfigured(id),
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Selector multi-empresa (?1.15) */
router.post('/resolve-tenants', async (req, res, next) => {
  try {
    const { identifier } = req.body || {}
    const key = String(identifier || '').trim()
    if (!key || key.length < 2) {
      return res.status(400).json({ error: 'identifier requerido' })
    }
    const emailLike = key.includes('@')
    const query = emailLike
      ? { email: key.toLowerCase(), activo: true }
      : {
          $or: [
            { usuario: key.toLowerCase(), activo: true },
            { idExterno: key, activo: true },
          ],
        }
    const users = await User.find(query).limit(20).select('tenantId email usuario idExterno')
    const tenantIds = [...new Set(users.map((u) => String(u.tenantId)))]
    const tenants = await Tenant.find({ _id: { $in: tenantIds }, activo: true })
    const byId = new Map(tenants.map((t) => [String(t._id), t]))
    const items = users
      .map((u) => {
        const t = byId.get(String(u.tenantId))
        if (!t) return null
        return {
          empCodigo: t.empCodigo,
          nombre: t.nombre,
          logoUrl: t.branding?.logoUrl || '',
          primary: t.branding?.primary || '#8554C9',
        }
      })
      .filter(Boolean)
    const seen = new Set()
    const unique = []
    for (const it of items) {
      if (seen.has(it.empCodigo)) continue
      seen.add(it.empCodigo)
      unique.push(it)
    }
    res.json({ count: unique.length, tenants: unique })
  } catch (e) {
    next(e)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { empCodigo, usuario, password, mode } = req.body || {}
    if (!empCodigo || !usuario || !password) {
      return res.status(400).json({ error: 'empCodigo, usuario y password son obligatorios' })
    }
    const tenant = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase(), activo: true })
    if (!tenant) {
      return res.status(401).json({ error: 'Credenciales inv?lidas' })
    }

    const key = String(usuario).trim()
    const query =
      mode === 'id'
        ? { tenantId: tenant._id, idExterno: key, activo: true }
        : { tenantId: tenant._id, usuario: key.toLowerCase(), activo: true }

    const user = await User.findOne(query)
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inv?lidas' })
    }
    if (isLocked(user)) {
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente. Reintent? en 15 minutos.',
        lockUntil: user.lockUntil,
      })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      await failLogin(user)
      const meta = reqMeta(req)
      recordActivity({
        tenantId: tenant._id,
        userId: user._id,
        action: 'login_failed',
        ...meta,
      })
      return res.status(401).json({ error: 'Credenciales inv?lidas' })
    }

    if (shouldChallengeTwoFactor(user, tenant)) {
      const method = resolveTwoFactorMethod(user, tenant)
      if (method === 'sms' && !user.telefono) {
        return res.status(400).json({ error: '2FA por SMS requiere tel?fono en el perfil' })
      }
      if (method === 'email' && !user.email) {
        return res.status(400).json({ error: '2FA por email requiere email en el perfil' })
      }
      const challenge = await sendTwoFactorChallenge(user, tenant, req)
      return res.json(challenge)
    }

    const session = await issueSession(user, tenant)
    const meta = reqMeta(req)
    recordActivity({
      tenantId: tenant._id,
      userId: user._id,
      action: 'login',
      ...meta,
    })
    res.json(session)
  } catch (e) {
    next(e)
  }
})

router.post('/2fa/verify', async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body || {}
    if (!challengeToken || !code) {
      return res.status(400).json({ error: 'challengeToken y code son obligatorios' })
    }
    const decoded = verifyTwoFactorChallenge(challengeToken)
    if (!decoded) return res.status(401).json({ error: 'Desaf?o 2FA inv?lido o expirado' })

    const user = await User.findById(decoded.sub)
    const tenant = await Tenant.findById(decoded.empId)
    if (!user?.activo || !tenant?.activo) {
      return res.status(401).json({ error: 'Desaf?o 2FA inv?lido' })
    }
    if (
      !user.twoFactorCodeHash ||
      !user.twoFactorExpires ||
      user.twoFactorExpires.getTime() < Date.now()
    ) {
      return res.status(401).json({ error: 'C?digo expirado. Solicit? uno nuevo.' })
    }
    if (hashOtp(String(code).trim()) !== user.twoFactorCodeHash) {
      await failLogin(user)
      return res.status(401).json({ error: 'C?digo incorrecto' })
    }

    const session = await issueSession(user, tenant)
    const meta = reqMeta(req)
    recordActivity({
      tenantId: tenant._id,
      userId: user._id,
      action: 'login_2fa_ok',
      ...meta,
    })
    res.json(session)
  } catch (e) {
    next(e)
  }
})

router.post('/2fa/resend', async (req, res, next) => {
  try {
    const { challengeToken } = req.body || {}
    const decoded = verifyTwoFactorChallenge(challengeToken)
    if (!decoded) return res.status(401).json({ error: 'Desaf?o 2FA inv?lido o expirado' })
    const user = await User.findById(decoded.sub)
    const tenant = await Tenant.findById(decoded.empId)
    if (!user?.activo || !tenant?.activo) {
      return res.status(401).json({ error: 'Desaf?o 2FA inv?lido' })
    }
    const challenge = await sendTwoFactorChallenge(user, tenant, req)
    res.json(challenge)
  } catch (e) {
    next(e)
  }
})

router.get('/sso/:provider/start', async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase()
    if (!SSO_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Proveedor inv?lido' })
    }
    const empCodigo = String(req.query.empCodigo || req.query.emp || '').toUpperCase()
    const app = String(req.query.app || 'u').toLowerCase() === 'a' ? 'a' : 'u'
    const returnTo = String(req.query.returnTo || '/')
    if (!empCodigo) return res.status(400).json({ error: 'empCodigo requerido' })

    const tenant = await Tenant.findOne({ empCodigo, activo: true })
    if (!tenant) return res.status(404).json({ error: 'Empresa no encontrada' })

    const methods = (tenant.loginMethods || []).map((m) => String(m).toLowerCase())
    if (!methods.includes(provider)) {
      return res.status(403).json({ error: `SSO ${provider} no habilitado en esta comunidad` })
    }
    if (!ssoProviderConfigured(provider)) {
      return res.status(503).json({
        error: `SSO ${ssoProviderLabel(provider)} no configurado en el servidor (faltan variables de entorno)`,
      })
    }

    const { url } = buildSsoAuthorizeUrl({
      provider,
      empCodigo,
      tenantId: tenant._id,
      app,
      returnTo,
    })
    if (req.query.redirect === '0') {
      return res.json({ url })
    }
    res.redirect(url)
  } catch (e) {
    next(e)
  }
})

router.get('/sso/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase()
  let app = 'u'
  try {
    const { code, state, error, error_description: errDesc } = req.query
    const parsed = parseSsoState(state)
    app = parsed?.app === 'a' ? 'a' : 'u'
    if (error) {
      return res.redirect(redirectLoginError(app, String(errDesc || error)))
    }
    if (!code || !parsed || parsed.provider !== provider) {
      return res.redirect(redirectLoginError(app, 'Callback SSO inv?lido'))
    }

    const tenant = await Tenant.findById(parsed.tenantId)
    if (!tenant?.activo) {
      return res.redirect(redirectLoginError(app, 'Empresa inactiva'))
    }

    const identity = await exchangeSsoCode({
      provider,
      code: String(code),
      verifier: parsed.verifier,
    })
    const user = await findOrProvisionSsoUser(tenant, identity, provider)
    if (isLocked(user)) {
      return res.redirect(redirectLoginError(app, 'Cuenta bloqueada temporalmente'))
    }

    if (shouldChallengeTwoFactor(user, tenant)) {
      const challenge = await sendTwoFactorChallenge(user, tenant, req)
      const base = frontendBase(app)
      const q = new URLSearchParams({
        requires2fa: '1',
        challengeToken: challenge.challengeToken,
        method: challenge.method,
        destination: challenge.destination,
        emp: tenant.empCodigo,
      })
      return res.redirect(`${base}/login?${q}`)
    }

    const session = await issueSession(user, tenant)
    recordActivity({
      tenantId: tenant._id,
      userId: user._id,
      action: 'login_sso',
      ...reqMeta(req),
      meta: { provider },
    })
    return res.redirect(redirectLoginSuccess(app, session, parsed.returnTo || '/'))
  } catch (e) {
    console.error('[sso callback]', e)
    return res.redirect(redirectLoginError(app, e.message || 'Error SSO'))
  }
})

router.post('/token-login', async (req, res, next) => {
  try {
    const { token } = req.body || {}
    const parsed = parseLoginToken(token)
    if (!parsed) return res.status(401).json({ error: 'Token inv?lido o expirado' })

    const tenant = await Tenant.findById(parsed.empId)
    if (!tenant?.activo) return res.status(401).json({ error: 'Token inv?lido' })

    const methods = (tenant.loginMethods || []).map((m) => String(m).toLowerCase())
    if (methods.includes('token') === false && process.env.LOGIN_TOKEN_REQUIRE_METHOD === '1') {
      return res.status(403).json({ error: 'Login por token no habilitado' })
    }

    const user = await User.findById(parsed.userId)
    if (!user?.activo || String(user.tenantId) !== String(tenant._id)) {
      return res.status(401).json({ error: 'Token inv?lido' })
    }

    const jtiHash = hashConsumedJti(parsed.jti)
    if ((user.consumedLoginJtis || []).includes(jtiHash)) {
      return res.status(401).json({ error: 'Token ya utilizado' })
    }
    user.consumedLoginJtis = [...(user.consumedLoginJtis || []).slice(-49), jtiHash]

    if (shouldChallengeTwoFactor(user, tenant)) {
      const challenge = await sendTwoFactorChallenge(user, tenant, req)
      return res.json(challenge)
    }

    const session = await issueSession(user, tenant)
    recordActivity({
      tenantId: tenant._id,
      userId: user._id,
      action: 'login_token',
      ...reqMeta(req),
    })
    res.json(session)
  } catch (e) {
    next(e)
  }
})

router.post('/legacy-login', async (req, res, next) => {
  try {
    const { empCodigo, token } = req.body || {}
    if (!empCodigo || !token) {
      return res.status(400).json({ error: 'empCodigo y token son obligatorios' })
    }
    const tenant = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase(), activo: true })
    if (!tenant) return res.status(401).json({ error: 'Credenciales inv?lidas' })

    const methods = (tenant.loginMethods || []).map((m) => String(m).toLowerCase())
    if (!methods.includes('legacy') && process.env.LOGIN_LEGACY_REQUIRE_METHOD === '1') {
      return res.status(403).json({ error: 'Login legacy no habilitado' })
    }

    const decoded = verifyLegacyLoginToken(token, tenant)
    if (!decoded) return res.status(401).json({ error: 'Token legacy inv?lido o expirado' })

    const usuario = decoded.usuario || decoded.user || decoded.username
    const idExterno = decoded.idExterno || decoded.legajo || decoded.id
    const email = decoded.email ? String(decoded.email).toLowerCase() : ''

    let user = null
    if (usuario) {
      user = await User.findOne({
        tenantId: tenant._id,
        usuario: String(usuario).toLowerCase(),
        activo: true,
      })
    }
    if (!user && idExterno) {
      user = await User.findOne({ tenantId: tenant._id, idExterno: String(idExterno), activo: true })
    }
    if (!user && email) {
      user = await User.findOne({ tenantId: tenant._id, email, activo: true })
    }
    if (!user) return res.status(401).json({ error: 'Usuario legacy no encontrado' })

    if (shouldChallengeTwoFactor(user, tenant)) {
      const challenge = await sendTwoFactorChallenge(user, tenant, req)
      return res.json(challenge)
    }

    const session = await issueSession(user, tenant)
    recordActivity({
      tenantId: tenant._id,
      userId: user._id,
      action: 'login_legacy',
      ...reqMeta(req),
    })
    res.json(session)
  } catch (e) {
    next(e)
  }
})

router.post('/mint-login-token', requireAuth, async (req, res, next) => {
  try {
    const roles = req.user.roles || []
    const isAdmin =
      roles.includes('admin') || roles.includes('platform_admin') || roles.includes('rrhh')
    if (!isAdmin) return res.status(403).json({ error: 'Sin permiso' })
    const targetUserId = req.body?.userId || req.user._id
    const user = await User.findById(targetUserId)
    if (!user || String(user.tenantId) !== String(req.tenant._id)) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const minted = mintLoginToken({
      userId: user._id,
      empId: req.tenant._id,
      empCodigo: req.tenant.empCodigo,
    })
    const base = frontendBase('u')
    res.json({
      token: minted.token,
      expiresAt: minted.expiresAt,
      loginUrl: `${base}/login?token=${encodeURIComponent(minted.token)}`,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' })
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(decoded.sub)
    if (!user || !user.activo) return res.status(401).json({ error: 'Refresh inv?lido' })
    const hash = hashToken(refreshToken)
    if (!(user.refreshTokens || []).includes(hash)) {
      return res.status(401).json({ error: 'Refresh revocado' })
    }
    const tenant = await Tenant.findById(user.tenantId)
    if (!tenant?.activo) return res.status(401).json({ error: 'Tenant inactivo' })
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hash)
    const session = await issueSession(user, tenant)
    res.json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      tenant: session.tenant,
      terms: session.terms,
    })
  } catch {
    res.status(401).json({ error: 'Refresh inv?lido' })
  }
})

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { scope = 'current', refreshToken } = req.body || {}
    const user = await User.findById(req.user._id)
    if (!user) return res.status(401).json({ error: 'Sesi?n inv?lida' })
    if (scope === 'all') {
      user.refreshTokens = []
    } else if (refreshToken) {
      const hash = hashToken(refreshToken)
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== hash)
    }
    await user.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: user.tenantId,
      userId: user._id,
      action: scope === 'all' ? 'logout_all' : 'logout',
      ...meta,
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.get('/legal/:tipo', async (req, res, next) => {
  try {
    const tipo = req.params.tipo === 'privacy' ? 'privacy' : 'terms'
    const { empCodigo } = req.query
    let tenantId = null
    if (empCodigo) {
      const t = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase() })
      tenantId = t?._id || null
    }
    const doc =
      (tenantId &&
        (await LegalDoc.findOne({ tenantId, tipo, vigente: true }).sort({ createdAt: -1 }))) ||
      (await LegalDoc.findOne({ tenantId: null, tipo, vigente: true }).sort({ createdAt: -1 }))
    if (!doc) return res.status(404).json({ error: 'Documento no disponible' })
    res.json({
      tipo: doc.tipo,
      version: doc.version,
      titulo: doc.titulo,
      cuerpo: doc.cuerpo,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/accept-terms', requireAuth, async (req, res, next) => {
  try {
    const { version } = req.body || {}
    const terms = await currentTermsVersion(req.tenant._id)
    if (!terms) return res.status(400).json({ error: 'No hay t?rminos vigentes' })
    if (version && version !== terms.version) {
      return res.status(400).json({ error: 'Versi?n de t?rminos desactualizada' })
    }
    const user = await User.findById(req.user._id)
    user.termsAcceptedVersion = terms.version
    user.termsAcceptedAt = new Date()
    await user.save()
    res.json({
      ok: true,
      termsAcceptedVersion: user.termsAcceptedVersion,
      termsAcceptedAt: user.termsAcceptedAt,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { empCodigo, usuario } = req.body || {}
    const generic = {
      ok: true,
      message: 'Si la cuenta existe y tiene email, enviamos instrucciones de recuperaci?n.',
    }
    if (!empCodigo || !usuario) return res.json(generic)

    const tenant = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase(), activo: true })
    if (!tenant) return res.json(generic)

    const key = String(usuario).trim()
    const user =
      (await User.findOne({ tenantId: tenant._id, usuario: key.toLowerCase(), activo: true })) ||
      (await User.findOne({ tenantId: tenant._id, idExterno: key, activo: true }))

    if (!user?.email) return res.json(generic)

    const token = jwt.sign(
      { sub: user._id.toString(), empId: tenant._id.toString(), purpose: 'reset' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: `${PASSWORD_RESET_EXPIRY_MINUTES}m` },
    )
    const resetUrl = buildResetPasswordUrl(token)
    const emailResult = await emailService.sendPasswordResetEmail(user.email, {
      nombre: user.nombre || user.usuario,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      brandName: tenant.nombre || 'Connectia',
    })

    if (!emailResult?.success) {
      console.error('[forgot-password] mail fall?:', emailResult?.error || emailResult?.reason)
      if (!emailService.isConfigured) {
        console.log(`[forgot-password] DEV fallback resetUrl=${resetUrl}`)
        return res.json({
          ...generic,
          message:
            'Mail no configurado (EMAIL_USER/EMAIL_PASSWORD). En local el link qued? en el log del backend.',
          devFallback: true,
        })
      }
      return res.status(500).json({
        error: 'No se pudo enviar el email de recuperaci?n. Reintent? en unos minutos.',
      })
    }

    res.json(generic)
  } catch (e) {
    next(e)
  }
})

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Token y password (m?n. 8) requeridos' })
    }
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Token inv?lido' })
    const user = await User.findById(decoded.sub)
    if (!user?.activo) return res.status(400).json({ error: 'Token inv?lido' })
    user.passwordHash = await bcrypt.hash(password, 12)
    user.refreshTokens = []
    user.failedLoginAttempts = 0
    user.lockUntil = null
    await user.save()
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'Token inv?lido o expirado' })
  }
})

export default router
