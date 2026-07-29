import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { parseParentId, wouldCreateCycle } from '../lib/orgAreaHierarchy.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()

function serArea(a) {
  return {
    id: a._id,
    key: a.key,
    nombre: a.nombre,
    descripcion: a.descripcion || '',
    parentId: a.parentId ? String(a.parentId) : null,
    activo: a.activo !== false,
    orden: a.orden ?? 100,
  }
}

function serGroup(g) {
  return {
    id: g._id,
    key: g.key,
    nombre: g.nombre,
    descripcion: g.descripcion || '',
    activo: g.activo !== false,
    orden: g.orden ?? 100,
  }
}

function normalizeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

async function resolveParentId(tenantId, raw, selfId = null) {
  const parentId = parseParentId(raw)
  if (!parentId) return null
  if (selfId && String(parentId) === String(selfId)) {
    const err = new Error('Un área no puede ser padre de sí misma')
    err.status = 400
    throw err
  }
  const parent = await OrgArea.findOne({ _id: parentId, tenantId }).select('_id parentId').lean()
  if (!parent) {
    const err = new Error('Área padre no encontrada')
    err.status = 400
    throw err
  }
  if (selfId) {
    const siblings = await OrgArea.find({ tenantId }).select('_id parentId').lean()
    const parentById = Object.fromEntries(
      siblings.map((s) => [String(s._id), s.parentId ? String(s.parentId) : null]),
    )
    if (wouldCreateCycle(parentById, String(selfId), parentId)) {
      const err = new Error('Esa jerarquía formaría un ciclo')
      err.status = 400
      throw err
    }
  }
  return parent._id
}

/** Listas para selects (admin pubs / usuarios) — cualquier staff con usuarios o pubs */
router.get(
  '/options',
  requireAuth,
  requireCapability('admin.usuarios', 'admin.publicaciones', 'admin.organizacion', 'admin.solicitudes', 'admin.tipos-solicitud', 'admin.encuestas', 'admin.eventos'),
  async (req, res, next) => {
    try {
      const tenantId = req.tenant._id
      const [areas, groups] = await Promise.all([
        OrgArea.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }),
        UserGroup.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }),
      ])
      res.json({ areas: areas.map(serArea), groups: groups.map(serGroup) })
    } catch (e) {
      next(e)
    }
  },
)

router.get('/areas', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const all = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!all) filter.activo = true
    const items = await OrgArea.find(filter).sort({ orden: 1, nombre: 1 })
    res.json({ items: items.map(serArea) })
  } catch (e) {
    next(e)
  }
})

router.post('/areas', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = normalizeKey(body.key || body.nombre)
    const nombre = String(body.nombre || '').trim()
    if (!key || !nombre) return res.status(400).json({ error: 'key y nombre obligatorios' })
    let parentId = null
    if ('parentId' in body) {
      try {
        parentId = await resolveParentId(req.tenant._id, body.parentId)
      } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message })
        throw e
      }
    }
    const a = await OrgArea.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      descripcion: String(body.descripcion || '').trim(),
      parentId,
      activo: body.activo !== false,
      orden: Number(body.orden) || 100,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_area_create',
      meta: { id: String(a._id), key },
      ...reqMeta(req),
    })
    res.status(201).json({ area: serArea(a) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe esa área (key)' })
    next(e)
  }
})

router.patch('/areas/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const a = await OrgArea.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!a) return res.status(404).json({ error: 'Área no encontrada' })
    const body = req.body || {}
    if (typeof body.nombre === 'string') a.nombre = body.nombre.trim()
    if (typeof body.descripcion === 'string') a.descripcion = body.descripcion.trim()
    if (typeof body.activo === 'boolean') a.activo = body.activo
    if (body.orden != null) a.orden = Number(body.orden) || 100
    if ('parentId' in body) {
      try {
        a.parentId = await resolveParentId(req.tenant._id, body.parentId, a._id)
      } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message })
        throw e
      }
    }
    await a.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_area_update',
      meta: { id: String(a._id), key: a.key },
      ...reqMeta(req),
    })
    res.json({ area: serArea(a) })
  } catch (e) {
    next(e)
  }
})

router.delete('/areas/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const a = await OrgArea.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!a) return res.status(404).json({ error: 'Área no encontrada' })
    a.activo = false
    await a.save()
    await User.updateMany({ tenantId: req.tenant._id, areaId: a._id }, { $set: { areaId: null } })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_area_deactivate',
      meta: { id: String(a._id), key: a.key },
      ...reqMeta(req),
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.get('/groups', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const all = req.query.all === '1'
    const filter = { tenantId: req.tenant._id }
    if (!all) filter.activo = true
    const items = await UserGroup.find(filter).sort({ orden: 1, nombre: 1 })
    res.json({ items: items.map(serGroup) })
  } catch (e) {
    next(e)
  }
})

router.post('/groups', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = normalizeKey(body.key || body.nombre)
    const nombre = String(body.nombre || '').trim()
    if (!key || !nombre) return res.status(400).json({ error: 'key y nombre obligatorios' })
    const g = await UserGroup.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      descripcion: String(body.descripcion || '').trim(),
      activo: body.activo !== false,
      orden: Number(body.orden) || 100,
    })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_group_create',
      meta: { id: String(g._id), key },
      ...reqMeta(req),
    })
    res.status(201).json({ group: serGroup(g) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe ese grupo (key)' })
    next(e)
  }
})

router.patch('/groups/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const g = await UserGroup.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!g) return res.status(404).json({ error: 'Grupo no encontrado' })
    const body = req.body || {}
    if (typeof body.nombre === 'string') g.nombre = body.nombre.trim()
    if (typeof body.descripcion === 'string') g.descripcion = body.descripcion.trim()
    if (typeof body.activo === 'boolean') g.activo = body.activo
    if (body.orden != null) g.orden = Number(body.orden) || 100
    await g.save()
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_group_update',
      meta: { id: String(g._id), key: g.key },
      ...reqMeta(req),
    })
    res.json({ group: serGroup(g) })
  } catch (e) {
    next(e)
  }
})

router.delete('/groups/:id', requireAuth, requireCapability('admin.organizacion'), async (req, res, next) => {
  try {
    const g = await UserGroup.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!g) return res.status(404).json({ error: 'Grupo no encontrado' })
    g.activo = false
    await g.save()
    await User.updateMany({ tenantId: req.tenant._id }, { $pull: { groupIds: g._id } })
    await recordActivity({
      tenantId: req.tenant._id,
      userId: req.user._id,
      action: 'admin.org_group_deactivate',
      meta: { id: String(g._id), key: g.key },
      ...reqMeta(req),
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
