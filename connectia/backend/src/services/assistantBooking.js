/**
 * Búsqueda de disponibilidad y alta de reservas / días de oficina desde el asistente.
 */

import mongoose from 'mongoose'
import {
  SpaceSite,
  SpaceResource,
  SpacePolicy,
  Reservation,
  OfficeDay,
} from '../models/Space.js'
import { audienceFilterForUser, userMatchesAudience } from '../lib/audience.js'
import {
  serializeResource,
  serializePolicy,
  serializeReservation,
  serializeOfficeDay,
  defaultSpacePolicy,
  evaluateCreateReservation,
  normalizePlate,
  toDateKey,
  weekDateKeys,
  isDeskKind,
  isParkingKind,
  isRoomKind,
  ACTIVE_RESERVATION_STATUSES,
  ROOM_KINDS,
  PARKING_KINDS,
  DESK_KINDS,
} from '../lib/spaces.js'
import {
  mergeBookingPayload,
  buildSlotFromEntities,
  formatBookingDraftText,
} from '../lib/assistantBookingDraft.js'
import {
  notifyReservationCreated,
} from './notifySpaces.js'

const ObjectId = mongoose.Types.ObjectId

function tenantCaps(tenant) {
  const caps = tenant?.capabilities || []
  return {
    espacios:
      caps.includes('espacios') ||
      caps.includes('espacios.salas') ||
      caps.includes('espacios.cocheras') ||
      caps.includes('espacios.coworking'),
    salas: caps.includes('espacios') || caps.includes('espacios.salas'),
    cocheras: caps.includes('espacios') || caps.includes('espacios.cocheras'),
    coworking: caps.includes('espacios') || caps.includes('espacios.coworking'),
  }
}

async function getPolicy(tenantId) {
  const doc = await SpacePolicy.findOne({ tenantId }).lean()
  return serializePolicy(doc || defaultSpacePolicy())
}

async function countOverlaps({ tenantId, resourceId, startAt, endAt, bufferMin = 0 }) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const padMs = (Number(bufferMin) || 0) * 60_000
  return Reservation.countDocuments({
    tenantId,
    resourceId,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    startAt: { $lt: new Date(end.getTime() + padMs) },
    endAt: { $gt: start },
  })
}

async function countUserActiveByKinds({ tenantId, userId, kinds, startAt, endAt }) {
  return Reservation.countDocuments({
    tenantId,
    userId,
    kind: { $in: kinds },
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    startAt: { $lt: new Date(endAt) },
    endAt: { $gt: new Date(startAt) },
  })
}

function kindsForIntent(kind) {
  if (kind === 'cochera') return PARKING_KINDS
  if (kind === 'puesto') return DESK_KINDS
  return ROOM_KINDS
}

function intentKindFromType(type) {
  if (type === 'create_office_day') return 'puesto'
  if (type === 'create_reservation_cochera') return 'cochera'
  if (type === 'create_reservation_puesto') return 'puesto'
  return 'sala'
}

function matchSite(sites, sedeHint) {
  if (!sedeHint || !sites?.length) return null
  const h = String(sedeHint).toLowerCase()
  if (h === 'norte') return sites.find((s) => /norte/i.test(s.nombre) || s.codigo === 'NORTE') || null
  if (h === 'central' || h === 'hq') {
    return sites.find((s) => /central|hq|claro/i.test(s.nombre) || s.codigo === 'HQ') || sites[0]
  }
  return (
    sites.find(
      (s) =>
        String(s.nombre).toLowerCase().includes(h) ||
        String(s.codigo || '')
          .toLowerCase()
          .includes(h),
    ) || null
  )
}

/**
 * @param {{ tenant: any, user: any, kind: 'sala'|'cochera'|'puesto', entities?: object, prevPayload?: object, userText: string }} args
 */
export async function draftSpaceBooking({ tenant, user, kind, entities = {}, prevPayload = {}, userText }) {
  const caps = tenantCaps(tenant)
  const deepLinks =
    kind === 'puesto'
      ? [
          { label: 'Ir a Oficina', href: '/oficina' },
          { label: 'Espacios', href: '/espacios' },
        ]
      : [
          {
            label: kind === 'cochera' ? 'Reservar cochera' : 'Reservar sala',
            href: kind === 'cochera' ? '/espacios?tab=cocheras' : '/espacios?tab=salas',
          },
          { label: 'Mis reservas', href: '/espacios?tab=mis' },
        ]

  if (!caps.espacios) {
    return {
      text: 'El módulo de espacios no está habilitado en tu comunidad. Pedile a un admin que active Espacios.',
      links: deepLinks,
      sources: [],
      draftAction: null,
    }
  }
  if (kind === 'sala' && !caps.salas) {
    return {
      text: 'Las reservas de salas no están habilitadas. Podés abrir una consulta a Facilities.',
      links: deepLinks,
      sources: [],
      draftAction: null,
    }
  }
  if (kind === 'cochera' && !caps.cocheras) {
    return {
      text: 'Las cocheras no están habilitadas en esta comunidad.',
      links: deepLinks,
      sources: [],
      draftAction: null,
    }
  }
  if (kind === 'puesto' && !caps.coworking) {
    return {
      text: 'El coworking / “voy a la oficina” no está habilitado.',
      links: deepLinks,
      sources: [],
      draftAction: null,
    }
  }

  const payload = mergeBookingPayload(prevPayload, { ...entities, kind }, userText)
  payload.kind = kind

  // Elección por número de alternativa
  const numPick = String(userText || '').trim().match(/^(?:opcion\s*|opción\s*)?(\d)$/i)
  if (numPick && Array.isArray(payload.alternatives) && payload.alternatives.length) {
    const i = Number(numPick[1]) - 1
    const alt = payload.alternatives[i]
    if (alt) {
      payload.resourceId = alt.id
      payload.resourceNombre = alt.nombre
      payload.siteId = alt.siteId
      payload.siteNombre = alt.siteNombre
      payload.requiresApproval = !!alt.requiresApproval
      payload.exigePatente = !!alt.exigePatente
    }
  }

  const missing = []
  if (!payload.fecha) missing.push('fecha')

  // Oficina: solo sede + día (OfficeDay)
  if (kind === 'puesto' && !payload.resourceId) {
    const sites = await SpaceSite.find({ tenantId: tenant._id, activo: true })
      .sort({ orden: 1, nombre: 1 })
      .lean()
    if (!sites.length) {
      return {
        text: 'No hay sedes configuradas. Pedile a Facilities que cargue Espacios.',
        links: deepLinks,
        sources: [],
        draftAction: null,
      }
    }
    let site = payload.siteId
      ? sites.find((s) => String(s._id) === String(payload.siteId))
      : matchSite(sites, payload.sede)
    if (!site && payload.alternatives?.length) {
      const pick = String(userText || '').trim().toLowerCase()
      const alt = payload.alternatives.find(
        (a, i) =>
          pick === String(i + 1) ||
          String(a.nombre).toLowerCase().includes(pick) ||
          pick.includes(String(a.nombre).toLowerCase().slice(0, 6)),
      )
      if (alt) {
        site = sites.find((s) => String(s._id) === String(alt.siteId || alt.id))
      }
    }
    if (!site && sites.length === 1) site = sites[0]
    if (!site) {
      if (!missing.includes('fecha')) {
        return {
          text: `¿En qué sede vas a la oficina?\n${sites
            .map((s, i) => `• ${i + 1}. ${s.nombre}`)
            .join('\n')}\n\nRespondé con el nombre o “Central” / “Norte”.`,
          links: deepLinks,
          sources: [],
          draftAction: {
            type: 'create_office_day',
            ready: false,
            summary: 'Día en oficina (faltan datos)',
            payload: { ...payload, stage: 'need_site', alternatives: sites.map((s) => ({
              id: String(s._id),
              nombre: s.nombre,
              siteId: String(s._id),
              siteNombre: s.nombre,
            })) },
          },
        }
      }
      missing.push('siteId')
    } else {
      payload.siteId = String(site._id)
      payload.siteNombre = site.nombre
    }

    if (missing.length) {
      return {
        text: formatBookingDraftText(payload, { missing }),
        links: deepLinks,
        sources: [],
        draftAction: {
          type: 'create_office_day',
          ready: false,
          summary: 'Día en oficina (faltan datos)',
          payload: { ...payload, stage: 'need_date' },
        },
      }
    }

    payload.stage = 'ready'
    payload.dateKey = payload.fecha
    return {
      text: formatBookingDraftText(payload),
      links: deepLinks,
      sources: [],
      draftAction: {
        type: 'create_office_day',
        ready: true,
        summary: `Oficina ${payload.siteNombre} ${payload.fecha}`,
        payload,
      },
    }
  }

  if (kind === 'sala' && !payload.hora && !payload.diaCompleto) missing.push('hora')
  if (kind === 'cochera') {
    payload.diaCompleto = payload.diaCompleto || '1'
  }

  if (missing.length) {
    const type =
      kind === 'cochera'
        ? 'create_reservation_cochera'
        : kind === 'puesto'
          ? 'create_reservation_puesto'
          : 'create_reservation'
    return {
      text: formatBookingDraftText(payload, { missing }),
      links: deepLinks,
      sources: [],
      draftAction: {
        type,
        ready: false,
        summary: `Reserva ${kind} (faltan datos)`,
        payload: { ...payload, stage: 'need_data' },
      },
    }
  }

  const slot = buildSlotFromEntities(payload, {
    allDay: kind === 'cochera' || payload.diaCompleto === '1',
    defaultTime: kind === 'sala' ? '10:00' : '09:00',
    defaultDurationMin: kind === 'sala' ? 60 : 8 * 60,
  })
  if (!slot.ok) {
    return {
      text: `No pude armar el horario: ${slot.error}.`,
      links: deepLinks,
      sources: [],
      draftAction: {
        type: 'create_reservation',
        ready: false,
        summary: 'Reserva incompleta',
        payload: { ...payload, stage: 'need_data' },
      },
    }
  }

  const kinds = kindsForIntent(kind)
  const filter = {
    tenantId: tenant._id,
    activo: true,
    kind: { $in: kinds },
    $and: [audienceFilterForUser(user)],
  }
  if (payload.siteId && ObjectId.isValid(payload.siteId)) filter.siteId = payload.siteId
  else if (payload.sede) {
    const sites = await SpaceSite.find({ tenantId: tenant._id, activo: true }).lean()
    const site = matchSite(sites, payload.sede)
    if (site) filter.siteId = site._id
  }

  let resources = await SpaceResource.find(filter)
    .populate('siteId', 'nombre')
    .sort({ orden: 1, nombre: 1 })
    .limit(40)
    .lean()

  if (payload.recurso) {
    const q = String(payload.recurso).toLowerCase()
    const named = resources.filter(
      (r) =>
        String(r.nombre).toLowerCase().includes(q) ||
        String(r.codigo || '')
          .toLowerCase()
          .includes(q),
    )
    if (named.length) resources = named
  }

  if (payload.resourceId && ObjectId.isValid(payload.resourceId)) {
    const preferred = resources.find((r) => String(r._id) === String(payload.resourceId))
    if (preferred) resources = [preferred, ...resources.filter((r) => r !== preferred)]
  }

  const free = []
  for (const resource of resources) {
    if (!userMatchesAudience(user, resource.audience || { mode: 'all' })) continue
    const overlappingCount = await countOverlaps({
      tenantId: tenant._id,
      resourceId: resource._id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      bufferMin: resource.bufferMin,
    })
    const cupo = serializeResource(resource).effectiveCupo
    if (overlappingCount < cupo) {
      free.push(resource)
    }
  }

  if (!free.length) {
    return {
      text: `No hay ${kind === 'cochera' ? 'cocheras' : kind === 'puesto' ? 'puestos' : 'salas'} libres en ese horario. Probá otro día/hora o reservá desde la app.`,
      links: deepLinks,
      sources: [],
      draftAction: null,
    }
  }

  const chosen = free[0]
  const alternatives = free.slice(1, 4).map((r) => ({
    id: String(r._id),
    nombre: r.nombre,
    siteId: String(r.siteId?._id || r.siteId),
    siteNombre: r.siteId?.nombre || '',
    requiresApproval: !!r.requiresApproval,
    exigePatente: !!r.exigePatente,
  }))

  payload.resourceId = String(chosen._id)
  payload.resourceNombre = chosen.nombre
  payload.siteId = String(chosen.siteId?._id || chosen.siteId)
  payload.siteNombre = chosen.siteId?.nombre || ''
  payload.requiresApproval = !!chosen.requiresApproval
  payload.exigePatente = !!chosen.exigePatente
  payload.startAt = slot.startAt.toISOString()
  payload.endAt = slot.endAt.toISOString()
  payload.fecha = payload.fecha || toDateKey(slot.startAt)
  payload.hora = payload.hora || (slot.allDay ? '' : slot.hora || '')
  payload.duracionMin = payload.duracionMin || slot.duracionMin || 60
  payload.alternatives = alternatives

  const type =
    kind === 'cochera'
      ? 'create_reservation_cochera'
      : kind === 'puesto'
        ? 'create_reservation_puesto'
        : 'create_reservation'

  if (kind === 'cochera' && payload.exigePatente && !payload.patente) {
    payload.stage = 'need_data'
    return {
      text: formatBookingDraftText(payload, { missing: ['patente'], alternatives }),
      links: deepLinks,
      sources: [],
      draftAction: {
        type,
        ready: false,
        summary: `Reserva ${kind} (faltan datos)`,
        payload,
      },
    }
  }

  payload.stage = 'ready'

  return {
    text: formatBookingDraftText(payload, { alternatives }),
    links: deepLinks,
    sources: [],
    draftAction: {
      type,
      ready: true,
      summary: `${payload.resourceNombre} ${payload.fecha}${payload.hora ? ` ${payload.hora}` : ''}`,
      payload,
    },
  }
}

/**
 * Ejecuta la reserva confirmada (mismas reglas que POST /api/spaces/reservations).
 */
export async function confirmSpaceReservation({ tenant, user, payload }) {
  const kind = payload.kind || intentKindFromType(payload.type) || 'sala'
  if (!payload.resourceId || !ObjectId.isValid(payload.resourceId)) {
    const err = new Error('Falta el recurso a reservar')
    err.status = 400
    throw err
  }

  const resource = await SpaceResource.findOne({
    _id: payload.resourceId,
    tenantId: tenant._id,
    activo: true,
  }).lean()
  if (!resource || !userMatchesAudience(user, resource.audience || { mode: 'all' })) {
    const err = new Error('Recurso no encontrado')
    err.status = 404
    throw err
  }

  const startAt = payload.startAt || buildSlotFromEntities(payload).startAt
  const endAt = payload.endAt || buildSlotFromEntities(payload).endAt
  if (!startAt || !endAt) {
    const err = new Error('Horario incompleto')
    err.status = 400
    throw err
  }

  const policy = await getPolicy(tenant._id)
  const overlappingCount = await countOverlaps({
    tenantId: tenant._id,
    resourceId: resource._id,
    startAt,
    endAt,
    bufferMin: resource.bufferMin,
  })
  const userActiveParkingCount = isParkingKind(resource.kind)
    ? await countUserActiveByKinds({
        tenantId: tenant._id,
        userId: user._id,
        kinds: ['cochera'],
        startAt,
        endAt,
      })
    : 0
  const userActiveDeskCount = isDeskKind(resource.kind)
    ? await countUserActiveByKinds({
        tenantId: tenant._id,
        userId: user._id,
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
    plate: normalizePlate(payload.patente),
    vehicleType: payload.vehicleType || '',
    overlappingCount,
    userActiveParkingCount,
    userActiveDeskCount,
  })
  if (!evalResult.ok) {
    const err = new Error(evalResult.error)
    err.status = 409
    throw err
  }

  const raceCount = await countOverlaps({
    tenantId: tenant._id,
    resourceId: resource._id,
    startAt,
    endAt,
    bufferMin: resource.bufferMin,
  })
  if (raceCount >= serializeResource(resource).effectiveCupo) {
    const err = new Error('Sin cupo / recurso ocupado en ese horario')
    err.status = 409
    throw err
  }

  const reservation = await Reservation.create({
    tenantId: tenant._id,
    userId: user._id,
    resourceId: resource._id,
    siteId: resource.siteId,
    kind: resource.kind,
    title: String(payload.resourceNombre || resource.nombre).slice(0, 160),
    motivo: String(payload.motivo || 'Reserva desde Asistente').slice(0, 500),
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    status: evalResult.status,
    plate: isParkingKind(resource.kind) ? normalizePlate(payload.patente) : '',
    vehicleType: payload.vehicleType || '',
    attendees: [],
  })

  if (isDeskKind(resource.kind) || isRoomKind(resource.kind)) {
    const dateKey = toDateKey(startAt)
    await OfficeDay.findOneAndUpdate(
      { tenantId: tenant._id, userId: user._id, dateKey },
      {
        $set: {
          siteId: resource.siteId,
          status: 'confirmed',
          reservationId: reservation._id,
        },
        $setOnInsert: {
          tenantId: tenant._id,
          userId: user._id,
          dateKey,
        },
      },
      { upsert: true },
    )
  }

  await notifyReservationCreated(tenant, reservation, resource.nombre)

  const populated = await Reservation.findById(reservation._id)
    .populate('resourceId', 'nombre kind')
    .populate('siteId', 'nombre')
    .lean()

  return {
    reservation: serializeReservation(populated),
    text: `Listo: reservé **${resource.nombre}** (${evalResult.status === 'pending' ? 'pendiente de aprobación' : 'confirmada'}).`,
    links: [
      { label: 'Mis reservas', href: '/espacios?tab=mis' },
      { label: kind === 'puesto' ? 'Oficina' : 'Espacios', href: kind === 'puesto' ? '/oficina' : '/espacios' },
    ],
  }
}

export async function confirmOfficeDay({ tenant, user, payload }) {
  const policy = await getPolicy(tenant._id)
  const dateKey = payload.dateKey || payload.fecha
  const siteId = payload.siteId
  if (!siteId || !ObjectId.isValid(siteId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) {
    const err = new Error('Sede y fecha requeridas')
    err.status = 400
    throw err
  }

  const site = await SpaceSite.findOne({ _id: siteId, tenantId: tenant._id, activo: true }).lean()
  if (!site) {
    const err = new Error('Sede no encontrada')
    err.status = 404
    throw err
  }

  const weekKeys = weekDateKeys(dateKey)
  const weekCount = await OfficeDay.countDocuments({
    tenantId: tenant._id,
    userId: user._id,
    dateKey: { $in: weekKeys },
    status: { $in: ['confirmed', 'checked_in'] },
  })
  if (weekCount >= (policy.maxOfficeDaysPerWeek || 5)) {
    const err = new Error(`Máximo ${policy.maxOfficeDaysPerWeek} días en oficina esta semana`)
    err.status = 409
    throw err
  }

  if (site.aforoMax != null) {
    const occupied = await OfficeDay.countDocuments({
      tenantId: tenant._id,
      siteId: site._id,
      dateKey,
      status: { $in: ['confirmed', 'checked_in'] },
    })
    if (occupied >= site.aforoMax) {
      const err = new Error('Aforo de la sede completo ese día')
      err.status = 409
      throw err
    }
  }

  const day = await OfficeDay.findOneAndUpdate(
    { tenantId: tenant._id, userId: user._id, dateKey },
    {
      $set: { siteId: site._id, status: 'confirmed' },
      $setOnInsert: {
        tenantId: tenant._id,
        userId: user._id,
        dateKey,
      },
    },
    { upsert: true, new: true },
  )
    .populate('siteId', 'nombre')
    .lean()

  return {
    officeDay: serializeOfficeDay(day),
    text: `Listo: registré tu día en **${site.nombre}** el ${dateKey}.`,
    links: [
      { label: 'Oficina', href: '/oficina' },
      { label: 'Espacios', href: '/espacios' },
    ],
  }
}

export { tenantCaps, intentKindFromType }
