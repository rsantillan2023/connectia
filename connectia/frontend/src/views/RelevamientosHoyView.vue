<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import {
  flushRelevamientoQueue,
  pendingRelevamientoCount,
  startRelevamientoOfflineFlush,
} from '../composables/useRelevamientoOfflineQueue'

const router = useRouter()
const loading = ref(true)
const err = ref('')
const day = ref('')
const items = ref([])
const pending = ref(0)
const done = ref(0)
const offlinePending = ref(0)
const forms = ref([])
let stopFlush = null

async function load() {
  loading.value = true
  err.value = ''
  try {
    const { data } = await api.get('/relevamientos/hoy')
    day.value = data.day
    items.value = data.items || []
    pending.value = data.pending || 0
    done.value = data.done || 0
    offlinePending.value = pendingRelevamientoCount()
    const f = await api.get('/relevamientos/forms')
    forms.value = f.data.items || []
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function flush() {
  await flushRelevamientoQueue(api)
  offlinePending.value = pendingRelevamientoCount()
  await load()
}

async function startSpontaneous() {
  if (!forms.value.length) {
    err.value = 'No hay formularios publicados'
    return
  }
  const formId = forms.value[0].id
  const { data } = await api.post('/relevamientos/spontaneous', { formId })
  router.push(`/relevamientos/${data.id}`)
}

onMounted(() => {
  load()
  stopFlush = startRelevamientoOfflineFlush(api)
})
onUnmounted(() => {
  if (typeof stopFlush === 'function') stopFlush()
})
</script>

<template>
  <div class="page">
    <header>
      <h1>Mis relevamientos</h1>
      <p class="sub">Hoy · {{ day || '—' }}</p>
    </header>

    <p v-if="err" class="error">{{ err }}</p>
    <p v-if="loading" class="hint">Cargando…</p>

    <div class="summary">
      <span>{{ pending }} pendientes</span>
      <span>{{ done }} hechos</span>
      <button v-if="offlinePending" type="button" class="link" @click="flush">
        Sync offline ({{ offlinePending }})
      </button>
    </div>

    <ul class="list">
      <li
        v-for="it in items"
        :key="it.id"
        class="card"
        @click="router.push(`/relevamientos/${it.id}`)"
      >
        <div>
          <strong>{{ it.stopLabel || it.formTitle || 'Relevamiento' }}</strong>
          <p class="hint">{{ it.formTitle }} · {{ it.modality }} · {{ it.status }}</p>
        </div>
        <span class="chev">›</span>
      </li>
    </ul>

    <p v-if="!loading && !items.length" class="empty">No tenés relevamientos para hoy.</p>

    <button type="button" class="btn" @click="startSpontaneous">Relevamiento espontáneo</button>
  </div>
</template>

<style scoped>
.page { padding: 1rem 1rem 5rem; max-width: 560px; margin: 0 auto; }
h1 { margin: 0; font-size: 1.35rem; }
.sub { margin: 0.2rem 0 1rem; opacity: 0.7; }
.summary { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; margin-bottom: 0.85rem; opacity: 0.85; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.55rem; }
.card { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1rem; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 65%, transparent); background: color-mix(in srgb, var(--c-surface, #fff) 90%, transparent); cursor: pointer; }
.hint { margin: 0.2rem 0 0; font-size: 0.8rem; opacity: 0.7; }
.chev { font-size: 1.4rem; opacity: 0.45; }
.empty { opacity: 0.65; }
.error { color: #b91c1c; }
.btn { margin-top: 1rem; width: 100%; padding: 0.75rem; border-radius: 12px; border: none; background: var(--c-primary, #0d6e6e); color: #fff; font: inherit; cursor: pointer; }
.link { background: none; border: none; color: var(--c-primary, #0d6e6e); text-decoration: underline; cursor: pointer; font: inherit; padding: 0; }
</style>
