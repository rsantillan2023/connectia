/** Catálogo de parámetros del editor (chips de config). */
export const QUESTION_PARAM_CATALOG = {
  texto: {
    id: 'texto',
    icon: 'fa-font',
    label: 'Texto',
    hint: 'Enunciado de la pregunta',
    tone: 'core',
  },
  texto_yesno: {
    id: 'texto',
    icon: 'fa-font',
    label: 'Texto',
    hint: 'Formulado como sí / no',
    tone: 'core',
  },
  texto_rating: {
    id: 'texto',
    icon: 'fa-font',
    label: 'Texto',
    hint: 'Qué se valora en la escala',
    tone: 'core',
  },
  required: {
    id: 'required',
    icon: 'fa-asterisk',
    label: 'Obligatoria',
    hint: 'Interruptor sí / no',
    tone: 'toggle',
  },
  opciones: {
    id: 'opciones',
    icon: 'fa-list-ul',
    label: 'Opciones',
    hint: 'Mín. 2 · separadas con |',
    tone: 'core',
  },
  grupo: {
    id: 'grupo',
    icon: 'fa-layer-group',
    label: 'Grupo',
    hint: 'Sección del cuestionario',
    tone: 'optional',
  },
  imagen: {
    id: 'imagen',
    icon: 'fa-image',
    label: 'Imagen',
    hint: 'Apoyo visual opcional',
    tone: 'optional',
  },
  escala: {
    id: 'escala',
    icon: 'fa-star',
    label: 'Escala 1–5',
    hint: 'Fija · no se editan extremos',
    tone: 'fixed',
  },
  gps: {
    id: 'gps',
    icon: 'fa-map-marker-alt',
    label: 'GPS',
    hint: 'Pide permiso de ubicación',
    tone: 'fixed',
  },
}

const BASE_KEYS = ['texto', 'required', 'grupo', 'imagen']

/** Catálogo local de tipologías (fallback si el API aún no trae description/params). */
export const SURVEY_QUESTION_TYPE_DOCS = {
  text: {
    group: 'Texto',
    short: 'Una línea libre',
    description: 'Respuesta breve en una línea (rol, área, proyecto…).',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  textarea: {
    group: 'Texto',
    short: 'Varias líneas',
    description: 'Comentario o justificación abierta.',
    highlights: [{ label: 'Texto largo', kind: 'info' }],
    paramKeys: BASE_KEYS,
  },
  number: {
    group: 'Datos',
    short: 'Solo números',
    description: 'Años, horas, cantidades.',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  yesno: {
    group: 'Elección',
    short: 'Sí o No',
    description: 'Binaria; no arma lista de opciones.',
    highlights: [{ label: 'Sin opciones', kind: 'info' }],
    paramKeys: ['texto_yesno', 'required', 'grupo', 'imagen'],
  },
  single: {
    group: 'Elección',
    short: 'Una opción',
    description: 'Elige una alternativa de la lista.',
    highlights: [{ label: 'Lista de opciones', kind: 'need' }],
    paramKeys: ['texto', 'opciones', 'required', 'grupo', 'imagen'],
  },
  multiple: {
    group: 'Elección',
    short: 'Varias opciones',
    description: 'Puede marcar más de una.',
    highlights: [{ label: 'Lista de opciones', kind: 'need' }],
    paramKeys: ['texto', 'opciones', 'required', 'grupo', 'imagen'],
  },
  rating: {
    group: 'Escala',
    short: 'Del 1 al 5',
    description: 'Satisfacción, claridad, acuerdo.',
    highlights: [{ label: 'Escala fija', kind: 'fixed' }],
    paramKeys: ['texto_rating', 'required', 'grupo', 'imagen', 'escala'],
  },
  date: {
    group: 'Fecha y hora',
    short: 'Solo fecha',
    description: 'Día / mes / año.',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  time: {
    group: 'Fecha y hora',
    short: 'Solo hora',
    description: 'Turnos o preferencia horaria.',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  datetime: {
    group: 'Fecha y hora',
    short: 'Fecha + hora',
    description: 'Citas o eventos concretos.',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  email: {
    group: 'Contacto',
    short: 'Correo',
    description: 'Valida formato de email.',
    highlights: [{ label: 'Formato email', kind: 'info' }],
    paramKeys: BASE_KEYS,
  },
  phone: {
    group: 'Contacto',
    short: 'Teléfono',
    description: 'Número de contacto.',
    highlights: [],
    paramKeys: BASE_KEYS,
  },
  geopoint: {
    group: 'Ubicación',
    short: 'Check-in GPS',
    description: 'Captura ubicación del dispositivo.',
    highlights: [{ label: 'Pide GPS', kind: 'warn' }],
    paramKeys: [...BASE_KEYS, 'gps'],
  },
}

export const DEFAULT_SURVEY_CATEGORIES = [
  { id: 'clima', label: 'Clima laboral' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'liderazgo', label: 'Liderazgo' },
  { id: 'comunicacion', label: 'Comunicación' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'capacitacion', label: 'Capacitación' },
  { id: 'nps', label: 'NPS / recomendación' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'general', label: 'General' },
  { id: 'otros', label: 'Otros' },
]

/** Icono + tono visual por categoría de encuesta. */
export const SURVEY_CATEGORY_VISUAL = {
  clima: { icon: 'fa-cloud-sun', tone: 'sky' },
  engagement: { icon: 'fa-heart', tone: 'rose' },
  liderazgo: { icon: 'fa-user-tie', tone: 'indigo' },
  comunicacion: { icon: 'fa-comments', tone: 'teal' },
  beneficios: { icon: 'fa-gift', tone: 'amber' },
  capacitacion: { icon: 'fa-graduation-cap', tone: 'violet' },
  nps: { icon: 'fa-chart-line', tone: 'green' },
  onboarding: { icon: 'fa-door-open', tone: 'cyan' },
  offboarding: { icon: 'fa-sign-out-alt', tone: 'slate' },
  general: { icon: 'fa-th-large', tone: 'brand' },
  otros: { icon: 'fa-ellipsis-h', tone: 'slate' },
}

const FALLBACK_TONES = ['sky', 'teal', 'amber', 'violet', 'rose', 'indigo', 'green', 'cyan']

export function surveyCategoryVisual(idOrLabel = '') {
  const key = String(idOrLabel || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
  if (SURVEY_CATEGORY_VISUAL[key]) return { ...SURVEY_CATEGORY_VISUAL[key] }
  // Heurística por palabras en el id/label
  const blob = String(idOrLabel || '').toLowerCase()
  if (/clima|bienestar|mood/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.clima }
  if (/engage|compromiso/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.engagement }
  if (/lider|jefe|manager/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.liderazgo }
  if (/comunic|mensaje/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.comunicacion }
  if (/benef|prepaga|descuento/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.beneficios }
  if (/capaci|curso|formaci|entren/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.capacitacion }
  if (/\bnps\b|recomend/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.nps }
  if (/onboard|bienven|ingreso/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.onboarding }
  if (/offboard|egreso|salida/.test(blob)) return { ...SURVEY_CATEGORY_VISUAL.offboarding }
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % 997
  return {
    icon: 'fa-tag',
    tone: FALLBACK_TONES[hash % FALLBACK_TONES.length],
  }
}

function paramFromKey(key) {
  const p = QUESTION_PARAM_CATALOG[key]
  return p ? { ...p } : null
}

/** Convierte strings legacy o keys a chips de UI. */
export function normalizeQuestionParams(raw, tipoId = '') {
  const docs = SURVEY_QUESTION_TYPE_DOCS[tipoId] || {}
  if (Array.isArray(docs.paramKeys) && docs.paramKeys.length) {
    return docs.paramKeys.map(paramFromKey).filter(Boolean)
  }
  if (!Array.isArray(raw) || !raw.length) {
    return BASE_KEYS.map(paramFromKey).filter(Boolean)
  }
  // Si vienen objetos ya estructurados
  if (raw.every((p) => p && typeof p === 'object' && p.label)) {
    return raw.map((p, i) => ({
      id: p.id || `p-${i}`,
      icon: p.icon || 'fa-cog',
      label: p.label,
      hint: p.hint || '',
      tone: p.tone || (/\bopc/i.test(p.label) ? 'optional' : 'core'),
    }))
  }
  // Strings del backend → mapear por palabras clave
  return raw
    .map((s, i) => {
      const t = String(s || '').toLowerCase()
      if (/opcion/.test(t)) return paramFromKey('opciones')
      if (/obligator/.test(t)) return paramFromKey('required')
      if (/grupo|secci/.test(t)) return paramFromKey('grupo')
      if (/imagen|image/.test(t)) return paramFromKey('imagen')
      if (/escala|1.?5/.test(t)) return paramFromKey('escala')
      if (/gps|ubicaci|permiso/.test(t)) return paramFromKey('gps')
      if (/texto|enunciado|pregunta/.test(t)) {
        if (/s[ií]\s*\/\s*no|binar/.test(t)) return paramFromKey('texto_yesno')
        if (/valor/.test(t)) return paramFromKey('texto_rating')
        return paramFromKey('texto')
      }
      return {
        id: `legacy-${i}`,
        icon: 'fa-cog',
        label: String(s).replace(/\s*\(opcional\)\s*/i, '').trim(),
        hint: /\(opcional\)/i.test(s) ? 'Opcional' : '',
        tone: /\(opcional\)/i.test(s) ? 'optional' : 'core',
      }
    })
    .filter(Boolean)
}

export function enrichQuestionTypeMeta(row) {
  const docs = SURVEY_QUESTION_TYPE_DOCS[row?.id] || {}
  const params = normalizeQuestionParams(row?.params, row?.id)
  const highlights = Array.isArray(docs.highlights) ? docs.highlights.map((h) => ({ ...h })) : []
  return {
    ...row,
    group: row?.group || docs.group || 'Otros',
    short: docs.short || row?.short || '',
    description: row?.description || docs.description || '',
    highlights,
    params,
  }
}
