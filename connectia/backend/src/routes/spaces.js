import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import {
  SpaceSite,
  SpaceResource,
  SpacePolicy,
  Reservation,
  OfficeDay,
  SpaceResourceType,
  SpaceAttributeDef,
} from '../models/Space.js'
import { audienceFilterForUser, userMatchesAudience } from '../lib/audience.js'
import {
  serializeSite,
  serializeResource,
  serializeReservation,
  serializeOfficeDay,
  serializePolicy,
  spacesMeta,
  defaultSpacePolicy,
  evaluateCreateReservation,
  canCancelReservation,
  normalizePlate,
  toDateKey,
  weekDateKeys,
  isDeskKind,
  isParkingKind,
  isRoomKind,
  rangesOverlap,
  ACTIVE_RESERVATION_STATUSES,
} from '../lib/spaces.js'
import {
  serializeResourceType,
  serializeAttributeDef,
  resourceHasAttributes,
  normalizeAttributeKey,
} from '../lib/spacesCatalog.js'
import { seedSpaceCatalogForTenant } from '../lib/spacesSeed.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'
import {
  isNumberedOccupancy,
  buildUnitCodes,
  normalizeUnitCode,
  effectiveUnitCount,
} from '../lib/spacesOccupancy.js'
import {
  notifyReservationCreated,
  notifyReservationCancelled,
} from '../services/notifySpaces.js'
import { User } from '../models/User.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

async function getPolicy(tenantId) {
  const doc = await SpacePolicy.findOne({ tenantId }).lean()
  return serializePolicy(doc || defaultSpacePolicy())
}

function tenantCaps(tenant) {
  const caps = tenant?.capabilities || []
  return {
    espacios: caps.includes('espacios') || caps.includes('espacios.salas') || caps.includes('espacios.cocheras') || caps.includes('espacios.coworking'),
    salas: caps.includes('espacios') || caps.includes('espacios.salas'),
    cocheras: caps.includes('espacios') || caps.includes('espacios.cocheras'),
    coworking: caps.includes('espacios') || caps.includes('espacios.coworking'),
  }
}

async function countOverlaps({
  tenantId,
  resourceId,
  startAt,
  endAt,
  excludeId,
  bufferMin = 0,
  unitCode,
}) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const padMs = (Number(bufferMin) || 0) * 60_000
  const q = {
    tenantId,
    resourceId,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    startAt: { $lt: new Date(end.getTime() + padMs) },
    endAt: { $gt: start },
  }
  if (unitCode) q.unitCode = String(unitCode).trim().toUpperCase()
  if (excludeId) q._id = { $ne: excludeId }
  return Reservation.countDocuments(q)
}

async function listOccupiedUnitCodes({ tenantId, resourceId, startAt, endAt, bufferMin = 0 }) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const padMs = (Number(bufferMin) || 0) * 60_000
  const rows = await Reservation.find({
    tenantId,
    resourceId,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    unitCode: { $ne: '' },
    startAt: { $lt: new Date(end.getTime() + padMs) },
    endAt: { $gt: start },
  })
    .select('unitCode')
    .lean()
  return [...new Set(rows.map((r) => String(r.unitCode || '').toUpperCase()).filter(Boolean))]
}

async function countUserActiveByKinds({ tenantId, userId, kinds, startAt, endAt, excludeId }) {
  const q = {
    tenantId,
    userId,
    kind: { $in: kinds },
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    startAt: { $lt: new Date(endAt) },
    endAt: { $gt: new Date(startAt) },
  }
  if (excludeId) q._id = { $ne: excludeId }
  return Reservation.countDocuments(q)
}

/** GET /api/spaces/meta */
router.get('/meta', requireAuth, async (req, res) => {
  const policy = await getPolicy(req.tenant._id)
  await seedSpaceCatalogForTenant(req.tenant._id)
  const [types, attrs] = await Promise.all([
    SpaceResourceType.find({
      tenantId: req.tenant._id,
      activo: true,
      showInUserCatalog: true,
    })
      .sort({ orden: 1, label: 1 })
      .lean(),
    SpaceAttributeDef.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1, label: 1 })
      .lean(),
  ])
  res.json({
    ...spacesMeta(),
    policy,
    capabilities: tenantCaps(req.tenant),
    types: types.map(serializeResourceType),
    attributes: attrs.map(serializeAttributeDef),
  })
})

/** GET /api/spaces/types — tipos visibles en catálogo U */
router.get('/types', requireAuth, async (req, res, next) => {
  try {
    await seedSpaceCatalogForTenant(req.tenant._id)
    const items = await SpaceResourceType.find({
      tenantId: req.tenant._id,
      activo: true,
      showInUserCatalog: true,
    })
      .sort({ orden: 1, label: 1 })
      .lean()
    res.json({ items: items.map(serializeResourceType) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/attributes */
router.get('/attributes', requireAuth, async (req, res, next) => {
  try {
    await seedSpaceCatalogForTenant(req.tenant._id)
    const items = await SpaceAttributeDef.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1, label: 1 })
      .lean()
    res.json({ items: items.map(serializeAttributeDef) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/sites */
router.get('/sites', requireAuth, async (req, res, next) => {
  try {
    const items = await SpaceSite.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1, nombre: 1 })
      .lean()
    res.json({ items: items.map(serializeSite) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/resources */
router.get('/resources', requireAuth, async (req, res, next) => {
  try {
    const { kind, siteId, zone, q, typeId, attrs } = req.query
    const filter = {
      tenantId: req.tenant._id,
      activo: true,
      $and: [audienceFilterForUser(req.user)],
    }
    if (kind) {
      const kinds = String(kind)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (kinds.length === 1) filter.kind = kinds[0]
      else if (kinds.length > 1) filter.kind = { $in: kinds }
    }
    if (typeId && ObjectId.isValid(typeId)) filter.typeId = typeId
    if (siteId && ObjectId.isValid(siteId)) filter.siteId = siteId
    if (zone) filter.zone = String(zone)
    if (q) {
      filter.$or = [
        { nombre: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { codigo: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ]
    }

    let items = await SpaceResource.find(filter)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .sort({ orden: 1, nombre: 1 })
      .limit(200)
      .lean()

    const attrKeys = String(attrs || '')
      .split(',')
      .map(normalizeAttributeKey)
      .filter(Boolean)
    if (attrKeys.length) {
      items = items.filter((r) => resourceHasAttributes(r, attrKeys))
    }

    res.json({ items: items.map((r) => serializeResource(r)) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/availability?start=&end=&kind=&siteId=&typeId=&attrs= */
router.get('/availability', requireAuth, async (req, res, next) => {
  try {
    const startAt = req.query.start || req.query.startAt
    const endAt = req.query.end || req.query.endAt
    if (!startAt || !endAt) {
      return res.status(400).json({ error: 'Indicá inicio y fin' })
    }
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (!(start < end)) {
      return res.status(400).json({ error: 'El fin debe ser después del inicio' })
    }

    const filter = {
      tenantId: req.tenant._id,
      activo: true,
      $and: [audienceFilterForUser(req.user)],
    }
    if (req.query.kind) {
      const kinds = String(req.query.kind)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      filter.kind = kinds.length === 1 ? kinds[0] : { $in: kinds }
    }
    if (req.query.typeId && ObjectId.isValid(req.query.typeId)) {
      filter.typeId = req.query.typeId
    }
    if (req.query.siteId && ObjectId.isValid(req.query.siteId)) {
      filter.siteId = req.query.siteId
    }

    let resources = await SpaceResource.find(filter)
      .populate('siteId', 'nombre')
      .populate('typeId', 'codigo label icon engineKind')
      .sort({ orden: 1, nombre: 1 })
      .limit(200)
      .lean()

    const attrKeys = String(req.query.attrs || '')
      .split(',')
      .map(normalizeAttributeKey)
      .filter(Boolean)
    if (attrKeys.length) {
      resources = resources.filter((r) => resourceHasAttributes(r, attrKeys))
    }

    if (req.query.resourceId && ObjectId.isValid(req.query.resourceId)) {
      resources = resources.filter((r) => String(r._id) === String(req.query.resourceId))
    }

    const resourceIds = resources.map((r) => r._id)
    const reservations = resourceIds.length
      ? await Reservation.find({
          tenantId: req.tenant._id,
          resourceId: { $in: resourceIds },
          status: { $in: ACTIVE_RESERVATION_STATUSES },
          startAt: { $lt: end },
          endAt: { $gt: start },
        })
          .select('resourceId startAt endAt status unitCode')
          .lean()
      : []

    const byResource = new Map()
    for (const r of reservations) {
      const key = String(r.resourceId)
      if (!byResource.has(key)) byResource.set(key, [])
      byResource.get(key).push(r)
    }

    const items = resources.map((resource) => {
      const overlaps = (byResource.get(String(resource._id)) || []).filter((rv) =>
        rangesOverlap(start, end, rv.startAt, rv.endAt, resource.bufferMin || 0),
      )
      const occupied = overlaps.length
      const cupo = effectiveUnitCount(resource)
      let freeUnitCodes
      let freeUnits = Math.max(0, cupo - occupied)
      if (isNumberedOccupancy(resource)) {
        const taken = new Set(
          overlaps.map((rv) => String(rv.unitCode || '').toUpperCase()).filter(Boolean),
        )
        freeUnitCodes = buildUnitCodes(resource).filter((c) => !taken.has(c))
        freeUnits = freeUnitCodes.length
      }
      return serializeResource(resource, {
        occupied,
        available: freeUnits > 0,
        freeUnits,
        freeUnitCodes,
      })
    })

    res.json({ items, startAt: start, endAt: end })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/reservations/mine?scope=active|past  (upcoming=1 ≡ active) */
router.get('/reservations/mine', requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status
    const kind = req.query.kind
    const scopeRaw = String(req.query.scope || '').toLowerCase()
    const scope =
      scopeRaw === 'past' || req.query.past === '1'
        ? 'past'
        : scopeRaw === 'active' || req.query.upcoming === '1'
          ? 'active'
          : 'active'
    const filter = { tenantId: req.tenant._id, userId: req.user._id }
    if (status) filter.status = status
    if (kind) filter.kind = kind
    const now = new Date()
    if (scope === 'past') {
      filter.$or = [
        { endAt: { $lt: now } },
        { status: { $in: ['cancelled', 'rejected', 'completed', 'no_show'] } },
      ]
    } else {
      filter.endAt = { $gte: now }
      filter.status = { $in: [...ACTIVE_RESERVATION_STATUSES, 'pending'] }
    }

    const items = await Reservation.find(filter)
      .populate({
        path: 'resourceId',
        select: 'nombre kind imageUrl typeId',
        populate: { path: 'typeId', select: 'codigo label icon' },
      })
      .populate('siteId', 'nombre')
      .sort(scope === 'past' ? { startAt: -1 } : { startAt: 1 })
      .limit(100)
      .lean()

    res.json({ items: items.map((r) => serializeReservation(r)), scope })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/reservations */
router.post('/reservations', requireAuth, async (req, res, next) => {
  try {
    const {
      resourceId,
      startAt,
      endAt,
      title,
      motivo,
      plate,
      vehicleType,
      attendees,
      linkOfficeDay,
      unitCode,
    } = req.body || {}

    if (!resourceId || !ObjectId.isValid(resourceId)) {
      return res.status(400).json({ error: 'resourceId inválido' })
    }

    const resource = await SpaceResource.findOne({
      _id: resourceId,
      tenantId: req.tenant._id,
      activo: true,
    }).lean()

    if (!resource || !userMatchesAudience(req.user, resource.audience)) {
      return res.status(404).json({ error: 'Recurso no encontrado' })
    }

    const policy = await getPolicy(req.tenant._id)
    const wantedUnit = isNumberedOccupancy(resource) ? normalizeUnitCode(unitCode) : ''

    const overlappingCount = await countOverlaps({
      tenantId: req.tenant._id,
      resourceId: resource._id,
      startAt,
      endAt,
      bufferMin: resource.bufferMin,
      unitCode: wantedUnit || undefined,
    })

    const userActiveParkingCount = isParkingKind(resource.kind)
      ? await countUserActiveByKinds({
          tenantId: req.tenant._id,
          userId: req.user._id,
          kinds: ['cochera'],
          startAt,
          endAt,
        })
      : 0

    const userActiveDeskCount = isDeskKind(resource.kind)
      ? await countUserActiveByKinds({
          tenantId: req.tenant._id,
          userId: req.user._id,
          kinds: ['puesto', 'zona_cupo'],
          startAt,
          endAt,
        })
      : 0

    const evalResult = evaluateCreateReservation({
      resource,
      policy,
      startAt,
      endAt,
      plate: normalizePlate(plate),
      vehicleType,
      overlappingCount,
      userActiveParkingCount,
      userActiveDeskCount,
      unitCode: wantedUnit,
    })

    if (!evalResult.ok) {
      return res.status(409).json({ error: evalResult.error })
    }

    // Re-check race: count again before insert
    const raceCount = await countOverlaps({
      tenantId: req.tenant._id,
      resourceId: resource._id,
      startAt,
      endAt,
      bufferMin: resource.bufferMin,
      unitCode: wantedUnit || undefined,
    })
    if (wantedUnit) {
      if (raceCount > 0) {
        return res.status(409).json({ error: 'Unidad ocupada en ese horario' })
      }
    } else if (raceCount >= effectiveUnitCount(resource)) {
      return res.status(409).json({ error: 'Sin cupo / recurso ocupado en ese horario' })
    }

    const reservation = await Reservation.create({
      tenantId: req.tenant._id,
      userId: req.user._id,
      resourceId: resource._id,
      siteId: resource.siteId,
      kind: resource.kind,
      title: String(title || resource.nombre).slice(0, 160),
      motivo: String(motivo || '').slice(0, 500),
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: evalResult.status,
      plate: isParkingKind(resource.kind) ? normalizePlate(plate) : '',
      vehicleType: vehicleType || '',
      unitCode: evalResult.unitCode || '',
      attendees: Array.isArray(attendees)
        ? attendees.filter((id) => ObjectId.isValid(id)).slice(0, 50)
        : [],
    })

    if (linkOfficeDay && (isDeskKind(resource.kind) || isRoomKind(resource.kind))) {
      const dateKey = toDateKey(startAt)
      await OfficeDay.findOneAndUpdate(
        { tenantId: req.tenant._id, userId: req.user._id, dateKey },
        {
          $set: {
            siteId: resource.siteId,
            status: 'confirmed',
            reservationId: reservation._id,
          },
          $setOnInsert: {
            tenantId: req.tenant._id,
            userId: req.user._id,
            dateKey,
          },
        },
        { upsert: true },
      )
    }

    await notifyReservationCreated(req.tenant, reservation, resource.nombre)

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'space_reservation_created',
      entityId: reservation._id,
    })

    const populated = await Reservation.findById(reservation._id)
      .populate({
        path: 'resourceId',
        select: 'nombre kind imageUrl typeId',
        populate: { path: 'typeId', select: 'codigo label icon' },
      })
      .populate('siteId', 'nombre')
      .lean()

    res.status(201).json({ item: serializeReservation(populated) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/reservations/:id/cancel */
router.post('/reservations/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' })

    const policy = await getPolicy(req.tenant._id)
    const check = canCancelReservation({ reservation, policy })
    if (!check.ok) return res.status(409).json({ error: check.error })

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancelReason = String(req.body?.reason || '').slice(0, 400)
    await reservation.save()

    const resource = await SpaceResource.findById(reservation.resourceId).select('nombre').lean()
    await notifyReservationCancelled(req.tenant, reservation, resource?.nombre)

    res.json({ item: serializeReservation(reservation.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/reservations/:id/check-in */
router.post('/reservations/:id/check-in', requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (!['confirmed', 'pending'].includes(reservation.status)) {
      return res.status(409).json({ error: 'Estado no permite check-in' })
    }
    reservation.status = 'checked_in'
    reservation.checkedInAt = new Date()
    await reservation.save()
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'space_checkin',
      entityId: reservation._id,
      meta: { kind: 'reservation' },
    })
    res.json({ item: serializeReservation(reservation.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/reservations/:id/check-out */
router.post('/reservations/:id/check-out', requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (!['checked_in', 'confirmed'].includes(reservation.status)) {
      return res.status(409).json({ error: 'Estado no permite check-out' })
    }
    reservation.status = 'completed'
    reservation.checkedOutAt = new Date()
    await reservation.save()
    res.json({ item: serializeReservation(reservation.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/office-days/mine */
router.get('/office-days/mine', requireAuth, async (req, res, next) => {
  try {
    const from = req.query.from || toDateKey(new Date())
    const items = await OfficeDay.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      dateKey: { $gte: from },
      status: { $ne: 'cancelled' },
    })
      .populate('siteId', 'nombre')
      .sort({ dateKey: 1 })
      .limit(60)
      .lean()
    res.json({ items: items.map((d) => serializeOfficeDay(d)) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/office-days — “voy a la oficina” */
router.post('/office-days', requireAuth, async (req, res, next) => {
  try {
    const { siteId, dateKey } = req.body || {}
    if (!siteId || !ObjectId.isValid(siteId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) {
      return res.status(400).json({ error: 'siteId y dateKey (YYYY-MM-DD) requeridos' })
    }

    const policy = await getPolicy(req.tenant._id)

    const site = await SpaceSite.findOne({ _id: siteId, tenantId: req.tenant._id, activo: true }).lean()
    if (!site) return res.status(404).json({ error: 'Sede no encontrada' })

    const weekKeys = weekDateKeys(dateKey)
    const weekCount = await OfficeDay.countDocuments({
      tenantId: req.tenant._id,
      userId: req.user._id,
      dateKey: { $in: weekKeys },
      status: { $in: ['confirmed', 'checked_in'] },
    })
    if (weekCount >= (policy.maxOfficeDaysPerWeek || 5)) {
      return res.status(409).json({
        error: `Máximo ${policy.maxOfficeDaysPerWeek} días en oficina esta semana`,
      })
    }

    if (site.aforoMax != null) {
      const occupied = await OfficeDay.countDocuments({
        tenantId: req.tenant._id,
        siteId: site._id,
        dateKey,
        status: { $in: ['confirmed', 'checked_in'] },
      })
      if (occupied >= site.aforoMax) {
        return res.status(409).json({ error: 'Aforo de la sede completo ese día' })
      }
    }

    const day = await OfficeDay.findOneAndUpdate(
      { tenantId: req.tenant._id, userId: req.user._id, dateKey },
      {
        $set: { siteId: site._id, status: 'confirmed' },
        $setOnInsert: {
          tenantId: req.tenant._id,
          userId: req.user._id,
          dateKey,
        },
      },
      { upsert: true, new: true },
    )
      .populate('siteId', 'nombre')
      .lean()

    res.status(201).json({ item: serializeOfficeDay(day) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/office-days/:id/cancel */
router.post('/office-days/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const day = await OfficeDay.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!day) return res.status(404).json({ error: 'Día no encontrado' })
    day.status = 'cancelled'
    await day.save()
    res.json({ item: serializeOfficeDay(day.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/spaces/office-days/:id/check-in */
router.post('/office-days/:id/check-in', requireAuth, async (req, res, next) => {
  try {
    const day = await OfficeDay.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!day) return res.status(404).json({ error: 'Día no encontrado' })
    if (day.status !== 'confirmed') {
      return res.status(409).json({ error: 'Estado no permite check-in' })
    }
    day.status = 'checked_in'
    day.checkedInAt = new Date()
    await day.save()
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'space_checkin',
      entityId: day._id,
      meta: { kind: 'office_day' },
    })
    res.json({ item: serializeOfficeDay(day.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/who-is-here?siteId=&dateKey= */
router.get('/who-is-here', requireAuth, async (req, res, next) => {
  try {
    const { siteId, dateKey } = req.query
    if (!siteId || !ObjectId.isValid(siteId)) {
      return res.status(400).json({ error: 'siteId requerido' })
    }
    const site = await SpaceSite.findOne({ _id: siteId, tenantId: req.tenant._id }).lean()
    if (!site) return res.status(404).json({ error: 'Sede no encontrada' })

    const key = dateKey || toDateKey(new Date())
    const days = await OfficeDay.find({
      tenantId: req.tenant._id,
      siteId,
      dateKey: key,
      status: { $in: ['confirmed', 'checked_in'] },
    }).lean()

    if (!site.whoIsHereEnabled) {
      return res.json({
        enabled: false,
        count: days.length,
        items: [],
        dateKey: key,
        site: serializeSite(site),
      })
    }

    const users = await User.find({
      _id: { $in: days.map((d) => d.userId) },
      tenantId: req.tenant._id,
    })
      .select('name nombre email avatarUrl')
      .lean()

    const byId = new Map(users.map((u) => [String(u._id), u]))
    const items = days.map((d) => {
      const u = byId.get(String(d.userId))
      return {
        userId: String(d.userId),
        name: u?.name || u?.nombre || 'Colaborador',
        status: d.status,
        checkedInAt: d.checkedInAt,
      }
    })

    res.json({
      enabled: true,
      count: items.length,
      items,
      dateKey: key,
      site: serializeSite(site),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/spaces/zones?siteId=&dateKey= — ocupación agregada por zona */
router.get('/zones', requireAuth, async (req, res, next) => {
  try {
    const siteId = req.query.siteId
    if (!siteId || !ObjectId.isValid(siteId)) {
      return res.status(400).json({ error: 'siteId requerido' })
    }
    const dateKey = req.query.dateKey || toDateKey(new Date())
    const dayStart = new Date(`${dateKey}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateKey}T23:59:59.999Z`)

    const resources = await SpaceResource.find({
      tenantId: req.tenant._id,
      siteId,
      activo: true,
      kind: { $in: ['puesto', 'zona_cupo'] },
      $and: [audienceFilterForUser(req.user)],
    })
      .sort({ zone: 1, orden: 1 })
      .lean()

    const reservations = await Reservation.find({
      tenantId: req.tenant._id,
      siteId,
      kind: { $in: ['puesto', 'zona_cupo'] },
      status: { $in: ACTIVE_RESERVATION_STATUSES },
      startAt: { $lt: dayEnd },
      endAt: { $gt: dayStart },
    })
      .select('resourceId')
      .lean()

    const occ = new Map()
    for (const r of reservations) {
      const k = String(r.resourceId)
      occ.set(k, (occ.get(k) || 0) + 1)
    }

    const zonesMap = new Map()
    for (const r of resources) {
      const z = r.zone || 'General'
      if (!zonesMap.has(z)) {
        zonesMap.set(z, {
          zone: z,
          zoneType: r.zoneType || '',
          floor: r.floor || '',
          capacity: 0,
          occupied: 0,
          resources: [],
        })
      }
      const entry = zonesMap.get(z)
      const cupo = serializeResource(r).effectiveCupo
      const occupied = occ.get(String(r._id)) || 0
      entry.capacity += cupo
      entry.occupied += occupied
      entry.resources.push(
        serializeResource(r, {
          occupied,
          available: occupied < cupo,
        }),
      )
    }

    const zones = [...zonesMap.values()].map((z) => ({
      ...z,
      free: Math.max(0, z.capacity - z.occupied),
      ratio: z.capacity ? z.occupied / z.capacity : 0,
    }))

    res.json({ siteId, dateKey, zones })
  } catch (e) {
    next(e)
  }
})

export default router
