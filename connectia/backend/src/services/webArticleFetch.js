/**
 * Baja el HTML de una URL y extrae texto usable + imagen (og:image).
 * También expone hints de marca (logo/colores) vía extractCompanySiteHints.
 */
import { extractCompanySiteHints } from '../lib/companySiteExtract.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

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

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
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

function absoluteUrl(maybe, base) {
  if (!maybe) return ''
  try {
    return new URL(maybe, base).href
  } catch {
    return maybe.startsWith('http') ? maybe : ''
  }
}

function extractTitle(html) {
  const og = metaContent(html, ['og:title', 'twitter:title'])
  if (og) return og
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? stripTags(m[1]).slice(0, 200) : ''
}

function extractImage(html, pageUrl) {
  const raw = metaContent(html, [
    'og:image',
    'og:image:url',
    'twitter:image',
    'twitter:image:src',
  ])
  return absoluteUrl(raw, pageUrl)
}

function extractParagraphs(html) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
  const scope = articleMatch ? articleMatch[0] : cleaned

  const paras = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m
  while ((m = re.exec(scope)) && paras.length < 40) {
    const t = stripTags(m[1])
    if (t.length < 40) continue
    if (/cookie|newsletter|subscribe|suscrib|compartí|compartir|copyright/i.test(t)) continue
    paras.push(t)
  }
  return paras.join('\n\n')
}

function extractFallbackText(html) {
  const desc = metaContent(html, ['og:description', 'description', 'twitter:description'])
  if (desc.length > 80) return desc
  return stripTags(html).slice(0, 4000)
}

/**
 * @param {string} url
 */
export async function fetchArticleContent(url) {
  const target = String(url || '').trim()
  if (!/^https?:\/\//i.test(target)) {
    return { url: target, title: '', text: '', imageUrl: '', siteHints: null, ok: false, error: 'URL inválida' }
  }

  try {
    const res = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return {
        url: target,
        title: '',
        text: '',
        imageUrl: '',
        siteHints: null,
        ok: false,
        error: `HTTP ${res.status}`,
      }
    }
    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    if (ctype && !ctype.includes('html') && !ctype.includes('text') && !ctype.includes('xml')) {
      return {
        url: target,
        title: '',
        text: '',
        imageUrl: '',
        siteHints: null,
        ok: false,
        error: 'No es HTML',
      }
    }

    let html = await res.text()
    if (html.length > 900_000) html = html.slice(0, 900_000)

    const finalUrl = res.url || target
    const title = extractTitle(html)
    const imageUrl = extractImage(html, finalUrl)
    let text = extractParagraphs(html)
    if (text.length < 200) {
      const fb = extractFallbackText(html)
      text = [text, fb].filter(Boolean).join('\n\n')
    }
    text = text.slice(0, 12000)
    const siteHints = extractCompanySiteHints(html, finalUrl)

    return {
      url: finalUrl,
      title,
      text,
      imageUrl,
      siteHints,
      ok: Boolean(text.length >= 80 || imageUrl || siteHints?.logoUrl),
    }
  } catch (e) {
    return {
      url: target,
      title: '',
      text: '',
      imageUrl: '',
      siteHints: null,
      ok: false,
      error: e.message || 'fetch falló',
    }
  }
}

/**
 * Enriquece hasta 3 fuentes con cuerpo e imagen de la página.
 */
export async function enrichSourcesWithArticles(sources) {
  const list = (Array.isArray(sources) ? sources : []).slice(0, 3)
  const fetched = await Promise.all(list.map((s) => fetchArticleContent(s.url)))

  return list.map((s, i) => {
    const art = fetched[i] || {}
    const text = art.text || ''
    const imageUrl = art.imageUrl || s.imageUrl || ''
    return {
      ...s,
      title: s.title || art.title || 'Sin título',
      imageUrl,
      articleText: text,
      articleOk: Boolean(art.ok),
      articleError: art.error || '',
      siteHints: art.siteHints || null,
      contentForAi: text.length >= 120 ? text : [s.snippet, text].filter(Boolean).join('\n\n'),
    }
  })
}
