/**
 * Análisis IA de publicaciones UGC para sugerir moderación al admin.
 * Solo origin=member (app de usuarios). Las pubs del CMS admin no se analizan.
 * La decisión final siempre es humana (approve/reject).
 *
 * Políticas de comunidad (Connectia / muro corporativo):
 * 1. Debe incluir media (imagen o video) — el muro pierde sentido sin visual.
 * 2. Sin groserías, insultos ni tono agresivo.
 * 3. Sin amenazas, discriminación ni acoso.
 * 4. Sin datos personales sensibles (DNI, cuentas, contraseñas, salud íntima).
 * 5. Sin spam, phishing ni enlaces sospechosos.
 * 6. Sin política partidaria / campaña electoral.
 * 7. Sin rumores laborales sensibles sin canal formal (sueldos, despidos masivos).
 * 8. Debe aportar valor a la comunidad (no texto vacío, gibberish tipo "dsasds" ni ruido).
 * 9. No contradecir políticas internas ni promover conductas ilegales/inseguras.
 */
import { aiConfigured } from './openaiPosts.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const RISKS = ['low', 'medium', 'high']
const ACTIONS = ['approve', 'review', 'reject']

/** Texto de políticas para prompt y UI admin */
export const UGC_COMMUNITY_POLICIES = [
  'Debe incluir al menos una media (imagen o video): el muro es visual.',
  'Sin groserías, insultos, burlas ni tono agresivo o humillante.',
  'Sin amenazas, violencia, discriminación, acoso o contenido que intimide.',
  'Sin datos personales sensibles (DNI, CBU, contraseñas, datos de salud, etc.).',
  'Sin spam, phishing ni enlaces acortados / sospechosos.',
  'Sin propaganda política partidaria ni campañas electorales.',
  'Temas laborales sensibles (sueldos, despidos) → preferir canales formales; en muro, revisión.',
  'Debe aportar valor a la comunidad (novedad, reconocimiento, aviso útil); rechazar vacío, relleno o texto sin sentido (ej. "dsasds", teclado al azar).',
  'No promover conductas ilegales, inseguras o que vulneren políticas internas.',
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

function emptyAnalysis(extra = {}) {
  return {
    status: 'pending',
    analyzedAt: null,
    provider: '',
    model: '',
    risk: 'low',
    score: 0,
    suggestedAction: 'review',
    summary: '',
    reasons: [],
    categories: [],
    policyFlags: [],
    error: '',
    ...extra,
  }
}

function normalizeAnalysis(raw, meta = {}) {
  const risk = RISKS.includes(raw?.risk) ? raw.risk : 'medium'
  let suggestedAction = ACTIONS.includes(raw?.suggestedAction) ? raw.suggestedAction : 'review'
  if (risk === 'high' && suggestedAction === 'approve') suggestedAction = 'reject'
  if (risk === 'low' && suggestedAction === 'reject') suggestedAction = 'review'
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
  }
}

function hasMedia({ imageUrl = '', imageUrls = [], audioUrl = '' } = {}) {
  const urls = [
    String(imageUrl || '').trim(),
    ...((Array.isArray(imageUrls) ? imageUrls : []).map((u) => String(u || '').trim())),
    String(audioUrl || '').trim(),
  ].filter(Boolean)
  return urls.length > 0
}

function contentPayload(input = {}) {
  return {
    titulo: String(input.titulo || ''),
    cuerpo: String(input.cuerpo || ''),
    imageUrl: String(input.imageUrl || ''),
    imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls : [],
    audioUrl: String(input.audioUrl || ''),
    hasMedia: hasMedia(input),
  }
}

const MIN_MEANINGFUL_CHARS = 12

function plainText(titulo = '', cuerpo = '') {
  return `${titulo} ${cuerpo}`.replace(/\s+/g, ' ').trim()
}

function lettersOnly(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '')
    .toLowerCase()
}

/**
 * Detecta texto vacío, demasiado corto o sin sentido (teclado al azar / gibberish).
 * Devuelve null si el texto aporta valor mínimo; si no, { level, label, flag }.
 */
export function assessLowValueContent(titulo = '', cuerpo = '') {
  const plain = plainText(titulo, cuerpo)
  if (!plain) {
    return {
      level: 'medium',
      label: 'Sin texto útil: título y cuerpo vacíos',
      flag: 'low_value',
    }
  }
  if (plain.length < MIN_MEANINGFUL_CHARS) {
    return {
      level: 'medium',
      label: 'Contenido demasiado corto / sin valor claro para la comunidad',
      flag: 'low_value',
    }
  }

  const letters = lettersOnly(plain)
  if (letters.length < 4) {
    return {
      level: 'medium',
      label: 'Texto sin contenido legible para la comunidad',
      flag: 'low_value',
    }
  }

  const vowels = (letters.match(/[aeiouáéíóúü]/g) || []).length
  const vowelRatio = vowels / letters.length
  const unique = new Set(letters)
  const words = plain.split(/\s+/).filter(Boolean)

  const wordLooksGibberish = (w) => {
    const l = lettersOnly(w)
    if (l.length < 4) return false
    const v = (l.match(/[aeiouáéíóúü]/g) || []).length
    const ratio = v / l.length
    if (/(.)\1{3,}/.test(l)) return true
    if (l.length >= 5 && ratio < 0.22) return true
    if (l.length >= 6 && new Set(l).size <= 3) return true
    return false
  }

  const gibberish =
    (letters.length >= 5 && vowelRatio < 0.22) ||
    /(.)\1{3,}/.test(letters) ||
    (letters.length >= 6 && unique.size <= 3) ||
    (words.length === 1 && letters.length >= 5 && vowelRatio < 0.32) ||
    (words.length >= 1 &&
      words.every(wordLooksGibberish) &&
      letters.length >= 5)

  if (gibberish) {
    return {
      level: 'medium',
      label: 'Texto sin sentido o relleno (ej. teclado al azar); no aporta valor a la comunidad',
      flag: 'low_value',
    }
  }

  return null
}

/** Heurística local si no hay API key (demo / offline). */
export function heuristicModeration(input = {}) {
  const { titulo, cuerpo, hasMedia: mediaOk } = contentPayload(input)
  const text = `${titulo}\n${cuerpo}`.toLowerCase()
  const hits = []

  if (!mediaOk) {
    hits.push({ level: 'medium', label: 'Sin media (imagen/video): el muro debe ser visual', flag: 'missing_media' })
  }

  const lowValue = assessLowValueContent(titulo, cuerpo)
  if (lowValue) hits.push(lowValue)

  const high = [
    [
      /\b(mierda|carajo|puto|puta|pelotudo|boludo|hijo de puta|hij[oa] de|idiota|estupido|estúpido|imbécil|imbecil|concha|verga|pajer[oa]?|la puta|la cagada|forro|forra)\b/i,
      'lenguaje grosero u ofensivo',
      'profanity',
    ],
    [
      /\b(te voy a (matar|cagar|romper)|amenaza|violencia|golpearte|te mato)\b/i,
      'posible amenaza o violencia',
      'threat',
    ],
    [
      /\b(negro de mierda|sudaca|puto de|lesbiana de mierda|trava|mogólico|mogolico)\b/i,
      'posible discriminación / insulto',
      'discrimination',
    ],
    [
      /\b(dni\s*\d|cbu\s*\d|cvv|password|contraseña|clave\s*de\s*acceso|tarjeta\s*\d{4})\b/i,
      'posible dato personal sensible',
      'pii',
    ],
  ]
  const medium = [
    [
      /\b(sueldo|salario|aumento|despido|renuncia|liquidación|liquidacion)\b/i,
      'tema laboral sensible (mejor canal formal)',
      'sensitive_hr',
    ],
    [
      /\b(política|politica|elecciones|partido|candidato|kirchner|milei|massa|peronista|radical)\b/i,
      'posible contenido político partidario',
      'politics',
    ],
    [
      /\b(bit\.ly|tinyurl|t\.co|whatsapp\.me|http:\/\/)\b/i,
      'enlace externo / posible spam o phishing',
      'spam_link',
    ],
    [
      /\b(odio|discrimin|racis|sexis|acosar|bullying)\b/i,
      'posible discriminación o acoso',
      'harassment',
    ],
    [
      /\b(droga|cocaína|cocaina|marihuana ilegal|estafa|fraude)\b/i,
      'posible contenido ilegal o contrario a políticas',
      'illegal',
    ],
    [
      /\b(inútil|inutil|basura|estúpidos|estupidos|vengan|boycott|boicot)\b/i,
      'tono agresivo o que puede dañar el clima laboral',
      'aggressive_tone',
    ],
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
  const suggestedAction = hasHigh ? 'reject' : hasMed ? 'review' : 'approve'
  return enforceHardRules(
    normalizeAnalysis(
      {
        risk,
        score: hasHigh ? 88 : hasMed ? 58 : 12,
        suggestedAction,
        summary: hasHigh
          ? 'Se detectaron señales de alto riesgo respecto a las políticas del muro. Recomendamos rechazar o editar.'
          : hasMed
            ? 'Hay incumplimientos o riesgos de política de comunidad. Revisá antes de publicar.'
            : 'Cumple las políticas básicas (media, tono y contenido). Podés aprobar si encaja en el muro.',
        reasons: hits.length ? hits.map((h) => h.label) : ['Sin señales de riesgo evidentes'],
        categories: hits.length ? hits.map((h) => h.flag || h.label) : ['ok'],
        policyFlags: hits.map((h) => h.flag).filter(Boolean),
      },
      { provider: 'heuristic', model: 'rules-v3' },
    ),
    input,
  )
}

async function chatOpenAI(system, userContent) {
  const key = openaiKey()
  if (!key) throw Object.assign(new Error('OPENAI_API_KEY no configurada'), { status: 503 })
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 900,
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
    model,
    provider: 'openai',
  }
}

async function chatAnthropic(system, userContent) {
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
      max_tokens: 900,
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

async function chatWithFallback(system, userContent, provider) {
  const providers = preferredProviders(provider)
  const errors = []
  for (const p of providers) {
    try {
      if (p === 'openai') return await chatOpenAI(system, userContent)
      if (p === 'anthropic') return await chatAnthropic(system, userContent)
    } catch (e) {
      errors.push(`${p}: ${e.message}`)
    }
  }
  throw Object.assign(new Error(errors.join(' | ') || 'IA no disponible'), { status: 503 })
}

function systemPrompt(tenantName) {
  return [
    'Sos moderador asistente de un muro corporativo interno (Connectia), estilo Instagram interno.',
    `Comunidad: "${tenantName || 'la empresa'}".`,
    'Analizás publicaciones de colaboradores ANTES de que un admin las apruebe.',
    'NO tomás la decisión final: solo sugerís. El humano confirma.',
    '',
    'Políticas obligatorias del muro (marcar cada incumplimiento en policyFlags y reasons):',
    ...UGC_COMMUNITY_POLICIES.map((p, i) => `${i + 1}. ${p}`),
    '',
    'Reglas de severidad:',
    '- missing_media (sin imagen/video) → risk mínimo medium, suggestedAction review (no approve).',
    '- low_value: texto vacío, demasiado corto (<12 chars) o sin sentido/gibberish (ej. "dsasds", teclado al azar) → risk mínimo medium, suggestedAction review (nunca approve).',
    '- groserías / agresividad / amenazas / discriminación → risk high, suggestedAction reject.',
    '- spam, política partidaria, PII, ilegal → medium o high según gravedad.',
    '- Contenido sano con media, texto con sentido y tono respetuoso → low + approve.',
    'Sé prudente: si hay duda, preferí review antes que approve.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      risk: 'low|medium|high',
      score: '0-100 (mayor = más riesgoso)',
      suggestedAction: 'approve|review|reject',
      summary: '1-2 frases en español para el admin',
      reasons: ['motivos concretos en español'],
      categories: ['ok|missing_media|profanity|aggressive_tone|threat|discrimination|pii|spam_link|politics|sensitive_hr|low_value|illegal|other'],
      policyFlags: ['códigos de política incumplida, ej. missing_media, profanity'],
    }),
  ].join('\n')
}

/**
 * Refuerza reglas duras post-IA (media, low_value, etc.) para no perder criterios de producto.
 */
function enforceHardRules(analysis, input) {
  const payload = contentPayload(input)
  const reasons = [...(analysis.reasons || [])]
  const flags = [...(analysis.policyFlags || [])]
  const categories = [...(analysis.categories || [])]
  let { risk, score, suggestedAction, summary } = analysis

  if (!payload.hasMedia) {
    if (!flags.includes('missing_media')) flags.push('missing_media')
    if (!categories.includes('missing_media')) categories.push('missing_media')
    if (!reasons.some((r) => /media|imagen|video/i.test(r))) {
      reasons.unshift('Falta media (imagen o video): el muro corporativo debe ser visual')
    }
    if (risk === 'low') risk = 'medium'
    if (suggestedAction === 'approve') suggestedAction = 'review'
    score = Math.max(score, 45)
    if (!/media|imagen|video/i.test(summary || '')) {
      summary = `${summary || ''} Revisá: no trae imagen/video.`.trim()
    }
  }

  const lowValue = assessLowValueContent(payload.titulo, payload.cuerpo)
  if (lowValue) {
    if (!flags.includes('low_value')) flags.push('low_value')
    if (!categories.includes('low_value')) categories.push('low_value')
    if (!reasons.some((r) => /sin sentido|sin valor|corto|vacío|vacio|gibberish|relleno|legible/i.test(r))) {
      reasons.unshift(lowValue.label)
    }
    if (risk === 'low') risk = 'medium'
    if (suggestedAction === 'approve') suggestedAction = 'review'
    score = Math.max(score, 50)
    if (!/sin sentido|sin valor|corto|vacío|vacio|relleno|legible/i.test(summary || '')) {
      summary = `${summary || ''} Advertencia: el texto no aporta valor claro (vacío, corto o sin sentido).`.trim()
    }
  }

  return normalizeAnalysis(
    {
      risk,
      score,
      suggestedAction,
      summary,
      reasons,
      categories,
      policyFlags: flags,
    },
    { provider: analysis.provider, model: analysis.model },
  )
}

/**
 * Analiza título+cuerpo+media de una pub UGC.
 * Si no hay API key, usa heurística local.
 */
export async function analyzeUgcModeration({
  titulo,
  cuerpo,
  imageUrl,
  imageUrls,
  audioUrl,
  authorName,
  tenantName,
  provider,
} = {}) {
  const input = { titulo, cuerpo, imageUrl, imageUrls, audioUrl }
  if (!aiConfigured()) {
    return heuristicModeration(input)
  }
  const payload = contentPayload(input)
  const userContent = JSON.stringify({
    autor: authorName || 'miembro',
    titulo: payload.titulo.slice(0, 200),
    cuerpo: payload.cuerpo.slice(0, 4000),
    hasMedia: payload.hasMedia,
    mediaHint: payload.hasMedia
      ? 'Tiene al menos una media (imagen/video/audio).'
      : 'NO tiene media: incumple política de muro visual.',
  })
  try {
    const { raw, model, provider: used } = await chatWithFallback(
      systemPrompt(tenantName),
      userContent,
      provider,
    )
    const data = parseJson(raw)
    const normalized = normalizeAnalysis(data, { provider: used, model })
    return enforceHardRules(normalized, input)
  } catch (e) {
    const fallback = heuristicModeration(input)
    fallback.error = e.message || 'IA falló; se usó heurística'
    fallback.summary = `${fallback.summary} (análisis local por fallo de IA)`
    return fallback
  }
}

export function serializeModerationAi(m) {
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
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map((r) => String(r)) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map((c) => String(c)) : [],
    policyFlags: Array.isArray(raw.policyFlags) ? raw.policyFlags.map((f) => String(f)) : [],
    error: raw.error || '',
  }
}

export { emptyAnalysis, aiConfigured, hasMedia }
