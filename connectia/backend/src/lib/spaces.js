/**
 * Helpers puros §34/§35 — espacios, reservas, coworking.
 */

import {
  resolveOccupancyClass,
  effectiveUnitCount,
  occupancyLabel,
  occupancyShortLabel,
  isNumberedOccupancy,
  normalizeUnitCode,
  isValidUnitCode,
  buildUnitCodes,
  unitLabelOf,
} from './spacesOccupancy.js'

export const RESOURCE_KINDS = [
  'sala',
  'otro',
  'cochera',
  'puesto',
  'zona_cupo',
  'activo',
  'hora_libre',
  'grupo',
]
export const ROOM_KINDS = ['sala', 'otro']
export const PARKING_KINDS = ['cochera']
export const DESK_KINDS = ['puesto', 'zona_cupo']
/** Kinds Ola 36-n: activo prestable, franja de hora libre, recurso grupal. */
export const ASSET_KINDS = ['activo']
export const FREE_HOUR_KINDS = ['hora_libre']
export const GROUP_KINDS = ['grupo']
export const ACTIVE_RESERVATION_STATUSES = ['pending', 'confirmed', 'checked_in']

export const KIND_LABELS = {
  sala: 'Sala',
  otro: 'Espacio',
  cochera: 'Cochera',
  puesto: 'Puesto',
  zona_cupo: 'Zona (cupo)',
  activo: 'Activo',
  hora_libre: 'Hora libre',
  grupo: 'Grupo',
}

export const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada',
  completed: 'Completada',
  no_show: 'No-show',
  checked_in: 'Check-in',
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] || kind || 'Recurso'
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || ''
}

export function isRoomKind(kind) {
  return ROOM_KINDS.includes(kind)
}

export function isParkingKind(kind) {
  return PARKING_KINDS.includes(kind)
}

export function isDeskKind(kind) {
  return DESK_KINDS.includes(kind)
}

export function isAssetKind(kind) {
  return ASSET_KINDS.includes(kind)
}

export function isFreeHourKind(kind) {
  return FREE_HOUR_KINDS.includes(kind)
}

export function isGroupKind(kind) {
  return GROUP_KINDS.includes(kind)
}

/** Capacidad efectiva de ocupación concurrente del recurso. */
export function effectiveCupo(resource) {
  return effectiveUnitCount(resource)
}

/**
 * Solape de intervalos [start, end) con buffer (min) tras cada intervalo
 * (impide encadenar reservas sin el margen del recurso).
 */
export function rangesOverlap(startA, endA, startB, endB, bufferMin = 0) {
  const a0 = +new Date(startA)
  const a1 = +new Date(endA)
  const b0 = +new Date(startB)
  const b1 = +new Date(endB)
  if (!(a0 < a1) || !(b0 < b1)) return false
  const pad = (Number(bufferMin) || 0) * 60_000
  return a0 < b1 + pad && b0 < a1 + pad
}

export const intervalsOverlap = rangesOverlap

/**
 * ¿Hay cupo libre dado N reservas activas que solapan?
 */
export function hasFreeSlot({ resource, overlappingCount }) {
  const cupo = effectiveCupo(resource)
  return (Number(overlappingCount) || 0) < cupo
}

/**
 * Valida rango de reserva.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateReservationRange({ startAt, endAt, now = new Date() }) {
  const s = new Date(startAt)
  const e = new Date(endAt)
  if (Number.isNaN(+s) || Number.isNaN(+e)) {
    return { ok: false, error: 'Fechas inválidas' }
  }
  if (!(s < e)) {
    return { ok: false, error: 'El fin debe ser posterior al inicio' }
  }
  if (e <= now) {
    return { ok: false, error: 'La reserva ya está en el pasado' }
  }
  const maxDays = 90
  if (s.getTime() - now.getTime() > maxDays * 24 * 60 * 60 * 1000) {
    return { ok: false, error: `No se puede reservar con más de ${maxDays} días de anticipación` }
  }
  return { ok: true }
}

/** Normaliza patente (mayúsculas, sin espacios). */
export function normalizePlate(plate) {
  return String(plate || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}

export function isValidPlate(plate) {
  const p = normalizePlate(plate)
  return p.length >= 5 && p.length <= 10
}

/**
 * Parsea "HH:MM" a minutos desde medianoche.
 */
export function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * ¿El rango cae dentro del horario del recurso? (día local aproximado UTC del start).
 */
export function withinHorario(resource, startAt, endAt) {
  const h = resource?.horario || {}
  const days = Array.isArray(h.days) && h.days.length ? h.days : [1, 2, 3, 4, 5]
  const open = parseHm(h.open || '08:00')
  const close = parseHm(h.close || '20:00')
  if (open == null || close == null || !(open < close)) return true

  const s = new Date(startAt)
  const e = new Date(endAt)
  // 0=dom … 6=sáb (Date local del runtime)
  const dow = s.getDay()
  const dayOk = days.includes(dow) || (dow === 0 && days.includes(7))
  if (!dayOk) return false

  const sMin = s.getHours() * 60 + s.getMinutes()
  const eMin = e.getHours() * 60 + e.getMinutes()
  if (e.getDate() !== s.getDate()) return false
  if (sMin < open || eMin > close) return false
  return true
}

/** dateKey YYYY-MM-DD desde Date (UTC). */
export function toDateKey(d) {
  const x = new Date(d)
  if (Number.isNaN(+x)) return ''
  return x.toISOString().slice(0, 10)
}

/** Lunes de la semana ISO-ish (UTC) para dateKey. */
export function weekStartKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00.000Z`)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

export function weekDateKeys(dateKey) {
  const start = weekStartKey(dateKey)
  const base = new Date(`${start}T12:00:00.000Z`)
  const keys = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(base)
    x.setUTCDate(base.getUTCDate() + i)
    keys.push(x.toISOString().slice(0, 10))
  }
  return keys
}

export function defaultSpacePolicy() {
  return {
    maxSimultaneousParking: 1,
    maxSimultaneousDesk: 1,
    maxOfficeDaysPerWeek: 5,
    cancelMinutesBefore: 30,
    checkInGraceMinutes: 15,
  }
}

export function serializeSite(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    nombre: doc.nombre,
    codigo: doc.codigo || '',
    direccion: doc.direccion || '',
    timezone: doc.timezone || 'America/Argentina/Buenos_Aires',
    aforoMax: doc.aforoMax ?? null,
    amenities: doc.amenities || [],
    whoIsHereEnabled: !!doc.whoIsHereEnabled,
    activo: doc.activo !== false,
    orden: doc.orden ?? 100,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeResource(doc, extras = {}) {
  if (!doc) return null
  /** Distingue populate de ObjectId (ObjectId también es object y a veces expone ._id). */
  const asPopulated = (ref, hintKeys = []) => {
    if (!ref || typeof ref !== 'object') return null
    if (ref._bsontype === 'ObjectId' || typeof ref.toHexString === 'function') {
      const hasHint = hintKeys.some((k) => ref[k] != null && ref[k] !== '')
      if (!hasHint) return null
    }
    const id = ref._id ?? ref.id
    if (id == null) return null
    const hasMeta = hintKeys.some((k) => k in ref)
    return hasMeta ? ref : null
  }
  const refId = (ref) => {
    if (ref == null || ref === '') return ''
    if (typeof ref === 'object') {
      const id = ref._id ?? ref.id
      return id != null ? String(id) : ''
    }
    return String(ref)
  }
  const site = asPopulated(doc.siteId, ['nombre', 'codigo', 'direccion'])
  const type = asPopulated(doc.typeId, ['label', 'codigo', 'engineKind', 'icon'])
  const attributes = (doc.attributes || []).map((a) => ({
    key: a.key,
    value: a.value || '',
  }))
  return {
    id: String(doc._id),
    siteId: site ? refId(site) : refId(doc.siteId),
    siteNombre: site?.nombre || extras.siteNombre || '',
    typeId: type ? refId(type) : doc.typeId ? refId(doc.typeId) : null,
    typeCodigo: type?.codigo || extras.typeCodigo || '',
    typeLabel: type?.label || extras.typeLabel || '',
    typeIcon: type?.icon || extras.typeIcon || '',
    kind: doc.kind,
    kindLabel: type?.label || kindLabel(doc.kind),
    nombre: doc.nombre,
    codigo: doc.codigo || '',
    descripcion: doc.descripcion || '',
    floor: doc.floor || '',
    zone: doc.zone || '',
    zoneType: doc.zoneType || '',
    capacity: doc.capacity ?? null,
    cupo: doc.cupo ?? null,
    occupancyClass: resolveOccupancyClass(doc),
    occupancyLabel: occupancyLabel(resolveOccupancyClass(doc)),
    occupancyShort: occupancyShortLabel(doc),
    unitCount: effectiveUnitCount(doc),
    unitLabel: unitLabelOf(doc),
    unitPrefix: String(doc.unitPrefix || ''),
    unitPad: Number(doc.unitPad) || 3,
    numbered: isNumberedOccupancy(doc),
    effectiveCupo: effectiveCupo(doc),
    equipment: doc.equipment || [],
    attributes,
    vehicleTypes: doc.vehicleTypes || [],
    esFija: !!doc.esFija,
    exigePatente: !!doc.exigePatente,
    diaCompleto: !!doc.diaCompleto,
    accessible: !!doc.accessible,
    bufferMin: doc.bufferMin || 0,
    requiresApproval: !!doc.requiresApproval,
    horario: doc.horario || { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
    audience: doc.audience || { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    imageUrl: doc.imageUrl || '',
    activo: doc.activo !== false,
    orden: doc.orden ?? 100,
    available: extras.available,
    occupied: extras.occupied,
    freeUnits: extras.freeUnits,
    freeUnitCodes: extras.freeUnitCodes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeReservation(doc, extras = {}) {
  if (!doc) return null
  const resource =
    doc.resourceId && typeof doc.resourceId === 'object' && doc.resourceId._id ? doc.resourceId : null
  const site = doc.siteId && typeof doc.siteId === 'object' && doc.siteId._id ? doc.siteId : null
  return {
    id: String(doc._id),
    resourceId: String(resource?._id || doc.resourceId),
    siteId: String(site?._id || doc.siteId),
    userId: String(doc.userId?._id || doc.userId),
    userName: extras.userName || doc.userId?.name || doc.userId?.nombre || '',
    kind: doc.kind,
    kindLabel: kindLabel(doc.kind),
    resourceNombre: resource?.nombre || extras.resourceNombre || '',
    resourceImageUrl: resource?.imageUrl || extras.resourceImageUrl || '',
    typeIcon: extras.typeIcon || resource?.typeId?.icon || '',
    siteNombre: site?.nombre || extras.siteNombre || '',
    title: doc.title || '',
    motivo: doc.motivo || '',
    unitCode: doc.unitCode || '',
    startAt: doc.startAt,
    endAt: doc.endAt,
    status: doc.status,
    statusLabel: statusLabel(doc.status),
    plate: doc.plate || '',
    vehicleType: doc.vehicleType || '',
    attendees: (doc.attendees || []).map((a) => String(a?._id || a)),
    checkedInAt: doc.checkedInAt,
    checkedOutAt: doc.checkedOutAt,
    approvedBy: doc.approvedBy ? String(doc.approvedBy) : null,
    approvedAt: doc.approvedAt,
    rejectReason: doc.rejectReason || '',
    linkedReservationIds: (doc.linkedReservationIds || []).map((id) => String(id)),
    cancelledAt: doc.cancelledAt,
    cancelReason: doc.cancelReason || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeOfficeDay(doc, extras = {}) {
  if (!doc) return null
  const site = doc.siteId && typeof doc.siteId === 'object' && doc.siteId._id ? doc.siteId : null
  return {
    id: String(doc._id),
    siteId: String(site?._id || doc.siteId),
    siteNombre: site?.nombre || extras.siteNombre || '',
    userId: String(doc.userId?._id || doc.userId),
    userName: extras.userName || doc.userId?.name || '',
    dateKey: doc.dateKey,
    status: doc.status,
    reservationId: doc.reservationId ? String(doc.reservationId) : null,
    checkedInAt: doc.checkedInAt,
    checkedOutAt: doc.checkedOutAt,
    createdAt: doc.createdAt,
  }
}

export function serializePolicy(doc) {
  const d = { ...defaultSpacePolicy(), ...(doc || {}) }
  return {
    maxSimultaneousParking: d.maxSimultaneousParking ?? 1,
    maxSimultaneousDesk: d.maxSimultaneousDesk ?? 1,
    maxOfficeDaysPerWeek: d.maxOfficeDaysPerWeek ?? 5,
    cancelMinutesBefore: d.cancelMinutesBefore ?? 30,
    checkInGraceMinutes: d.checkInGraceMinutes ?? 15,
  }
}

export function spacesMeta() {
  return {
    kinds: RESOURCE_KINDS.map((id) => ({ id, label: kindLabel(id) })),
    statuses: Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label })),
    occupancy: [
      { id: 'unitario', label: 'Unitario', needsUnits: false, numbered: false },
      { id: 'unidades_numeradas', label: 'Unidades numeradas', needsUnits: true, numbered: true },
      { id: 'pool', label: 'Cupo compartido', needsUnits: true, numbered: false },
      { id: 'aforo', label: 'Aforo / multi-reserva', needsUnits: true, numbered: false },
    ],
  }
}

/** Mapea equipment[] legado → attributes si attributes vacío. */
export function attributesFromEquipment(equipment = [], accessible = false) {
  const attrs = (equipment || []).map((e) => ({
    key: String(e || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40),
    value: '',
  })).filter((a) => a.key)
  if (accessible && !attrs.some((a) => a.key === 'accesible')) {
    attrs.push({ key: 'accesible', value: '' })
  }
  return attrs
}

/**
 * Evalúa si se puede crear la reserva dadas las reglas de política + solapes.
 * @returns {{ ok: true, status: string } | { ok: false, error: string }}
 */
export function evaluateCreateReservation({
  resource,
  policy,
  startAt,
  endAt,
  plate,
  vehicleType,
  overlappingCount,
  userActiveParkingCount,
  userActiveDeskCount,
  unitCode,
  now = new Date(),
}) {
  const range = validateReservationRange({ startAt, endAt, now })
  if (!range.ok) return range

  if (!resource || resource.activo === false) {
    return { ok: false, error: 'Recurso no disponible' }
  }

  const pol = { ...defaultSpacePolicy(), ...(policy || {}) }

  if (!withinHorario(resource, startAt, endAt)) {
    return { ok: false, error: 'Fuera del horario del recurso' }
  }

  if (isNumberedOccupancy(resource)) {
    const code = normalizeUnitCode(unitCode)
    if (!code) {
      return { ok: false, error: `Elegí un ${unitLabelOf(resource).toLowerCase()}` }
    }
    if (!isValidUnitCode(resource, code)) {
      return { ok: false, error: `${unitLabelOf(resource)} inválido` }
    }
    if ((Number(overlappingCount) || 0) > 0) {
      return { ok: false, error: `${unitLabelOf(resource)} ${code} no disponible en ese horario` }
    }
  } else if (!hasFreeSlot({ resource, overlappingCount })) {
    return { ok: false, error: 'Sin cupo / recurso ocupado en ese horario' }
  }

  if (isParkingKind(resource.kind)) {
    if ((userActiveParkingCount || 0) >= (pol.maxSimultaneousParking || 1)) {
      return { ok: false, error: `Máximo ${pol.maxSimultaneousParking} cochera(s) simultánea(s)` }
    }
    if (resource.exigePatente && !isValidPlate(plate)) {
      return { ok: false, error: 'Patente inválida o faltante' }
    }
    if (resource.vehicleTypes?.length && vehicleType) {
      if (!resource.vehicleTypes.includes(vehicleType)) {
        return { ok: false, error: 'Tipo de vehículo no admitido en esta plaza' }
      }
    }
  }

  if (isDeskKind(resource.kind)) {
    if ((userActiveDeskCount || 0) >= (pol.maxSimultaneousDesk || 1)) {
      return { ok: false, error: `Máximo ${pol.maxSimultaneousDesk} puesto(s) simultáneo(s)` }
    }
  }

  const status = resource.requiresApproval ? 'pending' : 'confirmed'
  return {
    ok: true,
    status,
    unitCode: isNumberedOccupancy(resource) ? normalizeUnitCode(unitCode) : '',
  }
}

/**
 * ¿Se puede cancelar ahora?
 */
export function canCancelReservation({ reservation, policy, now = new Date() }) {
  if (!reservation) return { ok: false, error: 'Reserva no encontrada' }
  if (!['pending', 'confirmed', 'checked_in'].includes(reservation.status)) {
    return { ok: false, error: 'La reserva no se puede cancelar' }
  }
  const mins = Number(policy?.cancelMinutesBefore ?? 30)
  const start = +new Date(reservation.startAt)
  if (reservation.status !== 'pending' && mins > 0 && start - +now < mins * 60_000) {
    return { ok: false, error: `Cancelá con al menos ${mins} min de anticipación` }
  }
  return { ok: true }
}
