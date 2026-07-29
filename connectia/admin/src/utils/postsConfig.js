/** Espejo del backend postsConfig para el admin. */
export const POST_TIPOS = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']
export const POST_LAYOUTS = [
  { id: 'vertical', label: 'Vertical', hint: 'Imagen arriba (feed)' },
  { id: 'horizontal', label: 'Horizontal', hint: 'Media al costado' },
  { id: 'banner', label: 'Banner', hint: 'Franja ancha' },
]
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

export const DEFAULT_SHOW = Object.fromEntries(POST_SHOW_KEYS.map((k) => [k.key, true]))

export function emptyDisplayOverrides() {
  return { show: {} }
}

/** Tri-state: null = heredar del tipo, true/false = forzar */
export function showOverrideValue(display, key) {
  const v = display?.show?.[key]
  return typeof v === 'boolean' ? v : null
}

export function setShowOverride(display, key, value) {
  const show = { ...(display?.show || {}) }
  if (value === null || value === undefined) delete show[key]
  else show[key] = Boolean(value)
  return { show }
}
