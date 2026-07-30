import { aiConfigured } from './openaiPosts.js'

/**
 * Genera plantilla subject/body con IA (28.COM.03).
 * Patrón Connectia: fetch a OpenAI/Anthropic (sin SDK).
 */

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

async function chatJson({ system, userContent }) {
  if (openaiKey()) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        temperature: 0.65,
        response_format: { type: 'json_object' },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`)
    }
    return data?.choices?.[0]?.message?.content || '{}'
  }

  if (anthropicKey()) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`)
    }
    const text = data?.content?.find((c) => c.type === 'text')?.text || '{}'
    const match = text.match(/\{[\s\S]*\}/)
    return match ? match[0] : text
  }

  throw new Error('IA no configurada (OPENAI_API_KEY / ANTHROPIC_API_KEY)')
}

/**
 * @param {string} prompt
 * @param {{ tipoComunicacion?: string, canal?: string, brandName?: string }} options
 */
export async function generateCommunicationTemplateFromPrompt(prompt, options = {}) {
  const text = String(prompt || '').trim()
  if (text.length < 8) {
    throw new Error('Describí la plantilla con al menos unas palabras')
  }

  const system = `Sos un experto en redacción de comunicaciones internas de comunidades laborales (Connectia).
REGLAS:
1. Devolvé ÚNICAMENTE un JSON válido con exactamente: "subject" y "body".
2. Usá placeholders con doble llave: {{nombre}}, {{apellido}}, {{nombreCompleto}}, {{nombreEmpresa}}, {{cargo}}, {{fecha}}, {{email}}.
3. subject corto (< 80 caracteres). Para SMS/WhatsApp puede ser vacío o muy breve.
4. body en español, tono profesional y cercano; saltos de línea con \\n.
5. No inventes datos de personas; usá solo placeholders.
6. Nada de texto fuera del JSON.`

  let userContent = `Generá una plantilla con esta descripción:\n\n${text}`
  if (options.tipoComunicacion) userContent += `\n\nTipo: ${options.tipoComunicacion}`
  if (options.canal) userContent += `\nCanal: ${options.canal}`
  if (options.brandName) userContent += `\nMarca/comunidad: ${options.brandName}`
  userContent += `\n\nRespondé solo: { "subject": "...", "body": "..." }`

  const raw = await chatJson({ system, userContent })
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/)
    if (!m) throw new Error('No se pudo procesar la respuesta de la IA')
    data = JSON.parse(m[0])
  }

  return {
    subject: String(data.subject || '').slice(0, 200),
    body: String(data.body || '').slice(0, 8000),
  }
}

export { aiConfigured as communicationAiConfigured }
