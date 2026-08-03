<template>
  <section class="live">
    <header class="live-head">
      <div>
        <h1>En vivo</h1>
        <p>
          {{
            items.length > 1
              ? `${items.length} emisiones activas · elegí cuál ver`
              : 'Transmisiones de tu comunidad'
          }}
        </p>
      </div>
      <button
        type="button"
        class="mute-btn"
        :class="{ on: muted }"
        :aria-pressed="muted"
        :title="muted ? 'Activar sonido' : 'Silenciar emisiones'"
        @click="toggleMute"
      >
        {{ muted ? 'Silenciado' : 'Silenciar' }}
      </button>
    </header>

    <p v-if="disabled" class="warn">Live streaming no está activo en esta comunidad.</p>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="viewerError" class="err">{{ viewerError }}</p>
    <p v-if="loading" class="empty">Cargando…</p>
    <p v-else-if="!disabled && !items.length" class="empty">No hay emisiones activas ahora.</p>

    <!-- Reproductor de la emisión elegida -->
    <article v-if="liveNow" class="player-card">
      <div class="player-card__head">
        <span class="badge">LIVE</span>
        <h2>{{ liveNow.title }}</h2>
        <button
          type="button"
          class="mute-btn mute-btn--sm"
          :class="{ on: muted }"
          :aria-pressed="muted"
          @click="toggleMute"
        >
          {{ muted ? 'Sin audio' : 'Con audio' }}
        </button>
      </div>
      <p v-if="liveNow.source === 'camera'" class="cam-meta">
        Mensaje en vivo ·
        <span v-if="viewerConnecting">conectando…</span>
        <span v-else-if="viewerConnected">conectado</span>
        <span v-else>esperando señal</span>
        <template v-if="muted"> · silenciado</template>
        <button
          v-if="!viewerConnected && !viewerConnecting"
          type="button"
          class="retry-link"
          @click="applyLive(liveNow, { forceReconnect: true })"
        >
          Reintentar
        </button>
      </p>
      <div class="player">
        <video
          v-if="liveNow.source === 'camera'"
          ref="setVideoRef"
          class="cam-video"
          autoplay
          playsinline
          controls
          :muted="muted"
        />
        <iframe
          v-else-if="embedUrl(liveNow.streamUrl, true)"
          :key="`emb-${liveNow.id}-${muted ? 'm' : 'u'}`"
          :src="embedUrl(liveNow.streamUrl, true)"
          title="Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        />
        <a v-else :href="liveNow.streamUrl" target="_blank" rel="noopener">Abrir transmisión</a>
      </div>
    </article>

    <!-- Cards para elegir (todas las activas) -->
    <ul v-if="items.length" class="pick-grid" aria-label="Elegir emisión">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="pick-card"
          :class="{ on: liveNow?.id === item.id }"
          :aria-pressed="liveNow?.id === item.id"
          @click="selectLive(item)"
        >
          <div class="pick-card__frame">
            <img
              v-if="thumbFor(item)"
              :src="thumbFor(item)"
              alt=""
              class="pick-card__img"
              loading="lazy"
            />
            <div
              v-else
              class="pick-card__fallback"
              :class="item.source === 'camera' ? 'is-cam' : 'is-url'"
            >
              <span v-if="item.source === 'camera'" class="pick-card__pulse" />
              {{ item.source === 'camera' ? 'EN VIVO' : typeLabel(item) }}
            </div>
            <!-- Mini preview YouTube sin autoplay (frame del video) -->
            <iframe
              v-if="!thumbFor(item) && quietEmbed(item.streamUrl)"
              class="pick-card__iframe"
              :src="quietEmbed(item.streamUrl)"
              title=""
              tabindex="-1"
              aria-hidden="true"
              loading="lazy"
              allow="encrypted-media"
              referrerpolicy="strict-origin-when-cross-origin"
            />
            <span class="pick-card__live">LIVE</span>
            <span v-if="liveNow?.id === item.id" class="pick-card__watching">Viendo</span>
          </div>
          <div class="pick-card__body">
            <h3>{{ item.title }}</h3>
            <p>{{ item.source === 'camera' ? 'Cámara' : typeLabel(item) }}</p>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '../services/api'
import { useCameraLiveViewer } from '../composables/useCameraLiveViewer'

const MUTE_KEY = 'cx_live_muted'

const items = ref([])
const liveNow = ref(null)
const selectedId = ref('')
const loading = ref(true)
const error = ref('')
const disabled = ref(false)
/** Por defecto silenciado (por las dudas). */
const muted = ref(localStorage.getItem(MUTE_KEY) !== '0')
const {
  connected: viewerConnected,
  connecting: viewerConnecting,
  error: viewerError,
  videoEl,
  connect: connectViewer,
  disconnect: disconnectViewer,
  bindVideo,
  setMutedPreference,
} = useCameraLiveViewer()
let refreshTimer = null

function applyMuteToVideo() {
  setMutedPreference(muted.value)
}

function toggleMute() {
  muted.value = !muted.value
  localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0')
  applyMuteToVideo()
}

function setVideoRef(el) {
  videoEl.value = el || null
  if (el) {
    nextTick(() => {
      applyMuteToVideo()
      bindVideo()
    })
  }
}

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/)
  return m?.[1] || ''
}

function vimeoId(url) {
  const m = String(url || '').match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d{6,})/)
  return m?.[1] || ''
}

function embedUrl(url, autoplay = false) {
  const muteQ = muted.value ? '1' : '0'
  const yt = youtubeId(url)
  if (yt) {
    return `https://www.youtube.com/embed/${yt}?${autoplay ? 'autoplay=1&' : ''}mute=${muteQ}&rel=0`
  }
  const vm = vimeoId(url)
  if (vm) {
    return `https://player.vimeo.com/video/${vm}?${autoplay ? 'autoplay=1&' : ''}muted=${muteQ}&title=0&byline=0`
  }
  return ''
}

/** Iframe quieto para cards cuando no hay thumbnail. */
function quietEmbed(url) {
  const yt = youtubeId(url)
  if (yt) return `https://www.youtube.com/embed/${yt}?controls=0&mute=1&rel=0`
  const vm = vimeoId(url)
  if (vm) return `https://player.vimeo.com/video/${vm}?background=1&muted=1&title=0&byline=0`
  return ''
}

function thumbFor(item) {
  if (item?.coverUrl) return item.coverUrl
  const yt = youtubeId(item?.streamUrl)
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`
  const vm = vimeoId(item?.streamUrl)
  if (vm) return `https://vumbnail.com/${vm}.jpg`
  return ''
}

function typeLabel(item) {
  const s = String(item?.streamUrl || '')
  if (/\.m3u8(\?|$)/i.test(s)) return 'HLS'
  if (/vimeo\.com/i.test(s)) return 'Vimeo'
  if (/youtu\.?be|youtube\.com/i.test(s)) return 'YouTube'
  return 'URL'
}

async function applyLive(next, { forceReconnect = false } = {}) {
  const prevId = liveNow.value?.id
  const prevSource = liveNow.value?.source
  liveNow.value = next
  if (next?.id) selectedId.value = next.id
  if (next?.id && next.id !== prevId) {
    await api.post(`/live/${next.id}/view`).catch(() => {})
  }
  const needCam =
    next?.source === 'camera' &&
    (forceReconnect || next.id !== prevId || prevSource !== 'camera')
  if (needCam) {
    await nextTick()
    applyMuteToVideo()
    await connectViewer(next)
    await nextTick()
    applyMuteToVideo()
    bindVideo()
  } else if (!next || next.source !== 'camera') {
    await disconnectViewer()
  } else {
    // Misma emisión: solo refrescar metadata / video
    liveNow.value = next
    await nextTick()
    bindVideo()
    applyMuteToVideo()
  }
}

async function selectLive(item) {
  if (!item?.id) return
  if (item.id === liveNow.value?.id) {
    // Reintento manual si quedó en negro
    if (item.source === 'camera' && !viewerConnected.value) {
      await applyLive(item, { forceReconnect: true })
    }
    return
  }
  await applyLive(item)
  nextTick(() => {
    document.querySelector('.player-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function load() {
  try {
    const { data } = await api.get('/live/active')
    items.value = data.items || []
    const stillThere = selectedId.value
      ? items.value.find((i) => i.id === selectedId.value)
      : null
    if (stillThere) {
      if (liveNow.value?.id === stillThere.id) {
        liveNow.value = stillThere
      } else {
        await applyLive(stillThere)
      }
    } else if (items.value.length === 1) {
      await applyLive(items.value[0])
    } else if (!items.value.length) {
      selectedId.value = ''
      await applyLive(null)
    } else if (liveNow.value && !items.value.find((i) => i.id === liveNow.value.id)) {
      selectedId.value = ''
      await applyLive(null)
    }
  } catch (e) {
    if (e?.response?.status === 403) disabled.value = true
    else error.value = e?.response?.data?.error || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

watch(
  () => liveNow.value?.id,
  async (id) => {
    if (id && liveNow.value?.source === 'camera') {
      await nextTick()
      bindVideo()
      applyMuteToVideo()
    }
  },
)

watch(muted, () => applyMuteToVideo())

onMounted(async () => {
  applyMuteToVideo()
  await load()
  refreshTimer = setInterval(load, 12000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  disconnectViewer()
})
</script>

<style scoped>
.live {
  padding: 1rem 1.1rem 2.5rem;
  max-width: 42rem;
  margin: 0 auto;
}
.live-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  margin-bottom: 1.1rem;
}
.live-head h1 { margin: 0 0 0.25rem; font-size: 1.45rem; }
.live-head p { margin: 0; opacity: 0.7; font-size: 0.95rem; }

.mute-btn {
  border: 1px solid color-mix(in srgb, canvasText 18%, transparent);
  background: color-mix(in srgb, canvas 94%, canvasText 6%);
  color: inherit;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.mute-btn.on {
  border-color: color-mix(in srgb, #b45309 45%, transparent);
  background: color-mix(in srgb, #f59e0b 18%, canvas);
  color: #92400e;
}
.mute-btn--sm {
  font-size: 0.75rem;
  padding: 0.28rem 0.55rem;
  margin-left: auto;
}

.player-card {
  background: color-mix(in srgb, canvas 92%, canvasText 8%);
  border-radius: 16px;
  padding: 0.85rem;
  margin-bottom: 1.1rem;
  border: 1px solid #dc2626;
}
.player-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  margin-bottom: 0.35rem;
}
.player-card__head h2 {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.25;
  flex: 1;
  min-width: 10rem;
}
.badge {
  display: inline-block;
  background: #dc2626;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}
.cam-meta { margin: 0 0 0.5rem; font-size: 0.85rem; opacity: 0.75; }
.retry-link {
  margin-left: 0.45rem;
  border: 0;
  background: none;
  color: #dc2626;
  font: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.player {
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.player iframe,
.cam-video {
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: contain;
  background: #000;
}

.pick-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (min-width: 560px) {
  .pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.pick-card {
  width: 100%;
  border: 1px solid color-mix(in srgb, canvasText 12%, transparent);
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
  background: color-mix(in srgb, canvas 94%, canvasText 6%);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.pick-card:active { transform: scale(0.98); }
.pick-card.on {
  border-color: #dc2626;
  box-shadow: 0 0 0 1px #dc2626;
}
.pick-card__frame {
  position: relative;
  aspect-ratio: 16/9;
  background: #0b0f14;
  overflow: hidden;
}
.pick-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pick-card__iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  pointer-events: none;
  transform: scale(1.35);
  transform-origin: center;
}
.pick-card__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #94a3b8;
}
.pick-card__fallback.is-cam {
  background: linear-gradient(145deg, #3f1d1d, #0f172a);
  color: #fecaca;
}
.pick-card__fallback.is-url {
  background: linear-gradient(145deg, #1e293b, #0f172a);
}
.pick-card__pulse {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
  animation: pulse 1.4s infinite;
}
.pick-card__live {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  background: #dc2626;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.4rem;
  border-radius: 5px;
}
.pick-card__watching {
  position: absolute;
  bottom: 0.4rem;
  right: 0.4rem;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 5px;
}
.pick-card__body {
  padding: 0.55rem 0.65rem 0.7rem;
}
.pick-card__body h3 {
  margin: 0 0 0.15rem;
  font-size: 0.92rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pick-card__body p {
  margin: 0;
  font-size: 0.78rem;
  opacity: 0.65;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.err { color: #b91c1c; }
.warn { color: #b45309; }
.empty { opacity: 0.65; }
</style>
