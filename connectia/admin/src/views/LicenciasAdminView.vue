<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Licencias y vacaciones</h1>
        <p class="text-sm text-slate-500 mt-1">Bandeja RRHH · aprobar / rechazar / editar · reporte CSV</p>
      </div>
      <button class="rounded-lg border px-4 py-2 text-sm bg-white" type="button" @click="exportCsv">
        Exportar CSV
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
        placeholder="Código o solicitante…"
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
    <p v-if="loading" class="text-slate-500 text-sm mt-3">Cargando…</p>

    <div class="mt-4 overflow-x-auto rounded-xl border bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-3 py-2">Código</th>
            <th class="px-3 py-2">Tipo</th>
            <th class="px-3 py-2">Solicitante</th>
            <th class="px-3 py-2">Período</th>
            <th class="px-3 py-2">Estado</th>
            <th class="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t">
            <td class="px-3 py-2 font-mono text-xs">{{ r.codigo }}</td>
            <td class="px-3 py-2">{{ r.tipoNombre }}</td>
            <td class="px-3 py-2">{{ r.requesterName }}</td>
            <td class="px-3 py-2">{{ r.desde }} → {{ r.hasta }} ({{ r.dias }}d)</td>
            <td class="px-3 py-2">{{ r.estadoLabel }}</td>
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
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !items.length" class="p-4 text-slate-500 text-sm">Sin resultados.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const q = ref('')
const estado = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (q.value) params.q = q.value
    if (estado.value) params.estado = estado.value
    const { data } = await api.get('/admin/licencias', { params })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  try {
    const params = {}
    if (estado.value) params.estado = estado.value
    const { data } = await api.get('/admin/licencias/reporte.csv', {
      params,
      responseType: 'text',
    })
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'licencias.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo exportar'
  }
}

async function decide(r, decision) {
  const comentario = decision === 'rechazar' ? prompt('Motivo del rechazo (opcional)') || '' : ''
  try {
    await api.post(`/admin/licencias/${r.id}/decide`, { decision, comentario })
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

onMounted(load)
</script>
