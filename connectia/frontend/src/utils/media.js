/**
 * Utilidades de media para el muro (imagen | video archivo | YouTube/Vimeo).
 */

export function youtubeId(url) {
  if (!url || typeof url !== 'string') return ''
  const u = url.trim()
  if (!u) return ''
  const patterns = [
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|m\.youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/))([\w-]{6,})/i,
    /youtube\.com\/watch\?.*\bv=([\w-]{6,})/i,
  ]
  for (const re of patterns) {
    const m = u.match(re)
    if (m?.[1]) return m[1]
  }
  return ''
}

export function youtubeEmbedUrl(url, opts = {}) {
  const id = youtubeId(url)
  if (!id) return ''
  const params = new URLSearchParams()
  if (opts.autoplay) {
    params.set('autoplay', '1')
    params.set('mute', '1')
    params.set('playsinline', '1')
  }
  if (opts.loop) {
    params.set('loop', '1')
    params.set('playlist', id) // YouTube exige playlist=id para loop
  }
  params.set('rel', '0')
  params.set('modestbranding', '1')
  const q = params.toString()
  return `https://www.youtube.com/embed/${id}?${q}`
}

export function vimeoEmbedUrl(url, opts = {}) {
  if (!url || typeof url !== 'string') return ''
  const m = url.trim().match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (!m?.[1]) return ''
  const params = new URLSearchParams()
  if (opts.autoplay) {
    params.set('autoplay', '1')
    params.set('muted', '1')
  }
  if (opts.loop) params.set('loop', '1')
  const q = params.toString()
  return `https://player.vimeo.com/video/${m[1]}${q ? `?${q}` : ''}`
}

/**
 * @returns {'image'|'video'|'embed'|null}
 */
export function mediaKind(url) {
  if (!url || typeof url !== 'string') return null
  const u = url.trim()
  if (!u) return null
  if (youtubeId(u) || /vimeo\.com/i.test(u)) return 'embed'
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u)) return 'video'
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(u)) return 'embed'
  return 'image'
}

export function mediaKindLabel(url) {
  const k = mediaKind(url)
  if (k === 'embed') return youtubeId(url) ? 'YouTube' : 'Video embebido'
  if (k === 'video') return 'Video'
  if (k === 'image') return 'Imagen'
  return ''
}

/**
 * Reescribe URLs de /uploads absolutas a rutas relativas (proxy Vite / LAN).
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return ''
  let u = url.trim()
  if (!u) return ''

  const absLocal = u.match(/^https?:\/\/[^/]+(\/(?:uploads|branding)\/.+)$/i)
  if (absLocal) u = absLocal[1]

  if (u.startsWith('/uploads/') || u.startsWith('/branding/')) {
    const api = import.meta.env.VITE_API_URL
    if (api && /^https?:\/\//i.test(api)) {
      const base = String(api).replace(/\/api\/?$/, '').replace(/\/$/, '')
      return `${base}${u}`
    }
    return u
  }
  return u
}

/** Proxy interno para imágenes externas que bloquean hotlink. */
export function proxiedMediaUrl(url) {
  const resolved = resolveMediaUrl(url)
  if (!resolved || !/^https?:\/\//i.test(resolved)) return resolved
  if (/\/api\/media\/proxy/i.test(resolved)) return resolved
  // No proxyear embeds de video
  if (mediaKind(resolved) === 'embed') return resolved
  return `/api/media/proxy?url=${encodeURIComponent(resolved)}`
}

export function initials(name) {
  const p = String(name || 'C').trim().split(/\s+/)
  return ((p[0]?.[0] || 'C') + (p[1]?.[0] || '')).toUpperCase()
}

export function formatPostDate(d) {
  if (!d) return ''
  try {
    return new Date(d)
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      .toLowerCase()
  } catch {
    return ''
  }
}

/** URLs de media de un post (carrusel o una sola). */
export function postImageUrls(post) {
  const many = Array.isArray(post?.imageUrls)
    ? post.imageUrls.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean)
    : []
  if (many.length >= 2) return many
  const one = typeof post?.imageUrl === 'string' ? post.imageUrl.trim() : ''
  if (many.length === 1) return many
  return one ? [one] : []
}

export function hasPostMedia(post) {
  return postImageUrls(post).length > 0
}

export function isPostCarousel(post) {
  return postImageUrls(post).length >= 2
}
