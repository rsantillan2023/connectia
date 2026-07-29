import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { RequestType } from '../models/RequestType.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { normalizeCampos } from '../lib/solicitudesConfig.js'
import {
  normalizeAudience,
  serializeAudience,
  userMatchesAudience,
  audienceFilterForUser,
} from '../lib/audience.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function serializeCampo(c) {
  return {
    key: c.key,
    label: c.label,
    tipo: c.tipo || 'text',
    required: Boolean(c.required),
    opciones: c.opciones || [],
    placeholder: c.placeholder || '',
    orden: c.orden ?? 100,
  }
}

function serialize(t) {
  return {
    id: t._id,
    key: t.key,
    nombre: t.nombre,
    descripcion: t.descripcion || '',
    area: t.area || 'General',
    activo: t.activo !== false,
    orden: t.orden ?? 100,
    audience: serializeAudience(t.audience),
    campos: (t.campos || []).map(serializeCampo),
  }
}

function canManageTypes(user, tenant) {
  return hasCapability(user, tenant, 'admin.tipos-solicitud')
}

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode !== 'restricted') return { mode: 'all', areaIds: [], groupIds: [] }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, groups] = await Promise.all([
    areaIds.length ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id') : [],
    groupIds.length ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id') : [],
  ])
  return {
    mode: 'restricted',
    areaIds: areas.map((x) => x._id),
    groupIds: groups.map((x) => x._id),
  }
}

/** Tipos activos (U filtrados por audiencia; A con all=1 ve todos) */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const all = req.query.all === '1' && canManageTypes(req.user, req.tenant)
    const filter = { tenantId: req.tenant._id }
    if (!all) {
      filter.activo = true
      Object.assign(filter, audienceFilterForUser(req.user))
    }
    const items = await RequestType.find(filter).sort({ orden: 1, nombre: 1 })
    // doble check en memoria por si audienceFilter y schema difieren
    const filtered = all
      ? items
      : items.filter((t) => userMatchesAudience(req.user, t.audience || { mode: 'all' }))
    res.json({ items: filtered.map(serialize) })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const t = await RequestType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!t) return res.status(404).json({ error: 'Tipo no encontrado' })
    if (!t.activo && !canManageTypes(req.user, req.tenant)) {
      return res.status(404).json({ error: 'Tipo no encontrado' })
    }
    if (!canManageTypes(req.user, req.tenant) && !userMatchesAudience(req.user, t.audience)) {
      return res.status(403).json({ error: 'Este tipo no está disponible para tu audiencia' })
    }
    res.json({ type: serialize(t) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.tipos-solicitud'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const key = String(body.key || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
    const nombre = String(body.nombre || '').trim()
    if (!key || !nombre) return res.status(400).json({ error: 'key y nombre obligatorios' })
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const t = await RequestType.create({
      tenantId: req.tenant._id,
      key,
      nombre,
      descripcion: String(body.descripcion || '').trim(),
      area: String(body.area || 'General').trim() || 'General',
      activo: body.activo !== false,
      orden: Number(body.orden) || 100,
      audience,
      campos: normalizeCampos(body.campos),
    })
    res.status(201).json({ type: serialize(t) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya existe ese tipo (key)' })
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.tipos-solicitud'), async (req, res, next) => {
  try {
    const t = await RequestType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!t) return res.status(404).json({ error: 'Tipo no encontrado' })
    const body = req.body || {}
    if (typeof body.nombre === 'string') t.nombre = body.nombre.trim()
    if (typeof body.descripcion === 'string') t.descripcion = body.descripcion.trim()
    if (typeof body.area === 'string') t.area = body.area.trim() || 'General'
    if (typeof body.activo === 'boolean') t.activo = body.activo
    if (body.orden != null) t.orden = Number(body.orden) || 100
    if (body.campos != null) t.campos = normalizeCampos(body.campos)
    if (body.audience != null) t.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    await t.save()
    res.json({ type: serialize(t) })
  } catch (e) {
    next(e)
  }
})

export default router
