/**
 * Insights de lectura de una campaña de notificación (admin).
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

async function chatOpenAI(system, userContent, maxTokens = 1800) {
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

async function chatAnthropic(system, userContent, maxTokens = 1800) {
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
    lecturaDeAdopcion: '',
    segmentosFrios: [],
    recomendaciones: [],
    confianza: 'baja',
    limitaciones: 'Respuesta de IA no estructurada',
  }
}

/**
 * @param {object} opts
 * @param {object} opts.campaign
 * @param {object} opts.summary - computeReadSummary result
 * @param {object|null} opts.tenant
 * @param {string} [opts.provider]
 */
export async function analyzeCampaignReadsWithAi({
  campaign,
  summary,
  tenant = null,
  provider = 'auto',
} = {}) {
  if (!aiConfigured()) {
    const err = new Error('Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para analizar con IA')
    err.status = 503
    throw err
  }
  if (!campaign?.title && !campaign?.name) {
    const err = new Error('Campaña inválida')
    err.status = 400
    throw err
  }

  const community = tenant?.nombre || 'la comunidad'
  const payload = {
    comunidad: community,
    campana: {
      nombre: campaign.name || '',
      titulo: campaign.title || '',
      cuerpo: String(campaign.body || '').slice(0, 400),
      href: campaign.href || '/',
      enviada: campaign.sentAt || null,
      canales: campaign.channels || {},
      segmento: campaign.segment || 'audience',
    },
    metricas: {
      destinatariosTarget: summary?.targeted || 0,
      inAppCreadas: summary?.inAppTotal || 0,
      leidas: summary?.readCount || 0,
      noLeidas: summary?.unreadCount || 0,
      tasaLecturaPct: summary?.readRate || 0,
      pushOk: summary?.pushSent || 0,
      pushFallos: summary?.pushFailed || 0,
      porArea: (summary?.byArea || []).slice(0, 12).map((a) => ({
        area: a.nombre || a.areaId || 'Sin área',
        total: a.total || 0,
        leidas: a.read || 0,
        tasaPct: a.total ? Math.round(((a.read || 0) / a.total) * 1000) / 10 : 0,
      })),
    },
  }

  const system = [
    'Sos analista de comunicaciones internas en Connectia.',
    `Analizás el rendimiento de una notificación enviada a "${community}" en español rioplatense.`,
    'Usá SOLO las métricas del JSON. No inventes números ni nombres de personas.',
    'Enfocá: adopción/lectura, áreas frías, claridad del mensaje/CTA, y próximos pasos accionables.',
    'Si hay pocos datos, bajá la confianza y explicá limitaciones.',
    'Respondé SOLO JSON válido con este esquema:',
    JSON.stringify({
      resumenEjecutivo: '3-5 oraciones',
      lecturaDeAdopcion: 'cómo interpretar la tasa de lectura',
      segmentosFrios: ['áreas o segmentos con baja lectura'],
      recomendaciones: ['acciones concretas'],
      confianza: 'alta|media|baja',
      limitaciones: 'qué falta para un análisis más sólido',
    }),
  ].join(' ')

  const { raw, model, provider: used } = await chatWithFallback({
    system,
    userContent: JSON.stringify(payload),
    provider,
    maxTokens: 1800,
  })

  let analysis
  try {
    analysis = parseJson(raw)
  } catch {
    analysis = emptyAnalysis(raw)
  }

  return {
    analysis: {
      resumenEjecutivo: String(analysis.resumenEjecutivo || '').slice(0, 2000),
      lecturaDeAdopcion: String(analysis.lecturaDeAdopcion || '').slice(0, 1200),
      segmentosFrios: Array.isArray(analysis.segmentosFrios)
        ? analysis.segmentosFrios.map((s) => String(s).slice(0, 200)).slice(0, 8)
        : [],
      recomendaciones: Array.isArray(analysis.recomendaciones)
        ? analysis.recomendaciones.map((s) => String(s).slice(0, 300)).slice(0, 8)
        : [],
      confianza: ['alta', 'media', 'baja'].includes(analysis.confianza) ? analysis.confianza : 'media',
      limitaciones: String(analysis.limitaciones || '').slice(0, 800),
    },
    provider: used,
    model,
    basedOn: {
      inAppTotal: summary?.inAppTotal || 0,
      readCount: summary?.readCount || 0,
      readRate: summary?.readRate || 0,
      areas: (summary?.byArea || []).length,
    },
  }
}

export { aiConfigured as campaignInsightsAiConfigured }
