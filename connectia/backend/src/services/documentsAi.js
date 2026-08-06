/**
 * Borrador de documento desde archivo (heurística + LLM opcional).
 */
import { inferFileType, fileTypeLabel } from '../lib/docTypes.js'
import { normalizeFolderPath } from '../lib/documentsFolders.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function documentsAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

function titleFromFileName(fileName = '') {
  const base = String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!base) return 'Documento'
  return base
    .split(' ')
    .map((w) => {
      if (/^\d{4,}$/.test(w)) return w
      if (w.length <= 2 && w === w.toUpperCase()) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
    .slice(0, 200)
}

function inferCategoryFromName(fileName = '', hints = []) {
  const n = String(fileName || '').toLowerCase()
  const hintList = (hints || []).map((h) => normalizeFolderPath(h)).filter(Boolean)

  const rules = [
    { re: /recibo|liquidaci[oó]n|sueldo|haberes/, cat: 'RRHH/Recibos' },
    { re: /vacaci|licencia|ausent/, cat: 'RRHH/Licencias' },
    { re: /pol[ií]tica|c[oó]digo.?[eé]tica|conducta/, cat: 'Políticas' },
    { re: /manual|procedimiento|instructivo/, cat: 'Manuales' },
    { re: /seguridad|ehs|higiene/, cat: 'Seguridad' },
    { re: /beneficio|convenio|descuento/, cat: 'Beneficios' },
    { re: /onboarding|inducci[oó]n|bienvenida/, cat: 'Onboarding' },
    { re: /contrato|nda|acuerdo/, cat: 'RRHH/Contratos' },
    { re: /capacitaci[oó]n|curso|taller|training/, cat: 'Capacitaciones' },
    { re: /organigrama|comunicado|aviso/, cat: 'Comunicaciones' },
  ]
  for (const r of rules) {
    if (r.re.test(n)) return r.cat
  }

  for (const h of hintList) {
    const last = h.split('/').pop() || h
    if (last && n.includes(last.toLowerCase())) return h
  }
  return hintList[0] || 'general'
}

function inferRequiresSignature(fileName = '', text = '') {
  const s = `${fileName} ${String(text || '').slice(0, 800)}`.toLowerCase()
  return /firma|firmar|recibo|contrato|pol[ií]tica|c[oó]digo|acuerdo|nda|aceptaci[oó]n|[eé]tica/.test(s)
}

/**
 * Heurística sin LLM (testeable).
 */
export function heuristicDocumentDraft({
  fileName = '',
  fileType = '',
  mimeType = '',
  categoryHint = '',
  textExcerpt = '',
  existingCategories = [],
} = {}) {
  const ft = inferFileType({ mimeType, fileName }) || fileType || 'other'
  const titulo = titleFromFileName(fileName)
  const category =
    normalizeFolderPath(categoryHint) ||
    inferCategoryFromName(fileName, existingCategories) ||
    'general'
  const typeLabel = fileTypeLabel(ft)
  const excerpt = String(textExcerpt || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280)
  let descripcion = `${typeLabel} corporativo: ${titulo}.`
  if (excerpt) {
    descripcion = `${excerpt}${excerpt.length >= 280 ? '…' : ''}`
  } else {
    descripcion = `Documento ${typeLabel.toLowerCase()} «${titulo}». Revisá título, carpeta y audiencia antes de publicar.`
  }

  return {
    titulo,
    descripcion: descripcion.slice(0, 4000),
    category: category.slice(0, 200) || 'general',
    fileType: ft,
    requiresSignature: inferRequiresSignature(fileName, textExcerpt),
    status: 'draft',
    source: 'heuristic',
    notes: 'Borrador automático por nombre de archivo. Revisá antes de publicar.',
  }
}

async function callOpenAi(system, user, { signal } = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal,
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

async function callAnthropic(system, user, { signal } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal,
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

function normalizeAiDraft(data, fallback) {
  const titulo = String(data?.titulo || fallback.titulo || '').trim().slice(0, 200) || fallback.titulo
  const descripcion =
    String(data?.descripcion || fallback.descripcion || '').trim().slice(0, 4000) || fallback.descripcion
  const category =
    normalizeFolderPath(data?.category || fallback.category) || fallback.category || 'general'
  const requiresSignature =
    data?.requiresSignature != null ? Boolean(data.requiresSignature) : fallback.requiresSignature
  return {
    titulo,
    descripcion,
    category: category.slice(0, 200),
    fileType: fallback.fileType,
    requiresSignature,
    status: 'draft',
    source: 'ai',
    notes: String(data?.notes || 'Borrador sugerido por IA. Revisá antes de publicar.').slice(0, 400),
  }
}

/**
 * @param {{
 *   fileName?: string,
 *   fileType?: string,
 *   mimeType?: string,
 *   categoryHint?: string,
 *   textExcerpt?: string,
 *   existingCategories?: string[],
 * }} opts
 */
export async function draftDocumentFromFile(opts = {}) {
  const heuristic = heuristicDocumentDraft(opts)
  const configured = documentsAiConfigured()
  const text = String(opts.textExcerpt || '').trim()
  const fileName = String(opts.fileName || '').trim()
  const timeoutMs = Math.max(3000, Number(opts.timeoutMs) || 12000)

  if (!configured || (!fileName && text.length < 8)) {
    return { ...heuristic, configured }
  }

  const cats = (opts.existingCategories || [])
    .map((c) => normalizeFolderPath(c))
    .filter(Boolean)
    .slice(0, 40)

  const system = `Sos un asistente de intranet que completa metadatos de un documento corporativo.
Respondé SOLO JSON válido con claves:
titulo (corto, claro, sin extensión),
descripcion (1-2 oraciones para el colaborador),
category (carpeta con / si aplica; preferí una de la lista si encaja),
requiresSignature (boolean: true si conviene pedir firma al descargar: políticas, recibos, contratos),
notes (breve aviso al admin).
No inventes datos sensibles. Idioma: español rioplatense.`

  const userMsg = [
    `Archivo: ${fileName || '(sin nombre)'}`,
    `Tipo: ${heuristic.fileType}`,
    `Carpeta actual sugerida: ${opts.categoryHint || '(ninguna)'}`,
    cats.length ? `Carpetas existentes: ${cats.join(' | ')}` : 'Sin carpetas previas.',
    text ? `Extracto del contenido:\n${text.slice(0, 6000)}` : 'Sin extracto de contenido.',
  ].join('\n')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    let raw
    if (openaiKey()) {
      try {
        raw = await callOpenAi(system, userMsg, { signal: ac.signal })
      } catch (e) {
        if (!anthropicKey() || e?.name === 'AbortError') throw e
        raw = await callAnthropic(system, userMsg, { signal: ac.signal })
      }
    } else {
      raw = await callAnthropic(system, userMsg, { signal: ac.signal })
    }
    const parsed = parseJson(raw)
    return { ...normalizeAiDraft(parsed, heuristic), configured: true }
  } catch (e) {
    const aborted = e?.name === 'AbortError'
    return {
      ...heuristic,
      configured: true,
      notes: `${heuristic.notes} (IA ${aborted ? 'timeout' : 'falló'}: ${e.message || 'error'}; se usó heurística).`,
      source: 'heuristic',
    }
  } finally {
    clearTimeout(timer)
  }
}
