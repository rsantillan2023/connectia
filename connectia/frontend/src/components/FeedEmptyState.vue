<template>
  <div class="fes" :class="`fes--${kind}`" role="status" aria-live="polite">
    <div class="fes-stage" aria-hidden="true">
      <span class="fes-orb" />
      <span class="fes-ring" />
      <span class="fes-icon">
        <AppIcon :name="resolvedIcon" :size="28" />
      </span>
    </div>
    <h2 class="fes-title">{{ resolvedTitle }}</h2>
    <p class="fes-text">{{ resolvedText }}</p>
    <button
      v-if="kind === 'offline' || kind === 'error'"
      type="button"
      class="fes-cta"
      @click="$emit('retry')"
    >
      Reintentar
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  /** offline = red/servidor · error = fallo API · empty = 0 resultados */
  kind: { type: String, default: 'empty' },
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  icon: { type: String, default: '' },
})

defineEmits(['retry'])

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon
  if (props.kind === 'offline') return 'wifi-off'
  if (props.kind === 'error') return 'wifi-off'
  return 'inbox'
})

const resolvedTitle = computed(() => {
  if (props.title) return props.title
  if (props.kind === 'offline') return 'Sin conexión'
  if (props.kind === 'error') return 'No se pudo cargar'
  return 'Todavía no hay nada'
})

const resolvedText = computed(() => {
  if (props.text) return props.text
  if (props.kind === 'offline') {
    return 'Verificá la conexión o que el sistema esté andando.'
  }
  if (props.kind === 'error') {
    return 'Hubo un problema al cargar. Probá de nuevo en un momento.'
  }
  return 'Cuando haya información, va a aparecer acá.'
})
</script>

<style scoped>
.fes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: min(52vh, 380px);
  padding: 28px 28px 40px;
  gap: 8px;
}

.fes-stage {
  position: relative;
  width: 104px;
  height: 104px;
  margin-bottom: 8px;
  display: grid;
  place-items: center;
}

.fes-orb {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95), transparent 42%),
    radial-gradient(
      circle at 72% 72%,
      color-mix(in srgb, var(--brand-primary, #0f766e) 18%, #fff),
      #f1f5f9
    );
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
}

.fes--offline .fes-orb,
.fes--error .fes-orb {
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95), transparent 42%),
    radial-gradient(circle at 70% 70%, #fee2e2, #f8fafc);
}

.fes-ring {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 16%, transparent);
  opacity: 0.55;
}

.fes--offline .fes-ring,
.fes--error .fes-ring {
  border-color: color-mix(in srgb, #ef4444 22%, transparent);
}

.fes-icon {
  position: relative;
  z-index: 1;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, #fff);
}

.fes--offline .fes-icon,
.fes--error .fes-icon {
  color: #b91c1c;
  background: #fef2f2;
}

.fes-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--u-ink, #0f172a);
}

.fes-text {
  margin: 0;
  max-width: 20rem;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--u-muted, #64748b);
  overflow-wrap: anywhere;
}

.fes-cta {
  margin-top: 10px;
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 1.15rem;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  background: var(--brand-primary, #0f766e);
  cursor: pointer;
}

.fes-cta:active {
  transform: scale(0.98);
}
</style>
