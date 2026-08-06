<template>
  <div class="q-type-field">
    <span v-if="label" class="q-type-label">{{ label }}</span>
    <div class="q-type-picker" role="radiogroup" :aria-label="label || 'Tipo de pregunta'">
      <button
        v-for="t in types"
        :key="t.id"
        type="button"
        role="radio"
        class="q-type-btn"
        :class="{ on: modelValue === t.id }"
        :aria-checked="modelValue === t.id"
        :title="t.label"
        :aria-label="t.label"
        @click="$emit('update:modelValue', t.id)"
      >
        <QuestionTypeIcon :tipo="t.id" :size="28" />
        <span class="q-type-caption">{{ shortLabel(t) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import QuestionTypeIcon from './QuestionTypeIcon.vue'

defineProps({
  modelValue: { type: String, default: 'text' },
  types: { type: Array, default: () => [] },
  label: { type: String, default: 'Tipo' },
})

defineEmits(['update:modelValue'])

function shortLabel(t) {
  const raw = String(t?.label || t?.id || '').trim()
  if (raw.length <= 14) return raw
  // Etiquetas largas: acortar sin perder sentido
  return (
    {
      'Valoración 1–5': 'Valoración',
      'Check-in (ubicación GPS)': 'GPS',
      'Opción múltiple': 'Múltiple',
      'Opción única': 'Única',
      'Texto corto': 'Texto',
      'Texto largo': 'Largo',
      'Fecha y hora': 'Fecha/hora',
    }[raw] || raw.slice(0, 12)
  )
}
</script>

<style scoped>
.q-type-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.q-type-label {
  font-size: 0.85rem;
  font-weight: 600;
}
.q-type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.q-type-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 72px;
  min-height: 68px;
  padding: 8px 4px 6px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.1s ease;
}
.q-type-btn:hover {
  border-color: color-mix(in srgb, var(--primary, var(--brand-primary)) 40%, var(--line));
  color: var(--primary, var(--brand-primary));
  background: color-mix(in srgb, var(--primary, var(--brand-primary)) 8%, transparent);
}
.q-type-btn.on {
  border-color: transparent;
  background: var(--primary, var(--brand-primary));
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary, var(--brand-primary)) 35%, transparent);
}
.q-type-btn:active {
  transform: scale(0.96);
}
.q-type-caption {
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
