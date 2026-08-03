<template>
  <div class="kiosk" :class="[orientation, `scale-${presentation.titleScale}`]" :style="stageStyle">
    <div v-if="!token" class="pair-panel">
      <h1>{{ brandName }}</h1>
      <p class="hint">Escaneá el QR con el celular o ingresá el código en la app → <strong>Emparejar TV</strong></p>
      <div v-if="code" class="pair-row">
        <img
          v-if="qrUrl"
          class="qr"
          :src="qrUrl"
          width="220"
          height="220"
          alt="QR para emparejar esta TV"
        />
        <div class="code-block">
          <p class="code-label">O escribí el código</p>
          <p class="code">{{ code }}</p>
          <p class="muted">Expira en {{ ttlLabel }}</p>
        </div>
      </div>
      <p v-else class="muted">Generando código…</p>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <div
      v-else
      class="stage"
      :class="[
        `transition-${presentation.transition}`,
        { 'stage-video': currentIsFullscreenVideo },
      ]"
    >
      <button
        type="button"
        class="menu-fab"
        aria-label="Opciones de pantalla"
        title="Opciones"
        @click="menuOpen = true"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
          />
        </svg>
      </button>

      <p
        v-if="presentation.showClock"
        class="clock"
        :class="[
          `pos-${presentation.clockPosition || 'tl'}`,
          { 'clock-shift': cornerLogoUrl && presentation.logoPosition === (presentation.clockPosition || 'tl') },
        ]"
      >
        {{ clockLabel }}
      </p>

      <img
        v-if="cornerLogoUrl"
        class="corner-logo"
        :class="[`pos-${presentation.logoPosition}`, `scale-${presentation.logoScale || 'md'}`]"
        :src="cornerLogoUrl"
        alt=""
      />

      <div
        v-if="menuOpen"
        class="menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tv-menu-title"
        @click.self="closeMenu"
      >
        <div class="menu-panel">
          <h2 id="tv-menu-title">Esta pantalla</h2>
          <p>Podés seguir mostrando el canal, cambiar el sonido o desvincularla.</p>
          <div v-if="presentation.allowUnmuteFromTv" class="menu-sound">
            <button type="button" class="btn-keep" @click="toggleLocalMute">
              {{ effectiveMute ? 'Activar sonido' : 'Silenciar' }}
            </button>
          </div>
          <div class="menu-actions">
            <button type="button" class="btn-keep" :disabled="unlinking" @click="closeMenu">
              Seguir
            </button>
            <button type="button" class="btn-unlink" :disabled="unlinking" @click="unlinkSelf">
              {{ unlinking ? 'Desvinculando…' : 'Desvincular' }}
            </button>
          </div>
        </div>
      </div>

      <template v-if="current">
        <!-- Bienvenida / marca -->
        <div
          v-if="current.type === 'welcome'"
          :key="slideKey"
          class="slide welcome"
          :class="{ anim: presentation.transition === 'fade' }"
        >
          <img
            v-if="welcomeSlideLogo"
            class="welcome-logo"
            :class="`welcome-logo--${welcomeLogoScale}`"
            :src="welcomeSlideLogo"
            alt=""
          />
          <p class="welcome-brand">{{ current.title || brandName }}</p>
          <p class="welcome-body">{{ current.body || current.text }}</p>
          <p
            v-if="presentation.showLocationOnWelcome && current.locationLabel"
            class="welcome-loc"
          >
            {{ current.locationLabel }}
          </p>
        </div>

        <!-- Video/YouTube de publicación: pantalla completa -->
        <video
          v-else-if="current.type === 'post' && current.mediaKind === 'video' && (current.mediaUrl || current.url)"
          :key="slideKey"
          :src="current.mediaUrl || current.url"
          :muted="effectiveMute"
          autoplay
          playsinline
          class="media fs-media"
          :class="{ anim: presentation.transition === 'fade' }"
          @ended="advance"
          @error="skipBroken"
        />
        <iframe
          v-else-if="current.type === 'post' && current.mediaKind === 'youtube' && youtubeEmbed"
          :key="slideKey"
          :ref="setYtIframeEl"
          :src="youtubeEmbed"
          class="media iframe fs-media"
          :class="{ anim: presentation.transition === 'fade' }"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          title="YouTube"
        />

        <!-- Publicación del muro (imagen / texto) -->
        <div
          v-else-if="current.type === 'post'"
          :key="slideKey"
          class="slide post"
          :class="[
            `layout-${presentation.postLayout}`,
            { 'has-media': postShowsMedia, anim: presentation.transition === 'fade' },
          ]"
        >
          <div
            v-if="postShowsMedia"
            class="post-media"
            :class="[`fit-${activeMediaFit}`, { small: mediaIsSmall }]"
          >
            <div
              v-if="activeMediaFit === 'blur-fill'"
              class="media-bg"
              :style="{ backgroundImage: `url(${current.mediaUrl || current.url})` }"
            />
            <img
              :src="current.mediaUrl || current.url"
              alt=""
              class="media"
              @load="onPostImageLoad"
              @error="onPostImageError"
            />
          </div>
          <div v-if="presentation.postLayout !== 'media-only'" class="post-copy">
            <p v-if="presentation.showPostTipo && current.postTipo" class="post-tipo">
              {{ tipoLabel(current.postTipo) }}
            </p>
            <h2 class="post-title">{{ current.title || current.text }}</h2>
            <p v-if="current.body" class="post-body">{{ current.body }}</p>
            <p v-if="presentation.showCta && current.cta" class="post-cta">{{ current.cta }}</p>
          </div>
        </div>

        <div
          v-else-if="current.type === 'image' && (current.url || current.mediaUrl)"
          :key="slideKey"
          class="media-shell"
          :class="[`fit-${presentation.mediaFit}`, { anim: presentation.transition === 'fade' }]"
        >
          <div
            v-if="presentation.mediaFit === 'blur-fill'"
            class="media-bg"
            :style="{ backgroundImage: `url(${current.url || current.mediaUrl})` }"
          />
          <img :src="current.url || current.mediaUrl" alt="" class="media" @error="skipBroken" />
        </div>
        <video
          v-else-if="current.type === 'video' && (current.url || current.mediaUrl)"
          :key="slideKey"
          :src="current.url || current.mediaUrl"
          :muted="effectiveMute"
          autoplay
          playsinline
          class="media fs-media"
          :class="{ anim: presentation.transition === 'fade' }"
          @ended="advance"
          @error="skipBroken"
        />
        <iframe
          v-else-if="current.type === 'youtube' && youtubeEmbed"
          :key="slideKey"
          :ref="setYtIframeEl"
          :src="youtubeEmbed"
          class="media iframe fs-media"
          :class="{ anim: presentation.transition === 'fade' }"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          title="YouTube"
        />
        <div
          v-else
          :key="slideKey"
          class="slide text-slide"
          :class="[
            { anim: presentation.transition === 'fade' },
            `text-align-${current.textAlign || 'center'}`,
            `text-valign-${current.textValign || 'center'}`,
            `text-scale-${current.textScale || 'md'}`,
          ]"
        >
          <img v-if="textSlideLogo" class="text-logo" :src="textSlideLogo" alt="" />
          <p v-if="current.showBrand !== false" class="text-brand">{{ brandName }}</p>
          <p class="text-body">{{ current.body || current.text || fallbackText }}</p>
        </div>
      </template>
      <div v-else class="safe slide" :class="{ anim: presentation.transition === 'fade' }">
        <img v-if="presentation.idleShowLogo && logoUrl" class="welcome-logo" :src="logoUrl" alt="" />
        <p class="brand">{{ brandName }}</p>
        <p>{{ fallbackText }}</p>
      </div>
      <div
        v-if="presentation.showSlideDots && items.length > 1"
        class="slide-dots"
        aria-hidden="true"
      >
        <span
          v-for="(it, i) in items"
          :key="it.id || i"
          class="dot"
          :class="{ on: i === index }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { youtubeEmbedUrl } from '../utils/media'

const STORAGE_KEY = 'cx_tv_device_token'
const API = import.meta.env.VITE_API_URL || '/api'

/** Carga única del IFrame API de YouTube (para saber cuándo termina el video). */
let ytApiPromise = null
function ensureYoutubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.()
      } catch {
        /* ignore */
      }
      resolve(window.YT)
    }
    if (!document.querySelector('script[data-cx-yt-api]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.async = true
      s.dataset.cxYtApi = '1'
      document.head.appendChild(s)
    }
  })
  return ytApiPromise
}

const DEFAULT_PRESENTATION = {
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

const token = ref(localStorage.getItem(STORAGE_KEY) || '')
const code = ref('')
const sessionId = ref('')
const expiresAt = ref(null)
const error = ref('')
const brandName = ref('Connectyx')
const logoUrl = ref('')
const showLogo = ref(true)
const fallbackText = ref('Contenido no disponible')
const feedMute = ref(true)
const muteOverride = ref(null)
const orientation = ref('landscape')
const waitForVideoEnd = ref(true)
const defaultSlideDurationSec = ref(12)
const items = ref([])
const index = ref(0)
const nowTick = ref(Date.now())
const feedEtag = ref('')
const slideEpoch = ref(0)
const unlinking = ref(false)
const menuOpen = ref(false)
const presentation = ref({ ...DEFAULT_PRESENTATION })
const mediaIsSmall = ref(false)
const hideSmallMedia = ref(false)
const ytIframeEl = ref(null)

let pollTimer
let slideTimer
let heartbeatTimer
let tickTimer
let ytPlayer = null
let ytBindEpoch = -1

function setYtIframeEl(el) {
  ytIframeEl.value = el || null
}

const current = computed(() => items.value[index.value] || null)
const slideKey = computed(() => `${current.value?.id || index.value}-${index.value}-${slideEpoch.value}`)
const ttlLabel = computed(() => {
  if (!expiresAt.value) return '—'
  const sec = Math.max(0, Math.floor((new Date(expiresAt.value) - nowTick.value) / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
})
const clockLabel = computed(() =>
  new Date(nowTick.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
)
const stageStyle = computed(() => ({
  '--tv-accent': presentation.value.accentColor || '#5eead4',
}))
const effectiveMute = computed(() => {
  if (muteOverride.value !== null && presentation.value.allowUnmuteFromTv) return muteOverride.value
  return feedMute.value
})
const logoAllowed = computed(
  () => showLogo.value && presentation.value.logoPosition !== 'hidden' && Boolean(logoUrl.value),
)
const cornerLogoUrl = computed(() => {
  if (!logoAllowed.value) return ''
  // En bienvenida con logo propio, no duplicar el corner
  if (current.value?.type === 'welcome' && presentation.value.welcomeShowLogo !== false) return ''
  // Diapo texto con logo propio: no duplicar esquina
  if (current.value?.type === 'text' && current.value?.showTextLogo) return ''
  const pos = presentation.value.logoPosition
  if (pos === 'center' || pos === 'hidden') return ''
  return logoUrl.value
})
const welcomeSlideLogo = computed(() => {
  if (current.value?.type !== 'welcome') return ''
  // showLogo es el interruptor maestro del canal
  if (!showLogo.value || presentation.value.welcomeShowLogo === false) return ''
  return logoUrl.value || ''
})
const welcomeLogoScale = computed(() => {
  const s = presentation.value.welcomeLogoScale
  return s === 'sm' || s === 'lg' ? s : 'md'
})
const textSlideLogo = computed(() => {
  if (current.value?.type !== 'text') return ''
  if (!logoUrl.value || !showLogo.value) return ''
  // Por ítem: showTextLogo; si no viene, legado = logo centrado del canal
  if (current.value?.showTextLogo === true) return logoUrl.value
  if (current.value?.showTextLogo === false) return ''
  return presentation.value.logoPosition === 'center' ? logoUrl.value : ''
})
const postShowsMedia = computed(() => {
  const cur = current.value
  if (!cur || presentation.value.postLayout === 'text-only') return false
  if (hideSmallMedia.value) return false
  return Boolean(cur.mediaUrl || cur.url)
})
const activeMediaFit = computed(() => {
  if (mediaIsSmall.value) {
    const mode = presentation.value.smallImageMode
    if (mode === 'text-priority') return presentation.value.mediaFit
    if (mode === 'blur-fill' || mode === 'letterbox' || mode === 'contain' || mode === 'cover') {
      return mode === 'letterbox' ? 'letterbox' : mode
    }
  }
  return presentation.value.mediaFit || 'contain'
})

const pairHref = computed(() => {
  if (!code.value) return ''
  const url = new URL('/tv/emparejar', window.location.origin)
  url.searchParams.set('code', code.value)
  return url.toString()
})

const qrUrl = computed(() => {
  if (!pairHref.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(pairHref.value)}`
})

/** Imágenes/texto por duración; video/YouTube esperan el final natural. */
const currentIsYoutube = computed(() => {
  const cur = current.value
  return Boolean(cur && (cur.type === 'youtube' || cur.mediaKind === 'youtube'))
})
const currentIsFullscreenVideo = computed(() => {
  const cur = current.value
  if (!cur) return false
  if (cur.type === 'video' || cur.type === 'youtube') return true
  return cur.type === 'post' && (cur.mediaKind === 'video' || cur.mediaKind === 'youtube')
})
const waitCurrentVideoEnd = computed(() => {
  const cur = current.value
  if (!cur) return false
  const isFileVideo = cur.type === 'video' || (cur.type === 'post' && cur.mediaKind === 'video')
  const isYt = currentIsYoutube.value
  if (!isFileVideo && !isYt) return false
  return waitForVideoEnd.value || Boolean(cur.waitForEnd)
})

const youtubeEmbed = computed(() => {
  const cur = current.value
  const url = cur?.url || cur?.mediaUrl || ''
  // Sin end= (rompe si > duración real). Sin loop si esperamos el final del clip.
  return youtubeEmbedUrl(url, {
    autoplay: true,
    mute: effectiveMute.value,
    controls: false,
    loop: !waitCurrentVideoEnd.value,
    enablejsapi: true,
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  })
})

function destroyYtPlayer() {
  try {
    ytPlayer?.destroy?.()
  } catch {
    /* ignore */
  }
  ytPlayer = null
  ytBindEpoch = -1
}

async function bindYoutubePlayer() {
  destroyYtPlayer()
  if (!currentIsYoutube.value || !waitCurrentVideoEnd.value || !youtubeEmbed.value) return
  const epoch = slideEpoch.value
  ytBindEpoch = epoch
  await nextTick()
  const el = ytIframeEl.value
  if (!el || ytBindEpoch !== epoch) return
  try {
    const YT = await ensureYoutubeApi()
    if (ytBindEpoch !== epoch || !ytIframeEl.value) return
    ytPlayer = new YT.Player(ytIframeEl.value, {
      events: {
        onStateChange: (ev) => {
          if (ytBindEpoch !== slideEpoch.value) return
          // 0 = ENDED
          if (ev?.data === 0 || ev?.data === YT.PlayerState?.ENDED) advance()
        },
        onError: () => {
          if (ytBindEpoch !== slideEpoch.value) return
          skipBroken()
        },
      },
    })
  } catch {
    // Si falla el API, queda el timer de seguridad de scheduleSlide.
  }
}

watch(slideKey, () => {
  mediaIsSmall.value = false
  hideSmallMedia.value = false
  bindYoutubePlayer()
})

function tipoLabel(t) {
  const map = {
    noticia: 'Noticia',
    aviso: 'Aviso',
    beneficio: 'Beneficio',
    evento: 'Evento',
    general: 'Comunidad',
    celebracion: 'Celebración',
  }
  return map[t] || 'Publicación'
}

function applyPresentation(raw, channel) {
  const src = raw && typeof raw === 'object' ? raw : channel?.presentation || {}
  presentation.value = { ...DEFAULT_PRESENTATION, ...src }
  showLogo.value = channel?.showLogo !== false
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token.value) headers.Authorization = `Bearer ${token.value}`
  if (opts.etag) headers['If-None-Match'] = opts.etag
  const { etag: _etag, ...fetchOpts } = opts
  const res = await fetch(`${API}${path}`, { ...fetchOpts, headers })
  if (res.status === 304) return { _notModified: true, etag: opts.etag || '' }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  const responseEtag = res.headers.get('ETag') || data.etag || ''
  return { ...data, etag: responseEtag || data.etag || '' }
}

async function startPairing({ keepError = false } = {}) {
  if (!keepError) error.value = ''
  const data = await api('/tv/pairing/start', {
    method: 'POST',
    body: JSON.stringify({
      deviceName: 'Pantalla TV',
      fingerprint: navigator.userAgent.slice(0, 180),
    }),
  })
  sessionId.value = data.sessionId
  code.value = data.code
  expiresAt.value = data.expiresAt
  pollTimer = setInterval(pollStatus, 2000)
}

async function pollStatus() {
  if (!sessionId.value) return
  try {
    const data = await api(`/tv/pairing/${sessionId.value}/status`)
    if (data.status === 'confirmed' && data.deviceToken) {
      token.value = data.deviceToken
      localStorage.setItem(STORAGE_KEY, data.deviceToken)
      clearInterval(pollTimer)
      await loadFeed({ forceRestart: true })
      startHeartbeat()
    } else if (data.status === 'expired') {
      clearInterval(pollTimer)
      await startPairing()
    }
  } catch (e) {
    error.value = e.message
  }
}

function isSessionLostError(msg) {
  return /revocada|inválida|no autenticado|Modo TV no activo/i.test(String(msg || ''))
}

function stopPlayback() {
  clearTimeout(slideTimer)
  slideTimer = null
  clearInterval(heartbeatTimer)
  heartbeatTimer = null
  items.value = []
  index.value = 0
  feedEtag.value = ''
  slideEpoch.value += 1
  muteOverride.value = null
}

async function dropDeviceSession(reason = '') {
  stopPlayback()
  clearInterval(pollTimer)
  pollTimer = null
  localStorage.removeItem(STORAGE_KEY)
  token.value = ''
  error.value = reason || 'Pantalla desvinculada. Esperando nuevo empareje.'
  await startPairing({ keepError: true })
}

async function loadFeed({ forceRestart = false } = {}) {
  try {
    const data = await api('/tv/feed', { etag: feedEtag.value || undefined })
    if (data._notModified) return
    error.value = ''
    const nextItems = Array.isArray(data.items) ? data.items : []
    const etagChanged = Boolean(data.etag) && data.etag !== feedEtag.value
    brandName.value = data.brandName || brandName.value
    logoUrl.value = data.logoUrl || logoUrl.value
    fallbackText.value = data.fallbackText || fallbackText.value
    feedMute.value = data.mute !== false
    orientation.value = data.orientation || 'landscape'
    waitForVideoEnd.value = data.waitForVideoEnd !== false
    defaultSlideDurationSec.value = Number(data.defaultSlideDurationSec) || 12
    applyPresentation(data.presentation, data.channel)
    feedEtag.value = data.etag || ''
    items.value = nextItems
    const shouldRestart =
      forceRestart || !nextItems.length || etagChanged || index.value >= nextItems.length
    if (shouldRestart) {
      index.value = 0
      slideEpoch.value += 1
      scheduleSlide()
    }
  } catch (e) {
    if (isSessionLostError(e.message)) {
      await dropDeviceSession(e.message)
      return
    }
    error.value = e.message
  }
}

function slideDurationMs(item) {
  if (!item) return (defaultSlideDurationSec.value || 12) * 1000
  const isYoutube = item.type === 'youtube' || item.mediaKind === 'youtube'
  const isFileVideo = item.type === 'video' || (item.type === 'post' && item.mediaKind === 'video')
  const waitEnd = waitForVideoEnd.value || Boolean(item.waitForEnd)

  // Video archivo: avanza con @ended (sin timer).
  if (waitEnd && isFileVideo) return null

  // YouTube: avanza con IFrame API (ENDED). Timer solo como red de seguridad.
  if (waitEnd && isYoutube) {
    return Math.min(180, Math.max(20, Number(item.durationSec) || 60)) * 1000
  }

  // Imagen / texto / bienvenida: X segundos configurados.
  const sec = Math.max(5, Number(item.durationSec) || defaultSlideDurationSec.value || 12)
  return sec * 1000
}

function scheduleSlide() {
  clearTimeout(slideTimer)
  slideTimer = null
  const cur = current.value
  const ms = slideDurationMs(cur)
  if (!ms) return
  const expectedIndex = index.value
  const expectedEpoch = slideEpoch.value
  slideTimer = setTimeout(() => {
    if (index.value !== expectedIndex || slideEpoch.value !== expectedEpoch) return
    advance()
  }, ms)
}

function advance() {
  if (!items.value.length) return
  index.value = (index.value + 1) % items.value.length
  slideEpoch.value += 1
  scheduleSlide()
}

function skipBroken() {
  advance()
}

function onPostImageError() {
  // Imagen rota / bloqueada: sacar el panel media (evita la franja negra con ícono roto).
  hideSmallMedia.value = true
  mediaIsSmall.value = false
}

function isSmallPostImage(img) {
  if (!img) return false
  const nw = Number(img.naturalWidth) || 0
  const nh = Number(img.naturalHeight) || 0
  // Sin tamaño intrínseco aún / inválido: no forzar tratamiento de foto chica.
  if (nw <= 0 || nh <= 0) return false
  const minW = presentation.value.smallImageMinWidth || 480
  const minH = presentation.value.smallImageMinHeight || 320
  // Ambas dimensiones bajo el mínimo (evita falsos positivos en panorámicas/retratos).
  return nw < minW && nh < minH
}

function onPostImageLoad(e) {
  const small = isSmallPostImage(e?.target)
  mediaIsSmall.value = small
  hideSmallMedia.value = small && presentation.value.smallImageMode === 'text-priority'
}

function startHeartbeat() {
  clearInterval(heartbeatTimer)
  const beat = () =>
    api('/tv/heartbeat', { method: 'POST', body: '{}' }).catch((e) => {
      if (isSessionLostError(e.message)) dropDeviceSession(e.message)
    })
  beat()
  heartbeatTimer = setInterval(beat, 30_000)
  clearInterval(pollTimer)
  pollTimer = setInterval(() => loadFeed(), 15_000)
}

function closeMenu() {
  if (unlinking.value) return
  menuOpen.value = false
}

function toggleLocalMute() {
  muteOverride.value = !effectiveMute.value
}

async function unlinkSelf() {
  if (unlinking.value) return
  unlinking.value = true
  try {
    await api('/tv/me/unlink', { method: 'POST', body: '{}' })
  } catch {
    // local cleanup anyway
  }
  menuOpen.value = false
  await dropDeviceSession('Pantalla desvinculada. Escaneá el QR o usá Emparejar TV para volver a vincular.')
  unlinking.value = false
}

onMounted(async () => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  if (token.value) {
    await loadFeed({ forceRestart: true })
    startHeartbeat()
  } else {
    await startPairing()
  }
})

onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(heartbeatTimer)
  clearInterval(tickTimer)
  clearTimeout(slideTimer)
  destroyYtPlayer()
})
</script>

<style scoped>
.kiosk {
  min-height: 100vh;
  background: #0b1220;
  color: #f8fafc;
  display: grid;
  place-items: center;
  font-family: "Segoe UI", system-ui, sans-serif;
  position: relative;
  --tv-accent: #5eead4;
}
.kiosk.scale-sm {
  --title-size: clamp(1.25rem, 2.8vw, 2rem);
  --body-size: clamp(0.9rem, 1.6vw, 1.15rem);
}
.kiosk.scale-md {
  --title-size: clamp(1.6rem, 3.6vw, 2.8rem);
  --body-size: clamp(1rem, 2vw, 1.35rem);
}
.kiosk.scale-lg {
  --title-size: clamp(2rem, 4.5vw, 3.4rem);
  --body-size: clamp(1.15rem, 2.4vw, 1.55rem);
}
.menu-fab {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border: 1px solid rgba(248, 250, 252, 0.18);
  background: rgba(11, 18, 32, 0.45);
  color: rgba(248, 250, 252, 0.75);
  border-radius: 999px;
  cursor: pointer;
  opacity: 0.28;
  transition: opacity 0.2s ease, background 0.2s ease;
  padding: 0;
}
.menu-fab:hover,
.menu-fab:focus-visible {
  opacity: 1;
  background: rgba(11, 18, 32, 0.85);
  outline: none;
}
.clock {
  position: fixed;
  z-index: 15;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(248, 250, 252, 0.7);
}
.clock.pos-tl { top: 0.85rem; left: 0.9rem; }
.clock.pos-tr { top: 0.85rem; right: 3.5rem; }
.clock.pos-bl { bottom: 0.85rem; left: 0.9rem; }
.clock.pos-br { bottom: 0.85rem; right: 0.9rem; }
.clock.pos-tl.clock-shift { left: 9.5rem; }
.clock.pos-tr.clock-shift { right: 12rem; }
.clock.pos-bl.clock-shift { left: 9.5rem; }
.clock.pos-br.clock-shift { right: 9.5rem; }
.corner-logo {
  position: fixed;
  z-index: 12;
  object-fit: contain;
  opacity: 0.9;
  pointer-events: none;
}
.corner-logo.scale-sm { max-height: 2.2rem; max-width: 5.5rem; }
.corner-logo.scale-md { max-height: 3.2rem; max-width: 8rem; }
.corner-logo.scale-lg { max-height: 4.8rem; max-width: 12rem; }
.corner-logo.pos-tl { top: 0.85rem; left: 0.9rem; }
.corner-logo.pos-tr { top: 0.85rem; right: 3.5rem; }
.corner-logo.pos-bl { bottom: 0.85rem; left: 0.9rem; }
.corner-logo.pos-br { bottom: 0.85rem; right: 0.9rem; }
.menu-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(2, 6, 14, 0.72);
  backdrop-filter: blur(4px);
}
.menu-panel {
  width: min(22rem, 100%);
  background: #111827;
  border: 1px solid rgba(248, 250, 252, 0.12);
  border-radius: 16px;
  padding: 1.25rem 1.35rem;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}
.menu-panel h2 { margin: 0 0 0.45rem; font-size: 1.15rem; }
.menu-panel p {
  margin: 0 0 1rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(248, 250, 252, 0.72);
}
.menu-sound { margin-bottom: 0.75rem; }
.menu-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: flex-end;
}
.btn-keep,
.btn-unlink {
  border: 0;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.55rem 0.95rem;
  cursor: pointer;
}
.btn-keep { background: rgba(248, 250, 252, 0.12); color: #f8fafc; }
.btn-unlink { background: #b91c1c; color: #fff; }
.btn-keep:disabled,
.btn-unlink:disabled { opacity: 0.65; cursor: wait; }
.pair-panel {
  text-align: center;
  padding: 2rem;
  max-width: 52rem;
}
.pair-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin: 1.5rem 0 0.5rem;
}
.qr {
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  width: 220px;
  height: 220px;
}
.code-block { min-width: 12rem; }
.code-label { margin: 0 0 0.35rem; opacity: 0.7; font-size: 0.95rem; }
.code {
  font-size: clamp(2.5rem, 8vw, 5rem);
  letter-spacing: 0.35em;
  font-weight: 700;
  margin: 0.25rem 0;
}
.hint { opacity: 0.85; max-width: 36rem; margin: 0 auto; line-height: 1.45; }
.muted { opacity: 0.55; font-size: 0.95rem; }
.err { color: #fca5a5; }
.stage, .safe {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.stage { position: relative; }
.stage-video {
  background: #000;
  place-items: stretch;
}
.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border: 0;
  background: #000;
}
/* Video / YouTube a pantalla completa (edge-to-edge) */
.fs-media {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  object-fit: cover;
  z-index: 1;
}
.fs-media.iframe {
  object-fit: unset;
}
.media-shell {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
}
.media-shell.fit-cover .media { object-fit: cover; }
.media-shell.fit-contain .media,
.media-shell.fit-letterbox .media { object-fit: contain; }
.media-shell.fit-letterbox { background: #0b1220; }
.media-shell.fit-blur-fill .media { object-fit: contain; position: relative; z-index: 1; }
.media-bg {
  position: absolute;
  inset: -8%;
  background-size: cover;
  background-position: center;
  filter: blur(28px) saturate(1.15);
  transform: scale(1.08);
  opacity: 0.85;
}
.iframe { width: 100%; height: 100%; border: 0; }
/* En video fullscreen, reloj/logo quedan por encima sin tapar el centro */
.stage-video .clock,
.stage-video .corner-logo,
.stage-video .menu-fab,
.stage-video .slide-dots {
  z-index: 5;
}
.slide {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 2.5rem;
  box-sizing: border-box;
  text-align: center;
}
.slide.anim,
.media.anim,
.media-shell.anim {
  animation: tv-fade-in 0.45s ease;
}
@keyframes tv-fade-in {
  from { opacity: 0; transform: translateY(0.4rem); }
  to { opacity: 1; transform: none; }
}
.welcome {
  background:
    radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--tv-accent) 28%, transparent), transparent 55%),
    linear-gradient(160deg, #0b1220 0%, #132033 55%, #0b1220 100%);
}
.welcome-logo {
  object-fit: contain;
  margin-bottom: 1.25rem;
}
.welcome-logo--sm {
  max-height: 10vh;
  max-width: 22vw;
}
.welcome-logo--md {
  max-height: 18vh;
  max-width: 40vw;
}
.welcome-logo--lg {
  max-height: 28vh;
  max-width: 55vw;
}
.welcome-brand {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.welcome-body {
  margin: 0.85rem 0 0;
  font-size: clamp(1.25rem, 3.2vw, 2.2rem);
  opacity: 0.92;
  max-width: 40rem;
  line-height: 1.35;
}
.welcome-loc {
  margin: 1.25rem 0 0;
  font-size: clamp(0.95rem, 1.8vw, 1.2rem);
  opacity: 0.65;
}
.post {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 0;
  background: linear-gradient(160deg, #0f172a, #111827 60%, #0b1220);
}
.post.has-media.layout-media-left,
.post.has-media.layout-split { grid-template-columns: 1.15fr 1fr; }
.post.has-media.layout-media-right { grid-template-columns: 1fr 1.15fr; }
.post.has-media.layout-media-right .post-copy { order: 0; }
.post.has-media.layout-media-right .post-media { order: 1; }
.post.has-media.layout-media-top {
  grid-template-columns: 1fr;
  grid-template-rows: 1.15fr 1fr;
}
.post.has-media.layout-media-bottom {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 1.15fr;
}
.post.has-media.layout-media-bottom .post-copy { order: 0; }
.post.has-media.layout-media-bottom .post-media { order: 1; }
.post.layout-media-only.has-media { grid-template-columns: 1fr; }
.post-media {
  min-height: 100%;
  height: 100%;
  background: #000;
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.post-media.fit-cover .media { object-fit: cover; }
.post-media.fit-contain .media,
.post-media.fit-letterbox .media { object-fit: contain; }
.post-media.fit-letterbox { background: #0b1220; }
.post-media.fit-blur-fill .media {
  object-fit: contain;
  position: relative;
  z-index: 1;
  background: transparent;
}
/* iframe no tiene tamaño intrínseco (cae a 300×150): forzar fill del panel */
.post-media > .iframe {
  width: 100%;
  height: 100%;
  min-height: 40vh;
  border: 0;
  justify-self: stretch;
  align-self: stretch;
}
.post-copy {
  display: grid;
  align-content: center;
  justify-items: start;
  text-align: left;
  gap: 0.65rem;
  padding: clamp(1.5rem, 4vw, 3rem);
}
/* Sin media (o imagen rota oculta): texto centrado a pantalla completa */
.post:not(.has-media) .post-copy {
  justify-items: center;
  text-align: center;
  max-width: 48rem;
  margin: 0 auto;
}
.post-tipo {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tv-accent);
}
.post-title {
  margin: 0;
  font-size: var(--title-size);
  line-height: 1.15;
  font-weight: 800;
}
.post-body {
  margin: 0;
  font-size: var(--body-size);
  line-height: 1.4;
  opacity: 0.88;
  max-width: 36rem;
}
.post-cta {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  opacity: 0.7;
}
.text-slide {
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 70% 30%, color-mix(in srgb, var(--tv-accent) 22%, transparent), transparent 50%),
    #0b1220;
}
.text-slide.text-align-left { align-items: flex-start; text-align: left; }
.text-slide.text-align-center { align-items: center; text-align: center; }
.text-slide.text-align-right { align-items: flex-end; text-align: right; }
.text-slide.text-valign-top { justify-content: flex-start; }
.text-slide.text-valign-center { justify-content: center; }
.text-slide.text-valign-bottom { justify-content: flex-end; }
.text-logo {
  max-height: 3.5rem;
  margin-bottom: 1rem;
  object-fit: contain;
}
.text-brand {
  margin: 0 0 0.75rem;
  font-weight: 700;
  opacity: 0.75;
  font-size: clamp(1rem, 2vw, 1.25rem);
}
.text-body {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2.6rem);
  line-height: 1.3;
  max-width: 40rem;
}
.text-slide.text-scale-sm .text-body { font-size: clamp(1.15rem, 3vw, 1.9rem); }
.text-slide.text-scale-md .text-body { font-size: clamp(1.5rem, 4vw, 2.6rem); }
.text-slide.text-scale-lg .text-body { font-size: clamp(1.9rem, 5.2vw, 3.4rem); }
.text-slide.text-scale-sm .text-brand { font-size: clamp(0.85rem, 1.6vw, 1.05rem); }
.text-slide.text-scale-lg .text-brand { font-size: clamp(1.1rem, 2.4vw, 1.45rem); }
.brand { font-weight: 700; margin-bottom: 0.5rem; opacity: 0.9; }
.slide-dots {
  position: absolute;
  bottom: 1.1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.45rem;
  z-index: 2;
}
.slide-dots .dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.35);
}
.slide-dots .dot.on {
  background: #fff;
  transform: scale(1.25);
}
.portrait .media { object-fit: cover; }
.portrait .post.has-media.layout-media-left,
.portrait .post.has-media.layout-media-right,
.portrait .post.has-media.layout-split {
  grid-template-columns: 1fr;
  grid-template-rows: 1.1fr 1fr;
}
@media (max-width: 900px) {
  .post.has-media.layout-media-left,
  .post.has-media.layout-media-right,
  .post.has-media.layout-split {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
