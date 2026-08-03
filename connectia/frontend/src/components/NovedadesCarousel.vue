<template>
  <div class="nov-car">
    <div ref="scroller" class="nov-car-track" @scroll="onScroll">
      <button
        v-for="p in items"
        :key="p.id"
        type="button"
        class="nov-car-card"
        :class="{ 'is-text': !hasVisual(p), 'is-video': isVideoCard(p) }"
        :aria-label="p.titulo || 'Abrir novedad'"
        @click="emit('open', p)"
      >
        <template v-if="hasVisual(p)">
          <img
            v-if="coverImg(p)"
            :src="coverImg(p)"
            :alt="p.titulo || ''"
            class="nov-car-img"
            loading="lazy"
          />
          <video
            v-else-if="videoSrc(p)"
            class="nov-car-img nov-car-video"
            :src="videoSrc(p)"
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
          />
          <span v-if="isVideoCard(p)" class="nov-car-play" aria-hidden="true">▶</span>
          <span class="nov-car-photo-scrim" aria-hidden="true" />
          <span class="nov-car-photo-meta">
            <span class="nov-car-chip">{{ tipoLabel(p) }}</span>
            <strong>{{ p.titulo || 'Publicación' }}</strong>
          </span>
        </template>
        <div v-else class="nov-car-text" :data-tipo="p.tipo || 'general'">
          <span class="nov-car-text-glow" aria-hidden="true" />
          <header class="nov-car-text-head">
            <span class="nov-car-chip">{{ tipoLabel(p) }}</span>
            <span v-if="p.section" class="nov-car-section">{{ p.section }}</span>
          </header>
          <strong class="nov-car-text-title">{{ p.titulo || 'Publicación' }}</strong>
          <p v-if="excerpt(p)" class="nov-car-text-body">{{ excerpt(p) }}</p>
          <footer v-if="footerLine(p)" class="nov-car-text-foot">{{ footerLine(p) }}</footer>
        </div>
      </button>
      <div ref="endSentinel" class="nov-car-end" aria-hidden="true" />
    </div>
    <p v-if="loadingMore" class="nov-car-more">Cargando más…</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  mediaKind,
  postCoverUrl,
  postMediaKind,
  postPrimaryMediaUrl,
  resolveMediaUrl,
} from '../utils/media'

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

function coverImg(p) {
  return postCoverUrl(p) || ''
}

function videoSrc(p) {
  const u = postPrimaryMediaUrl(p)
  return mediaKind(u) === 'video' ? resolveMediaUrl(u) : ''
}

function isVideoCard(p) {
  const k = postMediaKind(p)
  return k === 'video' || k === 'embed'
}

function hasVisual(p) {
  return Boolean(coverImg(p) || videoSrc(p))
}

function tipoLabel(p) {
  return TIPO_LABELS[p?.tipo] || p?.tipo || 'Novedad'
}

function excerpt(p) {
  const raw = String(p?.cuerpo || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return ''
  return raw.length > 110 ? `${raw.slice(0, 109)}…` : raw
}

function footerLine(p) {
  const author = String(p?.authorName || '').trim()
  if (author) return author
  return ''
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
.nov-car-card.is-text {
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07);
}
.nov-car-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #0f172a;
}
.nov-car-video {
  pointer-events: none;
}
.nov-car-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -60%);
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.85rem;
  padding-left: 2px;
  pointer-events: none;
}
.nov-car-photo-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 35%,
    rgba(15, 23, 42, 0.55) 70%,
    rgba(15, 23, 42, 0.88) 100%
  );
  pointer-events: none;
}
.nov-car-photo-meta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: grid;
  gap: 4px;
  padding: 14px;
  color: #fff;
}
.nov-car-photo-meta strong {
  font-size: 14px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nov-car-chip {
  display: inline-flex;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
}

/* —— Card de texto (sin foto): composición completa —— */
.nov-car-text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--cx-text, #0f172a);
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--brand-primary, #0f766e) 10%, #fff) 0%, #fff 55%),
    var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: inherit;
}
.nov-car-text-glow {
  position: absolute;
  top: -28px;
  right: -20px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 18%, transparent);
  pointer-events: none;
}
.nov-car-text[data-tipo='beneficio'] {
  background: linear-gradient(160deg, color-mix(in srgb, #0ea5e9 12%, #fff) 0%, #fff 55%);
}
.nov-car-text[data-tipo='beneficio'] .nov-car-text-glow {
  background: color-mix(in srgb, #0ea5e9 22%, transparent);
}
.nov-car-text[data-tipo='beneficio'] .nov-car-chip {
  color: #0369a1;
}
.nov-car-text[data-tipo='evento'] {
  background: linear-gradient(160deg, color-mix(in srgb, #8b5cf6 12%, #fff) 0%, #fff 55%);
}
.nov-car-text[data-tipo='evento'] .nov-car-text-glow {
  background: color-mix(in srgb, #8b5cf6 22%, transparent);
}
.nov-car-text[data-tipo='evento'] .nov-car-chip {
  color: #6d28d9;
}
.nov-car-text[data-tipo='aviso'] {
  background: linear-gradient(160deg, color-mix(in srgb, #f59e0b 14%, #fff) 0%, #fff 55%);
}
.nov-car-text[data-tipo='aviso'] .nov-car-text-glow {
  background: color-mix(in srgb, #f59e0b 24%, transparent);
}
.nov-car-text[data-tipo='aviso'] .nov-car-chip {
  color: #b45309;
}
.nov-car-text[data-tipo='celebracion'] {
  background: linear-gradient(160deg, color-mix(in srgb, #ec4899 12%, #fff) 0%, #fff 55%);
}
.nov-car-text[data-tipo='celebracion'] .nov-car-text-glow {
  background: color-mix(in srgb, #ec4899 22%, transparent);
}
.nov-car-text[data-tipo='celebracion'] .nov-car-chip {
  color: #be185d;
}
.nov-car-text[data-tipo='noticia'] .nov-car-chip,
.nov-car-text[data-tipo='general'] .nov-car-chip {
  color: var(--brand-primary, #0f766e);
}
.nov-car-text-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.nov-car-section {
  font-size: 10px;
  font-weight: 600;
  color: var(--cx-muted, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 45%;
}
.nov-car-text-title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nov-car-text-body {
  position: relative;
  z-index: 1;
  margin: 0;
  flex: 1;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--cx-muted, #64748b);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nov-car-text-foot {
  position: relative;
  z-index: 1;
  margin-top: auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--cx-muted, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
