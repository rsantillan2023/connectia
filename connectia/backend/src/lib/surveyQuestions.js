/** Tipos de pregunta soportados en encuestas (MVP Ola 5). */
export const SURVEY_QUESTION_TYPES = [
  'text',
  'textarea',
  'number',
  'yesno',
  'single',
  'multiple',
  'rating',
  'date',
  'time',
  'datetime',
  'email',
  'phone',
  'geopoint',
]

export const SURVEY_QUESTION_TYPE_META = [
  { id: 'text', label: 'Texto corto' },
  { id: 'textarea', label: 'Texto largo' },
  { id: 'number', label: 'Número' },
  { id: 'yesno', label: 'Sí / No' },
  { id: 'single', label: 'Opción única' },
  { id: 'multiple', label: 'Opción múltiple' },
  { id: 'rating', label: 'Valoración 1–5' },
  { id: 'date', label: 'Fecha' },
  { id: 'time', label: 'Hora' },
  { id: 'datetime', label: 'Fecha y hora' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Teléfono' },
  { id: 'geopoint', label: 'Check-in (ubicación GPS)' },
]

export function needsOptions(tipo) {
  return tipo === 'single' || tipo === 'multiple'
}

/**
 * Normaliza y valida el valor de una respuesta según el tipo.
 * @throws Error con status 400 si es inválido
 */
export function normalizeAnswerValue(q, raw) {
  const missing = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && !raw.length)
  if (missing) return null

  switch (q.tipo) {
    case 'yesno':
      return Boolean(raw === true || raw === 'true' || raw === 'sí' || raw === 'si' || raw === 1 || raw === '1')
    case 'rating': {
      const value = Number(raw)
      if (!Number.isFinite(value) || value < 1 || value > 5) {
        const err = new Error(`Rating inválido en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'number': {
      const value = Number(raw)
      if (!Number.isFinite(value)) {
        const err = new Error(`Número inválido en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'single': {
      const value = String(raw)
      if (q.opciones?.length && !q.opciones.includes(value)) {
        const err = new Error(`Opción inválida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'multiple': {
      const value = (Array.isArray(raw) ? raw : [raw]).map(String)
      if (q.opciones?.length && value.some((v) => !q.opciones.includes(v))) {
        const err = new Error(`Opciones inválidas en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'date': {
      const value = String(raw).trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const err = new Error(`Fecha inválida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'time': {
      const value = String(raw).trim()
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        const err = new Error(`Hora inválida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value.slice(0, 5)
    }
    case 'datetime': {
      const value = String(raw).trim()
      const d = new Date(value)
      if (!Number.isFinite(d.getTime())) {
        const err = new Error(`Fecha/hora inválida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'email': {
      const value = String(raw).trim().slice(0, 200)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        const err = new Error(`Email inválido en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'phone': {
      const value = String(raw).trim().slice(0, 40)
      if (!/^[\d\s+\-()]{6,40}$/.test(value)) {
        const err = new Error(`Teléfono inválido en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return value
    }
    case 'geopoint': {
      const obj = typeof raw === 'object' && raw ? raw : null
      const lat = Number(obj?.lat ?? obj?.latitude)
      const lng = Number(obj?.lng ?? obj?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        const err = new Error(`Ubicación inválida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return {
        lat,
        lng,
        accuracy: Number.isFinite(Number(obj?.accuracy)) ? Number(obj.accuracy) : null,
        capturedAt: obj?.capturedAt ? new Date(obj.capturedAt).toISOString() : new Date().toISOString(),
        source: String(obj?.source || 'geolocation').slice(0, 40),
      }
    }
    case 'textarea':
      return String(raw).slice(0, 8000)
    case 'text':
    default:
      return String(raw).slice(0, 4000)
  }
}
