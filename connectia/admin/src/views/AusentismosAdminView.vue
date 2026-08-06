<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Ausentismos</h1>
        <p class="text-sm text-slate-500 mt-1">Bandeja de ausencias · sync ECR (12.04)</p>
        <p v-if="ecr" class="text-xs mt-1" :class="ecrTone">
          {{ ecrLabel }} — {{ ecr.note }}
        </p>
      </div>
      <button class="rounded-lg border px-4 py-2 text-sm bg-white" type="button" @click="exportCsv">
        Exportar CSV
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm"
        placeholder="Buscar…"
        @keyup.enter="load"
      />
      <select v-model="estado" class="border rounded-lg px-3 py-2 text-sm" @change="load">
        <option value="">Todos</option>
        <option value="pendiente">Pendiente</option>
        <option value="aprobada">Aprobada</option>
        <option value="rechazada">Rechazada</option>
        <option value="cancelada">Cancelada</option>
      </select>
      <button class="rounded-lg px-3 py-1.5 text-sm border bg-white" @click="load">Buscar</button>
    </div>

    <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-3 py-2">Código</th>
            <th class="px-3 py-2">Tipo</th>
            <th class="px-3 py-2">Solicitante</th>
            <th class="px-3 py-2">Período</th>
            <th class="px-3 py-2">Estado</th>
            <th class="px-3 py-2">ECR</th>
            <th class="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t">
            <td class="px-3 py-2 font-mono text-xs">{{ r.codigo }}</td>
            <td class="px-3 py-2">{{ r.tipoNombre }}</td>
            <td class="px-3 py-2">{{ r.requesterName }}</td>
            <td class="px-3 py-2">{{ r.desde }} → {{ r.hasta }}</td>
            <td class="px-3 py-2">{{ r.estadoLabel }}</td>
            <td class="px-3 py-2">
              <span class="text-xs" :title="r.ecrSync?.note || ''">{{ ecrStatusLabel(r) }}</span>
            </td>
            <td class="px-3 py-2 space-x-2">
              <button
                v-if="r.estado === 'pendiente'"
                class="text-teal-700 font-medium"
                @click="decide(r, 'aprobar')"
              >
                Aprobar
              </button>
              <button
                v-if="r.estado === 'pendiente'"
                class="text-red-700 font-medium"
                @click="decide(r, 'rechazar')"
              >
                Rechazar
              </button>
              <button
                v-if="canRetry(r)"
                class="text-slate-600 font-medium"
                type="button"
                @click="retryEcr(r)"
              >
                Reintentar ECR
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const ecr = ref(null)
const q = ref('')
const estado = ref('')
const error = ref('')

const ecrLabel = computed(() => {
  if (!ecr.value) return ''
  if (ecr.value.mode === 'live') return 'ECR live'
  if (ecr.value.mode === 'mock') return 'ECR mock'
  return 'Solo local'
})

const ecrTone = computed(() => {
  if (!ecr.value) return 'text-slate-500'
  if (ecr.value.mode === 'live') return 'text-teal-700'
  if (ecr.value.mode === 'mock') return 'text-amber-700'
  return 'text-slate-500'
})

function ecrStatusLabel(r) {
  const s = r.ecrSync?.status || 'none'
  const map = {
    none: '—',
    synced: 'OK',
    pending: 'Pendiente',
    error: 'Error',
    deferred: 'Diferido',
  }
  return map[s] || s
}

function canRetry(r) {
  const s = r.ecrSync?.status
  return s === 'error' || s === 'pending' || s === 'deferred'
}

async function load() {
  error.value = ''
  try {
    const params = {}
    if (q.value) params.q = q.value
    if (estado.value) params.estado = estado.value
    const [listRes, ecrRes] = await Promise.all([
      api.get('/admin/ausentismos', { params }),
      api.get('/admin/ausentismos/ecr-status'),
    ])
    items.value = listRes.data.items || []
    ecr.value = ecrRes.data
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

async function exportCsv() {
  try {
    const { data } = await api.get('/admin/ausentismos/reporte.csv', { responseType: 'text' })
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ausentismos.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo exportar'
  }
}

async function decide(r, decision) {
  try {
    await api.post(`/admin/ausentismos/${r.id}/decide`, { decision, comentario: '' })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

async function retryEcr(r) {
  try {
    await api.post(`/admin/ausentismos/${r.id}/ecr-retry`, {})
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al reintentar ECR'
  }
}

onMounted(load)
</script>
