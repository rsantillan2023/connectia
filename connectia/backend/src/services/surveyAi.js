/**
 * Análisis IA de una encuesta (conjunto de cuestionarios respondidos).
 * Cualitativo + cuantitativo a partir de agregados y muestras.
 */
import { aiConfigured } from './openaiPosts.js'
import { buildAiAnalysisPayload } from '../lib/surveyAnalytics.js'
import { SURVEY_QUESTION_TYPES } from '../lib/surveyQuestions.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

function preferredProviders(requestProvider) {
  const pref = String(requestProvider || process.env.AI_PROVIDER || 'auto').toLowerCase()
  if (pref === 'anthropic') return ['anthropic']
  if (pref === 'openai') return ['openai']
  return ['openai', 'anthropic']
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function chatOpenAI(system, userContent, maxTokens = 2500) {
  const key = openaiKey()
  if (!key) throw Object.assign(new Error('OPENAI_API_KEY no configurada'), { status: 503 })
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message || `OpenAI ${res.status}`), {
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
      provider: 'openai',
    })
  }
  return {
    raw: data?.choices?.[0]?.message?.content || '{}',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    provider: 'openai',
  }
}

async function chatAnthropic(system, userContent, maxTokens = 2500) {
  const key = anthropicKey()
  if (!key) throw Object.assign(new Error('ANTHROPIC_API_KEY no configurada'), { status: 503 })
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
  const res = await fetch(ANTHROPIC_MESSAGES, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message || `Anthropic ${res.status}`), {
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
      provider: 'anthropic',
    })
  }
  const raw = Array.isArray(data?.content)
    ? data.content.map((c) => c.text || '').join('\n')
    : '{}'
  return { raw, model, provider: 'anthropic' }
}

async function chatWithFallback({ system, userContent, provider, maxTokens }) {
  const providers = preferredProviders(provider)
  const errors = []
  for (const p of providers) {
    try {
      if (p === 'openai') {
        if (!openaiKey()) {
          errors.push('openai: sin API key')
          continue
        }
        return await chatOpenAI(system, userContent, maxTokens)
      }
      if (p === 'anthropic') {
        if (!anthropicKey()) {
          errors.push('anthropic: sin API key')
          continue
        }
        return await chatAnthropic(system, userContent, maxTokens)
      }
    } catch (e) {
      errors.push(`${p}: ${e.message}`)
    }
  }
  throw Object.assign(
    new Error(errors.length ? `Ningún proveedor IA respondió. ${errors.join(' | ')}` : 'IA no configurada'),
    { status: 503 },
  )
}

export async function analyzeSurveyWithAi({
  survey,
  responses,
  participation,
  tenant = null,
  provider = 'auto',
  focus = '',
  questionIds = null,
} = {}) {
  if (!aiConfigured()) {
    const err = new Error('Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para analizar con IA')
    err.status = 503
    throw err
  }
  if (!responses?.length) {
    const err = new Error('No hay cuestionarios respondidos para analizar')
    err.status = 400
    throw err
  }

  const payload = buildAiAnalysisPayload(survey, responses, participation, { focus, questionIds })
  const community = tenant?.nombre || 'la comunidad'

  const system = [
    'Sos analista de encuestas corporativas de Connectia.',
    `Analizás resultados de "${community}" en español rioplatense, claro y accionable.`,
    'Trabajás sobre UNA encuesta = muchos cuestionarios respondidos (agregados + muestras).',
    'No inventes números: basate solo en quantitative y qualitativeSamples.',
    'Si hay pocos datos, dilo y bajá la confianza.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      resumenEjecutivo: '2-4 oraciones',
      cuantitativo: {
        hallazgos: ['hallazgo con número'],
        metricasClave: [{ etiqueta: 'string', valor: 'string', lectura: 'string' }],
      },
      cualitativo: {
        temas: [{ tema: 'string', evidencia: 'cita o paráfrasis', frecuenciaAprox: 'alta|media|baja' }],
        tonoGeneral: 'string',
        citasRepresentativas: ['string'],
      },
      riesgosOAlertas: ['string'],
      recomendaciones: ['acción concreta para gestión'],
      confianza: 'alta|media|baja',
      limitaciones: 'string',
    }),
  ].join('\n')

  const userContent = [
    focus ? `Enfoque pedido por el editor: ${focus}` : 'Enfoque: análisis general de la encuesta completa.',
    'Datos de la encuesta (JSON):',
    JSON.stringify(payload),
  ].join('\n\n')

  const chat = await chatWithFallback({ system, userContent, provider, maxTokens: 2800 })
  let analysis
  try {
    analysis = parseJson(chat.raw)
  } catch {
    analysis = {
      resumenEjecutivo: chat.raw?.slice?.(0, 1200) || 'No se pudo parsear el análisis',
      cuantitativo: { hallazgos: [], metricasClave: [] },
      cualitativo: { temas: [], tonoGeneral: '', citasRepresentativas: [] },
      riesgosOAlertas: [],
      recomendaciones: [],
      confianza: 'baja',
      limitaciones: 'Respuesta de IA no estructurada',
    }
  }

  return {
    analysis,
    provider: chat.provider,
    model: chat.model,
    basedOn: {
      answered: participation?.answered ?? responses.length,
      invited: participation?.invited ?? null,
      questionCount: payload.survey.questions.length,
    },
  }
}

/**
 * Genera un borrador completo de encuesta (cuestionario) desde un prompt del editor.
 */
export async function generateSurveyDraftFromPrompt({
  prompt,
  tenant = null,
  provider = 'auto',
} = {}) {
  if (!aiConfigured()) {
    const err = new Error('Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para generar con IA')
    err.status = 503
    throw err
  }
  const goal = String(prompt || '').trim()
  if (!goal) {
    const err = new Error('Escribí un prompt detallado para armar la encuesta')
    err.status = 400
    throw err
  }

  const community = tenant?.nombre || 'la comunidad'
  const types = SURVEY_QUESTION_TYPES.join('|')

  const system = [
    'Sos diseñador de encuestas corporativas de Connectia.',
    `Armás cuestionarios completos para empleados de "${community}" en español rioplatense.`,
    'El humano revisará antes de publicar: sugerí un formulario listo para editar.',
    'Usá tipos de pregunta SOLO de esta lista:',
    types,
    'Para single/multiple incluí 3–6 opciones claras.',
    'Incluí mezcla útil: cerradas (rating, yesno, single) + alguna abierta (textarea) si aporta.',
    'Entre 5 y 12 preguntas, orden lógico, sin preguntas duplicadas ni sesgadas.',
    'No inventes datos de la empresa que el prompt no diga.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      titulo: 'string corto',
      descripcion: 'string: propósito y cómo se usa',
      anonymousSuggested: false,
      questions: [
        {
          texto: 'string',
          tipo: 'text|textarea|number|yesno|single|multiple|rating|date|time|datetime|email|phone',
          required: true,
          grupo: 'nombre de sección temática',
          opciones: ['solo si single o multiple'],
        },
      ],
      notas: 'advertencias o supuestos para el editor',
    }),
  ].join('\n')

  const userContent = [
    'Objetivo / brief del editor (diseñá el formulario completo):',
    goal,
  ].join('\n\n')

  const chat = await chatWithFallback({ system, userContent, provider, maxTokens: 3200 })
  let data
  try {
    data = parseJson(chat.raw)
  } catch {
    const err = new Error('La IA no devolvió un cuestionario usable')
    err.status = 502
    throw err
  }

  const questions = Array.isArray(data.questions) ? data.questions : []
  if (!String(data.titulo || '').trim() || questions.length < 1) {
    const err = new Error('La IA no armó un cuestionario completo (faltan título o preguntas)')
    err.status = 502
    throw err
  }

  return {
    draft: {
      titulo: String(data.titulo || '').trim().slice(0, 160),
      descripcion: String(data.descripcion || '').trim().slice(0, 4000),
      anonymous: Boolean(data.anonymousSuggested),
      status: 'draft',
      questions,
      notas: String(data.notas || '').trim(),
    },
    provider: chat.provider,
    model: chat.model,
  }
}

export { aiConfigured }
