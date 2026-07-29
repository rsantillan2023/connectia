/**
 * IA operador del hub de enlaces: planifica y aplica cambios
 * (colores, tamaños, featured, órdenes, títulos, etc.).
 */
import mongoose from 'mongoose'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { HUB_ICONS } from '../lib/hubIcons.js'
import { HUB_KIND_IDS } from '../lib/hubKinds.js'

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_MESSAGES = 'https://api.anthropic.com/v1/messages'
const MAX_QUICK = 3
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
    'Los grupos son pestañas en la app. Hasta 3 accesos rápidos (featured) por grupo se muestran como botones redondeados en el muro y en /accesos. El grupo completo de enlaces no se lista en el muro: ahí solo van los rápidos. Podés ocultar un grupo solo del muro (sigue en /accesos) con showOnMuro=false.',
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
    'setFeatured — fija exactamente los rápidos de un grupo (lista de ids, máx. 3)',
    'reorderLinks — orderedIds dentro de un grupo',
    'reorderCategories — orderedNames de pestañas',
    'renameCategory — from → to',
  ],
  examples: [
    'Marcá como rápidos Portal, Nómina y Vacaciones en RRHH',
    'Poné todos los iconos en mediano y color #0F766E en TI',
    'Ordená los grupos: Connectia, TI, RRHH, Comunicación',
    'Dejá solo 3 rápidos por grupo: los de más clics',
    'Ocultá el grupo Comunicación y activá todos los enlaces de TI',
    'No muestres el grupo Comunicación en el muro',
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
3) {"op":"setFeatured","category":"<grupo>","linkIds":["id1","id2","id3"]}  // máx 3; reemplaza los rápidos del grupo
4) {"op":"reorderLinks","category":"<grupo>","orderedIds":["id","id",...]}
5) {"op":"reorderCategories","orderedNames":["GrupoA","GrupoB"]}
6) {"op":"renameCategory","from":"...","to":"..."}

Reglas:
- Máximo ${MAX_QUICK} featured por category. Preferí setFeatured para eso.
- No inventes ids: usá solo los del snapshot.
- icon debe ser uno de: ${[...ICON_IDS].join(', ')}
- color en hex (#RRGGBB) o "" para quitar.
- No borres enlaces. No crees enlaces nuevos.
- Si el pedido es ambiguo, pedí aclaración con ops:[] y explanation preguntando.
- Si pide estética “como Mercado Pago”: iconSize md, hasta 3 featured por grupo, colores de acento coherentes con la marca si hay brandColor.`

/**
 * Plan desde prompt (IA o heurística).
 */
export async function planHubOpsFromPrompt({
  prompt,
  categories,
  links,
  brandName = '',
  brandColor = '',
}) {
  const clean = String(prompt || '').trim()
  if (clean.length < 6) {
    const err = new Error('Escribí un pedido más claro (mín. 6 caracteres)')
    err.status = 400
    throw err
  }

  const snap = snapshotForPrompt({ categories, links })
  const user = JSON.stringify(
    {
      pedido: clean,
      marca: { nombre: brandName || '', color: brandColor || '' },
      estadoActual: snap,
      guiaRapida: {
        maxFeaturedPorGrupo: MAX_QUICK,
        iconSizes: ['sm', 'md', 'lg'],
        ejemplos: HUB_AI_GUIDE.examples,
      },
    },
    null,
    2,
  )

  if (!hubAiConfigured()) {
    return {
      ...heuristicPlan(clean, snap, brandColor),
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
    const fallback = heuristicPlan(clean, snap, brandColor)
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
    }
  }
  return out
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
export function heuristicPlan(prompt, snap, brandColor = '') {
  const p = String(prompt || '').toLowerCase()
  const ops = []
  const explanations = []

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
        'No pude interpretar el pedido con reglas locales. Configurá OPENAI_API_KEY / ANTHROPIC_API_KEY o probá ejemplos: “Marcá como rápidos…”, “Poné iconos medianos”, “Ordená los grupos: A, B, C”.',
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
      } else {
        errors.push(`Operación desconocida: ${op}`)
      }
    } catch (e) {
      errors.push(e.message || String(e))
    }
  }

  return { applied, results, errors }
}
