/**
 * Extracción pura de logo / colores / meta desde HTML de un sitio corporativo.
 * Testeable sin red.
 */

const HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g

function decodeEntities(html) {
  return String(html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

export function absoluteUrl(maybe, base) {
  if (!maybe) return ''
  const raw = decodeEntities(String(maybe).trim())
  if (!raw) return ''
  try {
    return new URL(raw, base).href
  } catch {
    return raw.startsWith('http') ? raw : ''
  }
}

function metaContent(html, names) {
  for (const name of names) {
    const re1 = new RegExp(
      `<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      'i',
    )
    const re2 = new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["'][^>]*>`,
      'i',
    )
    const m = html.match(re1) || html.match(re2)
    if (m?.[1]) return decodeEntities(m[1]).trim()
  }
  return ''
}

function normalizeHex(hex) {
  let h = String(hex || '').trim()
  if (!h.startsWith('#')) h = `#${h}`
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return ''
  return h.toUpperCase()
}

function hexLuminance(hex) {
  const h = normalizeHex(hex).slice(1)
  if (!h) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function isBoringColor(hex) {
  const h = normalizeHex(hex)
  if (!h) return true
  const lum = hexLuminance(h)
  if (lum > 0.92 || lum < 0.08) return true
  // grises casi neutros
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  const spread = Math.max(r, g, b) - Math.min(r, g, b)
  return spread < 18
}

function darkenHex(hex, factor = 0.72) {
  const h = normalizeHex(hex).slice(1)
  if (!h) return ''
  const parts = [0, 2, 4].map((i) => {
    const n = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * factor)))
    return n.toString(16).padStart(2, '0')
  })
  return `#${parts.join('')}`.toUpperCase()
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
export function extractLogoCandidates(html, pageUrl) {
  const out = []
  const push = (url, score, reason) => {
    const abs = absoluteUrl(url, pageUrl)
    if (!abs || !/^https?:\/\//i.test(abs)) return
    if (/\.svg(\?|$)/i.test(abs) || /logo/i.test(abs)) score += 8
    if (/favicon|sprite|tracking|pixel|1x1|analytics/i.test(abs)) score -= 20
    if (out.some((x) => x.url === abs)) return
    out.push({ url: abs, score, reason })
  }

  const apple = html.match(
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  )
  if (apple?.[1]) push(apple[1], 40, 'apple-touch-icon')

  const icons = html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)
  for (const m of icons) {
    const tag = m[0]
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    const sizes = tag.match(/sizes=["']([^"']+)["']/i)?.[1] || ''
    let score = 25
    if (/svg/i.test(tag) || /\.svg/i.test(href || '')) score = 45
    if (/(\d+)x\1/i.test(sizes)) {
      const n = Number(sizes.match(/(\d+)/)?.[1] || 0)
      if (n >= 128) score += 10
      if (n >= 180) score += 5
    }
    if (href) push(href, score, 'link-icon')
  }

  const ogLogo = metaContent(html, ['og:logo', 'og:image:logo'])
  if (ogLogo) push(ogLogo, 50, 'og:logo')

  const itemprop = html.match(
    /<img[^>]+itemprop=["']logo["'][^>]*src=["']([^"']+)["'][^>]*>/i,
  ) || html.match(/<img[^>]+src=["']([^"']+)["'][^>]*itemprop=["']logo["'][^>]*>/i)
  if (itemprop?.[1]) push(itemprop[1], 55, 'schema-logo')

  const logoImgs = html.matchAll(/<img\b[^>]*>/gi)
  let scanned = 0
  for (const m of logoImgs) {
    if (scanned++ > 80) break
    const tag = m[0]
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]
    if (!src) continue
    const blob = `${tag} ${src}`.toLowerCase()
    if (!/logo|brand|isotipo|wordmark|marca/.test(blob)) continue
    let score = 35
    if (/header|nav|navbar|site-logo|brand/.test(blob)) score += 10
    if (/\.svg(\?|$)/i.test(src)) score += 12
    push(src, score, 'img-logo')
  }

  return out.sort((a, b) => b.score - a.score)
}

/**
 * @param {string} html
 */
export function extractBrandColors(html) {
  const theme = normalizeHex(metaContent(html, ['theme-color', 'msapplication-TileColor']))
  const counts = new Map()

  const styleBlocks = String(html || '').match(/<style[\s\S]*?<\/style>/gi) || []
  const cssChunk = [
    ...styleBlocks,
    ...(String(html || '').match(/style=["'][^"']*["']/gi) || []).slice(0, 200),
  ].join('\n')

  let m
  HEX_RE.lastIndex = 0
  while ((m = HEX_RE.exec(cssChunk))) {
    const hex = normalizeHex(m[0])
    if (!hex || isBoringColor(hex)) continue
    counts.set(hex, (counts.get(hex) || 0) + 1)
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
  let primary = theme && !isBoringColor(theme) ? theme : ranked[0] || ''
  let secondary = ranked.find((c) => c !== primary) || ''
  if (primary && !secondary) secondary = darkenHex(primary)
  if (!primary) {
    primary = ''
    secondary = ''
  }
  return { primary, secondary, themeColor: theme || '', candidates: ranked.slice(0, 8) }
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
export function extractCompanySiteHints(html, pageUrl) {
  const logos = extractLogoCandidates(html, pageUrl)
  const colors = extractBrandColors(html)
  const description = metaContent(html, ['og:description', 'description', 'twitter:description'])
  const title = metaContent(html, ['og:title', 'twitter:title']) || ''
  const ogImage = absoluteUrl(
    metaContent(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']),
    pageUrl,
  )
  const bestLogo = logos[0]?.url || ''
  // og:image suele ser foto de hero; solo usarla como logo si parece logo
  const ogAsLogo =
    ogImage && (/logo/i.test(ogImage) || /\.svg(\?|$)/i.test(ogImage)) ? ogImage : ''

  return {
    logoUrl: bestLogo || ogAsLogo || '',
    logoCandidates: logos.slice(0, 5).map((l) => l.url),
    primary: colors.primary,
    secondary: colors.secondary,
    themeColor: colors.themeColor,
    colorCandidates: colors.candidates,
    description: description.slice(0, 400),
    title: title.slice(0, 200),
    ogImage: ogImage || '',
    loginBgUrl: ogImage && ogImage !== bestLogo ? ogImage : '',
  }
}
