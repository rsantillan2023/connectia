<template>
  <button
    v-if="src"
    type="button"
    class="paudio"
    :class="{ on: playing, err: failed }"
    :aria-label="playing ? 'Pausar audio' : 'Reproducir audio'"
    :title="playing ? 'Pausar' : 'Escuchar'"
    @click.stop="toggle"
  >
    <svg v-if="!playing" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
    <audio
      ref="audioEl"
      :src="src"
      preload="none"
      @ended="playing = false"
      @error="onError"
      @pause="playing = false"
      @play="playing = true"
    />
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { mediaKind, resolveMediaUrl } from '../utils/media'

/** Un solo audio a la vez en el muro */
let activeStop = null

const props = defineProps({
  url: { type: String, default: '' },
  /** Si la media principal es video/embed, no mostrar audio */
  mediaUrl: { type: String, default: '' },
})

const audioEl = ref(null)
const playing = ref(false)
const failed = ref(false)

const src = computed(() => {
  if (!props.mediaUrl?.trim() || !props.url?.trim()) return ''
  const kind = mediaKind(props.mediaUrl)
  if (kind === 'video' || kind === 'embed') return ''
  return resolveMediaUrl(props.url)
})

function stopSelf() {
  const el = audioEl.value
  if (el) {
    el.pause()
    el.currentTime = 0
  }
  playing.value = false
}

function toggle() {
  const el = audioEl.value
  if (!el || failed.value) return
  if (playing.value) {
    el.pause()
    return
  }
  if (activeStop && activeStop !== stopSelf) activeStop()
  activeStop = stopSelf
  el.play().catch(() => {
    failed.value = true
    playing.value = false
  })
}

function onError() {
  failed.value = true
  playing.value = false
}

watch(
  () => props.url,
  () => {
    failed.value = false
    stopSelf()
  },
)

onBeforeUnmount(() => {
  stopSelf()
  if (activeStop === stopSelf) activeStop = null
})
</script>

<style scoped>
.paudio {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 3;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.paudio.on {
  background: var(--brand-primary);
}
.paudio.err {
  opacity: 0.45;
}
.paudio audio {
  display: none;
}
</style>
