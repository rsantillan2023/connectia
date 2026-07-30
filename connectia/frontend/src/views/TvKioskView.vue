<template>
  <div class="kiosk" :class="orientation">
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

    <div v-else class="stage">
      <template v-if="current">
        <img v-if="current.type === 'image' && current.url" :src="current.url" alt="" class="media" />
        <video
          v-else-if="current.type === 'video' && current.url"
          :src="current.url"
          :muted="mute"
          autoplay
          playsinline
          class="media"
          @ended="advance"
          @error="skipBroken"
        />
        <iframe
          v-else-if="current.type === 'youtube' && youtubeEmbed"
          :src="youtubeEmbed"
          class="media iframe"
          allow="autoplay; encrypted-media"
          allowfullscreen
          title="YouTube"
        />
        <div v-else class="text-slide">
          <p>{{ current.text || fallbackText }}</p>
        </div>
      </template>
      <div v-else class="safe">
        <p class="brand">{{ brandName }}</p>
        <p>{{ fallbackText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const STORAGE_KEY = 'cx_tv_device_token'
const API = import.meta.env.VITE_API_URL || '/api'

const token = ref(localStorage.getItem(STORAGE_KEY) || '')
const code = ref('')
const sessionId = ref('')
const expiresAt = ref(null)
const error = ref('')
const brandName = ref('Connectyx')
const fallbackText = ref('Contenido no disponible')
const mute = ref(true)
const orientation = ref('landscape')
const items = ref([])
const index = ref(0)
const nowTick = ref(Date.now())

let pollTimer
let slideTimer
let heartbeatTimer
let tickTimer

const current = computed(() => items.value[index.value] || null)
const ttlLabel = computed(() => {
  if (!expiresAt.value) return '—'
  const sec = Math.max(0, Math.floor((new Date(expiresAt.value) - nowTick.value) / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
})

/** Deep-link a la app U con el código precargado (mismo host / puerto del front). */
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

const youtubeEmbed = computed(() => {
  const url = current.value?.url || ''
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/)
  if (!m) return ''
  return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=${mute.value ? 1 : 0}&controls=0&rel=0`
})

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token.value) headers.Authorization = `Bearer ${token.value}`
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (res.status === 304) return { _notModified: true }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

async function startPairing() {
  error.value = ''
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
      await loadFeed()
      startHeartbeat()
    } else if (data.status === 'expired') {
      clearInterval(pollTimer)
      await startPairing()
    }
  } catch (e) {
    error.value = e.message
  }
}

async function loadFeed() {
  try {
    const data = await api('/tv/feed')
    if (data._notModified) return
    brandName.value = data.brandName || brandName.value
    fallbackText.value = data.fallbackText || fallbackText.value
    mute.value = data.mute !== false
    orientation.value = data.orientation || 'landscape'
    items.value = Array.isArray(data.items) ? data.items : []
    index.value = 0
    scheduleSlide()
  } catch (e) {
    error.value = e.message
    if (String(e.message).includes('revocada') || String(e.message).includes('inválida')) {
      localStorage.removeItem(STORAGE_KEY)
      token.value = ''
      await startPairing()
    }
  }
}

function scheduleSlide() {
  clearTimeout(slideTimer)
  const cur = current.value
  if (!cur || cur.type === 'video') return
  const ms = Math.max(5, Number(cur.durationSec) || 15) * 1000
  slideTimer = setTimeout(advance, ms)
}

function advance() {
  if (!items.value.length) return
  index.value = (index.value + 1) % items.value.length
  scheduleSlide()
}

function skipBroken() {
  advance()
}

function startHeartbeat() {
  clearInterval(heartbeatTimer)
  const beat = () => api('/tv/heartbeat', { method: 'POST', body: '{}' }).catch(() => {})
  beat()
  heartbeatTimer = setInterval(beat, 60_000)
  clearInterval(pollTimer)
  pollTimer = setInterval(loadFeed, 60_000)
}

onMounted(async () => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  if (token.value) {
    await loadFeed()
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
}
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
.code-label {
  margin: 0 0 0.35rem;
  opacity: 0.7;
  font-size: 0.95rem;
}
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
.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border: 0;
  background: #000;
}
.iframe { width: 100%; height: 100%; }
.text-slide, .safe {
  padding: 2rem;
  text-align: center;
  font-size: clamp(1.4rem, 4vw, 2.6rem);
}
.brand { font-weight: 700; margin-bottom: 0.5rem; opacity: 0.9; }
.portrait .media { object-fit: cover; }
</style>
