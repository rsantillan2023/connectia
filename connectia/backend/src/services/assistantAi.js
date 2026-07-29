/**
 * Respuestas del asistente con LLM opcional + fallback heurístico.
 */
const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function assistantAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)
  return JSON.parse(text)
}

async function callOpenAi(system, user, { temperature = 0.3, maxTokens = 900 } = {}) {
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CHATBOT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropic(system, user, { temperature = 0.3, maxTokens = 900 } = {}) {
  const res = await fetch(ANTHROPIC_MESSAGES, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CHATBOT_ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  const block = (data.content || []).find((c) => c.type === 'text')
  return block?.text || ''
}

async function chatWithFallback(system, user) {
  const order = String(process.env.AI_PROVIDER || 'auto').toLowerCase()
  const tryOpen = async () => {
    if (!openaiKey()) throw new Error('no openai')
    return callOpenAi(system, user)
  }
  const tryAnth = async () => {
    if (!anthropicKey()) throw new Error('no anthropic')
    return callAnthropic(system, user)
  }
  if (order === 'anthropic') {
    try {
      return await tryAnth()
    } catch {
      return tryOpen()
    }
  }
  try {
    return await tryOpen()
  } catch {
    return tryAnth()
  }
}

const SYSTEM = `Sos el Asistente de Connectia, la app de la comunidad del colaborador.
Respondé en español rioplatense, claro y breve (máx. 180 palabras salvo listados).
Usá SOLO los datos del contexto JSON (solicitudes, documentos, KB, módulos). No inventes saldos, montos ni documentos.
Si el contexto trae "baseAnswer", mejorala o reformulá sin contradecir hechos.
Si no hay datos, sugerí abrir consulta o ir al módulo.
Devolvé JSON: { "text": string, "suggestedLinks": [{"label":string,"href":string}] }`

/**
 * @param {{ userText: string, intent: string, baseAnswer: string, context: object }}
 */
export async function polishAssistantAnswer({ userText, intent, baseAnswer, context }) {
  if (!assistantAiConfigured()) {
    return { text: baseAnswer, suggestedLinks: [], usedAi: false }
  }
  try {
    const raw = await chatWithFallback(
      SYSTEM,
      JSON.stringify({
        userText,
        intent,
        baseAnswer,
        context: {
          requests: context.requests?.slice?.(0, 8) || context.requests,
          documents: context.documents?.slice?.(0, 8) || context.documents,
          kb: (context.kb || []).map((a) => ({ titulo: a.titulo, excerpt: a.excerpt })),
          posts: context.posts?.slice?.(0, 4),
          modules: context.modules,
          notes: context.notes,
        },
      }),
    )
    const parsed = parseJson(raw)
    const text = String(parsed.text || '').trim()
    if (!text) return { text: baseAnswer, suggestedLinks: [], usedAi: false }
    const suggestedLinks = Array.isArray(parsed.suggestedLinks)
      ? parsed.suggestedLinks
          .filter((l) => l && l.href && l.label)
          .map((l) => ({ label: String(l.label).slice(0, 80), href: String(l.href).slice(0, 200) }))
          .slice(0, 6)
      : []
    return { text, suggestedLinks, usedAi: true }
  } catch {
    return { text: baseAnswer, suggestedLinks: [], usedAi: false }
  }
}
