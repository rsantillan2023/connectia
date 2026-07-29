/**
 * Helpers puros para reporte de lecturas de campañas push/in-app.
 */

export function campaignNotifBaseFilter(tenantId, campaignId) {
  return {
    tenantId,
    refType: 'push_campaign',
    refId: campaignId,
  }
}

/** @param {'all'|'read'|'unread'} status */
export function campaignNotifFilter(tenantId, campaignId, { status = 'all' } = {}) {
  const filter = campaignNotifBaseFilter(tenantId, campaignId)
  if (status === 'read') filter.readAt = { $ne: null }
  else if (status === 'unread') filter.readAt = null
  return filter
}

export function computeReadSummary({
  inAppTotal = 0,
  readCount = 0,
  campaignStats = null,
  byArea = [],
} = {}) {
  const total = Math.max(0, Number(inAppTotal) || 0)
  const read = Math.max(0, Math.min(total, Number(readCount) || 0))
  const unreadCount = Math.max(0, total - read)
  const readRate = total > 0 ? Math.round((read / total) * 1000) / 10 : 0
  const targeted =
    total > 0 ? total : Math.max(0, Number(campaignStats?.targeted) || 0)
  return {
    inAppTotal: total,
    readCount: read,
    unreadCount,
    readRate,
    targeted,
    pushSent: Number(campaignStats?.pushSent) || 0,
    pushFailed: Number(campaignStats?.pushFailed) || 0,
    byArea: Array.isArray(byArea) ? byArea : [],
  }
}

export function serializeReadRow(n, user = null, areaNombre = '') {
  const readAt = n?.readAt || null
  return {
    id: String(n?._id || ''),
    userId: String(n?.userId || user?._id || ''),
    usuario: user?.usuario || '',
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    areaId: user?.areaId ? String(user.areaId) : null,
    areaNombre: areaNombre || '',
    readAt,
    dismissedAt: n?.dismissedAt || null,
    status: readAt ? 'read' : 'unread',
    createdAt: n?.createdAt || null,
  }
}

export function displayName(row) {
  const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ').trim()
  return full || row?.usuario || row?.email || row?.userId || '—'
}

export function readsExportRows(items) {
  return (items || []).map((r) => ({
    usuario: r.usuario || '',
    nombre: r.nombre || '',
    apellido: r.apellido || '',
    email: r.email || '',
    area: r.areaNombre || '',
    estado: r.status === 'read' ? 'leida' : 'no_leida',
    leidoAt: r.readAt ? new Date(r.readAt).toISOString() : '',
    descartadoAt: r.dismissedAt ? new Date(r.dismissedAt).toISOString() : '',
  }))
}

export const READS_EXPORT_HEADERS = [
  'usuario',
  'nombre',
  'apellido',
  'email',
  'area',
  'estado',
  'leidoAt',
  'descartadoAt',
]
