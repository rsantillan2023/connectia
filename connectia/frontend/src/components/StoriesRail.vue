<template>
  <section v-if="categories.length" class="stories-rail" aria-label="Historias">
    <header class="stories-head">
      <h2 class="stories-title">Historias</h2>
    </header>
    <div class="stories-scroll">
      <button
        v-for="cat in categories"
        :key="cat.category"
        type="button"
        class="story-bubble"
        :class="{ seen: cat.allSeen }"
        :aria-label="`Historias ${cat.category}`"
        @click="openCategory(cat)"
      >
        <span class="story-ring">
          <span class="story-inner">
            <img
              v-if="cat.cover && cat.coverType !== 'video'"
              :src="cat.cover"
              alt=""
              class="story-thumb"
            />
            <span v-else class="story-thumb story-thumb-fallback">{{ cat.initial }}</span>
          </span>
        </span>
        <span class="story-label">{{ cat.category }}</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="viewer"
        class="story-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Story"
        @click.self="closeViewer"
      >
        <div class="story-viewer-inner">
          <div class="story-progress">
            <span
              v-for="(s, i) in viewer.stories"
              :key="`${s.id}-${i === viewer.index ? progressKey : 'idle'}`"
              class="story-bar"
              :class="{
                done: i < viewer.index,
                on: i === viewer.index && progressArmed,
              }"
              :style="i === viewer.index && progressArmed ? { '--story-dur': `${currentDurationSec}s` } : undefined"
            />
          </div>
          <header class="story-viewer-head">
            <div>
              <strong>{{ viewer.category }}</strong>
              <small>{{ current?.titulo || 'Story' }}</small>
            </div>
            <div class="story-viewer-actions">
              <span
                v-if="currentAudio"
                class="story-music-badge"
                :class="{ on: audioPlaying, loading: audioLoading }"
                aria-hidden="true"
                :title="audioLoading ? 'Cargando música' : 'Música'"
              >
                ♪
              </span>
              <button type="button" class="story-close" aria-label="Cerrar" @click="closeViewer">×</button>
            </div>
          </header>
          <audio
            v-if="currentAudio"
            ref="audioEl"
            :key="current?.id || currentAudio"
            :src="currentAudio"
            preload="auto"
            loop
            class="story-audio"
          />
          <div
            class="story-media"
            @click="onMediaTap"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
            @touchcancel.passive="onTouchCancel"
          >
            <video
              v-if="current?.mediaType === 'video'"
              :src="mediaUrl(current.mediaUrl)"
              autoplay
              playsinline
              muted
              class="story-media-el"
              @ended="advance"
            />
            <img
              v-else-if="current"
              :src="mediaUrl(current.mediaUrl)"
              :alt="current.titulo || ''"
              class="story-media-el"
            />
            <div
              v-if="audioLoading"
              class="story-audio-loading"
              role="status"
              aria-live="polite"
              aria-label="Cargando música"
            >
              <span class="story-audio-spinner" aria-hidden="true" />
              <small>Cargando música…</small>
            </div>
          </div>
          <button type="button" class="story-nav prev" aria-label="Anterior" @click.stop="back">‹</button>
          <button type="button" class="story-nav next" aria-label="Siguiente" @click.stop="advance">›</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const DEFAULT_DURATION_SEC = 5
const MIN_DURATION_SEC = 1
const MAX_DURATION_SEC = 60
const SWIPE_THRESHOLD_PX = 48

const categories = ref([])
const viewer = ref(null)
const audioEl = ref(null)
const audioPlaying = ref(false)
const audioLoading = ref(false)
const progressArmed = ref(false)
const progressKey = ref(0)
let autoTimer
let touchStartX = null
let touchStartY = null
let swiped = false
let audioWaitGen = 0

const current = computed(() => {
  if (!viewer.value) return null
  return viewer.value.stories[viewer.value.index] || null
})

const currentDurationSec = computed(() => storyDurationSec(current.value))

const currentAudio = computed(() => {
  const s = current.value
  if (!s || s.mediaType === 'video') return ''
  const u = String(s.audioUrl || '').trim()
  return u ? resolveMediaUrl(u) : ''
})

function storyDurationSec(s) {
  const n = Number(s?.durationSec)
  if (!Number.isFinite(n)) return DEFAULT_DURATION_SEC
  return Math.min(MAX_DURATION_SEC, Math.max(MIN_DURATION_SEC, Math.round(n)))
}

function mediaUrl(u) {
  return resolveMediaUrl(u)
}

async function load() {
  try {
    const { data } = await api.get('/stories')
    const cats = Array.isArray(data?.categories) ? data.categories : []
    categories.value = cats.map((c) => {
      const stories = c.stories || []
      const first = stories[0]
      return {
        category: c.category || 'general',
        stories,
        cover: first ? resolveMediaUrl(first.mediaUrl) : '',
        coverType: first?.mediaType || 'image',
        initial: String(c.category || 'S').slice(0, 1).toUpperCase(),
        allSeen: stories.length > 0 && stories.every((s) => s.viewed),
      }
    })
  } catch {
    categories.value = []
  }
}

function stopAudio() {
  const el = audioEl.value
  if (el) {
    el.pause()
    el.currentTime = 0
  }
  audioPlaying.value = false
}

function waitForAudioReady(el, gen) {
  return new Promise((resolve) => {
    if (!el) {
      resolve(false)
      return
    }
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve(true)
      return
    }
    let settled = false
    const finish = (ok) => {
      if (settled) return
      settled = true
      el.removeEventListener('canplaythrough', onReady)
      el.removeEventListener('canplay', onReady)
      el.removeEventListener('loadeddata', onReady)
      el.removeEventListener('error', onErr)
      clearTimeout(timeoutId)
      resolve(ok && gen === audioWaitGen)
    }
    const onReady = () => finish(true)
    const onErr = () => finish(false)
    el.addEventListener('canplaythrough', onReady)
    el.addEventListener('canplay', onReady)
    el.addEventListener('loadeddata', onReady)
    el.addEventListener('error', onErr)
    const timeoutId = setTimeout(() => finish(false), 12000)
    try {
      el.load()
    } catch {
      /* ignore */
    }
  })
}

/** Muestra la imagen ya; si hay música, espera a que cargue antes de contar el tiempo. */
async function startStoryPlayback() {
  clearTimeout(autoTimer)
  progressArmed.value = false
  stopAudio()

  const gen = ++audioWaitGen
  const hasMusic = Boolean(currentAudio.value)

  if (!hasMusic) {
    audioLoading.value = false
    if (gen !== audioWaitGen || !viewer.value) return
    armTimer()
    return
  }

  audioLoading.value = true
  await nextTick()
  if (gen !== audioWaitGen || !viewer.value) return

  const el = audioEl.value
  await waitForAudioReady(el, gen)
  if (gen !== audioWaitGen || !viewer.value) return

  audioLoading.value = false
  try {
    if (el) {
      el.currentTime = 0
      await el.play()
      if (gen !== audioWaitGen) return
      audioPlaying.value = true
    }
  } catch {
    audioPlaying.value = false
  }
  if (gen !== audioWaitGen || !viewer.value) return
  armTimer()
}

function openCategory(cat) {
  const categoryIndex = categories.value.findIndex((c) => c.category === cat.category)
  openCategoryAt(categoryIndex >= 0 ? categoryIndex : 0, 0)
}

function openCategoryAt(categoryIndex, index) {
  const cat = categories.value[categoryIndex]
  if (!cat?.stories?.length) {
    closeViewer()
    return
  }
  const safeIndex = Math.max(0, Math.min(index, cat.stories.length - 1))
  viewer.value = {
    categoryIndex,
    category: cat.category,
    stories: cat.stories,
    index: safeIndex,
  }
  markView()
  startStoryPlayback()
}

function closeViewer() {
  audioWaitGen += 1
  clearTimeout(autoTimer)
  progressArmed.value = false
  audioLoading.value = false
  stopAudio()
  viewer.value = null
}

function refreshSeen() {
  for (const cat of categories.value) {
    cat.allSeen = cat.stories.length > 0 && cat.stories.every((s) => s.viewed)
  }
}

async function markView() {
  const s = current.value
  if (!s?.id) return
  try {
    await api.post(`/stories/${s.id}/view`)
    s.viewed = true
    refreshSeen()
  } catch {
    /* ignore */
  }
}

function armTimer() {
  clearTimeout(autoTimer)
  if (!viewer.value || !current.value) return
  // Videos avanzan con @ended; no forzar timer encima.
  if (current.value.mediaType === 'video') {
    progressArmed.value = false
    return
  }
  progressArmed.value = true
  progressKey.value += 1
  const ms = currentDurationSec.value * 1000
  autoTimer = setTimeout(advance, ms)
}

/** Evita doble avance (timer + fin de video / tap). */
let lastAdvanceAt = 0

function advance() {
  clearTimeout(autoTimer)
  if (!viewer.value) return
  const now = Date.now()
  if (now - lastAdvanceAt < 280) return
  lastAdvanceAt = now

  audioWaitGen += 1
  audioLoading.value = false
  progressArmed.value = false
  stopAudio()

  const catIdx = Number(viewer.value.categoryIndex) || 0
  const storyIdx = viewer.value.index

  if (storyIdx < viewer.value.stories.length - 1) {
    viewer.value.index = storyIdx + 1
    markView()
    startStoryPlayback()
    return
  }

  const cats = categories.value
  for (let i = catIdx + 1; i < cats.length; i++) {
    if (cats[i]?.stories?.length) {
      openCategoryAt(i, 0)
      return
    }
  }

  closeViewer()
}

function back() {
  clearTimeout(autoTimer)
  if (!viewer.value) return
  audioWaitGen += 1
  audioLoading.value = false
  progressArmed.value = false
  stopAudio()

  if (viewer.value.index > 0) {
    viewer.value.index -= 1
    startStoryPlayback()
    return
  }

  const catIdx = Number(viewer.value.categoryIndex) || 0
  for (let i = catIdx - 1; i >= 0; i--) {
    const prev = categories.value[i]
    if (prev?.stories?.length) {
      openCategoryAt(i, prev.stories.length - 1)
      return
    }
  }
}

function onMediaTap() {
  if (swiped) {
    swiped = false
    return
  }
  advance()
}

function onTouchStart(e) {
  const t = e.changedTouches?.[0] || e.touches?.[0]
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  swiped = false
}

function onTouchEnd(e) {
  const t = e.changedTouches?.[0]
  if (!t || touchStartX == null || touchStartY == null) {
    touchStartX = null
    touchStartY = null
    return
  }
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  touchStartX = null
  touchStartY = null
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return
  swiped = true
  if (dx < 0) advance()
  else back()
}

function onTouchCancel() {
  touchStartX = null
  touchStartY = null
}

onMounted(load)
onUnmounted(() => {
  audioWaitGen += 1
  clearTimeout(autoTimer)
  stopAudio()
})

defineExpose({ reload: load })
</script>

<style scoped>
.stories-rail {
  margin: 4px 0 4px;
  padding: 0;
}
.stories-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px 8px;
}
.stories-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--cx-text, #0f172a);
  line-height: 1.2;
}
.stories-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 4px 16px 12px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.stories-scroll::-webkit-scrollbar {
  display: none;
}
.story-bubble {
  flex: 0 0 auto;
  width: 76px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.story-ring {
  box-sizing: border-box;
  display: block;
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  padding: 2.5px;
  background: linear-gradient(135deg, var(--brand-primary, #0d9488), #f59e0b);
}
.story-bubble.seen .story-ring {
  background: #cbd5e1;
}
.story-inner {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: var(--u-surface, #fff);
  box-shadow: inset 0 0 0 2.5px var(--u-surface, #fff);
}
.story-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #e2e8f0;
}
.story-thumb-fallback {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--brand-primary, #0f766e);
}
.story-label {
  display: block;
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--u-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: capitalize;
}
.story-viewer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(2, 6, 23, 0.92);
  display: grid;
  place-items: center;
  padding: 12px;
}
.story-viewer-inner {
  position: relative;
  width: min(420px, 100%);
  height: min(720px, 100%);
  border-radius: 16px;
  overflow: hidden;
  background: #0f172a;
}
.story-progress {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  gap: 4px;
}
.story-bar {
  position: relative;
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;
}
.story-bar.done {
  background: #fff;
}
.story-bar.on::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 0;
  border-radius: inherit;
  background: #fff;
  animation: story-progress-fill var(--story-dur, 5s) linear forwards;
}
@keyframes story-progress-fill {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}
.story-viewer-head {
  position: absolute;
  top: 22px;
  left: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #fff;
}
.story-viewer-head small {
  display: block;
  opacity: 0.8;
  margin-top: 2px;
}
.story-viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.story-music-badge {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 14px;
  opacity: 0.7;
}
.story-music-badge.on {
  opacity: 1;
  animation: story-pulse 1.1s ease-in-out infinite;
}
@keyframes story-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}
.story-music-badge.loading {
  opacity: 0.85;
  animation: story-pulse 0.9s ease-in-out infinite;
}
.story-audio {
  display: none;
}
.story-close {
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.story-media {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  touch-action: pan-y;
}
.story-media-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  pointer-events: none;
}
.story-audio-loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: color-mix(in srgb, #020617 28%, transparent);
  pointer-events: none;
  color: #fff;
}
.story-audio-loading small {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
  opacity: 0.92;
}
.story-audio-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.28);
  border-top-color: #fff;
  animation: story-spin 0.75s linear infinite;
}
@keyframes story-spin {
  to {
    transform: rotate(360deg);
  }
}
.story-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 36px;
  height: 56px;
  border-radius: 10px;
  font-size: 24px;
  cursor: pointer;
}
.story-nav.prev {
  left: 8px;
}
.story-nav.next {
  right: 8px;
}
</style>
