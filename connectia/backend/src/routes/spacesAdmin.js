import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import {
  SpaceSite,
  SpaceResource,
  SpacePolicy,
  Reservation,
  OfficeDay,
  SpaceResourceType,
  SpaceAttributeDef,
} from '../models/Space.js'
import { Tenant } from '../models/Tenant.js'
import { MenuItem } from '../models/MenuItem.js'
import { normalizeAudience } from '../lib/audience.js'
import {
  serializeSite,
  serializeResource,
  serializeReservation,
  serializePolicy,
  spacesMeta,
  defaultSpacePolicy,
  RESOURCE_KINDS,
  ACTIVE_RESERVATION_STATUSES,
  toDateKey,
  attributesFromEquipment,
} from '../lib/spaces.js'
import {
  serializeResourceType,
  serializeAttributeDef,
  normalizeTypeCodigo,
  normalizeAttributeKey,
  normalizeAttributes,
} from '../lib/spacesCatalog.js'
import { seedSpacesForTenant, seedSpaceCatalogForTenant } from '../lib/spacesSeed.js'
import { OLA21_MENU_ITEMS } from '../lib/ensureOla21Menu.js'
import { notifyReservationDecision } from '../services/notifySpaces.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth, requireCapability('admin.reservas'))

async function getOrCreatePolicy(tenantId) {
  let doc = await SpacePolicy.findOne({ tenantId })
  if (!doc) {
    doc = await SpacePolicy.create({ tenantId, ...defaultSpacePolicy() })
  }
  return doc
}

/** GET /api/admin/spaces/meta */
router.get('/meta', async (req, res) => {
  const policy = await getOrCreatePolicy(req.tenant._id)
  await seedSpaceCatalogForTenant(req.tenant._id)
  const [types, attrs] = await Promise.all([
    SpaceResourceType.find({ tenantId: req.tenant._id }).sort({ orden: 1, label: 1 }).lean(),
    SpaceAttributeDef.find({ tenantId: req.tenant._id }).sort({ orden: 1, label: 1 }).lean(),
  ])
  res.json({
    ...spacesMeta(),
    policy: serializePolicy(policy),
    kinds: RESOURCE_KINDS,
    types: types.map(serializeResourceType),
    attributes: attrs.map(serializeAttributeDef),
  })
})

/** POST /api/admin/spaces/seed-defaults */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    for (const item of OLA21_MENU_ITEMS) {
      await MenuItem.findOneAndUpdate(
        { tenantId: req.tenant._id, key: item.key },
        {
          $setOnInsert: {
            tenantId: req.tenant._id,
            ...item,
            activo: true,
            audience: { roles: [], capabilities: [] },
          },
        },
        { upsert: true },
      )
    }
    const caps = new Set(req.tenant.capabilities || [])
    caps.add('espacios')
    caps.add('espacios.salas')
    caps.add('espacios.cocheras')
    caps.add('espacios.coworking')
    await Tenant.updateOne(
      { _id: req.tenant._id },
      { $set: { capabilities: [...caps] }, $inc: { menuVersion: 1 } },
    )
    const result = await seedSpacesForTenant(req.tenant._id, {
      brandName: req.tenant.name,
    })
    res.json({ ...result, menuUpserted: true, capabilities: [...caps] })
  } catch (e) {
    next(e)
  }
})

/** ─── Policy ─── */
router.get('/policy', async (req, res, next) => {
  try {
    const doc = await getOrCreatePolicy(req.tenant._id)
    res.json({ item: serializePolicy(doc) })
  } catch (e) {
    next(e)
  }
})

router.put('/policy', async (req, res, next) => {
  try {
    const body = req.body || {}
    const doc = await getOrCreatePolicy(req.tenant._id)
    const fields = [
      'maxSimultaneousParking',
      'maxSimultaneousDesk',
      'maxOfficeDaysPerWeek',
      'cancelMinutesBefore',
      'checkInGraceMinutes',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) doc[f] = body[f]
    }
    await doc.save()
    res.json({ item: serializePolicy(doc) })
  } catch (e) {
    next(e)
  }
})

/** ─── Sites ─── */
router.get('/sites', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.activo === '1') filter.activo = true
    if (req.query.activo === '0') filter.activo = false
    const items = await SpaceSite.find(filter).sort({ orden: 1, nombre: 1 }).lean()
    res.json({ items: items.map(serializeSite) })
  } catch (e) {
    next(e)
  }
})

router.post('/sites', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.nombre?.trim()) return res.status(400).json({ error: 'nombre requerido' })
    const site = await SpaceSite.create({
      tenantId: req.tenant._id,
      nombre: String(b.nombre).trim().slice(0, 120),
      codigo: String(b.codigo || '').trim().slice(0, 40),
      direccion: String(b.direccion || '').slice(0, 240),
      timezone: String(b.timezone || 'America/Argentina/Buenos_Aires').slice(0, 80),
      aforoMax: b.aforoMax != null ? Number(b.aforoMax) : null,
      amenities: Array.isArray(b.amenities) ? b.amenities.map(String).slice(0, 30) : [],
      whoIsHereEnabled: !!b.whoIsHereEnabled,
      activo: b.activo !== false,
      orden: Number(b.orden) || 100,
    })
    res.status(201).json({ item: serializeSite(site) })
  } catch (e) {
    next(e)
  }
})

router.patch('/sites/:id', async (req, res, next) => {
  try {
    const site = await SpaceSite.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!site) return res.status(404).json({ error: 'Sede no encontrada' })
    const b = req.body || {}
    for (const f of [
      'nombre',
      'codigo',
      'direccion',
      'timezone',
      'aforoMax',
      'amenities',
      'whoIsHereEnabled',
      'activo',
      'orden',
    ]) {
      if (b[f] !== undefined) site[f] = b[f]
    }
    await site.save()
    res.json({ item: serializeSite(site) })
  } catch (e) {
    next(e)
  }
})

/** ─── Resources ─── */
router.get('/resources', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.kind) filter.kind = req.query.kind
    if (req.query.typeId && ObjectId.isValid(req.query.typeId)) filter.typeId = req.query.typeId
    if (req.query.siteId && ObjectId.isValid(req.query.siteId)) filter.siteId = req.query.siteId
    if (req.query.activo === '1') filter.activo = true
    if (req.query.activo === '0') filter.activo = false
    const items = await SpaceResource.find(filter)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .sort({ orden: 1, nombre: 1 })
      .limit(500)
      .lean()
    res.json({ items: items.map((r) => serializeResource(r)) })
  } catch (e) {
    next(e)
  }
})

function resourcePayload(body, { partial = false } = {}) {
  const b = body || {}
  const out = {}
  const map = {
    siteId: (v) => v,
    typeId: (v) => (v && ObjectId.isValid(v) ? v : null),
    kind: (v) => v,
    nombre: (v) => String(v).trim().slice(0, 120),
    codigo: (v) => String(v || '').trim().slice(0, 40),
    descripcion: (v) => String(v || '').slice(0, 2000),
    floor: (v) => String(v || '').slice(0, 40),
    zone: (v) => String(v || '').slice(0, 80),
    zoneType: (v) => v || '',
    capacity: (v) => (v == null || v === '' ? null : Number(v)),
    cupo: (v) => (v == null || v === '' ? null : Number(v)),
    equipment: (v) => (Array.isArray(v) ? v.map(String).slice(0, 40) : []),
    attributes: (v) => normalizeAttributes(v),
    vehicleTypes: (v) => (Array.isArray(v) ? v.map(String).slice(0, 20) : []),
    esFija: (v) => !!v,
    exigePatente: (v) => !!v,
    diaCompleto: (v) => !!v,
    accessible: (v) => !!v,
    bufferMin: (v) => Number(v) || 0,
    requiresApproval: (v) => !!v,
    horario: (v) => v || undefined,
    audience: (v) => normalizeAudience(v),
    imageUrl: (v) => String(v || '').slice(0, 500),
    activo: (v) => v !== false,
    orden: (v) => Number(v) || 100,
  }
  for (const [k, fn] of Object.entries(map)) {
    if (!partial || b[k] !== undefined) {
      if (b[k] !== undefined || !partial) out[k] = fn(b[k])
    }
  }
  return out
}

async function resolveTypeForResource(tenantId, body, payload) {
  let typeDoc = null
  if (payload.typeId) {
    typeDoc = await SpaceResourceType.findOne({ _id: payload.typeId, tenantId })
  } else if (body?.typeCodigo) {
    typeDoc = await SpaceResourceType.findOne({
      tenantId,
      codigo: normalizeTypeCodigo(body.typeCodigo),
    })
  } else if (payload.kind) {
    typeDoc = await SpaceResourceType.findOne({
      tenantId,
      codigo: payload.kind,
      activo: true,
    })
  }
  if (typeDoc) {
    payload.typeId = typeDoc._id
    payload.kind = typeDoc.engineKind
    if (body?.exigePatente === undefined && !payload.exigePatente) {
      payload.exigePatente = !!typeDoc.exigePatenteDefault
    }
    if (body?.requiresApproval === undefined && payload.requiresApproval === undefined) {
      payload.requiresApproval = !!typeDoc.requiresApprovalDefault
    }
    if (body?.diaCompleto === undefined && payload.diaCompleto === undefined) {
      payload.diaCompleto = !!typeDoc.diaCompletoDefault
    }
  }
  return typeDoc
}

router.post('/resources', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    if (!b.siteId || !ObjectId.isValid(b.siteId)) {
      return res.status(400).json({ error: 'Sede inválida' })
    }
    const site = await SpaceSite.findOne({ _id: b.siteId, tenantId: req.tenant._id })
    if (!site) return res.status(404).json({ error: 'Sede no encontrada' })

    const payload = resourcePayload(b)
    await seedSpaceCatalogForTenant(req.tenant._id)
    const typeDoc = await resolveTypeForResource(req.tenant._id, b, payload)
    if (!payload.kind || !RESOURCE_KINDS.includes(payload.kind)) {
      return res.status(400).json({
        error: typeDoc ? 'Tipo sin motor válido' : 'Elegí un tipo de recurso',
      })
    }
    if (!payload.attributes?.length && payload.equipment?.length) {
      payload.attributes = attributesFromEquipment(payload.equipment, payload.accessible)
    }

    const resource = await SpaceResource.create({
      tenantId: req.tenant._id,
      ...payload,
      audience: payload.audience || normalizeAudience({ mode: 'all' }),
      horario: payload.horario || { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
    })
    const populated = await SpaceResource.findById(resource._id)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .lean()
    res.status(201).json({ item: serializeResource(populated) })
  } catch (e) {
    next(e)
  }
})

router.patch('/resources/:id', async (req, res, next) => {
  try {
    const resource = await SpaceResource.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!resource) return res.status(404).json({ error: 'Recurso no encontrado' })
    const payload = resourcePayload(req.body, { partial: true })
    if (payload.siteId) {
      const site = await SpaceSite.findOne({ _id: payload.siteId, tenantId: req.tenant._id })
      if (!site) return res.status(404).json({ error: 'Sede no encontrada' })
    }
    if (payload.typeId || req.body?.typeCodigo || payload.kind) {
      await resolveTypeForResource(req.tenant._id, req.body, payload)
    }
    if (payload.kind && !RESOURCE_KINDS.includes(payload.kind)) {
      return res.status(400).json({ error: 'Tipo de motor inválido' })
    }
    Object.assign(resource, payload)
    await resource.save()
    const populated = await SpaceResource.findById(resource._id)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .lean()
    res.json({ item: serializeResource(populated) })
  } catch (e) {
    next(e)
  }
})

/** ─── Tipos de recurso ─── */
router.get('/types', async (req, res, next) => {
  try {
    await seedSpaceCatalogForTenant(req.tenant._id)
    const filter = { tenantId: req.tenant._id }
    if (req.query.activo === '1') filter.activo = true
    const items = await SpaceResourceType.find(filter).sort({ orden: 1, label: 1 }).lean()
    res.json({ items: items.map(serializeResourceType) })
  } catch (e) {
    next(e)
  }
})

router.post('/types', async (req, res, next) => {
  try {
    const b = req.body || {}
    const codigo = normalizeTypeCodigo(b.codigo || b.label)
    const label = String(b.label || '').trim().slice(0, 80)
    if (!codigo || !label) return res.status(400).json({ error: 'Código y nombre requeridos' })
    const engineKind = b.engineKind || 'activo'
    if (!RESOURCE_KINDS.includes(engineKind)) {
      return res.status(400).json({ error: 'Motor de reserva inválido' })
    }
    const exists = await SpaceResourceType.findOne({ tenantId: req.tenant._id, codigo })
    if (exists) return res.status(409).json({ error: 'Ya existe un tipo con ese código' })
    const doc = await SpaceResourceType.create({
      tenantId: req.tenant._id,
      codigo,
      label,
      icon: String(b.icon || 'box').slice(0, 40),
      descripcion: String(b.descripcion || '').slice(0, 400),
      engineKind,
      attributeKeys: (b.attributeKeys || []).map(normalizeAttributeKey).filter(Boolean),
      exigePatenteDefault: !!b.exigePatenteDefault,
      requiresApprovalDefault: !!b.requiresApprovalDefault,
      diaCompletoDefault: !!b.diaCompletoDefault,
      showInUserCatalog: b.showInUserCatalog !== false,
      showInOffice: !!b.showInOffice,
      system: false,
      activo: b.activo !== false,
      orden: Number(b.orden) || 100,
    })
    res.status(201).json({ item: serializeResourceType(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/types/:id', async (req, res, next) => {
  try {
    const doc = await SpaceResourceType.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Tipo no encontrado' })
    const b = req.body || {}
    if (b.label !== undefined) doc.label = String(b.label).trim().slice(0, 80)
    if (b.icon !== undefined) doc.icon = String(b.icon || 'box').slice(0, 40)
    if (b.descripcion !== undefined) doc.descripcion = String(b.descripcion || '').slice(0, 400)
    if (b.engineKind !== undefined) {
      if (!RESOURCE_KINDS.includes(b.engineKind)) {
        return res.status(400).json({ error: 'Motor de reserva inválido' })
      }
      if (doc.system && b.engineKind !== doc.engineKind) {
        return res.status(400).json({ error: 'No se puede cambiar el motor de un tipo de sistema' })
      }
      doc.engineKind = b.engineKind
    }
    if (b.attributeKeys !== undefined) {
      doc.attributeKeys = (b.attributeKeys || []).map(normalizeAttributeKey).filter(Boolean)
    }
    if (b.exigePatenteDefault !== undefined) doc.exigePatenteDefault = !!b.exigePatenteDefault
    if (b.requiresApprovalDefault !== undefined) {
      doc.requiresApprovalDefault = !!b.requiresApprovalDefault
    }
    if (b.diaCompletoDefault !== undefined) doc.diaCompletoDefault = !!b.diaCompletoDefault
    if (b.showInUserCatalog !== undefined) doc.showInUserCatalog = !!b.showInUserCatalog
    if (b.showInOffice !== undefined) doc.showInOffice = !!b.showInOffice
    if (b.activo !== undefined) doc.activo = !!b.activo
    if (b.orden !== undefined) doc.orden = Number(b.orden) || 100
    await doc.save()
    res.json({ item: serializeResourceType(doc) })
  } catch (e) {
    next(e)
  }
})

/** ─── Atributos / amenities ─── */
router.get('/attributes', async (req, res, next) => {
  try {
    await seedSpaceCatalogForTenant(req.tenant._id)
    const items = await SpaceAttributeDef.find({ tenantId: req.tenant._id })
      .sort({ orden: 1, label: 1 })
      .lean()
    res.json({ items: items.map(serializeAttributeDef) })
  } catch (e) {
    next(e)
  }
})

router.post('/attributes', async (req, res, next) => {
  try {
    const b = req.body || {}
    const key = normalizeAttributeKey(b.key || b.label)
    const label = String(b.label || '').trim().slice(0, 80)
    if (!key || !label) return res.status(400).json({ error: 'Clave y nombre requeridos' })
    const exists = await SpaceAttributeDef.findOne({ tenantId: req.tenant._id, key })
    if (exists) return res.status(409).json({ error: 'Ya existe ese atributo' })
    const valueType = ['flag', 'text', 'enum'].includes(b.valueType) ? b.valueType : 'flag'
    const doc = await SpaceAttributeDef.create({
      tenantId: req.tenant._id,
      key,
      label,
      valueType,
      options: Array.isArray(b.options) ? b.options.map(String).slice(0, 40) : [],
      activo: b.activo !== false,
      orden: Number(b.orden) || 100,
    })
    res.status(201).json({ item: serializeAttributeDef(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/attributes/:id', async (req, res, next) => {
  try {
    const doc = await SpaceAttributeDef.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Atributo no encontrado' })
    const b = req.body || {}
    if (b.label !== undefined) doc.label = String(b.label).trim().slice(0, 80)
    if (b.valueType !== undefined && ['flag', 'text', 'enum'].includes(b.valueType)) {
      doc.valueType = b.valueType
    }
    if (b.options !== undefined) {
      doc.options = Array.isArray(b.options) ? b.options.map(String).slice(0, 40) : []
    }
    if (b.activo !== undefined) doc.activo = !!b.activo
    if (b.orden !== undefined) doc.orden = Number(b.orden) || 100
    await doc.save()
    res.json({ item: serializeAttributeDef(doc) })
  } catch (e) {
    next(e)
  }
})

/** ─── Reservations (bandeja + aprobación) ─── */
router.get('/reservations', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.status) filter.status = req.query.status
    if (req.query.kind) filter.kind = req.query.kind
    if (req.query.siteId && ObjectId.isValid(req.query.siteId)) filter.siteId = req.query.siteId
    if (req.query.from || req.query.to) {
      filter.startAt = {}
      if (req.query.from) filter.startAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.startAt.$lte = new Date(req.query.to)
    }
    const items = await Reservation.find(filter)
      .populate('resourceId', 'nombre kind')
      .populate('siteId', 'nombre')
      .populate('userId', 'name nombre email')
      .sort({ startAt: -1 })
      .limit(200)
      .lean()

    res.json({
      items: items.map((r) =>
        serializeReservation(r, {
          userName: r.userId?.name || r.userId?.nombre || '',
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/reservations/:id/approve', async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reservation.status !== 'pending') {
      return res.status(409).json({ error: 'Solo reservas pendientes' })
    }
    reservation.status = 'confirmed'
    reservation.approvedBy = req.user._id
    reservation.approvedAt = new Date()
    await reservation.save()
    const resource = await SpaceResource.findById(reservation.resourceId).select('nombre').lean()
    await notifyReservationDecision(req.tenant, reservation, resource?.nombre, true)
    res.json({ item: serializeReservation(reservation.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.post('/reservations/:id/reject', async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reservation.status !== 'pending') {
      return res.status(409).json({ error: 'Solo reservas pendientes' })
    }
    reservation.status = 'rejected'
    reservation.approvedBy = req.user._id
    reservation.approvedAt = new Date()
    reservation.rejectReason = String(req.body?.reason || '').slice(0, 400)
    await reservation.save()
    const resource = await SpaceResource.findById(reservation.resourceId).select('nombre').lean()
    await notifyReservationDecision(req.tenant, reservation, resource?.nombre, false)
    res.json({ item: serializeReservation(reservation.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── Reportes ─── */
router.get('/report', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 864e5)
    const to = req.query.to ? new Date(req.query.to) : new Date()
    const match = {
      tenantId: req.tenant._id,
      startAt: { $gte: from, $lte: to },
    }
    if (req.query.siteId && ObjectId.isValid(req.query.siteId)) match.siteId = new ObjectId(req.query.siteId)
    if (req.query.kind) match.kind = req.query.kind

    const byStatus = await Reservation.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const byKind = await Reservation.aggregate([
      { $match: match },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ])
    const noShows = await Reservation.countDocuments({ ...match, status: 'no_show' })
    const pending = await Reservation.countDocuments({
      tenantId: req.tenant._id,
      status: 'pending',
    })

    const dateKey = toDateKey(new Date())
    const officeToday = await OfficeDay.countDocuments({
      tenantId: req.tenant._id,
      dateKey,
      status: { $in: ['confirmed', 'checked_in'] },
    })

    res.json({
      from,
      to,
      byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
      byKind: Object.fromEntries(byKind.map((x) => [x._id, x.count])),
      noShows,
      pending,
      officeToday,
      activeNow: await Reservation.countDocuments({
        tenantId: req.tenant._id,
        status: { $in: ACTIVE_RESERVATION_STATUSES },
        startAt: { $lte: new Date() },
        endAt: { $gte: new Date() },
      }),
    })
  } catch (e) {
    next(e)
  }
})

export default router
