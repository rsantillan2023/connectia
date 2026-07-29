/** Helpers puros de saludos / celebraciones (§5). */

/** Keys legacy / seed (compat + IA). Los tenants pueden agregar más por UI. */
export const GREETING_EVENT_TYPES = [
  'birthday',
  'hire_anniversary',
  'work_anniversary',
  'fixed_date',
]

export const GREETING_EVENT_LABELS = {
  birthday: 'Cumpleaños',
  hire_anniversary: 'Aniversario de ingreso',
  work_anniversary: 'Aniversario laboral',
  fixed_date: 'Fecha fija',
}

export const GREETING_DATE_SOURCES = [
  'fechaNacimiento',
  'fechaIngreso',
  'createdAt',
  'fixed',
  'customDate',
  'daysAfter',
  'manual',
]

export const GREETING_DATE_SOURCE_LABELS = {
  fechaNacimiento: 'Cumpleaños (fecha de nacimiento)',
  fechaIngreso: 'Aniversario (fecha de ingreso)',
  createdAt: 'Aniversario de alta en Connectia',
  fixed: 'Día/mes fijo en la regla',
  customDate: 'Fecha personalizada del perfil',
  daysAfter: 'N días después de un evento/fecha',
  manual: 'Solo manual / API (Ejecutar ahora)',
}

export const GREETING_DATE_SOURCE_META = GREETING_DATE_SOURCES.map((id) => ({
  id,
  label: GREETING_DATE_SOURCE_LABELS[id],
  group:
    id === 'fixed'
      ? 'Calendario'
      : id === 'manual' || id === 'daysAfter'
        ? 'Evento'
        : 'Perfil',
  needsUser: id !== 'fixed',
  needsCustomKey: id === 'customDate' || id === 'daysAfter',
  needsOffset: id === 'daysAfter',
  needsFixedDay: id === 'fixed',
  needsMinYears: ['fechaNacimiento', 'fechaIngreso', 'createdAt', 'customDate'].includes(id),
}))

/** Campos base para “N días después…” */
export const GREETING_OFFSET_FIELDS = [
  { id: 'fechaIngreso', label: 'Fecha de ingreso' },
  { id: 'fechaNacimiento', label: 'Fecha de nacimiento' },
  { id: 'createdAt', label: 'Alta en Connectia' },
  { id: 'customDate', label: 'Fecha personalizada (key)' },
]

/** Tipos base que se siembran por tenant (editables en UI). */
export const DEFAULT_GREETING_EVENT_TYPES = [
  {
    key: 'birthday',
    label: 'Cumpleaños',
    description: 'Compara día/mes con la fecha de nacimiento del perfil.',
    dateSource: 'fechaNacimiento',
    minYears: 0,
    sortOrder: 10,
  },
  {
    key: 'hire_anniversary',
    label: 'Aniversario de ingreso',
    description: 'Compara día/mes con la fecha de ingreso (≥ 1 año).',
    dateSource: 'fechaIngreso',
    minYears: 1,
    sortOrder: 20,
  },
  {
    key: 'work_anniversary',
    label: 'Aniversario laboral',
    description: 'Igual que ingreso: usa fecha de ingreso del perfil (≥ 1 año).',
    dateSource: 'fechaIngreso',
    minYears: 1,
    sortOrder: 30,
  },
  {
    key: 'fixed_date',
    label: 'Fecha fija',
    description: 'Usa el día/mes configurado en la regla (ej. fin de año).',
    dateSource: 'fixed',
    minYears: 0,
    sortOrder: 40,
  },
]

export function slugifyGreetingTypeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export function normalizeDateSource(raw) {
  const v = String(raw || '').trim()
  return GREETING_DATE_SOURCES.includes(v) ? v : 'fechaNacimiento'
}

export function normalizeOffsetField(raw) {
  const v = String(raw || '').trim()
  return GREETING_OFFSET_FIELDS.some((f) => f.id === v) ? v : 'fechaIngreso'
}

export function normalizeCustomDateKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

/** Lee una Date del usuario según origen (incl. customDates). */
export function getUserTriggerDate(user, cfg) {
  if (!user || !cfg) return null
  const src = normalizeDateSource(cfg.dateSource)
  if (src === 'fechaNacimiento') return user.fechaNacimiento || null
  if (src === 'fechaIngreso') return user.fechaIngreso || null
  if (src === 'createdAt') return user.createdAt || null
  if (src === 'customDate') {
    const key = normalizeCustomDateKey(cfg.customDateKey)
    if (!key) return null
    const map = user.customDates
    if (!map) return null
    if (typeof map.get === 'function') return map.get(key) || null
    return map[key] || null
  }
  if (src === 'daysAfter') {
    const field = normalizeOffsetField(cfg.offsetField)
    if (field === 'customDate') {
      const key = normalizeCustomDateKey(cfg.customDateKey)
      if (!key) return null
      const map = user.customDates
      if (!map) return null
      return typeof map.get === 'function' ? map.get(key) || null : map[key] || null
    }
    return user[field] || null
  }
  return null
}

export function ymdFromDate(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() }
}

/** Resuelve config de tipo (DB o fallback legacy por key). */
export function resolveEventTypeConfig(typeOrKey) {
  if (typeOrKey && typeof typeOrKey === 'object' && typeOrKey.dateSource) {
    const media = inferGreetingMedia({
      imageUrl: typeOrKey.imageUrl,
      imageUrls: typeOrKey.imageUrls,
      mediaKind: typeOrKey.mediaKind,
    })
    const mediaPick = normalizeMediaPick(typeOrKey.mediaPick)
    const pool =
      mediaPick === 'random' || mediaPick === 'profile'
        ? greetingMediaPool(typeOrKey)
        : media.imageUrls.length
          ? media.imageUrls
          : media.imageUrl
            ? [media.imageUrl]
            : []
    return {
      key: String(typeOrKey.key || '').trim(),
      label: String(typeOrKey.label || typeOrKey.key || '').trim(),
      dateSource: normalizeDateSource(typeOrKey.dateSource),
      minYears: Math.min(80, Math.max(0, Number(typeOrKey.minYears) || 0)),
      description: String(typeOrKey.description || '').trim(),
      activo: typeOrKey.activo !== false,
      customDateKey: normalizeCustomDateKey(typeOrKey.customDateKey),
      offsetDays: Math.min(3650, Math.max(0, Number(typeOrKey.offsetDays) || 0)),
      offsetField: normalizeOffsetField(typeOrKey.offsetField),
      defaultTitulo: String(typeOrKey.defaultTitulo || '').trim().slice(0, 160),
      defaultCuerpo: String(typeOrKey.defaultCuerpo || '').trim().slice(0, 5000),
      imageUrl: (mediaPick === 'random' || mediaPick === 'profile' ? pool[0] : media.imageUrl) || '',
      imageUrls: mediaPick === 'random' || mediaPick === 'profile' ? pool : media.imageUrls,
      audioUrl: String(typeOrKey.audioUrl || '').trim().slice(0, 500),
      mediaKind:
        mediaPick === 'random' || mediaPick === 'profile'
          ? pool.length >= 2
            ? 'carousel'
            : pool.length
              ? 'image'
              : ''
          : media.mediaKind,
      mediaPick,
    }
  }
  const key = String(typeOrKey || '').trim()
  const def = DEFAULT_GREETING_EVENT_TYPES.find((t) => t.key === key)
  if (def) {
    return {
      key: def.key,
      label: def.label,
      dateSource: def.dateSource,
      minYears: def.minYears,
      description: def.description,
      activo: true,
      customDateKey: '',
      offsetDays: 0,
      offsetField: 'fechaIngreso',
      defaultTitulo: '',
      defaultCuerpo: '',
      imageUrl: '',
      imageUrls: [],
      audioUrl: '',
      mediaKind: '',
      mediaPick: 'fixed',
    }
  }
  return null
}

export function serializeGreetingEventType(t) {
  const cfg = resolveEventTypeConfig(t) || {}
  const meta = GREETING_DATE_SOURCE_META.find((m) => m.id === cfg.dateSource)
  return {
    id: t?._id ? String(t._id) : undefined,
    key: cfg.key || t?.key || '',
    label: cfg.label || '',
    description: cfg.description || '',
    dateSource: cfg.dateSource || 'fechaNacimiento',
    dateSourceLabel: GREETING_DATE_SOURCE_LABELS[cfg.dateSource] || cfg.dateSource,
    dateSourceGroup: meta?.group || 'Perfil',
    minYears: cfg.minYears || 0,
    customDateKey: cfg.customDateKey || '',
    offsetDays: cfg.offsetDays || 0,
    offsetField: cfg.offsetField || 'fechaIngreso',
    defaultTitulo: cfg.defaultTitulo || '',
    defaultCuerpo: cfg.defaultCuerpo || '',
    imageUrl: cfg.imageUrl || '',
    imageUrls: cfg.imageUrls || [],
    audioUrl: cfg.audioUrl || '',
    mediaKind: cfg.mediaKind || '',
    mediaPick: cfg.mediaPick || 'fixed',
    activo: t?.activo !== false,
    sortOrder: Number(t?.sortOrder) || 100,
    isSystem: Boolean(t?.isSystem),
    createdAt: t?.createdAt,
    updatedAt: t?.updatedAt,
  }
}

/**
 * Si la regla no trae media/copy, hereda la plantilla del tipo.
 */
export function mergeRuleWithTypeDefaults(rule = {}, typeConfig = null) {
  const cfg = resolveEventTypeConfig(typeConfig)
  const base = typeof rule?.toObject === 'function' ? rule.toObject() : { ...rule }
  const rulePool = greetingMediaPool(base)
  const hasRuleMedia = rulePool.length > 0 || Boolean(String(base?.audioUrl || '').trim())
  const typePool = cfg ? greetingMediaPool(cfg) : []
  const hasTypeMedia = typePool.length > 0 || Boolean(cfg?.audioUrl)

  const merged = {
    ...base,
    mediaPick: normalizeMediaPick(base?.mediaPick || cfg?.mediaPick || 'fixed'),
    mediaKind: base?.mediaKind || cfg?.mediaKind || '',
    imageUrl: String(base?.imageUrl || '').trim(),
    imageUrls: Array.isArray(base?.imageUrls) ? base.imageUrls.filter(Boolean) : [],
    audioUrl: String(base?.audioUrl || '').trim(),
    titulo: String(base?.titulo || '').trim() || cfg?.defaultTitulo || '',
    cuerpo: String(base?.cuerpo || '').trim() || cfg?.defaultCuerpo || '',
  }

  if (!hasRuleMedia && hasTypeMedia) {
    merged.imageUrl = cfg.imageUrl || typePool[0] || ''
    merged.imageUrls = cfg.imageUrls?.length ? [...cfg.imageUrls] : typePool
    merged.audioUrl = cfg.audioUrl || ''
    merged.mediaKind = cfg.mediaKind || ''
    merged.mediaPick = normalizeMediaPick(cfg.mediaPick)
  }

  return merged
}

/** Normaliza plantilla/media default al guardar un tipo. */
export function normalizeGreetingTypeDefaultsInput(raw = {}) {
  const mediaPick = normalizeMediaPick(raw.mediaPick)
  const audioUrl = String(raw.audioUrl || '').trim().slice(0, 500)
  let media
  if (mediaPick === 'random' || mediaPick === 'profile') {
    const pool = greetingMediaPool(raw)
    media = {
      mediaKind: pool.length >= 2 ? 'carousel' : pool.length === 1 ? 'image' : '',
      imageUrl: pool[0] || '',
      imageUrls: pool,
    }
  } else {
    media = inferGreetingMedia(raw)
  }
  return {
    defaultTitulo: String(raw.defaultTitulo || '').trim().slice(0, 160),
    defaultCuerpo: String(raw.defaultCuerpo || '').trim().slice(0, 5000),
    imageUrl: media.imageUrl.slice(0, 500),
    imageUrls: (media.imageUrls || []).map((u) => u.slice(0, 500)),
    audioUrl:
      mediaPick === 'fixed' && (media.mediaKind === 'video' || media.mediaKind === 'youtube')
        ? ''
        : audioUrl,
    mediaKind: media.mediaKind,
    mediaPick,
  }
}

/** Cómo elegir la media al publicar cada celebración */
export const GREETING_MEDIA_PICKS = ['fixed', 'random', 'profile']

export const GREETING_MEDIA_PICK_LABELS = {
  fixed: 'Imagen fija (misma para todos)',
  random: 'Al azar del pool',
  profile: 'Foto de perfil del usuario',
}

export function normalizeMediaPick(raw) {
  const v = String(raw || '').trim()
  return GREETING_MEDIA_PICKS.includes(v) ? v : 'fixed'
}

/** Pool de imágenes de plantilla (urls de carrusel o cover). */
export function greetingMediaPool(rule = {}) {
  const urls = normalizeMediaUrls(rule.imageUrls)
  if (urls.length) return urls
  const cover = String(rule.imageUrl || '').trim()
  return cover ? [cover] : []
}

/**
 * Resuelve media efectiva para un Post celebración según la plantilla de la regla.
 * @param {object} rule
 * @param {object|null} forUser
 * @param {{ random?: () => number }} opts
 */
export function resolveGreetingPostMedia(rule, forUser = null, { random = Math.random } = {}) {
  const pick = normalizeMediaPick(rule?.mediaPick)
  const pool = greetingMediaPool(rule)
  const audioUrl = String(rule?.audioUrl || '').trim().slice(0, 500)
  const kind = String(rule?.mediaKind || '').trim()
  const pickOne = () => {
    if (!pool.length) return ''
    const idx = Math.min(pool.length - 1, Math.floor(Number(random()) * pool.length))
    return pool[Math.max(0, idx)] || pool[0]
  }

  if (pick === 'profile') {
    const avatar = String(forUser?.avatarUrl || '').trim()
    if (avatar) {
      return {
        imageUrl: avatar.slice(0, 500),
        imageUrls: [],
        audioUrl,
        layout: 'vertical',
        mediaKind: 'image',
      }
    }
    const fallback = pickOne()
    return {
      imageUrl: fallback.slice(0, 500),
      imageUrls: [],
      audioUrl: fallback ? audioUrl : '',
      layout: fallback ? 'banner' : 'vertical',
      mediaKind: fallback ? 'image' : '',
    }
  }

  if (pick === 'random') {
    const chosen = pickOne()
    return {
      imageUrl: chosen.slice(0, 500),
      imageUrls: [],
      audioUrl: chosen ? audioUrl : '',
      layout: chosen ? 'banner' : 'vertical',
      mediaKind: chosen ? 'image' : '',
    }
  }

  // fixed — misma media para todos
  if (kind === 'carousel' && pool.length >= 2) {
    return {
      imageUrl: pool[0].slice(0, 500),
      imageUrls: pool.map((u) => u.slice(0, 500)),
      audioUrl,
      layout: 'vertical',
      mediaKind: 'carousel',
    }
  }
  if (kind === 'video' || kind === 'youtube') {
    const cover = String(rule?.imageUrl || '').trim()
    return {
      imageUrl: cover.slice(0, 500),
      imageUrls: [],
      audioUrl: '',
      layout: 'vertical',
      mediaKind: kind,
    }
  }
  const cover = String(rule?.imageUrl || '').trim() || pool[0] || ''
  return {
    imageUrl: cover.slice(0, 500),
    imageUrls: [],
    audioUrl: cover ? audioUrl : '',
    layout: cover ? rule?.layout || 'banner' : 'vertical',
    mediaKind: cover ? 'image' : '',
  }
}

const VAR_RE = /\{\{\s*(nombre|apellido|cargo|anios)\s*\}\}/gi
const ALLOWED_VARS = new Set(['nombre', 'apellido', 'cargo', 'anios'])

/** Partes de calendario/hora en timezone IANA del tenant. */
export function localParts(date = new Date(), timeZone = 'America/Argentina/Buenos_Aires') {
  const tz = String(timeZone || 'America/Argentina/Buenos_Aires').trim() || 'America/Argentina/Buenos_Aires'
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map = {}
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  let hour = Number(map.hour)
  if (hour === 24) hour = 0
  const month = Number(map.month)
  const day = Number(map.day)
  const year = Number(map.year)
  const minute = Number(map.minute)
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    timeKey: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  }
}

/** Desplaza una fecha Y-M-D (calendario civil, sin TZ). */
export function shiftYmd({ year, month, day }, deltaDays) {
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + Number(deltaDays || 0)))
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  }
}

/** Mes/día desde Date (UTC) — fechas de nacimiento/ingreso se guardan como date-only. */
export function mdFromDate(d) {
  if (!d) return null
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return null
  return { month: x.getUTCMonth() + 1, day: x.getUTCDate() }
}

export function yearsBetween(fromDate, asOfYmd) {
  if (!fromDate || !asOfYmd) return 0
  const from = new Date(fromDate)
  if (Number.isNaN(from.getTime())) return 0
  let years = asOfYmd.year - from.getUTCFullYear()
  const m = from.getUTCMonth() + 1
  const d = from.getUTCDate()
  if (asOfYmd.month < m || (asOfYmd.month === m && asOfYmd.day < d)) years -= 1
  return Math.max(0, years)
}

export function normalizeHours(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/[,;]/)
  const out = []
  for (const item of list) {
    const s = String(item || '').trim()
    const m = /^(\d{1,2}):(\d{2})$/.exec(s)
    if (!m) continue
    const h = Number(m[1])
    const min = Number(m[2])
    if (h < 0 || h > 23 || min < 0 || min > 59) continue
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return [...new Set(out)].sort()
}

export function applyTemplate(text, vars = {}) {
  return String(text || '').replace(VAR_RE, (_, key) => {
    const k = String(key).toLowerCase()
    const v = vars[k]
    return v == null ? '' : String(v)
  })
}

export function findUnknownTemplateVars(text) {
  const found = new Set()
  String(text || '').replace(VAR_RE, (_, key) => {
    const k = String(key).toLowerCase()
    if (!ALLOWED_VARS.has(k)) found.add(k)
    return ''
  })
  // también {{foo}} no listados
  const loose = String(text || '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)
  for (const m of loose) {
    const k = m[1].toLowerCase()
    if (!ALLOWED_VARS.has(k)) found.add(k)
  }
  return [...found]
}

/**
 * Fecha del evento a celebrar relativa a "hoy" local + daysBefore.
 * daysBefore=1 → publicamos hoy el evento de mañana.
 */
export function eventYmdForRun(local, daysBefore = 0) {
  return shiftYmd(local, Number(daysBefore) || 0)
}

export function userMatchesEvent({
  eventType,
  eventYmd,
  user,
  fixedDay,
  fixedMonth,
  typeConfig = null,
  force = false,
}) {
  const cfg = resolveEventTypeConfig(typeConfig || eventType)
  if (!cfg) return false
  const src = cfg.dateSource

  if (src === 'manual') {
    // Solo corre con “Ejecutar ahora” / force
    return Boolean(force)
  }

  if (src === 'fixed') {
    return Number(fixedMonth) === eventYmd.month && Number(fixedDay) === eventYmd.day
  }

  if (src === 'daysAfter') {
    const rawDate = getUserTriggerDate(user, cfg)
    const base = ymdFromDate(rawDate)
    if (!base) return false
    const target = shiftYmd(base, cfg.offsetDays || 0)
    return (
      target.year === eventYmd.year &&
      target.month === eventYmd.month &&
      target.day === eventYmd.day
    )
  }

  // anniversary: nacimiento / ingreso / createdAt / customDate
  const rawDate = getUserTriggerDate(user, cfg)
  const md = mdFromDate(rawDate)
  if (!md || md.month !== eventYmd.month || md.day !== eventYmd.day) return false
  if (cfg.minYears > 0) {
    const years = yearsBetween(rawDate, eventYmd)
    return years >= cfg.minYears
  }
  return true
}

/** ¿El trigger publica 1 post comunitario (sin homenajeado) o 1 por usuario? */
export function isCommunityTrigger(typeConfig) {
  const cfg = resolveEventTypeConfig(typeConfig)
  return cfg?.dateSource === 'fixed'
}

/** ¿Requiere recorrer usuarios de la audiencia? */
export function isPerUserTrigger(typeConfig) {
  const cfg = resolveEventTypeConfig(typeConfig)
  if (!cfg) return false
  return cfg.dateSource !== 'fixed'
}

export function buildRunKey({ ruleId, eventType, dateKey, timeKey, userId }) {
  const uid = userId ? String(userId) : 'all'
  return `${ruleId}:${eventType}:${dateKey}:${timeKey}:${uid}`
}

export function templateVarsForUser(user, eventYmd) {
  const years = yearsBetween(user?.fechaIngreso, eventYmd)
  return {
    nombre: String(user?.nombre || '').trim() || 'colegas',
    apellido: String(user?.apellido || '').trim(),
    cargo: String(user?.cargo || '').trim() || 'equipo',
    anios: String(years),
  }
}

export function normalizeMediaUrls(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((u) => String(u || '').trim()).filter(Boolean))].slice(0, 12)
}

export function inferGreetingMedia({ imageUrl = '', imageUrls = [], mediaKind = '' } = {}) {
  const urls = normalizeMediaUrls(imageUrls)
  const cover = String(imageUrl || '').trim() || urls[0] || ''
  let kind = String(mediaKind || '').trim()
  if (!['image', 'video', 'youtube', 'carousel'].includes(kind)) {
    if (urls.length >= 2) kind = 'carousel'
    else if (/youtu\.be|youtube\.com/i.test(cover)) kind = 'youtube'
    else if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(cover) || /\/video\//i.test(cover)) kind = 'video'
    else if (cover || urls.length === 1) kind = 'image'
    else kind = ''
  }
  if (kind === 'carousel') {
    const slides = urls.length >= 2 ? urls : cover ? [cover, ...urls].filter(Boolean) : []
    const unique = normalizeMediaUrls(slides)
    return {
      mediaKind: unique.length >= 2 ? 'carousel' : unique.length === 1 ? 'image' : '',
      imageUrl: unique[0] || '',
      imageUrls: unique.length >= 2 ? unique : [],
      layout: unique.length >= 2 ? 'vertical' : 'banner',
    }
  }
  if (kind === 'video' || kind === 'youtube') {
    return { mediaKind: kind, imageUrl: cover, imageUrls: [], layout: 'vertical' }
  }
  if (kind === 'image') {
    return { mediaKind: cover ? 'image' : '', imageUrl: cover, imageUrls: [], layout: 'banner' }
  }
  return { mediaKind: '', imageUrl: '', imageUrls: [], layout: 'banner' }
}

/**
 * Valida payload de regla. Devuelve string de error o null.
 * @param {object} raw
 * @param {{ allowedKeys?: string[], typeConfig?: object }} opts
 */
export function validateGreetingRuleInput(raw = {}, opts = {}) {
  const eventType = String(raw.eventType || '').trim()
  const allowed = Array.isArray(opts.allowedKeys) ? opts.allowedKeys : null
  const typeCfg = resolveEventTypeConfig(opts.typeConfig || eventType)
  if (allowed) {
    if (!eventType || !allowed.includes(eventType)) {
      return 'Tipo de celebración inválido o inactivo'
    }
  } else if (!typeCfg) {
    return 'Tipo de saludo inválido'
  }
  const titulo = String(raw.titulo || '').trim()
  if (!titulo) return 'Título obligatorio'
  const hours = normalizeHours(raw.hours)
  if (!hours.length) return 'Indicá al menos una hora HH:MM'
  const dateSource = typeCfg?.dateSource || 'fechaNacimiento'
  if (dateSource === 'fixed') {
    const day = Number(raw.fixedDay)
    const month = Number(raw.fixedMonth)
    if (!Number.isInteger(day) || day < 1 || day > 31) return 'Día fijo inválido (1–31)'
    if (!Number.isInteger(month) || month < 1 || month > 12) return 'Mes fijo inválido (1–12)'
  }
  if (dateSource === 'customDate' && !normalizeCustomDateKey(typeCfg?.customDateKey || raw.customDateKey)) {
    return 'Tipo customDate: configurá la key de fecha personalizada en el tipo'
  }
  if (dateSource === 'daysAfter') {
    const offset = Number(typeCfg?.offsetDays ?? raw.offsetDays ?? 0)
    if (!Number.isFinite(offset) || offset < 0) return 'offsetDays inválido'
    if (
      normalizeOffsetField(typeCfg?.offsetField) === 'customDate' &&
      !normalizeCustomDateKey(typeCfg?.customDateKey)
    ) {
      return 'daysAfter con fecha personalizada: configurá la key en el tipo'
    }
  }
  const unknown = [
    ...findUnknownTemplateVars(titulo),
    ...findUnknownTemplateVars(raw.cuerpo),
  ]
  if (unknown.length) return `Variables no permitidas: ${unknown.join(', ')} (usá nombre, apellido, cargo, anios)`
  const daysBefore = Number(raw.daysBefore ?? 0)
  if (!Number.isFinite(daysBefore) || daysBefore < 0 || daysBefore > 30) {
    return 'Días previos debe ser entre 0 y 30'
  }
  const mediaPick = normalizeMediaPick(raw.mediaPick)
  const pool = greetingMediaPool(raw)
  if (mediaPick === 'random' && !pool.length) {
    return 'Plantilla al azar: cargá al menos 1 imagen en el pool'
  }
  if (mediaPick === 'fixed') {
    const media = inferGreetingMedia(raw)
    if (String(raw.mediaKind || '') === 'carousel' && media.mediaKind !== 'carousel') {
      return 'Carrusel: necesitás al menos 2 imágenes'
    }
  }
  return null
}

export function normalizeGreetingRuleInput(raw = {}, opts = {}) {
  const typeCfg = resolveEventTypeConfig(opts.typeConfig || raw.eventType)
  const eventType = slugifyGreetingTypeKey(raw.eventType) || typeCfg?.key || 'birthday'
  const hours = normalizeHours(raw.hours?.length ? raw.hours : ['09:00'])
  const mediaPick = normalizeMediaPick(raw.mediaPick)
  const audioUrl = String(raw.audioUrl || '').trim().slice(0, 500)
  const dateSource = typeCfg?.dateSource || (eventType === 'fixed_date' ? 'fixed' : 'fechaNacimiento')

  let media
  if (mediaPick === 'random' || mediaPick === 'profile') {
    const pool = greetingMediaPool(raw)
    media = {
      mediaKind: pool.length >= 2 ? 'carousel' : pool.length === 1 ? 'image' : '',
      imageUrl: pool[0] || '',
      imageUrls: pool,
      layout: 'banner',
    }
  } else {
    media = inferGreetingMedia(raw)
  }

  return {
    name: String(raw.name || '').trim().slice(0, 120),
    eventType,
    titulo: String(raw.titulo || '').trim().slice(0, 160),
    cuerpo: String(raw.cuerpo || '').trim().slice(0, 5000),
    imageUrl: media.imageUrl.slice(0, 500),
    imageUrls: media.imageUrls.map((u) => u.slice(0, 500)),
    audioUrl:
      mediaPick === 'fixed' && (media.mediaKind === 'video' || media.mediaKind === 'youtube')
        ? ''
        : audioUrl,
    mediaKind: media.mediaKind,
    mediaPick,
    layout: media.layout,
    hours: hours.length ? hours : ['09:00'],
    daysBefore: Math.min(30, Math.max(0, Number(raw.daysBefore) || 0)),
    fixedDay: dateSource === 'fixed' ? Number(raw.fixedDay) || 1 : null,
    fixedMonth: dateSource === 'fixed' ? Number(raw.fixedMonth) || 1 : null,
    notifyAudience: raw.notifyAudience !== false,
    activo: raw.activo !== false,
  }
}
