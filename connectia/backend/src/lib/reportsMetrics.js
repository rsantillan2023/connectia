/** Helpers puros de reportes (§29 núcleo) — testables sin Mongo. */

/**
 * @param {Date|string|null|undefined} raw
 * @param {'start'|'end'} edge
 */
export function parseReportDate(raw, edge = 'start') {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T${edge === 'end' ? '23:59:59.999' : '00:00:00.000'}Z`)
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/**
 * Ventana por defecto: últimos 30 días hasta ahora.
 * @param {{ from?: string, to?: string }} query
 */
export function resolveReportWindow(query = {}) {
  const to = parseReportDate(query.to, 'end') || new Date()
  let from = parseReportDate(query.from, 'start')
  if (!from) {
    from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
    from.setUTCHours(0, 0, 0, 0)
  }
  if (from > to) {
    const err = new Error('from no puede ser posterior a to')
    err.status = 400
    throw err
  }
  return { from, to }
}

/**
 * Clasifica usuarios para tablero de adopción.
 * Activo = lastLoginAt dentro de [from, to].
 * Nunca = sin lastLoginAt.
 * Inactivo = tiene lastLoginAt pero fuera de la ventana (o anterior a from).
 *
 * @param {Array<{ id: string, lastLoginAt?: Date|null, activo?: boolean }>} users
 * @param {{ from: Date, to: Date }} window
 */
export function computeAdoption(users, window) {
  const list = Array.isArray(users) ? users : []
  const { from, to } = window
  let active = 0
  let inactive = 0
  let never = 0
  const activeIds = []
  const inactiveIds = []
  const neverIds = []

  for (const u of list) {
    if (u.activo === false) continue
    const id = String(u.id)
    const last = u.lastLoginAt ? new Date(u.lastLoginAt) : null
    if (!last || Number.isNaN(last.getTime())) {
      never += 1
      neverIds.push(id)
      continue
    }
    if (last >= from && last <= to) {
      active += 1
      activeIds.push(id)
    } else {
      inactive += 1
      inactiveIds.push(id)
    }
  }

  const considered = active + inactive + never
  const pctAdopcion = considered ? Math.round((active / considered) * 1000) / 10 : 0
  return {
    active,
    inactive,
    never,
    considered,
    pctAdopcion,
    activeIds,
    inactiveIds,
    neverIds,
  }
}

/**
 * Engagement de una publicación.
 * @param {{ reactions?: Record<string, number>, commentCount?: number, saveCount?: number, viewCount?: number, uniqueViews?: number }} post
 */
export function postEngagement(post) {
  const r = post?.reactions || {}
  const reactions =
    Number(r.like || 0) +
    Number(r.love || 0) +
    Number(r.laugh || 0) +
    Number(r.fire || 0) +
    Number(r.wow || 0) +
    Number(r.clap || 0)
  const comments = Number(post?.commentCount || 0)
  const saves = Number(post?.saveCount || 0)
  const views = Number(post?.uniqueViews ?? post?.viewCount ?? 0)
  return {
    reactions,
    comments,
    saves,
    views,
    engagement: reactions + comments + saves + views,
  }
}

/**
 * Ranking: por defecto engagement; sort=views|engagement|reactions.
 * @param {Array<object>} posts
 * @param {number} [limit=50]
 * @param {'engagement'|'views'|'reactions'} [sortBy='engagement']
 */
export function rankPostsByEngagement(posts, limit = 50, sortBy = 'engagement') {
  const scored = (Array.isArray(posts) ? posts : []).map((p) => {
    const m = postEngagement(p)
    return { ...p, ...m }
  })
  const key = sortBy === 'views' ? 'views' : sortBy === 'reactions' ? 'reactions' : 'engagement'
  scored.sort((a, b) => {
    if (b[key] !== a[key]) return b[key] - a[key]
    if (b.engagement !== a.engagement) return b.engagement - a.engagement
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    if (tb !== ta) return tb - ta
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
  return scored.slice(0, Math.max(1, Number(limit) || 50))
}

/** Agrupa conteos por clave (ej. estado de solicitud). */
export function countByKey(items, keyFn) {
  const out = {}
  for (const item of items || []) {
    const k = String(keyFn(item) || 'otro')
    out[k] = (out[k] || 0) + 1
  }
  return out
}

/**
 * Agrega RSVPs por evento para el reporte dedicado (§29.03).
 * @param {Array<{ id: string, titulo?: string, inicio?: Date|string|null, status?: string, cupo?: number|null }>} events
 * @param {Array<{ eventId: string, estado?: string }>} rsvps
 */
export function aggregateEventRsvps(events, rsvps) {
  const byEvent = {}
  for (const r of rsvps || []) {
    const id = String(r.eventId || '')
    if (!id) continue
    if (!byEvent[id]) byEvent[id] = { confirmados: 0, rechazados: 0 }
    if (r.estado === 'confirmado') byEvent[id].confirmados += 1
    else if (r.estado === 'rechazado') byEvent[id].rechazados += 1
  }

  const items = (Array.isArray(events) ? events : []).map((e) => {
    const id = String(e.id)
    const a = byEvent[id] || { confirmados: 0, rechazados: 0 }
    const total = a.confirmados + a.rechazados
    const cupo = e.cupo == null || e.cupo === '' ? null : Number(e.cupo)
    return {
      id,
      titulo: e.titulo || '',
      inicio: e.inicio || null,
      status: e.status || '',
      cupo: Number.isFinite(cupo) ? cupo : null,
      confirmados: a.confirmados,
      rechazados: a.rechazados,
      total,
      pctConfirmados: total ? Math.round((a.confirmados / total) * 1000) / 10 : 0,
    }
  })

  items.sort((a, b) => {
    if (b.confirmados !== a.confirmados) return b.confirmados - a.confirmados
    if (b.total !== a.total) return b.total - a.total
    return String(a.titulo).localeCompare(String(b.titulo))
  })

  const confirmados = items.reduce((s, i) => s + i.confirmados, 0)
  const rechazados = items.reduce((s, i) => s + i.rechazados, 0)
  const totalRsvps = confirmados + rechazados
  return {
    items,
    totals: {
      events: items.length,
      confirmados,
      rechazados,
      totalRsvps,
      pctConfirmados: totalRsvps ? Math.round((confirmados / totalRsvps) * 1000) / 10 : 0,
    },
  }
}

/**
 * Convierte filas a payload de export CSV.
 * @param {string[]} fields
 * @param {Array<Record<string, unknown>>} rows
 */
export function toExportPayload(fields, rows) {
  const cols = Array.isArray(fields) ? fields : []
  return {
    fields: cols,
    rows: (Array.isArray(rows) ? rows : []).map((r) => {
      const line = {}
      for (const f of cols) line[f] = r[f] == null ? '' : r[f]
      return line
    }),
  }
}
