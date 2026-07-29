/**
 * IA opcional §6 Eventos:
 * - Redactar evento desde objetivo
 * - Sugerir horarios sin choque con agenda personal/corp
 * - Resumir “qué tengo hoy”
 * Heurística siempre; LLM si hay OPENAI/ANTHROPIC.
 */

import { EVENT_TIPOS, TIPO_META } from '../lib/event.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function eventAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

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
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
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
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

async function callLlm(system, user) {
  if (openaiKey()) return callOpenAi(system, user)
  if (anthropicKey()) return callAnthropic(system, user)
  return null
}

function detectTipo(prompt) {
  const p = String(prompt || '').toLowerCase()
  if (/capacita|curso|taller|training|inducci/.test(p)) return 'capacitacion'
  if (/celebra|fiesta|aniversario|cumplea|brindis/.test(p)) return 'celebracion'
  if (/reuni|kickoff|town\s*hall|all[\s-]?hands|standup/.test(p)) return 'reunion'
  return 'general'
}

function extractPlace(prompt) {
  const m = String(prompt || '').match(
    /(?:en|en la|en el|sala|auditorio|planta|predio)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,\-]{3,60})/i,
  )
  return m ? m[1].trim().slice(0, 120) : ''
}

function extractCupo(prompt) {
  const m = String(prompt || '').match(/(\d{1,4})\s*(?:personas|cupos?|asistentes|plazas)/i)
  return m ? Number(m[1]) : null
}

function nextWeekdayAt(hourUTC = 15, daysAhead = 3) {
  const d = new Date()
  d.setUTCMinutes(0, 0, 0)
  d.setUTCHours(hourUTC, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + daysAhead)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return d
}

/**
 * Borrador heurístico de evento corporativo.
 * @returns {{ titulo, descripcion, tipo, lugar, cupo, inicio, fin, allDay, durationHours }}
 */
export function heuristicEventDraft(prompt, { brandName = 'Connectia' } = {}) {
  const raw = String(prompt || '').trim()
  const tipo = detectTipo(raw)
  const tipoLabel = TIPO_META[tipo]?.label || 'Evento'
  const lugar = extractPlace(raw) || (tipo === 'capacitacion' ? 'Sala de capacitación' : '')
  const cupo = extractCupo(raw)
  const durationHours = tipo === 'celebracion' ? 3 : tipo === 'capacitacion' ? 2 : 1
  const inicio = nextWeekdayAt(tipo === 'celebracion' ? 18 : 15, 5)
  const fin = new Date(inicio.getTime() + durationHours * 60 * 60 * 1000)

  let titulo = raw.split(/[.\n]/)[0].trim().slice(0, 120)
  if (titulo.length < 8) {
    titulo = `${tipoLabel} — ${brandName}`
  } else if (titulo.length > 80) {
    titulo = titulo.slice(0, 77) + '…'
  }

  const descripcion =
    raw.length > 20
      ? raw.slice(0, 2000)
      : `Evento de tipo ${tipoLabel.toLowerCase()} organizado por ${brandName}.\n\nObjetivo: ${raw || 'compartir novedades con el equipo'}.`

  return {
    titulo,
    descripcion,
    tipo: EVENT_TIPOS.includes(tipo) ? tipo : 'general',
    lugar,
    cupo,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    allDay: false,
    durationHours,
    source: 'heuristic',
  }
}

/**
 * Extrae borrador desde texto libre (mail / párrafo).
 */
export function heuristicExtractFromText(text, opts = {}) {
  const draft = heuristicEventDraft(text, opts)
  const lines = String(text || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines[0] && lines[0].length >= 8 && lines[0].length <= 120) {
    draft.titulo = lines[0].replace(/^(asunto|subject)\s*:\s*/i, '').slice(0, 120)
  }
  if (lines.length > 1) {
    draft.descripcion = lines.slice(1).join('\n').slice(0, 4000)
  }
  draft.source = 'heuristic_extract'
  return draft
}

export async function draftEventFromPrompt(prompt, { brandName = 'Connectia', extract = false } = {}) {
  const base = extract
    ? heuristicExtractFromText(prompt, { brandName })
    : heuristicEventDraft(prompt, { brandName })

  if (!eventAiConfigured()) return base

  try {
    const system = `Sos un asistente de comunicación interna. Devolvé SOLO JSON con:
{"titulo":"","descripcion":"","tipo":"general|reunion|capacitacion|celebracion|otro","lugar":"","cupo":null,"durationHours":1,"allDay":false}
tipo debe ser uno de esos valores. cupo número o null. Textos en español rioplatense, tono corporativo claro.`
    const user = extract
      ? `Extraé un borrador de evento corporativo de este texto/mail:\n\n${String(prompt).slice(0, 4000)}\n\nMarca: ${brandName}`
      : `Armá un borrador de evento corporativo a partir de este objetivo:\n\n${String(prompt).slice(0, 2000)}\n\nMarca: ${brandName}`
    const raw = await callLlm(system, user)
    if (!raw) return base
    const j = parseJson(raw)
    const tipo = EVENT_TIPOS.includes(j.tipo) ? j.tipo : base.tipo
    const durationHours = Number(j.durationHours) > 0 ? Number(j.durationHours) : base.durationHours
    const inicio = new Date(base.inicio)
    const fin = new Date(inicio.getTime() + durationHours * 60 * 60 * 1000)
    return {
      titulo: String(j.titulo || base.titulo).trim().slice(0, 200) || base.titulo,
      descripcion: String(j.descripcion || base.descripcion).trim().slice(0, 8000) || base.descripcion,
      tipo,
      lugar: String(j.lugar || base.lugar || '').trim().slice(0, 240),
      cupo: j.cupo == null || j.cupo === '' ? null : Number(j.cupo) || null,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      allDay: !!j.allDay,
      durationHours,
      source: 'llm',
    }
  } catch {
    return { ...base, source: 'heuristic_fallback' }
  }
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Sugiere 3 franjas de 1h en próximos días hábiles sin chocar con busyItems.
 * @param {{ busyItems?: {inicio:string,fin:string}[], durationHours?: number, preferHourUTC?: number }} opts
 */
export function suggestScheduleSlots({
  busyItems = [],
  durationHours = 1,
  preferHourUTC = 15,
  daysToScan = 10,
} = {}) {
  const busy = (busyItems || [])
    .map((i) => ({
      start: new Date(i.inicio).getTime(),
      end: new Date(i.fin).getTime(),
    }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end))

  const slots = []
  const hours = [preferHourUTC, preferHourUTC - 2, preferHourUTC + 2, 13, 17].filter(
    (h) => h >= 11 && h <= 20,
  )
  const uniqueHours = [...new Set(hours)]

  for (let day = 1; day <= daysToScan && slots.length < 3; day++) {
    const base = new Date()
    base.setUTCMinutes(0, 0, 0)
    base.setUTCDate(base.getUTCDate() + day)
    if (base.getUTCDay() === 0 || base.getUTCDay() === 6) continue

    for (const h of uniqueHours) {
      if (slots.length >= 3) break
      const start = new Date(base)
      start.setUTCHours(h, 0, 0, 0)
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
      const s = start.getTime()
      const e = end.getTime()
      const clash = busy.some((b) => overlaps(s, e, b.start, b.end))
      if (clash) continue
      slots.push({
        inicio: start.toISOString(),
        fin: end.toISOString(),
        label: start.toLocaleString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        }),
      })
    }
  }

  return { slots, scannedDays: daysToScan, busyCount: busy.length }
}

/**
 * Resumen en lenguaje natural de la agenda del día.
 */
export function heuristicTodaySummary(items = [], { timezone = 'America/Argentina/Buenos_Aires' } = {}) {
  const list = Array.isArray(items) ? items : []
  if (!list.length) {
    return {
      text: 'Hoy no tenés eventos en la agenda.',
      count: 0,
      highlights: [],
      source: 'heuristic',
    }
  }

  const highlights = list.slice(0, 8).map((i) => {
    let when = ''
    try {
      when = i.allDay
        ? 'todo el día'
        : new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone,
          }).format(new Date(i.inicio))
    } catch {
      when = ''
    }
    const origin =
      i.origin === 'OUTLOOK' ? 'Outlook' : i.origin === 'GOOGLE' ? 'Google' : 'Connectia'
    return {
      titulo: i.titulo || 'Evento',
      when,
      origin,
      lugar: i.lugar || '',
    }
  })

  const parts = highlights.map((h) => {
    const bit = [h.when, h.titulo, h.lugar ? `(${h.lugar})` : '', `— ${h.origin}`]
      .filter(Boolean)
      .join(' ')
    return `• ${bit}`
  })

  const text =
    list.length === 1
      ? `Hoy tenés 1 evento:\n${parts.join('\n')}`
      : `Hoy tenés ${list.length} eventos:\n${parts.join('\n')}`

  return { text, count: list.length, highlights, source: 'heuristic' }
}

export async function summarizeTodayWithAi(items, opts = {}) {
  const base = heuristicTodaySummary(items, opts)
  if (!eventAiConfigured() || !base.count) return base
  try {
    const system =
      'Resumí la agenda del día en 2-4 oraciones en español rioplatense, claro y amable. Sin inventar eventos. Devolvé solo texto plano.'
    const user = base.text
    const raw = await callLlm(system, user)
    if (!raw?.trim()) return base
    return { ...base, text: raw.trim().slice(0, 1200), source: 'llm' }
  } catch {
    return { ...base, source: 'heuristic_fallback' }
  }
}
