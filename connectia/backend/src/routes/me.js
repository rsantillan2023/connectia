import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { toPublicMediaUrl, serializeBranding } from '../lib/mediaUrl.js'
import { emailService } from '../services/emailService.js'
import { ProfileFieldDef } from '../models/ProfileFieldDef.js'
import { ActivityEvent } from '../models/ActivityEvent.js'
import {
  serializeFieldDef,
  validateExtraFieldsPayload,
  extraFieldsToObject,
  serializeDevice,
} from '../lib/profileFields.js'
import { recordActivity, reqMeta, serializeActivity } from '../lib/activityLog.js'
import { fetchPeopleCareProfile, patchOwnLegajo } from '../lib/peopleCare.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/avatars')
const EMAIL_CODE_TTL_MIN = Number(process.env.EMAIL_VERIFY_EXPIRY_MINUTES || 15)
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

const router = Router()

function ensureAvatarDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

function serializeProfile(user, tenant) {
  const email = user.email || ''
  const pendingEmail = user.pendingEmail || ''
  return {
    user: {
      id: user._id,
      usuario: user.usuario,
      idExterno: user.idExterno || '',
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      email,
      telefono: user.telefono || '',
      avatarUrl: toPublicMediaUrl(user.avatarUrl || ''),
      emailVerified: Boolean(user.emailVerifiedAt && email),
      emailVerifiedAt: user.emailVerifiedAt || null,
      pendingEmail,
      roles: user.roles || [],
      capabilities: user.capabilities || [],
      origen: user.origen || 'MANUAL',
      extraFields: extraFieldsToObject(user.extraFields),
      deletionRequestedAt: user.deletionRequestedAt || null,
    },
    tenant: {
      id: tenant._id,
      empCodigo: tenant.empCodigo,
      nombre: tenant.nombre,
      allowDesktop: tenant.allowDesktop,
      branding: serializeBranding(tenant.branding),
      themeMode: tenant.themeMode || 'system',
    },
  }
}

function trimStr(v, max = 120) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

function clearEmailChallenge(user) {
  user.pendingEmail = ''
  user.emailVerifyCodeHash = ''
  user.emailVerifyExpires = null
}

async function issueEmailChallenge(user, tenant, newEmail) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  user.pendingEmail = newEmail
  user.emailVerifyCodeHash = hashCode(code)
  user.emailVerifyExpires = new Date(Date.now() + EMAIL_CODE_TTL_MIN * 60 * 1000)
  await user.save()

  const mail = await emailService.sendEmailVerificationCode(newEmail, {
    nombre: user.nombre || user.usuario,
    code,
    expiresInMinutes: EMAIL_CODE_TTL_MIN,
    brandName: tenant.nombre || 'Connectia',
  })

  const payload = {
    ...serializeProfile(user, tenant),
    emailChallenge: {
      sent: Boolean(mail?.success),
      pendingEmail: newEmail,
      expiresInMinutes: EMAIL_CODE_TTL_MIN,
    },
  }

  if (!mail?.success) {
    if (process.env.NODE_ENV !== 'production') {
      payload.emailChallenge.devCode = code
      console.log(`[email-verify] DEV code for ${newEmail}: ${code}`)
    }
    payload.emailChallenge.mailError = mail?.reason || mail?.error || 'No se pudo enviar el mail'
  }
  return payload
}

const avatarStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      ensureAvatarDir()
      cb(null, UPLOAD_DIR)
    } catch (e) {
      cb(e)
    }
  },
  filename(req, file, cb) {
    const rawExt = path.extname(file.originalname || '').toLowerCase()
    const ext = /^\.(jpe?g|png|webp)$/i.test(rawExt) ? rawExt.replace('jpeg', 'jpg') : '.jpg'
    const uid = String(req.user?._id || 'u').slice(-8)
    cb(null, `avatar-${uid}-${Date.now()}${ext === '.jpeg' ? '.jpg' : ext}`)
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|pjpeg|png|webp)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes jpg, png o webp (máx. 5 MB)'))
  },
})

function unlinkQuiet(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    /* ignore */
  }
}

function localPathFromAvatarUrl(url) {
  const publicUrl = toPublicMediaUrl(url || '')
  const m = publicUrl.match(/^\/uploads\/avatars\/(.+)$/i)
  if (!m) return null
  return path.join(UPLOAD_DIR, m[1])
}

/** GET /api/me */
router.get('/', requireAuth, (req, res) => {
  res.json(serializeProfile(req.user, req.tenant))
})

/**
 * PATCH /api/me — datos visibles.
 * El email NO se aplica directo: si cambia, inicia verificación por código.
 */
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    if (body.nombre !== undefined) user.nombre = trimStr(body.nombre, 80)
    if (body.apellido !== undefined) user.apellido = trimStr(body.apellido, 80)
    if (body.telefono !== undefined) {
      const tel = trimStr(body.telefono, 40)
      if (tel && !/^[\d\s+\-().]{6,40}$/.test(tel)) {
        return res.status(400).json({ error: 'Teléfono inválido' })
      }
      user.telefono = tel
    }

    if (!user.nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' })
    }

    let emailChallenge = null
    if (body.email !== undefined) {
      const email = trimStr(body.email, 160).toLowerCase()
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' })
      }
      const current = (user.email || '').toLowerCase()
      if (!email) {
        user.email = ''
        user.emailVerifiedAt = null
        clearEmailChallenge(user)
      } else if (email === current) {
        // sin cambio; si había pending distinto, se puede cancelar
        if (user.pendingEmail && user.pendingEmail !== email) clearEmailChallenge(user)
      } else {
        await user.save()
        const payload = await issueEmailChallenge(user, req.tenant, email)
        return res.json(payload)
      }
    }

    await user.save()
    const out = serializeProfile(user, req.tenant)
    if (emailChallenge) out.emailChallenge = emailChallenge
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: user._id,
      action: 'profile_update',
      ...meta,
    })
    res.json(out)
  } catch (e) {
    next(e)
  }
})

/** POST /api/me/email/request — reenviar / pedir código para pending o body.email */
router.post('/email/request', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    const email = trimStr(req.body?.email || user.pendingEmail || '', 160).toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Indicá un email válido para verificar' })
    }
    if (email === (user.email || '').toLowerCase() && user.emailVerifiedAt) {
      return res.status(400).json({ error: 'Ese email ya está verificado en tu cuenta' })
    }

    const payload = await issueEmailChallenge(user, req.tenant, email)
    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/** POST /api/me/email/confirm — { code } aplica pendingEmail */
router.post('/email/confirm', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim()
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Ingresá el código de 6 dígitos' })
    }
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (!user.pendingEmail || !user.emailVerifyCodeHash || !user.emailVerifyExpires) {
      return res.status(400).json({ error: 'No hay un cambio de email pendiente' })
    }
    if (user.emailVerifyExpires.getTime() < Date.now()) {
      clearEmailChallenge(user)
      await user.save()
      return res.status(400).json({ error: 'El código venció. Pedí uno nuevo.' })
    }
    if (hashCode(code) !== user.emailVerifyCodeHash) {
      return res.status(400).json({ error: 'Código incorrecto' })
    }

    user.email = user.pendingEmail
    user.emailVerifiedAt = new Date()
    clearEmailChallenge(user)
    await user.save()
    res.json(serializeProfile(user, req.tenant))
  } catch (e) {
    next(e)
  }
})

/** POST /api/me/password — { currentPassword, newPassword } */
router.post('/password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '')
    const newPassword = String(req.body?.newPassword || '')
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' })
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' })
    }

    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) return res.status(400).json({ error: 'La contraseña actual no es correcta' })

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    // Cierra otras sesiones (refresh); el access actual sigue hasta que expire
    user.refreshTokens = []
    await user.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: user._id,
      action: 'password_change',
      ...meta,
    })
    res.json({ ok: true, message: 'Contraseña actualizada. Otras sesiones quedaron cerradas.' })
  } catch (e) {
    next(e)
  }
})

/** POST /api/me/avatar — multipart field "file" */
router.post(
  '/avatar',
  requireAuth,
  (req, res, next) => {
    avatarUpload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió la imagen' })
      const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
      if (!user || !user.activo) {
        unlinkQuiet(req.file.path)
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }

      const prevPath = localPathFromAvatarUrl(user.avatarUrl)
      const publicUrl = toPublicMediaUrl(`/uploads/avatars/${req.file.filename}`)
      user.avatarUrl = publicUrl
      await user.save()
      if (prevPath && prevPath !== req.file.path) unlinkQuiet(prevPath)

      res.status(201).json(serializeProfile(user, req.tenant))
    } catch (e) {
      if (req.file?.path) unlinkQuiet(req.file.path)
      next(e)
    }
  },
)

/** DELETE /api/me/avatar */
router.delete('/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })
    const prevPath = localPathFromAvatarUrl(user.avatarUrl)
    user.avatarUrl = ''
    await user.save()
    unlinkQuiet(prevPath)
    res.json(serializeProfile(user, req.tenant))
  } catch (e) {
    next(e)
  }
})

/** GET /api/me/profile-fields — defs activas + valores propios */
router.get('/profile-fields', requireAuth, async (req, res, next) => {
  try {
    const defs = await ProfileFieldDef.find({ tenantId: req.tenant._id, activo: true }).sort({
      orden: 1,
      nombre: 1,
    })
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id }).select('extraFields')
    res.json({
      fields: defs.map(serializeFieldDef),
      values: extraFieldsToObject(user?.extraFields),
    })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/me/profile-fields — { values: { key: value } } */
router.patch('/profile-fields', requireAuth, async (req, res, next) => {
  try {
    const defs = await ProfileFieldDef.find({ tenantId: req.tenant._id, activo: true })
    const serDefs = defs.map(serializeFieldDef)
    const { ok, values, errors } = validateExtraFieldsPayload(serDefs, req.body?.values || req.body || {})
    if (!ok) return res.status(400).json({ error: errors[0] || 'Datos inválidos', errors })

    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    const current = extraFieldsToObject(user.extraFields)
    const merged = { ...current }
    for (const def of serDefs) {
      if (values[def.key] == null) delete merged[def.key]
      else merged[def.key] = values[def.key]
    }
    user.extraFields = merged
    await user.save()
    res.json({ values: extraFieldsToObject(user.extraFields), fields: serDefs })
  } catch (e) {
    next(e)
  }
})

/** GET /api/me/devices */
router.get('/devices', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id }).select(
      'pushSubscriptions',
    )
    const subs = user?.pushSubscriptions || []
    res.json({ items: subs.map((s, i) => serializeDevice(s, i)) })
  } catch (e) {
    next(e)
  }
})

/** DELETE /api/me/devices/:index — blanquea un dispositivo propio */
router.delete('/devices/:index', requireAuth, async (req, res, next) => {
  try {
    const idx = Number(req.params.index)
    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })
    const subs = [...(user.pushSubscriptions || [])]
    if (!Number.isInteger(idx) || idx < 0 || idx >= subs.length) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' })
    }
    subs.splice(idx, 1)
    user.pushSubscriptions = subs
    await user.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: user._id,
      action: 'device_revoke',
      meta: { index: idx },
      ...meta,
    })
    res.json({ ok: true, items: subs.map((s, i) => serializeDevice(s, i)) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/me/activity — historial propio (últimos N) */
router.get('/activity', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
    const items = await ActivityEvent.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
    res.json({ items: items.map(serializeActivity) })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/me/account/disable — soft-disable propia cuenta (requiere password).
 * Body: { password, confirm: true }
 */
router.post('/account/disable', requireAuth, async (req, res, next) => {
  try {
    const password = String(req.body?.password || '')
    if (!req.body?.confirm) return res.status(400).json({ error: 'Confirmá la desactivación' })
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' })

    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    if ((user.roles || []).includes('admin')) {
      const otherAdmins = await User.countDocuments({
        tenantId: req.tenant._id,
        activo: true,
        roles: 'admin',
        _id: { $ne: user._id },
      })
      if (otherAdmins < 1) {
        return res.status(400).json({ error: 'No podés desactivar la única cuenta admin del tenant' })
      }
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(400).json({ error: 'Contraseña incorrecta' })

    user.activo = false
    user.refreshTokens = []
    user.pushSubscriptions = []
    await user.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: user._id,
      action: 'account_disable',
      ...meta,
    })
    res.json({ ok: true, message: 'Cuenta desactivada' })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/me/account/delete-request — solicitud de anonimización (no hard-delete).
 * Body: { password, confirm: true }
 */
router.post('/account/delete-request', requireAuth, async (req, res, next) => {
  try {
    const password = String(req.body?.password || '')
    if (!req.body?.confirm) return res.status(400).json({ error: 'Confirmá la solicitud' })
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' })

    const user = await User.findOne({ _id: req.user._id, tenantId: req.tenant._id })
    if (!user || !user.activo) return res.status(404).json({ error: 'Usuario no encontrado' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(400).json({ error: 'Contraseña incorrecta' })

    user.deletionRequestedAt = new Date()
    await user.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: user._id,
      action: 'account_delete_request',
      ...meta,
    })
    res.json({
      ok: true,
      message: 'Solicitud registrada. Un administrador procesará la anonimización.',
      deletionRequestedAt: user.deletionRequestedAt,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/me/peoplecare — §3.08 stub opcional */
router.get('/peoplecare', requireAuth, async (req, res, next) => {
  try {
    const payload = await fetchPeopleCareProfile({ tenant: req.tenant, user: req.user })
    res.json(payload)
  } catch (e) {
    next(e)
  }
})

/**
 * PATCH /api/me/peoplecare — autoservicio (teléfono, domicilio, familiares, emergencia, skills).
 * No permite cambiar DNI, CUIL, estado laboral, banco, contratos ni notas RRHH.
 */
router.patch('/peoplecare', requireAuth, async (req, res, next) => {
  try {
    const payload = await patchOwnLegajo({
      tenant: req.tenant,
      user: req.user,
      body: req.body || {},
    })
    res.json(payload)
  } catch (e) {
    next(e)
  }
})

export default router
