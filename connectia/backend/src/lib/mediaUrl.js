/**
 * Normaliza URLs de media para el cliente (app / admin).
 * - /uploads/... relativas (pasan por proxy Vite o mismo host)
 * - reescribe http://localhost:4000/uploads/... → /uploads/...
 */

export function toPublicMediaUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const u = url.trim()
  if (!u) return ''
  const m = u.match(/^https?:\/\/[^/]+(\/(?:uploads|branding)\/.+)$/i)
  if (m) return m[1]
  return u
}

/** Normaliza URLs de branding (logo, fondos) para API pública. */
export function serializeBranding(branding) {
  if (!branding || typeof branding !== 'object') {
    return {
      primary: '#8554C9',
      secondary: '#6B3FA0',
      logoUrl: '',
      loginBgUrl: '',
      pointsBtnDarkenPct: 22,
      splash: {},
    }
  }
  const b = typeof branding.toObject === 'function' ? branding.toObject() : { ...branding }
  const splash = b.splash && typeof b.splash === 'object' ? { ...b.splash } : {}
  return {
    ...b,
    primary: b.primary || '#8554C9',
    secondary: b.secondary || '#6B3FA0',
    pointsBtnDarkenPct: (() => {
      const n = Number(b.pointsBtnDarkenPct)
      if (!Number.isFinite(n)) return 22
      return Math.min(80, Math.max(0, Math.round(n)))
    })(),
    logoUrl: toPublicMediaUrl(b.logoUrl || ''),
    loginBgUrl: toPublicMediaUrl(b.loginBgUrl || ''),
    splash: {
      ...splash,
      logoUrl: toPublicMediaUrl(splash.logoUrl || ''),
      bgImageUrl: toPublicMediaUrl(splash.bgImageUrl || ''),
    },
  }
}

/** Filtra y limpia un array de URLs de media. */
export function cleanMediaUrlList(urls) {
  if (!Array.isArray(urls)) return []
  return urls
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
}

/**
 * Resuelve campos de media entrantes (create/patch).
 * - 2+ en imageUrls → carrusel (imageUrl = primera)
 * - 1 sola en imageUrls → media simple
 * - sin imageUrls → usa imageUrl
 */
export function resolvePostMediaFields(body = {}) {
  const urls = cleanMediaUrlList(body.imageUrls)
  const single = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
  if (urls.length >= 2) {
    return { imageUrl: urls[0], imageUrls: urls }
  }
  if (urls.length === 1) {
    return { imageUrl: urls[0], imageUrls: [] }
  }
  return { imageUrl: single, imageUrls: [] }
}

/** Serializa imageUrl + imageUrls para API (carrusel solo si hay 2+). */
export function serializePostMedia(p) {
  const rawCarousel = cleanMediaUrlList(p?.imageUrls)
  const imageUrls =
    rawCarousel.length >= 2 ? rawCarousel.map(toPublicMediaUrl).filter(Boolean) : []
  const imageUrl =
    toPublicMediaUrl(p?.imageUrl) ||
    (imageUrls[0] || '') ||
    toPublicMediaUrl(rawCarousel[0])
  return { imageUrl, imageUrls }
}

/**
 * Media de encuesta: imágenes (1 o carrusel) + video opcional.
 * Misma regla de imageUrls que posts; videoUrl es independiente.
 */
export function resolveSurveyMediaFields(body = {}) {
  const { imageUrl, imageUrls } = resolvePostMediaFields(body)
  const videoUrl =
    typeof body.videoUrl === 'string' ? body.videoUrl.trim().slice(0, 500) : ''
  return { imageUrl, imageUrls, videoUrl }
}

/** Serializa media de encuesta para API. */
export function serializeSurveyMedia(s) {
  const { imageUrl, imageUrls } = serializePostMedia(s)
  return {
    imageUrl,
    imageUrls,
    videoUrl: toPublicMediaUrl(s?.videoUrl || ''),
  }
}
