import crypto from 'crypto'
import { normalizeAudience, serializeAudience } from './audience.js'

export const OLA26_TV_CAPS = ['tv.mode']
export const OLA26_LIVE_CAPS = ['live.stream']
export const OLA26_ADMIN_CAPS = ['admin.tv', 'admin.live']
export const OLA26_PRODUCT_CAPS = [...OLA26_TV_CAPS, ...OLA26_LIVE_CAPS, ...OLA26_ADMIN_CAPS]

export const PAIRING_TTL_MS = 5 * 60 * 1000
export const PAIRING_MAX_ATTEMPTS = 5
export const DEVICE_TOKEN_BYTES = 32

export const TV_WALL_TYPES = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']

const STREAM_HOST_ALLOW = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]

/** Sentinel para emisiones con cámara WebRTC (no es URL HTTP). */
export const CAMERA_STREAM_URL = 'webrtc:native'

/** Tope de peers simultáneos por emisión cámara (mesh 1→N en el navegador del admin). */
export const CAMERA_LIVE_MAX_PEERS = 40

/** Dominios / patrones permitidos para streamUrl externa (Track B). */
export function isAllowedStreamUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return false
  if (s === CAMERA_STREAM_URL || s.startsWith('webrtc:')) return true
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

export function isCameraLive(doc) {
  if (!doc) return false
  if (doc.source === 'camera') return true
  return String(doc.streamUrl || '').startsWith('webrtc:')
}

/** Emisión URL visible para miembros (biblioteca: activar/desactivar y reusar). */
export function isExternalLiveActive(doc) {
  if (!doc || isCameraLive(doc)) return false
  if (doc.activo === true) return true
  if (doc.activo === false) return false
  // legado sin campo activo
  return doc.status === 'live' || doc.status === 'scheduled'
}

/** ¿La ve un miembro en /en-vivo? */
export function isLiveVisibleToMembers(doc) {
  if (!doc) return false
  if (isCameraLive(doc)) return doc.status === 'live'
  return isExternalLiveActive(doc)
}

export function activateExternalLiveFields(doc, now = new Date()) {
  if (!doc || isCameraLive(doc)) return doc
  doc.activo = true
  doc.status = 'live'
  doc.endsAt = null
  if (!doc.startsAt) doc.startsAt = now
  return doc
}

export function deactivateExternalLiveFields(doc) {
  if (!doc || isCameraLive(doc)) return doc
  doc.activo = false
  if (doc.status === 'live' || doc.status === 'scheduled' || doc.status === 'ended') {
    doc.status = 'draft'
  }
  return doc
}

/** STUN públicos; TURN opcional vía LIVE_TURN_URLS (coma) + LIVE_TURN_USERNAME / LIVE_TURN_CREDENTIAL. */
export function defaultIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
  const turnUrls = String(process.env.LIVE_TURN_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (turnUrls.length) {
    const entry = { urls: turnUrls }
    if (process.env.LIVE_TURN_USERNAME) entry.username = process.env.LIVE_TURN_USERNAME
    if (process.env.LIVE_TURN_CREDENTIAL) entry.credential = process.env.LIVE_TURN_CREDENTIAL
    servers.push(entry)
  }
  return servers
}

export function newLivePeerId() {
  return crypto.randomBytes(12).toString('base64url')
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

export function stripHtmlLite(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export const TV_LOGO_POSITIONS = ['tl', 'tr', 'bl', 'br', 'center', 'hidden']
export const TV_CLOCK_POSITIONS = ['tl', 'tr', 'bl', 'br']
export const TV_POST_LAYOUTS = [
  'media-left',
  'media-right',
  'media-top',
  'media-bottom',
  'media-only',
  'text-only',
  'split',
]
export const TV_MEDIA_FITS = ['contain', 'cover', 'letterbox', 'blur-fill']
export const TV_SMALL_IMAGE_MODES = ['letterbox', 'cover', 'contain', 'blur-fill', 'text-priority']
export const TV_MUTE_POLICIES = ['force-mute', 'force-sound', 'device']
export const TV_TRANSITIONS = ['cut', 'fade']
export const TV_TITLE_SCALES = ['sm', 'md', 'lg']
export const TV_TEXT_ALIGNS = ['left', 'center', 'right']
export const TV_TEXT_VALIGNS = ['top', 'center', 'bottom']
export const TV_EXTRAS_PLACEMENTS = ['end', 'start', 'interleave', 'shuffle']

export function defaultPresentationConfig() {
  return {
    logoPosition: 'tr',
    logoScale: 'md',
    postLayout: 'media-left',
    mediaFit: 'contain',
    smallImageMode: 'contain',
    smallImageMinWidth: 480,
    smallImageMinHeight: 320,
    mutePolicy: 'device',
    allowUnmuteFromTv: false,
    showSlideDots: true,
    transition: 'fade',
    showPostTipo: true,
    showCta: true,
    /** Mensaje CTA configurable; vacío = textos por tipo (evento/beneficio/aviso). */
    ctaMessage: '',
    showLocationOnWelcome: true,
    titleScale: 'md',
    accentColor: '#5eead4',
    showClock: false,
    clockPosition: 'tl',
    idleShowLogo: true,
    welcomeShowLogo: true,
    welcomeLogoScale: 'md',
  }
}

export function normalizePresentationConfig(raw) {
  const d = defaultPresentationConfig()
  const src = raw && typeof raw === 'object' ? raw : {}
  const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback)
  let accent = String(src.accentColor || d.accentColor).trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)) accent = d.accentColor
  return {
    logoPosition: pick(String(src.logoPosition || ''), TV_LOGO_POSITIONS, d.logoPosition),
    logoScale: pick(String(src.logoScale || ''), TV_TITLE_SCALES, d.logoScale),
    postLayout: pick(String(src.postLayout || ''), TV_POST_LAYOUTS, d.postLayout),
    mediaFit: pick(String(src.mediaFit || ''), TV_MEDIA_FITS, d.mediaFit),
    smallImageMode: pick(String(src.smallImageMode || ''), TV_SMALL_IMAGE_MODES, d.smallImageMode),
    smallImageMinWidth: Math.min(2000, Math.max(120, Number(src.smallImageMinWidth) || d.smallImageMinWidth)),
    smallImageMinHeight: Math.min(2000, Math.max(120, Number(src.smallImageMinHeight) || d.smallImageMinHeight)),
    mutePolicy: pick(String(src.mutePolicy || ''), TV_MUTE_POLICIES, d.mutePolicy),
    allowUnmuteFromTv: Boolean(src.allowUnmuteFromTv),
    showSlideDots: src.showSlideDots !== false,
    transition: pick(String(src.transition || ''), TV_TRANSITIONS, d.transition),
    showPostTipo: src.showPostTipo !== false,
    showCta: src.showCta !== false,
    ctaMessage: String(src.ctaMessage || d.ctaMessage || '')
      .trim()
      .slice(0, 80),
    showLocationOnWelcome: src.showLocationOnWelcome !== false,
    titleScale: pick(String(src.titleScale || ''), TV_TITLE_SCALES, d.titleScale),
    accentColor: accent,
    showClock: Boolean(src.showClock),
    clockPosition: pick(String(src.clockPosition || ''), TV_CLOCK_POSITIONS, d.clockPosition),
    idleShowLogo: src.idleShowLogo !== false,
    welcomeShowLogo: src.welcomeShowLogo !== false,
    welcomeLogoScale: pick(String(src.welcomeLogoScale || ''), TV_TITLE_SCALES, d.welcomeLogoScale),
  }
}

/** Mute efectivo: política del canal + mute del dispositivo. */
export function resolveTvMute(deviceMute, presentation) {
  const policy = normalizePresentationConfig(presentation).mutePolicy
  if (policy === 'force-mute') return true
  if (policy === 'force-sound') return false
  return deviceMute !== false
}

export function defaultChannelConfig(tenantName) {
  const name = String(tenantName || 'la comunidad').trim() || 'la comunidad'
  return {
    welcomeEnabled: true,
    welcomeText: `Bienvenidos a ${name}`,
    welcomeDurationSec: 10,
    welcomeEveryN: 5,
    showLogo: true,
    defaultSlideDurationSec: 12,
    waitForVideoEnd: true,
    extrasOnly: false,
    contentMode: 'auto',
    wallEnabled: true,
    wallDays: 14,
    wallMax: 12,
    wallTypes: [...TV_WALL_TYPES],
    wallCategoryIds: [],
    wallIncludeMemberPosts: false,
    wallMediaOnly: false,
    wallExcludeKnowledge: true,
    wallExcludePostIds: [],
    wallIncludePostIds: [],
    wallIncludeEntries: [],
    wallIncludeExtras: true,
    extrasPlacement: 'end',
    extrasEveryN: 3,
    wallPostDurationSec: 12,
    presentation: defaultPresentationConfig(),
  }
}

/** Entradas de lista controlada: pub del muro o diapo extra del canal. */
export function normalizeWallIncludeEntries(src = {}) {
  const raw = Array.isArray(src.wallIncludeEntries) ? src.wallIncludeEntries : null
  if (raw && raw.length) {
    const out = []
    const seen = new Set()
    for (const it of raw.slice(0, 100)) {
      const kind = it?.kind === 'extra' ? 'extra' : it?.kind === 'post' ? 'post' : ''
      const id = String(it?.id || it?.postId || '').trim()
      if (!kind || !id) continue
      const key = `${kind}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ kind, id })
    }
    return out
  }
  const include = Array.isArray(src.wallIncludePostIds)
    ? src.wallIncludePostIds.map((id) => String(id)).filter(Boolean).slice(0, 100)
    : []
  return include.map((id) => ({ kind: 'post', id }))
}

export function normalizeChannelConfig(raw, tenantName) {
  const d = defaultChannelConfig(tenantName)
  const src = raw && typeof raw === 'object' ? raw : {}
  const types = Array.isArray(src.wallTypes)
    ? src.wallTypes.map((t) => String(t)).filter((t) => TV_WALL_TYPES.includes(t))
    : d.wallTypes
  const exclude = Array.isArray(src.wallExcludePostIds)
    ? src.wallExcludePostIds.map((id) => String(id)).filter(Boolean).slice(0, 200)
    : []
  const wallIncludeEntries = normalizeWallIncludeEntries(src)
  const include = wallIncludeEntries.filter((e) => e.kind === 'post').map((e) => e.id)
  const categoryIds = Array.isArray(src.wallCategoryIds)
    ? src.wallCategoryIds.map((id) => String(id)).filter(Boolean).slice(0, 100)
    : []
  const mode = src.contentMode === 'list' ? 'list' : 'auto'
  const slideDur = Math.min(
    120,
    Math.max(5, Number(src.defaultSlideDurationSec) || Number(src.wallPostDurationSec) || d.defaultSlideDurationSec),
  )
  return {
    welcomeEnabled: src.welcomeEnabled !== false,
    welcomeText: String(src.welcomeText != null ? src.welcomeText : d.welcomeText).slice(0, 200),
    welcomeDurationSec: Math.min(60, Math.max(5, Number(src.welcomeDurationSec) || d.welcomeDurationSec)),
    welcomeEveryN: Math.min(20, Math.max(1, Number(src.welcomeEveryN) || d.welcomeEveryN)),
    showLogo: src.showLogo !== false,
    defaultSlideDurationSec: slideDur,
    waitForVideoEnd: src.waitForVideoEnd !== false,
    extrasOnly: Boolean(src.extrasOnly),
    contentMode: mode,
    wallEnabled: src.wallEnabled !== false,
    wallDays: Math.min(90, Math.max(1, Number(src.wallDays) || d.wallDays)),
    wallMax: Math.min(40, Math.max(0, Number(src.wallMax) || d.wallMax)),
    wallTypes: types.length ? types : [...TV_WALL_TYPES],
    wallCategoryIds: categoryIds,
    wallIncludeMemberPosts: Boolean(src.wallIncludeMemberPosts),
    wallMediaOnly: Boolean(src.wallMediaOnly),
    wallExcludeKnowledge: src.wallExcludeKnowledge !== false,
    wallExcludePostIds: exclude,
    wallIncludePostIds: include,
    wallIncludeEntries,
    wallIncludeExtras: src.wallIncludeExtras !== false,
    extrasPlacement: TV_EXTRAS_PLACEMENTS.includes(String(src.extrasPlacement || ''))
      ? String(src.extrasPlacement)
      : d.extrasPlacement,
    extrasEveryN: Math.min(20, Math.max(1, Number(src.extrasEveryN) || d.extrasEveryN)),
    wallPostDurationSec: Math.min(120, Math.max(5, Number(src.wallPostDurationSec) || slideDur)),
    presentation: normalizePresentationConfig(src.presentation),
  }
}

/**
 * ¿La pub podría verse en el muro público de sede?
 * TV solo muestra audiencia "all" (nunca restricted/users/none).
 */
export function isPostTvEligible(post, channel, now = new Date()) {
  const ch = normalizeChannelConfig(channel)
  if (!post || post.status !== 'published') return false
  if (post.expiresAt && new Date(post.expiresAt) <= now) return false
  const mode = post.audience?.mode || 'all'
  if (mode !== 'all') return false
  if (ch.wallExcludeKnowledge && post.isKnowledge) return false
  if (!ch.wallIncludeMemberPosts && post.origin === 'member') return false
  const tipo = String(post.tipo || 'noticia')
  if (ch.wallTypes.length && !ch.wallTypes.includes(tipo)) return false
  if (ch.wallCategoryIds.length) {
    const cat = post.categoryId ? String(post.categoryId) : ''
    if (!cat || !ch.wallCategoryIds.includes(cat)) return false
  }
  if (ch.wallMediaOnly && !postMedia(post).mediaUrl) return false
  const exclude = new Set(ch.wallExcludePostIds.map(String))
  if (exclude.has(String(post._id || post.id))) return false
  return true
}

/** Demo YouTube embebible (Big Buck Bunny). Reemplaza el rickroll viejo sin vaciar la playlist. */
export const TV_DEMO_YOUTUBE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'

export function isYoutubeMediaUrl(url) {
  return /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|m\.youtube\.com\/)/i.test(
    String(url || ''),
  )
}

/** Sustituye solo slots con rickroll; no borra el resto de la playlist. */
export function scrubRickrollPlaylistItems(items) {
  const list = Array.isArray(items) ? items : []
  let dirty = false
  const next = list.map((raw) => {
    const it = typeof raw?.toObject === 'function' ? raw.toObject() : { ...raw }
    if (!/dQw4w9WgXcQ/i.test(String(it.url || ''))) return raw
    dirty = true
    return {
      ...it,
      type: 'youtube',
      url: TV_DEMO_YOUTUBE_URL,
      durationSec: Math.max(20, Number(it.durationSec) || 30),
    }
  })
  return { items: next, dirty }
}

/** Playlist curada por defecto: texto + YouTube demo embebible (sin rickroll). */
export function defaultTvPlaylistItems(tenantName) {
  const name = String(tenantName || 'la comunidad').trim() || 'la comunidad'
  return [
    {
      type: 'text',
      text: `Seguí las novedades de ${name} en esta pantalla`,
      durationSec: 8,
      order: 0,
    },
    {
      type: 'youtube',
      url: TV_DEMO_YOUTUBE_URL,
      text: 'Video en pantalla',
      durationSec: 30,
      order: 1,
    },
  ]
}

export function brandLogoUrl(tenant) {
  return tenant?.branding?.logoUrl || tenant?.logoUrl || ''
}

export function postMedia(post) {
  const cover = String(post?.imageUrl || '').trim()
  const carousel = Array.isArray(post?.imageUrls) ? post.imageUrls.map((u) => String(u || '').trim()).filter(Boolean) : []
  const mediaUrl = cover || carousel[0] || ''
  if (!mediaUrl) return { mediaUrl: '', mediaKind: '' }
  if (isYoutubeMediaUrl(mediaUrl)) return { mediaUrl, mediaKind: 'youtube' }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(mediaUrl)) return { mediaUrl, mediaKind: 'video' }
  return { mediaUrl, mediaKind: 'image' }
}

/** CTA de pub en TV: mensaje del canal, o fallback por tipo. */
export function resolvePostCta(tipo, ctaMessage = '') {
  const custom = String(ctaMessage || '').trim().slice(0, 80)
  if (custom) return custom
  const t = String(tipo || '')
  if (t === 'evento') return 'Más info en la app'
  if (t === 'beneficio') return 'Mirá beneficios en la app'
  if (t === 'aviso') return 'Aviso para la comunidad'
  return ''
}

export function postToTvSlide(
  post,
  { durationSec = 12, idPrefix = 'post', waitForVideoEnd = true, ctaMessage = '' } = {},
) {
  if (!post) return null
  const { mediaUrl, mediaKind } = postMedia(post)
  const title = String(post.titulo || '').trim().slice(0, 160)
  const body = stripHtmlLite(post.cuerpo).slice(0, 280)
  const tipo = String(post.tipo || 'noticia')
  const cta = resolvePostCta(tipo, ctaMessage)
  const isFileVideo = mediaKind === 'video'
  const isYoutube = mediaKind === 'youtube'
  // durationSec = tiempo de imagen/texto; en video/YouTube es tope de seguridad si falla el ended.
  const dur = Math.min(120, Math.max(5, Number(durationSec) || 12))
  return {
    id: `${idPrefix}-${String(post._id || post.id || '')}`,
    type: 'post',
    postId: String(post._id || post.id || ''),
    title,
    body,
    text: title,
    url: mediaUrl,
    mediaUrl,
    mediaKind,
    postTipo: tipo,
    cta,
    durationSec: dur,
    waitForEnd: Boolean(waitForVideoEnd && (isFileVideo || isYoutube)),
  }
}

export function buildWelcomeSlide(tenant, device, channel) {
  const ch = normalizeChannelConfig(channel, tenant?.nombre)
  if (!ch.welcomeEnabled) return null
  const brandName = tenant?.nombre || 'Connectia'
  const location = [device?.name, device?.locationLabel].filter(Boolean).join(' · ')
  // Misma regla que el kiosk: showLogo (maestro) AND presentation.welcomeShowLogo
  const showWelcomeLogo = ch.showLogo !== false && ch.presentation?.welcomeShowLogo !== false
  const logo = showWelcomeLogo ? brandLogoUrl(tenant) : ''
  return {
    id: 'welcome',
    type: 'welcome',
    title: brandName,
    body: ch.welcomeText || `Bienvenidos a ${brandName}`,
    text: ch.welcomeText || `Bienvenidos a ${brandName}`,
    locationLabel: location,
    brandLogoUrl: logo,
    showLogo: showWelcomeLogo,
    welcomeShowLogo: showWelcomeLogo,
    url: '',
    mediaUrl: '',
    mediaKind: '',
    durationSec: ch.welcomeDurationSec,
  }
}

/** Selección pura de pubs para el muro TV (auto o lista controlada). */
export function selectWallPosts(posts, channel, now = new Date()) {
  const ch = normalizeChannelConfig(channel)
  if (!ch.wallEnabled) return []
  const byId = new Map((Array.isArray(posts) ? posts : []).map((p) => [String(p._id || p.id), p]))

  // Lista controlada: orden estricto, sin azar; solo pubs elegibles para muro público.
  if (ch.contentMode === 'list') {
    if (!ch.wallIncludePostIds.length) return []
    return ch.wallIncludePostIds
      .map((id) => byId.get(String(id)))
      .filter((p) => isPostTvEligible(p, ch, now))
  }

  if (ch.wallMax <= 0) return []
  const since = new Date(now.getTime() - ch.wallDays * 24 * 60 * 60 * 1000)
  const list = (Array.isArray(posts) ? posts : [])
    .filter((p) => isPostTvEligible(p, ch, now))
    .filter((p) => {
      const at = p.publishedAt || p.createdAt
      if (!at) return true
      return new Date(at) >= since
    })
    .sort((a, b) => {
      const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      if (pin) return pin
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime()
      return tb - ta
    })
  return list.slice(0, ch.wallMax)
}

/** Estilo de diapo extra tipo texto (por ítem). */
export function normalizeTextSlideStyle(src = {}) {
  const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback)
  return {
    textAlign: pick(String(src.textAlign || ''), TV_TEXT_ALIGNS, 'center'),
    textValign: pick(String(src.textValign || ''), TV_TEXT_VALIGNS, 'center'),
    textScale: pick(String(src.textScale || ''), TV_TITLE_SCALES, 'md'),
    showBrand: src.showBrand !== false,
    showTextLogo: Boolean(src.showTextLogo),
  }
}

function curatedItemToSlide(it, postById, channel) {
  const ch = normalizeChannelConfig(channel)
  const dur = Number(it.durationSec) || ch.defaultSlideDurationSec
  const base = {
    id: String(it._id || it.id || `cur-${it.order}`),
    durationSec: dur,
    postId: it.postId ? String(it.postId) : null,
    waitForEnd: false,
  }
  if (it.type === 'post') {
    const post = postById.get(String(it.postId || ''))
    if (!post || !isPostTvEligible(post, ch)) return null
    return postToTvSlide(post, {
      durationSec: dur || ch.wallPostDurationSec,
      idPrefix: 'cur',
      waitForVideoEnd: ch.waitForVideoEnd,
      ctaMessage: ch.presentation?.ctaMessage || '',
    })
  }
  if (it.type === 'text') {
    const text = String(it.text || '').trim()
    if (!text) return null
    const style = normalizeTextSlideStyle(it)
    return {
      ...base,
      type: 'text',
      title: '',
      body: text,
      text,
      url: '',
      mediaUrl: '',
      mediaKind: '',
      ...style,
    }
  }
  if (it.type === 'image' || it.type === 'video' || it.type === 'youtube') {
    const url = String(it.url || '').trim()
    if (!url) return null
    const waitForEnd = Boolean(ch.waitForVideoEnd && (it.type === 'video' || it.type === 'youtube'))
    return {
      ...base,
      type: it.type,
      title: String(it.text || '').trim(),
      body: '',
      text: String(it.text || '').trim(),
      url,
      mediaUrl: url,
      mediaKind: it.type === 'youtube' ? 'youtube' : it.type,
      waitForEnd,
    }
  }
  return null
}

/**
 * Mezcla pubs del muro y diapos extras según placement (modo auto).
 * shuffle es estable (mismo seed → mismo orden) para no “bailar” en cada refresh de TV.
 */
export function mergeWallAndExtras(wallSlides, curatedSlides, channel, seed = '') {
  const wall = Array.isArray(wallSlides) ? wallSlides.filter(Boolean) : []
  const extras = Array.isArray(curatedSlides) ? curatedSlides.filter(Boolean) : []
  if (!extras.length) return wall
  if (channel?.wallIncludeExtras === false) return wall
  if (!wall.length) return extras

  const placement = TV_EXTRAS_PLACEMENTS.includes(channel?.extrasPlacement)
    ? channel.extrasPlacement
    : 'end'

  if (placement === 'start') return [...extras, ...wall]

  if (placement === 'interleave') {
    const n = Math.min(20, Math.max(1, Number(channel?.extrasEveryN) || 3))
    const out = []
    let ei = 0
    wall.forEach((slide, idx) => {
      out.push(slide)
      if ((idx + 1) % n === 0 && ei < extras.length) {
        out.push(extras[ei])
        ei += 1
      }
    })
    if (ei < extras.length) out.push(...extras.slice(ei))
    return out
  }

  if (placement === 'shuffle') {
    const list = [...wall, ...extras]
    const key = String(seed || 'tv')
    // Fisher-Yates con PRNG determinístico (xorshift32)
    let h = 2166136261
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    let state = h >>> 0 || 1
    const rand = () => {
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      return (state >>> 0) / 4294967296
    }
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = list[i]
      list[i] = list[j]
      list[j] = tmp
    }
    return list
  }

  return [...wall, ...extras]
}

/** Inserta welcome al inicio y cada N slides de contenido. */
export function interleaveWelcome(welcome, contentItems, everyN = 5) {
  if (!welcome) return contentItems.slice()
  if (!contentItems.length) return [welcome]
  const n = Math.min(20, Math.max(1, Number(everyN) || 5))
  const out = [welcome]
  contentItems.forEach((item, idx) => {
    out.push(item)
    if ((idx + 1) % n === 0 && idx < contentItems.length - 1) {
      out.push({ ...welcome, id: `welcome-${idx + 1}` })
    }
  })
  return out
}

/**
 * Compone el manifiesto TV-ready (puro).
 * @param {{ playlist, device, tenant, posts?: any[], now?: Date }} args
 */
export function buildFeedManifest({ playlist, device, tenant, posts = [], now = new Date() } = {}) {
  const channel = normalizeChannelConfig(playlist?.channel, tenant?.nombre)
  const logoUrl = brandLogoUrl(tenant)
  const brandName = tenant?.nombre || 'Connectia'
  const welcome = buildWelcomeSlide(tenant, device, channel)

  const curatedRaw = filterActivePlaylistItems(playlist?.items, now)
  const postIds = curatedRaw.filter((it) => it.type === 'post' && it.postId).map((it) => String(it.postId))
  const postById = new Map((posts || []).map((p) => [String(p._id || p.id), p]))

  const slideDur = channel.wallPostDurationSec || channel.defaultSlideDurationSec
  const curatedById = new Map(
    curatedRaw.map((it) => [String(it._id || it.id || ''), it]).filter(([id]) => id),
  )

  let content = []
  if (channel.extrasOnly) {
    content = curatedRaw.map((it) => curatedItemToSlide(it, postById, channel)).filter(Boolean)
  } else if (channel.contentMode === 'list') {
    // Lista mixta: pubs y/o diapos extras en el orden elegido; el resto de extras sigue al final.
    const usedExtraIds = new Set()
    const listSlides = []
    if (channel.wallEnabled) {
      for (const entry of channel.wallIncludeEntries || []) {
        if (entry.kind === 'post') {
          const post = postById.get(String(entry.id))
          if (!post || !isPostTvEligible(post, channel, now)) continue
          listSlides.push(
            postToTvSlide(post, {
              durationSec: slideDur,
              idPrefix: 'list',
              waitForVideoEnd: channel.waitForVideoEnd,
              ctaMessage: channel.presentation?.ctaMessage || '',
            }),
          )
        } else if (entry.kind === 'extra') {
          const it = curatedById.get(String(entry.id))
          if (!it) continue
          const slide = curatedItemToSlide(it, postById, channel)
          if (!slide) continue
          usedExtraIds.add(String(entry.id))
          listSlides.push({ ...slide, id: `list-${slide.id}` })
        }
      }
    }
    const listPostIds = new Set(listSlides.filter((s) => s.postId).map((s) => String(s.postId)))
    const restCurated = curatedRaw
      .filter((it) => !usedExtraIds.has(String(it._id || it.id || '')))
      .map((it) => curatedItemToSlide(it, postById, channel))
      .filter(Boolean)
      .filter((s) => !s.postId || !listPostIds.has(String(s.postId)))
    content = [...listSlides, ...restCurated]
  } else {
    const curatedSlides = curatedRaw
      .map((it) => curatedItemToSlide(it, postById, channel))
      .filter(Boolean)
    const curatedPostIds = new Set(curatedSlides.filter((s) => s.type === 'post').map((s) => s.postId))
    const wallPosts = selectWallPosts(posts, channel, now).filter(
      (p) => !curatedPostIds.has(String(p._id || p.id)) && !postIds.includes(String(p._id || p.id)),
    )
    const wallSlides = wallPosts.map((p) =>
      postToTvSlide(p, {
        durationSec: slideDur,
        idPrefix: 'wall',
        waitForVideoEnd: channel.waitForVideoEnd,
        ctaMessage: channel.presentation?.ctaMessage || '',
      }),
    )
    const shuffleSeed = [
      String(playlist?._id || ''),
      String(playlist?.version || 1),
      channel.extrasPlacement,
      ...wallSlides.map((s) => s.id),
      ...curatedSlides.map((s) => s.id),
    ].join('|')
    content = mergeWallAndExtras(wallSlides, curatedSlides, channel, shuffleSeed)
  }
  let items = interleaveWelcome(welcome, content, channel.welcomeEveryN)
  if (!items.length) {
    items = [
      {
        id: 'safe',
        type: 'text',
        title: brandName,
        body: playlist?.fallbackText || 'Contenido no disponible',
        text: playlist?.fallbackText || 'Contenido no disponible',
        url: '',
        mediaUrl: '',
        mediaKind: '',
        durationSec: channel.defaultSlideDurationSec,
        waitForEnd: false,
        ...normalizeTextSlideStyle({ textAlign: 'center', textValign: 'center', textScale: 'md', showBrand: true }),
      },
    ]
  }

  const version = playlist?.version || 1
  const contentStamp = content
    .map((s) => `${s.id || ''}:${s.type || ''}:${s.postId || ''}:${s.durationSec || ''}`)
    .join('|')
    .slice(0, 160)
  const presentation = channel.presentation || defaultPresentationConfig()
  const presStamp = crypto.createHash('sha1').update(JSON.stringify(presentation)).digest('hex').slice(0, 6)
  const etag = `"tv-${String(playlist?._id || 'none')}-v${version}-m${channel.contentMode}-c${content.length}-${crypto.createHash('sha1').update(contentStamp).digest('hex').slice(0, 8)}-p${presStamp}"`

  return {
    deviceId: device?._id ? String(device._id) : null,
    playlistId: playlist?._id ? String(playlist._id) : null,
    playlistVersion: version,
    etag,
    mute: resolveTvMute(device?.mute, presentation),
    orientation: device?.orientation || 'landscape',
    fallbackText: playlist?.fallbackText || 'Contenido no disponible',
    brandName,
    logoUrl,
    channel,
    presentation,
    waitForVideoEnd: channel.waitForVideoEnd,
    defaultSlideDurationSec: channel.defaultSlideDurationSec,
    nextRefreshAt: new Date(now.getTime() + 60_000).toISOString(),
    items,
  }
}

export function serializeChannel(channel, tenantName) {
  return normalizeChannelConfig(channel, tenantName)
}

export function serializePlaylist(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    name: doc.name,
    version: doc.version || 1,
    fallbackText: doc.fallbackText || '',
    activo: doc.activo !== false,
    audience: serializeAudience(doc.audience || { mode: 'all' }),
    channel: serializeChannel(doc.channel, null),
    items: (doc.items || []).map((it) => {
      const textStyle = it.type === 'text' ? normalizeTextSlideStyle(it) : null
      return {
        id: String(it._id),
        type: it.type,
        url: it.url || '',
        text: it.text || '',
        postId: it.postId ? String(it.postId) : null,
        durationSec: it.durationSec || 15,
        textAlign: textStyle?.textAlign || 'center',
        textValign: textStyle?.textValign || 'center',
        textScale: textStyle?.textScale || 'md',
        showBrand: textStyle ? textStyle.showBrand : true,
        showTextLogo: textStyle ? textStyle.showTextLogo : false,
        order: it.order ?? 0,
        startsAt: it.startsAt,
        endsAt: it.endsAt,
        activo: it.activo !== false,
      }
    }),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export { normalizeAudience, serializeAudience }

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
  const source = doc.source === 'camera' || String(doc.streamUrl || '').startsWith('webrtc:')
    ? 'camera'
    : 'external'
  const activo = source === 'camera' ? doc.status === 'live' : isExternalLiveActive(doc)
  return {
    id: String(doc._id),
    title: doc.title,
    coverUrl: doc.coverUrl || '',
    source,
    streamUrl: source === 'camera' ? CAMERA_STREAM_URL : doc.streamUrl,
    replayUrl: doc.replayUrl || '',
    audience: doc.audience || { mode: 'all' },
    status: doc.status,
    activo,
    effectiveStatus: source === 'external' && activo && eff === 'draft' ? 'live' : eff,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    viewCount: doc.viewCount || 0,
    peerCount: doc.peerCount || 0,
    createdByUserId: doc.createdByUserId ? String(doc.createdByUserId) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
