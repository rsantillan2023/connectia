import crypto from 'crypto'

export const OLA26_TV_CAPS = ['tv.mode']
export const OLA26_LIVE_CAPS = ['live.stream']
export const OLA26_ADMIN_CAPS = ['admin.tv', 'admin.live']
export const OLA26_PRODUCT_CAPS = [...OLA26_TV_CAPS, ...OLA26_LIVE_CAPS, ...OLA26_ADMIN_CAPS]

export const PAIRING_TTL_MS = 5 * 60 * 1000
export const PAIRING_MAX_ATTEMPTS = 5
export const DEVICE_TOKEN_BYTES = 32

const STREAM_HOST_ALLOW = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]

/** Dominios / patrones permitidos para streamUrl externa (Track B). */
export function isAllowedStreamUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return false
  let url
  try {
    url = new URL(s)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  if (STREAM_HOST_ALLOW.includes(host)) return true
  if (host.endsWith('.youtube.com')) return true
  if (/\.m3u8(\?|$)/i.test(url.pathname + url.search)) return true
  return false
}

export function generatePairingCode() {
  const n = crypto.randomInt(0, 1_000_000)
  return String(n).padStart(6, '0')
}

export function generateDeviceCredential() {
  return crypto.randomBytes(DEVICE_TOKEN_BYTES).toString('base64url')
}

export function hashDeviceCredential(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function tenantHasTvCap(tenant) {
  const caps = new Set(tenant?.capabilities || [])
  return caps.has('tv.mode')
}

export function tenantHasLiveCap(tenant) {
  const caps = new Set(tenant?.capabilities || [])
  return caps.has('live.stream')
}

/** Estado efectivo de un live según horario + status guardado. */
export function resolveLiveEffectiveStatus(doc, now = new Date()) {
  const status = doc?.status || 'draft'
  if (status === 'draft' || status === 'ended') return status
  const start = doc.startsAt ? new Date(doc.startsAt) : null
  const end = doc.endsAt ? new Date(doc.endsAt) : null
  if (status === 'scheduled') {
    if (start && now >= start && (!end || now < end)) return 'live'
    if (end && now >= end) return 'ended'
    return 'scheduled'
  }
  if (status === 'live') {
    if (end && now >= end) return 'ended'
    return 'live'
  }
  return status
}

export function filterActivePlaylistItems(items, now = new Date()) {
  const list = Array.isArray(items) ? items : []
  return list
    .filter((it) => it && it.activo !== false)
    .filter((it) => {
      if (it.startsAt && new Date(it.startsAt) > now) return false
      if (it.endsAt && new Date(it.endsAt) <= now) return false
      return true
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function buildFeedManifest(playlist, device, tenant) {
  const now = new Date()
  const items = filterActivePlaylistItems(playlist?.items, now).map((it) => ({
    id: String(it._id || it.id || ''),
    type: it.type,
    url: it.url || '',
    text: it.text || '',
    postId: it.postId ? String(it.postId) : null,
    durationSec: it.durationSec || 15,
  }))
  const version = playlist?.version || 1
  const etag = `"tv-${String(playlist?._id || 'none')}-v${version}"`
  return {
    deviceId: device?._id ? String(device._id) : null,
    playlistId: playlist?._id ? String(playlist._id) : null,
    playlistVersion: version,
    etag,
    mute: device?.mute !== false,
    orientation: device?.orientation || 'landscape',
    fallbackText: playlist?.fallbackText || 'Contenido no disponible',
    brandName: tenant?.nombre || 'Connectia',
    logoUrl: tenant?.branding?.logoUrl || tenant?.logoUrl || '',
    nextRefreshAt: new Date(now.getTime() + 60_000).toISOString(),
    items,
  }
}

export function serializePlaylist(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    name: doc.name,
    version: doc.version || 1,
    fallbackText: doc.fallbackText || '',
    activo: doc.activo !== false,
    items: (doc.items || []).map((it) => ({
      id: String(it._id),
      type: it.type,
      url: it.url || '',
      text: it.text || '',
      postId: it.postId ? String(it.postId) : null,
      durationSec: it.durationSec || 15,
      order: it.order ?? 0,
      startsAt: it.startsAt,
      endsAt: it.endsAt,
      activo: it.activo !== false,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeDevice(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    name: doc.name,
    locationLabel: doc.locationLabel || '',
    playlistId: doc.playlistId ? String(doc.playlistId) : null,
    mute: doc.mute !== false,
    orientation: doc.orientation || 'landscape',
    status: doc.status,
    pairedAt: doc.pairedAt,
    lastHeartbeatAt: doc.lastHeartbeatAt,
    lastError: doc.lastError || '',
    configVersion: doc.configVersion || 1,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeLive(doc, { effectiveStatus } = {}) {
  if (!doc) return null
  const eff = effectiveStatus || resolveLiveEffectiveStatus(doc)
  return {
    id: String(doc._id),
    title: doc.title,
    coverUrl: doc.coverUrl || '',
    streamUrl: doc.streamUrl,
    replayUrl: doc.replayUrl || '',
    audience: doc.audience || { mode: 'all' },
    status: doc.status,
    effectiveStatus: eff,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    viewCount: doc.viewCount || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
