<template>
  <div ref="rootEl" class="rx-bar" @click.stop>
    <button
      type="button"
      class="rx-main"
      :class="{ on: Boolean(myKey) }"
      aria-label="Reacciones"
      title="Reacciones"
      :aria-expanded="pickerOpen"
      @click="togglePicker"
    >
      <span class="rx-emoji" aria-hidden="true">{{ mainEmoji }}</span>
      <span v-if="totalCount" class="rx-count">{{ totalCount }}</span>
    </button>

    <Transition name="rx-pop">
      <div v-if="pickerOpen" class="rx-panel" role="listbox" aria-label="Elegir reacción">
        <button
          v-for="r in reactionKeys"
          :key="r.key"
          type="button"
          class="rx-panel-btn"
          role="option"
          :class="{ on: myKey === r.key }"
          :aria-selected="myKey === r.key"
          :aria-label="r.label"
          :title="r.label"
          @click="pick(r.key)"
        >
          <span class="rx-emoji">{{ r.emoji }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { REACTION_KEYS } from '../constants/reactions'

const props = defineProps({
  modelValue: { type: Object, default: null },
})

const emit = defineEmits(['react'])

const reactionKeys = REACTION_KEYS
const pickerOpen = ref(false)
const rootEl = ref(null)

const myKey = computed(() => props.modelValue?.myReaction || null)

const mainEmoji = computed(() => {
  const hit = REACTION_KEYS.find((r) => r.key === myKey.value)
  return hit?.emoji || '❤️'
})

const totalCount = computed(() => {
  const rx = props.modelValue?.reactions || {}
  return REACTION_KEYS.reduce((sum, r) => sum + (Number(rx[r.key]) || 0), 0)
})

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function pick(key) {
  pickerOpen.value = false
  emit('react', key)
}

function onDocClick(ev) {
  if (!pickerOpen.value) return
  if (!rootEl.value?.contains(ev.target)) pickerOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.rx-bar {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.rx-main {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 36px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--cx-muted, #64748b);
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
  box-sizing: border-box;
}
.rx-main:active {
  transform: scale(0.97);
}
.rx-main.on {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--cx-text, #0f172a);
}

.rx-emoji {
  font-size: 1.1rem;
  line-height: 1;
}
.rx-count {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: inherit;
}

/* Barra horizontal tipo WhatsApp */
.rx-panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 999px;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
}
.rx-panel-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 0;
  transition: transform 0.12s ease, background 0.12s ease;
}
.rx-panel-btn:hover,
.rx-panel-btn:focus-visible {
  transform: scale(1.18);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, transparent);
}
.rx-panel-btn.on {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, transparent);
}
.rx-panel-btn .rx-emoji {
  font-size: 1.35rem;
}

.rx-pop-enter-active,
.rx-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.rx-pop-enter-from,
.rx-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.94);
}
</style>
