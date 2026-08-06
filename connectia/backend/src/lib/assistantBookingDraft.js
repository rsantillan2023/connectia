/**
 * Armado conversacional de reservas / oficina (helpers puros, sin Mongo).
 */

import { parseDateInput, toISODate } from './licenciasConfig.js'
import { normalizePlate, isValidPlate, parseHm } from './spaces.js'

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

const DOW = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
}

/** Fecha relativa o absoluta → YYYY-MM-DD (UTC dateKey) o ''. */
export function parseBookingDate(raw, now = new Date()) {
  const t = norm(raw)
  if (!t) return ''

  if (/\bhoy\b/.test(t)) return toISODate(now)
  if (/\bmanana\b|\bmañana\b/.test(t)) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + 1)
    return toISODate(d)
  }
  if (/\bpasado\s+manana\b|\bpasado\s+mañana\b/.test(t)) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + 2)
    return toISODate(d)
  }

  for (const [name, dow] of Object.entries(DOW)) {
    if (new RegExp(`\\b(el\\s+)?${name}\\b`).test(t)) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const cur = d.getUTCDay()
      let delta = (dow - cur + 7) % 7
      if (delta === 0) delta = 7
      d.setUTCDate(d.getUTCDate() + delta)
      return toISODate(d)
    }
  }

  const range = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/)
  if (range) {
    const d = parseDateInput(range[1])
    return d ? toISODate(d) : ''
  }

  const iso = t.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]

  return ''
}

/** HH:MM desde texto libre. */
export function parseBookingTime(raw) {
  const t = norm(raw)
  if (!t) return ''

  let m = t.match(/\b(\d{1,2}):(\d{2})\b/)
  if (m) {
    const hm = `${String(+m[1]).padStart(2, '0')}:${m[2]}`
    return parseHm(hm) != null ? hm : ''
  }
  m = t.match(/(?:a\s+las?\s+|las?\s+)(\d{1,2})(?:\s*hs?)?\b/)
  if (m) {
    const h = +m[1]
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  m = t.match(/\b(\d{1,2})\s*hs?\b/)
  if (m) {
    const h = +m[1]
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return ''
}

/** Duración en minutos (default 60). */
export function parseBookingDurationMin(raw, fallback = 60) {
  const t = norm(raw)
  if (!t) return fallback
  let m = t.match(/(\d+)\s*(hora|horas|hs|h)\b/)
  if (m) return Math.max(15, Math.min(8 * 60, +m[1] * 60))
  m = t.match(/(\d+)\s*(minuto|minutos|min)\b/)
  if (m) return Math.max(15, Math.min(8 * 60, +m[1]))
  return fallback
}

export function extractPlate(raw) {
  const t = String(raw || '')
  const m =
    t.match(/patente\s*[:\s]?\s*([A-Za-z]{2,3}\s*\d{3}\s*[A-Za-z]{0,3}|\d{3}\s*[A-Za-z]{3}\s*\d{0,3}|[A-Za-z0-9]{5,10})/i) ||
    t.match(/\b([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{3})\b/i)
  if (!m) return ''
  const plate = normalizePlate(m[1])
  return isValidPlate(plate) ? plate : plate.length >= 5 ? plate : ''
}

export function extractResourceName(raw) {
  const t = String(raw || '')
  const m =
    t.match(
      /(?:sala|espacio|reunion|reunión)\s+(?:llamada\s+)?["']?([A-Za-záéíóúÁÉÍÓÚñÑ0-9][\wáéíóúÁÉÍÓÚñÑ\-]{0,40})["']?/i,
    ) || t.match(/["']([A-Za-záéíóúÁÉÍÓÚñÑ][\wáéíóúÁÉÍÓÚñÑ\- ]{1,40})["']/)
  if (!m) return ''
  return String(m[1])
    .trim()
    .replace(/\s+(el|la|del|de|a|las|los|mañana|manana|hoy)\s*$/i, '')
    .slice(0, 60)
}

export function extractSiteHint(raw) {
  const t = norm(raw)
  if (/\bnorte\b/.test(t)) return 'norte'
  if (/\bcentral\b|\bhq\b|\bsede\s+central\b|\boffice\s+central\b/.test(t)) return 'central'
  if (/\bsede\s+([a-z0-9\- ]{2,30})/.test(t)) {
    const m = t.match(/\bsede\s+([a-z0-9\- ]{2,30})/)
    return (m?.[1] || '').trim().slice(0, 40)
  }
  return ''
}

/**
 * Extrae entidades de booking desde un mensaje.
 * @returns {Record<string, string|number>}
 */
export function extractBookingEntities(text) {
  const entities = {}
  const date = parseBookingDate(text)
  if (date) entities.fecha = date
  const time = parseBookingTime(text)
  if (time) entities.hora = time
  const dur = parseBookingDurationMin(text, 0)
  if (dur) entities.duracionMin = dur
  const plate = extractPlate(text)
  if (plate) entities.patente = plate
  const nombre = extractResourceName(text)
  if (nombre) entities.recurso = nombre
  const sede = extractSiteHint(text)
  if (sede) entities.sede = sede
  if (/\btodo\s+el\s+dia\b|\bdia\s+completo\b|\bjornada\b/.test(norm(text))) {
    entities.diaCompleto = '1'
  }
  return entities
}

/**
 * Construye startAt/endAt ISO a partir de fecha + hora + duración.
 * Usa zona local del runtime (misma aproximación que withinHorario).
 */
export function buildSlotFromEntities(entities, { allDay = false, defaultTime = '10:00', defaultDurationMin = 60 } = {}) {
  const fecha = entities.fecha || ''
  if (!fecha) return { ok: false, error: 'Falta la fecha' }

  if (allDay || entities.diaCompleto === '1') {
    const startAt = new Date(`${fecha}T08:00:00`)
    const endAt = new Date(`${fecha}T20:00:00`)
    if (Number.isNaN(+startAt) || Number.isNaN(+endAt)) {
      return { ok: false, error: 'Fecha inválida' }
    }
    return { ok: true, startAt, endAt, dateKey: fecha, allDay: true }
  }

  const hora = entities.hora || defaultTime
  const mins = Number(entities.duracionMin) || defaultDurationMin
  const startAt = new Date(`${fecha}T${hora}:00`)
  if (Number.isNaN(+startAt)) return { ok: false, error: 'Horario inválido' }
  const endAt = new Date(startAt.getTime() + mins * 60_000)
  return { ok: true, startAt, endAt, dateKey: fecha, allDay: false, hora, duracionMin: mins }
}

/**
 * Fusiona payload multi-turno de reserva.
 */
export function mergeBookingPayload(prev = {}, entities = {}, text = '') {
  const extracted = extractBookingEntities(text)
  const next = {
    stage: prev.stage || 'need_date',
    kind: prev.kind || entities.kind || '',
    fecha: entities.fecha || extracted.fecha || prev.fecha || '',
    hora: entities.hora || extracted.hora || prev.hora || '',
    duracionMin: entities.duracionMin || extracted.duracionMin || prev.duracionMin || '',
    recurso: entities.recurso || extracted.recurso || prev.recurso || '',
    resourceId: entities.resourceId || prev.resourceId || '',
    resourceNombre: entities.resourceNombre || prev.resourceNombre || '',
    siteId: entities.siteId || prev.siteId || '',
    siteNombre: entities.siteNombre || prev.siteNombre || '',
    sede: entities.sede || extracted.sede || prev.sede || '',
    patente: entities.patente || extracted.patente || prev.patente || '',
    diaCompleto: entities.diaCompleto || extracted.diaCompleto || prev.diaCompleto || '',
    motivo: prev.motivo || '',
    startAt: prev.startAt || '',
    endAt: prev.endAt || '',
    requiresApproval: prev.requiresApproval || false,
    alternatives: prev.alternatives || [],
  }
  if (text && text.length < 200 && !/^(si|sí|confirmo|no|cancelar)/i.test(text)) {
    if (!next.motivo && /motivo|para\s+|reunion|reunión|cliente/i.test(text)) {
      next.motivo = String(text).slice(0, 200)
    }
  }
  return next
}

export function bookingKindLabel(kind) {
  if (kind === 'cochera') return 'cochera'
  if (kind === 'puesto' || kind === 'zona_cupo') return 'puesto / oficina'
  return 'sala'
}

export function formatBookingDraftText(payload, { missing = [], alternatives = [] } = {}) {
  const kind = bookingKindLabel(payload.kind)
  if (missing.length) {
    const hints = {
      fecha: '¿Qué día? (ej. mañana, el jueves, 15/08)',
      hora: '¿A qué hora? (ej. a las 10 o 14:30)',
      patente: '¿Cuál es la patente del vehículo?',
      recurso: '¿Tenés preferencia de sala o cualquier disponible?',
      siteId: '¿En qué sede? (Central / Norte)',
    }
    return [
      `Para reservar ${kind} me falta:`,
      ...missing.map((k) => `• ${hints[k] || k}`),
    ].join('\n')
  }

  const lines = [
    `Armé un borrador de **${kind}**:`,
    payload.resourceNombre ? `• Recurso: **${payload.resourceNombre}**` : null,
    payload.siteNombre ? `• Sede: ${payload.siteNombre}` : null,
    payload.fecha ? `• Día: ${payload.fecha}` : null,
    payload.hora && !payload.diaCompleto ? `• Horario: ${payload.hora} (${payload.duracionMin || 60} min)` : null,
    payload.diaCompleto ? '• Jornada completa' : null,
    payload.patente ? `• Patente: ${payload.patente}` : null,
    payload.requiresApproval ? '• Requiere aprobación' : '• Confirmación inmediata si hay cupo',
    '',
    '¿Lo confirmo? Decime **sí** o **no** (también podés escribir «cancelar»).',
  ].filter((l) => l !== null)

  if (alternatives.length) {
    lines.splice(
      lines.length - 2,
      0,
      '',
      'Otras opciones libres:',
      ...alternatives.slice(0, 3).map((a, i) => `• ${i + 1}. ${a.nombre}${a.siteNombre ? ` (${a.siteNombre})` : ''}`),
    )
  }
  return lines.join('\n')
}
