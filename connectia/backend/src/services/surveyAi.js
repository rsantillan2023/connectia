/**
 * Análisis IA de una encuesta (conjunto de cuestionarios respondidos).
 * Cualitativo + cuantitativo a partir de agregados y muestras.
 */
import { aiConfigured } from './openaiPosts.js'
import { buildAiAnalysisPayload } from '../lib/surveyAnalytics.js'
import {
  SURVEY_QUESTION_TYPES,
  normalizeQuestionTypeSpecs,
  buildSmartQuestionTypePlan,
  interleaveQuestionTypes,
} from '../lib/surveyQuestions.js'
import { resolveEnabledQuestionTypes } from '../lib/surveysConfig.js'

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
 * Completa título, descripción y contexto para generar preguntas (sin armar el cuestionario).
 */
export async function generateSurveyGeneralFromPrompt({
  prompt,
  current = {},
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
    const err = new Error('Describí el contexto o el objetivo de la encuesta')
    err.status = 400
    throw err
  }

  const community = tenant?.nombre || 'la comunidad'
  const system = [
    'Sos diseñador de encuestas corporativas de Connectia.',
    `Redactás textos para empleados de "${community}" en español rioplatense.`,
    'NO generes preguntas: solo título, descripción pública y contexto interno para luego generar preguntas.',
    'titulo: corto, claro, usable en listados (máx ~80 caracteres).',
    'descripcion: lo que ve el miembro en la app (propósito, qué se pide, tono cercano).',
    'aiContext: briefing interno para la IA al armar preguntas (temas a medir, qué evitar, tono, tipologías deseadas, públicos, supuestos). No lo ve el miembro.',
    'Si ya hay borrador parcial, mejorá/completá sin contradecirlo salvo que el brief lo pida.',
    'No inventes datos de la empresa que el prompt no diga.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      titulo: 'string corto',
      descripcion: 'string visible para el miembro',
      aiContext: 'string: contexto interno para generar preguntas',
      notas: 'tips breves para el editor',
    }),
  ].join('\n')

  const userContent = [
    'Brief / contexto del editor:',
    goal,
    '',
    'Borrador actual (puede estar vacío):',
    JSON.stringify(
      {
        titulo: String(current.titulo || '').trim().slice(0, 160),
        descripcion: String(current.descripcion || '').trim().slice(0, 2000),
        aiContext: String(current.aiContext || '').trim().slice(0, 2000),
        purpose: String(current.purpose || 'general').trim().slice(0, 40),
      },
      null,
      2,
    ),
  ].join('\n')

  const chat = await chatWithFallback({ system, userContent, provider, maxTokens: 1200 })
  let data
  try {
    data = parseJson(chat.raw)
  } catch {
    const err = new Error('La IA no devolvió textos usables')
    err.status = 502
    throw err
  }

  const titulo = String(data.titulo || '').trim().slice(0, 160)
  const descripcion = String(data.descripcion || '').trim().slice(0, 4000)
  const aiContext = String(data.aiContext || '').trim().slice(0, 4000)
  if (!titulo && !descripcion && !aiContext) {
    const err = new Error('La IA no generó título, descripción ni contexto')
    err.status = 502
    throw err
  }

  return {
    general: {
      titulo: titulo || String(current.titulo || '').trim().slice(0, 160),
      descripcion: descripcion || String(current.descripcion || '').trim().slice(0, 4000),
      aiContext: aiContext || String(current.aiContext || '').trim().slice(0, 4000),
    },
    notas: String(data.notas || '').trim(),
    provider: chat.provider,
    model: chat.model,
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

/**
 * Genera solo preguntas a partir del contexto de la encuesta + plan de tipologías.
 * Body esperado: context { titulo, descripcion, purpose, anonymous, audienceLabel, existingQuestions? },
 * typeSpecs [{ tipo, count, caracteristicas? }], notes?, provider?, mode?: 'smart'|'manual', total?
 */
export async function generateSurveyQuestionsFromContext({
  context = {},
  typeSpecs = [],
  notes = '',
  tenant = null,
  provider = 'auto',
  mode = 'manual',
  total = 8,
} = {}) {
  if (!aiConfigured()) {
    const err = new Error('Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para generar con IA')
    err.status = 503
    throw err
  }

  const enabledTypes = resolveEnabledQuestionTypes(tenant)
  const smartMode = mode === 'smart' || mode === 'auto' || !Array.isArray(typeSpecs) || !typeSpecs.length

  let plan
  let sequence = []
  if (smartMode) {
    const smart = buildSmartQuestionTypePlan({
      enabledTypes,
      total,
      context: {
        categoria: context.categoria,
        purpose: context.purpose,
        titulo: context.titulo,
        descripcion: context.descripcion,
        aiContext: context.aiContext,
      },
    })
    plan = normalizeQuestionTypeSpecs(smart.specs)
    plan.mode = 'smart'
    sequence = Array.isArray(smart.sequence) && smart.sequence.length
      ? smart.sequence
      : interleaveQuestionTypes(plan.specs)
  } else {
    const filtered = (typeSpecs || []).filter((s) => enabledTypes.includes(s?.tipo))
    plan = normalizeQuestionTypeSpecs(filtered.length ? filtered : typeSpecs)
    plan.mode = 'manual'
    sequence = interleaveQuestionTypes(plan.specs)
  }

  if (plan.error) {
    const err = new Error(plan.error)
    err.status = 400
    throw err
  }
  if (!sequence.length) {
    sequence = plan.specs.flatMap((s) => Array.from({ length: s.count }, () => s.tipo))
  }

  const community = tenant?.nombre || 'la comunidad'
  const types = enabledTypes.join('|')
  const ctx = {
    titulo: String(context.titulo || '').trim().slice(0, 160),
    descripcion: String(context.descripcion || '').trim().slice(0, 2000),
    aiContext: String(context.aiContext || '').trim().slice(0, 3000),
    categoria: String(context.categoria || '').trim().slice(0, 40),
    categoriaLabel: String(context.categoriaLabel || '').trim().slice(0, 80),
    purpose: String(context.purpose || 'general').trim().slice(0, 40),
    anonymous: Boolean(context.anonymous),
    audienceLabel: String(context.audienceLabel || '').trim().slice(0, 200),
    startsAt: context.startsAt || null,
    endsAt: context.endsAt || null,
    existingQuestions: Array.isArray(context.existingQuestions)
      ? context.existingQuestions.slice(0, 40).map((q) => ({
          texto: String(q?.texto || '').trim().slice(0, 200),
          tipo: q?.tipo || '',
          grupo: q?.grupo || '',
        }))
      : [],
  }

  const planLines = plan.specs.map((s) => {
    const extra = s.caracteristicas ? ` — ${s.caracteristicas}` : ''
    return `- ${s.count}× "${s.tipo}"${extra}`
  })
  const sequenceLines = sequence.map((tipo, idx) => `${idx + 1}. tipo="${tipo}"`)

  const system = [
    'Sos diseñador senior de encuestas corporativas de Connectia.',
    `Armás cuestionarios para empleados de "${community}" en español rioplatense.`,
    'El humano ya tiene título/descripción/audiencia/características: NO cambies el título de la encuesta.',
    'Si viene "aiContext", usalo como briefing principal para temas, tono y foco.',
    'Si viene "categoria"/"categoriaLabel", alineá el contenido a esa categoría.',
    'CRÍTICO — diversidad de tipologías:',
    `- Generá EXACTAMENTE ${sequence.length || plan.total} preguntas.`,
    '- La tipología de cada pregunta DEBE coincidir con la secuencia numerada (pregunta N → tipo N).',
    '- PROHIBIDO devolver todas del mismo tipo. Si la secuencia mezcla, el JSON también debe mezclar.',
    '- No agrupes 3+ preguntas seguidas del mismo tipo salvo que la secuencia lo indique.',
    'Usá tipos SOLO de esta lista habilitada:',
    types,
    'Calidad del contenido:',
    '- Cada pregunta mide algo distinto; sin sinonimias ni solapamientos.',
    '- El TEXTO debe encajar con el tipo: yesno = pregunta binaria; rating = escala 1–5; single/multiple = enunciado + opciones; textarea/text = abiertas; number/date/etc. = dato concreto.',
    '- single/multiple: 3–6 opciones claras y mutuamente útiles.',
    '- rating: enunciados accionables (1–5), no genéricos.',
    '- number/date/time/datetime/email/phone/geopoint: solo si aportan dato real.',
    '- Grupos temáticos coherentes (máx. 4–5).',
    '- required=true salvo 1 abierta opcional al final si hay textarea.',
    'No dupliques preguntas existentes ni inventes datos fuera del contexto.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      questions: [
        {
          texto: 'string',
          tipo: 'debe coincidir con la secuencia',
          required: true,
          grupo: 'sección temática',
          opciones: ['solo si single o multiple'],
        },
      ],
      notas: 'supuestos o tips para el editor',
    }),
  ].join('\n')

  const userContent = [
    'Contexto de la encuesta:',
    JSON.stringify(ctx, null, 2),
    '',
    'Cuotas por tipología (respetá totales):',
    ...planLines,
    '',
    'Secuencia obligatoria (orden + tipo de cada pregunta):',
    ...sequenceLines,
    '',
    `Total esperado: ${sequence.length || plan.total} preguntas con tipologías distintas intercaladas.`,
    notes ? `\nIndicaciones adicionales del editor:\n${String(notes).trim().slice(0, 1500)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const chat = await chatWithFallback({ system, userContent, provider, maxTokens: 4500 })
  let data
  try {
    data = parseJson(chat.raw)
  } catch {
    const err = new Error('La IA no devolvió preguntas usables')
    err.status = 502
    throw err
  }

  let questions = Array.isArray(data.questions) ? data.questions : []
  // Forzar tipología según secuencia intercalada (garantiza diversidad aunque la IA se desvíe)
  questions = questions.slice(0, sequence.length).map((q, idx) => {
    const planned = sequence[idx] || enabledTypes[0] || 'text'
    const tipo =
      SURVEY_QUESTION_TYPES.includes(planned) && enabledTypes.includes(planned)
        ? planned
        : enabledTypes[0] || 'text'
    const next = { ...q, tipo }
    if (tipo === 'single' || tipo === 'multiple') {
      const opts = Array.isArray(next.opciones)
        ? next.opciones.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 8)
        : []
      next.opciones =
        opts.length >= 2
          ? opts
          : tipo === 'multiple'
            ? ['Opción A', 'Opción B', 'Opción C', 'Ninguna de las anteriores']
            : ['Opción A', 'Opción B', 'Opción C', 'Prefiero no responder']
    } else {
      next.opciones = []
    }
    return next
  })

  // Si la IA devolvió de menos, no inventamos textos; el editor verá el parcial
  if (questions.length < 1) {
    const err = new Error('La IA no generó preguntas')
    err.status = 502
    throw err
  }

  const distinct = new Set(questions.map((q) => q.tipo)).size
  const notasExtra =
    distinct < Math.min(3, plan.specs.length)
      ? ' (tipologías forzadas al plan inteligente por diversidad)'
      : ''

  return {
    questions,
    notas: `${String(data.notas || '').trim()}${notasExtra}`.trim(),
    expectedCount: sequence.length || plan.total,
    typeSpecs: plan.specs,
    sequence,
    mode: plan.mode || 'manual',
    provider: chat.provider,
    model: chat.model,
  }
}

export { aiConfigured, normalizeQuestionTypeSpecs, buildSmartQuestionTypePlan, interleaveQuestionTypes }
