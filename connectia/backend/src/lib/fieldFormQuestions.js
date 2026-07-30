/** Tipos de pregunta — Relevamientos de campo (Ola 37). Distinto de Survey ola 5. */

export const FIELD_QUESTION_TYPES = [
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
  'multimedia',
  'button',
  'api',
  'facility_checkin',
  'facility_checkout',
]

export const FIELD_QUESTION_TYPE_META = [
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
  { id: 'geopoint', label: 'Ubicación GPS' },
  { id: 'multimedia', label: 'Multimedia (foto/video)' },
  { id: 'button', label: 'Botón / acción' },
  { id: 'facility_checkin', label: 'Facility check-in' },
  { id: 'facility_checkout', label: 'Facility check-out' },
  // `api` no se ofrece en UI del MVP ola 37; deseable **Ola 40** (`40.h`) con allowlist.
]

export function needsOptions(tipo) {
  return tipo === 'single' || tipo === 'multiple'
}

/**
 * Reglas de lógica: show | hide | skip_to | require_if
 * when: { questionId, op: eq|neq|in|truthy|falsy, value? }
 */
export function answerMatches(when, answersById) {
  if (!when?.questionId) return false
  const raw = answersById[when.questionId]
  const op = when.op || 'eq'
  if (op === 'truthy') return raw !== undefined && raw !== null && raw !== '' && raw !== false
  if (op === 'falsy') return raw === undefined || raw === null || raw === '' || raw === false
  if (op === 'in') {
    const list = Array.isArray(when.value) ? when.value : [when.value]
    if (Array.isArray(raw)) return raw.some((v) => list.map(String).includes(String(v)))
    return list.map(String).includes(String(raw))
  }
  if (op === 'neq') return String(raw) !== String(when.value)
  return String(raw) === String(when.value)
}

/**
 * Evalúa qué preguntas están visibles y cuáles son required efectivos.
 * skip_to: si match, salta a questionId (omite intermedias en el orden).
 */
export function evaluateFieldLogic(questions, answers = {}) {
  const answersById = { ...answers }
  const ordered = Array.isArray(questions) ? questions : []
  const byId = Object.fromEntries(ordered.map((q) => [q.id, q]))
  const visible = []
  let i = 0
  while (i < ordered.length) {
    const q = ordered[i]
    let show = true
    let required = Boolean(q.required)
    const rules = Array.isArray(q.logic) ? q.logic : []
    for (const rule of rules) {
      const match = answerMatches(rule.when, answersById)
      if (!match) continue
      if (rule.action === 'hide') show = false
      if (rule.action === 'show') show = true
      if (rule.action === 'require_if') required = true
      if (rule.action === 'skip_to' && rule.targetQuestionId && byId[rule.targetQuestionId]) {
        if (show) {
          visible.push({ ...q, requiredEffective: required, visible: true })
        }
        const targetIdx = ordered.findIndex((x) => x.id === rule.targetQuestionId)
        i = targetIdx >= 0 ? targetIdx : i + 1
        continue
      }
    }
    if (show) visible.push({ ...q, requiredEffective: required, visible: true })
    i += 1
  }
  return { visible, visibleIds: new Set(visible.map((q) => q.id)) }
}

export function normalizeAnswerValue(q, raw) {
  const missing =
    raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && !raw.length)
  if (missing) return null

  switch (q.tipo) {
    case 'yesno':
      return Boolean(
        raw === true || raw === 'true' || raw === 'sí' || raw === 'si' || raw === 1 || raw === '1',
      )
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
    case 'geopoint':
    case 'facility_checkin':
    case 'facility_checkout': {
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
        kind: q.tipo,
      }
    }
    case 'multimedia': {
      const obj = typeof raw === 'object' && raw ? raw : { url: String(raw) }
      const url = String(obj.url || '').trim()
      if (!url) {
        const err = new Error(`Multimedia requerida en: ${q.texto}`)
        err.status = 400
        throw err
      }
      return {
        url: url.slice(0, 2000),
        mime: String(obj.mime || '').slice(0, 120),
        name: String(obj.name || '').slice(0, 200),
      }
    }
    case 'button':
      return { clicked: true, action: String(raw?.action || q.buttonAction || '').slice(0, 120) }
    case 'api':
      return typeof raw === 'object' && raw ? raw : { value: String(raw).slice(0, 4000) }
    case 'textarea':
      return String(raw).slice(0, 8000)
    case 'text':
    default:
      return String(raw).slice(0, 4000)
  }
}

export function normalizeQuestions(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map((q, idx) => {
    const tipo = FIELD_QUESTION_TYPES.includes(q.tipo) ? q.tipo : 'text'
    const id = String(q.id || `q${idx + 1}`).slice(0, 64)
    const logic = Array.isArray(q.logic)
      ? q.logic
          .filter((r) => r && r.when?.questionId && r.action)
          .map((r) => ({
            when: {
              questionId: String(r.when.questionId).slice(0, 64),
              op: ['eq', 'neq', 'in', 'truthy', 'falsy'].includes(r.when.op) ? r.when.op : 'eq',
              value: r.when.value,
            },
            action: ['show', 'hide', 'skip_to', 'require_if'].includes(r.action) ? r.action : 'show',
            targetQuestionId: r.targetQuestionId ? String(r.targetQuestionId).slice(0, 64) : '',
          }))
      : []
    return {
      id,
      texto: String(q.texto || `Pregunta ${idx + 1}`).trim().slice(0, 500),
      tipo,
      required: q.required !== false,
      opciones: needsOptions(tipo)
        ? (Array.isArray(q.opciones) ? q.opciones : []).map((o) => String(o).slice(0, 200)).filter(Boolean)
        : [],
      grupo: String(q.grupo || 'General').trim().slice(0, 80),
      logic,
      buttonAction: tipo === 'button' ? String(q.buttonAction || '').slice(0, 120) : '',
      apiUrl: tipo === 'api' ? String(q.apiUrl || '').slice(0, 500) : '',
      geofenceRadiusM:
        Number.isFinite(Number(q.geofenceRadiusM)) && Number(q.geofenceRadiusM) > 0
          ? Number(q.geofenceRadiusM)
          : null,
    }
  })
}
