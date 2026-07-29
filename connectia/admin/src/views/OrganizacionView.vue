<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Organización</h1>
        <p class="text-sm text-slate-500 mt-1">Áreas, grupos y campos adicionales de perfil.</p>
        <ScreenHelp
          purpose="Definí la estructura interna del tenant: áreas, grupos y campos dinámicos de perfil."
          can-do="Crear, editar y desactivar áreas, grupos y campos de perfil. El padre de área es opcional (organigrama)."
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

      <button class="ml-auto rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
        + {{ tab === 'areas' ? 'Área' : tab === 'groups' ? 'Grupo' : 'Campo' }}
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <OrgAreaChart
      v-if="tab === 'areas' && viewMode === 'chart'"
      :items="items"
      @edit="edit"
      @deactivate="deactivate"
    />

    <div v-else class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Nombre</th>
            <th class="p-3">Key</th>
            <th v-if="tab === 'areas'" class="p-3">Padre</th>
            <th v-if="tab === 'fields'" class="p-3">Tipo</th>
            <th class="p-3">Descripción</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-t">
            <td class="p-3 font-medium">{{ item.nombre }}</td>
            <td class="p-3 font-mono text-xs">{{ item.key }}</td>
            <td v-if="tab === 'areas'" class="p-3 text-slate-500">{{ parentLabel(item) }}</td>
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
      <p v-if="!items.length && !error" class="p-4 text-sm text-slate-500">
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import OrgAreaChart from '../components/OrgAreaChart.vue'

const tab = ref('areas')
const viewMode = ref('grid')
const items = ref([])
const draft = ref(null)
const error = ref('')
const formError = ref('')
const okMsg = ref('')

const nameById = computed(() => Object.fromEntries(items.value.map((i) => [String(i.id), i.nombre])))

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

function apiBase() {
  if (tab.value === 'areas') return '/admin/org/areas'
  if (tab.value === 'groups') return '/admin/org/groups'
  return '/admin/profile-fields'
}

async function load() {
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
