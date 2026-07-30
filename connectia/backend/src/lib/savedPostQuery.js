/** Tipos y orígenes válidos para filtrar guardados / feed (misma semántica). */
export const SAVED_TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']
export const SAVED_ORIGINS = ['admin', 'member']

/**
 * Normaliza query params de GET /posts/saved y /posts/feed.
 * Soporta deep links externos: ?q=&tipo=&origin=&section=&knowledge=1 (Ola 3 · 04.15).
 * @param {Record<string, unknown>} query
 */
export function parseSavedListQuery(query = {}) {
  const q = String(query.q || '').trim()
  const tipoRaw = String(query.tipo || '').trim().toLowerCase()
  const originRaw = String(query.origin || '').trim().toLowerCase()
  const section = String(query.section || '').trim().slice(0, 80)
  const knowledgeRaw = String(query.knowledge ?? query.isKnowledge ?? '').trim().toLowerCase()
  const knowledge =
    knowledgeRaw === '1' ||
    knowledgeRaw === 'true' ||
    knowledgeRaw === 'si' ||
    knowledgeRaw === 'sí' ||
    knowledgeRaw === 'yes'
  const tipo = SAVED_TIPOS.includes(tipoRaw) ? tipoRaw : ''
  const origin = SAVED_ORIGINS.includes(originRaw) ? originRaw : ''
  const text = q.length >= 2 ? q : ''
  return {
    q: text,
    tipo,
    origin,
    section,
    knowledge,
    hasFilters: Boolean(text || tipo || origin || section || knowledge),
  }
}

/**
 * Condiciones adicionales sobre Post para filtrar feed/guardados.
 * @param {{ q?: string, tipo?: string, origin?: string, section?: string, knowledge?: boolean }} filters
 * @returns {object[]}
 */
export function savedPostFilterClauses(filters = {}) {
  const clauses = []
  const tipo = String(filters.tipo || '').trim().toLowerCase()
  const origin = String(filters.origin || '').trim().toLowerCase()
  const section = String(filters.section || '').trim()
  const q = String(filters.q || '').trim()
  if (SAVED_TIPOS.includes(tipo)) clauses.push({ tipo })
  if (SAVED_ORIGINS.includes(origin)) clauses.push({ origin })
  if (section) clauses.push({ section: { $regex: `^${escapeRegex(section)}$`, $options: 'i' } })
  if (filters.knowledge) clauses.push({ isKnowledge: true })
  if (q.length >= 2) {
    clauses.push({
      $or: [
        { titulo: { $regex: q, $options: 'i' } },
        { cuerpo: { $regex: q, $options: 'i' } },
      ],
    })
  }
  return clauses
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
