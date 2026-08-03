import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractYoutubeId,
  normalizeYoutubeWatchUrl,
  youtubeThumbnailUrl,
  extractVimeoId,
  normalizeVimeoUrl,
  isHlsUrl,
  isLikelyAudioUrl,
  isDirectAudioFileUrl,
  buildMediaSearchQuery,
  refineMediaSearchItems,
} from '../lib/mediaWebSearchHelpers.js'

test('extractYoutubeId reconoce watch, youtu.be y shorts', () => {
  assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(extractYoutubeId('https://example.com/no'), '')
})

test('normalizeYoutubeWatchUrl unifica a watch?v=', () => {
  assert.equal(
    normalizeYoutubeWatchUrl('https://youtu.be/dQw4w9WgXcQ?t=10'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  )
})

test('youtubeThumbnailUrl', () => {
  assert.equal(
    youtubeThumbnailUrl('https://youtu.be/dQw4w9WgXcQ'),
    'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  )
})

test('isLikelyAudioUrl / isDirectAudioFileUrl', () => {
  assert.equal(isDirectAudioFileUrl('https://cdn.example.com/nota.mp3'), true)
  assert.equal(isLikelyAudioUrl('https://soundcloud.com/artist/track'), true)
  assert.equal(isLikelyAudioUrl('https://example.com/page'), false)
})

test('buildMediaSearchQuery agrega filtros', () => {
  assert.match(buildMediaSearchQuery('youtube', 'calistenia'), /site:youtube\.com/)
  assert.match(buildMediaSearchQuery('vimeo', 'lanzamiento'), /site:vimeo\.com/)
  assert.match(buildMediaSearchQuery('hls', 'demo live'), /m3u8/)
  assert.match(buildMediaSearchQuery('audio', 'motivación'), /mp3/)
  assert.equal(buildMediaSearchQuery('youtube', 'foo site:youtube.com'), 'foo site:youtube.com')
})

test('vimeo / hls helpers', () => {
  assert.equal(extractVimeoId('https://vimeo.com/123456789'), '123456789')
  assert.equal(normalizeVimeoUrl('https://player.vimeo.com/video/123456789'), 'https://vimeo.com/123456789')
  assert.equal(isHlsUrl('https://cdn.example.com/live/index.m3u8'), true)
  assert.equal(isHlsUrl('https://example.com/video.mp4'), false)
})

test('refineMediaSearchItems youtube dedupe y thumb', () => {
  const items = refineMediaSearchItems('youtube', [
    { id: '1', title: 'A', url: 'https://youtu.be/dQw4w9WgXcQ', snippet: 'x', provider: 't' },
    { id: '2', title: 'dup', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', snippet: 'y', provider: 't' },
    { id: '3', title: 'no', url: 'https://vimeo.com/123', snippet: 'z', provider: 't' },
  ])
  assert.equal(items.length, 1)
  assert.equal(items[0].url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.match(items[0].imageUrl, /hqdefault/)
})

test('refineMediaSearchItems vimeo y hls', () => {
  const vimeo = refineMediaSearchItems('vimeo', [
    { id: '1', title: 'A', url: 'https://vimeo.com/111222333', snippet: 'x' },
    { id: '2', title: 'dup', url: 'https://player.vimeo.com/video/111222333', snippet: 'y' },
    { id: '3', title: 'yt', url: 'https://youtu.be/dQw4w9WgXcQ', snippet: 'z' },
  ])
  assert.equal(vimeo.length, 1)
  assert.equal(vimeo[0].url, 'https://vimeo.com/111222333')

  const hls = refineMediaSearchItems('hls', [
    { id: '1', title: 'Stream', url: 'https://cdn.example.com/a.m3u8', snippet: 'live' },
    { id: '2', title: 'No', url: 'https://example.com/page', snippet: 'm3u8 mention' },
  ])
  assert.equal(hls.length, 1)
  assert.equal(hls[0].url, 'https://cdn.example.com/a.m3u8')
})

test('refineMediaSearchItems audio prioriza archivo directo', () => {
  const items = refineMediaSearchItems('audio', [
    { id: '1', title: 'Página podcast', url: 'https://example.com/podcast-episode', snippet: 'audio podcast', provider: 't', source: 'example.com' },
    { id: '2', title: 'Track', url: 'https://cdn.example.com/song.mp3', snippet: 'mp3', provider: 't', source: 'cdn.example.com' },
    { id: '3', title: 'SC', url: 'https://soundcloud.com/x/y', snippet: 'music', provider: 't', source: 'soundcloud.com' },
  ])
  assert.equal(items[0].url, 'https://cdn.example.com/song.mp3')
  assert.equal(items[0].directFile, true)
  assert.ok(items.some((i) => i.url.includes('soundcloud')))
})
