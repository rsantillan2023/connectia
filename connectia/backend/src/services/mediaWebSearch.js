/**
 * Búsqueda de media (YouTube / audio) para el editor de publicaciones.
 * Reusa Serper videos + cascada web (Serper/Brave/DDG) de webNewsSearch.
 */

import { searchWebNews, webSearchProvidersConfigured } from './webNewsSearch.js'
import {
  buildMediaSearchQuery,
  refineMediaSearchItems,
  youtubeThumbnailUrl,
  extractYoutubeId,
  normalizeYoutubeWatchUrl,
} from '../lib/mediaWebSearchHelpers.js'

async function searchSerperVideos(query, limit) {
  const key = (process.env.SERPER_API_KEY || '').trim()
  if (!key) return null
  const res = await fetch('https://google.serper.dev/videos', {
    method: 'POST',
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: limit }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Serper videos HTTP ${res.status}`)
  }
  const videos = Array.isArray(data.videos) ? data.videos : []
  return videos.slice(0, limit).map((r, i) => {
    const link = r.link || r.url || ''
    const id = extractYoutubeId(link)
    return {
      id: `serper-vid-${i}`,
      title: r.title || 'Video',
      url: normalizeYoutubeWatchUrl(link) || link,
      snippet: r.snippet || r.description || '',
      imageUrl: r.imageUrl || r.thumbnailUrl || (id ? youtubeThumbnailUrl(id) : ''),
      source: (() => {
        try {
          return new URL(link).hostname.replace(/^www\./, '')
        } catch {
          return 'video'
        }
      })(),
      provider: 'serper-videos',
      duration: r.duration || '',
      channel: r.channel || r.channelTitle || '',
    }
  })
}

/**
 * @param {'youtube'|'audio'} kind
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export async function searchMediaOnWeb(kind, query, opts = {}) {
  const k = kind === 'audio' ? 'audio' : 'youtube'
  const q = String(query || '').trim()
  if (q.length < 2) {
    const err = new Error('Escribí al menos 2 caracteres para buscar')
    err.status = 400
    throw err
  }
  const limit = Math.min(12, Math.max(4, Number(opts.limit) || 8))
  const searchQ = buildMediaSearchQuery(k, q)
  const errors = []

  if (k === 'youtube') {
    try {
      const videos = await searchSerperVideos(searchQ.replace(/\s*site:youtube\.com\s*/i, ' ').trim() || q, limit)
      const refined = refineMediaSearchItems('youtube', videos || [])
      if (refined.length) {
        return { query: q, searchQuery: searchQ, kind: k, provider: 'serper-videos', items: refined }
      }
    } catch (e) {
      errors.push(`serper-videos: ${e.message}`)
    }
  }

  try {
    const web = await searchWebNews(searchQ, { limit: Math.min(12, limit + 4) })
    const refined = refineMediaSearchItems(k, web.items || [])
    if (refined.length) {
      return {
        query: q,
        searchQuery: searchQ,
        kind: k,
        provider: web.provider,
        items: refined.slice(0, limit),
      }
    }
    errors.push(`${web.provider || 'web'}: sin resultados útiles para ${k}`)
  } catch (e) {
    errors.push(`web: ${e.message}`)
  }

  const err = new Error(
    errors.length
      ? `No se encontraron ${k === 'youtube' ? 'videos de YouTube' : 'audios'}. ${errors.join(' | ')}`
      : `No hubo resultados de ${k === 'youtube' ? 'YouTube' : 'audio'}. Probá otras palabras.`,
  )
  err.status = 502
  throw err
}

export function mediaSearchProvidersConfigured() {
  return webSearchProvidersConfigured()
}
