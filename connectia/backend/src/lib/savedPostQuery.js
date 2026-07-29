/** Tipos y orígenes válidos para filtrar guardados (misma semántica que el feed). */
export const SAVED_TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']
export const SAVED_ORIGINS = ['admin', 'member']

/**
 * Normaliza query params de GET /posts/saved.
 * @param {Record<string, unknown>} query
 */
export function parseSavedListQuery(query = {}) {
  const q = String(query.q || '').trim()
  const tipoRaw = String(query.tipo || '').trim().toLowerCase()
  const originRaw = String(query.origin || '').trim().toLowerCase()
  const tipo = SAVED_TIPOS.includes(tipoRaw) ? tipoRaw : ''
  const origin = SAVED_ORIGINS.includes(originRaw) ? originRaw : ''
  const text = q.length >= 2 ? q : ''
  return {
    q: text,
    tipo,
    origin,
    hasFilters: Boolean(text || tipo || origin),
  }
}

/**
 * Condiciones adicionales sobre Post para filtrar guardados.
 * @param {{ q?: string, tipo?: string, origin?: string }} filters
 * @returns {object[]}
 */
export function savedPostFilterClauses(filters = {}) {
  const clauses = []
  const tipo = String(filters.tipo || '').trim().toLowerCase()
  const origin = String(filters.origin || '').trim().toLowerCase()
  const q = String(filters.q || '').trim()
  if (SAVED_TIPOS.includes(tipo)) clauses.push({ tipo })
  if (SAVED_ORIGINS.includes(origin)) clauses.push({ origin })
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
