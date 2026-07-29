<template>
  <div v-if="shouldShow" class="install-banner" role="dialog" aria-label="Instalar Connectia">
    <img class="install-banner__icon" src="/icons/icon-192.png" width="40" height="40" alt="" />
    <div class="install-banner__text">
      <p class="install-banner__title">Instalá Connectia</p>
      <p class="install-banner__hint">{{ hint }}</p>
    </div>
    <div class="install-banner__actions">
      <button v-if="canPrompt" type="button" class="install-banner__btn" @click="onInstall">
        Instalar
      </button>
      <button type="button" class="install-banner__dismiss" aria-label="Ahora no" @click="dismiss">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePwaInstall } from '../composables/usePwaInstall'

const { canPrompt, shouldShow, promptInstall, dismiss } = usePwaInstall()

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const hint = computed(() => {
  if (canPrompt.value) return 'Agregá el ícono a tu pantalla de inicio.'
  if (isIos) return 'Safari → Compartir → Añadir a pantalla de inicio.'
  return 'Chrome → ⋮ → Instalar app / Añadir a pantalla de inicio.'
})

async function onInstall() {
  await promptInstall()
}
</script>

<style scoped>
.install-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 10px 0;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.install-banner__icon {
  border-radius: 10px;
  flex-shrink: 0;
}

.install-banner__text {
  flex: 1;
  min-width: 0;
}

.install-banner__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--cx-text);
}

.install-banner__hint {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--cx-muted);
}

.install-banner__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.install-banner__btn {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: var(--brand-primary);
  white-space: nowrap;
}

.install-banner__dismiss {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--cx-muted);
  font-size: 14px;
}
</style>
