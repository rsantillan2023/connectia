<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Feriados de la comunidad</h1>
        <p class="text-sm text-slate-500 mt-1">
          Se suman a los feriados nacionales del pack
          <span v-if="pais" class="font-medium text-slate-700">({{ pais }})</span>
          y afectan el conteo de días hábiles.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <select v-model.number="anio" class="border rounded-lg px-3 py-2 text-sm" @change="load">
          <option v-for="y in anios" :key="y" :value="y">{{ y }}</option>
        </select>
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm bg-white"
          :disabled="seeding"
          @click="seedNacionales"
        >
          Cargar nacionales
        </button>
        <button
          type="button"
          class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>
    <p v-if="okMsg" class="text-teal-700 text-sm mt-3">{{ okMsg }}</p>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4">
        <h2 class="font-semibold text-sm mb-3">Feriados configurados</h2>
        <form class="flex flex-wrap gap-2 mb-3" @submit.prevent="addRow">
          <input v-model="draft.fecha" type="date" class="border rounded-lg px-2 py-1.5 text-sm" required />
          <input
            v-model="draft.nombre"
            class="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]"
            placeholder="Nombre"
            required
          />
          <label class="flex items-center gap-1 text-xs text-slate-600">
            <input v-model="draft.recurrente" type="checkbox" /> Recurrente
          </label>
          <button type="submit" class="rounded-lg border px-3 py-1.5 text-sm">Agregar</button>
        </form>
        <ul class="divide-y text-sm">
          <li v-for="(f, i) in feriados" :key="f.fecha + f.nombre + i" class="py-2 flex gap-2 items-center">
            <span class="font-mono text-xs w-24">{{ f.fecha }}</span>
            <span class="flex-1">{{ f.nombre }}</span>
            <span v-if="f.recurrente" class="text-xs text-teal-700">cada año</span>
            <button type="button" class="text-red-600 text-xs" @click="feriados.splice(i, 1)">Quitar</button>
          </li>
          <li v-if="!feriados.length" class="py-3 text-slate-400 text-sm">Sin feriados propios aún.</li>
        </ul>
      </div>

      <div class="rounded-xl border bg-white p-4">
        <h2 class="font-semibold text-sm mb-2">Efectivos {{ anio }}</h2>
        <p class="text-xs text-slate-500 mb-3">Nacionales del pack + comunidad (usados en días hábiles).</p>
        <ul class="text-xs font-mono grid grid-cols-2 gap-1 max-h-80 overflow-auto">
          <li v-for="d in efectivos" :key="d" class="text-slate-700">{{ d }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const yNow = new Date().getFullYear()
const anios = [yNow - 1, yNow, yNow + 1]
const anio = ref(yNow)
const feriados = ref([])
const efectivos = ref([])
const pais = ref('')
const error = ref('')
const okMsg = ref('')
const saving = ref(false)
const seeding = ref(false)
const draft = reactive({ fecha: '', nombre: '', recurrente: false })

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/licencias/feriados', { params: { anio: anio.value } })
    feriados.value = data.feriados || []
    efectivos.value = data.efectivos || []
    pais.value = data.pais || ''
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

function addRow() {
  if (!draft.fecha || !draft.nombre) return
  feriados.value = [
    ...feriados.value,
    { fecha: draft.fecha, nombre: draft.nombre, recurrente: draft.recurrente },
  ]
  draft.fecha = ''
  draft.nombre = ''
  draft.recurrente = false
}

async function save() {
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.put('/admin/licencias/feriados', {
      feriados: feriados.value,
      anio: anio.value,
    })
    feriados.value = data.feriados || []
    efectivos.value = data.efectivos || []
    okMsg.value = 'Calendario guardado para esta comunidad'
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    saving.value = false
  }
}

async function seedNacionales() {
  seeding.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/licencias/feriados/seed-nacionales', { anio: anio.value })
    feriados.value = data.feriados || []
    okMsg.value = `Se agregaron feriados nacionales (${data.added || 0}). Guardá si querés confirmar.`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    seeding.value = false
  }
}

onMounted(load)
</script>
