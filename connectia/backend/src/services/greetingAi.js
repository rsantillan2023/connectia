/**
 * Generador de reglas de saludo (§5) con IA.
 */
import {
  GREETING_EVENT_TYPES,
  normalizeHours,
  normalizeGreetingRuleInput,
} from '../lib/greetingHelpers.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function greetingAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user, { temperature = 0.55, maxTokens = 900 } = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
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

async function callAnthropic(system, user, { maxTokens = 900 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

async function generateRaw(system, user, opts) {
  if (!greetingAiConfigured()) {
    const err = new Error('IA no configurada')
    err.status = 503
    throw err
  }
  if (openaiKey()) {
    try {
      return await callOpenAi(system, user, opts)
    } catch (e) {
      if (!anthropicKey()) throw e
      return callAnthropic(system, user, opts)
    }
  }
  return callAnthropic(system, user, opts)
}

/**
 * Borrador de regla de saludo + copy de publicación tipo celebración.
 * El admin siempre revisa antes de guardar.
 */
export async function draftGreetingRuleFromPrompt({ prompt, brandName }) {
  const brief = String(prompt || '').trim()
  if (brief.length < 8) {
    const err = new Error('Escribí un prompt más descriptivo (mín. 8 caracteres)')
    err.status = 400
    throw err
  }

  const system = [
    'Sos productor de celebraciones internas (Connectia / RRHH).',
    `Marca: ${brandName || 'Connectia'}. Español rioplatense, cálido y profesional.`,
    'Generás una REGLA de saludo automático que publicará una pieza tipo "celebracion" en el muro.',
    'Variables permitidas en titulo/cuerpo (usar exactamente): {{nombre}} {{apellido}} {{cargo}} {{anios}}',
    'eventType uno de: birthday | hire_anniversary | work_anniversary | fixed_date',
    'hours: array de "HH:MM" (24h). daysBefore: 0-7 típico.',
    'Si es fixed_date, incluí fixedDay (1-31) y fixedMonth (1-12).',
    'Respondé SOLO JSON:',
    '{"name":"","eventType":"birthday","titulo":"","cuerpo":"","hours":["09:00"],"daysBefore":0,"fixedDay":null,"fixedMonth":null,"notifyAudience":true,"notes":""}',
  ].join(' ')

  const raw = await generateRaw(system, brief, { temperature: 0.55, maxTokens: 900 })
  const data = parseJson(raw)
  const eventType = GREETING_EVENT_TYPES.includes(data.eventType) ? data.eventType : 'birthday'
  const normalized = normalizeGreetingRuleInput({
    name: String(data.name || '').trim() || 'Saludo',
    eventType,
    titulo: data.titulo,
    cuerpo: data.cuerpo,
    hours: normalizeHours(data.hours?.length ? data.hours : ['09:00']),
    daysBefore: data.daysBefore,
    fixedDay: data.fixedDay,
    fixedMonth: data.fixedMonth,
    notifyAudience: data.notifyAudience !== false,
    activo: true,
  })
  if (!normalized.titulo) {
    normalized.titulo =
      eventType === 'birthday'
        ? '¡Feliz cumpleaños {{nombre}}!'
        : 'Celebramos a {{nombre}}'
  }
  if (!normalized.name || normalized.name === 'Saludo') {
    normalized.name =
      eventType === 'birthday'
        ? 'Cumpleaños del equipo'
        : eventType === 'fixed_date'
          ? 'Fecha especial'
          : 'Aniversario'
  }
  return {
    ...normalized,
    notes: String(data.notes || '').trim().slice(0, 400),
    postTipo: 'celebracion',
  }
}
