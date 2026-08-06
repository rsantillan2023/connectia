<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Categorías de publicaciones</h1>
        <p class="text-sm text-slate-500 mt-1">Clasificación del muro (§27.02).</p>
        <ScreenHelp
          purpose="Administrá categorías del feed. Las de sistema mapean al tipo legacy."
          can-do="Crear categorías custom, ordenar y desactivar (sin borrar las de sistema)."
        />
      </div>
      <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
        + Categoría
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
            <th class="p-3">Tipo legacy</th>
            <th class="p-3">Orden</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id" class="border-t">
            <td class="p-3 font-medium">
              <span
                v-if="c.color"
                class="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                :style="{ background: c.color }"
              />
              {{ c.nombre }}
              <span v-if="c.sistema" class="ml-1 text-xs text-slate-400">sistema</span>
            </td>
            <td class="p-3 text-slate-500">{{ c.key }}</td>
            <td class="p-3">{{ c.legacyTipo || '—' }}</td>
            <td class="p-3">{{ c.orden }}</td>
            <td class="p-3">{{ c.activo ? 'Activa' : 'Inactiva' }}</td>
            <td class="p-3 text-right">
              <button type="button" class="text-teal-700 mr-2" @click="edit(c)">Editar</button>
              <button
                v-if="!c.sistema"
                type="button"
                class="text-red-600"
                @click="deactivate(c)"
              >
                Desactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-md p-5 my-8 shadow-xl">
        <h2 class="text-lg font-semibold">{{ form.id ? 'Editar' : 'Nueva' }} categoría</h2>
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
            Tipo legacy
            <select v-model="form.legacyTipo" class="mt-1 w-full border rounded-lg px-3 py-2 bg-white">
              <option value="">(ninguno)</option>
              <option v-for="t in legacyTipos" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="block text-sm">
            Color
            <input v-model="form.color" class="mt-1 w-full border rounded-lg px-3 py-2" placeholder="var(--brand-primary)" />
          </label>
          <label class="block text-sm">
            Orden
            <input v-model.number="form.orden" type="number" class="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="modal = false">Cancelar</button>
          <button type="button" class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm" @click="save">
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

const legacyTipos = ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion']
const items = ref([])
const error = ref('')
const okMsg = ref('')
const modal = ref(false)
const form = reactive({
  id: null,
  key: '',
  nombre: '',
  legacyTipo: 'general',
  color: '',
  orden: 100,
  sistema: false,
})

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/post-categories', { params: { all: '1' } })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function openNew() {
  Object.assign(form, {
    id: null,
    key: '',
    nombre: '',
    legacyTipo: 'general',
    color: '',
    orden: 100,
    sistema: false,
  })
  modal.value = true
}

function edit(c) {
  Object.assign(form, {
    id: c.id,
    key: c.key,
    nombre: c.nombre,
    legacyTipo: c.legacyTipo || '',
    color: c.color || '',
    orden: c.orden ?? 100,
    sistema: c.sistema,
  })
  modal.value = true
}

async function save() {
  error.value = ''
  okMsg.value = ''
  try {
    const payload = {
      key: form.key,
      nombre: form.nombre,
      legacyTipo: form.legacyTipo,
      color: form.color,
      orden: form.orden,
    }
    if (form.id) await api.patch(`/admin/post-categories/${form.id}`, payload)
    else await api.post('/admin/post-categories', payload)
    modal.value = false
    okMsg.value = 'Categoría guardada'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function deactivate(c) {
  if (!confirm(`Desactivar “${c.nombre}”?`)) return
  try {
    await api.delete(`/admin/post-categories/${c.id}`)
    okMsg.value = 'Desactivada'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

onMounted(load)
</script>
