<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { enqueueRelevamientoSubmit } from '../composables/useRelevamientoOfflineQueue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const err = ref('')
const item = ref(null)
const answers = ref({})

const visibleQuestions = computed(() => {
  const qs = item.value?.questions || []
  const ans = answers.value
  const out = []
  for (const q of qs) {
    let show = true
    const rules = q.logic || []
    for (const rule of rules) {
      const raw = ans[rule.when?.questionId]
      const op = rule.when?.op || 'eq'
      let match = false
      if (op === 'truthy') match = raw !== undefined && raw !== null && raw !== '' && raw !== false
      else if (op === 'falsy') match = raw === undefined || raw === null || raw === '' || raw === false
      else if (op === 'neq') match = String(raw) !== String(rule.when?.value)
      else match = String(raw) === String(rule.when?.value)
      if (!match) continue
      if (rule.action === 'hide') show = false
      if (rule.action === 'show') show = true
    }
    if (show) out.push(q)
  }
  return out
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const { data } = await api.get(`/relevamientos/assignments/${route.params.id}`)
    item.value = data
    if (data.status === 'pending') {
      await api.post(`/relevamientos/assignments/${route.params.id}/start`)
      item.value.status = 'in_progress'
    }
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function captureGeo(q) {
  if (!navigator.geolocation) {
    err.value = 'Geolocalización no disponible'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      answers.value[q.id] = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        capturedAt: new Date().toISOString(),
        source: 'geolocation',
      }
    },
    () => {
      err.value = 'No se pudo obtener ubicación'
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

function onFile(q, ev) {
  const file = ev.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    answers.value[q.id] = {
      url: String(reader.result).slice(0, 500000),
      mime: file.type,
      name: file.name,
    }
  }
  reader.readAsDataURL(file)
}

async function submit() {
  saving.value = true
  err.value = ''
  const payload = {
    answers: { ...answers.value },
    clientMutationId: `rel-${item.value.id}-${Date.now()}`,
    offline: !navigator.onLine,
  }
  try {
    if (!navigator.onLine) {
      enqueueRelevamientoSubmit({
        assignmentId: item.value.id,
        answers: payload.answers,
        clientMutationId: payload.clientMutationId,
      })
      router.replace('/relevamientos')
      return
    }
    await api.post(`/relevamientos/assignments/${item.value.id}/submit`, payload)
    router.replace('/relevamientos')
  } catch (e) {
    if (!e.response) {
      enqueueRelevamientoSubmit({
        assignmentId: item.value.id,
        answers: payload.answers,
        clientMutationId: payload.clientMutationId,
      })
      router.replace('/relevamientos')
      return
    }
    err.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <button type="button" class="back" @click="router.back()">← Volver</button>
    <h1>{{ item?.stopLabel || item?.formTitle || 'Relevamiento' }}</h1>
    <p class="sub">{{ item?.formTitle }} · {{ item?.status }}</p>
    <p v-if="err" class="error">{{ err }}</p>
    <p v-if="loading">Cargando…</p>

    <form v-if="item && !loading" class="form" @submit.prevent="submit">
      <div v-for="q in visibleQuestions" :key="q.id" class="field">
        <label>{{ q.texto }} <em v-if="q.required">*</em></label>

        <template v-if="q.tipo === 'yesno'">
          <div class="row">
            <button type="button" :class="{ on: answers[q.id] === true }" @click="answers[q.id] = true">Sí</button>
            <button type="button" :class="{ on: answers[q.id] === false }" @click="answers[q.id] = false">No</button>
          </div>
        </template>
        <template v-else-if="q.tipo === 'textarea'">
          <textarea v-model="answers[q.id]" rows="3" />
        </template>
        <template v-else-if="q.tipo === 'single'">
          <select v-model="answers[q.id]">
            <option value="">—</option>
            <option v-for="o in q.opciones || []" :key="o" :value="o">{{ o }}</option>
          </select>
        </template>
        <template v-else-if="q.tipo === 'multimedia'">
          <input type="file" accept="image/*,video/*" @change="onFile(q, $event)" />
          <p v-if="answers[q.id]?.name" class="hint">{{ answers[q.id].name }}</p>
        </template>
        <template
          v-else-if="['geopoint', 'facility_checkin', 'facility_checkout'].includes(q.tipo)"
        >
          <button type="button" class="btn-ghost" @click="captureGeo(q)">Capturar GPS</button>
          <p v-if="answers[q.id]?.lat" class="hint">
            {{ answers[q.id].lat.toFixed?.(5) }}, {{ answers[q.id].lng.toFixed?.(5) }}
          </p>
        </template>
        <template v-else-if="q.tipo === 'number' || q.tipo === 'rating'">
          <input v-model.number="answers[q.id]" type="number" />
        </template>
        <template v-else>
          <input v-model="answers[q.id]" type="text" />
        </template>
      </div>

      <button type="submit" class="btn" :disabled="saving || ['submitted', 'synced'].includes(item.status)">
        {{ saving ? 'Enviando…' : 'Enviar relevamiento' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.page { padding: 1rem 1rem 5rem; max-width: 560px; margin: 0 auto; }
.back { background: none; border: none; color: var(--c-primary, #0d6e6e); cursor: pointer; font: inherit; padding: 0; margin-bottom: 0.5rem; }
h1 { margin: 0; font-size: 1.25rem; }
.sub { margin: 0.2rem 0 1rem; opacity: 0.7; font-size: 0.9rem; }
.form { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.4rem; }
.field label { font-size: 0.95rem; }
.row { display: flex; gap: 0.5rem; }
.row button { flex: 1; padding: 0.65rem; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 70%, transparent); background: transparent; cursor: pointer; font: inherit; }
.row button.on { background: var(--c-primary, #0d6e6e); color: #fff; border-color: transparent; }
input, select, textarea { font: inherit; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 70%, transparent); background: transparent; color: inherit; }
.btn { margin-top: 0.5rem; width: 100%; padding: 0.85rem; border-radius: 12px; border: none; background: var(--c-primary, #0d6e6e); color: #fff; font: inherit; cursor: pointer; }
.btn:disabled { opacity: 0.55; }
.btn-ghost { padding: 0.55rem 0.75rem; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 70%, transparent); background: transparent; font: inherit; cursor: pointer; }
.hint { margin: 0; font-size: 0.8rem; opacity: 0.7; }
.error { color: #b91c1c; }
</style>
