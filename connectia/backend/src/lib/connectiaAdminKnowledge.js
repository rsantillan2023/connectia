/**
 * Base de conocimientos de producto Admin (paridad Hiryx `aitalentKnowledgeBase`).
 * Fuente: JSON en `src/data/connectiaAdminKnowledgeBase.json` — se usa como contexto
 * del asistente channel=a (heurística + LLM).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const JSON_PATH = join(__dirname, '../data/connectiaAdminKnowledgeBase.json')

let cached = null

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function loadAdminProductKnowledge() {
  if (cached) return cached
  const raw = readFileSync(JSON_PATH, 'utf8')
  cached = JSON.parse(raw)
  return cached
}

/** Test helper / hot-reload en scripts. */
export function resetAdminProductKnowledgeCache() {
  cached = null
}

export function getAdminProductKnowledgeMeta() {
  const kb = loadAdminProductKnowledge()
  return kb.meta || {}
}

/**
 * Score simple por tokens del query vs título/aliases/tags/cuerpo.
 * @returns {Array<{ id: string, titulo: string, ruta: string|null, categoria: string, cuerpo: string, excerpt: string, score: number, href: string }>}
 */
export function searchAdminProductKnowledge(q, { limit = 5 } = {}) {
  const kb = loadAdminProductKnowledge()
  const query = norm(q)
  if (!query) return []
  const tokens = query.split(/\s+/).filter((t) => t.length > 2)
  const articles = Array.isArray(kb.articles) ? kb.articles : []

  const scored = []
  for (const a of articles) {
    const blob = norm(
      [a.titulo, ...(a.aliases || []), ...(a.tags || []), a.cuerpo, a.ruta].filter(Boolean).join(' '),
    )
    let score = 0
    if (blob.includes(query)) score += 12
    for (const t of tokens) {
      if (blob.includes(t)) score += 2
      if (norm(a.titulo).includes(t)) score += 3
      if ((a.aliases || []).some((x) => norm(x).includes(t) || t.includes(norm(x)))) score += 4
    }
    // Equivalencias
    for (const eq of kb.equivalencias || []) {
      if ((eq.nombres || []).some((n) => query.includes(norm(n)) || norm(n).includes(query))) {
        if (eq.ruta && eq.ruta === a.ruta) score += 6
      }
    }
    if (score > 0) {
      scored.push({
        id: a.id,
        titulo: a.titulo,
        ruta: a.ruta || null,
        categoria: a.categoria || 'guia',
        cuerpo: a.cuerpo || '',
        excerpt: String(a.cuerpo || '').slice(0, 220),
        score,
        href: a.ruta || '/asistente-kb',
      })
    }
  }
  scored.sort((x, y) => y.score - x.score || x.titulo.localeCompare(y.titulo))
  return scored.slice(0, Math.max(1, Math.min(20, limit)))
}

/**
 * Resuelve equivalencia de nombre de pantalla → ruta.
 */
export function matchAdminEquivalencia(text) {
  const kb = loadAdminProductKnowledge()
  const t = norm(text)
  for (const eq of kb.equivalencias || []) {
    if ((eq.nombres || []).some((n) => t.includes(norm(n)))) {
      return { label: eq.nombres[0], ruta: eq.ruta, nota: eq.nota || '' }
    }
  }
  return null
}

export function formatAdminProductKbAnswer(hits) {
  if (!hits?.length) {
    return {
      text:
        'No encontré eso en la base de producto del Admin. Probá «dónde están los usuarios» o abrí «Funciones de Administración». También podés sumar un artículo en /asistente-kb.',
      links: [
        { label: 'Base de conocimientos', href: '/asistente-kb' },
        { label: 'Usuarios', href: '/usuarios' },
      ],
      sources: [],
    }
  }
  const best = hits[0]
  const extras = hits
    .slice(0, 4)
    .map((h, i) => `${i + 1}. ${h.titulo}${h.ruta ? ` (${h.ruta})` : ''}`)
    .join('\n')
  const body = String(best.cuerpo || best.excerpt || '').slice(0, 700)
  return {
    text: `Según la base de conocimientos del Admin:\n\n**${best.titulo}**${best.ruta ? ` · ${best.ruta}` : ''}\n\n${body}\n\nFuentes:\n${extras}`,
    links: hits
      .filter((h) => h.href)
      .slice(0, 5)
      .map((h) => ({ label: h.titulo, href: h.href })),
    sources: hits.map((h) => ({
      kind: 'product_kb',
      id: h.id,
      titulo: h.titulo,
      href: h.href,
      excerpt: h.excerpt,
    })),
  }
}

/**
 * Bloque de contexto para el LLM (recortado).
 */
export function buildAdminProductContextForAi(userText, { limit = 4 } = {}) {
  const kb = loadAdminProductKnowledge()
  const hits = searchAdminProductKnowledge(userText, { limit })
  return {
    meta: kb.meta,
    overview: kb.overview,
    hits: hits.map((h) => ({
      id: h.id,
      titulo: h.titulo,
      ruta: h.ruta,
      cuerpo: h.cuerpo,
    })),
    equivalencia: matchAdminEquivalencia(userText),
  }
}
