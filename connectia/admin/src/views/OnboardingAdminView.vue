<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Onboarding y egreso</h1>
        <p>Plantillas, incorporaciones y offboarding · encuestas vía §15</p>
        <ScreenHelp
          purpose="Ciclo de vida ingreso/egreso con hitos y progreso en servidor."
          can-do="Publicar plantillas, iniciar procesos, completar hitos, revocar accesos en egreso. Hitos tipo encuesta usan Admin → Encuestas."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :class="{ on: tab === 'templates' }" @click="tab = 'templates'">
          Plantillas
        </button>
        <button type="button" class="btn-ghost" :class="{ on: tab === 'instances' }" @click="tab = 'instances'">
          Procesos
        </button>
        <button v-if="tab === 'templates'" type="button" class="btn-primary" @click="openNewTemplate">
          Nueva plantilla
        </button>
        <button v-else type="button" class="btn-primary" @click="openStart">Iniciar proceso</button>
      </div>
    </header>
    <p v-if="error" class="err">{{ error }}</p>

    <template v-if="tab === 'templates'">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Versión</th>
            <th>Hitos</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in templates" :key="t.id">
            <td>
              <strong>{{ t.nombre }}</strong>
              <p class="sub">{{ t.descripcion }}</p>
            </td>
            <td>{{ t.kind }}</td>
            <td>v{{ t.version }}</td>
            <td>{{ t.milestones?.length || 0 }}</td>
            <td><span class="pill" :data-st="t.status">{{ t.status }}</span></td>
            <td class="actions">
              <button type="button" class="btn-ghost" @click="editTemplate(t)">Editar</button>
              <button
                v-if="t.status !== 'published'"
                type="button"
                class="btn-ghost"
                @click="publish(t)"
              >
                Publicar
              </button>
              <button
                v-if="t.status !== 'archived'"
                type="button"
                class="btn-ghost danger"
                @click="archive(t)"
              >
                Archivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!templates.length" class="muted">Sin plantillas aún.</p>
    </template>

    <template v-else>
      <table class="table">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Plantilla</th>
            <th>Tipo</th>
            <th>Progreso</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in instances" :key="i.id">
            <td>{{ i.userName }}</td>
            <td>{{ i.templateName }} <span class="sub">v{{ i.templateVersion }}</span></td>
            <td>{{ i.kind }}</td>
            <td>{{ i.progressPercent }}%</td>
            <td><span class="pill" :data-st="i.status">{{ i.status }}</span></td>
            <td class="actions">
              <button type="button" class="btn-ghost" @click="openInstance(i)">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!instances.length" class="muted">Sin procesos iniciados.</p>
    </template>

    <!-- Editor plantilla -->
    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel editor wide" @submit.prevent="saveTemplate">
        <h2>{{ draft.id ? 'Editar plantilla' : 'Nueva plantilla' }}</h2>
        <label>Nombre <input v-model="draft.nombre" class="input" required /></label>
        <label>Descripción <textarea v-model="draft.descripcion" class="input" rows="2" /></label>
        <label
          >Tipo
          <select v-model="draft.kind" class="input">
            <option value="onboarding">Onboarding</option>
            <option value="offboarding">Offboarding</option>
          </select>
        </label>
        <label>SLA (días) <input v-model.number="draft.slaDias" type="number" class="input" min="0" /></label>

        <h3>Hitos</h3>
        <p class="hint">Tipo encuesta: elegí una encuesta de §15 (mismo motor dinámico).</p>
        <div v-for="(m, idx) in draft.milestones" :key="m.key + idx" class="milestone">
          <div class="q-row">
            <label>Key <input v-model="m.key" class="input" required /></label>
            <label>Título <input v-model="m.titulo" class="input" required /></label>
          </div>
          <div class="q-row">
            <label
              >Tipo
              <select v-model="m.tipo" class="input">
                <option value="task">Tarea</option>
                <option value="content">Contenido</option>
                <option value="survey">Encuesta (§15)</option>
                <option value="checklist">Checklist</option>
              </select>
            </label>
            <label>Orden <input v-model.number="m.orden" type="number" class="input" /></label>
          </div>
          <label v-if="m.tipo === 'survey'"
            >Encuesta
            <select v-model="m.surveyId" class="input" required>
              <option value="">— elegir —</option>
              <option v-for="s in surveyOptions" :key="s.id" :value="s.id">
                {{ s.titulo }} ({{ s.purpose }} · {{ s.status }})
              </option>
            </select>
          </label>
          <label v-if="m.tipo === 'content'"
            >Contenido / URL
            <input v-model="m.contentUrl" class="input" placeholder="https://…" />
          </label>
          <label
            >Descripción
            <textarea v-model="m.descripcion" class="input" rows="2" />
          </label>
          <label class="check"><input v-model="m.obligatorio" type="checkbox" /> Obligatorio</label>
          <button type="button" class="btn-ghost danger" @click="draft.milestones.splice(idx, 1)">
            Quitar hito
          </button>
        </div>
        <button type="button" class="btn-ghost" @click="addMilestone">+ Hito</button>

        <p v-if="formError" class="err">{{ formError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Iniciar proceso -->
    <div v-if="startDraft" class="sheet" @click.self="startDraft = null">
      <form class="panel editor" @submit.prevent="startInstance">
        <h2>Iniciar proceso</h2>
        <label
          >Plantilla publicada
          <select v-model="startDraft.templateId" class="input" required>
            <option value="">—</option>
            <option
              v-for="t in templates.filter((x) => x.status === 'published')"
              :key="t.id"
              :value="t.id"
            >
              {{ t.nombre }} ({{ t.kind }})
            </option>
          </select>
        </label>
        <label
          >Usuario
          <select v-model="startDraft.userId" class="input" required>
            <option value="">—</option>
            <option v-for="u in users" :key="u.id" :value="u.id">
              {{ u.nombre }} {{ u.apellido }} ({{ u.usuario }})
            </option>
          </select>
        </label>
        <p v-if="formError" class="err">{{ formError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="startDraft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">Iniciar</button>
        </div>
      </form>
    </div>

    <!-- Detalle instancia -->
    <div v-if="detail" class="sheet" @click.self="detail = null">
      <div class="panel editor wide">
        <h2>{{ detail.userName }} · {{ detail.templateName }}</h2>
        <p class="hint">{{ detail.kind }} · {{ detail.status }} · {{ detail.progressPercent }}%</p>
        <ul class="mlist">
          <li v-for="m in detail.milestones" :key="m.key">
            <strong>{{ m.titulo }}</strong>
            <span class="pill" :data-st="m.status">{{ m.status }}</span>
            <span class="sub">{{ m.tipo }}</span>
            <button
              v-if="['pending', 'in_progress'].includes(detail.status) && m.status === 'pending'"
              type="button"
              class="btn-ghost"
              @click="completeAdminMilestone(m.key)"
            >
              {{ m.tipo === 'survey' ? 'Marcar encuesta hecha' : 'Marcar hecho' }}
            </button>
            <a
              v-if="m.tipo === 'survey' && m.surveyId"
              class="btn-ghost"
              :href="`/encuestas?highlight=${m.surveyId}`"
              target="_blank"
              rel="noopener"
              @click.prevent="openSurveyAdmin(m.surveyId)"
            >
              Ver encuesta §15
            </a>
          </li>
        </ul>
        <div class="footer" style="justify-content: space-between">
          <div>
            <button
              v-if="detail.kind === 'offboarding' && !detail.accessRevokedAt && detail.status !== 'revoked'"
              type="button"
              class="btn-primary"
              @click="revokeAccess"
            >
              Revocar accesos
            </button>
            <button
              v-if="['pending', 'in_progress'].includes(detail.status)"
              type="button"
              class="btn-ghost danger"
              @click="cancelInstance"
            >
              Cancelar proceso
            </button>
          </div>
          <button type="button" class="btn-ghost" @click="detail = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const router = useRouter()
const tab = ref('templates')
const templates = ref([])
const instances = ref([])
const surveyOptions = ref([])
const users = ref([])
const error = ref('')
const formError = ref('')
const draft = ref(null)
const startDraft = ref(null)
const detail = ref(null)
const saving = ref(false)

async function loadTemplates() {
  const { data } = await api.get('/admin/onboarding/templates')
  templates.value = data.items || []
}

async function loadInstances() {
  const { data } = await api.get('/admin/onboarding/instances')
  instances.value = data.items || []
}

async function loadSurveys() {
  const { data } = await api.get('/admin/onboarding/survey-options')
  surveyOptions.value = data.items || []
}

async function loadUsers() {
  try {
    const { data } = await api.get('/admin/onboarding/user-options')
    users.value = data.items || []
  } catch {
    users.value = []
  }
}

watch(tab, (t) => {
  if (t === 'instances') loadInstances()
})

function addMilestone() {
  const n = (draft.value.milestones?.length || 0) + 1
  draft.value.milestones.push({
    key: `hito_${n}`,
    titulo: `Hito ${n}`,
    descripcion: '',
    tipo: 'task',
    orden: n,
    dependsOn: [],
    surveyId: '',
    contentUrl: '',
    contentBody: '',
    obligatorio: true,
  })
}

function openNewTemplate() {
  formError.value = ''
  draft.value = {
    nombre: '',
    descripcion: '',
    kind: 'onboarding',
    slaDias: 30,
    milestones: [],
  }
  addMilestone()
  loadSurveys()
}

function editTemplate(t) {
  formError.value = ''
  draft.value = {
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion || '',
    kind: t.kind,
    slaDias: t.slaDias,
    milestones: (t.milestones || []).map((m) => ({
      ...m,
      surveyId: m.surveyId || '',
    })),
  }
  loadSurveys()
}

async function saveTemplate() {
  saving.value = true
  formError.value = ''
  try {
    const body = {
      nombre: draft.value.nombre,
      descripcion: draft.value.descripcion,
      kind: draft.value.kind,
      slaDias: draft.value.slaDias,
      milestones: draft.value.milestones.map((m) => ({
        ...m,
        surveyId: m.tipo === 'survey' && m.surveyId ? m.surveyId : null,
      })),
    }
    if (draft.value.id) await api.patch(`/admin/onboarding/templates/${draft.value.id}`, body)
    else await api.post('/admin/onboarding/templates', body)
    draft.value = null
    await loadTemplates()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function publish(t) {
  try {
    await api.post(`/admin/onboarding/templates/${t.id}/publish`)
    await loadTemplates()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function archive(t) {
  try {
    await api.post(`/admin/onboarding/templates/${t.id}/archive`)
    await loadTemplates()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function openStart() {
  formError.value = ''
  startDraft.value = { templateId: '', userId: '' }
  loadUsers()
  loadTemplates()
}

async function startInstance() {
  saving.value = true
  formError.value = ''
  try {
    await api.post('/admin/onboarding/instances', startDraft.value)
    startDraft.value = null
    tab.value = 'instances'
    await loadInstances()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function openInstance(i) {
  try {
    const { data } = await api.get(`/admin/onboarding/instances/${i.id}`)
    detail.value = data.instance
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function completeAdminMilestone(key) {
  try {
    const { data } = await api.post(
      `/admin/onboarding/instances/${detail.value.id}/milestones/${encodeURIComponent(key)}/complete`,
    )
    detail.value = data.instance
    await loadInstances()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function openSurveyAdmin(_surveyId) {
  router.push({ path: '/encuestas' })
}

async function revokeAccess() {
  if (!confirm('¿Desactivar usuario y revocar sesiones?')) return
  try {
    const { data } = await api.post(`/admin/onboarding/instances/${detail.value.id}/revoke-access`)
    detail.value = data.instance
    await loadInstances()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function cancelInstance() {
  if (!confirm('¿Cancelar este proceso?')) return
  try {
    const { data } = await api.post(`/admin/onboarding/instances/${detail.value.id}/cancel`)
    detail.value = data.instance
    await loadInstances()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

onMounted(async () => {
  error.value = ''
  try {
    await loadTemplates()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
})
</script>

<style scoped>
.page {
  padding: 1.25rem 1.5rem 3rem;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.page-head h1 {
  margin: 0 0 0.25rem;
  font-size: 1.4rem;
}
.page-head p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}
.head-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}
.btn-ghost.on {
  background: #e2e8f0;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.table th,
.table td {
  text-align: left;
  padding: 0.55rem 0.4rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
.sub {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.15rem 0 0;
}
.actions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.err {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}
.pill {
  font-size: 0.72rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  background: #e2e8f0;
  text-transform: lowercase;
}
.pill[data-st='published'],
.pill[data-st='completed'],
.pill[data-st='done'] {
  background: #dcfce7;
  color: #166534;
}
.pill[data-st='in_progress'],
.pill[data-st='pending'] {
  background: #fef9c3;
  color: #854d0e;
}
.pill[data-st='locked'] {
  background: #f1f5f9;
  color: #475569;
}
.pill[data-st='revoked'],
.pill[data-st='cancelled'],
.pill[data-st='archived'],
.pill[data-st='closed'] {
  background: #fee2e2;
  color: #991b1b;
}
.sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 40;
  padding: 1rem;
  overflow: auto;
}
.panel {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  width: min(440px, 100%);
  display: grid;
  gap: 0.65rem;
  max-height: 90vh;
  overflow: auto;
}
.panel.wide {
  width: min(720px, 100%);
}
.panel label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
}
.q-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.milestone {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  display: grid;
  gap: 0.5rem;
}
.hint {
  color: #64748b;
  font-size: 0.82rem;
  margin: 0;
}
.check {
  display: flex !important;
  align-items: center;
  gap: 0.4rem;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.mlist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
.mlist li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.btn-primary,
.btn-ghost {
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.btn-ghost.danger {
  color: #b91c1c;
}
</style>
