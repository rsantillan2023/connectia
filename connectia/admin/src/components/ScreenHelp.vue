<template>
  <details class="screen-help">
    <summary>
      <span class="screen-help-label">¿Qué se puede hacer acá?</span>
      <span class="screen-help-chevron" aria-hidden="true">▾</span>
    </summary>
    <div class="screen-help-body">
      <p v-if="purpose">
        <strong>Para qué sirve.</strong>
        {{ purpose }}
      </p>
      <p v-if="canDo">
        <strong>Qué podés hacer.</strong>
        {{ canDo }}
      </p>
      <slot />
    </div>
  </details>
</template>

<script setup>
defineProps({
  purpose: { type: String, default: '' },
  canDo: { type: String, default: '' },
})
</script>

<style scoped>
.screen-help {
  margin: 10px 0 0;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-surface) 88%, var(--cx-page, var(--panel-2)));
  max-width: 62ch;
}

.screen-help summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cx-muted, var(--ink-soft));
  user-select: none;
}

.screen-help summary::-webkit-details-marker {
  display: none;
}

.screen-help-chevron {
  font-size: 11px;
  transition: transform 0.15s ease;
}

.screen-help[open] .screen-help-chevron {
  transform: rotate(180deg);
}

.screen-help[open] summary {
  color: var(--cx-text, var(--ink));
  border-bottom: 1px solid var(--cx-border);
}

.screen-help-body {
  padding: 10px 12px 12px;
  display: grid;
  gap: 8px;
}

.screen-help-body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted, var(--ink-soft));
}

.screen-help-body strong {
  color: var(--cx-text, var(--ink));
  font-weight: 700;
}
</style>
