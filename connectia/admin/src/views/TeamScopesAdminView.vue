<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Equipos (supervisor)</h1>
        <p class="text-sm text-slate-500 mt-1">
          Alcance combinable: área, área+cliente, grupo, personas (Ola 32).
        </p>
      </div>
      <button type="button" class="btn-ghost" :disabled="busy" @click="ensure">Activar menú + caps</button>
    </div>
    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <section class="mt-4 panel">
      <h2 class="font-medium mb-2">Nuevo / editar equipo</h2>
      <form class="grid gap-2 md:grid-cols-2" @submit.prevent="save">
        <input v-model="form.nombre" class="input" placeholder="Nombre del equipo" required />
        <select v-model="form.supervisorId" class="input" required>
          <option value="">Supervisor</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nombre }}</option>
        </select>

        <label class="text-sm md:col-span-2">
          Áreas
          <select v-model="form.areaIds" class="input mt-1 w-full" multiple size="4">
            <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>
        </label>
        <label class="text-sm md:col-span-2">
          Grupos
          <select v-model="form.groupIds" class="input mt-1 w-full" multiple size="4">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.nombre }}</option>
          </select>
        </label>
        <label class="text-sm md:col-span-2">
          Clientes (Ola 31)
          <select v-model="form.clientIds" class="input mt-1 w-full" multiple size="4">
            <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <label class="text-sm md:col-span-2">
          Personas a mano
          <select v-model="form.userIds" class="input mt-1 w-full" multiple size="5">
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nombre }}</option>
          </select>
        </label>
        <label class="text-sm flex items-center gap-2 md:col-span-2">
          <input v-model="form.areaClientIntersect" type="checkbox" />
          Intersección área ∩ cliente (unión con grupos/personas)
        </label>
        <div class="md:col-span-2 flex gap-2 flex-wrap">
          <button class="btn-primary" type="submit">{{ form.id ? 'Guardar' : 'Crear' }} y resolver</button>
          <button v-if="form.id" type="button" class="btn-ghost" @click="resetForm">Cancelar edición</button>
        </div>
      </form>
    </section>

    <section class="mt-4 panel">
      <h2 class="font-medium mb-2">Equipos</h2>
      <ul class="space-y-3">
        <li v-for="t in items" :key="t.id" class="border-b border-slate-100 pb-3 text-sm">
          <div class="flex flex-wrap justify-between gap-2">
            <strong>{{ t.nombre }}</strong>
            <span class="text-slate-500">{{ t.memberCount }} miembros</span>
          </div>
          <p class="text-slate-500">
            Supervisor {{ t.supervisorId?.slice(-6) }} · áreas {{ t.source?.areaIds?.length || 0 }} ·
            grupos {{ t.source?.groupIds?.length || 0 }} · clientes {{ t.source?.clientIds?.length || 0 }} ·
            personas {{ t.source?.userIds?.length || 0 }}
          </p>
          <div class="mt-2 flex gap-2 flex-wrap">
            <button type="button" class="btn-ghost" @click="edit(t)">Editar</button>
            <button type="button" class="btn-ghost" @click="refresh(t.id)">Re-sync</button>
            <button type="button" class="btn-ghost" @click="deactivate(t.id)">Desactivar</button>
          </div>
        </li>
        <li v-if="!items.length" class="text-slate-500">Sin equipos</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../services/api'

const items = ref([])
const users = ref([])
const areas = ref([])
const groups = ref([])
const clientes = ref([])
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const form = reactive({
  id: '',
  nombre: '',
  supervisorId: '',
  areaIds: [],
  groupIds: [],
  clientIds: [],
  userIds: [],
  areaClientIntersect: false,
})

function resetForm() {
  form.id = ''
  form.nombre = ''
  form.supervisorId = ''
  form.areaIds = []
  form.groupIds = []
  form.clientIds = []
  form.userIds = []
  form.areaClientIntersect = false
}

function edit(t) {
  form.id = t.id
  form.nombre = t.nombre
  form.supervisorId = t.supervisorId || ''
  form.areaIds = [...(t.source?.areaIds || [])]
  form.groupIds = [...(t.source?.groupIds || [])]
  form.clientIds = [...(t.source?.clientIds || [])]
  form.userIds = [...(t.source?.userIds || [])]
  form.areaClientIntersect = Boolean(t.source?.areaClientIntersect)
}

async function load() {
  error.value = ''
  try {
    const [t, u, org] = await Promise.all([
      api.get('/admin/team'),
      api.get('/admin/team/candidates/users'),
      api.get('/admin/team/candidates/org'),
    ])
    items.value = t.data.items || []
    users.value = u.data.items || []
    areas.value = org.data.areas || []
    groups.value = org.data.groups || []
    clientes.value = org.data.clientes || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function ensure() {
  busy.value = true
  try {
    await api.post('/admin/team/ensure-menu')
    okMsg.value = 'Caps y menú Ola 32 activados'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

function sourcePayload() {
  return {
    areaIds: form.areaIds,
    groupIds: form.groupIds,
    clientIds: form.clientIds,
    userIds: form.userIds,
    areaClientIntersect: form.areaClientIntersect,
  }
}

async function save() {
  const body = {
    nombre: form.nombre,
    supervisorId: form.supervisorId,
    source: sourcePayload(),
    allowedModules: ['muro', 'eventos', 'notif', 'encuestas', 'docs', 'chat', 'beneficios', 'reconocimientos'],
  }
  if (form.id) await api.patch(`/admin/team/${form.id}`, body)
  else await api.post('/admin/team', body)
  okMsg.value = form.id ? 'Equipo actualizado' : 'Equipo creado'
  resetForm()
  await load()
}

async function refresh(id) {
  await api.post(`/admin/team/${id}/refresh`)
  okMsg.value = 'Miembros recalculados'
  await load()
}

async function deactivate(id) {
  await api.delete(`/admin/team/${id}`)
  await load()
}

onMounted(load)
</script>

<style scoped>
.panel {
  @apply rounded-xl border border-slate-200 bg-white p-4;
}
.input {
  @apply rounded-lg border border-slate-200 px-3 py-2 text-sm;
}
</style>
