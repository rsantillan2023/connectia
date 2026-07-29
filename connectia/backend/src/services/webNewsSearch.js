/**
 * Búsqueda web para armar noticias del muro.
 * Proveedores (en orden): Serper → Brave → DuckDuckGo HTML (sin key).
 */

function decodeDuckRedirect(href) {
  try {
    const u = new URL(href, 'https://duckduckgo.com')
    const uddg = u.searchParams.get('uddg')
    if (uddg) return decodeURIComponent(uddg)
    return href.startsWith('http') ? href : `https:${href}`
  } catch {
    return href
  }
}

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchSerper(query, limit) {
  const key = (process.env.SERPER_API_KEY || '').trim()
  if (!key) return null
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: limit }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Serper HTTP ${res.status}`)
  }
  const organic = Array.isArray(data.organic) ? data.organic : []
  return organic.slice(0, limit).map((r, i) => ({
    id: `serper-${i}`,
    title: r.title || 'Sin título',
    url: r.link || '',
    snippet: r.snippet || '',
    imageUrl: r.imageUrl || r.thumbnailUrl || '',
    source: (() => {
      try {
        return new URL(r.link).hostname.replace(/^www\./, '')
      } catch {
        return 'web'
      }
    })(),
    provider: 'serper',
  }))
}

async function searchBrave(query, limit) {
  const key = (process.env.BRAVE_SEARCH_API_KEY || '').trim()
  if (!key) return null
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(limit))
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': key,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.detail || `Brave HTTP ${res.status}`)
  }
  const results = data?.web?.results || []
  return results.slice(0, limit).map((r, i) => ({
    id: `brave-${i}`,
    title: r.title || 'Sin título',
    url: r.url || '',
    snippet: r.description || '',
    imageUrl: r.thumbnail?.src || r.thumbnail?.original || '',
    source: (() => {
      try {
        return new URL(r.url).hostname.replace(/^www\./, '')
      } catch {
        return 'web'
      }
    })(),
    provider: 'brave',
  }))
}

async function searchDuckDuckGo(query, limit) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; Connectia/1.0; +local)',
    },
    body: new URLSearchParams({ q: query }).toString(),
  })
  if (!res.ok) {
    throw new Error(`DuckDuckGo HTTP ${res.status}`)
  }
  const html = await res.text()
  const results = []
  const blockRe =
    /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*result[^"]*"|$)/gi
  let m
  while ((m = blockRe.exec(html)) && results.length < limit) {
    const block = m[1]
    const linkM = block.match(/class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!linkM) continue
    const url = decodeDuckRedirect(linkM[1])
    if (!url || url.includes('duckduckgo.com')) continue
    let host = 'web'
    try {
      host = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      /* ignore */
    }
    const snipM = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|span)>/i)
    const imgM =
      block.match(/class="[^"]*result__icon__img[^"]*"[^>]*src="([^"]+)"/i) ||
      block.match(/class="[^"]*result__img[^"]*"[^>]*src="([^"]+)"/i) ||
      block.match(/data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    let imageUrl = ''
    if (imgM?.[1] && !/icon|favicon|sprite/i.test(imgM[1])) {
      imageUrl = decodeDuckRedirect(imgM[1])
      if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`
    }
    results.push({
      id: `ddg-${results.length}`,
      title: stripTags(linkM[2]) || 'Sin título',
      url,
      snippet: stripTags(snipM?.[1] || ''),
      imageUrl,
      source: host,
      provider: 'duckduckgo',
    })
  }
  // Fallback al parser anterior si el bloque falló
  if (!results.length) {
    const legacy =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td)>)?/gi
    let lm
    while ((lm = legacy.exec(html)) && results.length < limit) {
      const url = decodeDuckRedirect(lm[1])
      if (!url || url.includes('duckduckgo.com')) continue
      let host = 'web'
      try {
        host = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        /* ignore */
      }
      results.push({
        id: `ddg-${results.length}`,
        title: stripTags(lm[2]) || 'Sin título',
        url,
        snippet: stripTags(lm[3] || ''),
        imageUrl: '',
        source: host,
        provider: 'duckduckgo',
      })
    }
  }
  return results
}

/**
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export async function searchWebNews(query, opts = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) {
    const err = new Error('Escribí al menos 2 caracteres para buscar')
    err.status = 400
    throw err
  }
  const limit = Math.min(12, Math.max(3, Number(opts.limit) || 8))
  const errors = []

  try {
    const serper = await searchSerper(q, limit)
    if (serper?.length) {
      return { query: q, provider: 'serper', items: serper }
    }
  } catch (e) {
    errors.push(`serper: ${e.message}`)
  }

  try {
    const brave = await searchBrave(q, limit)
    if (brave?.length) {
      return { query: q, provider: 'brave', items: brave }
    }
  } catch (e) {
    errors.push(`brave: ${e.message}`)
  }

  try {
    const ddg = await searchDuckDuckGo(q, limit)
    if (ddg?.length) {
      return { query: q, provider: 'duckduckgo', items: ddg }
    }
  } catch (e) {
    errors.push(`duckduckgo: ${e.message}`)
  }

  const err = new Error(
    errors.length
      ? `No se pudieron obtener resultados. ${errors.join(' | ')}`
      : 'La búsqueda no devolvió resultados. Probá otras palabras.',
  )
  err.status = 502
  throw err
}

export function webSearchProvidersConfigured() {
  return {
    serper: Boolean((process.env.SERPER_API_KEY || '').trim()),
    brave: Boolean((process.env.BRAVE_SEARCH_API_KEY || '').trim()),
    duckduckgo: true,
  }
}
