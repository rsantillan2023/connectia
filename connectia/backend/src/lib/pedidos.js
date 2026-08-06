/** Transiciones válidas Pedido (Ola 25). */
export const PEDIDO_TRANSITIONS = {
  abierta: ['en_curso', 'cancelada', 'cerrada'],
  en_curso: ['cerrada', 'cancelada'],
  cerrada: [],
  cancelada: [],
}

export function canTransitionPedido(from, to) {
  const f = String(from || '')
  const t = String(to || '')
  return (PEDIDO_TRANSITIONS[f] || []).includes(t)
}

export function normalizeGeo(raw) {
  if (!raw || typeof raw !== 'object') return null
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  const accuracy =
    raw.accuracy != null && Number.isFinite(Number(raw.accuracy))
      ? Number(raw.accuracy)
      : null
  let capturedAt = null
  if (raw.capturedAt) {
    const d = new Date(raw.capturedAt)
    if (!Number.isNaN(d.getTime())) capturedAt = d
  }
  const permission = ['granted', 'denied', 'prompt', 'unavailable'].includes(
    String(raw.permission || ''),
  )
    ? String(raw.permission)
    : lat != null
      ? 'granted'
      : ''
  return { lat, lng, accuracy, capturedAt, permission }
}

export function pedidoHasGeo(pedido) {
  const g = pedido?.geo
  return Boolean(
    g &&
      Number.isFinite(Number(g.lat)) &&
      Number.isFinite(Number(g.lng)),
  )
}

/** Filtro Mongo para pedidos con coordenadas reales. */
export function geoMapFilter(extra = {}) {
  return {
    ...extra,
    'geo.lat': { $type: 'number' },
    'geo.lng': { $type: 'number' },
  }
}

export function serializeCategory(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    name: doc.name,
    colorMap: doc.colorMap || '#dc2626',
    receptorUserIds: (doc.receptorUserIds || []).map(String),
    requireGps: !!doc.requireGps,
    requirePhoto: !!doc.requirePhoto,
    defaultForAlarm: !!doc.defaultForAlarm,
    active: doc.active !== false,
    order: doc.order ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeArticle(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    label: doc.label,
    description: doc.description || '',
    unit: doc.unit || 'u',
    categoryId: doc.categoryId ? String(doc.categoryId) : null,
    active: doc.active !== false,
    order: doc.order ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializePedido(doc, extras = {}) {
  if (!doc) return null
  const geo = pedidoHasGeo(doc)
    ? {
        lat: doc.geo.lat,
        lng: doc.geo.lng,
        accuracy: doc.geo.accuracy ?? null,
        capturedAt: doc.geo.capturedAt || null,
        permission: doc.geo.permission || '',
      }
    : null
  return {
    id: String(doc._id),
    number: doc.number,
    source: doc.source,
    categoryId: doc.categoryId ? String(doc.categoryId) : null,
    priority: doc.priority || 'normal',
    status: doc.status,
    closeReason: doc.closeReason || '',
    note: doc.note || '',
    attachments: doc.attachments || [],
    geo,
    items: (doc.items || []).map((it) => ({
      articleId: it.articleId ? String(it.articleId) : null,
      label: it.label || '',
      qty: it.qty ?? 1,
      unit: it.unit || 'u',
    })),
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : null,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    history: (doc.history || []).map((h) => ({
      at: h.at,
      actorId: h.actorId ? String(h.actorId) : null,
      from: h.from || '',
      to: h.to,
      reason: h.reason || '',
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...extras,
  }
}

export function buildHistoryEntry({ actorId, from, to, reason }) {
  return {
    at: new Date(),
    actorId: actorId || null,
    from: from || '',
    to,
    reason: String(reason || '').slice(0, 500),
  }
}
