/**
 * Generación de borradores de publicaciones con OpenAI y/o Anthropic.
 * provider: auto|openai|anthropic (request o AI_PROVIDER env)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { holidayContextBlock, holidayFromPrompt } from './arHolidays.js'
import { enrichSourcesWithArticles } from './webArticleFetch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'

const TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general']
const LAYOUTS = ['vertical', 'horizontal', 'banner']

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function aiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

/** @deprecated usar aiConfigured */
export function openaiConfigured() {
  return aiConfigured()
}

function preferredProviders(requestProvider) {
  const pref = String(requestProvider || process.env.AI_PROVIDER || 'auto').toLowerCase()
  if (pref === 'anthropic') return ['anthropic']
  if (pref === 'openai') return ['openai']
  return ['openai', 'anthropic']
}

function systemPrompt(tenant) {
  const nombre = tenant?.nombre || 'la comunidad'
  const primary = tenant?.branding?.primary || '#8554C9'
  return [
    'Sos el asistente de contenido corporativo de Connectia.',
    `Redactás publicaciones para el muro de "${nombre}" (app móvil estilo Instagram).`,
    'Si el mensaje incluye un bloque [Contexto calendario Argentina], USÁ esas fechas y nombres de feriado; no inventes otro.',
    'Si el editor dice que ese día se trabaja (aunque sea feriado), transmitilo con empatía y claridad: la comunidad SÍ trabaja.',
    'Nunca inventes montos ni nombres de beneficios que el usuario no haya dado.',
    'Respondé SOLO JSON válido (sin markdown) con este esquema:',
    JSON.stringify({
      titulo: 'string corto',
      cuerpo: 'string (puede tener saltos de línea)',
      tipo: TIPOS.join('|'),
      layout: LAYOUTS.join('|'),
      imagePrompt: 'descripción en inglés para generar imagen (sin texto en la imagen)',
      notas: 'opcional: advertencias al editor',
    }),
    `Tipos: noticia=novedad; aviso=urgente/importante; beneficio=perk/descuento; evento=fecha/convocatoria; general=otros.`,
    `Layouts: vertical=imagen arriba; horizontal=media al costado; banner=franja ancha con overlay.`,
    `Color de marca de referencia: ${primary}. Tono profesional, claro y cercano en español rioplatense.`,
  ].join('\n')
}

function parseJsonContent(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  const data = JSON.parse(text)
  const tipo = TIPOS.includes(data.tipo) ? data.tipo : 'noticia'
  const layout = LAYOUTS.includes(data.layout) ? data.layout : 'vertical'
  return {
    titulo: String(data.titulo || '').trim().slice(0, 120),
    cuerpo: String(data.cuerpo || '').trim(),
    tipo,
    layout,
    imagePrompt: String(data.imagePrompt || data.titulo || 'corporate community announcement').trim(),
    notas: String(data.notas || '').trim(),
  }
}

function buildUserContent(prompt, current) {
  let userContent = prompt + holidayContextBlock(prompt)
  if (current && (current.titulo || current.cuerpo)) {
    userContent +=
      '\n\nBorrador actual del formulario (corregí / mejorá en base a esto, manteniendo hechos):\n' +
      JSON.stringify({
        titulo: current.titulo || '',
        cuerpo: current.cuerpo || '',
        tipo: current.tipo || '',
        layout: current.layout || '',
        imageUrl: current.imageUrl ? '(ya hay imagen; sugerí imagePrompt solo si conviene regenerar)' : '',
      })
  }
  return userContent
}

async function chatOpenAI({ system, history, userContent, maxTokens = 1800 }) {
  const key = openaiKey()
  if (!key) {
    const err = new Error('OPENAI_API_KEY no configurada')
    err.status = 503
    throw err
  }
  const messages = [{ role: 'system', content: system }]
  for (const m of history.slice(-12)) {
    if (!m?.role || !m?.content) continue
    if (m.role !== 'user' && m.role !== 'assistant') continue
    messages.push({ role: m.role, content: String(m.content).slice(0, 8000) })
  }
  messages.push({ role: 'user', content: userContent })

  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.message || `OpenAI error ${res.status}`)
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502
    err.provider = 'openai'
    throw err
  }
  return {
    raw: data?.choices?.[0]?.message?.content || '{}',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    provider: 'openai',
  }
}

async function chatAnthropic({ system, history, userContent, maxTokens = 1800 }) {
  const key = anthropicKey()
  if (!key) {
    const err = new Error('ANTHROPIC_API_KEY no configurada')
    err.status = 503
    throw err
  }

  const messages = []
  for (const m of history.slice(-12)) {
    if (!m?.role || !m?.content) continue
    if (m.role !== 'user' && m.role !== 'assistant') continue
    messages.push({ role: m.role, content: String(m.content).slice(0, 8000) })
  }
  messages.push({ role: 'user', content: userContent })

  if (messages[0]?.role === 'assistant') {
    messages.unshift({ role: 'user', content: '(contexto previo)' })
  }

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
      temperature: 0.7,
      system,
      messages,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Anthropic error ${res.status}`)
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502
    err.provider = 'anthropic'
    throw err
  }
  const raw = (data?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  return { raw: raw || '{}', model, provider: 'anthropic' }
}

async function chatWithFallback({ system, history, userContent, provider, maxTokens }) {
  const providers = preferredProviders(provider)
  const errors = []
  for (const p of providers) {
    if (p === 'openai' && !openaiKey()) {
      errors.push('openai: sin API key')
      continue
    }
    if (p === 'anthropic' && !anthropicKey()) {
      errors.push('anthropic: sin API key')
      continue
    }
    try {
      if (p === 'openai') return await chatOpenAI({ system, history, userContent, maxTokens })
      return await chatAnthropic({ system, history, userContent, maxTokens })
    } catch (e) {
      errors.push(`${p}: ${e.message}`)
      console.warn(`[ai-posts] falló ${p}:`, e.message)
    }
  }
  const err = new Error(
    errors.length
      ? `Ningún proveedor IA respondió. ${errors.join(' | ')}`
      : 'No hay OPENAI_API_KEY ni ANTHROPIC_API_KEY configuradas',
  )
  err.status = 503
  throw err
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/** Persiste b64/data-URL y devuelve path público /uploads/... */
function persistImageDataUrl(dataUrlOrB64) {
  ensureUploadDir()
  let b64 = dataUrlOrB64
  let ext = 'png'
  const m = String(dataUrlOrB64).match(/^data:image\/(\w+);base64,(.+)$/i)
  if (m) {
    ext = m[1] === 'jpeg' ? 'jpg' : m[1]
    b64 = m[2]
  }
  const name = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = path.join(UPLOAD_DIR, name)
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'))
  // Relativa: la app/admin la sirven vía proxy /uploads → API (funciona en LAN/móvil)
  return `/uploads/${name}`
}

/** gpt-image-1 (esta cuenta no tiene dall-e-3). Guarda en /uploads. */
async function generateImageUrl(imagePrompt) {
  const key = openaiKey()
  if (!key) {
    return { url: '', warning: 'Sin OPENAI_API_KEY: no se puede generar imagen' }
  }
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
  try {
    const body = {
      model,
      prompt: `${imagePrompt}. Professional corporate photo, no text overlays, clean modern style.`,
      n: 1,
    }
    if (String(model).startsWith('dall-e')) {
      body.size = '1024x1024'
      body.quality = 'standard'
    }

    const res = await fetch(OPENAI_IMAGES, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error?.message || `imagen error ${res.status}`
      console.warn('[ai-posts] imagen:', msg)
      return { url: '', warning: msg }
    }
    const item = data?.data?.[0]
    if (item?.url) return { url: item.url, warning: '' }
    if (item?.b64_json) {
      try {
        const url = persistImageDataUrl(item.b64_json)
        return { url, warning: '' }
      } catch (e) {
        return { url: '', warning: `No se pudo guardar imagen: ${e.message}` }
      }
    }
    return { url: '', warning: 'La API no devolvió imagen' }
  } catch (e) {
    console.warn('[ai-posts] imagen no generada:', e.message)
    return { url: '', warning: e.message }
  }
}

export async function generatePostDraft({
  prompt,
  history = [],
  current = null,
  generateImage = true,
  generateCarousel = false,
  tenant = null,
  provider = 'auto',
} = {}) {
  const userGoal = String(prompt || '').trim()
  if (!userGoal) {
    const err = new Error('Escribí un prompt / objetivo para la publicación')
    err.status = 400
    throw err
  }

  const system = systemPrompt(tenant)
  const userContent = buildUserContent(userGoal, current)
  const chat = await chatWithFallback({ system, history, userContent, provider })
  const draft = parseJsonContent(chat.raw)
  if (!draft.titulo) {
    const err = new Error('La IA no devolvió un título usable')
    err.status = 502
    throw err
  }

  let imageUrl = ''
  let imageUrls = []
  let imageWarning = ''
  const wantCarousel = Boolean(generateCarousel)
  const wantImage = Boolean(generateImage) || wantCarousel

  if (wantImage) {
    if (wantCarousel) {
      const base = draft.imagePrompt || draft.titulo || 'corporate community announcement'
      const prompts = [
        base,
        `${base}. Alternate camera angle, different framing.`,
        `${base}. Closer detail shot, same scene and mood.`,
      ]
      const results = await Promise.all(prompts.map((p) => generateImageUrl(p)))
      imageUrls = results.map((r) => r.url).filter(Boolean)
      imageUrl = imageUrls[0] || ''
      const warnings = results.map((r) => r.warning).filter(Boolean)
      if (warnings.length) imageWarning = warnings.join(' · ')
      if (imageUrls.length < 2) {
        imageWarning = [imageWarning, 'Carrusel incompleto: se generaron menos de 2 imágenes']
          .filter(Boolean)
          .join(' · ')
        imageUrls = []
      }
    } else {
      const img = await generateImageUrl(draft.imagePrompt)
      imageUrl = img.url
      imageWarning = img.warning || ''
      if (!imageUrl && !imageWarning) imageWarning = 'No se generó imagen'
    }
  }

  const holiday = holidayFromPrompt(userGoal)
  const holidayNote = holiday
    ? `Calendario AR: próximo feriado = ${holiday.name} · ${holiday.label}`
    : ''
  const carouselNote = imageUrls.length >= 2 ? `Carrusel: ${imageUrls.length} imágenes` : ''
  const notas = [draft.notas, holidayNote, carouselNote, imageWarning ? `Imagen: ${imageWarning}` : '']
    .filter(Boolean)
    .join('\n')

  return {
    draft: {
      titulo: draft.titulo,
      cuerpo: draft.cuerpo,
      tipo: draft.tipo,
      layout: draft.layout,
      imageUrl,
      imageUrls,
      imagePrompt: draft.imagePrompt,
      notas,
      status: 'draft',
      pinned: false,
      priority: 0,
    },
    model: chat.model,
    provider: chat.provider,
    assistantMessage: chat.raw,
    imageWarning,
    holiday,
  }
}

export async function composePostFromWebSources({
  query,
  sources = [],
  notes = '',
  generateImage = true,
  tenant = null,
  provider = 'auto',
} = {}) {
  const q = String(query || '').trim()
  const rawList = (Array.isArray(sources) ? sources : [])
    .filter((s) => s && (s.title || s.url || s.snippet))
    .slice(0, 3)

  if (!rawList.length) {
    const err = new Error('Elegí al menos una fuente (máximo 3)')
    err.status = 400
    throw err
  }

  // Baja el artículo real (no solo el snippet de búsqueda) + og:image
  const list = await enrichSourcesWithArticles(rawList)
  const fetchedOk = list.filter((s) => s.articleOk).length

  const system = [
    systemPrompt(tenant),
    'Contexto especial — NOTICIA DESDE LA WEB:',
    'El editor eligió hasta 3 artículos. Abajo tenés el TEXTO COMPLETO (o el máximo extraído) de cada uno.',
    'Tu trabajo es redactar UNA NOTA LARGA Y COMPLETA para el muro de la comunidad, no un resumen de 2 líneas.',
    'Requisitos de "cuerpo":',
    '- Entre 450 y 900 palabras (aprox. 4 a 8 párrafos con saltos de línea).',
    '- Lead fuerte (qué pasó / por qué importa), desarrollo con datos de TODAS las fuentes, cierre útil para miembros (tips, llamado a la acción suave o qué implica para la comunidad).',
    '- Integrá hechos, cifras, beneficios, matices y matices discrepantes si aparecen; no copies pegado ni inventes.',
    '- Español rioplatense, tono cercano de comunidad interna, sin clickbait.',
    '- Si una fuente no se pudo leer completo, usá lo disponible sin inventar el resto.',
    'En "titulo": atractivo, claro, máx ~90 caracteres.',
    'En "tipo": preferí "noticia" salvo que sea claramente aviso/beneficio/evento.',
    'En "layout": "vertical" si hay imagen buena; si no, "banner".',
    'En "imagePrompt": descripción en inglés útil por si hace falta generar imagen (sin texto en la foto).',
    'En "notas": URLs usadas + si alguna fuente falló al leerse.',
  ].join('\n')

  const userContent = [
    `Tema buscado: ${q || '(sin tema)'}`,
    notes ? `Indicaciones del editor (prioridad): ${notes}` : '',
    `Fuentes con artículo leído: ${fetchedOk}/${list.length}`,
    '',
    '=== FUENTES (texto para sintetizar) ===',
    ...list.map((s, i) => {
      const body = (s.contentForAi || s.snippet || '(sin texto)').slice(0, 10000)
      return [
        `--- Fuente ${i + 1} ---`,
        `Título: ${s.title || 'Sin título'}`,
        `URL: ${s.url || '—'}`,
        `Origen: ${s.source || '—'}`,
        s.imageUrl ? `Imagen de la nota: ${s.imageUrl}` : 'Imagen de la nota: (ninguna)',
        s.articleOk ? 'Lectura: OK (artículo extraído)' : `Lectura: parcial/falló (${s.articleError || 'solo snippet'})`,
        'Contenido:',
        body,
      ].join('\n')
    }),
  ]
    .filter(Boolean)
    .join('\n\n')

  const chat = await chatWithFallback({
    system,
    history: [],
    userContent,
    provider,
    maxTokens: 4000,
  })
  const draft = parseJsonContent(chat.raw)
  if (!draft.titulo) {
    const err = new Error('La IA no devolvió un título usable')
    err.status = 502
    throw err
  }

  let imageUrl = ''
  let imageWarning = ''
  const fromSource = list.find((s) => s.imageUrl)?.imageUrl || ''
  if (fromSource) {
    imageUrl = fromSource
  } else {
    const directMedia = list.find((s) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s.url || ''))
    if (directMedia?.url) imageUrl = directMedia.url
  }

  if (!imageUrl && generateImage) {
    const img = await generateImageUrl(draft.imagePrompt)
    imageUrl = img.url
    imageWarning = img.warning || ''
  } else if (!imageUrl) {
    imageWarning = 'Ninguna fuente trajo imagen; podés generar una en el editor o pegar una URL'
  }

  const urls = list.map((s) => s.url).filter(Boolean)
  const readNotes = list
    .filter((s) => !s.articleOk)
    .map((s) => `- ${s.url}: ${s.articleError || 'solo snippet'}`)
  const notasExtra = [
    draft.notas,
    urls.length ? `Fuentes:\n${urls.map((u) => `- ${u}`).join('\n')}` : '',
    readNotes.length ? `Lectura incompleta:\n${readNotes.join('\n')}` : '',
    imageUrl && fromSource ? `Imagen tomada de fuente: ${fromSource}` : '',
    imageWarning ? `Imagen: ${imageWarning}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    draft: {
      titulo: draft.titulo,
      cuerpo: draft.cuerpo,
      tipo: draft.tipo,
      layout: draft.layout || (imageUrl ? 'vertical' : 'banner'),
      imageUrl,
      imagePrompt: draft.imagePrompt,
      notas: notasExtra,
      status: 'draft',
      pinned: false,
      priority: 0,
      sources: list.map(({ title, url, snippet, source, imageUrl: img }) => ({
        title,
        url,
        snippet,
        source,
        imageUrl: img || '',
      })),
    },
    model: chat.model,
    provider: chat.provider,
    assistantMessage: chat.raw,
    imageWarning,
    articlesFetched: fetchedOk,
  }
}
