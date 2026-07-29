<template>
  <div class="emoji-picker">
    <button
      type="button"
      class="emoji-toggle"
      :aria-expanded="open"
      aria-label="Insertar emoji"
      title="Emoji"
      @click.stop="open = !open"
    >
      😊
    </button>
    <div v-if="open" class="emoji-panel" role="listbox" aria-label="Elegir emoji">
      <button
        v-for="e in emojis"
        :key="e"
        type="button"
        class="emoji-btn"
        role="option"
        @click.stop="pick(e)"
      >
        {{ e }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { COMMENT_EMOJIS } from '../constants/emojis'

defineProps({
  emojis: { type: Array, default: () => COMMENT_EMOJIS },
})

const emit = defineEmits(['pick'])
const open = ref(false)

function pick(e) {
  emit('pick', e)
}

function onDocClick(ev) {
  if (!open.value) return
  const root = ev.target?.closest?.('.emoji-picker')
  if (!root) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

defineExpose({ close: () => { open.value = false } })
</script>

<style scoped>
.emoji-picker {
  position: relative;
  flex-shrink: 0;
}
.emoji-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid var(--cx-border, #dde3e8);
  border-radius: 12px;
  background: var(--cx-surface, #fff);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.emoji-panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  width: min(280px, 78vw);
  max-height: 200px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--cx-border, #dde3e8);
  background: var(--cx-surface, #fff);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.emoji-btn {
  border: 0;
  background: transparent;
  border-radius: 8px;
  font-size: 22px;
  line-height: 1.2;
  padding: 6px 0;
  cursor: pointer;
}
.emoji-btn:hover,
.emoji-btn:focus-visible {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
}
</style>
