<template>
  <div class="pp">
    <label v-if="label" class="pp-label">{{ label }}</label>
    <div v-if="modelValue" class="pp-selected">
      <span>{{ selectedLabel || modelValue }}</span>
      <button type="button" class="pp-clear" :disabled="disabled" @click="clear">Quitar</button>
    </div>
    <input
      v-model="q"
      type="search"
      class="input pp-input"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @input="onSearch"
      @focus="open = true"
    />
    <ul v-if="open && (results.length || loading || q.trim())" class="pp-list" role="listbox">
      <li v-if="loading" class="pp-muted">Buscando…</li>
      <li v-else-if="!results.length" class="pp-muted">Sin resultados</li>
      <li v-for="u in results" :key="u.id">
        <button type="button" class="pp-item" @click="pick(u)">
          <strong>{{ u.displayName || labelOf(u) }}</strong>
          <small v-if="u.usuario">@{{ u.usuario }}</small>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import api from '../services/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  selectedLabel: { type: String, default: '' },
  endpoint: { type: String, default: '/admin/talent/people' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar persona…' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:selectedLabel', 'select'])

const q = ref('')
const results = ref([])
const loading = ref(false)
const open = ref(false)
let timer = null

function labelOf(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || u.email || 'Usuario'
}

async function fetchPeople() {
  loading.value = true
  try {
    const { data } = await api.get(props.endpoint, { params: { q: q.value || undefined } })
    results.value = Array.isArray(data?.items) ? data.items : []
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  open.value = true
  clearTimeout(timer)
  timer = setTimeout(fetchPeople, 220)
}

function pick(u) {
  emit('update:modelValue', u.id)
  emit('update:selectedLabel', u.displayName || labelOf(u))
  emit('select', u)
  q.value = ''
  results.value = []
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  emit('update:selectedLabel', '')
  emit('select', null)
}

watch(
  () => props.endpoint,
  () => {
    results.value = []
  },
)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.pp {
  position: relative;
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}
.pp-label {
  font-size: 0.88rem;
  font-weight: 600;
}
.pp-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  border-radius: 10px;
  padding: 8px 10px;
}
.pp-clear {
  border: none;
  background: transparent;
  color: var(--brand-primary);
  font-weight: 700;
  cursor: pointer;
}
.pp-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  max-height: 220px;
  overflow: auto;
  box-shadow: 0 8px 24px var(--sh);
}
.pp-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 10px;
  border-radius: 8px;
  display: grid;
  gap: 2px;
  cursor: pointer;
}
.pp-item:hover {
  background: var(--panel-2);
}
.pp-item small {
  color: var(--ink-soft);
}
.pp-muted {
  padding: 10px;
  color: var(--ink-soft);
  font-size: 0.88rem;
}
</style>
