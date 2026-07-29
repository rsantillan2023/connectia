import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { LegalDoc } from '../models/LegalDoc.js'
import { requireAuth, signAccess, signRefresh } from '../middleware/auth.js'
import { emailService } from '../services/emailService.js'
import { serializeBranding } from '../lib/mediaUrl.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const PASSWORD_RESET_EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60)

function buildResetPasswordUrl(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/reset-password?token=${encodeURIComponent(token)}`
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
    },
    tenant: {
      id: tenant._id,
      empCodigo: tenant.empCodigo,
      nombre: tenant.nombre,
      allowDesktop: tenant.allowDesktop,
      branding: serializeBranding(tenant.branding),
      themeMode: tenant.themeMode || 'system',
      uxShell: tenant.uxShell || 'connectia',
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
  payload.terms = terms
    ? { version: terms.version, titulo: terms.titulo }
    : null
  return payload
}

async function issueSession(user, tenant) {
  const payload = sessionPayload(user, tenant)
  const refreshHash = hashToken(payload.refreshToken)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-9), refreshHash]
  user.failedLoginAttempts = 0
  user.lockUntil = null
  user.lastLoginAt = new Date()
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

/** Pre-login: ADR-GAPS §A — no enumerar usuarios */
router.post('/pre-login', async (req, res, next) => {
  try {
    const { empCodigo, host } = req.body || {}
    let tenant = null
    if (empCodigo) {
      tenant = await Tenant.findOne({ empCodigo: String(empCodigo).toUpperCase() })
    } else if (host) {
      // resolución por host: metadata futura; hoy match empCodigo en subdomain demo
      const sub = String(host).split('.')[0]?.toUpperCase()
      if (sub) tenant = await Tenant.findOne({ empCodigo: sub })
    }
    if (!tenant || !tenant.activo) {
      return res.json({
        found: false,
        loginMethods: ['password', 'id'],
        allowDesktop: true,
        branding: { primary: '#0F766E', secondary: '#134E4A' },
      })
    }
    res.json({
      found: true,
      empId: tenant._id,
      empCodigo: tenant.empCodigo,
      nombre: tenant.nombre,
      loginMethods: tenant.loginMethods?.length ? tenant.loginMethods : ['password', 'id'],
      allowDesktop: tenant.allowDesktop,
      branding: serializeBranding(tenant.branding),
      uxShell: tenant.uxShell || 'connectia',
      themeMode: tenant.themeMode || 'system',
      ssoProviders: (tenant.loginMethods || []).filter((m) => !['password', 'id'].includes(m)),
    })
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
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const key = String(usuario).trim()
    const query =
      mode === 'id'
        ? { tenantId: tenant._id, idExterno: key, activo: true }
        : { tenantId: tenant._id, usuario: key.toLowerCase(), activo: true }

    const user = await User.findOne(query)
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    if (isLocked(user)) {
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente. Reintentá en 15 minutos.',
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
      return res.status(401).json({ error: 'Credenciales inválidas' })
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

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' })
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(decoded.sub)
    if (!user || !user.activo) return res.status(401).json({ error: 'Refresh inválido' })
    const hash = hashToken(refreshToken)
    if (!(user.refreshTokens || []).includes(hash)) {
      return res.status(401).json({ error: 'Refresh revocado' })
    }
    const tenant = await Tenant.findById(user.tenantId)
    if (!tenant?.activo) return res.status(401).json({ error: 'Tenant inactivo' })
    // rotación: quitar el usado, emitir nuevo
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hash)
    const session = await issueSession(user, tenant)
    res.json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      terms: session.terms,
    })
  } catch {
    res.status(401).json({ error: 'Refresh inválido' })
  }
})

/** Cierre de sesión: current | all (ADR-GAPS §A) */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { scope = 'current', refreshToken } = req.body || {}
    const user = await User.findById(req.user._id)
    if (!user) return res.status(401).json({ error: 'Sesión inválida' })
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
    if (!terms) return res.status(400).json({ error: 'No hay términos vigentes' })
    if (version && version !== terms.version) {
      return res.status(400).json({ error: 'Versión de términos desactualizada' })
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

/** Recuperación: envía mail con link (config EMAIL_* como Hiryx / Gmail) */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { empCodigo, usuario } = req.body || {}
    const generic = {
      ok: true,
      message: 'Si la cuenta existe y tiene email, enviamos instrucciones de recuperación.',
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
      console.error('[forgot-password] mail falló:', emailResult?.error || emailResult?.reason)
      // En local sin mail: log del link para no bloquear pruebas
      if (!emailService.isConfigured) {
        console.log(`[forgot-password] DEV fallback resetUrl=${resetUrl}`)
        return res.json({
          ...generic,
          message:
            'Mail no configurado (EMAIL_USER/EMAIL_PASSWORD). En local el link quedó en el log del backend.',
          devFallback: true,
        })
      }
      return res.status(500).json({
        error: 'No se pudo enviar el email de recuperación. Reintentá en unos minutos.',
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
      return res.status(400).json({ error: 'Token y password (mín. 8) requeridos' })
    }
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Token inválido' })
    const user = await User.findById(decoded.sub)
    if (!user?.activo) return res.status(400).json({ error: 'Token inválido' })
    user.passwordHash = await bcrypt.hash(password, 12)
    user.refreshTokens = []
    user.failedLoginAttempts = 0
    user.lockUntil = null
    await user.save()
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'Token inválido o expirado' })
  }
})

export default router
