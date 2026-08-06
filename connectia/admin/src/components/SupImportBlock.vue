<template>
  <div class="imp" :class="{ open: menuOpen }">
    <input
      ref="inputEl"
      type="file"
      accept=".xlsx,.xls"
      class="imp-file"
      tabindex="-1"
      aria-hidden="true"
      @change="onFile"
    />
    <button
      type="button"
      class="imp-trigger"
      :disabled="busy"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      :title="`Importar o bajar plantilla de ${kindLabel}`"
      @click="menuOpen = !menuOpen"
    >
      <i class="fas fa-file-excel" aria-hidden="true"></i>
      <span>{{ busy ? 'Importando…' : triggerLabel }}</span>
      <i class="fas fa-chevron-down imp-caret" aria-hidden="true"></i>
    </button>
    <div v-if="menuOpen" class="imp-menu" role="menu">
      <button type="button" role="menuitem" class="imp-item" :disabled="busy" @click="pick">
        <i class="fas fa-file-import" aria-hidden="true"></i>
        {{ importLabel }}
      </button>
      <button type="button" role="menuitem" class="imp-item" @click="downloadTpl">
        <i class="fas fa-download" aria-hidden="true"></i>
        {{ templateLabel }}
      </button>
    </div>
    <p v-if="msg" class="imp-msg ok" role="status">{{ msg }}</p>
    <p v-if="err" class="imp-msg err" role="alert">{{ err }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '../services/api'

const KIND_LABELS = {
  cadenas: 'cadenas',
  subcadenas: 'subcadenas',
  clientes: 'clientes',
  salas: 'salas',
  asignaciones: 'coberturas',
}

const TRIGGER_LABELS = {
  asignaciones: 'Importar coberturas',
}

const props = defineProps({
  kind: { type: String, required: true },
})
const emit = defineEmits(['done'])

const inputEl = ref(null)
const menuOpen = ref(false)
const busy = ref(false)
const msg = ref('')
const err = ref('')

const kindLabel = computed(() => KIND_LABELS[props.kind] || props.kind)
const triggerLabel = computed(() => TRIGGER_LABELS[props.kind] || 'Excel')
const importLabel = computed(() =>
  busy.value ? 'Importando…' : `Importar ${kindLabel.value}…`,
)
const templateLabel = computed(() => `Plantilla de ${kindLabel.value}`)

function onDocClick(e) {
  if (!menuOpen.value) return
  const root = e.target?.closest?.('.imp')
  if (!root) menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

async function importFile(file) {
  if (!file || busy.value) return
  busy.value = true
  msg.value = ''
  err.value = ''
  menuOpen.value = false
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post(`/admin/supervision/import/${props.kind}`, fd)
    msg.value = `Listo · ${data.created || 0} nuevos · ${data.skipped || 0} omitidos`
    emit('done')
  } catch (e) {
    err.value = e?.response?.data?.error || 'Error al importar'
  } finally {
    busy.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}

function onFile(e) {
  const f = e.target.files?.[0]
  if (f) importFile(f)
}

function pick() {
  err.value = ''
  msg.value = ''
  menuOpen.value = false
  inputEl.value?.click()
}

async function downloadTpl() {
  err.value = ''
  menuOpen.value = false
  try {
    const { data } = await api.get(`/admin/supervision/import/plantilla/${props.kind}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla-${props.kind}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    err.value = e?.response?.data?.error || 'No se pudo bajar la plantilla'
  }
}
</script>

<style scoped>
.imp {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}
.imp-file {
  display: none !important;
}
.imp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.2rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--line-2, var(--line));
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.imp-trigger:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand-ink, var(--brand));
  background: var(--brand-soft);
}
.imp-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.imp-caret {
  font-size: 0.65rem;
  opacity: 0.7;
}
.imp-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 40;
  min-width: 13.5rem;
  padding: 0.3rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  display: grid;
  gap: 0.15rem;
}
.imp-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
}
.imp-item:hover:not(:disabled) {
  background: var(--brand-soft);
  color: var(--brand-ink, var(--brand));
}
.imp-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.imp-msg {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  max-width: 14rem;
}
.imp-msg.ok {
  color: #34d399;
}
.imp-msg.err {
  color: #f87171;
}
</style>
