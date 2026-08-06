<template>
  <div class="tvp" :class="[`scale-${presentation.titleScale}`]" :style="stageStyle">
    <div class="tvp-bezel">
      <div class="tvp-stage" :class="{ 'stage-video': isFullscreenVideo }">
        <p
          v-if="presentation.showClock"
          class="tvp-clock"
          :class="[
            `pos-${presentation.clockPosition || 'tl'}`,
            { shift: cornerLogoUrl && presentation.logoPosition === (presentation.clockPosition || 'tl') },
          ]"
        >
          {{ clockLabel }}
        </p>
        <img
          v-if="cornerLogoUrl"
          class="tvp-logo"
          :class="[`pos-${presentation.logoPosition}`, `scale-${presentation.logoScale || 'md'}`]"
          :src="cornerLogoUrl"
          alt=""
        />

        <template v-if="current">
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

          <video
            v-else-if="current.type === 'post' && current.mediaKind === 'video' && (current.mediaUrl || current.url)"
            :key="slideKey"
            :src="current.mediaUrl || current.url"
            muted
            autoplay
            playsinline
            class="media fs-media"
            :class="{ anim: presentation.transition === 'fade' }"
            @ended="advance"
          />
          <iframe
            v-else-if="current.type === 'post' && current.mediaKind === 'youtube' && youtubeEmbed"
            :key="slideKey"
            :src="youtubeEmbed"
            class="media iframe fs-media"
            :class="{ anim: presentation.transition === 'fade' }"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
            title="YouTube"
          />

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
                @load="onPreviewImageLoad"
                @error="onPreviewImageError"
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
            <img :src="current.url || current.mediaUrl" alt="" class="media" />
          </div>

          <video
            v-else-if="current.type === 'video' && (current.url || current.mediaUrl)"
            :key="slideKey"
            :src="current.url || current.mediaUrl"
            muted
            autoplay
            playsinline
            class="media fs-media"
            :class="{ anim: presentation.transition === 'fade' }"
            @ended="advance"
          />

          <iframe
            v-else-if="current.type === 'youtube' && youtubeEmbed"
            :key="slideKey"
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

        <div v-else class="slide safe">
          <img v-if="presentation.idleShowLogo && logoUrl" class="welcome-logo" :src="logoUrl" alt="" />
          <p class="brand">{{ brandName }}</p>
          <p>{{ fallbackText }}</p>
        </div>

        <div v-if="presentation.showSlideDots && items.length > 1" class="slide-dots" aria-hidden="true">
          <span v-for="(it, i) in items" :key="it.id || i" class="dot" :class="{ on: i === index }" />
        </div>
      </div>
    </div>

    <div class="tvp-controls">
      <button type="button" class="btn" :disabled="!items.length" @click="prev">Anterior</button>
      <span class="tvp-meta">
        {{ items.length ? `${index + 1} / ${items.length}` : 'Sin slides' }}
        <template v-if="current"> · {{ current.type }}</template>
        <template v-if="current?.durationSec"> · {{ current.durationSec }}s</template>
      </span>
      <button type="button" class="btn" :disabled="!items.length" @click="advance">Siguiente</button>
      <button type="button" class="btn" :class="{ on: playing }" @click="togglePlay">
        {{ playing ? 'Pausar' : 'Reproducir' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { youtubeEmbedUrl } from '../utils/media'

const props = defineProps({
  manifest: { type: Object, default: null },
  autoplay: { type: Boolean, default: true },
})

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

const index = ref(0)
const playing = ref(true)
const nowTick = ref(Date.now())
const slideEpoch = ref(0)
const hideBrokenMedia = ref(false)
const mediaIsSmall = ref(false)
const hideSmallMedia = ref(false)
let slideTimer = null
let tickTimer = null

const items = computed(() => (Array.isArray(props.manifest?.items) ? props.manifest.items : []))
const brandName = computed(() => props.manifest?.brandName || 'Connectyx')
const logoUrl = computed(() => props.manifest?.logoUrl || '')
const fallbackText = computed(
  () => props.manifest?.channel?.fallbackText || props.manifest?.fallbackText || 'Contenido no disponible',
)
const presentation = computed(() => ({
  ...DEFAULT_PRESENTATION,
  ...(props.manifest?.presentation || props.manifest?.channel?.presentation || {}),
}))
const showLogo = computed(() => props.manifest?.channel?.showLogo !== false)
const current = computed(() => items.value[index.value] || null)
const slideKey = computed(() => `${current.value?.id || index.value}-${index.value}-${slideEpoch.value}`)
const clockLabel = computed(() =>
  new Date(nowTick.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
)
const stageStyle = computed(() => ({
  '--tv-accent': presentation.value.accentColor || '#5eead4',
}))
const logoAllowed = computed(
  () => showLogo.value && presentation.value.logoPosition !== 'hidden' && Boolean(logoUrl.value),
)
const cornerLogoUrl = computed(() => {
  if (!logoAllowed.value) return ''
  if (current.value?.type === 'welcome' && presentation.value.welcomeShowLogo !== false) return ''
  if (current.value?.type === 'text' && current.value?.showTextLogo) return ''
  const pos = presentation.value.logoPosition
  if (pos === 'center' || pos === 'hidden') return ''
  return logoUrl.value
})
const welcomeSlideLogo = computed(() => {
  if (current.value?.type !== 'welcome') return ''
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
  if (current.value?.showTextLogo === true) return logoUrl.value
  if (current.value?.showTextLogo === false) return ''
  return presentation.value.logoPosition === 'center' ? logoUrl.value : ''
})
const postShowsMedia = computed(() => {
  const cur = current.value
  if (!cur || presentation.value.postLayout === 'text-only') return false
  if (hideBrokenMedia.value || hideSmallMedia.value) return false
  return Boolean(cur.mediaUrl || cur.url)
})
const activeMediaFit = computed(() => {
  if (mediaIsSmall.value) {
    const mode = presentation.value.smallImageMode
    if (mode === 'text-priority') return presentation.value.mediaFit || 'contain'
    if (mode === 'blur-fill' || mode === 'letterbox' || mode === 'contain' || mode === 'cover') {
      return mode
    }
  }
  return presentation.value.mediaFit || 'contain'
})
const isFullscreenVideo = computed(() => {
  const cur = current.value
  if (!cur) return false
  if (cur.type === 'video' || cur.type === 'youtube') return true
  return cur.type === 'post' && (cur.mediaKind === 'video' || cur.mediaKind === 'youtube')
})
const youtubeEmbed = computed(() => {
  const cur = current.value
  const url = cur?.url || cur?.mediaUrl || ''
  const waitEnd = Boolean(cur?.waitForEnd) || cur?.type === 'youtube' || cur?.mediaKind === 'youtube'
  return youtubeEmbedUrl(url, {
    autoplay: true,
    mute: true,
    controls: false,
    // En preview, si es video esperamos el final (sin loop).
    loop: !waitEnd,
    enablejsapi: true,
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
  })
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

function clearSlideTimer() {
  clearTimeout(slideTimer)
  slideTimer = null
}

function slideDurationMs(item) {
  if (!item) return 8000
  const isYoutube = item.type === 'youtube' || item.mediaKind === 'youtube'
  const isFileVideo = item.type === 'video' || (item.type === 'post' && item.mediaKind === 'video')
  if (isFileVideo) return null
  // YouTube: tope de seguridad; idealmente termina solo (preview no monta IFrame API).
  if (isYoutube || item.waitForEnd) {
    return Math.min(180, Math.max(8, Number(item.durationSec) || 30)) * 1000
  }
  const sec = Math.max(5, Number(item.durationSec) || 12)
  return sec * 1000
}

function scheduleSlide() {
  clearSlideTimer()
  if (!playing.value || !items.value.length) return
  const ms = slideDurationMs(current.value)
  if (!ms) return
  const expectedIndex = index.value
  const expectedEpoch = slideEpoch.value
  slideTimer = setTimeout(() => {
    if (index.value !== expectedIndex || slideEpoch.value !== expectedEpoch) return
    advance()
  }, ms)
}

function isSmallPostImage(img) {
  if (!img) return false
  const nw = Number(img.naturalWidth) || 0
  const nh = Number(img.naturalHeight) || 0
  if (nw <= 0 || nh <= 0) return false
  const minW = presentation.value.smallImageMinWidth || 480
  const minH = presentation.value.smallImageMinHeight || 320
  return nw < minW && nh < minH
}

function onPreviewImageLoad(e) {
  const small = isSmallPostImage(e?.target)
  mediaIsSmall.value = small
  hideSmallMedia.value = small && presentation.value.smallImageMode === 'text-priority'
}

function onPreviewImageError() {
  hideBrokenMedia.value = true
  mediaIsSmall.value = false
  hideSmallMedia.value = false
}

function resetMediaFlags() {
  hideBrokenMedia.value = false
  mediaIsSmall.value = false
  hideSmallMedia.value = false
}

function advance() {
  if (!items.value.length) return
  index.value = (index.value + 1) % items.value.length
  slideEpoch.value += 1
  resetMediaFlags()
  scheduleSlide()
}

function prev() {
  if (!items.value.length) return
  index.value = (index.value - 1 + items.value.length) % items.value.length
  slideEpoch.value += 1
  resetMediaFlags()
  scheduleSlide()
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) scheduleSlide()
  else clearSlideTimer()
}

function resetFromManifest() {
  index.value = 0
  slideEpoch.value += 1
  resetMediaFlags()
  playing.value = props.autoplay
  scheduleSlide()
}

watch(
  () => props.manifest,
  () => resetFromManifest(),
  { immediate: true, deep: true },
)

watch(playing, (on) => {
  if (on) scheduleSlide()
  else clearSlideTimer()
})

tickTimer = setInterval(() => {
  nowTick.value = Date.now()
}, 1000)

onUnmounted(() => {
  clearSlideTimer()
  clearInterval(tickTimer)
})
</script>

<style scoped>
.tvp {
  display: grid;
  gap: 0.65rem;
  --tv-accent: #5eead4;
  --title-size: clamp(1.05rem, 2.4vw, 1.55rem);
  --body-size: clamp(0.82rem, 1.5vw, 1.05rem);
}
.tvp.scale-sm {
  --title-size: clamp(0.95rem, 2vw, 1.25rem);
  --body-size: clamp(0.75rem, 1.3vw, 0.95rem);
}
.tvp.scale-lg {
  --title-size: clamp(1.25rem, 2.8vw, 1.85rem);
  --body-size: clamp(0.9rem, 1.7vw, 1.15rem);
}
.tvp-bezel {
  border-radius: 14px;
  padding: 0.55rem;
  background: linear-gradient(160deg, #1f2937, #0f172a 55%, #020617);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}
.tvp-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #0b1220;
  color: #f8fafc;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.tvp-stage.stage-video { background: #000; }
.fs-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  border: 0;
  background: #000;
}
.fs-media.iframe { object-fit: unset; }
.tvp-stage.stage-video .tvp-clock,
.tvp-stage.stage-video .tvp-logo {
  z-index: 5;
}
.tvp-clock {
  position: absolute;
  z-index: 15;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(248, 250, 252, 0.7);
}
.tvp-clock.pos-tl { top: 0.55rem; left: 0.65rem; }
.tvp-clock.pos-tr { top: 0.55rem; right: 0.65rem; }
.tvp-clock.pos-bl { bottom: 0.55rem; left: 0.65rem; }
.tvp-clock.pos-br { bottom: 0.55rem; right: 0.65rem; }
.tvp-clock.pos-tl.shift { left: 5.5rem; }
.tvp-clock.pos-tr.shift { right: 5.5rem; }
.tvp-clock.pos-bl.shift { left: 5.5rem; }
.tvp-clock.pos-br.shift { right: 5.5rem; }
.tvp-logo {
  position: absolute;
  z-index: 12;
  object-fit: contain;
  opacity: 0.9;
  pointer-events: none;
}
.tvp-logo.scale-sm { max-height: 1.35rem; max-width: 3.4rem; }
.tvp-logo.scale-md { max-height: 2rem; max-width: 5rem; }
.tvp-logo.scale-lg { max-height: 2.85rem; max-width: 7rem; }
.tvp-logo.pos-tl { top: 0.55rem; left: 0.65rem; }
.tvp-logo.pos-tr { top: 0.55rem; right: 0.65rem; }
.tvp-logo.pos-bl { bottom: 0.55rem; left: 0.65rem; }
.tvp-logo.pos-br { bottom: 0.55rem; right: 0.65rem; }
.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border: 0;
  background: #000;
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
  filter: blur(22px) saturate(1.15);
  transform: scale(1.08);
  opacity: 0.85;
}
.iframe { width: 100%; height: 100%; }
.slide {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  box-sizing: border-box;
  text-align: center;
}
.slide.anim,
.media.anim,
.media-shell.anim {
  animation: tvp-fade 0.4s ease;
}
@keyframes tvp-fade {
  from { opacity: 0; transform: translateY(0.25rem); }
  to { opacity: 1; transform: none; }
}
.welcome {
  background:
    radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--tv-accent) 28%, transparent), transparent 55%),
    linear-gradient(160deg, #0b1220 0%, #132033 55%, #0b1220 100%);
}
.welcome-logo {
  object-fit: contain;
  margin-bottom: 0.65rem;
}
.welcome-logo--sm {
  max-height: 10%;
  max-width: 20%;
}
.welcome-logo--md {
  max-height: 18%;
  max-width: 36%;
}
.welcome-logo--lg {
  max-height: 28%;
  max-width: 50%;
}
.welcome-brand {
  margin: 0;
  font-size: clamp(1.1rem, 3.2vw, 1.8rem);
  font-weight: 800;
}
.welcome-body {
  margin: 0.45rem 0 0;
  font-size: clamp(0.9rem, 2.2vw, 1.25rem);
  opacity: 0.92;
  max-width: 28rem;
  line-height: 1.3;
}
.welcome-loc {
  margin: 0.65rem 0 0;
  font-size: 0.78rem;
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
.post-media > .iframe {
  width: 100%;
  height: 100%;
  min-height: 40%;
  border: 0;
  justify-self: stretch;
  align-self: stretch;
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
.post-copy {
  display: grid;
  align-content: center;
  justify-items: start;
  text-align: left;
  gap: 0.35rem;
  padding: clamp(0.75rem, 2.5vw, 1.4rem);
}
.post-tipo {
  margin: 0;
  font-size: 0.68rem;
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
  line-height: 1.35;
  opacity: 0.88;
  max-width: 24rem;
}
.post-cta {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
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
  max-height: 2.2rem;
  margin-bottom: 0.55rem;
  object-fit: contain;
}
.text-brand {
  margin: 0 0 0.45rem;
  font-weight: 700;
  opacity: 0.75;
  font-size: 0.85rem;
}
.text-body {
  margin: 0;
  font-size: clamp(1rem, 2.8vw, 1.55rem);
  line-height: 1.3;
  max-width: 28rem;
}
.text-slide.text-scale-sm .text-body { font-size: clamp(0.85rem, 2.2vw, 1.2rem); }
.text-slide.text-scale-md .text-body { font-size: clamp(1rem, 2.8vw, 1.55rem); }
.text-slide.text-scale-lg .text-body { font-size: clamp(1.2rem, 3.4vw, 1.9rem); }
.brand { font-weight: 700; margin-bottom: 0.35rem; opacity: 0.9; }
.safe { background: #0b1220; }
.slide-dots {
  position: absolute;
  bottom: 0.65rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.3rem;
  z-index: 2;
}
.slide-dots .dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.35);
}
.slide-dots .dot.on {
  background: #fff;
  transform: scale(1.25);
}
.tvp-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.tvp-meta {
  flex: 1 1 8rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-soft, #64748b);
  text-align: center;
}
.tvp-controls .btn {
  border: 1px solid var(--line, #e2e8f0);
  background: var(--panel, #fff);
  color: var(--ink, #0f172a);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
}
.tvp-controls .btn.on {
  background: var(--brand, #6b5bf0);
  border-color: transparent;
  color: #fff;
}
.tvp-controls .btn:disabled { opacity: 0.45; cursor: not-allowed; }
@media (max-width: 640px) {
  .post.has-media.layout-media-left,
  .post.has-media.layout-media-right,
  .post.has-media.layout-split {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
