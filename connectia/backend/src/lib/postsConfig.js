export const POST_TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']

export const POST_LAYOUTS = ['vertical', 'horizontal', 'banner']

/** Elementos configurables de la tarjeta */
export const POST_SHOW_KEYS = [
  { key: 'avatar', label: 'Avatar' },
  { key: 'authorName', label: 'Nombre del autor' },
  { key: 'tipo', label: 'Tipo de publicación' },
  { key: 'title', label: 'Título' },
  { key: 'body', label: 'Texto / cuerpo' },
  { key: 'date', label: 'Fecha' },
  { key: 'pinned', label: 'Indicador fijada' },
  { key: 'media', label: 'Imagen / video' },
  { key: 'reactions', label: 'Reacciones (likes)' },
]

export const DEFAULT_SHOW = {
  avatar: true,
  authorName: true,
  tipo: true,
  title: true,
  body: true,
  date: true,
  pinned: true,
  media: true,
  reactions: true,
}

/** Layout sugerido por tipo (solo default al crear) */
const DEFAULT_LAYOUT_BY_TIPO = {
  noticia: 'banner',
  aviso: 'horizontal',
  beneficio: 'vertical',
  evento: 'vertical',
  general: 'horizontal',
  celebracion: 'banner',
}

export function defaultTipoConfig(tipo) {
  return {
    defaultLayout: DEFAULT_LAYOUT_BY_TIPO[tipo] || 'vertical',
    show: { ...DEFAULT_SHOW },
  }
}

export function defaultPostsConfig() {
  const byTipo = {}
  for (const t of POST_TIPOS) byTipo[t] = defaultTipoConfig(t)
  return { byTipo }
}

function normalizeShow(raw, fallback = DEFAULT_SHOW) {
  const out = { ...fallback }
  if (!raw || typeof raw !== 'object') return out
  for (const { key } of POST_SHOW_KEYS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]
  }
  return out
}

/** Overrides parciales: solo keys booleanas presentes; el resto se hereda */
export function normalizeShowOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const { key } of POST_SHOW_KEYS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]
  }
  return out
}

export function normalizePostsConfig(raw) {
  const base = defaultPostsConfig()
  if (!raw || typeof raw !== 'object') return base
  const incoming = raw.byTipo && typeof raw.byTipo === 'object' ? raw.byTipo : {}
  const byTipo = {}
  for (const t of POST_TIPOS) {
    const src = incoming[t] || {}
    const layout = POST_LAYOUTS.includes(src.defaultLayout) ? src.defaultLayout : base.byTipo[t].defaultLayout
    byTipo[t] = {
      defaultLayout: layout,
      show: normalizeShow(src.show, base.byTipo[t].show),
    }
  }
  return { byTipo }
}

export function normalizePostDisplay(raw) {
  if (!raw || typeof raw !== 'object') return { show: {} }
  return { show: normalizeShowOverrides(raw.show) }
}

/**
 * Resuelve layout + show efectivos para render (tipo config + override de instancia).
 * `post.layout` siempre gana si está seteado (es el formato de la instancia).
 */
export function resolvePostPresentation(post, postsConfig) {
  const cfg = normalizePostsConfig(postsConfig)
  const tipo = POST_TIPOS.includes(post?.tipo) ? post.tipo : 'noticia'
  const tipoCfg = cfg.byTipo[tipo] || defaultTipoConfig(tipo)
  const overrides = normalizeShowOverrides(post?.display?.show)
  const show = { ...tipoCfg.show }
  for (const [k, v] of Object.entries(overrides)) show[k] = v

  const layout = POST_LAYOUTS.includes(post?.layout)
    ? post.layout
    : tipoCfg.defaultLayout || 'vertical'

  return { layout, show, tipoConfig: tipoCfg }
}
