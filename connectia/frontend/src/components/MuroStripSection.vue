<template>
  <section
    v-if="items.length"
    class="strip"
    :class="[`variant-${variant}`, `tone-root-${tone}`, { collapsed }]"
  >
    <header class="strip-head">
      <div class="strip-left">
        <button
          v-if="collapsible"
          type="button"
          class="strip-toggle"
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? `Expandir ${title}` : `Colapsar ${title}`"
          @click="toggleCollapsed"
        >
          <h2 class="strip-title">{{ title }}</h2>
          <span class="strip-chevron-head" aria-hidden="true">›</span>
        </button>
        <h2 v-else class="strip-title">{{ title }}</h2>
        <button v-if="!collapsed" type="button" class="strip-all" @click="emit('see-all')">
          Conocer todos
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <span v-if="collapsible && collapsed" class="strip-count">{{ items.length }}</span>
    </header>

    <template v-if="!collapsed">
      <!-- Tiles: solicitudes (barra fina, dark, ícono a la derecha) -->
      <div
        v-if="variant === 'tiles'"
        class="strip-tiles"
        :class="{ solo: items.length === 1 }"
        role="list"
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="tile"
          :class="{ unread: item.unread }"
          :data-estado="item.statusKey || ''"
          role="listitem"
          :aria-label="item.title"
          @click="emit('open', item)"
        >
          <span class="tile-glow" aria-hidden="true" />
          <span class="tile-body">
            <span v-if="item.typeLabel" class="tile-type">
              <AppIcon :name="item.typeIcon || 'clipboard'" :size="11" />
              {{ item.typeLabel }}
            </span>
            <strong class="tile-title">{{ item.title }}</strong>
            <span v-if="item.statusLabel" class="tile-status" :data-estado="item.statusKey || ''">
              <AppIcon :name="item.statusIcon || 'inbox'" :size="12" />
              {{ item.statusLabel }}
            </span>
          </span>
          <span class="tile-mark" aria-hidden="true">
            <AppIcon :name="item.statusIcon || avatarIcon(item)" :size="items.length === 1 ? 42 : 36" />
          </span>
        </button>
      </div>

      <!-- Avatares (chat): círculos + badge de no leídos -->
      <div v-else-if="variant === 'avatars'" class="strip-avatars" role="list">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="strip-bubble"
          :class="{ unread: item.unread || unreadBadge(item) }"
          role="listitem"
          :aria-label="bubbleLabel(item)"
          @click="emit('open', item)"
        >
          <span class="strip-bubble-ring">
            <img
              v-if="item.imageUrl"
              class="strip-bubble-img"
              :src="item.imageUrl"
              alt=""
              loading="lazy"
              @error="onBubbleImgError"
            />
            <span v-else class="strip-bubble-fallback" aria-hidden="true">
              {{ item.initials || '?' }}
            </span>
          </span>
          <span v-if="unreadBadge(item)" class="strip-bubble-badge">{{ unreadBadge(item) }}</span>
          <span v-if="nameLines(item).length" class="strip-bubble-name" aria-hidden="true">
            <span v-for="(line, li) in nameLines(item)" :key="li">{{ line }}</span>
          </span>
        </button>
      </div>

      <div
        v-else
        ref="trackEl"
        class="strip-track"
        @scroll.passive="onTrackScroll"
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="strip-card"
          :class="[`tone-${item.tone || tone}`, { unread: item.unread, 'has-image': Boolean(item.imageUrl) }]"
          :aria-label="item.title"
          @click="emit('open', item)"
        >
          <span v-if="variant === 'pager'" class="strip-glow" aria-hidden="true" />
          <img
            v-if="item.imageUrl && variant !== 'pager'"
            class="strip-bg"
            :src="item.imageUrl"
            alt=""
            loading="lazy"
            @error="onImgError"
          />
          <span v-if="item.imageUrl && variant !== 'pager'" class="strip-scrim" aria-hidden="true" />
          <span
            v-if="avatarIcon(item)"
            class="strip-avatar strip-avatar--icon"
            aria-hidden="true"
          >
            <AppIcon :name="avatarIcon(item)" :size="variant === 'pager' ? 18 : 20" />
          </span>
          <span
            v-else-if="item.initials && !item.imageUrl"
            class="strip-avatar"
            aria-hidden="true"
          >{{ item.initials }}</span>
          <span class="strip-body">
            <span v-if="variant !== 'pager'" class="strip-kicker">{{ item.kicker || defaultKicker }}</span>
            <span v-else class="strip-meta">
              <span class="strip-chip">{{ item.kicker || defaultKicker }}</span>
              <span v-if="item.unread" class="strip-unread-label">Sin leer</span>
            </span>
            <strong>{{ item.title }}</strong>
            <small v-if="item.subtitle">{{ item.subtitle }}</small>
          </span>
          <span v-if="variant === 'pager'" class="strip-chevron" aria-hidden="true">→</span>
          <span v-else-if="item.unread" class="strip-dot" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="variant === 'pager' && items.length > 1"
        class="strip-dots"
        role="tablist"
        aria-label="Avisos"
      >
        <button
          v-for="(item, i) in items"
          :key="`dot-${item.id}`"
          type="button"
          class="strip-dot-btn"
          :class="{ on: i === activeIndex }"
          :aria-label="`Ir a ${item.title}`"
          :aria-selected="i === activeIndex"
          role="tab"
          @click="scrollToIndex(i)"
        />
      </div>
    </template>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  tone: { type: String, default: 'aviso' },
  defaultKicker: { type: String, default: '' },
  /** Icono SVG por defecto del apartado (AppIcon) */
  defaultIcon: { type: String, default: '' },
  /** cards | pager | avatars | tiles */
  variant: { type: String, default: 'cards' },
  /** Permite colapsar el cuerpo del strip */
  collapsible: { type: Boolean, default: false },
  /** Clave localStorage para recordar colapso */
  collapseKey: { type: String, default: '' },
  /** Estado inicial colapsado si no hay preferencia guardada */
  defaultCollapsed: { type: Boolean, default: false },
})

const emit = defineEmits(['see-all', 'open'])

const TONE_ICONS = {
  aviso: 'bell',
  chat: 'chat',
  solicitud: 'inbox',
  beneficio: 'gift',
  agenda: 'calendar',
  encuesta: 'clipboard',
}

const trackEl = ref(null)
const activeIndex = ref(0)
const collapsed = ref(false)

function readCollapsedPref() {
  if (!props.collapsible) return false
  if (!props.collapseKey || typeof localStorage === 'undefined') return props.defaultCollapsed
  try {
    const v = localStorage.getItem(props.collapseKey)
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    /* ignore */
  }
  return props.defaultCollapsed
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (!props.collapseKey || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(props.collapseKey, collapsed.value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function avatarIcon(item) {
  return item?.icon || props.defaultIcon || TONE_ICONS[item?.tone || props.tone] || ''
}

function unreadBadge(item) {
  const n = Number(item?.unreadCount)
  if (Number.isFinite(n) && n > 0) return n > 99 ? '99+' : String(n)
  if (item?.unread) return '1'
  return ''
}

function bubbleLabel(item) {
  const n = unreadBadge(item)
  const name = (item.nameLines || []).join(' ') || item.title || 'Chat'
  if (n) return `${name}: ${n} sin leer`
  return name
}

function nameLines(item) {
  const lines = Array.isArray(item?.nameLines) ? item.nameLines.map((x) => String(x || '').trim()).filter(Boolean) : []
  if (lines.length) return lines.slice(0, 2)
  const t = String(item?.title || '').trim()
  if (!t) return []
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ')].slice(0, 2)
  return [t]
}

function onImgError(e) {
  const img = e?.target
  if (!img) return
  img.style.display = 'none'
  img.parentElement?.classList.remove('has-image')
}

function onBubbleImgError(e) {
  const img = e?.target
  if (!img) return
  img.style.display = 'none'
}

function onTrackScroll() {
  const el = trackEl.value
  if (!el || props.variant !== 'pager') return
  const card = el.querySelector('.strip-card')
  if (!card) return
  const gap = 10
  const step = card.offsetWidth + gap
  if (step <= 0) return
  activeIndex.value = Math.max(0, Math.min(props.items.length - 1, Math.round(el.scrollLeft / step)))
}

function scrollToIndex(i) {
  const el = trackEl.value
  if (!el) return
  const card = el.querySelector('.strip-card')
  if (!card) return
  const gap = 10
  el.scrollTo({ left: i * (card.offsetWidth + gap), behavior: 'smooth' })
  activeIndex.value = i
}

watch(
  () => props.items.length,
  async () => {
    activeIndex.value = 0
    await nextTick()
    trackEl.value?.scrollTo({ left: 0 })
  },
)

onMounted(() => {
  collapsed.value = readCollapsedPref()
  if (props.variant === 'pager') onTrackScroll()
})
</script>

<style scoped>
.strip {
  margin: 8px 0 12px;
}
.strip-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px 6px;
}
.strip-left {
  display: grid;
  gap: 2px;
}
.strip-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--cx-text, #0f172a);
  line-height: 1.2;
}
.strip-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  color: var(--brand-primary);
  cursor: pointer;
}
.strip-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 16px 12px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.strip-track::-webkit-scrollbar {
  display: none;
}
.strip-card {
  position: relative;
  flex: 0 0 auto;
  width: min(72vw, 280px);
  min-height: 148px;
  border: 0;
  padding: 16px;
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  text-align: left;
  scroll-snap-align: start;
  cursor: pointer;
  color: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, #f59e0b, #b45309);
}
.strip-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  pointer-events: none;
}
.strip-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.15) 0%,
    rgba(15, 23, 42, 0.35) 40%,
    rgba(15, 23, 42, 0.82) 100%
  );
}
.strip-card.has-image {
  background: #0f172a;
}
.strip-card > .strip-body,
.strip-card > .strip-avatar,
.strip-card > .strip-dot {
  position: relative;
  z-index: 2;
}
.strip-card.tone-chat {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 70%, #1d4ed8), #0f172a);
}
.strip-card.tone-beneficio {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, #059669, #065f46);
}
.strip-card.tone-agenda {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, #0284c7, #0c4a6e);
}
.strip-card.tone-solicitud {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, #475569, #0f172a);
}
.strip-card.tone-encuesta {
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.28), transparent 40%),
    linear-gradient(145deg, #db2777, #9d174d);
}
.strip-card.has-image.tone-beneficio,
.strip-card.has-image.tone-agenda,
.strip-card.has-image.tone-solicitud,
.strip-card.has-image.tone-encuesta,
.strip-card.has-image.tone-aviso,
.strip-card.has-image.tone-chat {
  background: #0f172a;
}
.strip-card.tone-aviso.unread {
  box-shadow: 0 6px 18px rgba(180, 83, 9, 0.28);
}
.strip-card.tone-chat.unread {
  box-shadow: 0 6px 18px color-mix(in srgb, var(--brand-primary) 35%, transparent);
}
.strip-card.tone-encuesta.unread,
.strip-card.tone-solicitud.unread {
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
}
.strip-avatar {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}
.strip-avatar--icon {
  color: #fff;
}
.strip-card.has-image .strip-avatar {
  background: rgba(15, 23, 42, 0.45);
}
.strip-body {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.strip-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}
.strip-body strong {
  font-size: 15px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.strip-body small {
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.92;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.strip-dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.15);
}
.strip-dots {
  display: none;
}

/* —— Pager: mismo lenguaje visual que novedades sin foto —— */
.variant-pager .strip-track {
  gap: 10px;
  padding: 2px 16px 8px;
  scroll-padding-inline: 16px;
}
.variant-pager .strip-card {
  position: relative;
  flex: 0 0 100%;
  width: auto;
  max-width: none;
  min-height: 0;
  height: auto;
  box-sizing: border-box;
  padding: 13px 14px;
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  overflow: hidden;
  color: var(--cx-text, #0f172a);
  background: linear-gradient(160deg, color-mix(in srgb, #f59e0b 14%, #fff) 0%, #fff 58%);
  border: 1px solid color-mix(in srgb, #f59e0b 18%, var(--cx-border, #e2e8f0));
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07);
  scroll-snap-align: center;
}
.variant-pager .strip-card.tone-aviso,
.variant-pager .strip-card.tone-chat,
.variant-pager .strip-card.tone-beneficio,
.variant-pager .strip-card.tone-agenda,
.variant-pager .strip-card.tone-solicitud,
.variant-pager .strip-card.tone-encuesta,
.variant-pager .strip-card.has-image {
  color: var(--cx-text, #0f172a);
  background: linear-gradient(160deg, color-mix(in srgb, #f59e0b 14%, #fff) 0%, #fff 58%);
}
.variant-pager .strip-card.unread {
  border-color: color-mix(in srgb, #f59e0b 36%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, #f59e0b 22%, #fff) 0%, #fff 62%);
  box-shadow: 0 6px 16px rgba(180, 83, 9, 0.12);
}
.variant-pager .strip-card.tone-aviso.unread {
  background: linear-gradient(160deg, color-mix(in srgb, #f59e0b 22%, #fff) 0%, #fff 62%);
  box-shadow: 0 6px 16px rgba(180, 83, 9, 0.12);
}
.variant-pager .strip-glow {
  position: absolute;
  top: -34px;
  right: -18px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: color-mix(in srgb, #f59e0b 26%, transparent);
  pointer-events: none;
  z-index: 0;
}
.variant-pager .strip-card.unread .strip-glow {
  background: color-mix(in srgb, #f59e0b 34%, transparent);
}
.variant-pager .strip-avatar {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: color-mix(in srgb, #f59e0b 18%, transparent);
  color: #b45309;
  backdrop-filter: none;
  box-shadow: none;
}
.variant-pager .strip-card.unread .strip-avatar {
  background: color-mix(in srgb, #f59e0b 28%, transparent);
}
.variant-pager .strip-body {
  position: relative;
  z-index: 1;
  flex: 1;
  gap: 3px;
  padding-right: 4px;
  min-width: 0;
}
.variant-pager .strip-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.variant-pager .strip-chip {
  display: inline-flex;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #b45309;
}
.variant-pager .strip-unread-label {
  font-size: 10px;
  font-weight: 700;
  color: #c2410c;
  background: color-mix(in srgb, #f59e0b 16%, transparent);
  border-radius: 999px;
  padding: 2px 7px;
}
.variant-pager .strip-body strong {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--cx-text, #0f172a);
  -webkit-line-clamp: 1;
}
.variant-pager .strip-body small {
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--cx-muted, #64748b);
  opacity: 1;
  -webkit-line-clamp: 1;
}
.variant-pager .strip-chevron {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: color-mix(in srgb, #f59e0b 16%, transparent);
  color: #b45309;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}
.variant-pager .strip-card.unread .strip-chevron {
  background: color-mix(in srgb, #f59e0b 28%, transparent);
}
.variant-pager .strip-dot {
  display: none;
}
.variant-pager .strip-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  padding: 0 16px 6px;
}
.variant-pager .strip-dot-btn {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #cbd5e1;
  cursor: pointer;
  transition: width 0.15s ease, background 0.15s ease;
}
.variant-pager .strip-dot-btn.on {
  width: 14px;
  background: #f59e0b;
}

/* —— Avatares (chat) —— */
.strip-avatars {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 16px 10px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.strip-avatars::-webkit-scrollbar {
  display: none;
}
.strip-bubble {
  position: relative;
  flex: 0 0 auto;
  width: 58px;
  min-height: 64px;
  height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.strip-bubble-ring {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-primary, #0f766e) 75%, #1d4ed8),
    color-mix(in srgb, var(--brand-primary, #0f766e) 40%, #0f172a)
  );
  box-sizing: border-box;
}
.strip-bubble.unread .strip-bubble-ring {
  background: linear-gradient(135deg, #0ea5e9, var(--brand-primary, #0f766e));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary, #0f766e) 22%, transparent);
}
.strip-bubble-img,
.strip-bubble-fallback {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  box-shadow: inset 0 0 0 2px var(--u-surface, #fff);
}
.strip-bubble-fallback {
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  letter-spacing: -0.02em;
}
.strip-bubble-badge {
  position: absolute;
  top: -2px;
  right: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--u-surface, #fff);
  pointer-events: none;
  z-index: 2;
}
.strip-bubble-name {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 58px;
  font-size: 9px;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: 0.01em;
  color: var(--cx-muted, #64748b);
  text-align: center;
}
.strip-bubble-name span {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* —— Header colapsable —— */
.strip-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.strip-chevron-head {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--brand-primary, #0f766e);
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  transform: rotate(-90deg);
  transition: transform 0.18s ease;
}
.strip:not(.collapsed) .strip-chevron-head {
  transform: rotate(90deg);
}
.strip-count {
  flex-shrink: 0;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, #fff);
  color: var(--brand-primary, #0f766e);
  font-size: 12px;
  font-weight: 800;
  line-height: 22px;
  text-align: center;
  margin-top: 2px;
}
.strip.collapsed {
  margin-bottom: 4px;
}

/* —— Tiles (solicitudes: barra fina dark) —— */
.strip-tiles {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 16px 12px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.strip-tiles::-webkit-scrollbar {
  display: none;
}
.strip-tiles.solo {
  display: block;
  overflow: visible;
}
.tile {
  position: relative;
  flex: 0 0 auto;
  width: min(86vw, 320px);
  min-height: 0;
  height: auto;
  border: 0;
  padding: 12px 14px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  text-align: left;
  scroll-snap-align: start;
  cursor: pointer;
  color: #fff;
  background:
    radial-gradient(ellipse 90% 120% at 100% 50%, rgba(255, 255, 255, 0.12), transparent 55%),
    linear-gradient(115deg, #0a0a0a 0%, #171717 48%, #262626 100%);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
}
.strip-tiles.solo .tile {
  width: 100%;
}
.tile-glow {
  position: absolute;
  right: -18%;
  top: -40%;
  width: 55%;
  height: 180%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent 70%);
  pointer-events: none;
}
.tile-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.tile-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile-title {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tile-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  margin-top: 2px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  box-shadow: none;
}
.tile-status[data-estado='a_completar'],
.tile-status[data-estado='escalada'] {
  color: #fde68a;
}
.tile-status[data-estado='resuelta'],
.tile-status[data-estado='cerrada'] {
  color: #86efac;
}
.tile-status[data-estado='cancelada'] {
  color: rgba(255, 255, 255, 0.45);
}
.tile-mark {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: rgba(255, 255, 255, 0.88);
  opacity: 0.92;
  pointer-events: none;
}
.strip-tiles.solo .tile-mark {
  width: 52px;
  height: 52px;
}
.tile.unread .tile-status {
  color: #fde68a;
}
</style>
