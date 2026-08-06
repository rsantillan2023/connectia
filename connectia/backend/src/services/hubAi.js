/**
 * IA operador del hub de enlaces: planifica y aplica cambios
 * (colores, tamaños, featured, órdenes, títulos, altas de grupos/enlaces, etc.).
 */
import mongoose from 'mongoose'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { HUB_ICONS } from '../lib/hubIcons.js'
import {
  HUB_KIND_IDS,
  normalizeHubKind,
  openModeForKind,
  validateHubLinkPayload,
} from '../lib/hubKinds.js'
import { searchWebNews } from './webNewsSearch.js'

/** Kinds que la IA puede crear sin catálogo (ids de encuesta, doc, etc.). */
const AI_CREATE_KINDS = new Set(['url', 'webview', 'route', 'mailto', 'tel', 'whatsapp', 'copy'])
const PLACEHOLDER_URL = 'https://pendiente.local'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'
const MAX_QUICK = 48
const ICON_IDS = new Set(HUB_ICONS.map((i) => i.id))

function openaiKey() {
  return (process.env.OPENAI_API_KEY || '').trim()
}
function anthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim()
}

export function hubAiConfigured() {
  return Boolean(openaiKey() || anthropicKey())
}

/** Guía estática para el admin (sin IA). */
export const HUB_AI_GUIDE = {
  title: 'Cómo configurar Enlaces (hub)',
  summary:
    'Los grupos son pestañas en la app. Los accesos rápidos (featured) por grupo se muestran como botones en el muro y en /accesos (con scroll si hay muchos). En el muro NO hay fallback: si un grupo no tiene featured, no aparece ahí (sí puede listarse completo en /accesos). Podés ocultar un grupo solo del muro (sigue en /accesos) con showOnMuro=false.',
  fields: [
    {
      id: 'category',
      label: 'Grupo / pestaña',
      values: 'Texto (ej. TI, RRHH). Orden del grupo: número entero (menor = primero).',
    },
    {
      id: 'featured',
      label: 'Acceso rápido',
      values: `true/false. Máximo ${MAX_QUICK} por grupo. Son los botones clave del estilo Mercado Pago.`,
    },
    {
      id: 'order',
      label: 'Orden del enlace',
      values: 'Número entero. Menor = más arriba / más a la izquierda. Tip: 10, 20, 30…',
    },
    {
      id: 'orden',
      label: 'Orden del grupo',
      values: 'Número entero en HubCategory.orden. Menor = pestaña más a la izquierda.',
    },
    {
      id: 'iconSize',
      label: 'Tamaño de icono',
      values: 'sm | md | lg. En el enlace null/inherit hereda del grupo. En la app de usuario el tamaño visual de rápidos es uniforme; esto afecta admin y cards “Más de…”.',
    },
    {
      id: 'color',
      label: 'Color de acento',
      values: 'Hex (#0F766E) o vacío = marca del tenant. Se ve en la tarjeta del enlace.',
    },
    {
      id: 'icon',
      label: 'Icono',
      values: `Ids válidos: ${HUB_ICONS.map((i) => i.id).slice(0, 24).join(', ')}…`,
    },
    {
      id: 'kind',
      label: 'Tipo de destino',
      values: HUB_KIND_IDS.join(', '),
    },
    {
      id: 'activo',
      label: 'Visible',
      values: 'true/false en enlace o grupo. Si el grupo está inactivo, no aparece en ninguna superficie.',
    },
    {
      id: 'showOnMuro',
      label: 'Mostrar en el muro',
      values: 'true/false en el grupo. Si false, el grupo completo no aparece en la franja del muro; sí sigue en /accesos (Enlaces).',
    },
    {
      id: 'visibleUntil',
      label: 'Vencimiento',
      values: 'Fecha ISO o YYYY-MM-DD. Default lejano 2099-01-01.',
    },
  ],
  ops: [
    'updateLink — patch de un enlace por id (titulo, subtitulo, color, icon, iconSize, order, featured, activo, category…)',
    'updateCategory — patch de grupo por nombre (orden, iconSize, activo, showOnMuro)',
    'setFeatured — fija exactamente los rápidos de un grupo (lista de ids; se scrollean en el muro)',
    'reorderLinks — orderedIds dentro de un grupo',
    'reorderCategories — orderedNames de pestañas',
    'renameCategory — from → to',
    'createCategory — alta de grupo (nombre; opcional orden, iconSize, activo, showOnMuro)',
    'createLink — alta de enlace (titulo, category, kind, target/url; opcional subtitulo, icon, color, featured, order)',
  ],
  examples: [
    'Marcá como rápidos Portal, Nómina y Vacaciones en RRHH',
    'Poné todos los iconos en mediano y color #0F766E en TI',
    'Ordená los grupos: Connectia, TI, RRHH, Comunicación',
    'Dejá solo 3 rápidos por grupo: los de más clics',
    'Ocultá el grupo Comunicación y activá todos los enlaces de TI',
    'No muestres el grupo Comunicación en el muro',
    'Creá el grupo Beneficios con Portal, Nómina y Vacaciones',
    'Nuevo grupo TI con VPN (https://vpn.empresa.com) y Helpdesk (https://help.empresa.com)',
    'Agregá en RRHH el enlace Vacaciones apuntando a https://rrhh.empresa.com/vacaciones',
  ],
  createExamples: [
    'Creá el grupo Beneficios con Portal, Nómina y Vacaciones',
    'Nuevo grupo TI con VPN (https://vpn.empresa.com) y Helpdesk (https://help.empresa.com)',
    'Agregá en RRHH el enlace Vacaciones apuntando a https://rrhh.empresa.com/vacaciones',
    'Creá grupo Comunicación con Newsletter y Intranet; marcá Newsletter como rápido',
    'Renombrá el enlace Portal a Intranet RRHH',
    'Nuevo enlace en Mis enlaces a Beneficios; que se vean mis puntos y entre con mi usuario',
  ],
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

async function callOpenAi(system, user, { temperature = 0.2, maxTokens = 2500 } = {}) {
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
  return data?.choices?.[0]?.message?.content || ''
}

async function callAnthropic(system, user, { maxTokens = 2500 } = {}) {
  const res = await fetch(ANTHROPIC_MESSAGES, {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data?.content?.map((c) => c.text).join('\n') || ''
}

async function generateRaw(system, user, opts) {
  if (!hubAiConfigured()) {
    const err = new Error('IA no configurada')
    err.status = 503
    throw err
  }
  if (openaiKey()) {
    try {
      return await callOpenAi(system, user, opts)
    } catch (e) {
      if (!anthropicKey()) throw e
      return callAnthropic(system, user, opts)
    }
  }
  return callAnthropic(system, user, opts)
}

function snapshotForPrompt({ categories = [], links = [] }) {
  return {
    categories: categories.map((c) => ({
      nombre: c.nombre,
      orden: c.orden,
      activo: c.activo !== false,
      showOnMuro: c.showOnMuro !== false,
      iconSize: c.iconSize || 'md',
    })),
    links: links.map((l) => ({
      id: String(l.id || l._id),
      titulo: l.titulo,
      subtitulo: l.subtitulo || '',
      category: l.category || 'General',
      kind: l.kind || 'url',
      icon: l.icon || 'grid',
      color: l.color || '',
      iconSize: l.iconSize ?? null,
      order: l.order ?? 100,
      featured: Boolean(l.featured),
      activo: l.activo !== false,
      clickCount: l.clickCount || 0,
    })),
  }
}

const SYSTEM = `Sos un operador del hub de enlaces de Connectia (intranet).
Respondé SOLO JSON válido con esta forma:
{
  "summary": "frase corta de lo que vas a hacer",
  "explanation": "explicación breve para el admin",
  "ops": [ ...operaciones... ]
}

Operaciones permitidas (solo estas):
1) {"op":"updateLink","id":"<id>","patch":{...}}
   patch keys: titulo, subtitulo, color, icon, iconSize (sm|md|lg|null), order (number), featured (bool), activo (bool), category (string)
2) {"op":"updateCategory","nombre":"<grupo>","patch":{ orden?, iconSize?, activo?, showOnMuro? }}
3) {"op":"setFeatured","category":"<grupo>","linkIds":["id1","id2","id3"]}  // reemplaza los rápidos del grupo
4) {"op":"reorderLinks","category":"<grupo>","orderedIds":["id","id",...]}
5) {"op":"reorderCategories","orderedNames":["GrupoA","GrupoB"]}
6) {"op":"renameCategory","from":"...","to":"..."}
7) {"op":"createCategory","nombre":"<grupo>","patch":{ orden?, iconSize?, activo?, showOnMuro? }}
8) {"op":"createLink","link":{ "titulo":"...","category":"...","kind":"url|webview|route|mailto|tel|whatsapp|copy","target":"...","subtitulo?":"...","params?":{"query":{"usuario":"{{usuario}}"}},"icon?":"...","color?":"...","featured?":bool,"order?":number,"activo?":bool }}
   Si no hay URL, usá target "${PLACEHOLDER_URL}" y avisá en explanation que el admin debe completarlas.
   Para altas en un grupo nuevo: primero createCategory, después createLink(s). No uses setFeatured sobre ids aún no creados; marcá featured:true en createLink.

Reglas:
- Máximo ${MAX_QUICK} featured por category. Preferí setFeatured para editar; en altas usá featured en createLink.
- No inventes ids de enlaces existentes: usá solo los del snapshot.
- icon debe ser uno de: ${[...ICON_IDS].join(', ')}
- color en hex (#RRGGBB) o "" para quitar.
- No borres enlaces.
- Para renombrar un enlace existente usá updateLink con su id del snapshot y patch.titulo (no inventes un createLink nuevo).
- Kinds complejos (request, survey, document, post, faq, tutorial, policy) NO se crean por IA: pedí al admin que los cree a mano o usá url/route.
- Módulos de la APP propia (NO son teléfono): Beneficios→kind route target /beneficios; Muro→/muro; Solicitudes→/solicitudes; Encuestas→/encuestas; Docs→/docs; Accesos→/accesos; Chat→/chat.
  * Si dice “llamar a Beneficios / acceso a Beneficios / mi propia app / pantalla de…”, usá kind:"route" (NUNCA kind:"tel" salvo que haya un número de teléfono explícito).
  * Si pide ver puntos en el texto: subtitulo "{{puntos_saludo}}" o "Tenés {{puntos}} puntos" (también válido en titulo).
  * Si pide entrar con su user/usuario: params.query = {"usuario":"{{usuario}}"}.
- kind "tel" SOLO con número o “llamar al +54…”. “Llamar a Beneficios” = ruta interna.
- Si el pedido es ambiguo, pedí aclaración con ops:[] y explanation preguntando.
- Si pide estética “como Mercado Pago”: iconSize md, featured por grupo (scrolleables), colores de acento coherentes con la marca si hay brandColor.`

/**
 * Plan desde prompt (IA o heurística).
 * @param {{ prompt: string, categories?: any[], links?: any[], brandName?: string, brandColor?: string, intent?: 'edit'|'create' }} opts
 */
export async function planHubOpsFromPrompt({
  prompt,
  categories,
  links,
  brandName = '',
  brandColor = '',
  intent = 'edit',
}) {
  const clean = String(prompt || '').trim()
  if (clean.length < 6) {
    const err = new Error('Escribí un pedido más claro (mín. 6 caracteres)')
    err.status = 400
    throw err
  }

  const mode = intent === 'create' ? 'create' : 'edit'
  const snap = snapshotForPrompt({ categories, links })
  const user = JSON.stringify(
    {
      pedido: clean,
      intent: mode,
      intentHint:
        mode === 'create'
          ? 'Priorizá createCategory y createLink. Accesos a módulos de la app (Beneficios, Muro, etc.) = kind route con target /beneficios (etc.), NUNCA tel. Si pide puntos en el texto usá subtitulo con {{puntos_saludo}}. Si pide entrar con usuario: params.query.usuario={{usuario}}. Renombres: updateLink.'
          : 'Preferí editar lo existente (updateLink, renameCategory, etc.). Solo usá createCategory/createLink si el admin pide explícitamente crear.',
      marca: { nombre: brandName || '', color: brandColor || '' },
      estadoActual: snap,
      guiaRapida: {
        maxFeaturedPorGrupo: MAX_QUICK,
        iconSizes: ['sm', 'md', 'lg'],
        ejemplos: mode === 'create' ? HUB_AI_GUIDE.createExamples : HUB_AI_GUIDE.examples,
      },
    },
    null,
    2,
  )

  if (!hubAiConfigured()) {
    return {
      ...heuristicPlan(clean, snap, brandColor, mode),
      source: 'heuristic',
      configured: false,
    }
  }

  try {
    const raw = await generateRaw(SYSTEM, user)
    const parsed = parseJson(raw)
    const ops = Array.isArray(parsed.ops) ? parsed.ops : []
    return {
      summary: String(parsed.summary || 'Plan listo').slice(0, 240),
      explanation: String(parsed.explanation || '').slice(0, 2000),
      ops: sanitizeOps(ops, snap),
      source: 'ai',
      configured: true,
    }
  } catch (e) {
    const fallback = heuristicPlan(clean, snap, brandColor, mode)
    return {
      ...fallback,
      source: 'heuristic',
      configured: true,
      aiError: e.message || 'IA falló; usé reglas locales',
    }
  }
}

function sanitizeOps(ops, snap) {
  const linkIds = new Set(snap.links.map((l) => l.id))
  const catNames = new Set(snap.categories.map((c) => c.nombre))
  for (const l of snap.links) catNames.add(l.category || 'General')

  const out = []
  const pendingCats = new Set()
  for (const raw of ops.slice(0, 80)) {
    if (!raw || typeof raw !== 'object') continue
    const op = String(raw.op || '')
    if (op === 'updateLink') {
      const id = String(raw.id || '')
      if (!linkIds.has(id)) continue
      const patch = sanitizeLinkPatch(raw.patch)
      if (!Object.keys(patch).length) continue
      out.push({ op, id, patch })
    } else if (op === 'updateCategory') {
      const nombre = String(raw.nombre || '').trim()
      if (!nombre) continue
      const rawPatch = raw.patch && typeof raw.patch === 'object' ? raw.patch : {}
      const renameTo = rawPatch.nombre != null ? String(rawPatch.nombre).trim().slice(0, 80) : ''
      if (renameTo && renameTo !== nombre) {
        out.push({ op: 'renameCategory', from: nombre, to: renameTo })
      }
      const patch = sanitizeCatPatch(rawPatch)
      if (Object.keys(patch).length) out.push({ op, nombre, patch })
    } else if (op === 'setFeatured') {
      const category = String(raw.category || 'General').trim() || 'General'
      const linkIdsList = (Array.isArray(raw.linkIds) ? raw.linkIds : [])
        .map(String)
        .filter((id) => linkIds.has(id))
        .slice(0, MAX_QUICK)
      out.push({ op, category, linkIds: linkIdsList })
    } else if (op === 'reorderLinks') {
      const category = String(raw.category || 'General').trim() || 'General'
      const orderedIds = (Array.isArray(raw.orderedIds) ? raw.orderedIds : [])
        .map(String)
        .filter((id) => linkIds.has(id))
      if (!orderedIds.length) continue
      out.push({ op, category, orderedIds })
    } else if (op === 'reorderCategories') {
      const orderedNames = (Array.isArray(raw.orderedNames) ? raw.orderedNames : [])
        .map((n) => String(n).trim())
        .filter(Boolean)
      if (!orderedNames.length) continue
      out.push({ op, orderedNames })
    } else if (op === 'renameCategory') {
      const from = String(raw.from || '').trim()
      const to = String(raw.to || '').trim().slice(0, 80)
      if (!from || !to || from === to) continue
      out.push({ op, from, to })
    } else if (op === 'createCategory') {
      const nombre = String(raw.nombre || raw.name || '').trim().slice(0, 80)
      if (!nombre) continue
      if (catNames.has(nombre) || pendingCats.has(nombre)) continue
      const patch = sanitizeCatPatch(raw.patch && typeof raw.patch === 'object' ? raw.patch : raw)
      pendingCats.add(nombre)
      out.push({ op, nombre, patch })
    } else if (op === 'createLink') {
      const link = sanitizeCreateLink(raw.link != null ? raw.link : raw)
      if (!link) continue
      if (!catNames.has(link.category) && !pendingCats.has(link.category)) {
        pendingCats.add(link.category)
        out.push({ op: 'createCategory', nombre: link.category, patch: {} })
      }
      out.push({ op, link })
    }
  }
  return out
}

function sanitizeCreateLink(raw) {
  if (!raw || typeof raw !== 'object') return null
  const titulo = String(raw.titulo || raw.title || '').trim().slice(0, 120)
  if (!titulo) return null
  const category = String(raw.category || 'General').trim().slice(0, 80) || 'General'
  let kind = normalizeHubKind(raw.kind, raw.openMode)
  if (!AI_CREATE_KINDS.has(kind)) kind = 'url'
  let target = String(raw.target ?? raw.url ?? '').trim()
  // “tel a Beneficios” sin número → ruta de app
  if ((kind === 'tel' || kind === 'whatsapp') && !/\d{6,}/.test(target)) {
    const blob = `${titulo} ${target}`.toLowerCase()
    if (/\bbeneficios?\b/.test(blob)) {
      kind = 'route'
      target = '/beneficios'
    } else if (/\bmuro\b/.test(blob)) {
      kind = 'route'
      target = '/muro'
    } else if (/\bsolicitudes?\b/.test(blob)) {
      kind = 'route'
      target = '/solicitudes'
    }
  }
  if (!target) {
    if (kind === 'mailto') target = 'pendiente@ejemplo.com'
    else if (kind === 'tel' || kind === 'whatsapp') target = '+540000000000'
    else if (kind === 'route') target = '/'
    else if (kind === 'copy') target = titulo
    else target = PLACEHOLDER_URL
  }
  const params =
    raw.params && typeof raw.params === 'object' && !Array.isArray(raw.params) ? { ...raw.params } : {}
  if (kind === 'copy' && !params.copyText) params.copyText = String(raw.copyText || target || titulo)
  const err = validateHubLinkPayload({ kind, target, params })
  if (err) return null

  const link = {
    titulo,
    category,
    kind,
    target,
    url: target,
    params,
    openMode: openModeForKind(kind),
  }
  if (raw.subtitulo != null) link.subtitulo = String(raw.subtitulo).slice(0, 200)
  if (raw.color != null) {
    const c = String(raw.color).trim().slice(0, 32)
    if (!c || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) link.color = c
  }
  if (raw.icon != null) {
    const icon = String(raw.icon).slice(0, 40)
    if (ICON_IDS.has(icon)) link.icon = icon
  }
  if (raw.iconSize !== undefined) {
    if (raw.iconSize == null || raw.iconSize === '' || raw.iconSize === 'inherit') {
      link.iconSize = null
    } else if (['sm', 'md', 'lg'].includes(raw.iconSize)) {
      link.iconSize = raw.iconSize
    }
  }
  if (raw.order != null && Number.isFinite(Number(raw.order))) link.order = Number(raw.order)
  if (raw.featured != null) link.featured = Boolean(raw.featured)
  if (raw.activo != null) link.activo = Boolean(raw.activo)
  return link
}

function sanitizeLinkPatch(patch) {
  if (!patch || typeof patch !== 'object') return {}
  const out = {}
  if (patch.titulo != null) out.titulo = String(patch.titulo).trim().slice(0, 120)
  if (patch.subtitulo != null) out.subtitulo = String(patch.subtitulo).slice(0, 200)
  if (patch.color != null) {
    const c = String(patch.color).trim().slice(0, 32)
    if (!c || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) out.color = c
  }
  if (patch.icon != null) {
    const icon = String(patch.icon).slice(0, 40)
    if (ICON_IDS.has(icon)) out.icon = icon
  }
  if (patch.iconSize !== undefined) {
    if (patch.iconSize == null || patch.iconSize === '' || patch.iconSize === 'inherit') {
      out.iconSize = null
    } else if (['sm', 'md', 'lg'].includes(patch.iconSize)) {
      out.iconSize = patch.iconSize
    }
  }
  if (patch.order != null && Number.isFinite(Number(patch.order))) out.order = Number(patch.order)
  if (patch.featured != null) out.featured = Boolean(patch.featured)
  if (patch.activo != null) out.activo = Boolean(patch.activo)
  if (patch.category != null) {
    out.category = String(patch.category).trim().slice(0, 80) || 'General'
  }
  return out
}

function sanitizeCatPatch(patch) {
  if (!patch || typeof patch !== 'object') return {}
  const out = {}
  if (patch.orden != null && Number.isFinite(Number(patch.orden))) out.orden = Number(patch.orden)
  if (patch.iconSize != null && ['sm', 'md', 'lg'].includes(patch.iconSize)) {
    out.iconSize = patch.iconSize
  }
  if (patch.activo != null) out.activo = Boolean(patch.activo)
  if (patch.showOnMuro != null) out.showOnMuro = Boolean(patch.showOnMuro)
  return out
}

/** Heurística local si no hay API key o la IA falla. */
export function heuristicPlan(prompt, snap, brandColor = '', intent = 'edit') {
  const p = String(prompt || '').toLowerCase()
  const ops = []
  const explanations = []
  const wantsCreate =
    intent === 'create' ||
    /\b(cre[aá]|crear|nuevo|nueva|agreg[aá]|agregar|añad[aái]|alta)\b/.test(p)

  const renameOps = heuristicRenameLinkOps(prompt, snap)
  if (wantsCreate) {
    const createOps = heuristicCreateOps(prompt, snap)
    const merged = [...renameOps.ops, ...createOps.ops]
    if (merged.length) {
      const explanations = [
        ...renameOps.explanations,
        ...(createOps.ops.length && createOps.summary ? [createOps.summary] : []),
      ].filter(Boolean)
      return {
        summary: explanations[0] || 'Cambios de alta/renombre',
        explanation:
          (explanations.length ? explanations.join('. ') + '.' : '') ||
          createOps.explanation ||
          renameOps.explanation ||
          '',
        ops: sanitizeOps(merged, snap),
      }
    }
  } else if (renameOps.ops.length) {
    return {
      summary: renameOps.summary || 'Renombrar enlaces',
      explanation: renameOps.explanation,
      ops: sanitizeOps(renameOps.ops, snap),
    }
  }

  // Tamaño global
  const sizeMatch = p.match(/\b(sm|md|lg|chicos?|pequeños?|medianos?|grandes?)\b/)
  if (/\b(iconos?|tamañ\w*|size)\b/.test(p) && sizeMatch) {
    const map = {
      chico: 'sm',
      chicos: 'sm',
      pequeño: 'sm',
      pequeños: 'sm',
      mediano: 'md',
      medianos: 'md',
      grande: 'lg',
      grandes: 'lg',
    }
    const size = map[sizeMatch[1]] || sizeMatch[1]
    if (['sm', 'md', 'lg'].includes(size)) {
      for (const c of snap.categories) {
        ops.push({ op: 'updateCategory', nombre: c.nombre, patch: { iconSize: size } })
      }
      for (const l of snap.links) {
        ops.push({ op: 'updateLink', id: l.id, patch: { iconSize: size } })
      }
      explanations.push(`Tamaño de iconos → ${size}`)
    }
  }

  // Color global / marca
  const hex = prompt.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/)
  if (/\b(color|acento|teal|marca)\b/.test(p)) {
    const color = hex ? `#${hex[1]}` : brandColor || '#0F766E'
    for (const l of snap.links) {
      ops.push({ op: 'updateLink', id: l.id, patch: { color } })
    }
    explanations.push(`Color de acento → ${color}`)
  }

  // Ordenar grupos listados
  const ordenMatch = p.match(/orden[aá]\s+(?:los\s+)?grupos?\s*:?\s*(.+)$/i)
  if (ordenMatch) {
    const names = ordenMatch[1]
      .split(/[,;]| y /i)
      .map((s) => s.trim())
      .filter(Boolean)
    if (names.length) {
      ops.push({ op: 'reorderCategories', orderedNames: names })
      explanations.push(`Reordenar grupos: ${names.join(' → ')}`)
    }
  }

  // Featured: "rápidos" + títulos o "más clics"
  if (/\b(r[aá]pidos?|featured|destacad\w*)\b/.test(p)) {
    const byCat = {}
    for (const l of snap.links) {
      const cat = l.category || 'General'
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(l)
    }
    if (/\b(clics|clicks|popular)\b/.test(p)) {
      for (const [cat, list] of Object.entries(byCat)) {
        const top = [...list].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0, MAX_QUICK)
        ops.push({ op: 'setFeatured', category: cat, linkIds: top.map((x) => x.id) })
      }
      explanations.push(`Rápidos = top ${MAX_QUICK} por clics en cada grupo`)
    } else {
      // Match link titles mentioned
      for (const [cat, list] of Object.entries(byCat)) {
        const mentioned = list.filter((l) => p.includes(String(l.titulo || '').toLowerCase()))
        if (mentioned.length) {
          ops.push({
            op: 'setFeatured',
            category: cat,
            linkIds: mentioned.slice(0, MAX_QUICK).map((x) => x.id),
          })
        }
      }
      if (!explanations.some((e) => e.includes('Rápidos'))) {
        explanations.push('Intenté marcar como rápidos los enlaces mencionados por título')
      }
    }
  }

  // Activar / ocultar grupo (app completa) o solo del muro
  for (const c of snap.categories) {
    const name = String(c.nombre || '').toLowerCase()
    if (!name) continue
    const hideVerb = '(no\\s+muestr\\w*|no\\s+mostrar|sac[aá]|ocult(a|ar|á|áis|en)?)'
    const muroHide =
      new RegExp(`${hideVerb}.{0,40}${name}.{0,30}muro`).test(p) ||
      new RegExp(`muro.{0,30}${hideVerb}.{0,40}${name}`).test(p) ||
      new RegExp(`(ocult(a|ar)|sac[aá]).{0,20}${name}.{0,20}(del\\s+)?muro`).test(p)
    if (muroHide) {
      ops.push({ op: 'updateCategory', nombre: c.nombre, patch: { showOnMuro: false } })
      explanations.push(`Ocultar ${c.nombre} del muro (sigue en Enlaces)`)
      continue
    }
    if (new RegExp(`(mostr|activ|muestr).{0,40}${name}.{0,20}muro|muro.{0,20}(mostr|activ|muestr).{0,40}${name}`).test(p)) {
      ops.push({ op: 'updateCategory', nombre: c.nombre, patch: { showOnMuro: true } })
      explanations.push(`Mostrar ${c.nombre} en el muro`)
      continue
    }
    if (new RegExp(`ocult(a|ar).{0,20}${name}`).test(p)) {
      ops.push({ op: 'updateCategory', nombre: c.nombre, patch: { activo: false } })
      explanations.push(`Ocultar grupo ${c.nombre}`)
    }
    if (new RegExp(`(mostr|activ).{0,20}${name}`).test(p)) {
      ops.push({ op: 'updateCategory', nombre: c.nombre, patch: { activo: true } })
      explanations.push(`Mostrar grupo ${c.nombre}`)
    }
  }

  if (!ops.length) {
    return {
      summary: 'Sin cambios automáticos',
      explanation:
        'No pude interpretar el pedido con reglas locales. Configurá OPENAI_API_KEY / ANTHROPIC_API_KEY o probá ejemplos: “Creá el grupo Beneficios con Portal y Nómina”, “Marcá como rápidos…”, “Poné iconos medianos”.',
      ops: [],
    }
  }

  return {
    summary: explanations[0] || 'Ajustes locales',
    explanation: explanations.join('. ') + '.',
    ops: sanitizeOps(ops, snap),
  }
}

/**
 * Parsea pedidos tipo “renombrá Portal a Intranet” / “cambiá el nombre de X a Y”.
 */
function heuristicRenameLinkOps(prompt, snap) {
  const ops = []
  const explanations = []
  const text = String(prompt || '')
  const links = [...(snap.links || [])].sort(
    (a, b) => String(b.titulo || '').length - String(a.titulo || '').length,
  )

  for (const l of links) {
    const title = String(l.titulo || '').trim()
    if (!title || title.length < 2) continue
    const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `(?:renombr[aá]r?|cambi[aá]r?(?:\\s+(?:el\\s+)?(?:nombre|t[ií]tulo))?|llam[aá]r?)\\s+(?:(?:al?\\s+|el\\s+)?(?:enlace|link|acceso)\\s+)?["«']?${esc}["»']?\\s+(?:a|como|por|->|→)\\s+["«']?([^"»'\\n,;]+?)["»']?(?=\\s*(?:\\.|,|;|$|\\by\\b|\\be\\b))`,
      'i',
    )
    const m = text.match(re)
    if (!m) continue
    const nuevo = String(m[1] || '').trim().replace(/[.。]+$/, '').slice(0, 120)
    if (!nuevo || nuevo.toLowerCase() === title.toLowerCase()) continue
    if (ops.some((o) => o.id === l.id)) continue
    ops.push({ op: 'updateLink', id: l.id, patch: { titulo: nuevo } })
    explanations.push(`Renombrar «${title}» → «${nuevo}»`)
  }

  return {
    ops,
    explanations,
    summary: explanations[0] || '',
    explanation: explanations.length ? explanations.join('. ') + '.' : '',
  }
}

/**
 * Parsea pedidos tipo “creá el grupo X con A, B (url) y C” o “agregá en RRHH el enlace Vacaciones…”.
 */
function heuristicCreateOps(prompt, snap) {
  const smart = heuristicAppModuleCreate(prompt, snap)
  if (smart?.ops?.length) return smart

  const ops = []
  const explanations = []
  const existingCats = new Set([
    ...snap.categories.map((c) => c.nombre),
    ...snap.links.map((l) => l.category || 'General'),
  ])

  const groupMatch = String(prompt || '').match(
    /(?:cre[aá]r?|nuevo|agreg[aá]r?|añad[aái]r?)\s+(?:el\s+|un\s+)?grupo\s+([^,\n]+?)(?:\s+con\s+|\s*:\s*|\s*$)/i,
  )
  let category = groupMatch ? String(groupMatch[1] || '').trim().replace(/[.。]+$/, '') : ''
  category = category.slice(0, 80)

  if (!category) {
    const inCat = String(prompt || '').match(
      /(?:agreg[aá]r?|añad[aái]r?|cre[aá]r?)\s+(?:en|al?\s+grupo)\s+([^\n,]+?)\s+(?:el\s+)?(?:enlace|link|acceso)\s+/i,
    )
    if (inCat) category = String(inCat[1] || '').trim().slice(0, 80)
  }

  // “en el grupo Mis enlaces …” / “grupo Mis enlaces que…”
  if (!category) {
    const gFlex = String(prompt || '').match(
      /(?:en\s+(?:el\s+)?grupo|grupo)\s+[«"']?([^»"'\n,]+?)[»"']?(?:\s+que|\s+con|\s+para|\s*$|,)/i,
    )
    if (gFlex) category = String(gFlex[1] || '').trim().slice(0, 80)
  }

  const linksPartMatch = String(prompt || '').match(/grupo\s+[^,\n]+?\s+con\s+(.+)$/i)
  let linksBlob = linksPartMatch ? linksPartMatch[1] : ''

  const singleLink =
    String(prompt || '').match(
      /(?:enlace|link|acceso)\s+(.+?)\s+(?:apuntando\s+a|hacia|->|→)\s+(\S+)/i,
    ) ||
    String(prompt || '').match(
      /(?:enlace|link|acceso)\s+([^(\n]+?)\s*\((https?:\/\/[^)]+|\/[^)]+|mailto:[^)]+|tel:[^)]+)\)/i,
    ) ||
    String(prompt || '').match(
      /(?:enlace|link|acceso)\s+([^:\n]+?)\s+(?:a|:)\s+(https?:\/\/\S+|\/\S+|mailto:\S+|tel:\S+)/i,
    )
  if (!linksBlob && singleLink) {
    const titulo = String(singleLink[1] || '').trim()
    const target = singleLink[2] ? String(singleLink[2]).trim() : ''
    if (titulo) {
      linksBlob = target ? `${titulo} (${target})` : titulo
    }
  }

  if (!category && !linksBlob) {
    return { ops: [], summary: '', explanation: '' }
  }

  if (category && !existingCats.has(category)) {
    ops.push({ op: 'createCategory', nombre: category, patch: {} })
    explanations.push(`Crear grupo «${category}»`)
  } else if (category) {
    explanations.push(`Usar grupo existente «${category}»`)
  }

  const catForLinks = category || 'General'
  const items = splitLinkItems(linksBlob)
  let order = 10
  let featuredLeft = MAX_QUICK
  for (const item of items.slice(0, 24)) {
    const featured = featuredLeft > 0 && items.length <= MAX_QUICK
    if (featured) featuredLeft -= 1
    ops.push({
      op: 'createLink',
      link: {
        titulo: item.titulo,
        category: catForLinks,
        kind: item.kind,
        target: item.target,
        featured,
        order,
        icon: 'grid',
      },
    })
    order += 10
  }
  if (items.length) {
    explanations.push(
      `Alta de ${items.length} enlace(s)${items.some((i) => i.target === PLACEHOLDER_URL) ? ` (URLs pendientes → ${PLACEHOLDER_URL})` : ''}`,
    )
  }

  if (!ops.length) {
    return { ops: [], summary: '', explanation: '' }
  }

  return {
    ops,
    summary: explanations[0] || 'Crear enlaces',
    explanation: explanations.join('. ') + '.',
  }
}

/** Módulos internos de la app (nunca interpretar como tel). */
const APP_MODULE_LINKS = [
  { keys: ['beneficios', 'billetera'], route: '/beneficios', icon: 'gift', title: 'Beneficios' },
  { keys: ['muro', 'novedades'], route: '/muro', icon: 'megaphone', title: 'Muro' },
  { keys: ['solicitudes', 'pedidos'], route: '/solicitudes', icon: 'clipboard', title: 'Solicitudes' },
  { keys: ['encuestas'], route: '/encuestas', icon: 'chart', title: 'Encuestas' },
  { keys: ['documentos', 'docs'], route: '/docs', icon: 'file', title: 'Documentos' },
  { keys: ['accesos', 'enlaces'], route: '/accesos', icon: 'grid', title: 'Accesos' },
  { keys: ['chat'], route: '/chat', icon: 'chat', title: 'Chat' },
]

/**
 * “Nuevo enlace en Mis enlaces a Beneficios con mis puntos y mi usuario”.
 */
function heuristicAppModuleCreate(prompt, snap) {
  const raw = String(prompt || '').trim()
  if (!raw) return null
  const p = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  const hasPhoneNumber = /(?:\+?\d[\d\s().-]{6,}\d)/.test(raw) || /llamar\s+al\b/.test(p)
  const mod = APP_MODULE_LINKS.find((m) => m.keys.some((k) => p.includes(k)))
  if (!mod) return null

  // “Creá el grupo Beneficios con A, B y C” → flujo clásico de altas, no este atajo
  const afterCon = raw.split(/\bcon\s+/i)[1] || ''
  if (/grupo\s+.+\s+con\s+/i.test(raw) && /(,|\s+y\s+)/i.test(afterCon) && !/\b(mi user|mi usuario|mis? puntos)\b/i.test(afterCon)) {
    return null
  }

  // Si hay número real, no forzar módulo app
  if (hasPhoneNumber && /\btel(efono)?\b|whatsapp|wa\.me/.test(p)) return null

  const accessIntent =
    /\b(llamar\s+a|acceso\s+a|ir\s+a|pantalla|propia\s+app|entrar|entre\s+con|mis?\s+puntos|mi\s+user|mi\s+usuario)\b/.test(
      p,
    ) ||
    (/\b(enlace|link|nuevo\s+enlace)\b/.test(p) && !/grupo\s+beneficios\b/.test(p))

  const wantsCreate =
    /\b(cre[aá]|nuevo|nueva|agreg[aá]|añad|quiero|necesito|arme|alta)\b/.test(p) ||
    /\benlace|link|acceso\b/.test(p)
  if (!wantsCreate || !accessIntent) return null

  let category = ''
  const g =
    raw.match(/(?:en\s+(?:el\s+)?grupo|grupo)\s+[«"']?([^»"'\n,]+?)[»"']?(?:\s+que|\s+con|\s+para|\s+un|\s*$|,)/i) ||
    raw.match(/grupo\s+[«"']?([^»"'\n,]+?)[»"']/i)
  if (g) category = String(g[1] || '').trim().slice(0, 80)
  if (!category) category = 'General'

  // Evitar capturar “Mis enlaces que me permita…” mal: cortar en “que”
  category = category.replace(/\s+que\b.*$/i, '').trim().slice(0, 80) || 'General'

  const wantsPoints = /\bpuntos?\b/.test(p)
  const wantsUser = /\b(usuario|user|mi user|con mi)\b/.test(p)

  const existingCats = new Set([
    ...snap.categories.map((c) => c.nombre),
    ...snap.links.map((l) => l.category || 'General'),
  ])

  const ops = []
  if (!existingCats.has(category)) {
    ops.push({ op: 'createCategory', nombre: category, patch: {} })
  }

  const params = {}
  if (wantsUser) params.query = { usuario: '{{usuario}}' }

  ops.push({
    op: 'createLink',
    link: {
      titulo: mod.title,
      subtitulo: wantsPoints ? '{{puntos_saludo}}' : '',
      category,
      kind: 'route',
      target: mod.route,
      params,
      icon: mod.icon,
      featured: true,
      order: 10,
    },
  })

  return {
    ops,
    summary: `Enlace «${mod.title}» en «${category}»`,
    explanation: `Crear acceso interno a ${mod.route}${wantsPoints ? ' mostrando puntos' : ''}${wantsUser ? ' con usuario en query' : ''}.`,
  }
}

function splitLinkItems(blob) {
  const raw = String(blob || '').trim()
  if (!raw) return []
  const parts = raw
    .split(/\s*(?:,|;)\s*|\s+\by\s+|\s+\be\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
  const out = []
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*\((https?:\/\/[^)]+|\/[^)]+|mailto:[^)]+|tel:[^)]+)\)\s*$/i)
    let titulo
    let target
    if (m) {
      titulo = m[1].trim()
      target = m[2].trim()
    } else {
      const urlAtEnd = part.match(/^(.*?)\s+(https?:\/\/\S+|\/\S+)\s*$/i)
      if (urlAtEnd && urlAtEnd[1].trim()) {
        titulo = urlAtEnd[1].trim()
        target = urlAtEnd[2].trim()
      } else if (/^https?:\/\//i.test(part) || part.startsWith('/')) {
        titulo = part.replace(/^https?:\/\//i, '').split('/')[0] || 'Enlace'
        target = part
      } else {
        titulo = part.replace(/[.。]+$/, '').trim()
        target = PLACEHOLDER_URL
      }
    }
    if (!titulo) continue
    let kind = 'url'
    if (target.startsWith('/')) kind = 'route'
    else if (target.startsWith('mailto:')) {
      kind = 'mailto'
      target = target.replace(/^mailto:/i, '')
    } else if (target.startsWith('tel:')) {
      kind = 'tel'
      target = target.replace(/^tel:/i, '')
    }
    out.push({ titulo: titulo.slice(0, 120), target, kind })
  }
  return out
}

/**
 * Aplica operaciones validadas al tenant.
 * @returns {{ applied: number, results: Array, errors: string[] }}
 */
export async function applyHubOps({ tenantId, ops }) {
  const results = []
  const errors = []
  let applied = 0

  for (const raw of ops || []) {
    try {
      const op = raw.op
      if (op === 'updateLink') {
        if (!mongoose.isValidObjectId(raw.id)) {
          errors.push(`id inválido: ${raw.id}`)
          continue
        }
        const doc = await HubLink.findOne({ _id: raw.id, tenantId })
        if (!doc) {
          errors.push(`Enlace no encontrado: ${raw.id}`)
          continue
        }
        const patch = sanitizeLinkPatch(raw.patch)
        if (patch.featured === true) {
          const cat = patch.category || doc.category || 'General'
          const count = await HubLink.countDocuments({
            tenantId,
            category: cat,
            featured: true,
            _id: { $ne: doc._id },
          })
          if (count >= MAX_QUICK) {
            errors.push(`Sin cupo de rápidos en «${cat}» para ${doc.titulo}`)
            continue
          }
        }
        if (patch.category && patch.category !== doc.category) {
          await HubCategory.findOneAndUpdate(
            { tenantId, nombre: patch.category },
            {
              $setOnInsert: {
                tenantId,
                nombre: patch.category,
                orden: 100,
                activo: true,
                iconSize: 'md',
              },
            },
            { upsert: true },
          )
        }
        Object.assign(doc, patch)
        await doc.save()
        applied += 1
        results.push({ op, id: String(doc._id), ok: true })
      } else if (op === 'updateCategory') {
        const nombre = String(raw.nombre || '').trim()
        const patch = sanitizeCatPatch(raw.patch)
        const r = await HubCategory.updateOne({ tenantId, nombre }, { $set: patch })
        if (!r.matchedCount) {
          errors.push(`Grupo no encontrado: ${nombre}`)
          continue
        }
        applied += 1
        results.push({ op, nombre, ok: true })
      } else if (op === 'setFeatured') {
        const category = String(raw.category || 'General').trim() || 'General'
        const ids = (raw.linkIds || []).map(String).filter((id) => mongoose.isValidObjectId(id)).slice(0, MAX_QUICK)
        await HubLink.updateMany({ tenantId, category }, { $set: { featured: false } })
        if (ids.length) {
          await HubLink.updateMany(
            { tenantId, category, _id: { $in: ids } },
            { $set: { featured: true } },
          )
        }
        applied += 1
        results.push({ op, category, linkIds: ids, ok: true })
      } else if (op === 'reorderLinks') {
        const category = String(raw.category || 'General').trim() || 'General'
        const orderedIds = (raw.orderedIds || []).map(String).filter((id) => mongoose.isValidObjectId(id))
        let order = 10
        for (const id of orderedIds) {
          await HubLink.updateOne({ _id: id, tenantId, category }, { $set: { order } })
          order += 10
        }
        applied += 1
        results.push({ op, category, ok: true })
      } else if (op === 'reorderCategories') {
        const orderedNames = (raw.orderedNames || []).map((n) => String(n).trim()).filter(Boolean)
        let orden = 10
        for (const nombre of orderedNames) {
          await HubCategory.updateOne({ tenantId, nombre }, { $set: { orden } })
          orden += 10
        }
        applied += 1
        results.push({ op, ok: true })
      } else if (op === 'renameCategory') {
        const from = String(raw.from || '').trim()
        const to = String(raw.to || '').trim().slice(0, 80)
        const cat = await HubCategory.findOne({ tenantId, nombre: from })
        if (!cat) {
          errors.push(`Grupo no encontrado: ${from}`)
          continue
        }
        const clash = await HubCategory.findOne({ tenantId, nombre: to })
        if (clash) {
          errors.push(`Ya existe el grupo «${to}»`)
          continue
        }
        cat.nombre = to
        await cat.save()
        await HubLink.updateMany({ tenantId, category: from }, { $set: { category: to } })
        applied += 1
        results.push({ op, from, to, ok: true })
      } else if (op === 'createCategory') {
        const nombre = String(raw.nombre || '').trim().slice(0, 80)
        if (!nombre) {
          errors.push('createCategory sin nombre')
          continue
        }
        const existing = await HubCategory.findOne({ tenantId, nombre }).lean()
        if (existing) {
          results.push({ op, nombre, ok: true, skipped: 'exists' })
          continue
        }
        const patch = sanitizeCatPatch(raw.patch)
        const max = await HubCategory.findOne({ tenantId }).sort({ orden: -1 }).lean()
        const doc = await HubCategory.create({
          tenantId,
          nombre,
          orden: patch.orden != null ? patch.orden : (max?.orden || 0) + 10,
          activo: patch.activo !== false,
          showOnMuro: patch.showOnMuro !== false,
          iconSize: patch.iconSize || 'md',
        })
        applied += 1
        results.push({ op, nombre: doc.nombre, ok: true })
      } else if (op === 'createLink') {
        const link = sanitizeCreateLink(raw.link != null ? raw.link : raw)
        if (!link) {
          errors.push('createLink inválido (faltan título/destino)')
          continue
        }
        await HubCategory.findOneAndUpdate(
          { tenantId, nombre: link.category },
          {
            $setOnInsert: {
              tenantId,
              nombre: link.category,
              orden: 100,
              activo: true,
              iconSize: 'md',
            },
          },
          { upsert: true },
        )
        if (link.featured) {
          const count = await HubLink.countDocuments({
            tenantId,
            category: link.category,
            featured: true,
          })
          if (count >= MAX_QUICK) {
            link.featured = false
            errors.push(`Sin cupo de rápidos en «${link.category}»; «${link.titulo}» quedó sin featured`)
          }
        }
        const doc = await HubLink.create({
          tenantId,
          titulo: link.titulo,
          subtitulo: link.subtitulo || '',
          kind: link.kind,
          target: link.target,
          url: link.target,
          params: link.params || {},
          category: link.category,
          icon: link.icon || 'grid',
          color: link.color || '',
          iconSize: link.iconSize !== undefined ? link.iconSize : null,
          order: link.order != null ? link.order : 100,
          activo: link.activo !== false,
          featured: Boolean(link.featured),
          openMode: link.openMode || openModeForKind(link.kind),
        })
        applied += 1
        results.push({ op, id: String(doc._id), titulo: doc.titulo, category: doc.category, ok: true })
      } else {
        errors.push(`Operación desconocida: ${op}`)
      }
    } catch (e) {
      errors.push(e.message || String(e))
    }
  }

  return { applied, results, errors }
}

const DEST_SYSTEM = `Sos un asistente que completa el DESTINO / link específico de un enlace del hub Connectia.
Respondé SOLO JSON válido:
{
  "summary": "frase corta",
  "explanation": "qué completaste",
  "patch": {
    "kind?": "url|webview|route|request|survey|document|post|mailto|tel|whatsapp|copy",
    "target?": "string",
    "queryJson?": "JSON string o vacío",
    "requestTypeId?": "id del catálogo",
    "surveyId?": "id",
    "docId?": "id",
    "postId?": "id",
    "mailSubject?": "string",
    "mailBody?": "string",
    "waText?": "string",
    "copyText?": "string",
    "copyMessage?": "string",
    "titulo?": "solo si el título actual está vacío",
    "subtitulo?": "opcional"
  }
}

Reglas:
- Respetá el kind actual del draft salvo que el pedido lo cambie claramente.
- Para request/survey/document/post usá SOLO ids del catálogo provisto (match por nombre similar).
- Para url/webview: target DEBE ser una URL http(s) completa.
  * Si el admin escribe el nombre de un sitio sin URL (ej. "página de C5N", "TN", "YouTube"), usá la URL oficial del sitio.
  * Si hay "pistasWeb" en el JSON de entrada, preferí la URL cuyo dominio coincida con el nombre pedido.
  * Nunca dejes target vacío si podés inferir un sitio razonable.
- Para route: target tipo /muro, /solicitudes, /encuestas, /docs.
- Para mailto: target = email; subject/body opcionales.
- Para tel/whatsapp: target = número; waText opcional.
- Para copy: copyText obligatorio.
- No inventes ids de catálogo. Si no hay match, dejá el campo vacío y explicá.
- queryJson debe ser un objeto JSON serializado como string o "".
- Si el título del draft está vacío o es genérico, completá titulo con un nombre corto del sitio.`

/** Sitios frecuentes (AR / globales) para completar URL sin API. */
const KNOWN_SITE_URLS = {
  c5n: 'https://www.c5n.com/',
  tn: 'https://tn.com.ar/',
  clarin: 'https://www.clarin.com/',
  'la nacion': 'https://www.lanacion.com.ar/',
  lanacion: 'https://www.lanacion.com.ar/',
  infobae: 'https://www.infobae.com/',
  pagina12: 'https://www.pagina12.com.ar/',
  'pagina 12': 'https://www.pagina12.com.ar/',
  ole: 'https://www.ole.com.ar/',
  youtube: 'https://www.youtube.com/',
  google: 'https://www.google.com/',
  gmail: 'https://mail.google.com/',
  linkedin: 'https://www.linkedin.com/',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  x: 'https://x.com/',
  twitter: 'https://x.com/',
  mercadolibre: 'https://www.mercadolibre.com.ar/',
  'mercado libre': 'https://www.mercadolibre.com.ar/',
  afip: 'https://www.afip.gob.ar/',
  anses: 'https://www.anses.gob.ar/',
  wikipedia: 'https://es.wikipedia.org/',
}

function extractSiteQuery(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(
      /\b(pagina|paginas|sitio|web|portal|link|enlace|oficial|home|homepage|de|la|el|del|los|las|una|un|www|https?)\b/gi,
      ' ',
    )
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function guessSiteUrlFromPrompt(prompt) {
  const q = extractSiteQuery(prompt)
  if (!q || q.length < 2) return null
  if (KNOWN_SITE_URLS[q]) return { url: KNOWN_SITE_URLS[q], label: q }
  for (const [key, url] of Object.entries(KNOWN_SITE_URLS)) {
    if (q.includes(key) || key.includes(q)) return { url, label: key }
  }
  // slug simple: "mi empresa" → no; "c5n" / "github" → https://www.{slug}.com
  if (/^[a-z0-9][a-z0-9-]{1,40}$/.test(q) && !/^(com|ar|org|net|io)$/.test(q)) {
    return { url: `https://www.${q}.com/`, label: q }
  }
  return null
}

function pickOfficialUrlFromHints(items, prompt) {
  const list = Array.isArray(items) ? items : []
  const q = extractSiteQuery(prompt).replace(/\s+/g, '')
  const scored = []
  for (const it of list) {
    const url = String(it?.url || it?.link || '').trim()
    if (!/^https?:\/\//i.test(url)) continue
    if (/duckduckgo\.com|google\.com\/search|bing\.com/i.test(url)) continue
    try {
      const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
      let score = 1
      if (q && (host.includes(q) || host.split('.')[0] === q)) score += 10
      if (/\.(com|com\.ar|gob\.ar|org|net)(\/|$)/i.test(url)) score += 1
      scored.push({ url, score, title: it.title || '' })
    } catch {
      /* ignore */
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored[0] || null
}

/**
 * Completa campos de destino de un enlace (sin persistir).
 * @param {{ prompt: string, draft?: object, catalog?: object, brandName?: string }} opts
 */
export async function suggestHubDestinationFromPrompt({
  prompt,
  draft = {},
  catalog = {},
  brandName = '',
} = {}) {
  const clean = String(prompt || '').trim()
  if (clean.length < 4) {
    const err = new Error('Escribí qué destino querés (mín. 4 caracteres)')
    err.status = 400
    throw err
  }

  const kind = normalizeHubKind(draft.kind || 'url')
  let webHints = []
  if ((kind === 'url' || kind === 'webview') && !/https?:\/\//i.test(clean)) {
    try {
      const res = await searchWebNews(`${clean} sitio oficial`, { limit: 5 })
      webHints = (res.items || []).slice(0, 5).map((i) => ({
        title: i.title || '',
        url: i.url || i.link || '',
      })).filter((i) => i.url)
    } catch {
      webHints = []
    }
  }

  const user = JSON.stringify(
    {
      pedido: clean,
      marca: brandName || '',
      draftActual: {
        titulo: draft.titulo || '',
        subtitulo: draft.subtitulo || '',
        kind,
        category: draft.category || '',
        target: draft.target || '',
        queryJson: draft.queryJson || '',
        requestTypeId: draft.requestTypeId || '',
        surveyId: draft.surveyId || '',
        docId: draft.docId || '',
        postId: draft.postId || '',
        mailSubject: draft.mailSubject || '',
        mailBody: draft.mailBody || '',
        waText: draft.waText || '',
        copyText: draft.copyText || '',
        copyMessage: draft.copyMessage || '',
      },
      pistasWeb: webHints,
      catalogo: {
        requestTypes: (catalog.requestTypes || []).slice(0, 80).map((t) => ({
          id: t.id,
          nombre: t.nombre,
          area: t.area || '',
        })),
        surveys: (catalog.surveys || []).slice(0, 80).map((s) => ({ id: s.id, titulo: s.titulo })),
        documents: (catalog.documents || []).slice(0, 80).map((d) => ({
          id: d.id,
          titulo: d.titulo,
          category: d.category || '',
        })),
        posts: (catalog.posts || []).slice(0, 80).map((p) => ({ id: p.id, titulo: p.titulo })),
        rutasComunes: ['/muro', '/solicitudes', '/encuestas', '/docs', '/accesos', '/guardados', '/chat'],
      },
    },
    null,
    2,
  )

  function enrichUrlPatch(result) {
    const patch = { ...(result.patch || {}) }
    if ((kind === 'url' || kind === 'webview' || patch.kind === 'url' || patch.kind === 'webview') && !String(patch.target || '').trim()) {
      const fromWeb = pickOfficialUrlFromHints(webHints, clean)
      const fromGuess = guessSiteUrlFromPrompt(clean)
      if (fromWeb?.url) {
        patch.target = fromWeb.url
        if (!String(draft.titulo || '').trim() && !patch.titulo) {
          patch.titulo = String(fromWeb.title || extractSiteQuery(clean) || 'Enlace').slice(0, 80)
        }
      } else if (fromGuess?.url) {
        patch.target = fromGuess.url
        if (!String(draft.titulo || '').trim() && !patch.titulo) {
          patch.titulo = String(fromGuess.label || 'Enlace').slice(0, 80)
        }
      }
    }
    const sanitized = sanitizeDestinationPatch(patch, draft, catalog)
    if (!Object.keys(sanitized).length) {
      return {
        summary: result.summary || 'No pude inferir el link',
        explanation:
          result.explanation ||
          'No encontré una URL clara. Probá con la dirección completa (https://…) o el nombre exacto del sitio.',
        patch: {},
        source: result.source,
        configured: result.configured,
        aiError: result.aiError,
      }
    }
    return {
      ...result,
      summary: result.summary || 'Link completado',
      explanation: result.explanation || '',
      patch: sanitized,
    }
  }

  if (!hubAiConfigured()) {
    return enrichUrlPatch({
      ...heuristicSuggestDestination(clean, draft, catalog),
      source: 'heuristic',
      configured: false,
    })
  }

  try {
    const raw = await generateRaw(DEST_SYSTEM, user, { maxTokens: 1200 })
    const parsed = parseJson(raw)
    const patch = sanitizeDestinationPatch(parsed.patch, draft, catalog)
    if (!Object.keys(patch).length) {
      return enrichUrlPatch({
        ...heuristicSuggestDestination(clean, draft, catalog),
        source: 'heuristic',
        configured: true,
        aiError: 'La IA no devolvió un destino usable; usé reglas locales',
      })
    }
    return enrichUrlPatch({
      summary: String(parsed.summary || 'Destino sugerido').slice(0, 240),
      explanation: String(parsed.explanation || '').slice(0, 2000),
      patch,
      source: 'ai',
      configured: true,
    })
  } catch (e) {
    return enrichUrlPatch({
      ...heuristicSuggestDestination(clean, draft, catalog),
      source: 'heuristic',
      configured: true,
      aiError: e.message || 'IA falló; usé reglas locales',
    })
  }
}

function findCatalogMatch(list, prompt, nameKey = 'nombre') {
  const q = String(prompt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (!Array.isArray(list) || !list.length) return null
  let best = null
  let bestScore = 0
  for (const item of list) {
    const name = String(item[nameKey] || item.titulo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
    if (!name) continue
    if (q.includes(name) || name.includes(q.slice(0, Math.min(q.length, 24)))) {
      const score = name.length
      if (score > bestScore) {
        best = item
        bestScore = score
      }
    }
  }
  return best
}

/** Heurística local para completar destino sin API. */
export function heuristicSuggestDestination(prompt, draft = {}, catalog = {}) {
  const clean = String(prompt || '').trim()
  const kind = normalizeHubKind(draft.kind || 'url')
  const patch = {}
  const lower = clean.toLowerCase()

  const urlMatch = clean.match(/https?:\/\/[^\s)"']+/i)
  const emailMatch = clean.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  const phoneMatch = clean.match(/(?:\+?\d[\d\s().-]{6,}\d)/)
  const routeMatch = clean.match(/(^|\s)(\/[a-z0-9/_-]{1,60})/i)
  const waMatch = clean.match(/wa\.me\/(\d+)/i) || clean.match(/whatsapp[^\d]*(\d{8,15})/i)

  if (kind === 'request') {
    const hit = findCatalogMatch(catalog.requestTypes, clean, 'nombre')
    if (hit) patch.requestTypeId = hit.id
  } else if (kind === 'survey') {
    const hit = findCatalogMatch(catalog.surveys, clean, 'titulo')
    if (hit) patch.surveyId = hit.id
  } else if (kind === 'document') {
    const hit = findCatalogMatch(catalog.documents, clean, 'titulo')
    if (hit) patch.docId = hit.id
  } else if (kind === 'post') {
    const hit = findCatalogMatch(catalog.posts, clean, 'titulo')
    if (hit) patch.postId = hit.id
  } else if (kind === 'mailto' || (/correo|email|mail|mailto/.test(lower) && emailMatch)) {
    if (kind !== 'mailto') patch.kind = 'mailto'
    if (emailMatch) patch.target = emailMatch[0]
    const subj = clean.match(/asunto[:\s]+["“]?([^"”\n]+)/i)
    const body = clean.match(/cuerpo[:\s]+["“]?([^"”\n]+)/i)
    if (subj) patch.mailSubject = subj[1].trim().slice(0, 200)
    if (body) patch.mailBody = body[1].trim().slice(0, 2000)
  } else if (kind === 'whatsapp' || /whatsapp|wa\.me/.test(lower)) {
    if (kind !== 'whatsapp') patch.kind = 'whatsapp'
    if (waMatch) patch.target = waMatch[1]
    else if (phoneMatch) patch.target = phoneMatch[0].replace(/\D+/g, '')
    const msg = clean.match(/mensaje[:\s]+["“]?([^"”\n]+)/i)
    if (msg) patch.waText = msg[1].trim().slice(0, 500)
  } else if (kind === 'tel' || /\btel(éfono|efono)?\b|llamar/.test(lower)) {
    if (kind !== 'tel') patch.kind = 'tel'
    if (phoneMatch) patch.target = phoneMatch[0].replace(/\D+/g, '')
  } else if (kind === 'copy' || /copiar|código|codigo|clipboard/.test(lower)) {
    if (kind !== 'copy') patch.kind = 'copy'
    const code = clean.match(/["“']([^"”']{2,80})["”']/) || clean.match(/\b([A-Z0-9][A-Z0-9_-]{3,})\b/)
    if (code) patch.copyText = code[1]
    else patch.copyText = clean.slice(0, 120)
    patch.copyMessage = 'Copiado al portapapeles'
  } else if (kind === 'route' || (routeMatch && !urlMatch && /ruta|pantalla|ir a \//.test(lower))) {
    if (kind !== 'route' && routeMatch) patch.kind = 'route'
    if (routeMatch) patch.target = routeMatch[2]
    else if (/^\/[a-z0-9/_-]+$/i.test(clean)) patch.target = clean
  } else if (urlMatch || kind === 'url' || kind === 'webview') {
    if (urlMatch) patch.target = urlMatch[0].replace(/[.,;]+$/, '')
    else if (/^https?:\/\//i.test(clean)) patch.target = clean
    else {
      const guess = guessSiteUrlFromPrompt(clean)
      if (guess?.url) {
        patch.target = guess.url
        if (!String(draft.titulo || '').trim()) {
          patch.titulo = String(guess.label || 'Enlace')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .slice(0, 80)
        }
      }
    }
  }

  if (!Object.keys(patch).length) {
    return {
      summary: 'No pude inferir el link',
      explanation:
        'No encontré una URL clara. Probá con la dirección completa (https://…) o el nombre del sitio (ej. «página de C5N»).',
      patch: {},
    }
  }

  return {
    summary: 'Destino completado',
    explanation: 'Completé el destino con reglas locales (sin IA externa).',
    patch: sanitizeDestinationPatch(patch, draft, catalog),
  }
}

function sanitizeDestinationPatch(raw, draft = {}, catalog = {}) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  const kindHint = raw.kind != null ? normalizeHubKind(raw.kind) : null
  if (kindHint && HUB_KIND_IDS.includes(kindHint)) out.kind = kindHint
  const kind = out.kind || normalizeHubKind(draft.kind || 'url')

  const str = (v, max) => {
    if (v == null) return undefined
    const s = String(v).trim()
    if (!s) return undefined
    return s.slice(0, max)
  }

  if (raw.target != null) {
    const t = str(raw.target, 2000)
    if (t) out.target = t
  }
  if (raw.queryJson != null) {
    const q = String(raw.queryJson || '').trim()
    if (!q) out.queryJson = ''
    else {
      try {
        const obj = typeof raw.queryJson === 'object' ? raw.queryJson : JSON.parse(q)
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) out.queryJson = JSON.stringify(obj)
      } catch {
        /* ignore bad json */
      }
    }
  }

  const idIn = (list, id) => (list || []).some((x) => String(x.id) === String(id))

  if (kind === 'request' && raw.requestTypeId && idIn(catalog.requestTypes, raw.requestTypeId)) {
    out.requestTypeId = String(raw.requestTypeId)
  }
  if (kind === 'survey' && raw.surveyId && idIn(catalog.surveys, raw.surveyId)) {
    out.surveyId = String(raw.surveyId)
  }
  if (kind === 'document' && raw.docId && idIn(catalog.documents, raw.docId)) {
    out.docId = String(raw.docId)
  }
  if (kind === 'post' && raw.postId && idIn(catalog.posts, raw.postId)) {
    out.postId = String(raw.postId)
  }

  const mailSubject = str(raw.mailSubject, 200)
  const mailBody = str(raw.mailBody, 2000)
  const waText = str(raw.waText, 500)
  const copyText = str(raw.copyText, 2000)
  const copyMessage = str(raw.copyMessage, 120)
  if (mailSubject) out.mailSubject = mailSubject
  if (mailBody) out.mailBody = mailBody
  if (waText) out.waText = waText
  if (copyText) out.copyText = copyText
  if (copyMessage) out.copyMessage = copyMessage

  if (!String(draft.titulo || '').trim()) {
    const titulo = str(raw.titulo, 120)
    if (titulo) out.titulo = titulo
  }
  const subtitulo = str(raw.subtitulo, 200)
  if (subtitulo) out.subtitulo = subtitulo

  return out
}
