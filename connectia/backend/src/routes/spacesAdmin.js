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
import { normalizeOccupancyFields } from '../lib/spacesOccupancy.js'
import {
  serializeResourceType,
  serializeAttributeDef,
  normalizeTypeCodigo,
  normalizeAttributeKey,
  normalizeAttributes,
  defaultIconForEngine,
} from '../lib/spacesCatalog.js'
import { seedSpacesForTenant, seedSpaceCatalogForTenant } from '../lib/spacesSeed.js'
import { OLA21_MENU_ITEMS } from '../lib/ensureOla21Menu.js'
import { notifyReservationDecision, notifyReservationCancelled } from '../services/notifySpaces.js'
import { spacesAiConfigured, draftSpaceResourceFromPrompt } from '../services/spacesAi.js'

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

router.get('/ai-status', async (_req, res) => {
  res.json({ configured: spacesAiConfigured() })
})

/**
 * POST /ai-draft
 * Body: { prompt }
 * Devuelve borrador centrado en el recurso (+ sede/tipo/atributos/policy opcionales).
 */
router.post('/ai-draft', async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) return res.status(400).json({ error: 'Describí el recurso a crear' })
    await seedSpaceCatalogForTenant(req.tenant._id)
    const [sites, types, attributes] = await Promise.all([
      SpaceSite.find({ tenantId: req.tenant._id }).sort({ orden: 1, nombre: 1 }).lean(),
      SpaceResourceType.find({ tenantId: req.tenant._id }).sort({ orden: 1, label: 1 }).lean(),
      SpaceAttributeDef.find({ tenantId: req.tenant._id }).sort({ orden: 1, label: 1 }).lean(),
    ])
    const draft = await draftSpaceResourceFromPrompt(prompt, {
      brandName: req.tenant.nombre || 'Comunidad',
      existingSites: sites.map((s) => ({ id: String(s._id), nombre: s.nombre, codigo: s.codigo })),
      existingTypes: types.map(serializeResourceType),
      existingAttributes: attributes.map(serializeAttributeDef),
    })
    res.json({ draft, configured: spacesAiConfigured(), kinds: RESOURCE_KINDS })
  } catch (e) {
    next(e)
  }
})

/**
 * Resuelve o crea sede / tipo / atributos y luego el recurso.
 * Body: { resource, site?, type?, attributes?, policyPatch? }
 */
async function composeSpaceResource(tenantId, body = {}) {
  await seedSpaceCatalogForTenant(tenantId)
  const created = { site: false, type: false, attributes: [], policy: false }

  // ── Atributos nuevos ──
  for (const a of Array.isArray(body.attributes) ? body.attributes : []) {
    const key = normalizeAttributeKey(a?.key || a?.label)
    if (!key) continue
    let doc = await SpaceAttributeDef.findOne({ tenantId, key })
    if (!doc) {
      doc = await SpaceAttributeDef.create({
        tenantId,
        key,
        label: String(a.label || key).trim().slice(0, 80) || key,
        valueType: ['flag', 'text', 'enum'].includes(a.valueType) ? a.valueType : 'flag',
        options: Array.isArray(a.options) ? a.options.map(String).slice(0, 20) : [],
        activo: a.activo !== false,
        orden: Number(a.orden) || 100,
      })
      created.attributes.push(key)
    }
  }

  // ── Sede ──
  let siteId = body.resource?.siteId || body.siteId || null
  if (siteId && ObjectId.isValid(siteId)) {
    const site = await SpaceSite.findOne({ _id: siteId, tenantId })
    if (!site) {
      const err = new Error('Sede no encontrada')
      err.status = 404
      throw err
    }
  } else if (body.site?.nombre) {
    const codigo = normalizeTypeCodigo(body.site.codigo || body.site.nombre)
    let site = codigo ? await SpaceSite.findOne({ tenantId, codigo }) : null
    if (!site) {
      site = await SpaceSite.findOne({
        tenantId,
        nombre: new RegExp(`^${String(body.site.nombre).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      })
    }
    if (!site) {
      site = await SpaceSite.create({
        tenantId,
        nombre: String(body.site.nombre).trim().slice(0, 120),
        codigo,
        direccion: String(body.site.direccion || '').slice(0, 200),
        aforoMax: body.site.aforoMax == null || body.site.aforoMax === '' ? null : Number(body.site.aforoMax),
        whoIsHereEnabled: !!body.site.whoIsHereEnabled,
        activo: body.site.activo !== false,
        orden: Number(body.site.orden) || 100,
      })
      created.site = true
    }
    siteId = site._id
  }
  if (!siteId) {
    const err = new Error('Indicá una sede existente o datos de sede nueva')
    err.status = 400
    throw err
  }

  // ── Tipo ──
  const resourceBody = { ...(body.resource || {}) }
  let typeDoc = null
  if (resourceBody.typeId && ObjectId.isValid(resourceBody.typeId)) {
    typeDoc = await SpaceResourceType.findOne({ _id: resourceBody.typeId, tenantId })
  }
  if (!typeDoc && body.type?.codigo) {
    const codigo = normalizeTypeCodigo(body.type.codigo || body.type.label)
    typeDoc = await SpaceResourceType.findOne({ tenantId, codigo })
    if (!typeDoc) {
      const engineKind = RESOURCE_KINDS.includes(body.type.engineKind)
        ? body.type.engineKind
        : resourceBody.kind || 'activo'
      if (!RESOURCE_KINDS.includes(engineKind)) {
        const err = new Error('Motor de reserva inválido')
        err.status = 400
        throw err
      }
      typeDoc = await SpaceResourceType.create({
        tenantId,
        codigo,
        label: String(body.type.label || codigo).trim().slice(0, 80),
        icon: String(body.type.icon || defaultIconForEngine(engineKind)).slice(0, 40),
        descripcion: String(body.type.descripcion || '').slice(0, 400),
        engineKind,
        attributeKeys: (body.type.attributeKeys || []).map(normalizeAttributeKey).filter(Boolean),
        exigePatenteDefault: !!body.type.exigePatenteDefault,
        requiresApprovalDefault: !!body.type.requiresApprovalDefault,
        diaCompletoDefault: !!body.type.diaCompletoDefault,
        showInUserCatalog: body.type.showInUserCatalog !== false,
        showInOffice: !!body.type.showInOffice,
        system: false,
        activo: body.type.activo !== false,
        orden: Number(body.type.orden) || 100,
      })
      created.type = true
    }
  }
  if (!typeDoc && (resourceBody.typeCodigo || resourceBody.kind)) {
    const payloadProbe = resourcePayload({ ...resourceBody, siteId })
    typeDoc = await resolveTypeForResource(tenantId, resourceBody, payloadProbe)
  }
  if (!typeDoc) {
    const err = new Error('Indicá un tipo existente o datos de tipo nuevo')
    err.status = 400
    throw err
  }

  // ── Políticas (parche global opcional) ──
  if (body.policyPatch && typeof body.policyPatch === 'object') {
    const doc = await getOrCreatePolicy(tenantId)
    const b = body.policyPatch
    if (b.maxSimultaneousParking != null) doc.maxSimultaneousParking = Number(b.maxSimultaneousParking) || 1
    if (b.maxSimultaneousDesk != null) doc.maxSimultaneousDesk = Number(b.maxSimultaneousDesk) || 1
    if (b.maxOfficeDaysPerWeek != null) doc.maxOfficeDaysPerWeek = Number(b.maxOfficeDaysPerWeek) || 0
    if (b.cancelMinutesBefore != null) doc.cancelMinutesBefore = Number(b.cancelMinutesBefore) || 0
    if (b.checkInGraceMinutes != null) doc.checkInGraceMinutes = Number(b.checkInGraceMinutes) || 0
    await doc.save()
    created.policy = true
  }

  // ── Recurso ──
  const nombre = String(resourceBody.nombre || '').trim()
  if (!nombre) {
    const err = new Error('Nombre del recurso requerido')
    err.status = 400
    throw err
  }
  const payload = resourcePayload({
    ...resourceBody,
    siteId,
    typeId: typeDoc._id,
    kind: typeDoc.engineKind,
  })
  payload.typeId = typeDoc._id
  payload.kind = typeDoc.engineKind
  if (resourceBody.exigePatente === undefined) payload.exigePatente = !!typeDoc.exigePatenteDefault
  if (resourceBody.requiresApproval === undefined) payload.requiresApproval = !!typeDoc.requiresApprovalDefault
  if (resourceBody.diaCompleto === undefined) payload.diaCompleto = !!typeDoc.diaCompletoDefault
  if (!payload.attributes?.length && payload.equipment?.length) {
    payload.attributes = attributesFromEquipment(payload.equipment, payload.accessible)
  }

  const resource = await SpaceResource.create({
    tenantId,
    ...payload,
    audience: payload.audience || normalizeAudience({ mode: 'all' }),
    horario: payload.horario || { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
  })
  const populated = await SpaceResource.findById(resource._id)
    .populate('siteId', 'nombre')
    .populate('typeId', 'codigo label icon engineKind')
    .lean()

  return { item: serializeResource(populated), created }
}

router.post('/resources/compose', async (req, res, next) => {
  try {
    const result = await composeSpaceResource(req.tenant._id, req.body || {})
    res.status(201).json(result)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

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
    occupancyClass: (v) => v,
    unitCount: (v) => (v == null || v === '' ? null : Number(v)),
    unitLabel: (v) => String(v || '').slice(0, 40),
    unitPrefix: (v) => String(v || '').slice(0, 12),
    unitPad: (v) => (v == null || v === '' ? null : Number(v)),
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

  const occKeys = ['occupancyClass', 'unitCount', 'unitLabel', 'unitPrefix', 'unitPad', 'cupo']
  const touchOcc = !partial || occKeys.some((k) => b[k] !== undefined)
  if (touchOcc) {
    const occ = normalizeOccupancyFields(
      {
        occupancyClass: out.occupancyClass ?? b.occupancyClass,
        unitCount: out.unitCount ?? b.unitCount,
        unitLabel: out.unitLabel ?? b.unitLabel,
        unitPrefix: out.unitPrefix ?? b.unitPrefix,
        unitPad: out.unitPad ?? b.unitPad,
        cupo: out.cupo ?? b.cupo,
        capacity: out.capacity ?? b.capacity,
        kind: out.kind || b.kind,
      },
      { kind: out.kind || b.kind },
    )
    Object.assign(out, occ)
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
    Object.assign(
      payload,
      normalizeOccupancyFields(
        {
          occupancyClass: b.occupancyClass ?? payload.occupancyClass,
          unitCount: b.unitCount ?? payload.unitCount,
          unitLabel: b.unitLabel ?? payload.unitLabel,
          unitPrefix: b.unitPrefix ?? payload.unitPrefix,
          unitPad: b.unitPad ?? payload.unitPad,
          cupo: b.cupo ?? payload.cupo,
          capacity: payload.capacity,
          kind: payload.kind,
        },
        { kind: payload.kind },
      ),
    )
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

    const wasActive = resource.activo !== false
    const willDisable = payload.activo === false && wasActive
    const cancelReservations = willDisable && !!req.body?.cancelReservations

    Object.assign(resource, payload)
    await resource.save()

    let cancelledCount = 0
    if (cancelReservations) {
      const now = new Date()
      const reason = String(
        req.body?.cancelReason || 'Activo deshabilitado por administración',
      ).slice(0, 400)
      const result = await Reservation.updateMany(
        {
          tenantId: req.tenant._id,
          resourceId: resource._id,
          status: { $in: ACTIVE_RESERVATION_STATUSES },
          endAt: { $gte: now },
        },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: now,
            cancelReason: reason,
          },
        },
      )
      cancelledCount = result.modifiedCount || result.nModified || 0

      if (cancelledCount > 0) {
        const tenant = await Tenant.findById(req.tenant._id).lean()
        const toNotify = await Reservation.find({
          tenantId: req.tenant._id,
          resourceId: resource._id,
          status: 'cancelled',
          cancelledAt: now,
        })
          .limit(50)
          .lean()
        for (const reservation of toNotify) {
          try {
            await notifyReservationCancelled(tenant, reservation, resource.nombre)
          } catch {
            /* no bloquear deshabilitación */
          }
        }
      }
    }

    const populated = await SpaceResource.findById(resource._id)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .lean()
    res.json({
      item: serializeResource(populated),
      cancelledCount,
    })
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
      icon: String(b.icon || defaultIconForEngine(engineKind)).slice(0, 40),
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
    if (b.icon !== undefined) doc.icon = String(b.icon || defaultIconForEngine(doc.engineKind)).slice(0, 40)
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
    if (req.query.status) {
      const statuses = String(req.query.status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses }
    }
    if (req.query.kind) filter.kind = req.query.kind
    if (req.query.siteId && ObjectId.isValid(req.query.siteId)) filter.siteId = req.query.siteId
    if (req.query.resourceId && ObjectId.isValid(req.query.resourceId)) {
      filter.resourceId = req.query.resourceId
    }
    if (req.query.activeOnly === '1') {
      filter.status = { $in: ACTIVE_RESERVATION_STATUSES }
      filter.endAt = { $gte: new Date() }
    }
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
      count: items.length,
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
