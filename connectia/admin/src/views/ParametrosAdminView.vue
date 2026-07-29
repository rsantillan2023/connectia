<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Parámetros</h1>
        <p class="text-sm text-slate-500 mt-1">
          Ajustes generales de esta comunidad (zona horaria, tema e importaciones).
        </p>
        <ScreenHelp
          purpose="Configurá opciones del tenant sin tocar código."
          can-do="Cambiar zona horaria, tema, acceso desktop y parámetros de import/sync."
        />
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>
    <p v-if="loading" class="mt-3 text-sm text-slate-500">Cargando…</p>

    <section class="mt-4 bg-white border rounded-xl p-4">
      <h2 class="font-medium text-lg">Ajustes básicos</h2>
      <p class="text-xs text-slate-500 mt-1">Se guardan en el tenant.</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="text-sm block">
          Zona horaria
          <select v-model="builtins.timezone" class="mt-1 w-full border rounded-lg px-3 py-2 bg-white">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
          <span class="block text-xs text-slate-400 mt-1">Ej.: Argentina = America/Argentina/Buenos_Aires</span>
        </label>
        <label class="text-sm block">
          Tema de la app
          <select v-model="builtins.themeMode" class="mt-1 w-full border rounded-lg px-3 py-2 bg-white">
            <option value="system">Según el dispositivo</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
        <label class="text-sm flex items-center gap-2 sm:col-span-2">
          <input v-model="builtins.allowDesktop" type="checkbox" class="rounded" />
          Permitir acceso desde escritorio (PC)
        </label>
      </div>
      <button
        type="button"
        class="mt-4 rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium"
        :disabled="savingBuiltins"
        @click="saveBuiltins"
      >
        Guardar ajustes básicos
      </button>
    </section>

    <section class="mt-4">
      <h2 class="font-medium text-lg mb-2">Otros parámetros</h2>
      <p v-if="!loading && !items.length" class="text-sm text-slate-500">
        No hay parámetros tipados todavía.
      </p>
      <div v-else class="overflow-x-auto bg-white border rounded-xl">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
              <th class="p-3">Nombre</th>
              <th class="p-3">Grupo</th>
              <th class="p-3">Valor</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in items" :key="p.id" class="border-t align-top">
              <td class="p-3">
                <p class="font-medium">{{ p.label }}</p>
                <p v-if="p.descripcion" class="text-xs text-slate-400 mt-1">{{ p.descripcion }}</p>
              </td>
              <td class="p-3 text-slate-500">{{ grupoLabel(p.grupo) }}</td>
              <td class="p-3 min-w-[200px]">
                <select
                  v-if="p.tipo === 'enum'"
                  v-model="edits[p.id]"
                  class="w-full border rounded-lg px-2 py-1.5 bg-white"
                >
                  <option v-for="o in p.opciones" :key="o" :value="o">{{ enumLabel(p.key, o) }}</option>
                </select>
                <select
                  v-else-if="p.tipo === 'boolean'"
                  v-model="edits[p.id]"
                  class="w-full border rounded-lg px-2 py-1.5 bg-white"
                >
                  <option :value="true">Sí</option>
                  <option :value="false">No</option>
                </select>
                <input
                  v-else-if="p.tipo === 'secret'"
                  v-model="edits[p.id]"
                  type="password"
                  class="w-full border rounded-lg px-2 py-1.5"
                  :placeholder="p.hasValue ? '••••••••' : ''"
                />
                <input v-else v-model="edits[p.id]" class="w-full border rounded-lg px-2 py-1.5" />
              </td>
              <td class="p-3 text-right whitespace-nowrap">
                <button type="button" class="text-teal-700 font-medium" @click="saveParam(p)">
                  Guardar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const timezones = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Sao_Paulo',
  'America/Santiago',
  'America/Montevideo',
  'America/Asuncion',
  'America/La_Paz',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/New_York',
  'Europe/Madrid',
  'UTC',
]

const items = ref([])
const edits = reactive({})
const builtins = reactive({
  timezone: 'America/Argentina/Buenos_Aires',
  themeMode: 'system',
  allowDesktop: true,
})
const error = ref('')
const okMsg = ref('')
const loading = ref(false)
const savingBuiltins = ref(false)

function grupoLabel(g) {
  const map = {
    locale: 'Idioma',
    usuarios: 'Usuarios',
    directorio: 'Directorio / sync',
    general: 'General',
  }
  return map[g] || g || 'General'
}

function enumLabel(key, value) {
  if (key === 'import.policy') {
    if (value === 'partial') return 'Parcial (saltar filas con error)'
    if (value === 'all_or_nothing') return 'Todo o nada'
  }
  if (key === 'directory.on_remote_disable') {
    if (value === 'deactivate') return 'Desactivar en Connectia'
    if (value === 'notify_only') return 'Solo avisar'
    if (value === 'ignore') return 'Ignorar'
  }
  return value
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.get('/admin/params')
    items.value = data.items || []
    for (const p of items.value) {
      edits[p.id] = p.tipo === 'secret' ? '' : p.valor
    }
    const b = data.tenantBuiltins || {}
    builtins.timezone = b.timezone || 'America/Argentina/Buenos_Aires'
    builtins.themeMode = b.themeMode || 'system'
    builtins.allowDesktop = b.allowDesktop !== false
    if (builtins.timezone && !timezones.includes(builtins.timezone)) {
      timezones.unshift(builtins.timezone)
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function saveBuiltins() {
  error.value = ''
  okMsg.value = ''
  savingBuiltins.value = true
  try {
    await api.patch('/admin/params/builtins/tenant', { ...builtins })
    okMsg.value = 'Ajustes básicos guardados'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    savingBuiltins.value = false
  }
}

async function saveParam(p) {
  error.value = ''
  okMsg.value = ''
  try {
    const valor = edits[p.id]
    if (p.tipo === 'secret' && (valor === '' || valor == null)) {
      okMsg.value = 'Sin cambios'
      return
    }
    await api.patch(`/admin/params/${p.id}`, { valor })
    okMsg.value = `Guardado: ${p.label}`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

onMounted(load)
</script>
