/**
 * Generación de borradores FAQ / tutorial / política desde un brief del editor.
 * Con API keys usa OpenAI/Anthropic; sin keys, heurística local usable.
 */
import { aiConfigured } from './openaiPosts.js'

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

function extractTopic(prompt) {
  const p = String(prompt || '').trim()
  const m =
    p.match(/(?:sobre|tema|sobre el tema|política de|faq de|tutorial de)\s+(.+)$/i) ||
    p.match(/^(.{12,80})/)
  return (m?.[1] || p || 'este tema').replace(/\s+/g, ' ').trim().slice(0, 120)
}

function keywordGuess(topic) {
  return [
    ...new Set(
      String(topic)
        .toLowerCase()
        .split(/[\s,;./]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 3)
        .slice(0, 6),
    ),
  ]
}

/** Heurística sin API: arma un borrador usable a partir del brief. */
export function heuristicFaqDraft(prompt, tenantName = 'la comunidad') {
  const topic = extractTopic(prompt)
  return {
    pregunta: topic.endsWith('?') ? topic : `¿Cómo hago para ${topic}?`,
    respuesta: [
      `En ${tenantName}, para ${topic}:`,
      '1. Abrí el menú de Connectia.',
      '2. Entrá a la sección correspondiente.',
      '3. Completá los datos y confirmá.',
      '',
      `Si necesitás más detalle, consultá el tutorial relacionado o a tu gestor. (Borrador generado localmente a partir de: "${String(prompt).slice(0, 160)}")`,
    ].join('\n'),
    category: 'general',
    keywords: keywordGuess(topic),
    orden: 100,
    status: 'draft',
    audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
  }
}

export function heuristicTutorialDraft(prompt, tenantName = 'la comunidad') {
  const topic = extractTopic(prompt)
  return {
    titulo: `Cómo ${topic}`.slice(0, 160),
    descripcion: `Guía paso a paso para ${topic} en ${tenantName}.`,
    category: 'Primeros pasos',
    moduloRelacionado: '',
    keywords: keywordGuess(topic),
    orden: 100,
    status: 'draft',
    showOnFirstLogin: false,
    audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    steps: [
      { titulo: 'Abrí Connectia', cuerpo: 'Iniciá sesión y tocá Menú si necesitás encontrar la sección.' },
      { titulo: `Ubicá ${topic}`, cuerpo: `Buscá la opción relacionada con ${topic} en el menú o en Enlaces.` },
      {
        titulo: 'Completá y confirmá',
        cuerpo: `Seguí las instrucciones en pantalla. Si algo no está claro, mirá Ayuda → FAQs.\n\n(Brief: ${String(prompt).slice(0, 200)})`,
      },
    ],
  }
}

export function heuristicPolicyDraft(prompt, tenantName = 'la comunidad') {
  const topic = extractTopic(prompt)
  const codigo = `POL-${topic
    .slice(0, 8)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'GEN'}`
  return {
    codigo,
    titulo: `Política de ${topic}`.slice(0, 200),
    resumen: `Lineamientos de ${topic} para colaboradores de ${tenantName}.`,
    cuerpo: [
      `Política de ${topic} — ${tenantName}`,
      '',
      '1. Alcance',
      `Esta política aplica a todos los miembros de la comunidad respecto de ${topic}.`,
      '',
      '2. Principios',
      '- Actuar con responsabilidad y transparencia.',
      '- Respetar la normativa interna y la legislación vigente.',
      '- Reportar incidentes a la persona o área responsable.',
      '',
      '3. Responsabilidades',
      'Cada colaborador debe conocer y cumplir esta política. Los gestores velan por su aplicación.',
      '',
      '4. Incumplimiento',
      'El incumplimiento puede derivar en acciones disciplinarias según el reglamento interno.',
      '',
      `Al aceptar confirmás haber leído esta versión.\n\n(Borrador local a partir de: "${String(prompt).slice(0, 200)}")`,
    ].join('\n'),
    category: 'general',
    keywords: keywordGuess(topic),
    version: '1',
    status: 'draft',
    requiresAck: true,
    mandatory: false,
    audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
  }
}

async function generateWithAi({ kind, prompt, tenant, provider }) {
  const community = tenant?.nombre || 'la comunidad'
  const goal = String(prompt || '').trim()
  if (!goal) {
    const err = new Error('Escribí un brief / prompt para generar el borrador')
    err.status = 400
    throw err
  }

  let system = ''
  let schema = {}

  if (kind === 'faq') {
    system = [
      'Sos editor de centro de ayuda corporativo (Connectia).',
      `Redactás FAQs claras en español rioplatense para "${community}".`,
      'El humano revisará antes de publicar.',
      'Respondé SOLO JSON válido con este esquema:',
      JSON.stringify({
        pregunta: 'pregunta clara que haría un empleado',
        respuesta: 'respuesta accionable, pasos si aplica',
        category: 'categoría corta',
        keywords: ['tag1', 'tag2'],
        orden: 100,
        notas: 'supuestos para el editor',
      }),
    ].join('\n')
    schema = 'faq'
  } else if (kind === 'tutorial') {
    system = [
      'Sos diseñador de tutoriales paso a paso de Connectia.',
      `Armás guías para empleados de "${community}" en español rioplatense.`,
      'Entre 3 y 8 pasos concretos. Sin jerga técnica innecesaria.',
      'Respondé SOLO JSON válido con este esquema:',
      JSON.stringify({
        titulo: 'string',
        descripcion: 'string corta',
        category: 'string',
        moduloRelacionado: 'muro|solicitudes|encuestas|docs|chat|ayuda|otro',
        keywords: ['tag'],
        showOnFirstLogin: false,
        steps: [{ titulo: 'string', cuerpo: 'instrucción' }],
        notas: 'string',
      }),
    ].join('\n')
    schema = 'tutorial'
  } else {
    system = [
      'Sos redactor de políticas corporativas de Connectia.',
      `Redactás políticas versionables para "${community}" en español rioplatense, tono formal pero claro.`,
      'Incluí secciones numeradas (alcance, principios, responsabilidades, incumplimiento).',
      'El humano revisará antes de publicar.',
      'Respondé SOLO JSON válido con este esquema:',
      JSON.stringify({
        codigo: 'COD-01',
        titulo: 'string',
        resumen: '1-2 oraciones',
        cuerpo: 'texto completo con saltos de línea',
        category: 'Ética|Seguridad|RRHH|Operaciones|general',
        keywords: ['tag'],
        requiresAck: true,
        mandatory: false,
        notas: 'string',
      }),
    ].join('\n')
    schema = 'policy'
  }

  const chat = await chatWithFallback({
    system,
    userContent: `Brief del editor:\n${goal}`,
    provider,
    maxTokens: 3200,
  })
  let data
  try {
    data = parseJson(chat.raw)
  } catch {
    const err = new Error('La IA no devolvió un borrador usable')
    err.status = 502
    throw err
  }

  if (schema === 'faq') {
    if (!String(data.pregunta || '').trim() || !String(data.respuesta || '').trim()) {
      const err = new Error('La IA no armó pregunta y respuesta')
      err.status = 502
      throw err
    }
    return {
      draft: {
        pregunta: String(data.pregunta).trim().slice(0, 400),
        respuesta: String(data.respuesta).trim().slice(0, 20000),
        category: String(data.category || 'general').trim().slice(0, 80) || 'general',
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        orden: Number(data.orden) || 100,
        status: 'draft',
        audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
        notas: String(data.notas || '').trim(),
      },
      provider: chat.provider,
      model: chat.model,
      mode: 'ai',
    }
  }

  if (schema === 'tutorial') {
    const steps = Array.isArray(data.steps) ? data.steps : []
    if (!String(data.titulo || '').trim() || !steps.length) {
      const err = new Error('La IA no armó título y pasos')
      err.status = 502
      throw err
    }
    return {
      draft: {
        titulo: String(data.titulo).trim().slice(0, 200),
        descripcion: String(data.descripcion || '').trim().slice(0, 4000),
        category: String(data.category || 'Primeros pasos').trim().slice(0, 80),
        moduloRelacionado: String(data.moduloRelacionado || '').trim().slice(0, 80),
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        orden: 100,
        status: 'draft',
        showOnFirstLogin: Boolean(data.showOnFirstLogin),
        audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
        steps: steps.map((s) => ({
          titulo: String(s.titulo || '').trim().slice(0, 160),
          cuerpo: String(s.cuerpo || '').trim().slice(0, 8000),
        })),
        notas: String(data.notas || '').trim(),
      },
      provider: chat.provider,
      model: chat.model,
      mode: 'ai',
    }
  }

  if (!String(data.titulo || '').trim() || !String(data.cuerpo || '').trim()) {
    const err = new Error('La IA no armó título y cuerpo de política')
    err.status = 502
    throw err
  }
  return {
    draft: {
      codigo: String(data.codigo || '').trim().slice(0, 40),
      titulo: String(data.titulo).trim().slice(0, 200),
      resumen: String(data.resumen || '').trim().slice(0, 1000),
      cuerpo: String(data.cuerpo).trim().slice(0, 100000),
      category: String(data.category || 'general').trim().slice(0, 80),
      keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
      version: '1',
      status: 'draft',
      requiresAck: data.requiresAck !== false,
      mandatory: Boolean(data.mandatory),
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      notas: String(data.notas || '').trim(),
    },
    provider: chat.provider,
    model: chat.model,
    mode: 'ai',
  }
}

/**
 * @param {'faq'|'tutorial'|'policy'} kind
 */
export async function generateHelpDraft({ kind, prompt, tenant = null, provider = 'auto' } = {}) {
  const k = ['faq', 'tutorial', 'policy'].includes(kind) ? kind : 'faq'
  const name = tenant?.nombre || 'la comunidad'

  if (aiConfigured()) {
    try {
      return await generateWithAi({ kind: k, prompt, tenant, provider })
    } catch (e) {
      // Si falla el proveedor, caemos a heurística para no bloquear al editor
      if (e.status === 400) throw e
      console.warn('[helpAi] fallback heurístico:', e.message)
    }
  }

  const draft =
    k === 'tutorial'
      ? heuristicTutorialDraft(prompt, name)
      : k === 'policy'
        ? heuristicPolicyDraft(prompt, name)
        : heuristicFaqDraft(prompt, name)

  return {
    draft,
    provider: 'heuristic',
    model: 'local',
    mode: 'heuristic',
    configured: aiConfigured(),
  }
}

export { aiConfigured }
