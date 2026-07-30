<template>
  <!-- Cabecera de página estilo prototipo Hiryx: título · subtítulo · acciones · línea -->
  <header class="admin-page-header">
    <div class="admin-page-header__titles">
      <h1 tabindex="-1">{{ title }}</h1>
      <p v-if="subtitle" class="admin-page-header__sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.admin-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  width: 100%;
  margin: -0.5rem 0 1.25rem;
  padding: 0.85rem 0 1rem;
  border-bottom: 1px solid var(--line, #2c2739);
  background: transparent;
  position: sticky;
  top: 0;
  z-index: 15;
  backdrop-filter: blur(8px);
  /* blur sobre canvas: en dark = rgba canvas */
  background-color: color-mix(in srgb, var(--canvas, #111019) 88%, transparent);
}
.admin-page-header__titles {
  min-width: 0;
  flex: 1 1 auto;
}
.admin-page-header h1 {
  margin: 0;
  color: var(--ink, #ece9f4);
  font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  outline: none;
}
.admin-page-header__sub {
  margin: 0.15rem 0 0;
  color: var(--ink-faint, #7a7591);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0;
}
.admin-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: auto;
}
.admin-page-header__actions :deep(button),
.admin-page-header__actions :deep(a) {
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.55rem 0.875rem;
  line-height: 1.25;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--line-2, #3a3450);
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sh);
  transition: background 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.admin-page-header__actions :deep(.btn-primary),
.admin-page-header__actions :deep(a.btn-primary),
.admin-page-header__actions :deep(button.bg-teal-700),
.admin-page-header__actions :deep(a.bg-teal-700) {
  background: var(--brand, #6b5bf0) !important;
  color: #fff !important;
  border-color: var(--brand, #6b5bf0) !important;
  box-shadow: 0 6px 18px rgba(91, 75, 224, 0.35);
}
.admin-page-header__actions :deep(.btn-primary:hover),
.admin-page-header__actions :deep(button.bg-teal-700:hover) {
  background: #7d6ef2 !important;
}
.admin-page-header__actions :deep(.btn-ghost),
.admin-page-header__actions :deep(button.border),
.admin-page-header__actions :deep(a.border),
.admin-page-header__actions :deep(.btn-secondary) {
  background: var(--panel, #1e1a2b) !important;
  color: var(--ink, #ece9f4) !important;
  border-color: var(--line-2, #3a3450) !important;
}
.admin-page-header__actions :deep(.btn-ghost:hover),
.admin-page-header__actions :deep(button.border:hover) {
  background: var(--brand-soft, #241f3a) !important;
  border-color: var(--brand-line, #3d3470) !important;
  color: var(--brand-ink, #b7adff) !important;
}
.admin-page-header__actions :deep(.info-btn) {
  width: 2rem;
  height: 2rem;
  padding: 0;
  justify-content: center;
  border-radius: 10px;
  background: var(--panel) !important;
  color: var(--ink-soft) !important;
}
</style>
