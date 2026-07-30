/** Cola offline Relevamientos (Ola 37) — idempotencia por clientMutationId */
const KEY = 'connectia.relevamientos.offline.v1'

function readQueue() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeQueue(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 100)))
}

export function pendingRelevamientoCount() {
  return readQueue().length
}

export function enqueueRelevamientoSubmit(op) {
  const q = readQueue()
  const clientMutationId = op.clientMutationId || `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  q.push({
    assignmentId: op.assignmentId,
    answers: op.answers || {},
    clientMutationId,
    submittedAt: op.submittedAt || new Date().toISOString(),
  })
  writeQueue(q)
  return clientMutationId
}

export async function flushRelevamientoQueue(api) {
  const q = readQueue()
  if (!q.length) return { flushed: 0 }
  try {
    const { data } = await api.post('/relevamientos/sync', { ops: q })
    const results = data?.results || []
    const okKeys = new Set(results.filter((r) => r.ok).map((r) => r.clientMutationId))
    const remain = q.filter((op) => !okKeys.has(op.clientMutationId))
    writeQueue(remain)
    return { flushed: q.length - remain.length, remain: remain.length }
  } catch {
    return { flushed: 0, remain: q.length, offline: true }
  }
}

export function startRelevamientoOfflineFlush(api) {
  const run = () => {
    flushRelevamientoQueue(api).catch(() => {})
  }
  window.addEventListener('online', run)
  run()
  return () => window.removeEventListener('online', run)
}
