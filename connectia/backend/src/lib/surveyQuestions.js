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
  {
    id: 'text',
    label: 'Texto corto',
    group: 'Texto',
    description: 'Una línea de respuesta libre. Ideal para datos breves (rol, área, nombre de proyecto).',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'textarea',
    label: 'Texto largo',
    group: 'Texto',
    description: 'Respuesta abierta en varias líneas. Útil para comentarios, sugerencias o justificación.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'number',
    label: 'Número',
    group: 'Datos',
    description: 'Valor numérico (años, horas, cantidad). El miembro ingresa un número.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'yesno',
    label: 'Sí / No',
    group: 'Elección',
    description: 'Pregunta binaria. El miembro elige Sí o No; no lleva lista de opciones.',
    params: [
      'Texto de la pregunta (formulado en sí/no)',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'single',
    label: 'Opción única',
    group: 'Elección',
    description: 'El miembro elige una sola alternativa de una lista.',
    params: [
      'Texto de la pregunta',
      'Opciones (mín. 2; en el editor se separan con |)',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'multiple',
    label: 'Opción múltiple',
    group: 'Elección',
    description: 'El miembro puede marcar varias alternativas de la lista.',
    params: [
      'Texto de la pregunta',
      'Opciones (mín. 2; en el editor se separan con |)',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'rating',
    label: 'Valoración 1–5',
    group: 'Escala',
    description: 'Escala fija del 1 al 5. Ideal para satisfacción, claridad o acuerdo.',
    params: [
      'Texto de la pregunta (qué se valora)',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
      'La escala 1–5 es fija (no se configuran extremos)',
    ],
  },
  {
    id: 'date',
    label: 'Fecha',
    group: 'Fecha y hora',
    description: 'Selector de fecha (día/mes/año). Para hitos, ingresos o agendas.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'time',
    label: 'Hora',
    group: 'Fecha y hora',
    description: 'Selector de hora. Para turnos, preferencias de horario o citas.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'datetime',
    label: 'Fecha y hora',
    group: 'Fecha y hora',
    description: 'Fecha y hora juntas. Para citas o eventos concretos.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'email',
    label: 'Email',
    group: 'Contacto',
    description: 'Campo con formato de correo. Pedilo solo si hace falta contacto.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'phone',
    label: 'Teléfono',
    group: 'Contacto',
    description: 'Número telefónico. Pedilo solo si hace falta contacto.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
    ],
  },
  {
    id: 'geopoint',
    label: 'Check-in (ubicación GPS)',
    group: 'Ubicación',
    description: 'Captura la ubicación del dispositivo. Pensado para presencia o visita en sitio.',
    params: [
      'Texto de la pregunta',
      'Obligatoria sí/no',
      'Grupo / sección (opcional)',
      'Imagen de apoyo (opcional)',
      'Requiere permiso de ubicación en el dispositivo del miembro',
    ],
  },
]

export function needsOptions(tipo) {
  return tipo === 'single' || tipo === 'multiple'
}

/**
 * Normaliza el plan de tipologías para generar preguntas con IA.
 * @param {Array<{ tipo?: string, count?: number, caracteristicas?: string }>} raw
 * @returns {{ specs: Array<{ tipo: string, count: number, caracteristicas: string }>, total: number, error?: string }}
 */
export function normalizeQuestionTypeSpecs(raw) {
  const list = Array.isArray(raw) ? raw : []
  const specs = []
  for (const row of list) {
    const tipo = SURVEY_QUESTION_TYPES.includes(row?.tipo) ? row.tipo : null
    const count = Math.min(20, Math.max(0, Math.round(Number(row?.count) || 0)))
    const caracteristicas = String(row?.caracteristicas || '').trim().slice(0, 300)
    if (!tipo || count < 1) continue
    specs.push({ tipo, count, caracteristicas })
  }
  const total = specs.reduce((n, s) => n + s.count, 0)
  if (!specs.length) {
    return { specs: [], total: 0, error: 'Indicá al menos un tipo con cantidad mayor a 0' }
  }
  if (total > 40) {
    return { specs, total, error: 'Máximo 40 preguntas por generación' }
  }
  return { specs, total }
}

/**
 * Prioridad de tipologías para mezclas inteligentes (más útiles primero).
 * Se filtra por tipos habilitados del tenant.
 */
const SMART_TYPE_PRIORITY = [
  'rating',
  'yesno',
  'single',
  'multiple',
  'textarea',
  'text',
  'number',
  'date',
  'datetime',
  'time',
  'email',
  'phone',
  'geopoint',
]

/** Pesos relativos para repartir el total entre tipologías. */
const SMART_TYPE_WEIGHT = {
  rating: 3,
  yesno: 2,
  single: 2,
  multiple: 2,
  textarea: 2,
  text: 1,
  number: 1,
  date: 1,
  datetime: 1,
  time: 1,
  email: 1,
  phone: 1,
  geopoint: 1,
}

/** Orden de flujo natural del cuestionario (intercalado). */
const SMART_FLOW_ORDER = [
  'yesno',
  'rating',
  'single',
  'multiple',
  'number',
  'text',
  'date',
  'time',
  'datetime',
  'email',
  'phone',
  'geopoint',
  'textarea',
]

const TYPE_SMART_HINT = {
  rating: 'escala 1–5 accionable (claridad, carga, liderazgo…)',
  yesno: 'binaria concreta, sin matices ambiguos',
  single: 'una sola opción; 3–5 alternativas claras',
  multiple: 'puede marcar varias; 3–6 temas no solapados',
  textarea: 'abierta de cierre; pedí detalle útil',
  text: 'respuesta corta factual (rol, área, etc.)',
  number: 'dato numérico real (años, horas, cantidad)',
  date: 'solo si aporta agenda/hito real',
  time: 'solo si aporta horario operativo',
  datetime: 'solo si aporta cita concreta',
  email: 'solo si hace falta contacto',
  phone: 'solo si hace falta contacto',
  geopoint: 'solo check-in / presencia en sitio',
}

/**
 * Intercala tipologías (round-robin con orden de flujo) para no agrupar iguales.
 * @param {Array<{ tipo: string, count: number }>} specs
 * @returns {string[]}
 */
export function interleaveQuestionTypes(specs) {
  const bags = new Map()
  for (const s of specs || []) {
    if (!s?.tipo || !(s.count > 0)) continue
    bags.set(s.tipo, (bags.get(s.tipo) || 0) + s.count)
  }
  if (!bags.size) return []
  const order = [
    ...SMART_FLOW_ORDER.filter((t) => bags.has(t)),
    ...[...bags.keys()].filter((t) => !SMART_FLOW_ORDER.includes(t)),
  ]
  const out = []
  let left = [...bags.values()].reduce((a, b) => a + b, 0)
  while (left > 0) {
    let progressed = false
    for (const t of order) {
      const n = bags.get(t) || 0
      if (n < 1) continue
      out.push(t)
      bags.set(t, n - 1)
      left -= 1
      progressed = true
      if (left < 1) break
    }
    if (!progressed) break
  }
  return out
}

/**
 * Arma un plan diverso de tipologías según contexto y tipos habilitados.
 * @param {{
 *   enabledTypes?: string[],
 *   total?: number,
 *   context?: { categoria?: string, purpose?: string, titulo?: string, descripcion?: string, aiContext?: string },
 * }} opts
 * @returns {{
 *   specs: Array<{ tipo: string, count: number, caracteristicas: string }>,
 *   total: number,
 *   mode: 'smart',
 *   sequence: string[],
 * }}
 */
export function buildSmartQuestionTypePlan({
  enabledTypes = SURVEY_QUESTION_TYPES,
  total = 8,
  context = {},
} = {}) {
  const allowed = new Set(
    (Array.isArray(enabledTypes) ? enabledTypes : SURVEY_QUESTION_TYPES).filter((t) =>
      SURVEY_QUESTION_TYPES.includes(t),
    ),
  )
  if (!allowed.size) {
    for (const t of SURVEY_QUESTION_TYPES) allowed.add(t)
  }

  let n = Math.min(40, Math.max(3, Math.round(Number(total) || 8)))
  const purpose = String(context.purpose || '').toLowerCase()
  const cat = String(context.categoria || '').toLowerCase()
  const blob = `${context.titulo || ''} ${context.descripcion || ''} ${context.aiContext || ''} ${cat} ${purpose}`.toLowerCase()

  const boost = []
  if (purpose === 'onboarding' || cat === 'onboarding') {
    boost.push('yesno', 'single', 'rating', 'textarea', 'email', 'text')
  } else if (purpose === 'offboarding' || cat === 'offboarding') {
    boost.push('single', 'rating', 'textarea', 'yesno', 'multiple')
  } else if (cat === 'nps' || /\bnps\b|recomendar/.test(blob)) {
    boost.push('rating', 'textarea', 'single', 'yesno', 'text')
  } else if (cat === 'clima' || /clima|liderazgo|bienestar/.test(blob)) {
    boost.push('rating', 'yesno', 'single', 'multiple', 'textarea', 'text')
  } else if (cat === 'capacitacion' || /formación|capacitacion|curso|entrenamiento/.test(blob)) {
    boost.push('multiple', 'single', 'rating', 'number', 'textarea', 'yesno')
  } else if (cat === 'beneficios' || /beneficio|prepaga|descuento/.test(blob)) {
    boost.push('single', 'multiple', 'rating', 'yesno', 'textarea')
  } else if (cat === 'comunicacion' || /comunicaci[oó]n|mensaje|canal/.test(blob)) {
    boost.push('single', 'rating', 'multiple', 'yesno', 'textarea')
  } else if (/agenda|fecha|reunión|reunion|turno|visita/.test(blob)) {
    boost.push('date', 'datetime', 'time', 'single', 'yesno', 'text')
  } else {
    boost.push('rating', 'yesno', 'single', 'multiple', 'textarea', 'text', 'number')
  }

  const ordered = []
  const seen = new Set()
  for (const t of [...boost, ...SMART_TYPE_PRIORITY]) {
    if (!allowed.has(t) || seen.has(t)) continue
    seen.add(t)
    ordered.push(t)
  }

  // Más tipologías distintas: ~60% del total, mín 3, máx 8 (o disponibles)
  const distinct = Math.min(ordered.length, Math.max(3, Math.min(8, Math.ceil(n * 0.65))))
  const picked = ordered.slice(0, distinct)

  const weights = picked.map((t) => SMART_TYPE_WEIGHT[t] || 1)
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1
  const counts = picked.map((_, i) => Math.max(1, Math.floor((n * weights[i]) / weightSum)))
  let assigned = counts.reduce((a, b) => a + b, 0)
  let i = 0
  while (assigned < n) {
    counts[i % counts.length] += 1
    assigned += 1
    i += 1
  }
  while (assigned > n && counts.some((c) => c > 1)) {
    const idx = counts.findIndex((c) => c > 1)
    if (idx < 0) break
    counts[idx] -= 1
    assigned -= 1
  }

  const focus = [context.categoria, context.purpose, context.titulo]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 120)

  const specs = picked.map((tipo, idx) => ({
    tipo,
    count: counts[idx],
    caracteristicas: [
      TYPE_SMART_HINT[tipo] || 'acorde al contexto',
      focus ? `foco: ${focus}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 300),
  }))

  const sequence = interleaveQuestionTypes(specs)

  return {
    specs,
    total: specs.reduce((s, x) => s + x.count, 0),
    mode: 'smart',
    sequence,
  }
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
