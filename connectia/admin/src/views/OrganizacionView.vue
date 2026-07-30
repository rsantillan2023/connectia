<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Organización</h1>
        <p class="text-sm text-slate-500 mt-1">Áreas, líneas de reporte, grupos y campos de perfil.</p>
        <ScreenHelp
          purpose="Definí la estructura interna del tenant: áreas, quién reporta a quién, grupos y campos dinámicos."
          can-do="Crear/editar áreas y grupos; ver organigrama de personas; el reporta-a se edita en Usuarios."
        />
      </div>
    </div>

    <div class="mt-4 flex gap-2 flex-wrap items-center">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="tab === 'areas' ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="tab = 'areas'"
      >
        Áreas
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="tab === 'people' ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="switchToPeople"
      >
        Personas
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="tab === 'groups' ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="switchToGroups"
      >
        Grupos
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="tab === 'fields' ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="switchToFields"
      >
        Campos de perfil
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm border"
        :class="tab === 'clientes' ? 'bg-teal-700 text-white border-teal-700' : 'bg-white'"
        @click="switchToClientes"
      >
        Clientes
      </button>

      <div v-if="tab === 'areas'" class="flex rounded-lg border overflow-hidden text-sm ml-1">
        <button
          type="button"
          class="px-3 py-1.5"
          :class="viewMode === 'grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'"
          @click="viewMode = 'grid'"
        >
          Grilla
        </button>
        <button
          type="button"
          class="px-3 py-1.5 border-l"
          :class="viewMode === 'chart' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'"
          @click="viewMode = 'chart'"
        >
          Organigrama
        </button>
      </div>

      <select
        v-if="tab === 'areas' && viewMode === 'grid'"
        v-model="areaKindFilter"
        class="rounded-lg border px-2 py-1.5 text-sm"
      >
        <option value="">Todas las áreas</option>
        <option value="organizativa">Organizativas</option>
        <option value="interna">Área interna</option>
      </select>

      <button
        v-if="tab === 'clientes'"
        class="ml-auto rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
        @click="openNewClient"
      >
        + Cliente
      </button>
      <button
        v-else-if="tab !== 'people'"
        class="ml-auto rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
        @click="openNew"
      >
        + {{ tab === 'areas' ? 'Área' : tab === 'groups' ? 'Grupo' : 'Campo' }}
      </button>
      <router-link
        v-else
        class="ml-auto rounded-lg border px-4 py-2 text-sm font-medium text-teal-800"
        to="/usuarios"
      >
        Editar reporta-a en Usuarios
      </router-link>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <div v-if="tab === 'people'" class="mt-4">
      <input
        v-model="peopleQ"
        type="search"
        class="w-full max-w-md border rounded-lg px-3 py-2 text-sm mb-3"
        placeholder="Buscar persona…"
        @input="loadPeopleChart"
      />
      <p v-if="!peopleTree.length" class="text-sm text-slate-500 bg-white border rounded-xl p-4">
        Todavía no hay líneas de reporte. Asigná “Reporta a” en Usuarios.
      </p>
      <ul v-else class="space-y-2 bg-white border rounded-xl p-4">
        <OrgPeopleAdminNode v-for="n in peopleTree" :key="n.id" :node="n" />
      </ul>
    </div>

    <OrgAreaChart
      v-else-if="tab === 'areas' && viewMode === 'chart'"
      :items="filteredItems"
      @edit="edit"
      @deactivate="deactivate"
    />

    <div v-else-if="tab === 'clientes'" class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Nombre</th>
            <th class="p-3">Emails</th>
            <th class="p-3">Usuarios</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clients" :key="c.id" class="border-t">
            <td class="p-3 font-medium">{{ c.nombre }}</td>
            <td class="p-3 text-slate-500">{{ c.emails.length ? c.emails.join(', ') : '—' }}</td>
            <td class="p-3 text-slate-500">{{ c.userIds.length }} usuario(s)</td>
            <td class="p-3">
              <span :class="c.activo ? 'text-teal-700' : 'text-slate-400'">
                {{ c.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="p-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-teal-700" @click="editClient(c)">Editar</button>
              <button v-if="c.activo" class="text-amber-700" @click="deactivateClient(c)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!clients.length && !error" class="p-4 text-sm text-slate-500">
        No hay clientes de audiencia aún.
      </p>
    </div>

    <div v-else class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Nombre</th>
            <th class="p-3">Key</th>
            <th v-if="tab === 'areas'" class="p-3">Padre</th>
            <th v-if="tab === 'areas'" class="p-3">Tipo</th>
            <th v-if="tab === 'fields'" class="p-3">Tipo</th>
            <th class="p-3">Descripción</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id" class="border-t">
            <td class="p-3 font-medium">{{ item.nombre }}</td>
            <td class="p-3 font-mono text-xs">{{ item.key }}</td>
            <td v-if="tab === 'areas'" class="p-3 text-slate-500">{{ parentLabel(item) }}</td>
            <td v-if="tab === 'areas'" class="p-3">
              <span
                class="text-xs rounded-full px-2 py-0.5"
                :class="item.kind === 'interna' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'"
              >
                {{ item.kind === 'interna' ? 'Área interna' : 'Organizativa' }}
              </span>
            </td>
            <td v-if="tab === 'fields'" class="p-3 text-slate-500">{{ item.tipo }}{{ item.obligatorio ? ' · req' : '' }}</td>
            <td class="p-3 text-slate-500">{{ item.descripcion || '—' }}</td>
            <td class="p-3">
              <span :class="item.activo ? 'text-teal-700' : 'text-slate-400'">
                {{ item.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="p-3 text-right space-x-2 whitespace-nowrap">
              <button class="text-teal-700" @click="edit(item)">Editar</button>
              <button v-if="item.activo" class="text-amber-700" @click="deactivate(item)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filteredItems.length && !error" class="p-4 text-sm text-slate-500">
        No hay {{ tab === 'areas' ? 'áreas' : tab === 'groups' ? 'grupos' : 'campos' }} aún.
      </p>
    </div>

    <div v-if="draft" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" @click.self="draft = null">
      <form class="bg-white rounded-xl p-6 w-full max-w-md space-y-3" @submit.prevent="save">
        <h2 class="font-semibold text-lg">
          {{ draft.id ? 'Editar' : 'Nuevo' }}
          {{ tab === 'areas' ? 'área' : tab === 'groups' ? 'grupo' : 'campo' }}
        </h2>
        <input v-model="draft.nombre" class="w-full border rounded-lg px-3 py-2" placeholder="Nombre" required />
        <input
          v-model="draft.key"
          :disabled="Boolean(draft.id)"
          class="w-full border rounded-lg px-3 py-2 disabled:bg-slate-50 font-mono text-sm"
          placeholder="key (opcional, se genera del nombre)"
        />
        <textarea v-model="draft.descripcion" rows="2" class="w-full border rounded-lg px-3 py-2" placeholder="Descripción" />
        <div v-if="tab === 'areas'" class="space-y-1">
          <label class="block text-sm text-slate-600">Área padre (opcional)</label>
          <select v-model="draft.parentId" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Sin padre — raíz</option>
            <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">{{ opt.nombre }}</option>
          </select>
          <p class="text-xs text-slate-400">No es obligatorio. Solo sirve para el organigrama.</p>
        </div>
        <div v-if="tab === 'areas'" class="space-y-1">
          <label class="block text-sm text-slate-600">Tipo de área</label>
          <select v-model="draft.kind" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="organizativa">Organizativa</option>
            <option value="interna">Área interna</option>
          </select>
          <p class="text-xs text-slate-400">Área interna: uso administrativo, no aparece como área de negocio.</p>
        </div>
        <div v-if="tab === 'fields'" class="space-y-2">
          <label class="block text-sm text-slate-600">Tipo</label>
          <select v-model="draft.tipo" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="text">Texto</option>
            <option value="date">Fecha</option>
            <option value="list">Lista</option>
            <option value="file">Archivo (URL)</option>
          </select>
          <input
            v-if="draft.tipo === 'list'"
            v-model="draft.opcionesText"
            class="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Opciones separadas por coma"
          />
          <label class="flex items-center gap-2 text-sm">
            <input v-model="draft.obligatorio" type="checkbox" /> Obligatorio
          </label>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="draft.activo" type="checkbox" /> Activo
        </label>
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex gap-2 justify-end pt-2">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="draft = null">Cancelar</button>
          <button class="px-4 py-2 bg-teal-700 text-white rounded-lg">Guardar</button>
        </div>
      </form>
    </div>

    <div
      v-if="clientDraft"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="clientDraft = null"
    >
      <form class="bg-white rounded-xl p-6 w-full max-w-md space-y-3" @submit.prevent="saveClient">
        <h2 class="font-semibold text-lg">{{ clientDraft.id ? 'Editar' : 'Nuevo' }} cliente</h2>
        <input v-model="clientDraft.nombre" class="w-full border rounded-lg px-3 py-2" placeholder="Nombre" required />
        <div class="space-y-1">
          <label class="block text-sm text-slate-600">Emails (separados por coma)</label>
          <textarea
            v-model="clientDraft.emailsText"
            rows="2"
            class="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="persona@cliente.com, otra@cliente.com"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm text-slate-600">Usuarios del tenant</label>
          <select v-model="clientDraft.userIds" multiple size="6" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.label }}</option>
          </select>
          <p class="text-xs text-slate-400">Ctrl/Cmd + clic para elegir varios.</p>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="clientDraft.activo" type="checkbox" /> Activo
        </label>
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex gap-2 justify-end pt-2">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="clientDraft = null">Cancelar</button>
          <button class="px-4 py-2 bg-teal-700 text-white rounded-lg">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import OrgAreaChart from '../components/OrgAreaChart.vue'
import OrgPeopleAdminNode from '../components/OrgPeopleAdminNode.vue'

const tab = ref('areas')
const viewMode = ref('grid')
const areaKindFilter = ref('')
const items = ref([])
const peopleTree = ref([])
const peopleQ = ref('')
const draft = ref(null)
const error = ref('')
const formError = ref('')
const okMsg = ref('')
const clients = ref([])
const clientDraft = ref(null)
const userOptions = ref([])
let peopleTimer = null

const nameById = computed(() => Object.fromEntries(items.value.map((i) => [String(i.id), i.nombre])))

const filteredItems = computed(() => {
  if (tab.value !== 'areas' || !areaKindFilter.value) return items.value
  return items.value.filter((i) => (i.kind || 'organizativa') === areaKindFilter.value)
})

function parentLabel(item) {
  if (!item.parentId) return '—'
  return nameById.value[String(item.parentId)] || '—'
}

/** Evita elegirse a sí misma o a un descendiente como padre. */
const parentOptions = computed(() => {
  if (tab.value !== 'areas' || !draft.value) return []
  const selfId = draft.value.id ? String(draft.value.id) : null
  if (!selfId) return items.value.filter((i) => i.activo !== false)

  const parentById = Object.fromEntries(
    items.value.map((i) => [String(i.id), i.parentId ? String(i.parentId) : null]),
  )
  const blocked = new Set([selfId])
  let changed = true
  while (changed) {
    changed = false
    for (const [id, pid] of Object.entries(parentById)) {
      if (pid && blocked.has(pid) && !blocked.has(id)) {
        blocked.add(id)
        changed = true
      }
    }
  }
  return items.value.filter((i) => !blocked.has(String(i.id)))
})

function switchToGroups() {
  tab.value = 'groups'
  viewMode.value = 'grid'
}

function switchToFields() {
  tab.value = 'fields'
  viewMode.value = 'grid'
}

function switchToPeople() {
  tab.value = 'people'
  loadPeopleChart()
}

function switchToClientes() {
  tab.value = 'clientes'
  loadClients()
}

function apiBase() {
  if (tab.value === 'areas') return '/admin/org/areas'
  if (tab.value === 'groups') return '/admin/org/groups'
  return '/admin/profile-fields'
}

async function loadUserOptions() {
  try {
    const { data } = await api.get('/admin/org/options')
    userOptions.value = (data.managers || []).map((u) => ({
      id: u.id,
      label: u.label || u.usuario || u.id,
    }))
  } catch {
    userOptions.value = []
  }
}

async function loadClients() {
  error.value = ''
  okMsg.value = ''
  try {
    if (!userOptions.value.length) await loadUserOptions()
    const { data } = await api.get('/admin/audience-clients', { params: { all: '1' } })
    clients.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar clientes'
    clients.value = []
  }
}

function openNewClient() {
  formError.value = ''
  clientDraft.value = { nombre: '', emailsText: '', userIds: [], activo: true }
}

function editClient(c) {
  formError.value = ''
  clientDraft.value = {
    ...c,
    emailsText: (c.emails || []).join(', '),
    userIds: [...(c.userIds || [])],
  }
}

async function saveClient() {
  formError.value = ''
  const payload = {
    nombre: clientDraft.value.nombre,
    emails: String(clientDraft.value.emailsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    userIds: clientDraft.value.userIds || [],
    activo: clientDraft.value.activo,
  }
  try {
    if (clientDraft.value.id) {
      await api.patch(`/admin/audience-clients/${clientDraft.value.id}`, payload)
    } else {
      await api.post('/admin/audience-clients', payload)
    }
    clientDraft.value = null
    okMsg.value = 'Guardado'
    await loadClients()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function deactivateClient(c) {
  if (!confirm(`¿Desactivar cliente «${c.nombre}»?`)) return
  try {
    await api.delete(`/admin/audience-clients/${c.id}`)
    okMsg.value = 'Desactivado'
    await loadClients()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo desactivar'
  }
}

async function loadPeopleChart() {
  clearTimeout(peopleTimer)
  peopleTimer = setTimeout(async () => {
    error.value = ''
    try {
      const params = {}
      if (peopleQ.value.trim()) params.q = peopleQ.value.trim()
      const { data } = await api.get('/admin/org/chart', { params })
      peopleTree.value = data.people?.tree || []
    } catch (e) {
      error.value = e.response?.data?.error || 'No se pudo cargar organigrama de personas'
      peopleTree.value = []
    }
  }, 200)
}

async function load() {
  if (tab.value === 'people') {
    await loadPeopleChart()
    return
  }
  if (tab.value === 'clientes') {
    await loadClients()
    return
  }
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.get(apiBase(), { params: { all: '1' } })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
    items.value = []
  }
}

function openNew() {
  formError.value = ''
  draft.value = {
    nombre: '',
    key: '',
    descripcion: '',
    parentId: '',
    kind: 'organizativa',
    tipo: 'text',
    opcionesText: '',
    obligatorio: false,
    activo: true,
  }
}

function edit(item) {
  formError.value = ''
  draft.value = {
    ...item,
    parentId: item.parentId ? String(item.parentId) : '',
    kind: item.kind === 'interna' ? 'interna' : 'organizativa',
    tipo: item.tipo || 'text',
    opcionesText: Array.isArray(item.opciones) ? item.opciones.join(', ') : '',
    obligatorio: Boolean(item.obligatorio),
  }
}

async function save() {
  formError.value = ''
  const base = apiBase()
  const payload = {
    nombre: draft.value.nombre,
    descripcion: draft.value.descripcion,
    activo: draft.value.activo,
  }
  if (!draft.value.id && draft.value.key) payload.key = draft.value.key
  if (tab.value === 'areas') {
    payload.parentId = draft.value.parentId || null
    payload.kind = draft.value.kind === 'interna' ? 'interna' : 'organizativa'
  }
  if (tab.value === 'fields') {
    payload.tipo = draft.value.tipo || 'text'
    payload.obligatorio = Boolean(draft.value.obligatorio)
    payload.opciones = String(draft.value.opcionesText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  try {
    if (draft.value.id) await api.patch(`${base}/${draft.value.id}`, payload)
    else await api.post(base, payload)
    draft.value = null
    okMsg.value = 'Guardado'
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function deactivate(item) {
  if (!confirm(`¿Desactivar «${item.nombre}»?`)) return
  const base = apiBase()
  try {
    await api.delete(`${base}/${item.id}`)
    okMsg.value = 'Desactivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo desactivar'
  }
}

watch(tab, load)
onMounted(load)
</script>
