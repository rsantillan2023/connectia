<template>
  <header class="sph">
    <button type="button" class="sph-back" aria-label="Volver al muro" @click="goHome">
      <AppIcon name="back" :size="22" />
    </button>
    <div class="sph-text">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="sph-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  homeTo: { type: String, default: '/muro' },
})

const router = useRouter()

function goHome() {
  router.push(props.homeTo)
}
</script>

<style scoped>
.sph {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 14px;
  margin: 0;
  border-bottom: 1px solid var(--cx-border, #e2e8f0);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--cx-border, #e2e8f0) 80%, transparent);
  box-sizing: border-box;
}
.sph-back {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin-top: 2px;
  border: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--brand-primary, #0f766e);
  cursor: pointer;
}
.sph-back:active {
  transform: scale(0.96);
}
.sph-text {
  min-width: 0;
  flex: 1;
  padding-top: 4px;
  padding-right: 4px;
}
.sph-text h1 {
  margin: 0;
  font-family: var(--font-display, inherit);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: var(--cx-text, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sph-text p {
  margin: 6px 0 0;
  font-size: 0.86rem;
  line-height: 1.35;
  color: var(--cx-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sph-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
}
</style>
