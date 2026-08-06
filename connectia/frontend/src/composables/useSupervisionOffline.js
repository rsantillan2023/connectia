/**
 * Cola offline supervisión + cache GET (Ola 31).
 */
const QUEUE_KEY = 'cx_sup_offline_queue'
const CACHE_PREFIX = 'cx_sup_cache:'

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeQueue(list) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-60)))
}

export function cacheSupervisionGet(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ ts: Date.now(), data }),
    )
  } catch {
    /* quota */
  }
}

export function readSupervisionCache(key, maxAgeMs = 1000 * 60 * 60 * 12) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.ts || Date.now() - parsed.ts > maxAgeMs) return null
    return parsed.data
  } catch {
    return null
  }
}

export function enqueueSupervisionOp(op) {
  const list = readQueue()
  const idempotencyKey = op.idempotencyKey || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  list.push({ ...op, idempotencyKey, ts: Date.now(), status: 'pending' })
  writeQueue(list)
  return idempotencyKey
}

export function peekSupervisionQueue() {
  return readQueue()
}

export async function flushSupervisionQueue(api) {
  const list = readQueue()
  if (!list.length) return { sent: 0, left: 0 }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, left: list.length }
  }
  try {
    const { data } = await api.post('/supervision/sync', { ops: list })
    const okKeys = new Set((data.results || []).filter((r) => r.ok).map((r) => r.idempotencyKey))
    const remaining = list.filter((op) => !okKeys.has(op.idempotencyKey))
    writeQueue(remaining)
    return { sent: list.length - remaining.length, left: remaining.length }
  } catch {
    return { sent: 0, left: list.length }
  }
}

export function startSupervisionOfflineFlush(api) {
  const run = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    flushSupervisionQueue(api).catch(() => {})
  }
  window.addEventListener('online', run)
  run()
  return () => window.removeEventListener('online', run)
}
