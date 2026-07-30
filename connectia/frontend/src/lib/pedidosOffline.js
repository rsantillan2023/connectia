/**
 * Cola offline canal Alarma / Reportes (Ola 25).
 * Guarda geo + nota + foto (base64) y envía al recuperar señal.
 */
const STORAGE_KEY = 'connectia.pedidos.alarmQueue.v1'

export function loadAlarmQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAlarmQueue(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-20)))
}

export function pendingAlarmCount() {
  return loadAlarmQueue().filter((e) => e.status === 'pending').length
}

export function enqueueAlarm(entry) {
  const items = loadAlarmQueue()
  const row = {
    id: `aq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    error: '',
    ...entry,
  }
  items.push(row)
  saveAlarmQueue(items)
  return row
}

export function updateAlarmEntry(id, patch) {
  const items = loadAlarmQueue().map((e) => (e.id === id ? { ...e, ...patch } : e))
  saveAlarmQueue(items)
}

export function isLikelyOffline(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (!err?.response) return true
  return false
}

function dataUrlToBlob(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const bin = atob(m[2])
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/**
 * @param {import('axios').AxiosInstance} api
 */
export async function flushAlarmQueue(api) {
  const items = loadAlarmQueue()
  let confirmed = 0
  let failed = 0
  for (const entry of items) {
    if (entry.status !== 'pending') continue
    try {
      let attachmentUrl = entry.photoUrl || ''
      if (!attachmentUrl && entry.photoDataUrl) {
        const blob = dataUrlToBlob(entry.photoDataUrl)
        if (!blob) throw Object.assign(new Error('Foto inválida en cola'), { response: { status: 400 } })
        const fd = new FormData()
        fd.append('file', blob, `alarm-${entry.id}.jpg`)
        const up = await api.post('/pedidos/upload', fd)
        attachmentUrl = up.data.url
      }
      if (!attachmentUrl) {
        throw Object.assign(new Error('Falta foto'), { response: { status: 400, data: { error: 'Falta foto' } } })
      }
      await api.post(
        '/pedidos/alarm',
        {
          categoryId: entry.categoryId || undefined,
          note: entry.note || '',
          geo: entry.geo || null,
          attachments: [attachmentUrl],
          idempotencyKey: entry.idempotencyKey,
        },
        { headers: { 'Idempotency-Key': entry.idempotencyKey } },
      )
      updateAlarmEntry(entry.id, {
        status: 'confirmed',
        error: '',
        confirmedAt: new Date().toISOString(),
        photoDataUrl: '', // liberar storage
      })
      confirmed++
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error'
      if (e?.response?.status && e.response.status < 500 && e.response.status !== 0) {
        updateAlarmEntry(entry.id, { status: 'failed', error: msg })
        failed++
      }
      // red / 5xx: queda pending
    }
  }
  const kept = loadAlarmQueue().filter((e) => {
    if (e.status === 'confirmed') {
      const t = new Date(e.confirmedAt || 0).getTime()
      return Date.now() - t < 120_000
    }
    return true
  })
  saveAlarmQueue(kept)
  return { confirmed, failed, pending: pendingAlarmCount() }
}

export function startAlarmOfflineFlush(api) {
  const run = () => {
    if (navigator.onLine) flushAlarmQueue(api).catch(() => {})
  }
  window.addEventListener('online', run)
  run()
  return () => window.removeEventListener('online', run)
}

/** Lee File → data URL (para encolar sin red). */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer la foto'))
    reader.readAsDataURL(file)
  })
}
