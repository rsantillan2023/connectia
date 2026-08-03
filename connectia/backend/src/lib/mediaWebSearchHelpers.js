/**
 * Helpers puros para búsqueda de media (YouTube / audio) en el editor de publicaciones.
 */

const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|m\.youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/))([\w-]{6,})/i

export function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return ''
  const m = url.trim().match(YT_ID_RE)
  return m?.[1] || ''
}

export function isYoutubeUrl(url) {
  return Boolean(extractYoutubeId(url))
}

/** Normaliza a watch?v=ID (o deja vacía si no es YouTube). */
export function normalizeYoutubeWatchUrl(url) {
  const id = extractYoutubeId(url)
  if (!id) return ''
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeThumbnailUrl(urlOrId) {
  const id = extractYoutubeId(urlOrId) || String(urlOrId || '').trim()
  if (!id || !/^[\w-]{6,}$/.test(id)) return ''
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

const AUDIO_EXT_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)(\?|#|$)/i
const AUDIO_HOST_RE =
  /(soundcloud\.com|freesound\.org|archive\.org|mixcloud\.com|bandcamp\.com)/i

export function isLikelyAudioUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return false
  if (AUDIO_EXT_RE.test(u)) return true
  try {
    return AUDIO_HOST_RE.test(new URL(u).hostname)
  } catch {
    return false
  }
}

export function isDirectAudioFileUrl(url) {
  return Boolean(url && AUDIO_EXT_RE.test(String(url).trim()))
}

const VIMEO_ID_RE =
  /(?:vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?|player\.vimeo\.com\/video\/)(\d{6,})/i

export function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return ''
  const m = url.trim().match(VIMEO_ID_RE)
  return m?.[1] || ''
}

export function normalizeVimeoUrl(url) {
  const id = extractVimeoId(url)
  if (!id) return ''
  return `https://vimeo.com/${id}`
}

export function isHlsUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return /\.m3u8(\?|$)/i.test(u.pathname + u.search)
  } catch {
    return false
  }
}

/**
 * Arma query de búsqueda según kind.
 * @param {'youtube'|'vimeo'|'hls'|'audio'} kind
 * @param {string} query
 */
export function buildMediaSearchQuery(kind, query) {
  const q = String(query || '').trim()
  if (kind === 'youtube') {
    if (/site:\s*youtube/i.test(q) || /youtu\.?be/i.test(q)) return q
    return `${q} site:youtube.com`
  }
  if (kind === 'vimeo') {
    if (/site:\s*vimeo/i.test(q) || /vimeo\.com/i.test(q)) return q
    return `${q} site:vimeo.com`
  }
  if (kind === 'hls') {
    if (/\.m3u8|filetype:m3u8/i.test(q)) return q
    return `${q} (m3u8 OR filetype:m3u8 OR "index.m3u8" OR HLS)`
  }
  if (kind === 'audio') {
    if (/filetype:|site:soundcloud|site:archive|\.mp3/i.test(q)) return q
    return `${q} (mp3 OR m4a OR wav OR ogg OR site:soundcloud.com OR site:archive.org)`
  }
  return q
}

/**
 * Filtra / enriquece resultados crudos de búsqueda web.
 * @param {'youtube'|'vimeo'|'hls'|'audio'} kind
 * @param {Array<object>} items
 */
export function refineMediaSearchItems(kind, items) {
  const list = Array.isArray(items) ? items : []
  if (kind === 'youtube') {
    const out = []
    const seen = new Set()
    for (const raw of list) {
      const watch = normalizeYoutubeWatchUrl(raw?.url || '')
      if (!watch) continue
      const id = extractYoutubeId(watch)
      if (seen.has(id)) continue
      seen.add(id)
      out.push({
        id: raw.id || `yt-${id}`,
        title: raw.title || 'Video de YouTube',
        url: watch,
        snippet: raw.snippet || '',
        imageUrl: raw.imageUrl || youtubeThumbnailUrl(id),
        source: raw.source || 'youtube.com',
        provider: raw.provider || 'web',
        kind: 'youtube',
        duration: raw.duration || '',
        channel: raw.channel || raw.channelTitle || '',
      })
    }
    return out
  }

  if (kind === 'vimeo') {
    const out = []
    const seen = new Set()
    for (const raw of list) {
      const normalized = normalizeVimeoUrl(raw?.url || '')
      if (!normalized) continue
      const id = extractVimeoId(normalized)
      if (seen.has(id)) continue
      seen.add(id)
      out.push({
        id: raw.id || `vm-${id}`,
        title: raw.title || 'Video de Vimeo',
        url: normalized,
        snippet: raw.snippet || '',
        imageUrl: raw.imageUrl || '',
        source: raw.source || 'vimeo.com',
        provider: raw.provider || 'web',
        kind: 'vimeo',
        duration: raw.duration || '',
        channel: raw.channel || raw.channelTitle || '',
      })
    }
    return out
  }

  if (kind === 'hls') {
    const out = []
    const seen = new Set()
    for (const raw of list) {
      const url = String(raw?.url || '').trim()
      if (!isHlsUrl(url)) continue
      if (seen.has(url)) continue
      seen.add(url)
      let source = 'hls'
      try {
        source = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        /* ignore */
      }
      out.push({
        id: raw.id || `hls-${out.length}`,
        title: raw.title || 'Stream HLS',
        url,
        snippet: raw.snippet || url,
        imageUrl: raw.imageUrl || '',
        source: raw.source || source,
        provider: raw.provider || 'web',
        kind: 'hls',
        directFile: true,
      })
    }
    return out
  }

  if (kind === 'audio') {
    const scored = []
    for (const raw of list) {
      const url = String(raw?.url || '').trim()
      if (!url || !/^https?:\/\//i.test(url)) continue
      if (!isLikelyAudioUrl(url) && !/\b(audio|podcast|mp3|música|musica|song)\b/i.test(`${raw.title} ${raw.snippet}`)) {
        continue
      }
      const direct = isDirectAudioFileUrl(url)
      scored.push({
        id: raw.id || `aud-${scored.length}`,
        title: raw.title || 'Audio',
        url,
        snippet: raw.snippet || '',
        imageUrl: raw.imageUrl || '',
        source: raw.source || (() => {
          try {
            return new URL(url).hostname.replace(/^www\./, '')
          } catch {
            return 'web'
          }
        })(),
        provider: raw.provider || 'web',
        kind: 'audio',
        directFile: direct,
        score: direct ? 2 : isLikelyAudioUrl(url) ? 1 : 0,
      })
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.map(({ score, ...rest }) => rest)
  }

  return list
}
