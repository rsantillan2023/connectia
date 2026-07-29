<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Tipos de licencia</h1>
        <p class="text-sm text-slate-500 mt-1">
          Catálogo de esta comunidad
          <span v-if="legislacion?.pais" class="font-medium text-slate-700">
            · {{ legislacion.pais === 'CL' ? 'Chile (CT)' : 'Argentina (LCT)' }}
          </span>
        </p>
        <p v-if="legislacion?.marco" class="text-xs text-slate-400 mt-0.5">{{ legislacion.marco }}</p>
        <p class="text-xs text-slate-500 mt-1">
          El país (AR/CL) se configura en
          <router-link class="text-teal-700 font-medium underline" to="/comunidad">Comunidad → Legislación</router-link>.
        </p>
      </div>
      <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
        + Tipo
      </button>
    </div>

    <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-3 py-2">Key</th>
            <th class="px-3 py-2">Nombre</th>
            <th class="px-3 py-2">Días/año</th>
            <th class="px-3 py-2">Conteo</th>
            <th class="px-3 py-2">Normativa</th>
            <th class="px-3 py-2">Flags</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tipos" :key="t.id" class="border-t">
            <td class="px-3 py-2 font-mono text-xs">{{ t.key }}</td>
            <td class="px-3 py-2">{{ t.nombre }}</td>
            <td class="px-3 py-2">{{ t.diasAnualesDefault }}</td>
            <td class="px-3 py-2 text-xs">{{ t.cuentaDias === 'habiles' ? 'hábiles' : 'corridos' }}</td>
            <td class="px-3 py-2 text-xs text-slate-500 max-w-[220px]">
              <span v-if="t.codigoLegal" class="font-mono">{{ t.codigoLegal }}</span>
              <span v-if="t.normativaRef"> — {{ t.normativaRef }}</span>
            </td>
            <td class="px-3 py-2 text-xs text-slate-500">
              <span v-if="t.esVacaciones">vacaciones · </span>
              <span v-if="t.requiereAdjunto">adjunto · </span>
              {{ t.activo ? 'activo' : 'inactivo' }}
            </td>
            <td class="px-3 py-2">
              <button class="text-teal-700 text-sm" @click="edit(t)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showForm"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-40"
      @click.self="showForm = false"
    >
      <form class="bg-white rounded-xl p-5 w-full max-w-md space-y-3" @submit.prevent="save">
        <h2 class="text-lg font-semibold">{{ form.id ? 'Editar tipo' : 'Nuevo tipo' }}</h2>
        <input
          v-if="!form.id"
          v-model="form.key"
          class="border rounded-lg px-3 py-2 w-full text-sm"
          placeholder="key (ej. maternidad)"
          required
        />
        <input
          v-model="form.nombre"
          class="border rounded-lg px-3 py-2 w-full text-sm"
          placeholder="Nombre"
          required
        />
        <input
          v-model.number="form.diasAnualesDefault"
          type="number"
          min="0"
          class="border rounded-lg px-3 py-2 w-full text-sm"
          placeholder="Días anuales"
        />
        <select v-model="form.cuentaDias" class="border rounded-lg px-3 py-2 w-full text-sm">
          <option value="calendario">Días corridos (calendario)</option>
          <option value="habiles">Días hábiles</option>
        </select>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.esVacaciones" type="checkbox" /> Es vacaciones
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.requiereAdjunto" type="checkbox" /> Requiere adjunto
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.activo" type="checkbox" /> Activo
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="border rounded-lg px-3 py-1.5 text-sm" @click="showForm = false">
            Cancelar
          </button>
          <button type="submit" class="rounded-lg bg-teal-700 text-white px-3 py-1.5 text-sm">
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const tipos = ref([])
const legislacion = ref(null)
const error = ref('')
const showForm = ref(false)
const form = reactive({
  id: '',
  key: '',
  nombre: '',
  diasAnualesDefault: 0,
  cuentaDias: 'calendario',
  esVacaciones: false,
  requiereAdjunto: false,
  activo: true,
})

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/licencias/tipos')
    tipos.value = data.tipos || []
    legislacion.value = data.legislacion || null
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

function openNew() {
  Object.assign(form, {
    id: '',
    key: '',
    nombre: '',
    diasAnualesDefault: 0,
    cuentaDias: legislacion.value?.cuentaVacaciones || 'calendario',
    esVacaciones: false,
    requiereAdjunto: false,
    activo: true,
  })
  showForm.value = true
}

function edit(t) {
  Object.assign(form, {
    ...t,
    cuentaDias: t.cuentaDias || 'calendario',
  })
  showForm.value = true
}

async function save() {
  try {
    if (form.id) {
      await api.put(`/admin/licencias/tipos/${form.id}`, {
        nombre: form.nombre,
        diasAnualesDefault: form.diasAnualesDefault,
        esVacaciones: form.esVacaciones,
        requiereAdjunto: form.requiereAdjunto,
        activo: form.activo,
        cuentaDias: form.cuentaDias,
      })
    } else {
      await api.post('/admin/licencias/tipos', { ...form })
    }
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  }
}

onMounted(load)
</script>
