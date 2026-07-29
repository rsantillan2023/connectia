const QUEUE_KEY = 'cx_survey_offline_queue'

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
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-40)))
}

export function enqueueSurveyResponse(entry) {
  const list = readQueue().filter(
    (x) => !(x.surveyId === entry.surveyId && x.userKey === entry.userKey),
  )
  list.push({
    ...entry,
    clientId: entry.clientId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  })
  writeQueue(list)
  return list.length
}

export function peekSurveyQueue() {
  return readQueue()
}

export async function flushSurveyQueue(api) {
  const list = readQueue()
  if (!list.length) return { sent: 0, left: 0 }
  const remaining = []
  let sent = 0
  for (const item of list) {
    try {
      await api.post(`/surveys/${item.surveyId}/respond`, { answers: item.answers })
      sent += 1
    } catch (e) {
      const status = e?.response?.status
      // Ya respondida → descartar de la cola
      if (status === 409) {
        sent += 1
        continue
      }
      // Error de red u otro: mantener
      if (!e?.response || status >= 500 || status === 0) {
        remaining.push(item)
      }
      // 400 validation: descartar (no reintentar forever)
    }
  }
  writeQueue(remaining)
  return { sent, left: remaining.length }
}

export function startSurveyOfflineFlush(api) {
  const run = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    flushSurveyQueue(api).catch(() => {})
  }
  window.addEventListener('online', run)
  run()
  return () => window.removeEventListener('online', run)
}
