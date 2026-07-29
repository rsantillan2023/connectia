/**
 * Análisis IA de comentarios (§10).
 * Sugiere acción al admin; no ejecuta sola (salvo auto-ocultar del tenant).
 */
import { aiConfigured } from './openaiPosts.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const RISKS = ['low', 'medium', 'high']
const ACTIONS = ['approve', 'hide', 'reply', 'escalate', 'review']

export const COMMENT_COMMUNITY_POLICIES = [
  'Sin groserías, insultos, burlas ni tono agresivo.',
  'Sin amenazas, violencia, discriminación ni acoso.',
  'Sin datos personales sensibles (DNI, CBU, contraseñas, salud).',
  'Sin spam, phishing ni enlaces sospechosos.',
  'Sin política partidaria ni campañas electorales.',
  'Temas laborales sensibles → preferir canales formales.',
  'Aportar valor al hilo (no vacío ni gibberish).',
]

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

export function emptyCommentAnalysis(extra = {}) {
  return {
    status: 'pending',
    analyzedAt: null,
    provider: '',
    model: '',
    risk: 'low',
    score: 0,
    suggestedAction: 'review',
    summary: '',
    draftReply: '',
    reasons: [],
    categories: [],
    policyFlags: [],
    error: '',
    autoApplied: false,
    ...extra,
  }
}

function normalizeAnalysis(raw, meta = {}) {
  const risk = RISKS.includes(raw?.risk) ? raw.risk : 'medium'
  let suggestedAction = ACTIONS.includes(raw?.suggestedAction) ? raw.suggestedAction : 'review'
  if (risk === 'high' && suggestedAction === 'approve') suggestedAction = 'hide'
  if (risk === 'low' && suggestedAction === 'hide') suggestedAction = 'review'
  const score = Math.max(
    0,
    Math.min(100, Number(raw?.score) || (risk === 'high' ? 85 : risk === 'medium' ? 55 : 15)),
  )
  return {
    status: 'ready',
    analyzedAt: new Date(),
    provider: meta.provider || '',
    model: meta.model || '',
    risk,
    score,
    suggestedAction,
    summary: String(raw?.summary || '').trim().slice(0, 500),
    draftReply: String(raw?.draftReply || '').trim().slice(0, 1000),
    reasons: Array.isArray(raw?.reasons)
      ? raw.reasons.map((r) => String(r).trim()).filter(Boolean).slice(0, 10)
      : [],
    categories: Array.isArray(raw?.categories)
      ? raw.categories.map((c) => String(c).trim()).filter(Boolean).slice(0, 10)
      : [],
    policyFlags: Array.isArray(raw?.policyFlags)
      ? raw.policyFlags.map((c) => String(c).trim()).filter(Boolean).slice(0, 12)
      : [],
    error: '',
    autoApplied: false,
  }
}

function lettersOnly(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '')
    .toLowerCase()
}

function assessLowValue(texto = '') {
  const plain = String(texto || '').replace(/\s+/g, ' ').trim()
  if (!plain || plain.length < 2) {
    return { level: 'medium', label: 'Comentario vacío o sin contenido', flag: 'low_value' }
  }
  const letters = lettersOnly(plain)
  if (letters.length < 3) {
    return { level: 'medium', label: 'Texto sin contenido legible', flag: 'low_value' }
  }
  const vowels = (letters.match(/[aeiouáéíóúü]/g) || []).length
  const vowelRatio = vowels / letters.length
  if ((letters.length >= 5 && vowelRatio < 0.22) || /(.)\1{3,}/.test(letters)) {
    return { level: 'medium', label: 'Texto sin sentido o relleno', flag: 'low_value' }
  }
  return null
}

/** Heurística local si no hay API key. */
export function heuristicCommentModeration(texto = '', glossary = []) {
  const text = String(texto || '').toLowerCase()
  const hits = []

  const lowValue = assessLowValue(texto)
  if (lowValue) hits.push(lowValue)

  for (const w of glossary || []) {
    const term = String(w || '').trim().toLowerCase()
    if (term && text.includes(term)) {
      hits.push({ level: 'medium', label: `Palabra sensible del tenant: «${term}»`, flag: 'glossary' })
    }
  }

  const high = [
    [/\b(mierda|carajo|puto|puta|pelotudo|boludo|hijo de puta|idiota|imbécil|imbecil|concha|verga|forro)\b/i, 'lenguaje grosero', 'profanity'],
    [/\b(te voy a (matar|cagar|romper)|amenaza|te mato)\b/i, 'posible amenaza', 'threat'],
    [/\b(negro de mierda|sudaca|mogólico|mogolico)\b/i, 'posible discriminación', 'discrimination'],
    [/\b(dni\s*\d|cbu\s*\d|cvv|password|contraseña|tarjeta\s*\d{4})\b/i, 'posible PII', 'pii'],
  ]
  const medium = [
    [/\b(sueldo|salario|despido|renuncia)\b/i, 'tema laboral sensible', 'sensitive_hr'],
    [/\b(elecciones|partido|candidato|kirchner|milei)\b/i, 'posible contenido político', 'politics'],
    [/\b(bit\.ly|tinyurl|t\.co|http:\/\/)\b/i, 'enlace sospechoso', 'spam_link'],
    [/\b(odio|racis|sexis|acosar|bullying)\b/i, 'posible acoso', 'harassment'],
  ]

  for (const [re, label, flag] of high) {
    if (re.test(text)) hits.push({ level: 'high', label, flag })
  }
  for (const [re, label, flag] of medium) {
    if (re.test(text)) hits.push({ level: 'medium', label, flag })
  }

  const hasHigh = hits.some((h) => h.level === 'high')
  const hasMed = hits.some((h) => h.level === 'medium')
  const risk = hasHigh ? 'high' : hasMed ? 'medium' : 'low'
  const suggestedAction = hasHigh ? 'hide' : hasMed ? 'review' : 'approve'
  return normalizeAnalysis(
    {
      risk,
      score: hasHigh ? 88 : hasMed ? 58 : 12,
      suggestedAction,
      summary: hasHigh
        ? 'Alto riesgo respecto a políticas de comentarios. Recomendamos ocultar.'
        : hasMed
          ? 'Hay señales a revisar antes de dejar visible.'
          : 'Sin señales de riesgo evidentes. Podés aprobar.',
      draftReply: hasHigh
        ? 'Hola, ocultamos tu comentario porque no cumple las normas de la comunidad. Gracias por entender.'
        : '',
      reasons: hits.length ? hits.map((h) => h.label) : ['Sin señales de riesgo evidentes'],
      categories: hits.length ? hits.map((h) => h.flag || h.label) : ['ok'],
      policyFlags: hits.map((h) => h.flag).filter(Boolean),
    },
    { provider: 'heuristic', model: 'comment-rules-v1' },
  )
}

async function chatOpenAI(system, userContent) {
  const key = openaiKey()
  if (!key) throw Object.assign(new Error('OPENAI_API_KEY no configurada'), { status: 503 })
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return { raw: data.choices?.[0]?.message?.content || '', model, provider: 'openai' }
}

async function chatAnthropic(system, userContent) {
  const key = anthropicKey()
  if (!key) throw Object.assign(new Error('ANTHROPIC_API_KEY no configurada'), { status: 503 })
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  const res = await fetch(ANTHROPIC_MESSAGES, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  const raw = (data.content || []).map((c) => c.text || '').join('')
  return { raw, model, provider: 'anthropic' }
}

async function chatWithFallback(system, userContent, provider) {
  const order = preferredProviders(provider)
  let lastErr
  for (const p of order) {
    try {
      if (p === 'openai' && openaiKey()) return await chatOpenAI(system, userContent)
      if (p === 'anthropic' && anthropicKey()) return await chatAnthropic(system, userContent)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Ningún proveedor IA disponible')
}

function systemPrompt(tenantName, glossary = []) {
  return [
    `Sos moderador asistente de comentarios en la comunidad corporativa «${tenantName || 'Connectia'}».`,
    'Analizá el comentario y sugerí acción. El humano confirma; no ejecutes vos.',
    'Políticas:',
    ...COMMENT_COMMUNITY_POLICIES.map((p, i) => `${i + 1}. ${p}`),
    glossary.length ? `Glosario sensible del tenant: ${glossary.join(', ')}` : '',
    'Respondé SOLO JSON:',
    JSON.stringify({
      risk: 'low|medium|high',
      score: '0-100',
      suggestedAction: 'approve|hide|reply|escalate|review',
      summary: '1-2 frases en español',
      draftReply: 'borrador opcional de respuesta al autor',
      reasons: ['motivos'],
      categories: ['ok|profanity|threat|discrimination|pii|spam_link|politics|sensitive_hr|low_value|harassment|glossary|other'],
      policyFlags: ['códigos'],
    }),
  ]
    .filter(Boolean)
    .join('\n')
}

export async function analyzeCommentModeration({
  texto,
  authorName,
  tenantName,
  glossary = [],
  provider,
} = {}) {
  if (!aiConfigured()) {
    return heuristicCommentModeration(texto, glossary)
  }
  const userContent = JSON.stringify({
    autor: authorName || 'miembro',
    texto: String(texto || '').slice(0, 4000),
  })
  try {
    const { raw, model, provider: used } = await chatWithFallback(
      systemPrompt(tenantName, glossary),
      userContent,
      provider,
    )
    return normalizeAnalysis(parseJson(raw), { provider: used, model })
  } catch (e) {
    const fallback = heuristicCommentModeration(texto, glossary)
    fallback.error = e.message || 'IA falló; se usó heurística'
    fallback.summary = `${fallback.summary} (análisis local por fallo de IA)`
    return fallback
  }
}

export function serializeCommentModerationAi(m) {
  if (!m || typeof m !== 'object') return null
  const raw = typeof m.toObject === 'function' ? m.toObject() : m
  return {
    status: raw.status || 'pending',
    analyzedAt: raw.analyzedAt || null,
    provider: raw.provider || '',
    model: raw.model || '',
    risk: raw.risk || 'low',
    score: Number(raw.score) || 0,
    suggestedAction: raw.suggestedAction || 'review',
    summary: String(raw.summary || '').trim(),
    draftReply: String(raw.draftReply || '').trim(),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map((r) => String(r)) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map((c) => String(c)) : [],
    policyFlags: Array.isArray(raw.policyFlags) ? raw.policyFlags.map((f) => String(f)) : [],
    error: raw.error || '',
    autoApplied: Boolean(raw.autoApplied),
  }
}

export { aiConfigured }
