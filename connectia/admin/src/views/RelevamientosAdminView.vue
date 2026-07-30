<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const tab = ref('forms')
const loading = ref(false)
const err = ref('')
const meta = ref({ questionTypes: [], modalities: [] })

const forms = ref([])
const routes = ref([])
const assignments = ref([])
const operators = ref([])
const stats = ref(null)

const day = ref(new Date().toISOString().slice(0, 10))

const formDraft = ref(null)
const routeDraft = ref(null)
const assignDraft = ref({
  day: day.value,
  operatorId: '',
  formId: '',
  routeId: '',
  stopId: '',
  modality: 'scheduled',
  order: 0,
  notes: '',
})

const publishedForms = computed(() => forms.value.filter((f) => f.status === 'published'))

async function loadMeta() {
  const { data } = await api.get('/admin/relevamientos/meta')
  meta.value = data
}

async function activate() {
  loading.value = true
  err.value = ''
  try {
    await api.post('/admin/relevamientos/activate')
    await refresh()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function refresh() {
  loading.value = true
  err.value = ''
  try {
    await loadMeta()
    const [f, r, a, o, s] = await Promise.all([
      api.get('/admin/relevamientos/forms'),
      api.get('/admin/relevamientos/routes'),
      api.get('/admin/relevamientos/assignments', { params: { day: day.value } }),
      api.get('/admin/relevamientos/operators'),
      api.get('/admin/relevamientos/stats', { params: { day: day.value } }),
    ])
    forms.value = f.data.items || []
    routes.value = r.data.items || []
    assignments.value = a.data.items || []
    operators.value = o.data.items || []
    stats.value = s.data
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function openNewForm() {
  formDraft.value = {
    id: null,
    titulo: '',
    descripcion: '',
    questions: [
      { id: 'q1', texto: '¿Todo OK?', tipo: 'yesno', required: true, opciones: [], logic: [], grupo: 'General' },
    ],
  }
}

function editForm(f) {
  formDraft.value = {
    id: f.id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    questions: JSON.parse(JSON.stringify(f.questions || [])),
  }
}

function addQuestion() {
  const n = (formDraft.value.questions?.length || 0) + 1
  formDraft.value.questions.push({
    id: `q${n}`,
    texto: '',
    tipo: 'text',
    required: true,
    opciones: [],
    logic: [],
    grupo: 'General',
  })
}

async function saveForm() {
  loading.value = true
  err.value = ''
  try {
    const body = {
      titulo: formDraft.value.titulo,
      descripcion: formDraft.value.descripcion,
      questions: formDraft.value.questions,
    }
    if (formDraft.value.id) {
      await api.patch(`/admin/relevamientos/forms/${formDraft.value.id}`, body)
    } else {
      await api.post('/admin/relevamientos/forms', body)
    }
    formDraft.value = null
    await refresh()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function publishForm(f) {
  await api.patch(`/admin/relevamientos/forms/${f.id}`, { status: 'published' })
  await refresh()
}

function openNewRoute() {
  routeDraft.value = {
    id: null,
    nombre: '',
    descripcion: '',
    stops: [
      { id: 's1', label: 'Parada 1', address: '', lat: null, lng: null, radiusM: 100, order: 0 },
      { id: 's2', label: 'Parada 2', address: '', lat: null, lng: null, radiusM: 100, order: 1 },
    ],
  }
}

function editRoute(r) {
  routeDraft.value = JSON.parse(JSON.stringify({ ...r }))
}

function addStop() {
  const n = (routeDraft.value.stops?.length || 0) + 1
  routeDraft.value.stops.push({
    id: `s${n}`,
    label: `Parada ${n}`,
    address: '',
    lat: null,
    lng: null,
    radiusM: 100,
    order: n - 1,
  })
}

async function saveRoute() {
  loading.value = true
  try {
    const body = {
      nombre: routeDraft.value.nombre,
      descripcion: routeDraft.value.descripcion,
      stops: routeDraft.value.stops,
    }
    if (routeDraft.value.id) await api.patch(`/admin/relevamientos/routes/${routeDraft.value.id}`, body)
    else await api.post('/admin/relevamientos/routes', body)
    routeDraft.value = null
    await refresh()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

const selectedRouteStops = computed(() => {
  const r = routes.value.find((x) => x.id === assignDraft.value.routeId)
  return r?.stops || []
})

async function createAssignment() {
  loading.value = true
  try {
    await api.post('/admin/relevamientos/assignments', { ...assignDraft.value, day: day.value })
    await refresh()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function remind() {
  await api.post('/admin/relevamientos/remind', { day: day.value })
  alert('Recordatorios enviados')
}

async function exportCsv() {
  const { data } = await api.get('/admin/relevamientos/export', {
    params: { day: day.value, format: 'csv' },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `relevamientos-${day.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(refresh)
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>Relevamientos de campo</h1>
        <p class="sub">Add-on Ola 37 · distinto de Encuestas corporativas</p>
      </div>
      <div class="actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="activate">Activar módulo</button>
        <button type="button" class="btn-ghost" :disabled="loading" @click="refresh">Actualizar</button>
      </div>
    </header>

    <p v-if="err" class="error">{{ err }}</p>

    <nav class="tabs">
      <button type="button" :class="{ on: tab === 'forms' }" @click="tab = 'forms'">Formularios</button>
      <button type="button" :class="{ on: tab === 'routes' }" @click="tab = 'routes'">Rutas</button>
      <button type="button" :class="{ on: tab === 'agenda' }" @click="tab = 'agenda'">Agenda del día</button>
      <button type="button" :class="{ on: tab === 'board' }" @click="tab = 'board'">Tablero</button>
    </nav>

    <section v-if="tab === 'forms'" class="panel">
      <div class="row">
        <button type="button" class="btn-primary" @click="openNewForm">Nuevo formulario</button>
      </div>
      <ul class="list">
        <li v-for="f in forms" :key="f.id" class="card">
          <div>
            <strong>{{ f.titulo }}</strong>
            <span class="badge">{{ f.status }} · v{{ f.version }}</span>
            <p class="hint">{{ f.questions?.length || 0 }} preguntas</p>
          </div>
          <div class="actions">
            <button type="button" class="btn-ghost" @click="editForm(f)">Editar</button>
            <button
              v-if="f.status !== 'published'"
              type="button"
              class="btn-primary"
              @click="publishForm(f)"
            >
              Publicar
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-else-if="tab === 'routes'" class="panel">
      <div class="row">
        <button type="button" class="btn-primary" @click="openNewRoute">Nueva ruta</button>
      </div>
      <ul class="list">
        <li v-for="r in routes" :key="r.id" class="card">
          <div>
            <strong>{{ r.nombre }}</strong>
            <p class="hint">{{ r.stops?.length || 0 }} paradas</p>
          </div>
          <button type="button" class="btn-ghost" @click="editRoute(r)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-else-if="tab === 'agenda'" class="panel">
      <div class="row gap">
        <label>
          Día
          <input v-model="day" type="date" @change="refresh" />
        </label>
      </div>
      <div class="compose card">
        <h3>Asignar relevamiento</h3>
        <label>
          Operador
          <select v-model="assignDraft.operatorId">
            <option value="">—</option>
            <option v-for="o in operators" :key="o.id" :value="o.id">{{ o.nombre || o.email }}</option>
          </select>
        </label>
        <label>
          Formulario
          <select v-model="assignDraft.formId">
            <option value="">—</option>
            <option v-for="f in publishedForms" :key="f.id" :value="f.id">{{ f.titulo }}</option>
          </select>
        </label>
        <label>
          Ruta (opcional)
          <select v-model="assignDraft.routeId">
            <option value="">Sin ruta</option>
            <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.nombre }}</option>
          </select>
        </label>
        <label v-if="selectedRouteStops.length">
          Parada
          <select v-model="assignDraft.stopId">
            <option value="">—</option>
            <option v-for="s in selectedRouteStops" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <button type="button" class="btn-primary" @click="createAssignment">Asignar</button>
      </div>
      <ul class="list">
        <li v-for="a in assignments" :key="a.id" class="card">
          <div>
            <strong>{{ a.stopLabel || a.modality }}</strong>
            <p class="hint">
              {{ a.operator?.nombre || a.operatorId }} · {{ a.status }} · orden {{ a.order }}
            </p>
          </div>
        </li>
      </ul>
    </section>

    <section v-else class="panel">
      <div class="row gap">
        <label>
          Día
          <input v-model="day" type="date" @change="refresh" />
        </label>
        <button type="button" class="btn-ghost" @click="remind">Recordar pendientes</button>
        <button type="button" class="btn-ghost" @click="exportCsv">Export CSV</button>
      </div>
      <div v-if="stats" class="stats">
        <div><span>Asignados</span><strong>{{ stats.assigned }}</strong></div>
        <div><span>Completados</span><strong>{{ stats.completed }}</strong></div>
        <div><span>Pendientes</span><strong>{{ stats.pending }}</strong></div>
        <div><span>%</span><strong>{{ stats.pct }}</strong></div>
      </div>
    </section>

    <div v-if="formDraft" class="sheet">
      <div class="sheet-inner">
        <h2>{{ formDraft.id ? 'Editar' : 'Nuevo' }} formulario</h2>
        <label>Título <input v-model="formDraft.titulo" /></label>
        <label>Descripción <textarea v-model="formDraft.descripcion" rows="2" /></label>
        <div v-for="(q, i) in formDraft.questions" :key="q.id" class="q">
          <input v-model="q.texto" placeholder="Pregunta" />
          <select v-model="q.tipo">
            <option v-for="t in meta.questionTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
          <label class="check"><input v-model="q.required" type="checkbox" /> Obligatoria</label>
          <button type="button" class="btn-ghost danger" @click="formDraft.questions.splice(i, 1)">Quitar</button>
        </div>
        <button type="button" class="btn-ghost" @click="addQuestion">+ Pregunta</button>
        <div class="actions">
          <button type="button" class="btn-ghost" @click="formDraft = null">Cancelar</button>
          <button type="button" class="btn-primary" @click="saveForm">Guardar</button>
        </div>
      </div>
    </div>

    <div v-if="routeDraft" class="sheet">
      <div class="sheet-inner">
        <h2>{{ routeDraft.id ? 'Editar' : 'Nueva' }} ruta</h2>
        <label>Nombre <input v-model="routeDraft.nombre" /></label>
        <label>Descripción <textarea v-model="routeDraft.descripcion" rows="2" /></label>
        <div v-for="(s, i) in routeDraft.stops" :key="s.id" class="q">
          <input v-model="s.label" placeholder="Parada" />
          <input v-model="s.address" placeholder="Dirección" />
          <button type="button" class="btn-ghost danger" @click="routeDraft.stops.splice(i, 1)">Quitar</button>
        </div>
        <button type="button" class="btn-ghost" @click="addStop">+ Parada</button>
        <div class="actions">
          <button type="button" class="btn-ghost" @click="routeDraft = null">Cancelar</button>
          <button type="button" class="btn-primary" @click="saveRoute">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 1.25rem 1.5rem 3rem; max-width: none; }
.head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
h1 { margin: 0; font-size: 1.45rem; }
.sub { margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.9rem; }
.tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 1rem; }
.tabs button { border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 80%, transparent); background: transparent; padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer; }
.tabs button.on { background: var(--c-primary, #0d6e6e); color: #fff; border-color: transparent; }
.row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; }
.row.gap label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.65rem; }
.card { border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 70%, transparent); border-radius: 12px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; background: color-mix(in srgb, var(--c-surface, var(--panel)) 92%, transparent); }
.badge { margin-left: 0.5rem; font-size: 0.75rem; opacity: 0.7; }
.hint { margin: 0.2rem 0 0; font-size: 0.85rem; opacity: 0.7; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.btn-primary, .btn-ghost { border-radius: 8px; padding: 0.45rem 0.8rem; cursor: pointer; border: 1px solid transparent; font: inherit; }
.btn-primary { background: var(--c-primary, #0d6e6e); color: #fff; }
.btn-ghost { background: transparent; border-color: color-mix(in srgb, var(--c-border, #ccc) 80%, transparent); }
.btn-ghost.danger { color: var(--bad); }
.error { color: var(--bad); }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1rem; }
.stats div { border-radius: 12px; padding: 0.85rem; background: color-mix(in srgb, var(--c-primary, #0d6e6e) 12%, transparent); display: flex; flex-direction: column; gap: 0.25rem; }
.stats span { font-size: 0.8rem; opacity: 0.75; }
.compose { flex-direction: column; align-items: stretch; }
.compose label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-bottom: 0.5rem; }
.sheet { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: grid; place-items: center; z-index: 40; padding: 1rem; }
.sheet-inner { background: var(--c-surface, var(--panel)); color: inherit; border-radius: 14px; padding: 1.25rem; width: min(560px, 100%); max-height: 90vh; overflow: auto; display: grid; gap: 0.65rem; }
.sheet-inner label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
.q { display: grid; gap: 0.35rem; padding: 0.5rem 0; border-bottom: 1px solid color-mix(in srgb, var(--c-border, #ccc) 60%, transparent); }
.check { flex-direction: row !important; align-items: center; gap: 0.4rem !important; }
input, select, textarea { font: inherit; padding: 0.4rem 0.5rem; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--c-border, #ccc) 80%, transparent); background: transparent; color: inherit; }
</style>
