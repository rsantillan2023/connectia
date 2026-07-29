/**
 * Helpers directorio §21 — serialize, vigencia, distancia, normalización.
 */

import { serializeAudience, normalizeAudience } from './audience.js'

export const DIRECTORY_TIPOS = ['persona', 'sede', 'servicio', 'emergencia', 'telefono', 'otro']

export const TIPO_META = {
  persona: { label: 'Personas', icon: 'user', color: '#0f766e' },
  sede: { label: 'Sedes', icon: 'building', color: '#1d4ed8' },
  servicio: { label: 'Servicios', icon: 'grid', color: '#7c3aed' },
  emergencia: { label: 'Emergencias', icon: 'alert', color: '#b91c1c' },
  telefono: { label: 'Teléfonos', icon: 'phone', color: '#c2410c' },
  otro: { label: 'Otros', icon: 'file', color: '#475569' },
}

export function str(v, max = 200) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

export function normalizePhone(raw) {
  return String(raw || '')
    .replace(/[^\d+]/g, '')
    .slice(0, 40)
}

export function isEntryVisibleNow(entry, now = new Date()) {
  if (!entry || entry.activo === false) return false
  if (entry.vigenciaDesde && new Date(entry.vigenciaDesde) > now) return false
  if (entry.vigenciaHasta && new Date(entry.vigenciaHasta) < now) return false
  return true
}

/** Haversine km */
export function distanceKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function mapsUrl(entry) {
  if (typeof entry.lat === 'number' && typeof entry.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`
  }
  const q = [entry.direccion, entry.ciudad].filter(Boolean).join(', ')
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function telHref(phone) {
  const n = normalizePhone(phone)
  return n ? `tel:${n}` : ''
}

export function waHref(phone) {
  const n = normalizePhone(phone).replace(/^\+/, '')
  return n ? `https://wa.me/${n}` : ''
}

export function mailHref(email) {
  const e = str(email, 200)
  return e.includes('@') ? `mailto:${e}` : ''
}

/**
 * @param {object} doc
 * @param {{ favorite?: boolean, distanceKm?: number|null }} extras
 */
export function serializeDirectoryEntry(doc, extras = {}) {
  const tipo = DIRECTORY_TIPOS.includes(doc.tipo) ? doc.tipo : 'otro'
  const meta = TIPO_META[tipo] || TIPO_META.otro
  const lat = typeof doc.lat === 'number' ? doc.lat : null
  const lng = typeof doc.lng === 'number' ? doc.lng : null
  const telefono = doc.telefono || ''
  const whatsapp = doc.whatsapp || telefono
  const email = doc.email || ''
  const entry = {
    id: String(doc._id),
    tipo,
    tipoLabel: meta.label,
    nombre: doc.nombre || '',
    descripcion: doc.descripcion || '',
    categoria: doc.categoria || 'General',
    tags: Array.isArray(doc.tags) ? doc.tags.map((t) => str(t, 40)).filter(Boolean) : [],
    telefono,
    interno: doc.interno || '',
    whatsapp,
    email,
    direccion: doc.direccion || '',
    ciudad: doc.ciudad || '',
    lat,
    lng,
    hasLocation: lat != null && lng != null,
    horario: doc.horario || '',
    userId: doc.userId ? String(doc.userId) : null,
    imageUrl: str(doc.imageUrl, 500),
    icon: doc.icon || meta.icon,
    color: doc.color || meta.color,
    orden: doc.orden ?? 100,
    destacado: Boolean(doc.destacado),
    activo: doc.activo !== false,
    vigenciaDesde: doc.vigenciaDesde || null,
    vigenciaHasta: doc.vigenciaHasta || null,
    audience: serializeAudience(doc.audience),
    openCount: doc.openCount || 0,
    favorite: extras.favorite === true,
    distanceKm: extras.distanceKm ?? null,
    actions: {
      call: telHref(telefono),
      whatsapp: waHref(whatsapp),
      email: mailHref(email),
      maps: mapsUrl({ lat, lng, direccion: doc.direccion, ciudad: doc.ciudad }),
      copyPhone: telefono || '',
      copyEmail: email || '',
    },
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  }
  return entry
}

export function applyDirectoryPatch(doc, body = {}) {
  const b = body && typeof body === 'object' ? body : {}
  if (b.nombre !== undefined) {
    const n = str(b.nombre, 160)
    if (!n) throw Object.assign(new Error('nombre obligatorio'), { status: 400 })
    doc.nombre = n
  }
  if (b.tipo !== undefined) {
    const t = str(b.tipo, 40)
    if (!DIRECTORY_TIPOS.includes(t)) throw Object.assign(new Error('tipo inválido'), { status: 400 })
    doc.tipo = t
  }
  for (const [k, max] of [
    ['descripcion', 800],
    ['categoria', 80],
    ['interno', 20],
    ['direccion', 240],
    ['ciudad', 120],
    ['horario', 200],
    ['imageUrl', 500],
    ['icon', 40],
    ['color', 20],
  ]) {
    if (b[k] !== undefined) doc[k] = str(b[k], max)
  }
  if (b.telefono !== undefined) doc.telefono = normalizePhone(b.telefono) || str(b.telefono, 40)
  if (b.whatsapp !== undefined) doc.whatsapp = normalizePhone(b.whatsapp) || str(b.whatsapp, 40)
  if (b.email !== undefined) doc.email = str(b.email, 200).toLowerCase()
  if (b.tags !== undefined) {
    doc.tags = (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(','))
      .map((t) => str(t, 40))
      .filter(Boolean)
      .slice(0, 12)
  }
  if (b.lat !== undefined) {
    const n = b.lat === null || b.lat === '' ? null : Number(b.lat)
    if (n != null && (!Number.isFinite(n) || n < -90 || n > 90)) {
      throw Object.assign(new Error('latitud inválida'), { status: 400 })
    }
    doc.lat = n
  }
  if (b.lng !== undefined) {
    const n = b.lng === null || b.lng === '' ? null : Number(b.lng)
    if (n != null && (!Number.isFinite(n) || n < -180 || n > 180)) {
      throw Object.assign(new Error('longitud inválida'), { status: 400 })
    }
    doc.lng = n
  }
  if (b.orden !== undefined) doc.orden = Number(b.orden) || 100
  if (typeof b.destacado === 'boolean') doc.destacado = b.destacado
  if (typeof b.activo === 'boolean') doc.activo = b.activo
  if (b.vigenciaDesde !== undefined) {
    doc.vigenciaDesde = b.vigenciaDesde ? new Date(b.vigenciaDesde) : null
  }
  if (b.vigenciaHasta !== undefined) {
    doc.vigenciaHasta = b.vigenciaHasta ? new Date(b.vigenciaHasta) : null
  }
  if (b.userId !== undefined) doc.userId = b.userId || null
  if (b.audience !== undefined) doc.audience = normalizeAudience(b.audience)

  // Al menos un medio útil
  const hasContact =
    doc.telefono || doc.interno || doc.email || doc.direccion || doc.descripcion || (doc.lat != null && doc.lng != null)
  if (doc.nombre && !hasContact) {
    throw Object.assign(new Error('Indicá al menos teléfono, email, dirección o descripción'), {
      status: 400,
    })
  }
  return doc
}

export function buildSearchFilter(q) {
  const term = str(q, 80)
  if (term.length < 2) return null
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return {
    $or: [
      { nombre: rx },
      { descripcion: rx },
      { categoria: rx },
      { telefono: rx },
      { interno: rx },
      { email: rx },
      { direccion: rx },
      { ciudad: rx },
      { tags: rx },
    ],
  }
}
