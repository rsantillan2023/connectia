/**
 * Helpers asistencia / turnos / marcación (Ola 18 · §11).
 * Independiente de spaces/OfficeDay.
 */

import { distanceKm } from './directory.js'

export const PUNCH_KINDS = Object.freeze(['entrada', 'salida', 'presencia'])
export const PUNCH_MODES = Object.freeze(['libre', 'en_lugar', 'temporal'])
export const GEO_RESULTS = Object.freeze([
  'in_range',
  'out_of_range',
  'no_gps',
  'accuracy_poor',
  'not_required',
])
export const FUERA_DE_RANGO = Object.freeze(['allow', 'block', 'justify'])
export const SHIFT_STATUSES = Object.freeze(['asignado', 'cancelado', 'reemplazado'])

export function defaultAttendancePolicy() {
  return {
    fueraDeRango: 'justify',
    minAccuracyMetros: 80,
    defaultMode: 'en_lugar',
    enableLibre: true,
    enableEnLugar: true,
    enableTemporal: true,
    toleranciaHorariaMin: 15,
    temporalVigenciaMin: 30,
    domingosEsperadosMes: 2,
    enableGeopopPrefichada: true,
    enableQrPunch: true,
  }
}

export function normalizeAttendancePolicy(raw = {}) {
  const d = defaultAttendancePolicy()
  const fuera = FUERA_DE_RANGO.includes(raw.fueraDeRango) ? raw.fueraDeRango : d.fueraDeRango
  const mode = PUNCH_MODES.includes(raw.defaultMode) ? raw.defaultMode : d.defaultMode
  return {
    fueraDeRango: fuera,
    minAccuracyMetros: clampNum(raw.minAccuracyMetros, 10, 500, d.minAccuracyMetros),
    defaultMode: mode,
    enableLibre: raw.enableLibre !== false,
    enableEnLugar: raw.enableEnLugar !== false,
    enableTemporal: raw.enableTemporal !== false,
    toleranciaHorariaMin: clampNum(raw.toleranciaHorariaMin, 0, 180, d.toleranciaHorariaMin),
    temporalVigenciaMin: clampNum(raw.temporalVigenciaMin, 5, 240, d.temporalVigenciaMin),
    domingosEsperadosMes: clampNum(raw.domingosEsperadosMes, 0, 8, d.domingosEsperadosMes ?? 2),
    enableGeopopPrefichada: raw.enableGeopopPrefichada !== false,
    enableQrPunch: raw.enableQrPunch !== false,
  }
}

function clampNum(v, min, max, fallback) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Distancia en metros (Haversine). */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const km = distanceKm(lat1, lng1, lat2, lng2)
  return km == null ? null : Math.round(km * 1000)
}

export function parseGps(raw) {
  if (!raw || typeof raw !== 'object') return null
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (![lat, lng].every((n) => Number.isFinite(n))) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  const accuracy = raw.accuracy != null ? Number(raw.accuracy) : null
  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: raw.capturedAt ? new Date(raw.capturedAt) : null,
    source: String(raw.source || 'device').slice(0, 40),
  }
}

/**
 * Interpreta fecha+HH:mm del turno como reloj de pared local del servidor.
 * Suficiente para tolerancia; el tenant puede afinar timezone en postdev fino.
 */
export function parseShiftWallClock(shift, which = 'start') {
  if (!shift?.fecha) return null
  const time = which === 'end' ? shift.endTime : shift.startTime
  const [y, mo, d] = String(shift.fecha).split('-').map(Number)
  if (![y, mo, d].every((n) => Number.isFinite(n))) return null
  const [hh, mm] = String(time || (which === 'end' ? '18:00' : '09:00'))
    .split(':')
    .map((x) => Number(x))
  return new Date(y, mo - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0)
}

/**
 * Ventana horaria del turno ± tolerancia (minutos).
 * @returns {{ ok: boolean, status?: number, error?: string, lateMinutes: number, earlyMinutes: number, outsideWindow: boolean }}
 */
export function evaluateShiftWindow({ shift, now = new Date(), policy } = {}) {
  if (!shift?.fecha) {
    return { ok: true, lateMinutes: 0, earlyMinutes: 0, outsideWindow: false }
  }
  const pol = normalizeAttendancePolicy(policy)
  const tol = pol.toleranciaHorariaMin
  const start = parseShiftWallClock(shift, 'start')
  const end = parseShiftWallClock(shift, 'end')
  if (!start || !end) {
    return { ok: true, lateMinutes: 0, earlyMinutes: 0, outsideWindow: false }
  }
  const n = now instanceof Date ? now : new Date(now)
  const windowStart = new Date(start.getTime() - tol * 60_000)
  const windowEnd = new Date(end.getTime() + tol * 60_000)
  const outsideWindow = n < windowStart || n > windowEnd
  const earlyMinutes = n < start ? Math.round((start.getTime() - n.getTime()) / 60_000) : 0
  const lateMinutes = n > start ? Math.round((n.getTime() - start.getTime()) / 60_000) : 0

  if (outsideWindow) {
    return {
      ok: false,
      status: 400,
      error: `Fuera de la ventana del turno (${shift.startTime}–${shift.endTime}, tolerancia ±${tol} min).`,
      lateMinutes,
      earlyMinutes,
      outsideWindow: true,
    }
  }
  return { ok: true, lateMinutes, earlyMinutes, outsideWindow: false }
}

/** Vigencia de marca temporal. */
export function computeTemporalExpiresAt(now = new Date(), policy) {
  const pol = normalizeAttendancePolicy(policy)
  const base = now instanceof Date ? now : new Date(now)
  return new Date(base.getTime() + pol.temporalVigenciaMin * 60_000)
}

/**
 * Evalúa geocerca / modo de marcación (puro, sin DB).
 * @returns {{ ok: boolean, status?: number, error?: string, geoResult?: string, distanceMetros?: number|null, requiresJustification?: boolean, expiresAt?: Date|null }}
 */
export function evaluatePunch({ mode, place, gps, policy, now = new Date() }) {
  const pol = normalizeAttendancePolicy(policy)
  const m = PUNCH_MODES.includes(mode) ? mode : pol.defaultMode

  if (m === 'libre' && !pol.enableLibre) {
    return { ok: false, status: 400, error: 'Modo libre no habilitado en esta comunidad' }
  }
  if (m === 'en_lugar' && !pol.enableEnLugar) {
    return { ok: false, status: 400, error: 'Marcación en lugar no habilitada' }
  }
  if (m === 'temporal' && !pol.enableTemporal) {
    return { ok: false, status: 400, error: 'Marcación temporal no habilitada' }
  }

  const expiresAt = m === 'temporal' ? computeTemporalExpiresAt(now, pol) : null

  if (m === 'libre') {
    return {
      ok: true,
      geoResult: 'not_required',
      distanceMetros: gps && place ? distanceMeters(gps.lat, gps.lng, place.lat, place.lng) : null,
      requiresJustification: false,
      expiresAt: null,
    }
  }

  // en_lugar | temporal → requieren GPS válido
  if (!gps) {
    return {
      ok: false,
      status: 400,
      error: 'Activá la ubicación del dispositivo para marcar en el lugar asignado',
      geoResult: 'no_gps',
      distanceMetros: null,
      expiresAt: null,
    }
  }

  if (
    gps.accuracy != null &&
    Number.isFinite(gps.accuracy) &&
    gps.accuracy > pol.minAccuracyMetros
  ) {
    return {
      ok: false,
      status: 400,
      error: `Precisión GPS insuficiente (${Math.round(gps.accuracy)} m). Acercate o esperá mejor señal (máx. ${pol.minAccuracyMetros} m).`,
      geoResult: 'accuracy_poor',
      distanceMetros: place ? distanceMeters(gps.lat, gps.lng, place.lat, place.lng) : null,
      expiresAt: null,
    }
  }

  if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') {
    return {
      ok: false,
      status: 400,
      error: 'No hay lugar asignado con geocerca para este turno',
      geoResult: 'no_gps',
      distanceMetros: null,
      expiresAt: null,
    }
  }

  const radio = Number(place.radioMetros) > 0 ? Number(place.radioMetros) : 100
  const dist = distanceMeters(gps.lat, gps.lng, place.lat, place.lng)
  const inRange = dist != null && dist <= radio

  if (inRange) {
    return {
      ok: true,
      geoResult: 'in_range',
      distanceMetros: dist,
      requiresJustification: false,
      expiresAt,
    }
  }

  // Fuera de rango
  if (pol.fueraDeRango === 'block') {
    return {
      ok: false,
      status: 403,
      error: `Estás fuera del radio del lugar (${dist} m; permitido ${radio} m). Acercate para marcar.`,
      geoResult: 'out_of_range',
      distanceMetros: dist,
      expiresAt: null,
    }
  }

  if (pol.fueraDeRango === 'justify') {
    return {
      ok: true,
      geoResult: 'out_of_range',
      distanceMetros: dist,
      requiresJustification: true,
      expiresAt,
    }
  }

  // allow
  return {
    ok: true,
    geoResult: 'out_of_range',
    distanceMetros: dist,
    requiresJustification: false,
    expiresAt,
  }
}

export function toDateKey(d = new Date(), tzOffsetMin = null) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isFinite(tzOffsetMin)) {
    const local = new Date(date.getTime() - tzOffsetMin * 60_000)
    return local.toISOString().slice(0, 10)
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function serializePlace(doc) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    nombre: o.nombre,
    codigo: o.codigo || '',
    lat: o.lat,
    lng: o.lng,
    radioMetros: o.radioMetros,
    timezone: o.timezone,
    direccion: o.direccion || '',
    servicio: o.servicio || '',
    objetivo: o.objetivo || '',
    activo: o.activo !== false,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

export function serializeShift(doc, { place, userName } = {}) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    userId: o.userId ? String(o.userId) : null,
    userName: userName || null,
    placeId: o.placeId ? String(o.placeId) : null,
    place: place ? serializePlace(place) : null,
    fecha: o.fecha,
    startTime: o.startTime,
    endTime: o.endTime,
    timezone: o.timezone,
    estado: o.estado,
    notas: o.notas || '',
    alternatePlaceIds: (o.alternatePlaceIds || []).map(String),
    servicio: o.servicio || '',
    objetivo: o.objetivo || '',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

export function serializePunch(doc, { place, userName, shift, now = new Date() } = {}) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  const expiresAt = o.expiresAt || null
  const expired =
    o.mode === 'temporal' && expiresAt ? new Date(expiresAt).getTime() < new Date(now).getTime() : false
  return {
    id: String(o._id),
    userId: o.userId ? String(o.userId) : null,
    userName: userName || null,
    shiftId: o.shiftId ? String(o.shiftId) : null,
    placeId: o.placeId ? String(o.placeId) : null,
    place: place ? serializePlace(place) : null,
    shift: shift ? serializeShift(shift, { place }) : null,
    kind: o.kind,
    mode: o.mode,
    geoResult: o.geoResult,
    distanceMetros: o.distanceMetros ?? null,
    lateMinutes: o.lateMinutes ?? 0,
    earlyMinutes: o.earlyMinutes ?? 0,
    expiresAt,
    expired,
    gps: o.gps || null,
    deviceClockAt: o.deviceClockAt || null,
    serverReceivedAt: o.serverReceivedAt,
    timezone: o.timezone,
    justification: o.justification || '',
    channel: o.channel || 'app',
    idempotencyKey: o.idempotencyKey || null,
    createdAt: o.createdAt,
  }
}

/** Filas planas para export CSV admin. */
export function punchesExportRows(items = []) {
  return items.map((p) => ({
    id: p.id,
    usuario: p.userName || p.userId || '',
    kind: p.kind,
    mode: p.mode,
    geoResult: p.geoResult,
    distanceMetros: p.distanceMetros ?? '',
    lateMinutes: p.lateMinutes ?? 0,
    earlyMinutes: p.earlyMinutes ?? 0,
    lugar: p.place?.nombre || '',
    justification: p.justification || '',
    serverReceivedAt: p.serverReceivedAt || '',
    expiresAt: p.expiresAt || '',
    channel: p.channel || '',
  }))
}

export function punchesExportCsv(items = []) {
  const rows = punchesExportRows(items)
  const headers = [
    'id',
    'usuario',
    'kind',
    'mode',
    'geoResult',
    'distanceMetros',
    'lateMinutes',
    'earlyMinutes',
    'lugar',
    'justification',
    'serverReceivedAt',
    'expiresAt',
    'channel',
  ]
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
}

export function geoResultLabel(r) {
  const map = {
    in_range: 'En rango',
    out_of_range: 'Fuera de rango',
    no_gps: 'Sin GPS',
    accuracy_poor: 'Precisión insuficiente',
    not_required: 'Sin geocerca',
  }
  return map[r] || r
}

export function attendanceMeta() {
  return {
    punchKinds: PUNCH_KINDS,
    punchModes: PUNCH_MODES,
    geoResults: GEO_RESULTS,
    fueraDeRangoOptions: FUERA_DE_RANGO,
    shiftStatuses: SHIFT_STATUSES,
  }
}
