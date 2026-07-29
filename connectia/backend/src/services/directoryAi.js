/**
 * IA para Datos útiles / directorio: busca en la web y arma fichas accionables.
 * Puede auto-crear entradas en el tenant.
 */
import { aiConfigured } from './openaiPosts.js'
import { searchWebNews, webSearchProvidersConfigured } from './webNewsSearch.js'
import { fetchArticleContent } from './webArticleFetch.js'
import { DirectoryEntry } from '../models/DirectoryEntry.js'
import {
  applyDirectoryPatch,
  serializeDirectoryEntry,
  DIRECTORY_TIPOS,
} from '../lib/directory.js'
import { DIRECTORY_STOCK_IMAGES } from '../lib/directorySeed.js'

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function directoryAiConfigured() {
  return aiConfigured() || webSearchProvidersConfigured()
}

function parseJson(raw) {
  let text = String(raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(text)
}

async function callOpenAi(system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

async function callAnthropic(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 2200,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

async function chatRaw(system, user) {
  if (!aiConfigured()) {
    const err = new Error('IA no configurada (OPENAI_API_KEY o ANTHROPIC_API_KEY)')
    err.status = 503
    throw err
  }
  if (openaiKey()) {
    try {
      return await callOpenAi(system, user)
    } catch (e) {
      if (!anthropicKey()) throw e
      return callAnthropic(system, user)
    }
  }
  return callAnthropic(system, user)
}

function emptyDraft() {
  return {
    tipo: 'servicio',
    nombre: '',
    categoria: 'General',
    descripcion: '',
    telefono: '',
    interno: '',
    whatsapp: '',
    email: '',
    direccion: '',
    ciudad: '',
    lat: null,
    lng: null,
    horario: '',
    orden: 100,
    destacado: false,
    sourceUrl: '',
    imageUrl: '',
  }
}

function normalizeDrafts(rawList) {
  const list = Array.isArray(rawList) ? rawList : []
  return list
    .map((d) => {
      const base = emptyDraft()
      const tipo = DIRECTORY_TIPOS.includes(d?.tipo) ? d.tipo : 'servicio'
      const nombre = String(d?.nombre || '').trim().slice(0, 160)
      if (!nombre) return null
      return {
        ...base,
        ...d,
        tipo,
        nombre,
        categoria: String(d?.categoria || 'General').trim().slice(0, 80) || 'General',
        descripcion: String(d?.descripcion || '').trim().slice(0, 800),
        telefono: String(d?.telefono || '').trim().slice(0, 40),
        interno: String(d?.interno || '').trim().slice(0, 20),
        whatsapp: String(d?.whatsapp || '').trim().slice(0, 40),
        email: String(d?.email || '').trim().toLowerCase().slice(0, 200),
        direccion: String(d?.direccion || '').trim().slice(0, 240),
        ciudad: String(d?.ciudad || '').trim().slice(0, 120),
        lat: typeof d?.lat === 'number' && Number.isFinite(d.lat) ? d.lat : null,
        lng: typeof d?.lng === 'number' && Number.isFinite(d.lng) ? d.lng : null,
        horario: String(d?.horario || '').trim().slice(0, 200),
        orden: Number(d?.orden) || 100,
        destacado: Boolean(d?.destacado),
        sourceUrl: String(d?.sourceUrl || '').trim().slice(0, 400),
        imageUrl:
          String(d?.imageUrl || '').trim().slice(0, 500) ||
          DIRECTORY_STOCK_IMAGES[tipo] ||
          '',
      }
    })
    .filter(Boolean)
    .filter(
      (d) =>
        d.telefono ||
        d.interno ||
        d.email ||
        d.direccion ||
        d.descripcion ||
        (d.lat != null && d.lng != null),
    )
    .slice(0, 12)
}

/** Heurística si no hay LLM: arma 1–2 borradores desde snippets. */
export function heuristicDirectoryFromSearch(prompt, searchItems = [], companyName = '') {
  const drafts = []
  const brand = String(companyName || '').trim()
  const q = String(prompt || '').trim()

  const phoneHit = `${q} ${searchItems.map((s) => `${s.title} ${s.snippet}`).join(' ')}`.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/,
  )
  if (phoneHit) {
    drafts.push({
      ...emptyDraft(),
      tipo: /emergencia|urgencia|911|bombero|polic/i.test(q) ? 'emergencia' : 'servicio',
      nombre: brand ? `Atención ${brand}` : 'Contacto encontrado en web',
      categoria: 'Web',
      telefono: phoneHit[0].replace(/\s+/g, ' ').trim(),
      descripcion: `Detectado desde búsqueda: ${q.slice(0, 120)}`,
      sourceUrl: searchItems[0]?.url || '',
    })
  }

  for (const s of searchItems.slice(0, 4)) {
    const title = String(s.title || '').trim()
    if (!title || title.length < 4) continue
    if (/sucursal|sede|oficina|local|dirección|address/i.test(`${title} ${s.snippet}`)) {
      drafts.push({
        ...emptyDraft(),
        tipo: 'sede',
        nombre: title.slice(0, 120),
        categoria: 'Sedes',
        descripcion: String(s.snippet || '').slice(0, 300),
        direccion: '',
        sourceUrl: s.url || '',
        orden: 50,
      })
    }
  }

  if (!drafts.length && (brand || q)) {
    drafts.push({
      ...emptyDraft(),
      tipo: 'servicio',
      nombre: brand ? `Informes ${brand}` : q.slice(0, 80) || 'Contacto web',
      categoria: 'General',
      descripcion:
        'Borrador heurístico: revisá teléfono/dirección con la IA o completá a mano. Fuentes web limitadas.',
      sourceUrl: searchItems[0]?.url || '',
    })
  }

  return normalizeDrafts(drafts)
}

async function gatherWebContext({ prompt, companyName, websiteUrl }) {
  const brand = String(companyName || '').trim()
  const queries = [
    String(prompt || '').trim(),
    brand ? `${brand} teléfono contacto` : '',
    brand ? `${brand} sucursales dirección` : '',
    websiteUrl ? `${websiteUrl} contacto` : '',
  ].filter((q) => q.length >= 4)

  const seen = new Set()
  const items = []
  for (const q of queries.slice(0, 3)) {
    try {
      const res = await searchWebNews(q, { limit: 5 })
      for (const it of res?.items || []) {
        if (!it.url || seen.has(it.url)) continue
        seen.add(it.url)
        items.push(it)
      }
    } catch (e) {
      console.warn('[directoryAi] search', e.message)
    }
  }

  const pages = []
  for (const it of items.slice(0, 3)) {
    try {
      const page = await fetchArticleContent(it.url)
      if (page?.text || page?.imageUrl) {
        pages.push({
          url: it.url,
          title: page.title || it.title,
          text: String(page.text || '').slice(0, 4000),
          imageUrl: page.imageUrl || page.siteHints?.logoUrl || '',
        })
      }
    } catch {
      /* ignore page fetch */
    }
  }

  return { items, pages }
}

/**
 * @param {{
 *   tenantId: import('mongoose').Types.ObjectId,
 *   prompt: string,
 *   companyName?: string,
 *   websiteUrl?: string,
 *   autoCreate?: boolean,
 * }} opts
 */
export async function researchDirectoryFromWeb(opts = {}) {
  const prompt = String(opts.prompt || '').trim()
  if (prompt.length < 6) {
    const err = new Error('Escribí qué querés buscar (ej: sucursales, teléfono RRHH, sedes…)')
    err.status = 400
    throw err
  }

  const companyName = String(opts.companyName || '').trim()
  const websiteUrl = String(opts.websiteUrl || '').trim()
  const { items, pages } = await gatherWebContext({ prompt, companyName, websiteUrl })

  let drafts = []
  let source = 'heuristic'
  let notes = ''

  if (aiConfigured()) {
    const system = `Sos un asistente de intranet que arma fichas del directorio corporativo (Datos útiles).
Respondé SOLO JSON válido: { "entries": [ ... ], "notes": "string breve" }.
Cada entry: tipo (${DIRECTORY_TIPOS.join('|')}), nombre, categoria, descripcion, telefono, interno, whatsapp, email, direccion, ciudad, lat (number|null), lng (number|null), horario, orden, destacado (bool), sourceUrl, imageUrl (URL de logo/foto si aparece en las fuentes).
Reglas:
- No inventes teléfonos ni emails si no aparecen en las fuentes.
- Preferí datos explícitos de páginas/snippets.
- Si hay imageUrl/logo en una página, usalo en la ficha correspondiente.
- Máximo 8 entradas, priorizando utilidad (emergencias, recepción, sedes, atención).
- Si hay coordenadas claras, usalas; si no, lat/lng null.`

    const userMsg = [
      `Pedido del admin: ${prompt}`,
      companyName ? `Empresa: ${companyName}` : '',
      websiteUrl ? `Sitio: ${websiteUrl}` : '',
      'Resultados web:',
      JSON.stringify(
        items.slice(0, 8).map((i) => ({ title: i.title, url: i.url, snippet: i.snippet })),
        null,
        0,
      ),
      'Páginas (extracto):',
      JSON.stringify(pages, null, 0).slice(0, 12000),
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const raw = await chatRaw(system, userMsg)
      const parsed = parseJson(raw)
      drafts = normalizeDrafts(parsed.entries || parsed.drafts || [])
      notes = String(parsed.notes || '').slice(0, 400)
      source = 'llm'
    } catch (e) {
      console.warn('[directoryAi] llm', e.message)
      drafts = heuristicDirectoryFromSearch(prompt, items, companyName)
      notes = 'IA no disponible o respuesta inválida; usé heurística sobre la búsqueda web.'
      source = 'heuristic_fallback'
    }
  } else {
    drafts = heuristicDirectoryFromSearch(prompt, items, companyName)
    notes = webSearchProvidersConfigured()
      ? 'Sin API de IA: borradores heurísticos desde búsqueda web. Revisá antes de publicar.'
      : 'Sin IA ni buscador configurado: borradores mínimos. Configurá OPENAI/ANTHROPIC y/o SERPER/BRAVE.'
  }

  const created = []
  if (opts.autoCreate && drafts.length && opts.tenantId) {
    for (const d of drafts) {
      const dup = await DirectoryEntry.findOne({
        tenantId: opts.tenantId,
        nombre: d.nombre,
        activo: true,
      }).select('_id')
      if (dup) continue
      try {
        const doc = new DirectoryEntry({
          tenantId: opts.tenantId,
          nombre: d.nombre,
          audience: { mode: 'all', areaIds: [], groupIds: [] },
        })
        applyDirectoryPatch(doc, d)
        await doc.save()
        created.push(serializeDirectoryEntry(doc.toObject()))
      } catch (e) {
        console.warn('[directoryAi] create skip', d.nombre, e.message)
      }
    }
  }

  return {
    configured: directoryAiConfigured(),
    usedAi: source === 'llm',
    source,
    notes,
    searchCount: items.length,
    sources: items.slice(0, 6).map((i) => ({ title: i.title, url: i.url, provider: i.provider })),
    drafts,
    created,
    createdCount: created.length,
  }
}
