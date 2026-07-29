<template>
  <section v-if="!loading && categories.length" class="mp-hub" :class="{ compact }">
    <p v-if="toast" class="mp-toast">{{ toast }}</p>

    <!-- Una sola pieza: franja marca + pestañas + card (efecto carpeta MP) -->
    <div class="mp-shell">
      <div class="mp-tabs" role="tablist" aria-label="Grupos de enlaces">
        <button
          v-for="(cat, idx) in categories"
          :key="cat"
          type="button"
          role="tab"
          class="mp-tab"
          :class="{ on: activeCat === cat }"
          :aria-selected="activeCat === cat"
          @click="activeCat = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div
        class="mp-card"
        role="tabpanel"
        :class="cardRadiusClass"
      >
        <div v-if="!compact" class="mp-card-head">
          <div class="mp-card-head-text">
            <p class="mp-kicker">{{ activeCat }}</p>
            <p class="mp-title">Accesos rápidos</p>
          </div>
          <span class="mp-chevron" aria-hidden="true">›</span>
        </div>

        <div class="mp-actions">
          <button
            v-for="l in activeQuick"
            :key="l.id"
            type="button"
            class="mp-action"
            :style="linkAccentStyle(l)"
            @click="openLink(l)"
          >
            <span class="mp-action-ico" aria-hidden="true">
              <HubIcon :name="l.icon" :size="iconPx(l)" />
            </span>
            <span class="mp-action-label">{{ l.titulo }}</span>
          </button>
          <p v-if="!activeQuick.length" class="mp-empty">Sin accesos rápidos en este grupo.</p>
        </div>

      </div>
    </div>

    <div v-if="showMore && activeMore.length" class="more-block">
      <p class="more-title">Más de {{ activeCat }}</p>
      <ul class="more-list">
        <li v-for="l in activeMore" :key="l.id">
          <button type="button" class="more-row" :style="linkAccentStyle(l)" @click="openLink(l)">
            <span class="more-ico" aria-hidden="true">
              <HubIcon :name="l.icon" :size="18" />
            </span>
            <span class="more-text">
              <strong>{{ l.titulo }}</strong>
              <small v-if="l.subtitulo">{{ l.subtitulo }}</small>
            </span>
            <span class="more-chevron" aria-hidden="true">›</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-if="webview" class="wv-sheet" @click.self="webview = null">
      <div class="wv-panel">
        <header class="wv-head">
          <strong>{{ webview.title }}</strong>
          <div class="wv-actions">
            <a :href="webview.url" target="_blank" rel="noopener" class="wv-ext">Abrir afuera</a>
            <button type="button" class="wv-close" @click="webview = null">Cerrar</button>
          </div>
        </header>
        <iframe class="wv-frame" :src="webview.url" title="Webview" />
      </div>
    </div>
  </section>
  <p v-else-if="!loading && !categories.length && showEmpty" class="mp-fallback">
    Todavía no hay enlaces configurados.
  </p>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import HubIcon from './HubIcon.vue'
import { useHubLinks } from '../composables/useHubLinks'

const props = defineProps({
  compact: { type: Boolean, default: false },
  showMore: { type: Boolean, default: false },
  showEmpty: { type: Boolean, default: false },
  /** muro = franja del feed (respeta showOnMuro); hub = /accesos completo */
  surface: { type: String, default: '' },
})

const emit = defineEmits(['loaded'])

const {
  categories,
  activeCat,
  activeQuick,
  activeMore,
  loading,
  toast,
  webview,
  load,
  openLink,
} = useHubLinks({
  surface: props.surface === 'muro' || (props.compact && !props.surface) ? 'muro' : 'hub',
})

const activeIndex = computed(() => {
  const i = categories.value.indexOf(activeCat.value)
  return i < 0 ? 0 : i
})

/** Color de acento configurado en admin → CSS --accent */
function linkAccentStyle(l) {
  const c = String(l?.color || '').trim()
  if (!c || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return undefined
  return { '--accent': c }
}

function iconPx(l) {
  const s = l?.iconSize
  if (s === 'sm') return 22
  if (s === 'lg') return 30
  return 26
}

/** Radio de la card según pestaña activa (efecto carpeta). */
const cardRadiusClass = computed(() => {
  const i = activeIndex.value
  const last = Math.max(0, categories.value.length - 1)
  if (i <= 0) return 'radius-first'
  if (i >= last) return 'radius-last'
  return 'radius-mid'
})

watch(categories, (cats) => {
  if (cats?.length && !cats.includes(activeCat.value)) activeCat.value = cats[0]
})

onMounted(async () => {
  await load()
  emit('loaded', { categories: categories.value })
})

defineExpose({ load, loading, categories })
</script>

<style scoped>
.mp-hub {
  --mp-ink: #1a1a1a;
  --mp-muted: #6b7280;
  --mp-accent: var(--brand-primary, #0f766e);
  --mp-action-bg: color-mix(in srgb, var(--mp-accent) 14%, #fff);
  --mp-action-fg: var(--mp-accent);
  --mp-radius: 22px;
  margin: 0;
  padding: 0;
  background: transparent;
}

.mp-hub.compact {
  padding-bottom: 0;
}

.mp-toast {
  margin: 0 12px 8px;
  background: #0f172a;
  color: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Shell: pestañas + card alineados (mismo ancho) */
.mp-shell {
  padding: 0 12px 14px;
  background: var(--brand-primary, #0f766e);
}

.mp-tabs {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 8px 0 0;
  margin: 0;
  position: relative;
  z-index: 3;
}
.mp-tabs::-webkit-scrollbar {
  display: none;
}

.mp-tab {
  flex: 0 0 auto;
  border: 0;
  outline: 0;
  background: transparent;
  color: color-mix(in srgb, #fff 90%, transparent);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  padding: 12px 16px 14px;
  border-radius: var(--mp-radius) var(--mp-radius) 0 0;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  z-index: 1;
  line-height: 1.2;
  transition: color 0.12s ease, background 0.12s ease;
  box-shadow: none;
}
.mp-tab:not(.on):active {
  color: #fff;
}

/* Activa: blanca, se funde con la card (sin línea de corte) */
.mp-tab.on {
  background: #fff;
  color: var(--mp-ink);
  font-weight: 800;
  z-index: 4;
  margin-bottom: -2px;
  padding-bottom: 16px;
  box-shadow: none;
}
/* Puente blanco bajo la pestaña activa para tapar cualquier borde/sombra */
.mp-tab.on::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 6px;
  background: #fff;
  pointer-events: none;
}

/* Card pegada a las pestañas (sombra solo abajo, no corta la pestaña) */
.mp-card {
  margin: 0;
  background: #fff;
  padding: 16px 14px 14px;
  position: relative;
  z-index: 2;
  border: 0;
  outline: 0;
  box-shadow: 0 12px 24px -8px rgba(15, 23, 42, 0.14);
}

.mp-card.radius-first {
  border-radius: 0 var(--mp-radius) var(--mp-radius) var(--mp-radius);
}
.mp-card.radius-mid {
  border-radius: var(--mp-radius);
}
.mp-card.radius-last {
  border-radius: var(--mp-radius) 0 var(--mp-radius) var(--mp-radius);
}

.mp-hub.compact .mp-card {
  padding: 14px 12px 12px;
}

.mp-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 16px;
}
.mp-kicker {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mp-muted);
}
.mp-title {
  margin: 2px 0 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--mp-ink);
}
.mp-chevron {
  color: var(--brand-primary, #0f766e);
  font-size: 1.45rem;
  line-height: 1;
  padding-top: 10px;
  opacity: 0.75;
  font-weight: 300;
}

.mp-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}

.mp-action {
  --tile-accent: var(--accent, var(--mp-accent));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 96px;
  padding: 12px 8px 10px;
  border: 0;
  border-radius: 18px;
  background: color-mix(in srgb, var(--tile-accent) 16%, #fff);
  color: var(--tile-accent);
  cursor: pointer;
  font: inherit;
  box-sizing: border-box;
  transition: transform 0.12s ease, filter 0.12s ease;
}
.mp-action:active {
  transform: scale(0.97);
  filter: brightness(0.97);
}

.mp-action-ico {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: inherit;
  flex-shrink: 0;
}

.mp-action-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--tile-accent) 72%, #0f172a);
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}

.mp-empty {
  grid-column: 1 / -1;
  margin: 8px 0;
  text-align: center;
  color: var(--mp-muted);
  font-size: 0.85rem;
}

.mp-fallback {
  margin: 24px 16px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  background: transparent;
}

/* El bloque “más” sale del fondo marca */
.more-block {
  margin: 18px 16px 0;
  padding: 0;
  background: transparent;
}
.more-title {
  margin: 0 0 8px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 700;
}
.more-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.more-row {
  width: 100%;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  border: 0;
  background: #fff;
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}
.more-ico {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent, var(--mp-accent)) 14%, #fff);
  color: var(--accent, var(--mp-accent));
}
.more-text {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.more-text strong {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-text small {
  color: #64748b;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-chevron {
  color: #94a3b8;
  font-size: 1.2rem;
}

.wv-sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 12px;
}
.wv-panel {
  width: min(920px, 100%);
  height: min(86vh, 720px);
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.wv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.wv-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.wv-ext {
  font-size: 0.8rem;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
}
.wv-close {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font: inherit;
  cursor: pointer;
  font-weight: 600;
}
.wv-frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: #f8fafc;
}
</style>
