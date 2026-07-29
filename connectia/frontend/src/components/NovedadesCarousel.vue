<template>
  <div class="nov-car">
    <div ref="scroller" class="nov-car-track" @scroll="onScroll">
      <button
        v-for="p in items"
        :key="p.id"
        type="button"
        class="nov-car-card"
        :aria-label="p.titulo || 'Abrir novedad'"
        @click="emit('open', p)"
      >
        <img v-if="cover(p)" :src="cover(p)" :alt="p.titulo || ''" class="nov-car-img" loading="lazy" />
        <div v-else class="nov-car-fallback" :data-tipo="p.tipo || 'general'">
          <span class="nov-car-fallback-tipo">{{ tipoLabel(p) }}</span>
          <strong>{{ p.titulo || 'Publicación' }}</strong>
        </div>
      </button>
      <div ref="endSentinel" class="nov-car-end" aria-hidden="true" />
    </div>
    <p v-if="loadingMore" class="nov-car-more">Cargando más…</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { postImageUrls } from '../utils/media'

const TIPO_LABELS = {
  noticia: 'Noticia',
  aviso: 'Aviso',
  beneficio: 'Beneficio',
  evento: 'Evento',
  celebracion: 'Celebración',
  general: 'General',
}

defineProps({
  items: { type: Array, default: () => [] },
  loadingMore: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'need-more'])

const scroller = ref(null)
const endSentinel = ref(null)
let observer

function cover(p) {
  return postImageUrls(p)[0] || ''
}

function tipoLabel(p) {
  return TIPO_LABELS[p?.tipo] || p?.tipo || 'Novedad'
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 120) {
    emit('need-more')
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) emit('need-more')
    },
    { root: scroller.value, rootMargin: '80px', threshold: 0.01 },
  )
  if (endSentinel.value) observer.observe(endSentinel.value)
})

watch(endSentinel, (el) => {
  if (el && observer) observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.nov-car {
  margin: 4px 0 8px;
}
.nov-car-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 16px 12px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nov-car-track::-webkit-scrollbar {
  display: none;
}
.nov-car-card {
  position: relative;
  flex: 0 0 auto;
  width: min(72vw, 280px);
  height: 168px;
  border: 0;
  padding: 0;
  border-radius: 18px;
  overflow: hidden;
  background: var(--cx-surface, #fff);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  scroll-snap-align: start;
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.nov-car-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.nov-car-fallback {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.35), transparent 42%),
    linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 55%, #1e293b), #0f172a);
  color: #fff;
}
.nov-car-fallback[data-tipo='beneficio'] {
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.35), transparent 42%),
    linear-gradient(145deg, #0ea5e9, #0369a1);
}
.nov-car-fallback[data-tipo='evento'] {
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.35), transparent 42%),
    linear-gradient(145deg, #8b5cf6, #5b21b6);
}
.nov-car-fallback[data-tipo='aviso'] {
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.35), transparent 42%),
    linear-gradient(145deg, #f59e0b, #b45309);
}
.nov-car-fallback[data-tipo='celebracion'] {
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.35), transparent 42%),
    linear-gradient(145deg, #ec4899, #9d174d);
}
.nov-car-fallback-tipo {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}
.nov-car-fallback strong {
  font-size: 15px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nov-car-end {
  flex: 0 0 1px;
  width: 1px;
  align-self: stretch;
}
.nov-car-more {
  margin: 0 16px 8px;
  font-size: 12px;
  color: var(--cx-muted);
}
</style>
