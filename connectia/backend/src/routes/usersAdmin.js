import { Router } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { requireAuth, requireCapability, isFullAdmin } from '../middleware/auth.js'
import { sanitizeAdminCapabilities } from '../constants/adminCapabilities.js'
import { User } from '../models/User.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { Role } from '../models/Role.js'
import { ActivityEvent } from '../models/ActivityEvent.js'
import { ProfileFieldDef } from '../models/ProfileFieldDef.js'
import {
  serializeDevice,
  extraFieldsToObject,
  serializeFieldDef,
  validateExtraFieldsPayload,
} from '../lib/profileFields.js'
import { recordActivity, reqMeta, serializeActivity } from '../lib/activityLog.js'
import { draftUserFromPrompt, userAiConfigured } from '../services/userAi.js'
import { ADMIN_SCREEN_IDS } from '../constants/adminCapabilities.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

async function resolveUserOrg(tenantId, { areaId, groupIds }) {
  let nextArea = undefined
  let nextGroups = undefined
  if (areaId !== undefined) {
    if (!areaId) nextArea = null
    else if (ObjectId.isValid(areaId)) {
      const a = await OrgArea.findOne({ _id: areaId, tenantId, activo: true })
      nextArea = a ? a._id : null
    } else nextArea = null
  }
  if (groupIds !== undefined) {
    const ids = (Array.isArray(groupIds) ? groupIds : [])
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id))
    if (!ids.length) nextGroups = []
    else {
      const found = await UserGroup.find({ tenantId, _id: { $in: ids }, activo: true }).select('_id')
      nextGroups = found.map((g) => g._id)
    }
  }
  return { nextArea, nextGroups }
}

async function resolveRoleIds(tenantId, roleIds) {
  if (roleIds === undefined) return undefined
  const ids = (Array.isArray(roleIds) ? roleIds : [])
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id))
  if (!ids.length) return []
  const found = await Role.find({ tenantId, _id: { $in: ids }, activo: true }).select('_id')
  return found.map((r) => r._id)
}

const ALLOWED_ROLES = new Set(['member', 'admin'])
const EXPORT_FIELDS = ['usuario', 'idExterno', 'dni', 'cuil', 'nombre', 'apellido', 'email', 'roles', 'activo', 'origen']

function serialize(u, extras = {}) {
  return {
    id: u._id,
    usuario: u.usuario,
    idExterno: u.idExterno || '',
    dni: u.dni || '',
    cuil: u.cuil || '',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    avatarUrl: toPublicMediaUrl(u.avatarUrl || ''),
    cargo: u.cargo || '',
    fechaNacimiento: u.fechaNacimiento || null,
    fechaIngreso: u.fechaIngreso || null,
    customDates: (() => {
      const raw = u.customDates
      if (!raw) return {}
      if (typeof raw.entries === 'function') {
        return Object.fromEntries([...raw.entries()].map(([k, v]) => [k, v]))
      }
      return { ...raw }
    })(),
    extraFields: extraFieldsToObject(u.extraFields),
    deletionRequestedAt: u.deletionRequestedAt || null,
    lastLoginAt: u.lastLoginAt || null,
    deviceCount: Array.isArray(u.pushSubscriptions) ? u.pushSubscriptions.length : 0,
    roles: u.roles || [],
    capabilities: u.capabilities || [],
    roleIds: (u.roleIds || []).map((id) => String(id)),
    areaId: u.areaId ? String(u.areaId) : null,
    groupIds: (u.groupIds || []).map((id) => String(id)),
    activo: u.activo !== false,
    origen: u.origen || 'MANUAL',
    esEmpleado: extras.esEmpleado === true,
    legajoId: extras.legajoId || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

/** YYYY-MM-DD → Date noon UTC (date-only). null limpia. */
function parseDateOnly(raw) {
  if (raw === null || raw === '') return null
  if (raw === undefined) return undefined
  const s = String(raw).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const err = new Error('Fecha inválida (usá YYYY-MM-DD)')
    err.status = 400
    throw err
  }
  const d = new Date(`${s}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) {
    const err = new Error('Fecha inválida')
    err.status = 400
    throw err
  }
  return d
}

function normalizeUsuario(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function parseRoles(input) {
  const list = Array.isArray(input)
    ? input
    : String(input || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
  const roles = [...new Set(list.map((r) => r.toLowerCase()))]
  if (!roles.length) return ['member']
  if (roles.some((r) => !ALLOWED_ROLES.has(r))) {
    const err = new Error(`Roles permitidos: ${[...ALLOWED_ROLES].join(', ')}`)
    err.status = 400
    throw err
  }
  if (!roles.includes('member') && !roles.includes('admin')) {
    roles.push('member')
  }
  return roles
}

async function countActiveAdmins(tenantId, excludeId = null) {
  const filter = {
    tenantId,
    activo: true,
    roles: 'admin',
  }
  if (excludeId) filter._id = { $ne: excludeId }
  return User.countDocuments(filter)
}

function assertCanChangeAdminStatus({ target, nextRoles, nextActivo, activeAdminsExcludingTarget }) {
  const wasAdmin = (target.roles || []).includes('admin')
  const willBeAdmin = (nextRoles || target.roles || []).includes('admin')
  const willBeActive = nextActivo !== false

  const losesAdminSeat =
    wasAdmin && target.activo !== false && (!willBeAdmin || !willBeActive)

  if (losesAdminSeat && activeAdminsExcludingTarget < 1) {
    const err = new Error('No se puede quitar o desactivar al último admin del tenant')
    err.status = 400
    throw err
  }
}

router.get('/', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const activo = req.query.activo
    const role = String(req.query.role || '').trim().toLowerCase()
    const areaId = String(req.query.areaId || '').trim()
    const filter = { tenantId: req.tenant._id }

    if (activo === 'true') filter.activo = true
    if (activo === 'false') filter.activo = false
    if (role && ALLOWED_ROLES.has(role)) filter.roles = role
    if (areaId && ObjectId.isValid(areaId)) filter.areaId = new ObjectId(areaId)
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { usuario: rx },
        { nombre: rx },
        { apellido: rx },
        { email: rx },
        { idExterno: rx },
        { dni: rx },
        { cuil: rx },
      ]
    }

    const SORT_FIELDS = {
      usuario: 'usuario',
      nombre: 'nombre',
      email: 'email',
      idExterno: 'idExterno',
      activo: 'activo',
      origen: 'origen',
      createdAt: 'createdAt',
      lastLoginAt: 'lastLoginAt',
    }
    const sortKey = SORT_FIELDS[String(req.query.sort || '')] || 'nombre'
    const sortDir = String(req.query.order || 'asc').toLowerCase() === 'desc' ? -1 : 1
    const sort = { [sortKey]: sortDir }
    if (sortKey === 'nombre') sort.usuario = sortDir

    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 20))
    const skip = (page - 1) * pageSize

    const [total, items] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort(sort).skip(skip).limit(pageSize),
    ])

    const userIds = items.map((u) => u._id)
    const legajos = userIds.length
      ? await EmployeeLegajo.find({
          tenantId: req.tenant._id,
          userId: { $in: userIds },
          activo: true,
        })
          .select('_id userId')
          .lean()
      : []
    const byUser = new Map(legajos.map((l) => [String(l.userId), l]))

    res.json({
      items: items.map((u) => {
        const leg = byUser.get(String(u._id))
        return serialize(u, {
          esEmpleado: Boolean(leg),
          legajoId: leg ? String(leg._id) : null,
        })
      }),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      sort: sortKey,
      order: sortDir === -1 ? 'desc' : 'asc',
    })
  } catch (e) {
    next(e)
  }
})

router.get('/export', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const items = await User.find({ tenantId: req.tenant._id }).sort({ usuario: 1 }).limit(5000)
    const rows = items.map((u) => {
      const s = serialize(u)
      return {
        usuario: s.usuario,
        idExterno: s.idExterno,
        nombre: s.nombre,
        apellido: s.apellido,
        email: s.email,
        roles: (s.roles || []).join('|'),
        activo: s.activo ? '1' : '0',
        origen: s.origen,
      }
    })
    res.json({
      fields: EXPORT_FIELDS,
      rows,
      exportedAt: new Date().toISOString(),
      tenant: req.tenant.empCodigo,
    })
  } catch (e) {
    next(e)
  }
})

/** Completar formulario de usuario desde prompt (opcional; heurística si no hay LLM). */
router.post('/ai-draft', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id key nombre').lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id key nombre').lean(),
    ])
    const draft = await draftUserFromPrompt({
      prompt,
      areas: areas.map((a) => ({ id: a._id, key: a.key, nombre: a.nombre })),
      groups: groups.map((g) => ({ id: g._id, key: g.key, nombre: g.nombre })),
      capabilityIds: ADMIN_SCREEN_IDS,
    })
    res.json({ draft, configured: userAiConfigured() })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.get('/ai-status', requireAuth, requireCapability('admin.usuarios'), async (_req, res) => {
  res.json({ configured: userAiConfigured() })
})

async function legajoExtrasForUser(tenantId, userId) {
  const leg = await EmployeeLegajo.findOne({
    tenantId,
    userId,
    activo: true,
  })
    .select('_id')
    .lean()
  return {
    esEmpleado: Boolean(leg),
    legajoId: leg ? String(leg._id) : null,
  }
}

router.get('/:id', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
    const extras = await legajoExtrasForUser(req.tenant._id, u._id)
    res.json({ user: serialize(u, extras) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const usuario = normalizeUsuario(body.usuario)
    if (!usuario) return res.status(400).json({ error: 'usuario obligatorio' })
    if (!body.password || String(body.password).length < 8) {
      return res.status(400).json({ error: 'password mínimo 8 caracteres' })
    }

    const exists = await User.findOne({ tenantId: req.tenant._id, usuario })
    if (exists) return res.status(409).json({ error: 'Ya existe ese usuario en el tenant' })

    const roles = parseRoles(body.roles)
    const capabilities = sanitizeAdminCapabilities(body.capabilities)
    if ((roles.includes('admin') || capabilities.length) && !isFullAdmin(req.user)) {
      return res.status(403).json({
        error: 'Solo un admin del tenant puede otorgar rol admin o permisos de pantallas',
      })
    }
    const passwordHash = await bcrypt.hash(String(body.password), 12)
    const { nextArea, nextGroups } = await resolveUserOrg(req.tenant._id, {
      areaId: body.areaId,
      groupIds: body.groupIds,
    })
    const nextRoleIds = await resolveRoleIds(req.tenant._id, body.roleIds)
    if (body.roleIds != null && !isFullAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo un admin del tenant puede asignar roles nombrados' })
    }

    const u = await User.create({
      tenantId: req.tenant._id,
      usuario,
      idExterno: String(body.idExterno || '').trim(),
      dni: String(body.dni || '').trim().slice(0, 32),
      cuil: String(body.cuil || '').trim().slice(0, 32),
      passwordHash,
      nombre: String(body.nombre || '').trim(),
      apellido: String(body.apellido || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      cargo: String(body.cargo || '').trim().slice(0, 120),
      fechaNacimiento: parseDateOnly(body.fechaNacimiento ?? null),
      fechaIngreso: parseDateOnly(body.fechaIngreso ?? null),
      roles,
      capabilities,
      roleIds: nextRoleIds === undefined ? [] : nextRoleIds,
      areaId: nextArea === undefined ? null : nextArea,
      groupIds: nextGroups === undefined ? [] : nextGroups,
      activo: body.activo !== false,
      origen: 'MANUAL',
    })

    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.user_create',
      meta: { targetUserId: String(u._id), usuario: u.usuario },
      ...reqMeta(req),
    })

    res.status(201).json({ user: serialize(u) })
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Ya existe ese usuario en el tenant' })
    }
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })

    const body = req.body || {}
    const nextRoles = body.roles != null ? parseRoles(body.roles) : u.roles
    const nextActivo = typeof body.activo === 'boolean' ? body.activo : u.activo
    const nextCaps =
      body.capabilities != null ? sanitizeAdminCapabilities(body.capabilities) : u.capabilities || []

    if (
      body.roles != null ||
      Array.isArray(body.capabilities)
    ) {
      const grantingAdmin = nextRoles.includes('admin') && !(u.roles || []).includes('admin')
      const capsChanged =
        JSON.stringify([...(u.capabilities || [])].sort()) !== JSON.stringify([...nextCaps].sort())
      if ((grantingAdmin || capsChanged) && !isFullAdmin(req.user)) {
        return res.status(403).json({
          error: 'Solo un admin del tenant puede cambiar rol admin o permisos de pantallas',
        })
      }
    }

    const activeAdminsExcludingTarget = await countActiveAdmins(req.tenant._id, u._id)
    assertCanChangeAdminStatus({
      target: u,
      nextRoles,
      nextActivo,
      activeAdminsExcludingTarget,
    })

    if (typeof body.nombre === 'string') u.nombre = body.nombre.trim()
    if (typeof body.apellido === 'string') u.apellido = body.apellido.trim()
    if (typeof body.email === 'string') u.email = body.email.trim().toLowerCase()
    if (typeof body.idExterno === 'string') u.idExterno = body.idExterno.trim()
    if (typeof body.dni === 'string') u.dni = body.dni.trim().slice(0, 32)
    if (typeof body.cuil === 'string') u.cuil = body.cuil.trim().slice(0, 32)
    if (typeof body.cargo === 'string') u.cargo = body.cargo.trim().slice(0, 120)
    if (body.fechaNacimiento !== undefined) u.fechaNacimiento = parseDateOnly(body.fechaNacimiento)
    if (body.fechaIngreso !== undefined) u.fechaIngreso = parseDateOnly(body.fechaIngreso)
    if (body.customDates !== undefined) {
      const next = new Map()
      const raw = body.customDates && typeof body.customDates === 'object' ? body.customDates : {}
      for (const [k, v] of Object.entries(raw)) {
        const key = String(k || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, '_')
          .slice(0, 64)
        if (!key) continue
        const d = parseDateOnly(v)
        if (d) next.set(key, d)
      }
      u.customDates = next
    }
    if (body.extraFields !== undefined) {
      const defs = await ProfileFieldDef.find({ tenantId: req.tenant._id, activo: true })
      const serDefs = defs.map(serializeFieldDef)
      const { ok, values, errors } = validateExtraFieldsPayload(serDefs, body.extraFields || {})
      if (!ok) return res.status(400).json({ error: errors[0] || 'Campos adicionales inválidos', errors })
      const merged = extraFieldsToObject(u.extraFields)
      for (const def of serDefs) {
        if (values[def.key] == null) delete merged[def.key]
        else merged[def.key] = values[def.key]
      }
      u.extraFields = merged
    }
    if (body.roles != null) u.roles = nextRoles
    if (typeof body.activo === 'boolean') {
      u.activo = body.activo
      if (!body.activo) {
        u.refreshTokens = []
        u.lockUntil = null
        u.failedLoginAttempts = 0
      }
    }
    if (Array.isArray(body.capabilities)) u.capabilities = nextCaps
    if (body.roleIds !== undefined) {
      if (!isFullAdmin(req.user)) {
        return res.status(403).json({ error: 'Solo un admin del tenant puede asignar roles nombrados' })
      }
      u.roleIds = await resolveRoleIds(req.tenant._id, body.roleIds)
    }

    if (body.areaId !== undefined || body.groupIds !== undefined) {
      const { nextArea, nextGroups } = await resolveUserOrg(req.tenant._id, {
        areaId: body.areaId,
        groupIds: body.groupIds,
      })
      if (nextArea !== undefined) u.areaId = nextArea
      if (nextGroups !== undefined) u.groupIds = nextGroups
    }

    if (body.password) {
      if (String(body.password).length < 8) {
        return res.status(400).json({ error: 'password mínimo 8 caracteres' })
      }
      u.passwordHash = await bcrypt.hash(String(body.password), 12)
      u.refreshTokens = []
    }

    await u.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.user_update',
      meta: { targetUserId: String(u._id), usuario: u.usuario },
      ...reqMeta(req),
    })
    const extras = await legajoExtrasForUser(req.tenant._id, u._id)
    res.json({ user: serialize(u, extras) })
  } catch (e) {
    next(e)
  }
})

/** Dispositivos push del usuario */
router.get('/:id/devices', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id }).select(
      'pushSubscriptions',
    )
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ items: (u.pushSubscriptions || []).map((s, i) => serializeDevice(s, i)) })
  } catch (e) {
    next(e)
  }
})

router.delete(
  '/:id/devices/:index',
  requireAuth,
  requireCapability('admin.usuarios'),
  async (req, res, next) => {
    try {
      const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id })
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
      const idx = Number(req.params.index)
      const subs = [...(u.pushSubscriptions || [])]
      if (!Number.isInteger(idx) || idx < 0 || idx >= subs.length) {
        return res.status(404).json({ error: 'Dispositivo no encontrado' })
      }
      subs.splice(idx, 1)
      u.pushSubscriptions = subs
      await u.save()
      const meta = reqMeta(req)
      recordActivity({
        tenantId: req.tenant._id,
        userId: u._id,
        action: 'admin.device_revoke',
        meta: { by: String(req.user._id), index: idx },
        ...meta,
      })
      res.json({ ok: true, items: subs.map((s, i) => serializeDevice(s, i)) })
    } catch (e) {
      next(e)
    }
  },
)

/** Historial de actividad del usuario */
router.get('/:id/activity', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id }).select('_id')
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const items = await ActivityEvent.find({ tenantId: req.tenant._id, userId: u._id })
      .sort({ createdAt: -1 })
      .limit(limit)
    res.json({ items: items.map(serializeActivity) })
  } catch (e) {
    next(e)
  }
})

/** Soft-delete: desactivar + revocar sesiones */
router.delete('/:id', requireAuth, requireCapability('admin.usuarios'), async (req, res, next) => {
  try {
    const u = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' })

    const activeAdminsExcludingTarget = await countActiveAdmins(req.tenant._id, u._id)
    assertCanChangeAdminStatus({
      target: u,
      nextRoles: u.roles,
      nextActivo: false,
      activeAdminsExcludingTarget,
    })

    u.activo = false
    u.refreshTokens = []
    u.pushSubscriptions = []
    await u.save()
    const meta = reqMeta(req)
    recordActivity({
      tenantId: req.tenant._id,
      userId: u._id,
      action: 'admin.user_disable',
      meta: { by: String(req.user._id) },
      ...meta,
    })
    res.json({ ok: true, user: serialize(u) })
  } catch (e) {
    next(e)
  }
})

export default router
