import { Router } from 'express'
import { requireAuth, requireCapability, isFullAdmin } from '../middleware/auth.js'
import { Role, DEFAULT_ROLES } from '../models/Role.js'
import { User } from '../models/User.js'
import { sanitizeAdminCapabilities } from '../constants/adminCapabilities.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function ser(r) {
  return {
    id: r._id,
    key: r.key,
    nombre: r.nombre,
    descripcion: r.descripcion || '',
    capabilities: r.capabilities || [],
    sistema: r.sistema === true,
    activo: r.activo !== false,
    orden: r.orden ?? 100,
  }
}

function normalizeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

export async function ensureDefaultRoles(tenantId) {
  for (const d of DEFAULT_ROLES) {
    await Role.findOneAndUpdate(
      { tenantId, key: d.key },
      {
        $setOnInsert: {
          tenantId,
          key: d.key,
          nombre: d.nombre,
          descripcion: d.descripcion,
          capabilities: d.capabilities,
          sistema: true,
          activo: true,
          orden: d.orden,
        },
      },
      { upsert: true },
    )
  }
}

/** Caps que el operador puede otorgar (no superiores a las propias, salvo full admin). */
function filterCapsOperatorCanGrant(caps, operator) {
  const sanitized = sanitizeAdminCapabilities(caps)
  if (isFullAdmin(operator)) return sanitized
  const mine = new Set(operator.capabilities || [])
  return sanitized.filter((c) => mine.has(c))
}

router.get('/', requireAuth, requireCapability('admin.roles', 'admin.usuarios'), async (req, res, next) => {
  try {
    await ensureDefaultRoles(req.tenant._id)
    const includeInactive = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!includeInactive) filter.activo = true
    const items = await Role.find(filter).sort({ orden: 1, nombre: 1 })
    res.json({ items: items.map(ser) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.roles'), async (req, res, next) => {
  try {
    if (!isFullAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo un admin del tenant puede crear roles' })
    }
    const body = req.body || {}
    const key = normalizeKey(body.key || body.nombre)
    if (!key) return res.status(400).json({ error: 'key/nombre obligatorio' })
    const capabilities = filterCapsOperatorCanGrant(body.capabilities, req.user)
    const r = await Role.create({
      tenantId: req.tenant._id,
      key,
      nombre: String(body.nombre || key).trim(),
      descripcion: String(body.descripcion || ''),
      capabilities,
      sistema: false,
      activo: body.activo !== false,
      orden: Number(body.orden) || 100,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.role_create',
      meta: { id: String(r._id), key },
      ...reqMeta(req),
    })
    res.status(201).json({ role: ser(r) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa key de rol' })
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.roles'), async (req, res, next) => {
  try {
    if (!isFullAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo un admin del tenant puede editar roles' })
    }
    const r = await Role.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Rol no encontrado' })
    const body = req.body || {}
    if (body.nombre != null) r.nombre = String(body.nombre).trim()
    if (body.descripcion != null) r.descripcion = String(body.descripcion)
    if (body.capabilities != null) r.capabilities = filterCapsOperatorCanGrant(body.capabilities, req.user)
    if (body.orden != null) r.orden = Number(body.orden) || 100
    if (typeof body.activo === 'boolean') r.activo = body.activo
    if (body.key != null && !r.sistema) r.key = normalizeKey(body.key)
    await r.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.role_update',
      meta: { id: String(r._id), key: r.key },
      ...reqMeta(req),
    })
    res.json({ role: ser(r) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa key de rol' })
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.roles'), async (req, res, next) => {
  try {
    if (!isFullAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo un admin del tenant puede eliminar roles' })
    }
    const r = await Role.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r) return res.status(404).json({ error: 'Rol no encontrado' })
    if (r.sistema) return res.status(400).json({ error: 'No se puede eliminar un rol de sistema' })
    const assigned = await User.countDocuments({ tenantId: req.tenant._id, roleIds: r._id, activo: true })
    if (assigned > 0) {
      r.activo = false
      await r.save()
    } else {
      r.activo = false
      await r.save()
    }
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.role_deactivate',
      meta: { id: String(r._id), key: r.key, assigned },
      ...reqMeta(req),
    })
    res.json({ ok: true, role: ser(r), assigned })
  } catch (e) {
    next(e)
  }
})

export default router
