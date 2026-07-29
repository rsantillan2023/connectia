<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Roles y permisos</h1>
        <p class="text-sm text-slate-500 mt-1">Plantillas de capacidades de pantallas del admin.</p>
        <ScreenHelp
          purpose="Definí roles nombrados (RRHH, editor, etc.) con conjuntos de permisos."
          can-do="Crear/editar roles y asignarlos luego a usuarios. Un admin completo sigue teniendo todo."
        />
      </div>
      <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
        + Rol
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Nombre</th>
            <th class="p-3">Key</th>
            <th class="p-3">Permisos</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t">
            <td class="p-3 font-medium">
              {{ r.nombre }}
              <span v-if="r.sistema" class="ml-1 text-xs text-slate-400">sistema</span>
            </td>
            <td class="p-3 text-slate-500">{{ r.key }}</td>
            <td class="p-3 text-slate-600">{{ (r.capabilities || []).length }} pantallas</td>
            <td class="p-3">{{ r.activo ? 'Activo' : 'Inactivo' }}</td>
            <td class="p-3 text-right">
              <button type="button" class="text-teal-700 mr-2" @click="edit(r)">Editar</button>
              <button
                v-if="!r.sistema"
                type="button"
                class="text-red-600"
                @click="deactivate(r)"
              >
                Desactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-xl w-full max-w-lg p-5 my-8 shadow-xl">
        <h2 class="text-lg font-semibold">{{ form.id ? 'Editar rol' : 'Nuevo rol' }}</h2>
        <div class="mt-3 space-y-3">
          <label class="block text-sm">
            Nombre
            <input v-model="form.nombre" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label class="block text-sm">
            Key
            <input
              v-model="form.key"
              class="mt-1 w-full border rounded-lg px-3 py-2"
              :disabled="!!form.id && form.sistema"
            />
          </label>
          <label class="block text-sm">
            Descripción
            <textarea v-model="form.descripcion" class="mt-1 w-full border rounded-lg px-3 py-2" rows="2" />
          </label>
          <div>
            <p class="text-sm font-medium mb-2">Permisos de pantalla</p>
            <div class="max-h-56 overflow-y-auto border rounded-lg p-2 space-y-1">
              <label
                v-for="c in catalog"
                :key="c.id"
                class="flex items-start gap-2 text-sm py-1"
              >
                <input v-model="form.capabilities" type="checkbox" :value="c.id" class="mt-0.5" />
                <span>
                  <span class="font-medium">{{ c.label }}</span>
                  <span class="block text-xs text-slate-500">{{ c.description }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="modal = false">
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm"
            :disabled="saving"
            @click="save"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import { ADMIN_SCREEN_CAPABILITIES } from '../utils/adminCapabilities'

const items = ref([])
const error = ref('')
const okMsg = ref('')
const modal = ref(false)
const saving = ref(false)
const catalog = ADMIN_SCREEN_CAPABILITIES
const form = reactive({
  id: null,
  key: '',
  nombre: '',
  descripcion: '',
  capabilities: [],
  sistema: false,
})

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/roles', { params: { all: '1' } })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function openNew() {
  Object.assign(form, { id: null, key: '', nombre: '', descripcion: '', capabilities: [], sistema: false })
  modal.value = true
}

function edit(r) {
  Object.assign(form, {
    id: r.id,
    key: r.key,
    nombre: r.nombre,
    descripcion: r.descripcion || '',
    capabilities: [...(r.capabilities || [])],
    sistema: r.sistema,
  })
  modal.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const payload = {
      key: form.key,
      nombre: form.nombre,
      descripcion: form.descripcion,
      capabilities: form.capabilities,
    }
    if (form.id) await api.patch(`/admin/roles/${form.id}`, payload)
    else await api.post('/admin/roles', payload)
    modal.value = false
    okMsg.value = 'Rol guardado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function deactivate(r) {
  if (!confirm(`Desactivar rol “${r.nombre}”?`)) return
  try {
    await api.delete(`/admin/roles/${r.id}`)
    okMsg.value = 'Rol desactivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

onMounted(load)
</script>
