<template>
  <div
    ref="rootEl"
    class="pcar"
    :class="{ paused }"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <div class="pcar-track" :style="{ transform: `translateX(-${index * 100}%)` }">
      <div v-for="(u, i) in urls" :key="`${i}-${u}`" class="pcar-slide">
        <PostMedia
          :url="u"
          :alt="alt ? `${alt} (${i + 1}/${urls.length})` : ''"
          :fallback-tipo="fallbackTipo"
          :autoplay-on-visible="false"
        />
      </div>
    </div>

    <div v-if="urls.length > 1" class="pcar-dots" role="tablist" aria-label="Imágenes del carrusel">
      <button
        v-for="(_, i) in urls"
        :key="'d' + i"
        type="button"
        class="pcar-dot"
        :class="{ on: i === index }"
        role="tab"
        :aria-selected="i === index"
        :aria-label="`Imagen ${i + 1}`"
        @click.stop="go(i)"
      />
    </div>

    <span v-if="urls.length > 1" class="pcar-count">{{ index + 1 }}/{{ urls.length }}</span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PostMedia from './PostMedia.vue'

const props = defineProps({
  urls: { type: Array, default: () => [] },
  alt: { type: String, default: '' },
  fallbackTipo: { type: String, default: '' },
  intervalMs: { type: Number, default: 4000 },
  autoplay: { type: Boolean, default: true },
})

const rootEl = ref(null)
const index = ref(0)
const paused = ref(false)
let timer = null
let touchStartX = null

const urls = computed(() =>
  (Array.isArray(props.urls) ? props.urls : [])
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean),
)

function go(i) {
  const n = urls.value.length
  if (!n) return
  index.value = ((i % n) + n) % n
  restart()
}

function next() {
  go(index.value + 1)
}

function clear() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function restart() {
  clear()
  if (!props.autoplay || props.intervalMs <= 0 || urls.value.length < 2) return
  timer = setInterval(() => {
    if (!paused.value) next()
  }, props.intervalMs)
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  touchStartX = e.clientX
  paused.value = true
}

function onPointerUp(e) {
  if (touchStartX == null) return
  const dx = e.clientX - touchStartX
  touchStartX = null
  paused.value = false
  if (Math.abs(dx) < 40) return
  if (dx < 0) next()
  else go(index.value - 1)
}

watch(urls, (list) => {
  if (index.value >= list.length) index.value = 0
  restart()
})

watch(
  () => [props.autoplay, props.intervalMs],
  () => restart(),
)

onMounted(restart)
onBeforeUnmount(clear)
</script>

<style scoped>
.pcar {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: inherit;
  overflow: hidden;
  background: var(--cx-surface-2, #0f172a);
  touch-action: pan-y;
  user-select: none;
}
.pcar-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.45s ease;
  will-change: transform;
}
.pcar-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  min-height: inherit;
}
.pcar-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  z-index: 3;
  display: flex;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}
.pcar-dot {
  pointer-events: auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 0;
  padding: 0;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.25);
  cursor: pointer;
}
.pcar-dot.on {
  background: #fff;
  width: 16px;
}
.pcar-count {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: rgba(15, 23, 42, 0.55);
  border-radius: 999px;
  padding: 4px 8px;
  backdrop-filter: blur(6px);
}
</style>
