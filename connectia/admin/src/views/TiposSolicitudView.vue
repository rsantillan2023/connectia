<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Plantillas</h1>
        <p class="text-sm text-slate-500 mt-1">
          Modelos reutilizables de pedido (nombre + preguntas). Acá se crean y editan.
          Después las usás en «Pedir datos a un grupo» o las ven los miembros al abrir una solicitud propia.
        </p>
        <ScreenHelp
          purpose="Una plantilla es el molde del formulario: título, preguntas y quién puede usarla desde la app. No envía nada por sí sola."
          can-do="Crear o editar plantillas. Para mandar un pedido a un área/grupo, usá «Pedir datos a un grupo» y elegí la plantilla ahí."
        />
      </div>
      <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">+ Plantilla</button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Orden</th>
            <th class="p-3">Plantilla</th>
            <th class="p-3">Área</th>
            <th class="p-3">Quién la ve en la app*</th>
            <th class="p-3">Preguntas</th>
            <th class="p-3">Activa</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in items" :key="t.id" class="border-t">
            <td class="p-3">{{ t.orden }}</td>
            <td class="p-3">
              <div class="font-medium">{{ t.nombre }}</div>
              <div class="font-mono text-xs text-slate-400">{{ t.key }}</div>
            </td>
            <td class="p-3">{{ t.area }}</td>
            <td class="p-3 text-xs">{{ audienceLabel(t.audience) }}</td>
            <td class="p-3 text-xs">{{ (t.campos || []).length }}</td>
            <td class="p-3">{{ t.activo ? 'Sí' : 'No' }}</td>
            <td class="p-3 text-right">
              <button class="text-teal-700" @click="edit(t)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="p-3 text-xs text-slate-400 border-t">
        * Quién puede elegir esta plantilla al crear una solicitud propia en la app.
        Para un envío dirigido a un grupo, usá «Pedir datos a un grupo».
      </p>
    </div>

    <div v-if="draft" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" @click.self="draft = null">
      <form class="bg-white rounded-xl p-6 w-full max-w-2xl space-y-3 max-h-[92vh] overflow-y-auto" @submit.prevent="save">
        <h2 class="font-semibold text-lg">{{ draft.id ? 'Editar plantilla' : 'Nueva plantilla' }}</h2>
        <div class="grid sm:grid-cols-2 gap-2">
          <input
            v-model="draft.nombre"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Nombre (ej. Actualización de domicilio)"
            required
            @input="onNombreInput"
          />
          <input v-model="draft.area" class="w-full border rounded-lg px-3 py-2" placeholder="Área (etiqueta)" />
          <input
            v-model="draft.key"
            :disabled="Boolean(draft.id)"
            class="w-full border rounded-lg px-3 py-2 disabled:bg-slate-50 font-mono text-sm"
            placeholder="Código interno (se arma solo)"
            required
          />
          <input v-model.number="draft.orden" type="number" class="w-full border rounded-lg px-3 py-2" placeholder="Orden" />
        </div>
        <textarea v-model="draft.descripcion" rows="2" class="w-full border rounded-lg px-3 py-2" placeholder="Descripción (opcional)" />
        <label class="flex items-center gap-2 text-sm"><input v-model="draft.activo" type="checkbox" /> Activa</label>

        <div class="border-t pt-3 space-y-2">
          <h3 class="font-medium">Quién puede usar esta plantilla en la app</h3>
          <p class="text-xs text-slate-500">Solo afecta a solicitudes que abre el miembro. Un envío dirigido se arma en «Pedir datos a un grupo».</p>
          <div class="flex gap-2 flex-wrap">
            <button type="button" class="rounded-lg border px-3 py-2 text-sm" :class="draft.audience.mode === 'all' ? 'bg-teal-700 text-white border-teal-700' : ''" @click="draft.audience.mode = 'all'">Toda la comunidad</button>
            <button type="button" class="rounded-lg border px-3 py-2 text-sm" :class="draft.audience.mode === 'restricted' ? 'bg-teal-700 text-white border-teal-700' : ''" @click="draft.audience.mode = 'restricted'">Áreas y/o grupos</button>
          </div>
          <div v-if="draft.audience.mode === 'restricted'" class="grid sm:grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-slate-500 mb-1">Áreas</p>
              <label v-for="a in orgAreas" :key="a.id" class="flex items-center gap-2 text-sm py-0.5">
                <input v-model="draft.audience.areaIds" type="checkbox" :value="a.id" /> {{ a.nombre }}
              </label>
              <p v-if="!orgAreas.length" class="text-xs text-slate-400">Creá áreas en Organización.</p>
            </div>
            <div>
              <p class="text-xs text-slate-500 mb-1">Grupos</p>
              <label v-for="g in orgGroups" :key="g.id" class="flex items-center gap-2 text-sm py-0.5">
                <input v-model="draft.audience.groupIds" type="checkbox" :value="g.id" /> {{ g.nombre }}
              </label>
              <p v-if="!orgGroups.length" class="text-xs text-slate-400">Creá grupos en Organización.</p>
            </div>
          </div>
        </div>

        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">Preguntas del formulario</h3>
            <button type="button" class="text-sm text-teal-700" @click="addCampo">+ Pregunta</button>
          </div>
          <div v-for="(c, idx) in draft.campos" :key="idx" class="border rounded-lg p-3 mb-2 space-y-2 bg-slate-50">
            <div class="grid sm:grid-cols-2 gap-2">
              <input
                v-model="c.label"
                class="border rounded px-2 py-1 text-sm"
                placeholder="Texto de la pregunta"
                required
                @input="syncCampoKey(c)"
              />
              <select v-model="c.tipo" class="border rounded px-2 py-1 text-sm">
                <option value="text">Texto corto</option>
                <option value="textarea">Texto largo</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
                <option value="check">Sí / No</option>
                <option value="select">Lista</option>
                <option value="email">Email</option>
                <option value="url">URL</option>
              </select>
            </div>
            <input v-if="c.tipo === 'select'" v-model="c.opcionesStr" class="w-full border rounded px-2 py-1 text-sm" placeholder="Opciones separadas por coma" />
            <div class="flex items-center justify-between gap-2">
              <input v-model="c.placeholder" class="flex-1 border rounded px-2 py-1 text-sm" placeholder="Texto de ayuda (opcional)" />
              <label class="flex items-center gap-1 text-xs whitespace-nowrap"><input v-model="c.required" type="checkbox" /> Obligatoria</label>
              <button type="button" class="text-xs text-red-600" @click="draft.campos.splice(idx, 1)">Quitar</button>
            </div>
          </div>
        </div>

        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex gap-2 justify-end">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="draft = null">Cancelar</button>
          <button class="px-4 py-2 bg-teal-700 text-white rounded-lg">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const draft = ref(null)
const error = ref('')
const formError = ref('')
const orgAreas = ref([])
const orgGroups = ref([])

function audienceLabel(a) {
  if (!a || a.mode !== 'restricted') return 'Toda la comunidad'
  const n = (a.areaIds?.length || 0) + (a.groupIds?.length || 0)
  return `Restringida (${n})`
}

async function loadOrg() {
  try {
    const { data } = await api.get('/admin/org/options')
    orgAreas.value = data.areas || []
    orgGroups.value = data.groups || []
  } catch {
    orgAreas.value = []
    orgGroups.value = []
  }
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/request-types', { params: { all: '1' } })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las plantillas'
  }
}

function slugKey(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return base || `plantilla_${Date.now().toString(36)}`
}

function onNombreInput() {
  if (draft.value?.id) return
  draft.value.key = slugKey(draft.value.nombre)
}

function syncCampoKey(c) {
  c.key = slugKey(c.label)
}

function openNew() {
  formError.value = ''
  draft.value = {
    key: '',
    nombre: '',
    area: 'General',
    descripcion: '',
    orden: 100,
    activo: true,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
    campos: [],
  }
}

function edit(t) {
  formError.value = ''
  draft.value = {
    ...t,
    audience: {
      mode: t.audience?.mode || 'all',
      areaIds: [...(t.audience?.areaIds || [])],
      groupIds: [...(t.audience?.groupIds || [])],
    },
    campos: (t.campos || []).map((c) => ({ ...c, opcionesStr: (c.opciones || []).join(', ') })),
  }
}

function addCampo() {
  draft.value.campos.push({
    key: '',
    label: '',
    tipo: 'text',
    required: false,
    opcionesStr: '',
    placeholder: '',
    orden: (draft.value.campos.length + 1) * 10,
  })
}

async function save() {
  formError.value = ''
  const payload = {
    ...draft.value,
    key: draft.value.key || slugKey(draft.value.nombre),
    audience: draft.value.audience,
    campos: (draft.value.campos || []).map((c, i) => ({
      key: c.key || slugKey(c.label),
      label: c.label,
      tipo: c.tipo,
      required: c.required,
      placeholder: c.placeholder,
      orden: c.orden || (i + 1) * 10,
      opciones: c.tipo === 'select' ? String(c.opcionesStr || '').split(',').map((s) => s.trim()).filter(Boolean) : [],
    })),
  }
  try {
    if (draft.value.id) await api.patch(`/request-types/${draft.value.id}`, payload)
    else await api.post('/request-types', payload)
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

onMounted(async () => {
  await Promise.all([load(), loadOrg()])
})
</script>
