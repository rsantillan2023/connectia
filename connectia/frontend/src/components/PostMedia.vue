<template>
  <div
    ref="rootEl"
    class="pmedia"
    :class="{ embed: kind === 'embed', video: kind === 'video', playing }"
  >
    <video
      v-if="kind === 'video' && !broken"
      ref="videoEl"
      :src="displayUrl"
      class="el"
      playsinline
      muted
      loop
      preload="metadata"
      :controls="!autoplayOnVisible || userControls"
      @error="onError"
      @click.stop="unlockSound"
    />
    <iframe
      v-else-if="kind === 'embed' && activeEmbedSrc && !broken"
      class="el"
      :src="activeEmbedSrc"
      title="Video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <img
      v-else-if="kind === 'image' && !broken"
      :src="displayUrl"
      :alt="alt"
      class="el"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="onError"
    />
    <div v-else-if="kind === 'embed' && !activeEmbedSrc && !broken" class="fallback soft">
      Video
    </div>
    <div v-else class="fallback">
      {{ fallbackTipo || 'Sin media' }}
    </div>

    <button
      v-if="(kind === 'video' || kind === 'embed') && playing && mutedUi"
      type="button"
      class="unmute"
      aria-label="Activar sonido"
      @click.stop="unlockSound"
    >
      🔇 Tocar para sonido
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  mediaKind,
  proxiedMediaUrl,
  resolveMediaUrl,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
} from '../utils/media'

/** Solo un video autoplay a la vez en el muro */
let stopActive = null

const props = defineProps({
  url: { type: String, default: '' },
  alt: { type: String, default: '' },
  fallbackTipo: { type: String, default: '' },
  /** Reproduce al entrar en el viewport (feed) */
  autoplayOnVisible: { type: Boolean, default: true },
})

const rootEl = ref(null)
const videoEl = ref(null)
const broken = ref(false)
const usedProxy = ref(false)
const displayUrl = ref('')
const inView = ref(false)
const playing = ref(false)
const userControls = ref(false)
const mutedUi = ref(true)

let observer

const kind = computed(() => mediaKind(props.url))

const activeEmbedSrc = computed(() => {
  if (kind.value !== 'embed') return ''
  const opts = {
    autoplay: Boolean(props.autoplayOnVisible && inView.value),
    loop: true,
  }
  return youtubeEmbedUrl(props.url, opts) || vimeoEmbedUrl(props.url, opts) || ''
})

function resetDisplay() {
  broken.value = false
  usedProxy.value = false
  displayUrl.value = resolveMediaUrl(props.url)
  userControls.value = false
  mutedUi.value = true
  playing.value = false
}

function onError() {
  if (kind.value === 'embed') {
    broken.value = true
    return
  }
  const original = resolveMediaUrl(props.url)
  if (!usedProxy.value && original && /^https?:\/\//i.test(original)) {
    usedProxy.value = true
    displayUrl.value = proxiedMediaUrl(original)
    return
  }
  broken.value = true
}

function claimExclusive() {
  if (stopActive && stopActive !== stopSelf) stopActive()
  stopActive = stopSelf
}

function stopSelf() {
  const el = videoEl.value
  if (el) {
    el.pause()
    try {
      el.currentTime = 0
    } catch {
      /* ignore */
    }
  }
  inView.value = false
  playing.value = false
  if (stopActive === stopSelf) stopActive = null
}

async function playVideo() {
  const el = videoEl.value
  if (!el) return
  claimExclusive()
  el.muted = true
  mutedUi.value = true
  try {
    await el.play()
    playing.value = true
  } catch {
    playing.value = false
  }
}

function unlockSound() {
  userControls.value = true
  const el = videoEl.value
  if (el) {
    el.muted = false
    mutedUi.value = false
    el.play().catch(() => {})
  }
  // YouTube: el usuario usa los controles del iframe para sonido
  if (kind.value === 'embed') mutedUi.value = false
}

function onIntersect(entries) {
  const entry = entries[0]
  const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45)
  if (!props.autoplayOnVisible) return

  if (visible) {
    inView.value = true
    if (kind.value === 'video') {
      nextTick(() => playVideo())
    } else if (kind.value === 'embed') {
      claimExclusive()
      playing.value = true
      mutedUi.value = true
    }
  } else {
    if (kind.value === 'video') {
      const el = videoEl.value
      if (el) el.pause()
      playing.value = false
      if (stopActive === stopSelf) stopActive = null
    } else if (kind.value === 'embed') {
      // Quitar autoplay al salir (cambia src vía computed)
      inView.value = false
      playing.value = false
      if (stopActive === stopSelf) stopActive = null
    }
  }
}

function bindObserver() {
  if (!props.autoplayOnVisible || !rootEl.value) return
  if (kind.value !== 'video' && kind.value !== 'embed') return
  const root = document.querySelector('.u-main') || null
  observer = new IntersectionObserver(onIntersect, {
    root,
    threshold: [0, 0.45, 0.7],
    rootMargin: '0px',
  })
  observer.observe(rootEl.value)
}

onMounted(() => {
  nextTick(bindObserver)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  stopSelf()
})

watch(
  () => props.url,
  () => {
    resetDisplay()
    nextTick(() => {
      observer?.disconnect()
      bindObserver()
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.pmedia {
  width: 100%;
  height: 100%;
  min-height: inherit;
  background: var(--cx-surface-2, #0f172a);
  position: relative;
}
.pmedia.embed,
.pmedia.video {
  background: #000;
}
.el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border: 0;
}
.pmedia.embed .el,
.pmedia.video .el {
  object-fit: contain;
}
iframe.el {
  object-fit: unset;
}
.fallback {
  width: 100%;
  height: 100%;
  min-height: 120px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
}
.fallback.soft {
  color: #94a3b8;
  background: #0f172a;
}
.unmute {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 4;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  backdrop-filter: blur(8px);
}
</style>
