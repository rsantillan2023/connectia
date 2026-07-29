/**
 * Análisis marketing de engagement de publicaciones del muro (reacciones + guardados + contenido).
 */
import { aiConfigured } from './openaiPosts.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const MAX_POSTS = 12

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

async function chatOpenAI(system, userContent, maxTokens = 2800) {
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
      temperature: 0.35,
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

async function chatAnthropic(system, userContent, maxTokens = 2800) {
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

function emptyAnalysis(rawFallback = '') {
  return {
    resumenEjecutivo: rawFallback?.slice?.(0, 1200) || 'No se pudo parsear el análisis',
    scoreGeneral: null,
    lecturaMarketing: '',
    mixEmocional: {
      dominante: '',
      interpretacion: '',
    },
    porPublicacion: [],
    patrones: [],
    fortalezas: [],
    oportunidades: [],
    recomendaciones: [],
    proximosContenidos: [],
    confianza: 'baja',
    limitaciones: 'Respuesta de IA no estructurada',
  }
}

/**
 * @param {object} opts
 * @param {Array<object>} opts.posts - posts con métricas ya resueltas
 * @param {object|null} opts.tenant
 * @param {string} [opts.provider]
 * @param {string} [opts.focus]
 */
export async function analyzeEngagementWithAi({
  posts,
  tenant = null,
  provider = 'auto',
  focus = '',
} = {}) {
  if (!aiConfigured()) {
    const err = new Error('Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para analizar con IA')
    err.status = 503
    throw err
  }
  if (!Array.isArray(posts) || !posts.length) {
    const err = new Error('Elegí al menos una publicación para analizar')
    err.status = 400
    throw err
  }
  if (posts.length > MAX_POSTS) {
    const err = new Error(`Podés analizar hasta ${MAX_POSTS} publicaciones por vez`)
    err.status = 400
    throw err
  }

  const community = tenant?.nombre || 'la comunidad'
  const payload = {
    comunidad: community,
    metricasExplicacion: {
      like: 'Me gusta (pulgar) — aprobación / acuerdo',
      love: 'Me encanta (corazón) — afinidad emocional fuerte',
      clap: 'Aplausos — reconocimiento / celebración',
      saves: 'Guardados — intención de volver a ver; señal fuerte de valor',
      loveSignal: 'me encanta + guardados (afinidad)',
      engagement: 'suma de reacciones + guardados',
    },
    publicaciones: posts.map((p, i) => ({
      orden: i + 1,
      id: p.id,
      titulo: p.titulo || '',
      tipo: p.tipo || '',
      autor: p.authorName || '',
      origen: p.origin || '',
      fijada: Boolean(p.pinned),
      publicado: p.publishedAt || null,
      cuerpo: String(p.cuerpo || '').slice(0, 1800),
      tieneMedia: Boolean(p.hasMedia),
      reacciones: {
        like: p.reactions?.like || 0,
        love: p.reactions?.love || 0,
        clap: p.reactions?.clap || 0,
      },
      guardados: p.saves || 0,
      engagement: p.engagement || 0,
      afinidad: p.loveSignal || 0,
      mix:
        (p.reactions?.like || 0) + (p.reactions?.love || 0) + (p.reactions?.clap || 0) > 0
          ? {
              likePct: Math.round(
                ((p.reactions?.like || 0) /
                  ((p.reactions?.like || 0) + (p.reactions?.love || 0) + (p.reactions?.clap || 0))) *
                  100,
              ),
              lovePct: Math.round(
                ((p.reactions?.love || 0) /
                  ((p.reactions?.like || 0) + (p.reactions?.love || 0) + (p.reactions?.clap || 0))) *
                  100,
              ),
              clapPct: Math.round(
                ((p.reactions?.clap || 0) /
                  ((p.reactions?.like || 0) + (p.reactions?.love || 0) + (p.reactions?.clap || 0))) *
                  100,
              ),
            }
          : null,
    })),
  }

  const system = [
    'Sos consultor/a de marketing interno y engagement de contenido corporativo en Connectia.',
    `Analizás el muro de "${community}" en español rioplatense, claro, accionable y sin inventar métricas.`,
    'Las métricas vienen de reacciones reales (like/love/clap) y guardados.',
    'Interpretá marketingamente: qué tipo de contenido engancha, tono emocional, ganchos, gaps y próximos pasos.',
    'Si hay pocas interacciones, dilo y bajá la confianza; no inventes números.',
    'Compará entre publicaciones cuando haya más de una.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      resumenEjecutivo: '3-5 oraciones con lectura marketing del set',
      scoreGeneral: 0,
      lecturaMarketing: 'párrafo corto: qué comunica el engagement al negocio',
      mixEmocional: {
        dominante: 'like|love|clap|saves|mixto|bajo',
        interpretacion: 'qué implica para la marca interna',
      },
      porPublicacion: [
        {
          id: 'postId',
          titulo: 'string',
          score: 0,
          veredicto: 'alto|medio|bajo|sin_datos',
          porQueFunciona: 'string',
          queMejorar: 'string',
        },
      ],
      patrones: ['patrón de contenido / tono / formato'],
      fortalezas: ['qué está funcionando'],
      oportunidades: ['gap o tema poco explotado'],
      recomendaciones: ['acción concreta de contenido / timing / formato'],
      proximosContenidos: ['idea de próxima publicación inspirada en lo que rindió'],
      confianza: 'alta|media|baja',
      limitaciones: 'string',
    }),
    'scoreGeneral y score por publicación: 0-100 (engagement relativo al set y a la calidad del mix emocional).',
  ].join('\n')

  const userContent = [
    focus?.trim()
      ? `Enfoque pedido por el editor: ${focus.trim().slice(0, 500)}`
      : 'Enfoque: análisis marketing general del engagement de las publicaciones elegidas.',
    'Datos (JSON):',
    JSON.stringify(payload),
  ].join('\n\n')

  const chat = await chatWithFallback({ system, userContent, provider, maxTokens: 3200 })
  let analysis
  try {
    analysis = parseJson(chat.raw)
  } catch {
    analysis = emptyAnalysis(chat.raw)
  }

  if (typeof analysis.scoreGeneral === 'number') {
    analysis.scoreGeneral = Math.max(0, Math.min(100, Math.round(analysis.scoreGeneral)))
  }

  return {
    analysis,
    provider: chat.provider,
    model: chat.model,
    basedOn: {
      postCount: posts.length,
      totalEngagement: posts.reduce((s, p) => s + (p.engagement || 0), 0),
      totalSaves: posts.reduce((s, p) => s + (p.saves || 0), 0),
      maxPosts: MAX_POSTS,
    },
  }
}

export { aiConfigured, MAX_POSTS as ENGAGEMENT_AI_MAX_POSTS }
