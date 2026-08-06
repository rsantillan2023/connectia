<template>
  <div ref="pageEl" class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Talento y desarrollo</h1>
        <p>OKR, desempeño, LMS, vacantes internas y planes de carrera.</p>
        <ScreenHelp
          purpose="Administración del módulo de talento §38: ciclos OKR, evaluaciones, cursos y vacantes."
          can-do="Sembrar datos demo, crear ciclos/OKRs, cursos, vacantes y revisar postulaciones."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedDefaults">
          {{ busy ? 'Cargando…' : 'Cargar datos demo' }}
        </button>
      </div>
    </header>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.id" type="button" :class="{ on: tab === t.id }" @click="tab = t.id; loadTab()">
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <!-- OKR -->
    <section v-if="tab === 'okr'" class="section">
      <div class="grid-2">
        <form class="panel" @submit.prevent="createOkrCycle">
          <h2>Nuevo ciclo OKR</h2>
          <label>Nombre<input v-model="okrCycleForm.nombre" class="input" required /></label>
          <label>Inicio<input v-model="okrCycleForm.startsAt" type="date" class="input" required /></label>
          <label>Fin<input v-model="okrCycleForm.endsAt" type="date" class="input" required /></label>
          <label>Estado
            <select v-model="okrCycleForm.status" class="input">
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="closed">Cerrado</option>
            </select>
          </label>
          <button type="submit" class="btn-primary">Crear ciclo</button>
        </form>
        <form class="panel" @submit.prevent="createOkr">
          <h2>Nuevo OKR</h2>
          <PersonPicker
            v-model="okrForm.ownerId"
            v-model:selected-label="okrForm.ownerName"
            endpoint="/admin/talent/people"
            label="Owner"
            placeholder="Buscar colaborador…"
          />
          <label>Ciclo
            <select v-model="okrForm.cycleId" class="input" required>
              <option value="">— Elegir —</option>
              <option v-for="c in okrCycles" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
          </label>
          <label>Título<input v-model="okrForm.titulo" class="input" required /></label>
          <label>Key results (una línea por KR: título|meta)
            <textarea v-model="okrForm.keyResultsText" class="input" rows="4" placeholder="Ventas Q1|100" />
          </label>
          <button type="submit" class="btn-primary" :disabled="!okrForm.ownerId">Crear OKR</button>
        </form>
      </div>
      <h3>Ciclos</h3>
      <table class="table">
        <thead><tr><th>Nombre</th><th>Estado</th><th>Período</th></tr></thead>
        <tbody>
          <tr v-for="c in okrCycles" :key="c.id">
            <td>{{ c.nombre }}</td>
            <td><span class="pill" :data-st="c.status">{{ c.status }}</span></td>
            <td>{{ fmtDate(c.startsAt) }} – {{ fmtDate(c.endsAt) }}</td>
          </tr>
        </tbody>
      </table>
      <h3>OKRs</h3>
      <table class="table">
        <thead><tr><th>Título</th><th>Owner</th><th>Progreso</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="o in okrs" :key="o.id">
            <td>{{ o.titulo }}</td>
            <td>{{ o.ownerName }}</td>
            <td>{{ Math.round(o.progress || 0) }}%</td>
            <td><span class="pill">{{ o.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Desempeño -->
    <section v-if="tab === 'desempeno'" class="section">
      <form class="panel" @submit.prevent="createPerfCycle">
        <h2>Nuevo ciclo de desempeño</h2>
        <label>Nombre<input v-model="perfForm.nombre" class="input" required /></label>
        <label>Inicio<input v-model="perfForm.startsAt" type="date" class="input" required /></label>
        <label>Fin<input v-model="perfForm.endsAt" type="date" class="input" required /></label>
        <label class="check"><input v-model="perfForm.allowSelf" type="checkbox" /> Autoevaluación</label>
        <label class="check"><input v-model="perfForm.allowLeader" type="checkbox" /> Evaluación líder</label>
        <label class="check"><input v-model="perfForm.allowPeer" type="checkbox" /> Entre pares</label>
        <label>Estado
          <select v-model="perfForm.status" class="input">
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="closed">Cerrado</option>
          </select>
        </label>
        <button type="submit" class="btn-primary">Crear ciclo</button>
      </form>
      <h3>Ciclos</h3>
      <table class="table">
        <thead><tr><th>Nombre</th><th>Estado</th><th>Período</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in perfCycles" :key="c.id">
            <td>{{ c.nombre }}</td>
            <td><span class="pill" :data-st="c.status">{{ c.status }}</span></td>
            <td>{{ fmtDate(c.startsAt) }} – {{ fmtDate(c.endsAt) }}</td>
            <td>
              <select v-model="c._editStatus" class="input inline" @change="patchPerfCycle(c)">
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="closed">closed</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <h3>Evaluaciones</h3>
      <table class="table">
        <thead><tr><th>Sujeto</th><th>Evaluador</th><th>Tipo</th><th>Rating</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="r in reviews" :key="r.id">
            <td>{{ r.subjectName }}</td>
            <td>{{ r.reviewerName }}</td>
            <td>{{ r.reviewType }} / {{ r.kind }}</td>
            <td>{{ r.rating ?? '—' }}</td>
            <td><span class="pill">{{ r.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- LMS -->
    <section v-if="tab === 'lms'" class="section">
      <div class="grid-2">
        <form class="panel" @submit.prevent="createCourse">
          <h2>Nuevo curso</h2>
          <label>Título<input v-model="courseForm.titulo" class="input" required /></label>
          <label>Descripción<textarea v-model="courseForm.descripcion" class="input" rows="2" /></label>
          <label>Contenido HTML<textarea v-model="courseForm.contentHtml" class="input" rows="5" /></label>
          <label>Estado
            <select v-model="courseForm.status" class="input">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>
          <button type="submit" class="btn-primary">Crear curso</button>
        </form>
        <form class="panel" @submit.prevent="assignCourse">
          <h2>Asignar curso</h2>
          <label>Curso
            <select v-model="assignForm.courseId" class="input" required>
              <option value="">— Elegir —</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.titulo }}</option>
            </select>
          </label>
          <PersonPicker
            endpoint="/admin/talent/people"
            label="Agregar persona"
            placeholder="Buscar y agregar…"
            @select="addAssignUser"
          />
          <ul v-if="assignForm.users.length" class="chip-list">
            <li v-for="u in assignForm.users" :key="u.id">
              {{ u.name }}
              <button type="button" class="btn-ghost" @click="removeAssignUser(u.id)">×</button>
            </li>
          </ul>
          <button type="submit" class="btn-primary" :disabled="!assignForm.users.length">Asignar</button>
        </form>
      </div>
      <table class="table">
        <thead><tr><th>Título</th><th>Estado</th><th>Duración</th></tr></thead>
        <tbody>
          <tr v-for="c in courses" :key="c.id">
            <td>{{ c.titulo }}</td>
            <td><span class="pill" :data-st="c.status">{{ c.status }}</span></td>
            <td>{{ c.durationMinutes }} min</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Vacantes -->
    <section v-if="tab === 'vacantes'" class="section">
      <form class="panel" @submit.prevent="createVacancy">
        <h2>Nueva vacante</h2>
        <label>Título<input v-model="vacForm.titulo" class="input" required /></label>
        <label>Descripción<textarea v-model="vacForm.descripcion" class="input" rows="3" /></label>
        <label>Área<input v-model="vacForm.area" class="input" /></label>
        <label>Estado
          <select v-model="vacForm.status" class="input">
            <option value="draft">Borrador</option>
            <option value="open">Abierta</option>
          </select>
        </label>
        <button type="submit" class="btn-primary">Crear vacante</button>
      </form>
      <table class="table">
        <thead><tr><th>Título</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          <tr v-for="v in vacancies" :key="v.id">
            <td>{{ v.titulo }}</td>
            <td><span class="pill" :data-st="v.status">{{ v.status }}</span></td>
            <td><button type="button" class="btn-ghost" @click="loadApplications(v.id)">Postulaciones</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="selectedVacancy" class="panel">
        <h3>Postulaciones — {{ selectedVacancy.titulo }}</h3>
        <table class="table">
          <thead><tr><th>Persona</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            <tr v-for="a in applications" :key="a.id">
              <td>{{ a.userName }}</td>
              <td>{{ a.status }}</td>
              <td>{{ fmtDate(a.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Carrera -->
    <section v-if="tab === 'carrera'" class="section">
      <table class="table">
        <thead><tr><th>Persona</th><th>Rol actual</th><th>Objetivo</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="p in careerPlans" :key="p.id">
            <td>{{ p.userName }}</td>
            <td>{{ p.currentRole || '—' }}</td>
            <td>{{ p.targetRole || '—' }}</td>
            <td><span class="pill">{{ p.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!careerPlans.length" class="muted">Sin planes de carrera.</p>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import PersonPicker from '../components/PersonPicker.vue'

const pageEl = ref(null)
const tab = ref('okr')
const tabs = [
  { id: 'okr', label: 'OKR' },
  { id: 'desempeno', label: 'Desempeño' },
  { id: 'lms', label: 'LMS' },
  { id: 'vacantes', label: 'Vacantes' },
  { id: 'carrera', label: 'Carrera' },
]
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const okrCycles = ref([])
const okrs = ref([])
const okrCycleForm = ref({ nombre: '', startsAt: '', endsAt: '', status: 'draft' })
const okrForm = ref({ ownerId: '', ownerName: '', cycleId: '', titulo: '', keyResultsText: '' })

const perfCycles = ref([])
const reviews = ref([])
const perfForm = ref({ nombre: '', startsAt: '', endsAt: '', status: 'draft', allowSelf: true, allowLeader: true, allowPeer: false })

const courses = ref([])
const courseForm = ref({ titulo: '', descripcion: '', contentHtml: '', status: 'published' })
const assignForm = ref({ courseId: '', users: [] })

const vacancies = ref([])
const vacForm = ref({ titulo: '', descripcion: '', area: '', status: 'open' })
const selectedVacancy = ref(null)
const applications = ref([])

const careerPlans = ref([])

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return '' }
}

function parseKeyResults(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titulo, targetRaw] = line.split('|').map((s) => s.trim())
      return { titulo, target: Number(targetRaw) || 100, current: 0 }
    })
}

async function seedDefaults() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/admin/talent/seed-defaults')
    okMsg.value = 'Datos demo cargados'
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al sembrar'
  } finally {
    busy.value = false
  }
}

async function loadTab() {
  error.value = ''
  okMsg.value = ''
  try {
    if (tab.value === 'okr') {
      const [cycles, items] = await Promise.all([
        api.get('/admin/talent/okr-cycles'),
        api.get('/admin/talent/okrs'),
      ])
      okrCycles.value = cycles.data.items || []
      okrs.value = items.data.items || []
    } else if (tab.value === 'desempeno') {
      const [cycles, revs] = await Promise.all([
        api.get('/admin/talent/performance-cycles'),
        api.get('/admin/talent/reviews'),
      ])
      perfCycles.value = (cycles.data.items || []).map((c) => ({ ...c, _editStatus: c.status }))
      reviews.value = revs.data.items || []
    } else if (tab.value === 'lms') {
      const { data } = await api.get('/admin/talent/courses')
      courses.value = data.items || []
    } else if (tab.value === 'vacantes') {
      const { data } = await api.get('/admin/talent/vacancies')
      vacancies.value = data.items || []
      selectedVacancy.value = null
      applications.value = []
    } else if (tab.value === 'carrera') {
      const { data } = await api.get('/admin/talent/career-plans')
      careerPlans.value = data.items || []
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar'
  }
}

async function createOkrCycle() {
  try {
    await api.post('/admin/talent/okr-cycles', {
      ...okrCycleForm.value,
      startsAt: new Date(okrCycleForm.value.startsAt).toISOString(),
      endsAt: new Date(okrCycleForm.value.endsAt).toISOString(),
    })
    okrCycleForm.value = { nombre: '', startsAt: '', endsAt: '', status: 'draft' }
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear'
  }
}

async function createOkr() {
  try {
    await api.post('/admin/talent/okrs', {
      ownerId: okrForm.value.ownerId,
      cycleId: okrForm.value.cycleId,
      titulo: okrForm.value.titulo.trim(),
      keyResults: parseKeyResults(okrForm.value.keyResultsText),
    })
    okrForm.value = { ownerId: '', ownerName: '', cycleId: '', titulo: '', keyResultsText: '' }
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear'
  }
}

async function createPerfCycle() {
  try {
    await api.post('/admin/talent/performance-cycles', {
      ...perfForm.value,
      startsAt: new Date(perfForm.value.startsAt).toISOString(),
      endsAt: new Date(perfForm.value.endsAt).toISOString(),
      audience: { mode: 'all' },
    })
    perfForm.value = { nombre: '', startsAt: '', endsAt: '', status: 'draft', allowSelf: true, allowLeader: true, allowPeer: false }
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear'
  }
}

async function patchPerfCycle(c) {
  try {
    await api.patch(`/admin/talent/performance-cycles/${c.id}`, { status: c._editStatus })
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo actualizar'
  }
}

async function createCourse() {
  try {
    await api.post('/admin/talent/courses', { ...courseForm.value, audience: { mode: 'all' } })
    courseForm.value = { titulo: '', descripcion: '', contentHtml: '', status: 'published' }
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear'
  }
}

function addAssignUser(u) {
  if (!u?.id) return
  if (assignForm.value.users.some((x) => x.id === u.id)) return
  assignForm.value.users.push({ id: u.id, name: u.displayName || u.usuario || u.id })
}

function removeAssignUser(id) {
  assignForm.value.users = assignForm.value.users.filter((u) => u.id !== id)
}

async function assignCourse() {
  try {
    const userIds = assignForm.value.users.map((u) => u.id)
    if (!userIds.length) {
      error.value = 'Agregá al menos una persona'
      return
    }
    await api.post(`/admin/talent/courses/${assignForm.value.courseId}/assign`, { userIds })
    okMsg.value = 'Curso asignado'
    assignForm.value = { courseId: '', users: [] }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo asignar'
  }
}

async function createVacancy() {
  try {
    await api.post('/admin/talent/vacancies', { ...vacForm.value, audience: { mode: 'all' } })
    vacForm.value = { titulo: '', descripcion: '', area: '', status: 'open' }
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo crear'
  }
}

async function loadApplications(vacancyId) {
  try {
    const { data } = await api.get(`/admin/talent/vacancies/${vacancyId}/applications`)
    selectedVacancy.value = data.vacancy
    applications.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar postulaciones'
  }
}

onMounted(async () => {
  await loadTab()
  await nextTick()
  pageEl.value?.querySelector('h1')?.focus?.({ preventScroll: true })
})
</script>

<style scoped>
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; }
.page-head h1 { margin: 0; font-size: 1.5rem; outline: none; }
.page-head p { margin: 4px 0 0; color: var(--ink-soft); }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.tabs button { border: 1px solid var(--line-2); border-radius: 10px; padding: 8px 12px; background: var(--panel); font-weight: 600; cursor: pointer; }
.tabs button.on { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.section { display: grid; gap: 16px; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.panel { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: var(--panel); display: grid; gap: 10px; }
.panel h2, .panel h3 { margin: 0; font-size: 1rem; }
.table { width: 100%; border-collapse: collapse; background: var(--panel); border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid var(--line); font-size: 0.9rem; }
.input { width: 100%; box-sizing: border-box; border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
.input.inline { width: auto; margin: 0; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.pill { display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: var(--line); }
.pill[data-st='published'], .pill[data-st='active'], .pill[data-st='open'] { background: var(--ok-bg); color: var(--ok); }
.pill[data-st='draft'] { background: var(--warn-bg); color: var(--warn); }
.err { color: var(--bad); }
.ok { color: var(--ok); }
.muted { color: var(--ink-soft); }
.chip-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chip-list li { display: flex; align-items: center; gap: 6px; background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel)); border: 1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--panel)); border-radius: 999px; padding: 4px 10px; font-size: 0.85rem; }
.chip-list .btn-ghost { padding: 0 6px; border: none; font-size: 1rem; line-height: 1; }
</style>
