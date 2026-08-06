<template>
  <div>
    <AdminPageHeader
      title="Bandeja de solicitudes"
      subtitle="CRM interno · campos dinámicos y estados del tenant (§9.04)."
    >
      <template #actions>
        <RouterLink to="/enviar-solicitud" class="btn-primary">Pedir datos a un grupo</RouterLink>
        <button class="btn-ghost" @click="exportCsv">Exportar</button>
      </template>
    </AdminPageHeader>
    <ScreenHelp
      purpose="Gestioná los trámites creados desde la app: estados habilitados, hilo, notas internas y datos del formulario."
      can-do="Filtrar por estados activos, responder con adjunto URL, cambiar estado según transiciones y exportar."
    />

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <input
        v-model="q"
        class="border rounded-lg px-3 py-2 text-sm min-w-[180px]"
        placeholder="Buscar…"
        @keyup.enter="load"
      />
      <button
        v-for="f in estadoFilters"
        :key="f.value"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="estado === f.value ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="estado = f.value; load()"
      >
        {{ f.label }}
      </button>
      <span v-if="campaignId" class="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1">
        Campaña {{ campaignId }}
        <button type="button" class="ml-1 underline" @click="campaignId = ''; load()">limpiar</button>
      </span>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Código</th>
            <th class="p-3">Título</th>
            <th class="p-3">Tipo / Área</th>
            <th class="p-3">Solicitante</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t">
            <td class="p-3 font-mono text-xs">{{ r.codigo }}</td>
            <td class="p-3">
              {{ r.titulo }}
              <span v-if="r.origen === 'admin'" class="ml-1 text-[10px] uppercase text-teal-700">dirigida</span>
              <span v-if="r.needsCompletion" class="ml-1 text-[10px] uppercase text-amber-700">pendiente</span>
            </td>
            <td class="p-3 text-xs">{{ r.tipoNombre }} · {{ r.area }}</td>
            <td class="p-3">{{ r.requesterName }}</td>
            <td class="p-3">{{ r.estadoLabel || estadoLabel(r.estado) }}</td>
            <td class="p-3 text-right">
              <button class="text-teal-700" @click="open(r)">Gestionar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length && !error" class="p-4 text-sm text-slate-500">Sin solicitudes en este filtro.</p>
    </div>

    <div v-if="selected" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" @click.self="selected = null">
      <div class="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3">
        <div class="flex justify-between gap-2">
          <div>
            <p class="font-mono text-xs text-teal-800">{{ selected.codigo }}</p>
            <h2 class="font-semibold text-lg">{{ selected.titulo }}</h2>
          </div>
          <button class="text-slate-400" @click="selected = null">✕</button>
        </div>

        <div v-if="selected.mediaUrl" class="rounded-xl overflow-hidden border bg-slate-900 aspect-video">
          <PostMedia :url="selected.mediaUrl" :alt="selected.titulo" :autoplay-on-visible="false" />
        </div>
        <p v-if="selected.cuerpo" class="text-sm text-slate-600 whitespace-pre-wrap">{{ selected.cuerpo }}</p>

        <div v-if="selected.camposValores?.length" class="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
          <p class="text-xs font-semibold text-slate-500 uppercase">Datos del formulario</p>
          <p v-for="c in selected.camposValores" :key="c.key">
            <span class="text-slate-500">{{ c.label }}:</span>
            {{ formatCampo(c) }}
          </p>
        </div>

        <p v-if="selected.origen === 'admin'" class="text-xs text-slate-500">
          Envío dirigido
          <span v-if="selected.campaignId"> · campaña {{ selected.campaignId }}</span>
          <span v-if="selected.audience"> · audiencia {{ audienceLabel(selected.audience) }}</span>
          <span v-if="!selected.completada && selected.needsCompletion"> · pendiente de completar</span>
        </p>

        <div class="flex flex-wrap gap-2 items-center">
          <label class="text-xs text-slate-500">Estado</label>
          <select v-model="nextEstado" class="border rounded-lg px-2 py-1 text-sm" @change="changeEstado">
            <option :value="selected.estado">{{ selected.estadoLabel || estadoLabel(selected.estado) }} (actual)</option>
            <option v-for="s in transitions" :key="s" :value="s">{{ estadoLabel(s) }}</option>
          </select>
          <input v-model="selected.area" class="border rounded-lg px-2 py-1 text-sm" @change="changeArea" />
        </div>

        <div class="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-slate-50">
          <div v-for="m in selected.messages" :key="m.id" class="text-sm">
            <p class="text-[11px] text-slate-400">
              {{ m.authorName }}{{ m.interno ? ' · interna' : m.isAdmin ? ' · admin' : '' }} ·
              {{ formatDate(m.createdAt) }}
            </p>
            <p class="whitespace-pre-wrap" :class="m.interno ? 'text-amber-800' : ''">{{ m.texto }}</p>
            <div v-if="m.adjuntos?.length" class="mt-1 space-y-0.5">
              <a
                v-for="(a, i) in m.adjuntos"
                :key="i"
                :href="a.url"
                target="_blank"
                rel="noopener"
                class="block text-xs text-teal-700 underline"
              >{{ a.nombre || a.url }}</a>
            </div>
          </div>
        </div>

        <textarea v-model="reply" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Respuesta…" />
        <input v-model="adjuntoUrl" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="URL adjunto (opcional, http/https)" />
        <label class="flex items-center gap-2 text-sm">
          <input v-model="interno" type="checkbox" /> Nota interna (no visible al usuario)
        </label>
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <button class="w-full rounded-lg bg-teal-700 text-white py-2 text-sm" @click="sendReply">Enviar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'
import PostMedia from '../components/PostMedia.vue'

const route = useRoute()
const items = ref([])
const q = ref('')
const estado = ref('')
const campaignId = ref('')
const error = ref('')
const selected = ref(null)
const transitions = ref([])
const nextEstado = ref('')
const reply = ref('')
const adjuntoUrl = ref('')
const interno = ref(false)
const formError = ref('')
const estadosActivos = ref([])
const labelMap = ref({})

const estadoFilters = computed(() => [
  { value: '', label: 'Todas' },
  ...estadosActivos.value.map((e) => ({ value: e.key, label: e.label })),
])

function estadoLabel(s) {
  return labelMap.value[s] || s
}

function audienceLabel(a) {
  if (!a || a.mode !== 'restricted') return 'toda la comunidad'
  const n = (a.areaIds?.length || 0) + (a.groupIds?.length || 0)
  return n ? `restringida (${n})` : 'restringida'
}

function formatCampo(c) {
  if (c.tipo === 'check') return c.value ? 'Sí' : 'No'
  return c.value === '' || c.value == null ? '—' : String(c.value)
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

async function loadConfig() {
  const { data } = await api.get('/requests/meta/config')
  estadosActivos.value = data.config?.estados || []
  const map = {}
  for (const e of data.fullConfig?.estados || data.config?.estados || []) map[e.key] = e.label
  labelMap.value = map
}

async function load() {
  error.value = ''
  try {
    const params = { scope: 'admin' }
    if (estado.value) params.estado = estado.value
    if (campaignId.value) params.campaignId = campaignId.value
    if (q.value.trim().length >= 2) params.q = q.value.trim()
    const { data } = await api.get('/requests', { params })
    items.value = data.items || []
    if (data.estados?.length) estadosActivos.value = data.estados
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la bandeja'
  }
}

async function open(r) {
  formError.value = ''
  reply.value = ''
  adjuntoUrl.value = ''
  interno.value = false
  const { data } = await api.get(`/requests/${r.id}`)
  selected.value = data.request
  transitions.value = data.transitions || []
  nextEstado.value = data.request.estado
}

async function changeEstado() {
  if (!nextEstado.value || nextEstado.value === selected.value.estado) return
  formError.value = ''
  try {
    const { data } = await api.patch(`/requests/${selected.value.id}`, { estado: nextEstado.value })
    selected.value = data.request
    transitions.value = data.transitions || []
    nextEstado.value = data.request.estado
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'Transición inválida'
    await open(selected.value)
  }
}

async function changeArea() {
  try {
    const { data } = await api.patch(`/requests/${selected.value.id}`, { area: selected.value.area })
    selected.value = data.request
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo cambiar área'
  }
}

async function sendReply() {
  formError.value = ''
  if (!reply.value.trim() && !adjuntoUrl.value.trim()) return
  try {
    const payload = { texto: reply.value || '(adjunto)', interno: interno.value }
    if (adjuntoUrl.value.trim()) {
      payload.adjuntos = [{ url: adjuntoUrl.value.trim() }]
    }
    const { data } = await api.post(`/requests/${selected.value.id}/messages`, payload)
    selected.value = data.request
    transitions.value = data.transitions || []
    nextEstado.value = data.request.estado
    reply.value = ''
    adjuntoUrl.value = ''
    interno.value = false
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo enviar'
  }
}

async function exportCsv() {
  try {
    const { data } = await api.get('/requests/export/csv')
    const headers = data.fields || []
    const lines = [headers.join(';')]
    for (const row of data.rows || []) {
      lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(';'))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solicitudes-${data.tenant || 'tenant'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

onMounted(async () => {
  campaignId.value = String(route.query.campaignId || '')
  await loadConfig().catch(() => {})
  await load()
})

watch(
  () => route.query.campaignId,
  (v) => {
    campaignId.value = String(v || '')
    load()
  },
)
</script>
