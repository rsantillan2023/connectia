/**
 * IA para altas de recursos reservables (concepto central de /reservas).
 * El draft siempre gira alrededor del recurso; puede proponer sede, tipo,
 * atributos, foto, icono, horario, clase de ocupación y un parche de políticas.
 */
import { RESOURCE_KINDS } from '../lib/spaces.js'
import {
  normalizeAttributeKey,
  normalizeTypeCodigo,
  defaultIconForEngine,
} from '../lib/spacesCatalog.js'
import {
  normalizeOccupancyFields,
  occupancyLabel,
  occupancyShortLabel,
} from '../lib/spacesOccupancy.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function spacesAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

/** Fotos demo por motor / variante (alineadas al seed). */
const DEMO_IMAGES = {
  sala: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80',
  salaBoard: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80',
  cochera: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=900&q=80',
  cocheraZona: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=900&q=80',
  puesto: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80',
  puestoFocus: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&q=80',
  hotdesk: 'https://images.unsplash.com/photo-1497366412874-3415097a27b7?w=900&q=80',
  proyector: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=900&q=80',
  herramienta: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&q=80',
  locker: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
  horaLibre: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80',
  grupo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80',
  notebook: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80',
}

const KNOWN_TYPE_ICONS = new Set([
  'meeting',
  'parking',
  'desk',
  'zone',
  'box',
  'projector',
  'tool',
  'locker',
  'clock',
  'group',
  'building',
  'calendar',
])

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || `OpenAI ${res.status}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || '{}'
}

async function callAnthropic(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 1800,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Anthropic ${res.status}`)
  }
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || '{}'
}

async function callLlm(system, user) {
  if (openaiKey()) return callOpenAi(system, user)
  if (anthropicKey()) return callAnthropic(system, user)
  return null
}

function detectEngineKind(prompt) {
  const p = String(prompt || '').toLowerCase()
  if (/cochera|estacionamiento|parking|garage|patente/.test(p)) return 'cochera'
  if (/hot[\s-]?desk|zona\s+(con\s+)?cupo|open[\s-]?space|cowork/.test(p)) return 'zona_cupo'
  if (/puesto|escritorio|\bdesk\b/.test(p)) return 'puesto'
  if (/cajoner|locker|casillero|armario/.test(p)) return 'activo'
  if (/proyector|notebook|laptop|herramienta|taladro|equipo|activo|cámara|camara/.test(p)) {
    return 'activo'
  }
  if (/hora libre|franja libre|bienestar|pausa activa|cafeter[ií]a|comedor|aforo/.test(p)) {
    return 'hora_libre'
  }
  if (/grupo|team room|sala grupal|squad|workshop|auditorio|teatro|butacas/.test(p)) return 'grupo'
  if (/sala|meeting|reunión|reunion|boardroom|directorio/.test(p)) return 'sala'
  return 'sala'
}

function detectAssetVariant(prompt) {
  const p = String(prompt || '').toLowerCase()
  if (/proyector/.test(p)) return 'proyector'
  if (/locker|armario|casillero|cajoner/.test(p)) return 'locker'
  if (/butaca|teatro|auditorio/.test(p)) return 'teatro'
  if (/taladro|herramienta|destornill|llave/.test(p)) return 'herramienta'
  if (/notebook|laptop/.test(p)) return 'notebook'
  return ''
}

function suggestTypeIcon(engineKind, prompt) {
  const variant = detectAssetVariant(prompt)
  if (variant === 'proyector') return 'projector'
  if (variant === 'locker') return 'locker'
  if (variant === 'teatro') return 'group'
  if (variant === 'herramienta') return 'tool'
  if (variant === 'notebook') return 'box'
  return defaultIconForEngine(engineKind)
}

function suggestImageUrl(engineKind, prompt) {
  const p = String(prompt || '').toLowerCase()
  const variant = detectAssetVariant(prompt)
  if (variant === 'proyector') return DEMO_IMAGES.proyector
  if (variant === 'locker') return DEMO_IMAGES.locker
  if (variant === 'herramienta') return DEMO_IMAGES.herramienta
  if (variant === 'notebook') return DEMO_IMAGES.notebook
  if (engineKind === 'sala') {
    return /board|directorio|16|12|grande|ejecutiv/i.test(p) ? DEMO_IMAGES.salaBoard : DEMO_IMAGES.sala
  }
  if (engineKind === 'cochera') {
    return /rotativ|zona|cupo|compartid/i.test(p) ? DEMO_IMAGES.cocheraZona : DEMO_IMAGES.cochera
  }
  if (engineKind === 'puesto') {
    return /focus|silencio|concentra/i.test(p) ? DEMO_IMAGES.puestoFocus : DEMO_IMAGES.puesto
  }
  if (engineKind === 'zona_cupo') return DEMO_IMAGES.hotdesk
  if (engineKind === 'hora_libre') return DEMO_IMAGES.horaLibre
  if (engineKind === 'grupo') return DEMO_IMAGES.grupo
  if (engineKind === 'activo') return DEMO_IMAGES.proyector
  return DEMO_IMAGES.sala
}

function suggestZone(engineKind, prompt) {
  const m = String(prompt || '').match(/(?:zona|área|area)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,\-]{2,40})/i)
  if (m) return m[1].trim().slice(0, 80)
  if (engineKind === 'sala' || engineKind === 'grupo') return 'Reuniones'
  if (engineKind === 'cochera') return /rotativ/i.test(prompt) ? 'Rotativas' : 'Subsuelo'
  if (engineKind === 'puesto') return /focus/i.test(prompt) ? 'Focus' : 'Open space'
  if (engineKind === 'zona_cupo') return 'Open space'
  if (engineKind === 'hora_libre') return 'Bienestar'
  if (engineKind === 'activo') {
    const v = detectAssetVariant(prompt)
    if (v === 'herramienta') return 'Depósito mantenimiento'
    if (v === 'locker') return 'Lockers'
    return 'Recepción / audiovisuales'
  }
  return ''
}

function suggestZoneType(engineKind, prompt) {
  if (engineKind === 'cochera') return 'parking'
  if (engineKind === 'sala' || engineKind === 'grupo') return 'meeting'
  if (engineKind === 'puesto') return /focus|silencio|quiet/i.test(prompt) ? 'focus' : 'open'
  if (engineKind === 'zona_cupo') return 'open'
  return ''
}

function suggestHorario(engineKind, prompt) {
  const openM = String(prompt || '').match(/(?:de|desde|abre)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs|h)?/i)
  const closeM = String(prompt || '').match(/(?:a|hasta|cierra)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs|h)?/i)
  const fmt = (m, fallback) => {
    if (!m) return fallback
    const h = String(Math.min(23, Number(m[1]))).padStart(2, '0')
    const min = m[2] || '00'
    return `${h}:${min}`
  }
  if (engineKind === 'hora_libre') {
    return { days: [1, 2, 3, 4, 5], open: '15:00', close: '16:00' }
  }
  return {
    days: [1, 2, 3, 4, 5],
    open: fmt(openM, '08:00'),
    close: fmt(closeM, engineKind === 'sala' ? '20:00' : '19:00'),
  }
}

function buildDescripcion({
  brand,
  prompt,
  engineKind,
  nombre,
  capacity,
  cupo,
  floor,
  zone,
  attrs,
  occupancy,
}) {
  const bits = []
  const p = String(prompt || '').trim().slice(0, 220)
  if (engineKind === 'sala') {
    bits.push(`${nombre} para reuniones${capacity ? ` (hasta ${capacity} personas)` : ''}.`)
  } else if (engineKind === 'cochera') {
    bits.push(`${nombre}. Plaza de estacionamiento${cupo > 1 ? ` con cupo ${cupo}` : ''}.`)
  } else if (engineKind === 'puesto') {
    bits.push(`${nombre}. Puesto de trabajo para jornada en oficina.`)
  } else if (engineKind === 'zona_cupo') {
    bits.push(`${nombre}. Área compartida${cupo ? ` con cupo ${cupo}` : ''}.`)
  } else if (engineKind === 'activo') {
    bits.push(`${nombre}. Activo reservable; retiro y devolución según indicaciones.`)
  } else if (engineKind === 'hora_libre') {
    bits.push(`${nombre}. Franja de bienestar / hora libre.`)
  } else if (engineKind === 'grupo') {
    bits.push(`${nombre}. Espacio grupal para workshops o squads.`)
  } else {
    bits.push(`${nombre}.`)
  }
  const occ = occupancy || {}
  const occCls = occ.occupancyClass || 'unitario'
  if (occCls === 'unidades_numeradas') {
    bits.push(
      `Ocupación: unidades numeradas (${occ.unitCount || cupo || '?'} ${(occ.unitLabel || 'unidades').toLowerCase()}, p. ej. ${occ.unitPrefix || ''}${String(1).padStart(Number(occ.unitPad) || 3, '0')}).`,
    )
  } else if (occCls === 'pool') {
    bits.push(`Ocupación: cupo compartido sin número (${occ.unitCount || cupo || '?'} lugares).`)
  } else if (occCls === 'aforo') {
    bits.push(`Ocupación: aforo multi-reserva (hasta ${occ.unitCount || cupo || '?'} concurrentes).`)
  } else {
    bits.push('Ocupación unitaria: una reserva a la vez.')
  }
  if (floor) bits.push(`Piso ${floor}.`)
  if (zone) bits.push(`Zona ${zone}.`)
  const flags = (attrs || []).map((a) => a.key).filter(Boolean)
  if (flags.length) bits.push(`Incluye: ${flags.slice(0, 6).join(', ')}.`)
  if (p && p.length > 12) bits.push(`Pedido: ${p}`)
  else bits.push(`Sugerido para ${brand}.`)
  return bits.join(' ').slice(0, 2000)
}

function extractCapacity(prompt) {
  const text = String(prompt || '')
  const patterns = [
    /(\d{1,4})\s*(?:personas|plazas?|cupos?|puestos?|cajones?|lockers?|butacas?|asientos?|unidades?|lugares?)/i,
    /(?:cupo|aforo|capacidad)\s*(?:de\s*)?(\d{1,4})/i,
    /(\d{1,4})\s*(?:x\s*)?(?:cajones?|butacas?|lockers?)/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return Number(m[1])
  }
  return null
}

/**
 * Infere clase de ocupación desde el brief (independiente del tipo/motor).
 */
export function inferOccupancyFromPrompt(prompt, { engineKind, variant, capacity, cupo } = {}) {
  const p = String(prompt || '')
  let occupancyClass = 'unitario'
  let unitCount = capacity || cupo || null
  let unitLabel = ''
  let unitPrefix = ''
  let unitPad = 3

  const wantsNumbered =
    variant === 'locker' ||
    variant === 'teatro' ||
    /unidades?\s+numerad|numerad[oa]s?|cajoner|locker|casillero|butaca|teatro|auditorio|asiento\s*numer/i.test(
      p,
    )
  const wantsPool =
    /cupo\s+compartid|sin\s+n[uú]mero|pool|fifo|orden\s+de\s+llegada|hot[\s-]?desk|zona\s+(con\s+)?cupo|rotativ/i.test(
      p,
    ) ||
    engineKind === 'zona_cupo' ||
    (engineKind === 'cochera' && (Number(cupo) || Number(capacity) || 0) > 1)
  const wantsAforo =
    /aforo|multi[\s-]?reserva|espacio\s+compartid|franja\s+(libre|bienestar)|pausa\s+activa|cafeter[ií]a|comedor/i.test(
      p,
    ) || engineKind === 'hora_libre'
  const wantsUnitario = /unitari[oa]|una\s+reserva\s+a\s+la\s+vez|plaza\s+fij[ao]|nominad[oa]/i.test(p)

  if (wantsNumbered && !wantsUnitario) {
    occupancyClass = 'unidades_numeradas'
    unitCount = unitCount || 48
    const isSeat = /butaca|teatro|auditorio|asiento/i.test(p) || variant === 'teatro'
    unitLabel = isSeat ? 'Butaca' : 'Cajón'
    unitPrefix = isSeat ? 'B-' : 'L-'
    unitPad = Number(unitCount) >= 10 ? 3 : 2
  } else if (wantsPool && !wantsNumbered) {
    occupancyClass = 'pool'
    unitCount = unitCount || (engineKind === 'zona_cupo' ? 12 : 8)
    unitLabel = engineKind === 'cochera' ? 'Plaza' : 'Puesto'
  } else if (wantsAforo) {
    occupancyClass = 'aforo'
    unitCount = unitCount || 20
    unitLabel = 'Lugar'
  } else {
    occupancyClass = 'unitario'
    unitCount = 1
  }

  return normalizeOccupancyFields(
    {
      occupancyClass,
      unitCount,
      unitLabel,
      unitPrefix,
      unitPad,
      cupo: occupancyClass === 'unitario' ? null : unitCount,
      capacity,
      kind: engineKind,
    },
    { kind: engineKind },
  )
}

function extractFloor(prompt) {
  const m = String(prompt || '').match(/(?:piso|planta)\s*([A-Za-z0-9-]{1,12})/i)
  return m ? m[1].trim() : ''
}

function extractSiteHint(prompt) {
  const m = String(prompt || '').match(
    /(?:sede|edificio|oficina|planta|predio|en)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,\-]{2,60})/i,
  )
  return m ? m[1].trim().slice(0, 80) : ''
}

function extractBrand(prompt) {
  const explicit = String(prompt || '').match(/marca\s+([A-Za-z0-9.\- ]{2,40})/i)
  if (explicit) return explicit[1].trim()
  const known = String(prompt || '').match(/\b(epson|bosch|sony|lg|samsung|dell|hp|lenovo)\b/i)
  return known ? known[1] : ''
}

function extractPotencia(prompt) {
  const m = String(prompt || '').match(/(\d{2,4}\s*w)\b/i)
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : ''
}

function slugFrom(label) {
  return normalizeTypeCodigo(
    String(label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_'),
  )
}

function matchExisting(list, { nameKeys = ['nombre', 'label'], codeKeys = ['codigo', 'key'] } = {}, hint) {
  const h = String(hint || '')
    .trim()
    .toLowerCase()
  if (!h || !Array.isArray(list)) return null
  return (
    list.find((x) => {
      for (const k of codeKeys) {
        if (String(x?.[k] || '').toLowerCase() === h) return true
      }
      for (const k of nameKeys) {
        const n = String(x?.[k] || '').toLowerCase()
        if (n && (n === h || n.includes(h) || h.includes(n))) return true
      }
      return false
    }) || null
  )
}

function normalizeIcon(icon, engineKind, prompt) {
  const id = String(icon || '')
    .trim()
    .slice(0, 40)
  if (KNOWN_TYPE_ICONS.has(id)) return id
  return suggestTypeIcon(engineKind, prompt)
}

function normalizeImageUrl(url, engineKind, prompt) {
  const u = String(url || '')
    .trim()
    .slice(0, 500)
  if (/^https?:\/\//i.test(u)) return u
  return suggestImageUrl(engineKind, prompt)
}

function normalizeHorario(raw, fallback) {
  const days = Array.isArray(raw?.days)
    ? raw.days.map(Number).filter((d) => d >= 0 && d <= 6)
    : fallback.days
  const open = String(raw?.open || fallback.open).slice(0, 5)
  const close = String(raw?.close || fallback.close).slice(0, 5)
  return {
    days: days.length ? days : [1, 2, 3, 4, 5],
    open: /^\d{2}:\d{2}$/.test(open) ? open : fallback.open,
    close: /^\d{2}:\d{2}$/.test(close) ? close : fallback.close,
  }
}

const ATTR_HINTS = [
  { re: /wifi|wi-?fi/i, key: 'wifi', label: 'WiFi' },
  { re: /hdmi/i, key: 'hdmi', label: 'HDMI' },
  { re: /videollamada|teams|zoom|meet/i, key: 'videollamada', label: 'Videollamada' },
  { re: /proyector/i, key: 'proyector', label: 'Proyector integrado' },
  { re: /pizarra/i, key: 'pizarra', label: 'Pizarra' },
  { re: /monitor|pantalla/i, key: 'monitor', label: 'Monitor' },
  { re: /4k/i, key: '4k', label: '4K' },
  { re: /port[aá]til|notebook|laptop/i, key: 'portatil', label: 'Portátil' },
  { re: /accesible|rampa|silla de ruedas/i, key: 'accesible', label: 'Accesible' },
]

/**
 * Borrador heurístico (sin LLM) — siempre disponible.
 */
export function heuristicSpaceResourceDraft(prompt, ctx = {}) {
  const engineKind = detectEngineKind(prompt)
  const capacity = extractCapacity(prompt)
  const floor = extractFloor(prompt)
  const siteHint = extractSiteHint(prompt)
  const brand = ctx.brandName || 'la comunidad'
  const existingSites = ctx.existingSites || []
  const existingTypes = ctx.existingTypes || []
  const existingAttributes = ctx.existingAttributes || []
  const variant = detectAssetVariant(prompt)
  const zone = suggestZone(engineKind, prompt)
  const zoneType = suggestZoneType(engineKind, prompt)
  const horario = suggestHorario(engineKind, prompt)
  const imageUrl = suggestImageUrl(engineKind, prompt)
  const typeIcon = suggestTypeIcon(engineKind, prompt)

  const matchedSite = matchExisting(existingSites, { nameKeys: ['nombre'], codeKeys: ['codigo'] }, siteHint)
  const typeFromKind = existingTypes.find((t) => t.codigo === engineKind || t.engineKind === engineKind)

  let nombre = 'Recurso'
  if (engineKind === 'cochera') nombre = capacity ? `Cochera (${capacity})` : 'Cochera'
  else if (engineKind === 'puesto') nombre = /focus/i.test(prompt) ? 'Puesto Focus' : 'Puesto flexible'
  else if (engineKind === 'activo') {
    if (variant === 'proyector') nombre = 'Proyector'
    else if (variant === 'notebook') nombre = 'Notebook'
    else if (variant === 'locker') nombre = 'Locker'
    else if (variant === 'herramienta') nombre = 'Herramienta'
    else nombre = 'Activo reservable'
  } else if (engineKind === 'sala') {
    nombre = capacity ? `Sala ${capacity} pax` : 'Sala de reuniones'
  } else if (engineKind === 'zona_cupo') nombre = 'Hot desk / zona cupo'
  else if (engineKind === 'hora_libre') nombre = 'Franja bienestar'
  else if (engineKind === 'grupo') nombre = 'Espacio grupal'

  const titleMatch =
    String(prompt || '').match(/["«]([^"»]{3,60})["»]/) ||
    String(prompt || '').match(/llamad[oa]\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9 \-]{3,40})/i)
  if (titleMatch) nombre = titleMatch[1].trim()

  const newAttrs = []
  const resourceAttrs = []
  for (const hint of ATTR_HINTS) {
    if (!hint.re.test(prompt)) continue
    const exists = existingAttributes.find((a) => a.key === hint.key)
    if (!exists) newAttrs.push({ key: hint.key, label: hint.label, valueType: 'flag' })
    resourceAttrs.push({ key: hint.key, value: '' })
  }

  const marca = extractBrand(prompt)
  const potencia = extractPotencia(prompt)
  for (const [key, label, value, valueType] of [
    ['marca', 'Marca', marca, 'text'],
    ['potencia', 'Potencia', potencia, 'text'],
  ]) {
    if (!value) continue
    const exists = existingAttributes.find((a) => a.key === key)
    if (!exists && !newAttrs.some((a) => a.key === key)) {
      newAttrs.push({ key, label, valueType })
    }
    const i = resourceAttrs.findIndex((a) => a.key === key)
    if (i >= 0) resourceAttrs[i] = { key, value }
    else resourceAttrs.push({ key, value })
  }

  if (/accesible|rampa/i.test(prompt) && !resourceAttrs.some((a) => a.key === 'accesible')) {
    resourceAttrs.push({ key: 'accesible', value: '' })
  }

  const typeCodigo =
    typeFromKind?.codigo ||
    (variant === 'proyector'
      ? 'proyector'
      : variant === 'locker'
        ? 'locker'
        : variant === 'herramienta'
          ? 'herramienta'
          : engineKind)
  const typeLabel =
    typeFromKind?.label ||
    ({
      sala: 'Sala',
      cochera: 'Cochera',
      puesto: 'Puesto',
      zona_cupo: 'Zona con cupo',
      activo:
        variant === 'proyector'
          ? 'Proyector'
          : variant === 'locker'
            ? 'Locker'
            : variant === 'herramienta'
              ? 'Herramienta'
              : 'Activo',
      hora_libre: 'Hora libre',
      grupo: 'Grupo',
      otro: 'Espacio',
    }[engineKind] || 'Recurso')

  const createType = !typeFromKind
  const createSite = !matchedSite
  const cupo =
    engineKind === 'cochera' || engineKind === 'zona_cupo'
      ? capacity || (engineKind === 'zona_cupo' ? 12 : 1)
      : null
  const cap =
    engineKind === 'sala' || engineKind === 'grupo' || engineKind === 'otro' || engineKind === 'hora_libre'
      ? capacity || (engineKind === 'hora_libre' ? 20 : 8)
      : engineKind === 'activo'
        ? variant === 'locker' || variant === 'teatro'
          ? null
          : 1
        : null

  const occupancy = inferOccupancyFromPrompt(prompt, {
    engineKind,
    variant,
    capacity: capacity || cupo || cap,
    cupo,
  })

  const policyPatch = {}
  if (engineKind === 'cochera' && /máximo|maximo|límite|limite|solo\s+\d/i.test(prompt)) {
    const m = String(prompt).match(/(?:máximo|maximo|límite|limite|solo)\s*(\d{1,2})/i)
    if (m) policyPatch.maxSimultaneousParking = Number(m[1])
  }

  const descripcion = buildDescripcion({
    brand,
    prompt,
    engineKind,
    nombre,
    capacity: cap,
    cupo: occupancy.occupancyClass === 'unitario' ? cupo : occupancy.unitCount,
    floor,
    zone,
    attrs: resourceAttrs,
    occupancy,
  })

  return {
    resource: {
      nombre,
      codigo: slugFrom(nombre).slice(0, 40),
      descripcion,
      floor,
      zone,
      zoneType,
      capacity: cap,
      cupo: occupancy.cupo,
      occupancyClass: occupancy.occupancyClass,
      unitCount: occupancy.unitCount,
      unitLabel: occupancy.unitLabel,
      unitPrefix: occupancy.unitPrefix,
      unitPad: occupancy.unitPad,
      attributes: resourceAttrs,
      requiresApproval: /aprobaci[oó]n|aprobar|autoriz/i.test(prompt),
      exigePatente: engineKind === 'cochera',
      diaCompleto: engineKind === 'cochera' || variant === 'locker',
      accessible: resourceAttrs.some((a) => a.key === 'accesible'),
      bufferMin: engineKind === 'sala' || engineKind === 'grupo' ? 10 : engineKind === 'activo' ? 15 : 0,
      activo: true,
      kind: engineKind,
      typeCodigo,
      siteId: matchedSite?.id || matchedSite?._id || '',
      typeId: typeFromKind?.id || typeFromKind?._id || '',
      imageUrl,
      horario,
    },
    site: createSite
      ? {
          nombre: siteHint || `${brand} — sede principal`,
          codigo: slugFrom(siteHint || 'sede_principal').slice(0, 40),
          direccion: '',
          aforoMax: capacity && capacity > 20 ? capacity * 4 : 200,
          whoIsHereEnabled: engineKind === 'puesto' || engineKind === 'zona_cupo',
          activo: true,
        }
      : null,
    siteMatch: matchedSite
      ? { id: String(matchedSite.id || matchedSite._id), nombre: matchedSite.nombre }
      : null,
    type: createType
      ? {
          codigo: typeCodigo,
          label: typeLabel,
          icon: typeIcon,
          engineKind,
          attributeKeys: resourceAttrs.map((a) => a.key),
          exigePatenteDefault: engineKind === 'cochera',
          requiresApprovalDefault: /aprobaci[oó]n/i.test(prompt),
          diaCompletoDefault: engineKind === 'cochera',
          showInUserCatalog: true,
          showInOffice: engineKind === 'puesto' || engineKind === 'zona_cupo',
          activo: true,
        }
      : null,
    typeMatch: typeFromKind
      ? {
          id: String(typeFromKind.id || typeFromKind._id),
          codigo: typeFromKind.codigo,
          label: typeFromKind.label,
          icon: typeFromKind.icon || typeIcon,
          engineKind: typeFromKind.engineKind,
        }
      : null,
    attributes: newAttrs,
    policyPatch: Object.keys(policyPatch).length ? policyPatch : null,
    notas: [
      createSite
        ? 'Se sugiere crear la sede junto con el recurso.'
        : 'Se reutiliza una sede existente.',
      `Ocupación: ${occupancyShortLabel({ ...occupancy, kind: engineKind })} (${occupancyLabel(occupancy.occupancyClass)}).`,
      'Revisá foto, icono, ocupación y atributos antes de guardar.',
    ].join(' '),
    source: 'heuristic',
  }
}

function sanitizeDraft(raw, ctx = {}) {
  const prompt = ctx.prompt || ''
  const base = heuristicSpaceResourceDraft(prompt, ctx)
  if (!raw || typeof raw !== 'object') return base

  const engineKind = RESOURCE_KINDS.includes(raw.resource?.kind)
    ? raw.resource.kind
    : RESOURCE_KINDS.includes(raw.type?.engineKind)
      ? raw.type.engineKind
      : base.resource.kind

  const resourceIn = raw.resource || {}
  const attrsIn = Array.isArray(raw.attributes) ? raw.attributes : []
  const resourceAttrs = normalizeAttributeList(
    resourceIn.attributes || resourceIn.attributeKeys || base.resource.attributes,
  )

  const attributes = attrsIn
    .map((a) => {
      const key = normalizeAttributeKey(a?.key || a?.label)
      if (!key) return null
      const valueType = ['flag', 'text', 'enum'].includes(a?.valueType) ? a.valueType : 'flag'
      return {
        key,
        label: String(a?.label || key).trim().slice(0, 80) || key,
        valueType,
        options: Array.isArray(a?.options) ? a.options.map(String).slice(0, 20) : [],
      }
    })
    .filter(Boolean)

  for (const a of resourceAttrs) {
    if (
      !attributes.some((x) => x.key === a.key) &&
      !(ctx.existingAttributes || []).some((x) => x.key === a.key)
    ) {
      attributes.push({
        key: a.key,
        label: a.key,
        valueType: a.value ? 'text' : 'flag',
        options: [],
      })
    }
  }

  let site = null
  if (raw.site && (raw.site.nombre || raw.site.codigo)) {
    site = {
      nombre: String(raw.site.nombre || 'Sede').trim().slice(0, 120),
      codigo: normalizeTypeCodigo(raw.site.codigo || raw.site.nombre).slice(0, 40),
      direccion: String(raw.site.direccion || '').slice(0, 200),
      aforoMax: raw.site.aforoMax == null || raw.site.aforoMax === '' ? null : Number(raw.site.aforoMax),
      whoIsHereEnabled: !!raw.site.whoIsHereEnabled,
      activo: raw.site.activo !== false,
    }
  } else if (base.site && !resourceIn.siteId) {
    site = base.site
  }

  let type = null
  if (raw.type && (raw.type.label || raw.type.codigo)) {
    const codigo = normalizeTypeCodigo(raw.type.codigo || raw.type.label)
    const tEngine = RESOURCE_KINDS.includes(raw.type.engineKind) ? raw.type.engineKind : engineKind
    type = {
      codigo,
      label: String(raw.type.label || codigo).trim().slice(0, 80),
      icon: normalizeIcon(raw.type.icon || base.type?.icon, tEngine, prompt),
      engineKind: tEngine,
      attributeKeys: [
        ...new Set([
          ...(Array.isArray(raw.type.attributeKeys)
            ? raw.type.attributeKeys.map(normalizeAttributeKey)
            : []),
          ...resourceAttrs.map((a) => a.key),
        ]),
      ].filter(Boolean),
      exigePatenteDefault: !!raw.type.exigePatenteDefault,
      requiresApprovalDefault: !!raw.type.requiresApprovalDefault,
      diaCompletoDefault: !!raw.type.diaCompletoDefault,
      showInUserCatalog: raw.type.showInUserCatalog !== false,
      showInOffice: !!raw.type.showInOffice,
      activo: raw.type.activo !== false,
    }
  } else if (base.type && !resourceIn.typeId) {
    type = base.type
  }

  const policyPatch =
    raw.policyPatch && typeof raw.policyPatch === 'object'
      ? Object.fromEntries(
          [
            'maxSimultaneousParking',
            'maxSimultaneousDesk',
            'maxOfficeDaysPerWeek',
            'cancelMinutesBefore',
            'checkInGraceMinutes',
          ]
            .filter((k) => raw.policyPatch[k] != null && raw.policyPatch[k] !== '')
            .map((k) => [k, Number(raw.policyPatch[k])]),
        )
      : base.policyPatch

  const horario = normalizeHorario(resourceIn.horario || base.resource.horario, base.resource.horario)

  const resourceDraft = {
      nombre: String(resourceIn.nombre || base.resource.nombre).trim().slice(0, 120) || 'Recurso',
      codigo: normalizeTypeCodigo(resourceIn.codigo || resourceIn.nombre || base.resource.codigo).slice(
        0,
        40,
      ),
      descripcion: String(resourceIn.descripcion || base.resource.descripcion || '').slice(0, 2000),
      floor: String(resourceIn.floor ?? base.resource.floor ?? '').slice(0, 40),
      zone: String(resourceIn.zone ?? base.resource.zone ?? '').slice(0, 80),
      zoneType: String(resourceIn.zoneType ?? base.resource.zoneType ?? '').slice(0, 40),
      capacity:
        resourceIn.capacity == null || resourceIn.capacity === ''
          ? base.resource.capacity
          : Number(resourceIn.capacity),
      cupo:
        resourceIn.cupo == null || resourceIn.cupo === '' ? base.resource.cupo : Number(resourceIn.cupo),
      occupancyClass: resourceIn.occupancyClass || base.resource.occupancyClass || 'unitario',
      unitCount:
        resourceIn.unitCount == null || resourceIn.unitCount === ''
          ? base.resource.unitCount
          : Number(resourceIn.unitCount),
      unitLabel: String(resourceIn.unitLabel ?? base.resource.unitLabel ?? '').slice(0, 40),
      unitPrefix: String(resourceIn.unitPrefix ?? base.resource.unitPrefix ?? '').slice(0, 12),
      unitPad:
        resourceIn.unitPad == null || resourceIn.unitPad === ''
          ? base.resource.unitPad
          : Number(resourceIn.unitPad),
      attributes: resourceAttrs,
      requiresApproval:
        resourceIn.requiresApproval != null
          ? !!resourceIn.requiresApproval
          : base.resource.requiresApproval,
      exigePatente:
        resourceIn.exigePatente != null ? !!resourceIn.exigePatente : engineKind === 'cochera',
      diaCompleto:
        resourceIn.diaCompleto != null ? !!resourceIn.diaCompleto : engineKind === 'cochera',
      accessible:
        resourceIn.accessible != null
          ? !!resourceIn.accessible
          : resourceAttrs.some((a) => a.key === 'accesible'),
      bufferMin: Number(resourceIn.bufferMin ?? base.resource.bufferMin) || 0,
      activo: resourceIn.activo !== false,
      kind: engineKind,
      typeCodigo: normalizeTypeCodigo(resourceIn.typeCodigo || type?.codigo || base.resource.typeCodigo),
      siteId: resourceIn.siteId || base.resource.siteId || '',
      typeId: resourceIn.typeId || base.resource.typeId || '',
      imageUrl: normalizeImageUrl(resourceIn.imageUrl || base.resource.imageUrl, engineKind, prompt),
      horario,
  }

  // Si el LLM no trajo ocupación, reforzá con heurística del prompt
  if (!resourceIn.occupancyClass) {
    const inferred = inferOccupancyFromPrompt(prompt, {
      engineKind,
      variant: detectAssetVariant(prompt),
      capacity: resourceDraft.capacity,
      cupo: resourceDraft.cupo,
    })
    Object.assign(resourceDraft, inferred)
  } else {
    Object.assign(
      resourceDraft,
      normalizeOccupancyFields(resourceDraft, { kind: engineKind }),
    )
  }

  const occNote = `Ocupación: ${occupancyShortLabel(resourceDraft)} (${occupancyLabel(resourceDraft.occupancyClass)}).`

  return {
    resource: resourceDraft,
    site,
    siteMatch: base.siteMatch,
    type,
    typeMatch: base.typeMatch,
    attributes,
    policyPatch: policyPatch && Object.keys(policyPatch).length ? policyPatch : null,
    notas: [String(raw.notas || base.notas || '').trim(), occNote].filter(Boolean).join(' ').slice(0, 500),
    source: raw.source || 'llm',
  }
}

function normalizeAttributeList(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((a) => {
        if (typeof a === 'string') {
          const key = normalizeAttributeKey(a)
          return key ? { key, value: '' } : null
        }
        const key = normalizeAttributeKey(a?.key)
        if (!key) return null
        return { key, value: String(a.value ?? '').slice(0, 120) }
      })
      .filter(Boolean)
  }
  return []
}

/**
 * Genera un borrador de recurso (+ deps opcionales) desde un prompt.
 */
export async function draftSpaceResourceFromPrompt(prompt, ctx = {}) {
  const trimmed = String(prompt || '').trim()
  if (!trimmed) {
    const err = new Error('Describí el recurso a crear')
    err.status = 400
    throw err
  }

  const context = {
    ...ctx,
    prompt: trimmed,
    brandName: ctx.brandName || 'la comunidad',
  }

  const heuristic = heuristicSpaceResourceDraft(trimmed, context)
  const existingSummary = {
    sedes: (ctx.existingSites || []).slice(0, 20).map((s) => ({ id: s.id, nombre: s.nombre, codigo: s.codigo })),
    tipos: (ctx.existingTypes || []).slice(0, 30).map((t) => ({
      id: t.id,
      codigo: t.codigo,
      label: t.label,
      icon: t.icon,
      engineKind: t.engineKind,
    })),
    atributos: (ctx.existingAttributes || []).slice(0, 40).map((a) => ({ key: a.key, label: a.label })),
    iconosDisponibles: [...KNOWN_TYPE_ICONS],
  }

  const system = `Sos un experto en facilities / reservas corporativas.
Debés proponer UN recurso reservable (concepto central) para la app Connectyx.
Podés proponer crear sede, tipo, atributos y un parche de políticas SOLO si hace falta.
Siempre incluí foto (imageUrl https), descripción completa, piso/zona, horario e icono del tipo.
Respondé SOLO JSON válido con esta forma:
{
  "resource": {
    "nombre": string,
    "codigo": string,
    "descripcion": string (2-4 oraciones útiles para el catálogo),
    "floor": string,
    "zone": string,
    "zoneType": ""|"open"|"focus"|"quiet"|"meeting"|"parking",
    "capacity": number|null,
    "cupo": number|null,
    "occupancyClass": "unitario"|"unidades_numeradas"|"pool"|"aforo",
    "unitCount": number,
    "unitLabel": string,
    "unitPrefix": string,
    "unitPad": number,
    "attributes": [{"key": string, "value": string}],
    "requiresApproval": boolean,
    "exigePatente": boolean,
    "diaCompleto": boolean,
    "accessible": boolean,
    "bufferMin": number,
    "activo": boolean,
    "kind": one of ${RESOURCE_KINDS.join('|')},
    "typeCodigo": string,
    "siteId": string (si reutilizás sede existente),
    "typeId": string (si reutilizás tipo existente),
    "imageUrl": string (URL https de foto representativa),
    "horario": { "days": number[], "open": "HH:MM", "close": "HH:MM" }
  },
  "site": null | { "nombre", "codigo", "direccion", "aforoMax", "whoIsHereEnabled", "activo" },
  "type": null | { "codigo", "label", "icon": one of meeting|parking|desk|zone|box|projector|tool|locker|clock|group|building|calendar, "engineKind", "attributeKeys": string[], "exigePatenteDefault", "requiresApprovalDefault", "diaCompletoDefault", "showInUserCatalog", "showInOffice", "activo" },
  "attributes": [{"key","label","valueType":"flag|text|enum","options":[]}],
  "policyPatch": null | { "maxSimultaneousParking"?, "maxSimultaneousDesk"?, "maxOfficeDaysPerWeek"?, "cancelMinutesBefore"? },
  "notas": string
}
Reglas:
- occupancyClass es OBLIGATORIO: unitario | unidades_numeradas | pool | aforo.
- unitario: una reserva a la vez (proyector, sala, plaza fija). unitCount=1.
- unidades_numeradas: un padre con N unidades (cajonera, teatro). Pedí unitCount, unitLabel, unitPrefix (L- / B-), unitPad.
- pool: cupo sin número (hot desk, cochera rotativa). unitCount = cupo.
- aforo: multi-reserva concurrente (bienestar, cafetería). unitCount = aforo.
- Si es locker/cajonera/teatro numerado → unidades_numeradas + unitCount + unitPrefix.
- Si es hot desk / zona cupo → pool. Si es franja compartida / aforo → aforo.
- Si ya existe una sede/tipo adecuado, reutilizalo (siteId/typeId) y dejá site/type en null.
- Solo proponé attributes nuevos que no estén en el catálogo.
- imageUrl debe ser https (podés reutilizar la del borrador heurístico).
- icon del tipo debe ser uno de iconosDisponibles.
- policyPatch es global del tenant: usalo solo si el prompt pide límites claros.
- En notas mencioná la clase de ocupación elegida.`

  const user = `Comunidad: ${context.brandName}
Prompt del admin:
"""
${trimmed}
"""
Catálogo actual:
${JSON.stringify(existingSummary)}
Borrador heurístico de partida (mejorarlo manteniendo foto/icono/horario si son buenos):
${JSON.stringify(heuristic)}`

  try {
    const rawText = await callLlm(system, user)
    if (!rawText) {
      return { ...heuristic, configured: false }
    }
    const parsed = parseJson(rawText)
    const draft = sanitizeDraft({ ...parsed, source: 'llm' }, context)
    return { ...draft, configured: true }
  } catch (e) {
    return {
      ...heuristic,
      configured: spacesAiConfigured(),
      notas: `${heuristic.notas || ''} (IA no disponible: ${e.message})`.trim(),
      source: 'heuristic',
    }
  }
}
