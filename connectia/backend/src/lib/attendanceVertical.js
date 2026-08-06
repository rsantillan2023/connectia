/**
 * Vertical Ola 18 — Geopop prefichada (mock), multi-instalación, QR, domingos, ECR local.
 */
import crypto from 'crypto'
import { toDateKey } from './attendance.js'

/** ¿Es domingo (0) en reloj local del servidor? */
export function isSunday(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return d.getDay() === 0
}

/** Domingos YYYY-MM-DD en un mes (1–12). */
export function sundaysInMonth(year, month1to12) {
  const out = []
  const d = new Date(year, month1to12 - 1, 1)
  while (d.getMonth() === month1to12 - 1) {
    if (d.getDay() === 0) out.push(toDateKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/**
 * Agrega marcas de domingo por usuario.
 * @param {Array<{ userId: string, serverReceivedAt: Date|string, kind?: string }>} punches
 * @param {{ year: number, month: number, expectedPerUser?: number, users?: Map<string, object> }} opts
 */
export function aggregateSundayPunches(punches, { year, month, expectedPerUser = 2, users = new Map() } = {}) {
  const sundaySet = new Set(sundaysInMonth(year, month))
  const byUser = new Map()
  for (const p of punches || []) {
    const at = p.serverReceivedAt instanceof Date ? p.serverReceivedAt : new Date(p.serverReceivedAt)
    if (Number.isNaN(at.getTime())) continue
    if (at.getFullYear() !== year || at.getMonth() + 1 !== month) continue
    if (at.getDay() !== 0) continue
    const uid = String(p.userId)
    if (!byUser.has(uid)) byUser.set(uid, new Set())
    byUser.get(uid).add(toDateKey(at))
  }

  const rows = []
  const ids = byUser.size ? [...byUser.keys()] : [...users.keys()]
  for (const uid of new Set([...ids, ...byUser.keys()])) {
    const delivered = byUser.get(uid)?.size || 0
    const expected = Number(expectedPerUser) || 0
    const pending = Math.max(0, expected - delivered)
    const u = users.get(uid) || {}
    const nombre =
      [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || uid
    rows.push({
      userId: uid,
      nombreTrabajador: nombre,
      nombreClienteTrabajador: u.cargo || '',
      rutTrabajador: u.dni || u.idExterno || u.usuario || '',
      domEntregados: delivered,
      domPorEntregar: pending,
      domDeberiaEntregar: expected,
      domDiferencia: delivered - expected,
      fechaInicioContrato: '',
      periodo: `${year}-${String(month).padStart(2, '0')}`,
      color: delivered >= expected ? 'green' : delivered > 0 ? 'amber' : 'red',
      sundaysMarked: [...(byUser.get(uid) || [])],
      sundaysInMonth: [...sundaySet],
    })
  }
  return rows.sort((a, b) => a.nombreTrabajador.localeCompare(b.nombreTrabajador, 'es'))
}

export function createQrTokenPayload({ tenantId, userId, shiftId, placeId, ttlSec = 120 }) {
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + ttlSec * 1000)
  return {
    token,
    tenantId: String(tenantId),
    userId: String(userId),
    shiftId: shiftId ? String(shiftId) : null,
    placeId: placeId ? String(placeId) : null,
    expiresAt,
    kind: 'attendance.qr',
  }
}

export function qrPayloadString(entry) {
  return `connectia-att:${entry.token}`
}

export function parseQrPayload(raw) {
  const s = String(raw || '').trim()
  const m = /^connectia-att:([a-f0-9]{32})$/i.exec(s)
  if (m) return m[1]
  if (/^[a-f0-9]{32}$/i.test(s)) return s
  return null
}

/** Mapea AttendancePunch → fila panel ECR. */
export function punchToEcrMarca(punch, { user, place, shift } = {}) {
  const at = punch.serverReceivedAt ? new Date(punch.serverReceivedAt) : new Date()
  const hh = String(at.getHours()).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')
  const dd = String(at.getDate()).padStart(2, '0')
  const mo = String(at.getMonth() + 1).padStart(2, '0')
  const yyyy = at.getFullYear()
  const nombre =
    user
      ? [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario
      : 'Colaborador'
  const tipo =
    punch.kind === 'salida' ? 'S' : punch.kind === 'presencia' ? 'P' : 'E'
  return {
    punchId: String(punch._id || punch.id),
    userId: String(punch.userId),
    nombreTrabajador: nombre,
    nombreClienteTrabajador: user?.cargo || place?.servicio || '',
    rutTrabajador: user?.dni || user?.idExterno || user?.usuario || '',
    mFueraRango: punch.distanceMetros != null ? `${punch.distanceMetros} m` : 'fuera',
    horario: shift ? `${shift.startTime}-${shift.endTime}` : '',
    horaMarca: `${hh}:${mm}`,
    sobreTiempo: String(punch.lateMinutes || 0),
    nombreLocal: place?.nombre || '',
    fecha: `${dd}-${mo}-${yyyy}`,
    idDivisionTrabajador: place?.servicio || '',
    marcaLatitud: punch.gps?.lat ?? null,
    marcaLongitud: punch.gps?.lng ?? null,
    tipoMarca: tipo,
    urlMapa:
      punch.gps?.lat != null
        ? `https://www.google.com/maps?q=${punch.gps.lat},${punch.gps.lng}`
        : '',
    accJustificar: !punch.justification,
    accAmonestar: true,
    accGenAnexo: true,
    justification: punch.justification || '',
    geoResult: punch.geoResult,
    servicio: place?.servicio || '',
    objetivo: place?.objetivo || '',
  }
}

/** Prefichada estilo Geopop desde turnos locales. */
export function shiftsToPrefichada(shifts, { places = new Map(), punchesByShift = new Map() } = {}) {
  return (shifts || []).map((s) => {
    const place = places.get(String(s.placeId))
    const punches = punchesByShift.get(String(s._id || s.id)) || []
    const last = punches[0]
    return {
      shiftId: String(s._id || s.id),
      fecha: s.fecha,
      startTime: s.startTime,
      endTime: s.endTime,
      placeId: s.placeId ? String(s.placeId) : null,
      placeNombre: place?.nombre || '',
      servicio: place?.servicio || s.servicio || '',
      objetivo: place?.objetivo || s.objetivo || '',
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      radioMetros: place?.radioMetros ?? null,
      source: 'geopop_mock',
      lastPunch: last
        ? {
            kind: last.kind,
            geoResult: last.geoResult,
            at: last.serverReceivedAt,
          }
        : null,
      estadoMarcacion: last ? last.geoResult : 'sin_marcar',
    }
  })
}
