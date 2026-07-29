<template>
  <section class="strip">
    <header class="strip-head">
      <div class="strip-left">
        <h2 class="strip-title">{{ title }}</h2>
        <button type="button" class="strip-all" @click="emit('see-all')">
          Conocer todos
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <p v-if="loading && !items.length" class="strip-empty">Cargando…</p>
    <p v-else-if="!items.length" class="strip-empty">{{ emptyText }}</p>

    <div v-else class="strip-track">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="strip-card"
        :class="[`tone-${item.tone || tone}`, { unread: item.unread, 'has-image': Boolean(item.imageUrl) }]"
        :aria-label="item.title"
        @click="emit('open', item)"
      >
        <img
          v-if="item.imageUrl"
          class="strip-bg"
          :src="item.imageUrl"
          alt=""
          loading="lazy"
          @error="onImgError"
        />
        <span v-if="item.imageUrl" class="strip-scrim" aria-hidden="true" />
        <span
          v-if="avatarIcon(item)"
          class="strip-avatar strip-avatar--icon"
          aria-hidden="true"
        >
          <AppIcon :name="avatarIcon(item)" :size="20" />
        </span>
        <span
          v-else-if="item.initials && !item.imageUrl"
          class="strip-avatar"
          aria-hidden="true"
        >{{ item.initials }}</span>
        <span class="strip-body">
          <span class="strip-kicker">{{ item.kicker || defaultKicker }}</span>
          <strong>{{ item.title }}</strong>
          <small v-if="item.subtitle">{{ item.subtitle }}</small>
        </span>
        <span v-if="item.unread" class="strip-dot" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: 'No hay nada por acá.' },
  tone: { type: String, default: 'aviso' },
  defaultKicker: { type: String, default: '' },
  /** Icono SVG por defecto del apartado (AppIcon) */
  defaultIcon: { type: String, default: '' },
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

function avatarIcon(item) {
  return item?.icon || props.defaultIcon || TONE_ICONS[item?.tone || props.tone] || ''
}

function onImgError(e) {
  const img = e?.target
  if (!img) return
  img.style.display = 'none'
  img.parentElement?.classList.remove('has-image')
}
</script>

<style scoped>
.strip {
  margin: 8px 0 12px;
}
.strip-head {
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
.strip-empty {
  margin: 0 16px 12px;
  font-size: 13px;
  color: var(--cx-muted);
}
</style>
