/** ¿Falló por servidor caído / sin red (sin respuesta HTTP)? */
export function isServerUnreachable(err) {
  if (!err) return false
  if (err.response) return false
  const code = String(err.code || '')
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') return true
  const msg = String(err.message || '').toLowerCase()
  return (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkrequestfailed') ||
    msg.includes('timeout')
  )
}

/** Mensajes genéricos de Axios / fetch que no aportan al usuario. */
function isGenericClientMessage(msg) {
  const s = String(msg || '').trim().toLowerCase()
  if (!s) return true
  return (
    /^request failed with status code\s*\d+/.test(s) ||
    s.startsWith('request failed with status code') ||
    s === 'network error' ||
    s === 'failed to fetch' ||
    s === 'timeout' ||
    s === 'error' ||
    s === 'internal server error' ||
    s === 'bad gateway' ||
    s === 'service unavailable' ||
    s === 'gateway timeout' ||
    s === 'unauthorized' ||
    s === 'forbidden' ||
    s === 'not found'
  )
}

function parseStatusFromGenericMessage(msg) {
  const m = String(msg || '').match(/status code\s*(\d{3})/i)
  return m ? Number(m[1]) : 0
}

function titleForStatus(status) {
  if (status === 401 || status === 403) return 'Sin acceso'
  if (status === 404) return 'No encontrado'
  if (status === 408 || status === 504) return 'Tardó demasiado'
  if (status === 502 || status === 503) return 'Servidor no disponible'
  if (status >= 500) return 'Error del servidor'
  if (status >= 400) return 'No se pudo cargar'
  return 'No se pudo cargar'
}

function fallbackForStatus(status, fallback) {
  if (status === 401) return 'Cerrá sesión e ingresá de nuevo.'
  if (status === 403) return 'No tenés permiso para ver este contenido.'
  if (status === 404) return 'No encontramos lo que buscabas.'
  if (status === 408 || status === 504) {
    return 'El servidor tardó demasiado en responder. Probá de nuevo.'
  }
  if (status === 502 || status === 503) {
    return 'El servidor no está disponible en este momento. Probá más tarde.'
  }
  if (status >= 500) return 'El servidor tuvo un problema. Probá de nuevo en un momento.'
  if (status >= 400) return 'No se pudo completar la solicitud. Probá de nuevo.'
  return fallback
}

/**
 * Extrae el mensaje que mandó el backend (si hay).
 * Soporta: { error }, { message }, { error: { message } }, { errors: [...] }, string body.
 */
export function extractApiErrorMessage(err) {
  const data = err?.response?.data
  if (data == null || data === '') return ''

  if (typeof data === 'string') {
    const t = data.trim()
    if (!t || t.startsWith('<')) return ''
    return t.slice(0, 280)
  }

  if (typeof data !== 'object') return ''

  const candidates = [data.error, data.message, data.detail, data.msg]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 280)
    if (c && typeof c === 'object') {
      const nested = c.message || c.error || c.msg
      if (typeof nested === 'string' && nested.trim()) return nested.trim().slice(0, 280)
    }
  }

  if (Array.isArray(data.errors) && data.errors.length) {
    const parts = data.errors
      .map((e) => (typeof e === 'string' ? e : e?.message || e?.msg || ''))
      .map((s) => String(s || '').trim())
      .filter(Boolean)
    if (parts.length) return parts.join(' · ').slice(0, 280)
  }

  return ''
}

/**
 * Texto listo para UI: prioriza backend; traduce/ignora "Request failed with status code…".
 */
export function friendlyErrorMessage(err, fallback = 'No se pudo completar la solicitud.') {
  if (isServerUnreachable(err)) {
    return 'No pudimos llegar al servidor. Verificá la red o que el sistema esté andando.'
  }

  const status = Number(err?.response?.status) || parseStatusFromGenericMessage(err?.message) || 0
  const fromBackend = extractApiErrorMessage(err)

  if (fromBackend && !isGenericClientMessage(fromBackend)) {
    return fromBackend
  }

  const clientMsg = String(err?.message || '').trim()
  if (clientMsg && !isGenericClientMessage(clientMsg)) {
    return clientMsg
  }

  return fallbackForStatus(status, fallback)
}

/**
 * Mensaje amigable para fallos de carga de feed.
 * @returns {{ kind: 'offline'|'error', title: string, text: string, fromBackend: boolean }}
 */
export function describeLoadError(err, fallback = 'No se pudo cargar la información.') {
  if (isServerUnreachable(err)) {
    return {
      kind: 'offline',
      title: 'Sin conexión',
      text: 'No pudimos llegar al servidor. Verificá la red o que el sistema esté andando.',
      fromBackend: false,
    }
  }

  const status = Number(err?.response?.status) || parseStatusFromGenericMessage(err?.message) || 0
  const fromBackendRaw = extractApiErrorMessage(err)
  const fromBackend = fromBackendRaw && !isGenericClientMessage(fromBackendRaw) ? fromBackendRaw : ''

  if (status === 401 && !fromBackend) {
    return {
      kind: 'error',
      title: 'Sesión inválida',
      text: 'Cerrá sesión e ingresá de nuevo.',
      fromBackend: false,
    }
  }

  const text = friendlyErrorMessage(err, fallback)

  return {
    kind: 'error',
    title: titleForStatus(status),
    text,
    fromBackend: Boolean(fromBackend),
  }
}
