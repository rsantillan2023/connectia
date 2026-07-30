<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Supervisión comercial</h1>
        <p class="text-sm text-slate-500 mt-1">
          ABM, taxonomía, imports XLSX, plantillas y permisos (Ola 31).
        </p>
      </div>
      <button type="button" class="btn-ghost" :disabled="busy" @click="ensure">Activar menú + cap</button>
    </div>
    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <div class="mt-4 flex gap-2 flex-wrap">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="btn-ghost"
        :class="{ 'ring-2 ring-teal-600': tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <section v-if="tab === 'cadenas'" class="mt-4 panel">
      <form class="flex gap-2 flex-wrap" @submit.prevent="addCadena">
        <input v-model="cadenaNombre" class="input" placeholder="Nueva cadena" required />
        <button class="btn-primary" type="submit">Agregar</button>
      </form>
      <ImportBlock kind="cadenas" @done="onImport" />
      <ul class="mt-3 space-y-2">
        <li v-for="c in cadenas" :key="c.id" class="text-sm">{{ c.nombre }}</li>
      </ul>
    </section>

    <section v-if="tab === 'subcadenas'" class="mt-4 panel">
      <form class="flex gap-2 flex-wrap" @submit.prevent="addSubcadena">
        <select v-model="sub.cadenaId" class="input" required>
          <option value="">Cadena</option>
          <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        <input v-model="sub.nombre" class="input" placeholder="Subcadena" required />
        <button class="btn-primary" type="submit">Agregar</button>
      </form>
      <ImportBlock kind="subcadenas" @done="onImport" />
      <ul class="mt-3 space-y-2">
        <li v-for="s in subcadenas" :key="s.id" class="text-sm">{{ s.nombre }}</li>
      </ul>
    </section>

    <section v-if="tab === 'clientes'" class="mt-4 panel">
      <form class="flex gap-2 flex-wrap" @submit.prevent="addCliente">
        <input v-model="clienteNombre" class="input" placeholder="Cliente" required />
        <input v-model="clienteCodigo" class="input" placeholder="Código" />
        <button class="btn-primary" type="submit">Agregar</button>
      </form>
      <ImportBlock kind="clientes" @done="onImport" />
      <ul class="mt-3 space-y-2">
        <li v-for="c in clientes" :key="c.id" class="text-sm">
          {{ c.nombre }} <span class="text-slate-400">{{ c.codigo }}</span>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'salas'" class="mt-4 panel">
      <form class="grid gap-2 md:grid-cols-3" @submit.prevent="addSala">
        <input v-model="sala.nombre" class="input" placeholder="Nombre sala" required />
        <select v-model="sala.cadenaId" class="input">
          <option value="">Sin cadena</option>
          <option v-for="c in cadenas" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        <input v-model="sala.comuna" class="input" placeholder="Comuna" />
        <button class="btn-primary" type="submit">Agregar sala</button>
      </form>
      <ImportBlock kind="salas" @done="onImport" />
      <ul class="mt-3 space-y-2">
        <li v-for="s in salas" :key="s.id" class="text-sm">{{ s.nombre }} · {{ s.comuna || '—' }}</li>
      </ul>
    </section>

    <section v-if="tab === 'asignaciones'" class="mt-4 panel">
      <form class="grid gap-2 md:grid-cols-3" @submit.prevent="addRelacion">
        <select v-model="rel.clienteId" class="input" required>
          <option value="">Cliente</option>
          <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        <select v-model="rel.salaId" class="input" required>
          <option value="">Sala</option>
          <option v-for="s in salas" :key="s.id" :value="s.id">{{ s.nombre }}</option>
        </select>
        <button class="btn-primary" type="submit">Crear relación</button>
      </form>
      <ImportBlock kind="asignaciones" @done="onImport" />
      <div v-for="r in relaciones" :key="r.id" class="mt-4 border-t border-slate-100 pt-3">
        <p class="text-sm font-medium">Relación {{ r.id.slice(-6) }}</p>
        <form class="mt-2 flex gap-2 flex-wrap" @submit.prevent="addColab(r.id)">
          <select v-model="colab.userId" class="input" required>
            <option value="">Usuario</option>
            <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
          </select>
          <select v-model="colab.role" class="input">
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
          <button class="btn-primary" type="submit">Colaborador</button>
        </form>
        <ul class="mt-2 text-xs text-slate-600">
          <li v-for="c in r.colaboradores" :key="c.userId">{{ c.userId.slice(-6) }} · {{ c.role }}</li>
        </ul>
      </div>
    </section>

    <section v-if="tab === 'taxonomia'" class="mt-4 panel space-y-4">
      <form class="flex gap-2 flex-wrap" @submit.prevent="addNamed('categorias', catNombre, { color: catColor })">
        <input v-model="catNombre" class="input" placeholder="Categoría" required />
        <input v-model="catColor" class="input" type="color" />
        <button class="btn-primary" type="submit">Categoría</button>
      </form>
      <form class="flex gap-2 flex-wrap" @submit.prevent="addNamed('pilares', pilarNombre)">
        <input v-model="pilarNombre" class="input" placeholder="Pilar" required />
        <button class="btn-primary" type="submit">Pilar</button>
      </form>
      <form class="flex gap-2 flex-wrap" @submit.prevent="addNamed('mediciones', medNombre, { tipo: 'check' })">
        <input v-model="medNombre" class="input" placeholder="Medición catálogo" required />
        <button class="btn-primary" type="submit">Medición</button>
      </form>
      <form class="flex gap-2 flex-wrap" @submit.prevent="addNamed('templates-estados', estNombre)">
        <input v-model="estNombre" class="input" placeholder="Estado plantilla" required />
        <button class="btn-primary" type="submit">Estado</button>
      </form>
      <button type="button" class="btn-ghost" @click="seedGeo">Seed geo Chile demo</button>
      <div class="grid md:grid-cols-2 gap-3 text-sm">
        <div>
          <p class="font-medium">Categorías</p>
          <ul><li v-for="x in categorias" :key="x.id">{{ x.nombre }}</li></ul>
        </div>
        <div>
          <p class="font-medium">Pilares</p>
          <ul><li v-for="x in pilares" :key="x.id">{{ x.nombre }}</li></ul>
        </div>
        <div>
          <p class="font-medium">Mediciones</p>
          <ul><li v-for="x in mediciones" :key="x.id">{{ x.nombre }}</li></ul>
        </div>
        <div>
          <p class="font-medium">Estados template</p>
          <ul><li v-for="x in templateEstados" :key="x.id">{{ x.nombre }}</li></ul>
        </div>
      </div>
    </section>

    <section v-if="tab === 'templates'" class="mt-4 panel">
      <form class="grid gap-2" @submit.prevent="addTemplate">
        <input v-model="tpl.nombre" class="input" placeholder="Nombre plantilla" required />
        <select v-model="tpl.categoriaId" class="input">
          <option value="">Sin categoría</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        <textarea v-model="tpl.medicionesText" class="input" rows="3" placeholder="Mediciones (una por línea)" />
        <button class="btn-primary" type="submit">Crear plantilla</button>
      </form>
      <ul class="mt-3 space-y-2">
        <li v-for="t in templates" :key="t.id" class="text-sm">
          {{ t.nombre }} · {{ t.mediciones?.length || 0 }} ítems
        </li>
      </ul>
    </section>

    <section v-if="tab === 'roles'" class="mt-4 panel">
      <ul class="space-y-2">
        <li v-for="u in usuarios" :key="u.id" class="flex flex-wrap items-center gap-2 text-sm">
          <span class="min-w-[10rem]">{{ u.nombre }}</span>
          <select
            class="input"
            :value="u.supervisionRole || ''"
            @change="setRole(u.id, $event.target.value)"
          >
            <option value="">(sin rol)</option>
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'permisos'" class="mt-4 panel">
      <div class="flex gap-2 flex-wrap mb-3">
        <button
          v-for="r in rolePermisos"
          :key="r.role"
          type="button"
          class="btn-ghost"
          :class="{ 'ring-2 ring-teal-600': permRole === r.role }"
          @click="permRole = r.role"
        >
          {{ r.role }}
        </button>
      </div>
      <div v-if="currentPerm" class="overflow-auto">
        <table class="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left p-1">Pantalla</th>
              <th v-for="a in actions" :key="a" class="p-1">{{ a }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in screens" :key="s">
              <td class="p-1">{{ s }}</td>
              <td v-for="a in actions" :key="a" class="p-1 text-center">
                <input
                  type="checkbox"
                  :checked="currentPerm.permisos?.[s]?.[a]"
                  @change="togglePerm(s, a, $event.target.checked)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mt-3 flex gap-2">
          <button type="button" class="btn-primary" @click="savePerms">Guardar</button>
          <button type="button" class="btn-ghost" @click="resetPerms">Reset defaults</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../services/api'

const ImportBlock = defineComponent({
  name: 'ImportBlock',
  props: { kind: { type: String, required: true } },
  emits: ['done'],
  setup(props, { emit }) {
    const file = ref(null)
    const msg = ref('')
    async function run() {
      if (!file.value) return
      const fd = new FormData()
      fd.append('file', file.value)
      const { data } = await api.post(`/admin/supervision/import/${props.kind}`, fd)
      msg.value = `Importados ${data.created}, omitidos ${data.skipped}`
      emit('done')
    }
    async function tpl() {
      const { data } = await api.get(`/admin/supervision/import/plantilla/${props.kind}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `plantilla-${props.kind}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
    return () =>
      h('div', { class: 'mt-3 flex flex-wrap gap-2 items-center text-sm' }, [
        h('input', {
          type: 'file',
          accept: '.xlsx,.xls',
          onChange: (e) => {
            file.value = e.target.files?.[0] || null
          },
        }),
        h('button', { type: 'button', class: 'btn-ghost', onClick: run }, 'Importar XLSX'),
        h('button', { type: 'button', class: 'btn-ghost', onClick: tpl }, 'Plantilla'),
        msg.value ? h('span', { class: 'text-teal-700' }, msg.value) : null,
      ])
  },
})

const tab = ref('cadenas')
const tabs = [
  { id: 'cadenas', label: 'Cadenas' },
  { id: 'subcadenas', label: 'Subcadenas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'salas', label: 'Salas' },
  { id: 'asignaciones', label: 'Asignaciones' },
  { id: 'taxonomia', label: 'Taxonomía' },
  { id: 'templates', label: 'Plantillas' },
  { id: 'roles', label: 'Roles' },
  { id: 'permisos', label: 'Permisos' },
]
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const cadenas = ref([])
const subcadenas = ref([])
const clientes = ref([])
const salas = ref([])
const relaciones = ref([])
const templates = ref([])
const usuarios = ref([])
const categorias = ref([])
const pilares = ref([])
const mediciones = ref([])
const templateEstados = ref([])
const rolePermisos = ref([])
const screens = ref([])
const actions = ref([])
const permRole = ref('operario')
const roles = ref(['operario', 'supervisor', 'plataforma_comercial', 'gestor', 'admin_mod'])
const cadenaNombre = ref('')
const clienteNombre = ref('')
const clienteCodigo = ref('')
const catNombre = ref('')
const catColor = ref('#0d9488')
const pilarNombre = ref('')
const medNombre = ref('')
const estNombre = ref('')
const sub = reactive({ cadenaId: '', nombre: '' })
const sala = reactive({ nombre: '', cadenaId: '', comuna: '' })
const rel = reactive({ clienteId: '', salaId: '' })
const colab = reactive({ userId: '', role: 'operario' })
const tpl = reactive({
  nombre: '',
  categoriaId: '',
  medicionesText: 'Check apertura\nCheck stock\nFoto góndola',
})

const currentPerm = computed(() => rolePermisos.value.find((r) => r.role === permRole.value))

async function loadAll() {
  error.value = ''
  try {
    const [c, cl, s, r, t, u, sc, cat, pil, med, est, rp] = await Promise.all([
      api.get('/admin/supervision/cadenas'),
      api.get('/admin/supervision/clientes'),
      api.get('/admin/supervision/salas'),
      api.get('/admin/supervision/cliente-salas'),
      api.get('/admin/supervision/templates'),
      api.get('/admin/supervision/usuarios-roles'),
      api.get('/admin/supervision/subcadenas'),
      api.get('/admin/supervision/categorias'),
      api.get('/admin/supervision/pilares'),
      api.get('/admin/supervision/mediciones'),
      api.get('/admin/supervision/templates-estados'),
      api.get('/admin/supervision/roles-permisos'),
    ])
    cadenas.value = c.data.items || []
    clientes.value = cl.data.items || []
    salas.value = s.data.items || []
    relaciones.value = r.data.items || []
    templates.value = t.data.items || []
    usuarios.value = u.data.items || []
    subcadenas.value = sc.data.items || []
    categorias.value = cat.data.items || []
    pilares.value = pil.data.items || []
    mediciones.value = med.data.items || []
    templateEstados.value = est.data.items || []
    rolePermisos.value = rp.data.items || []
    screens.value = rp.data.screens || []
    actions.value = rp.data.actions || []
    if (u.data.roles?.length) roles.value = u.data.roles
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function onImport() {
  okMsg.value = 'Importación lista'
  await loadAll()
}

async function ensure() {
  busy.value = true
  try {
    await api.post('/admin/supervision/ensure-menu')
    okMsg.value = 'Menú y capability activados'
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function addCadena() {
  await api.post('/admin/supervision/cadenas', { nombre: cadenaNombre.value })
  cadenaNombre.value = ''
  await loadAll()
}
async function addSubcadena() {
  await api.post('/admin/supervision/subcadenas', { ...sub })
  sub.nombre = ''
  await loadAll()
}
async function addCliente() {
  await api.post('/admin/supervision/clientes', {
    nombre: clienteNombre.value,
    codigo: clienteCodigo.value,
  })
  clienteNombre.value = ''
  clienteCodigo.value = ''
  await loadAll()
}
async function addSala() {
  await api.post('/admin/supervision/salas', { ...sala, cadenaId: sala.cadenaId || undefined })
  sala.nombre = ''
  sala.comuna = ''
  await loadAll()
}
async function addRelacion() {
  await api.post('/admin/supervision/cliente-salas', { ...rel })
  await loadAll()
}
async function addColab(id) {
  await api.post(`/admin/supervision/cliente-salas/${id}/colaboradores`, { ...colab })
  await loadAll()
}
async function addNamed(path, nombre, extra = {}) {
  await api.post(`/admin/supervision/${path}`, { nombre, ...extra })
  catNombre.value = ''
  pilarNombre.value = ''
  medNombre.value = ''
  estNombre.value = ''
  await loadAll()
}
async function addTemplate() {
  const medicionesLines = tpl.medicionesText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((nombre, i) => ({ nombre, tipo: 'check', obligatorio: true, orden: i }))
  await api.post('/admin/supervision/templates', {
    nombre: tpl.nombre,
    mediciones: medicionesLines,
    categoriaId: tpl.categoriaId || undefined,
  })
  tpl.nombre = ''
  await loadAll()
}
async function setRole(userId, supervisionRole) {
  await api.patch(`/admin/supervision/usuarios-roles/${userId}`, { supervisionRole })
  okMsg.value = 'Rol actualizado'
  await loadAll()
}
async function seedGeo() {
  await api.post('/admin/supervision/ubicaciones/seed-demo')
  okMsg.value = 'Geo demo sembrada'
}
function togglePerm(screen, action, val) {
  const row = rolePermisos.value.find((r) => r.role === permRole.value)
  if (!row) return
  if (!row.permisos[screen]) row.permisos[screen] = {}
  row.permisos[screen][action] = val
}
async function savePerms() {
  const row = currentPerm.value
  if (!row) return
  await api.put(`/admin/supervision/roles-permisos/${row.role}`, { permisos: row.permisos })
  okMsg.value = 'Permisos guardados'
  await loadAll()
}
async function resetPerms() {
  await api.post(`/admin/supervision/roles-permisos/reset/${permRole.value}`)
  okMsg.value = 'Permisos reseteados'
  await loadAll()
}

watch(tab, () => {
  okMsg.value = ''
})

onMounted(loadAll)
</script>

<style scoped>
.panel {
  @apply rounded-xl border border-slate-200 bg-white p-4;
}
.input {
  @apply rounded-lg border border-slate-200 px-3 py-2 text-sm;
}
</style>
