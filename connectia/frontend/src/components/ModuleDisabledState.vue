<template>
  <div class="mds" role="status" aria-live="polite">
    <div class="mds-stage" aria-hidden="true">
      <span class="mds-orb mds-orb--a" />
      <span class="mds-orb mds-orb--b" />
      <span class="mds-ring" />
      <span class="mds-icon">
        <AppIcon :name="icon" :size="28" />
      </span>
    </div>
    <h2 class="mds-title">{{ title }}</h2>
    <p class="mds-text">{{ descriptionText }}</p>
    <button v-if="showHome" type="button" class="mds-cta" @click="goHome">
      Volver al muro
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  /** Nombre del módulo (se usa en el copy por defecto) */
  moduleName: { type: String, default: '' },
  title: { type: String, default: 'Todavía no está disponible' },
  description: { type: String, default: '' },
  icon: { type: String, default: 'sparkles' },
  showHome: { type: Boolean, default: true },
})

const router = useRouter()

const descriptionText = computed(() => {
  if (props.description) return props.description
  const name = String(props.moduleName || '').trim()
  if (name) {
    return `${name} aún no está activo en tu comunidad. Cuando lo habiliten, va a aparecer acá.`
  }
  return 'Este módulo aún no está activo en tu comunidad. Cuando lo habiliten, va a aparecer acá.'
})

function goHome() {
  router.push('/muro')
}
</script>

<style scoped>
.mds {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: min(58vh, 420px);
  padding: 32px 24px 48px;
  gap: 10px;
}

.mds-stage {
  position: relative;
  width: 112px;
  height: 112px;
  margin-bottom: 10px;
  display: grid;
  place-items: center;
}

.mds-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.mds-orb--a {
  inset: 8px;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.95), transparent 42%),
    radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--brand-primary, #0f766e) 22%, #fff), #f1f5f9);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}
.mds-orb--b {
  width: 34px;
  height: 34px;
  top: 6px;
  right: 4px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, #fff);
  opacity: 0.85;
  animation: mds-float 4.5s ease-in-out infinite;
}
.mds-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 18%, transparent);
  animation: mds-pulse 3.8s ease-in-out infinite;
}
.mds-icon {
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

.mds-title {
  margin: 0;
  max-width: 280px;
  font-size: 1.15rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: #0f172a;
}
.mds-text {
  margin: 0;
  max-width: 300px;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.45;
  color: #64748b;
}
.mds-cta {
  margin-top: 10px;
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 10px;
}
.mds-cta:active {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, transparent);
}

@keyframes mds-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
@keyframes mds-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mds-orb--b,
  .mds-ring {
    animation: none;
  }
}
</style>
