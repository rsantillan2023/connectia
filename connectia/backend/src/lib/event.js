/**
 * Helpers eventos §6 — serialize, validación fechas, cupo, RSVP.
 */

import { serializeAudience, normalizeAudience } from './audience.js'

export const EVENT_TIPOS = ['general', 'reunion', 'capacitacion', 'celebracion', 'otro']
export const EVENT_STATUSES = ['draft', 'published', 'cancelled']
export const RSVP_ESTADOS = ['confirmado', 'rechazado']

export const TIPO_META = {
  general: { label: 'General', color: '#0f766e' },
  reunion: { label: 'Reunión', color: '#1d4ed8' },
  capacitacion: { label: 'Capacitación', color: '#7c3aed' },
  celebracion: { label: 'Celebración', color: '#c2410c' },
  otro: { label: 'Otro', color: '#475569' },
}

export function str(v, max = 200) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

export function parseDate(v) {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function validateEventDates(inicio, fin) {
  if (!inicio || !fin) return { ok: false, error: 'inicio y fin obligatorios' }
  if (fin.getTime() < inicio.getTime()) return { ok: false, error: 'fin debe ser >= inicio' }
  return { ok: true }
}

/** Cupo restante: null = ilimitado */
export function cupoRestante(event, confirmados = null) {
  if (event.cupo == null || event.cupo <= 0) return null
  const used = confirmados != null ? confirmados : Number(event.rsvpConfirmados || 0)
  return Math.max(0, event.cupo - used)
}

export function canConfirmRsvp(event, confirmados, currentEstado) {
  if (!event || event.status !== 'published') {
    return { ok: false, error: 'Evento no disponible' }
  }
  if (event.status === 'cancelled') {
    return { ok: false, error: 'Evento cancelado' }
  }
  const restante = cupoRestante(event, confirmados)
  if (restante != null && restante <= 0 && currentEstado !== 'confirmado') {
    return { ok: false, error: 'Cupo completo' }
  }
  return { ok: true }
}

/**
 * @param {object} doc
 * @param {{ rsvp?: object|null, confirmados?: number, rechazados?: number }} extras
 */
export function serializeEvent(doc, extras = {}) {
  const tipo = EVENT_TIPOS.includes(doc.tipo) ? doc.tipo : 'general'
  const meta = TIPO_META[tipo] || TIPO_META.general
  const status = EVENT_STATUSES.includes(doc.status) ? doc.status : 'draft'
  const confirmados = extras.confirmados ?? doc.rsvpConfirmados ?? 0
  const rechazados = extras.rechazados ?? doc.rsvpRechazados ?? 0
  const rsvp = extras.rsvp || null

  return {
    id: String(doc._id),
    titulo: doc.titulo || '',
    descripcion: doc.descripcion || '',
    tipo,
    tipoLabel: meta.label,
    tipoColor: meta.color,
    inicio: doc.inicio ? new Date(doc.inicio).toISOString() : null,
    fin: doc.fin ? new Date(doc.fin).toISOString() : null,
    allDay: !!doc.allDay,
    lugar: doc.lugar || '',
    ubicacionUrl: doc.ubicacionUrl || '',
    cupo: doc.cupo ?? null,
    cupoRestante: cupoRestante(doc, confirmados),
    status,
    imageUrl: doc.imageUrl || '',
    media: Array.isArray(doc.media)
      ? doc.media.map((m) => ({
          url: m.url || '',
          tipo: m.tipo || 'image',
          nombre: m.nombre || '',
        }))
      : [],
    audience: serializeAudience(doc.audience),
    authorId: doc.authorId ? String(doc.authorId) : null,
    authorName: doc.authorName || '',
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    postId: doc.postId ? String(doc.postId) : null,
    timezone: doc.timezone || '',
    rsvpConfirmados: confirmados,
    rsvpRechazados: rechazados,
    rsvp: rsvp
      ? {
          estado: rsvp.estado,
          confirmedAt: rsvp.confirmedAt ? new Date(rsvp.confirmedAt).toISOString() : null,
          external: {
            outlookEventId: rsvp.external?.outlookEventId || '',
            googleEventId: rsvp.external?.googleEventId || '',
          },
        }
      : null,
    origin: 'CORPORATE',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  }
}

export function applyEventPatch(doc, body) {
  if (body.titulo !== undefined) {
    const t = str(body.titulo, 200)
    if (!t) {
      const err = new Error('titulo obligatorio')
      err.status = 400
      throw err
    }
    doc.titulo = t
  }
  if (body.descripcion !== undefined) doc.descripcion = str(body.descripcion, 8000)
  if (body.tipo !== undefined) {
    doc.tipo = EVENT_TIPOS.includes(body.tipo) ? body.tipo : 'general'
  }
  if (body.allDay !== undefined) doc.allDay = !!body.allDay
  if (body.lugar !== undefined) doc.lugar = str(body.lugar, 240)
  if (body.ubicacionUrl !== undefined) doc.ubicacionUrl = str(body.ubicacionUrl, 500)
  if (body.imageUrl !== undefined) doc.imageUrl = str(body.imageUrl, 500)
  if (body.cupo !== undefined) {
    if (body.cupo == null || body.cupo === '') doc.cupo = null
    else {
      const n = Number(body.cupo)
      doc.cupo = Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    }
  }
  if (body.inicio !== undefined) {
    const d = parseDate(body.inicio)
    if (!d) {
      const err = new Error('inicio inválido')
      err.status = 400
      throw err
    }
    doc.inicio = d
  }
  if (body.fin !== undefined) {
    const d = parseDate(body.fin)
    if (!d) {
      const err = new Error('fin inválido')
      err.status = 400
      throw err
    }
    doc.fin = d
  }
  if (body.audience !== undefined) {
    doc.audience = normalizeAudience(body.audience)
  }
  if (body.media !== undefined && Array.isArray(body.media)) {
    doc.media = body.media
      .slice(0, 20)
      .map((m) => ({
        url: str(m?.url, 500),
        tipo: ['image', 'video', 'file'].includes(m?.tipo) ? m.tipo : 'image',
        nombre: str(m?.nombre, 160),
      }))
      .filter((m) => m.url)
  }
  if (body.timezone !== undefined) doc.timezone = str(body.timezone, 80)
  if (body.postId !== undefined) {
    doc.postId = body.postId || null
  }
  if (body.status !== undefined && EVENT_STATUSES.includes(body.status)) {
    const prev = doc.status
    doc.status = body.status
    if (body.status === 'published' && prev !== 'published') {
      doc.publishedAt = doc.publishedAt || new Date()
    }
  }

  const check = validateEventDates(doc.inicio, doc.fin)
  if (!check.ok) {
    const err = new Error(check.error)
    err.status = 400
    throw err
  }
}

/** Item unificado para agenda (corp + personal) */
export function serializeUnifiedItem(item) {
  return {
    id: item.id,
    titulo: item.titulo || '',
    descripcion: item.descripcion || '',
    inicio: item.inicio,
    fin: item.fin,
    allDay: !!item.allDay,
    lugar: item.lugar || '',
    origin: item.origin || 'CORPORATE',
    provider: item.provider || null,
    editable: !!item.editable,
    eventId: item.eventId || null,
    externalId: item.externalId || null,
    rsvp: item.rsvp || null,
    tipo: item.tipo || null,
    tipoLabel: item.tipoLabel || null,
    imageUrl: item.imageUrl || '',
    status: item.status || null,
    webLink: item.webLink || '',
  }
}

/** CSV simple para reporte RSVP */
export function rsvpRowsToCsv(rows) {
  const headers = ['nombre', 'usuario', 'email', 'estado', 'confirmedAt']
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows || []) {
    lines.push(
      [
        esc(r.nombre),
        esc(r.usuario),
        esc(r.email),
        esc(r.estado),
        esc(r.confirmedAt || ''),
      ].join(','),
    )
  }
  return `\uFEFF${lines.join('\n')}`
}
