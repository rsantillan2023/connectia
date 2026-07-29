<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Estados de solicitud</h1>
        <p class="text-sm text-slate-500 mt-1">Qué estados puede usar esta comunidad (§9).</p>
        <ScreenHelp
          purpose="Activá solo los estados que tu operación necesita. Las transiciones y el estado inicial también se configuran acá."
          can-do="Activar/desactivar estados del catálogo, renombrar labels, definir estado inicial, calificables y terminales."
        />
      </div>
      <div class="flex gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="reset">Restablecer</button>
        <button type="button" class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="save">
          Guardar
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="ok" class="mt-3 text-sm text-teal-700">{{ ok }}</p>
    <p v-if="loading" class="mt-3 text-sm text-slate-500">Cargando…</p>

    <template v-else-if="cfg">
      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <section class="bg-white border rounded-xl p-4">
          <h2 class="font-semibold mb-3">Estados disponibles</h2>
          <div class="space-y-2">
            <label
              v-for="e in cfg.estados"
              :key="e.key"
              class="flex items-center gap-3 border rounded-lg px-3 py-2"
            >
              <input v-model="e.activo" type="checkbox" />
              <span class="font-mono text-xs text-slate-400 w-24">{{ e.key }}</span>
              <input v-model="e.label" class="flex-1 border rounded px-2 py-1 text-sm" />
              <input v-model.number="e.orden" type="number" class="w-16 border rounded px-2 py-1 text-sm" />
            </label>
          </div>
        </section>

        <section class="bg-white border rounded-xl p-4 space-y-4">
          <div>
            <label class="text-sm font-medium">Estado inicial al crear</label>
            <select v-model="cfg.estadoInicial" class="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option v-for="e in activos" :key="e.key" :value="e.key">{{ e.label }}</option>
            </select>
          </div>
          <div>
            <p class="text-sm font-medium mb-1">Calificables (el miembro puede puntuar)</p>
            <div class="flex flex-wrap gap-2">
              <label v-for="e in activos" :key="'c-' + e.key" class="flex items-center gap-1 text-sm border rounded px-2 py-1">
                <input v-model="cfg.estadosCalificables" type="checkbox" :value="e.key" />
                {{ e.label }}
              </label>
            </div>
          </div>
          <div>
            <p class="text-sm font-medium mb-1">Terminales (sin respuesta del miembro)</p>
            <div class="flex flex-wrap gap-2">
              <label v-for="e in cfg.estados" :key="'t-' + e.key" class="flex items-center gap-1 text-sm border rounded px-2 py-1">
                <input v-model="cfg.estadosTerminales" type="checkbox" :value="e.key" />
                {{ e.label }}
              </label>
            </div>
          </div>
          <p class="text-xs text-slate-500">
            El dueño de cada solicitud (usuario app) puede marcarla como resuelta, cerrarla sin calificar
            o reabrirla. El admin tiene la matriz completa de estados. Los desactivados no aparecen en
            filtros ni en la bandeja.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const cfg = ref(null)
const loading = ref(true)
const error = ref('')
const ok = ref('')

const activos = computed(() => (cfg.value?.estados || []).filter((e) => e.activo))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/requests/meta/config')
    cfg.value = JSON.parse(JSON.stringify(data.fullConfig || data.config))
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la config'
  } finally {
    loading.value = false
  }
}

async function save() {
  error.value = ''
  ok.value = ''
  try {
    const { data } = await api.put('/requests/meta/config', cfg.value)
    cfg.value = data.config
    ok.value = 'Configuración guardada'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function reset() {
  if (!confirm('¿Restablecer estados al default Connectia?')) return
  try {
    const { data } = await api.post('/requests/meta/config/reset')
    cfg.value = data.config
    ok.value = 'Restablecido'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo restablecer'
  }
}

onMounted(load)
</script>
