/**
 * Cola offline de marcas de asistencia (U).
 * Estados: pending | confirmed | failed
 */
const STORAGE_KEY = 'connectia.attendance.punchQueue.v1'

export function loadPunchQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePunchQueue(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-40)))
}

export function enqueuePunch(payload) {
  const items = loadPunchQueue()
  const entry = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    payload,
    error: '',
  }
  items.push(entry)
  savePunchQueue(items)
  return entry
}

export function updateQueueEntry(id, patch) {
  const items = loadPunchQueue().map((e) => (e.id === id ? { ...e, ...patch } : e))
  savePunchQueue(items)
  return items
}

export function pendingCount() {
  return loadPunchQueue().filter((e) => e.status === 'pending').length
}

/**
 * @param {(body: object) => Promise<object>} postFn — api.post wrapper
 */
export async function flushPunchQueue(postFn) {
  const items = loadPunchQueue()
  let confirmed = 0
  let failed = 0
  for (const entry of items) {
    if (entry.status !== 'pending') continue
    try {
      await postFn(entry.payload)
      updateQueueEntry(entry.id, { status: 'confirmed', error: '', confirmedAt: new Date().toISOString() })
      confirmed++
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error'
      // Errores de negocio: marcar failed (no reintentar ciego)
      if (e?.response?.status && e.response.status < 500) {
        updateQueueEntry(entry.id, { status: 'failed', error: msg })
        failed++
      }
      // 5xx / red: dejar pending
    }
  }
  // Limpiar confirmados viejos
  const next = loadPunchQueue().filter(
    (e) => e.status === 'pending' || e.status === 'failed' || !e.confirmedAt,
  )
  const kept = loadPunchQueue().filter((e) => {
    if (e.status === 'confirmed') {
      const t = new Date(e.confirmedAt || 0).getTime()
      return Date.now() - t < 60_000
    }
    return true
  })
  savePunchQueue(kept.length ? kept : next.filter((e) => e.status !== 'confirmed'))
  return { confirmed, failed, pending: pendingCount() }
}

export function isLikelyOffline(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (!err?.response) return true
  return false
}
