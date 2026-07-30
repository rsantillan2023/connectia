<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Centro de comunicaciones</h1>
        <p>
          Tipos, plantillas multi-canal (email · WhatsApp · SMS), generación con IA y envío a la
          comunidad — con outbox auditable.
        </p>
        <ScreenHelp
          purpose="Comunicar a miembros por email, WhatsApp o SMS con plantillas configurables e IA."
          can-do="ABM tipos y plantillas; generar con IA; wizard de envío; ver outbox y estado de canales."
        />
      </div>
      <button type="button" class="btn-ghost" :disabled="busy" @click="reloadAll">
        {{ busy ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <div class="health" v-if="health">
      <span :class="{ on: health.email?.configured }">Email {{ health.email?.configured ? 'OK' : 'dev' }}</span>
      <span :class="{ on: health.whatsapp?.configured }">WhatsApp {{ health.whatsapp?.configured ? 'OK' : 'dev' }}</span>
      <span :class="{ on: health.sms?.configured }">SMS {{ health.sms?.configured ? 'OK' : 'dev' }}</span>
      <span :class="{ on: aiConfigured }">IA {{ aiConfigured ? 'OK' : 'off' }}</span>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <!-- Tipos -->
    <section v-if="tab === 'tipos'" class="section">
      <form class="panel" @submit.prevent="saveType">
        <h2>{{ typeForm.id ? 'Editar tipo' : 'Nuevo tipo' }}</h2>
        <label v-if="!typeForm.id"
          >Código
          <input v-model="typeForm.codigo" class="input" required maxlength="64" placeholder="AVISO_GENERAL" />
        </label>
        <label
          >Nombre <input v-model="typeForm.nombre" class="input" required maxlength="120"
        /></label>
        <label
          >Descripción <textarea v-model="typeForm.descripcion" class="input" rows="2"
        /></label>
        <div class="footer">
          <button v-if="typeForm.id" type="button" class="btn-ghost" @click="resetTypeForm">Cancelar</button>
          <button type="submit" class="btn-primary">{{ typeForm.id ? 'Guardar' : 'Crear' }}</button>
        </div>
      </form>
      <table class="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in types" :key="t.id">
            <td><code>{{ t.codigo }}</code></td>
            <td>
              <strong>{{ t.nombre }}</strong>
              <p class="sub">{{ t.descripcion }}</p>
            </td>
            <td>{{ t.activo ? 'Activo' : 'Inactivo' }}</td>
            <td>
              <button type="button" class="btn-ghost" @click="editType(t)">Editar</button>
              <button v-if="t.activo" type="button" class="btn-ghost danger" @click="deactivateType(t)">
                Desactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Plantillas -->
    <section v-if="tab === 'plantillas'" class="section">
      <form class="panel" @submit.prevent="saveTemplate">
        <h2>{{ tplForm.id ? 'Editar plantilla' : 'Nueva plantilla' }}</h2>
        <div class="row2">
          <label
            >Tipo
            <select v-model="tplForm.communicationType" class="input" required :disabled="!!tplForm.id">
              <option value="" disabled>Elegí…</option>
              <option v-for="t in activeTypes" :key="t.codigo" :value="t.codigo">{{ t.nombre }}</option>
            </select>
          </label>
          <label
            >Canal
            <select v-model="tplForm.channel" class="input" required :disabled="!!tplForm.id">
              <option v-for="c in channels" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>
        <label>Nombre <input v-model="tplForm.nombre" class="input" maxlength="160" /></label>
        <label v-if="tplForm.channel === 'email'"
          >Asunto <input v-model="tplForm.subject" class="input" maxlength="200"
        /></label>
        <label
          >Cuerpo
          <textarea v-model="tplForm.body" class="input" rows="6" required placeholder="Hola {{nombre}}…"
        /></label>
        <p class="muted">
          Placeholders:
          <code v-for="p in placeholders" :key="p">{{ '{' + '{' + p + '}' + '}' }}</code>
        </p>

        <div class="ai-box">
          <label
            >Generar con IA
            <textarea
              v-model="aiPrompt"
              class="input"
              rows="2"
              placeholder="Ej: recordatorio amable de completar el legajo digital"
            />
          </label>
          <button type="button" class="btn-ghost" :disabled="!aiConfigured || aiBusy" @click="generateAi">
            {{ aiBusy ? 'Generando…' : 'Generar plantilla' }}
          </button>
        </div>

        <div class="footer">
          <button v-if="tplForm.id" type="button" class="btn-ghost" @click="resetTplForm">Cancelar</button>
          <button type="submit" class="btn-primary">{{ tplForm.id ? 'Guardar' : 'Crear' }}</button>
        </div>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Canal</th>
            <th>Nombre / asunto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in templates" :key="t.id">
            <td>{{ t.communicationType }}</td>
            <td>{{ t.channel }}</td>
            <td>
              <strong>{{ t.nombre || t.subject || '—' }}</strong>
              <p class="sub">{{ (t.body || '').slice(0, 80) }}…</p>
            </td>
            <td>
              <button type="button" class="btn-ghost" @click="editTemplate(t)">Editar</button>
              <button type="button" class="btn-ghost" @click="useInWizard(t)">Usar en envío</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Asistente / wizard -->
    <section v-if="tab === 'enviar'" class="section wizard">
      <ol class="steps">
        <li :class="{ on: wizStep === 1 }">1. Tipo y canal</li>
        <li :class="{ on: wizStep === 2 }">2. Destinatarios</li>
        <li :class="{ on: wizStep === 3 }">3. Preview y enviar</li>
      </ol>

      <div v-if="wizStep === 1" class="panel">
        <label
          >Tipo
          <select v-model="wiz.type" class="input" @change="onWizTypeChange">
            <option value="" disabled>Elegí…</option>
            <option v-for="t in activeTypes" :key="t.codigo" :value="t.codigo">{{ t.nombre }}</option>
          </select>
        </label>
        <label
          >Canal
          <select v-model="wiz.channel" class="input" @change="onWizTypeChange">
            <option v-for="c in channels" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label
          >Plantilla
          <select v-model="wiz.templateId" class="input">
            <option value="" disabled>Elegí…</option>
            <option v-for="t in wizTemplates" :key="t.id" :value="t.id">
              {{ t.nombre || t.subject || t.id }}
            </option>
          </select>
        </label>
        <label
          >URLs de adjuntos (opcional, una por línea)
          <textarea v-model="wiz.attachmentsRaw" class="input" rows="2" placeholder="https://…"
        /></label>
        <button type="button" class="btn-primary" :disabled="!wiz.templateId" @click="wizStep = 2">
          Siguiente
        </button>
      </div>

      <div v-if="wizStep === 2" class="panel">
        <label
          >Buscar miembros
          <input v-model="recipientQ" class="input" placeholder="Nombre o email" @input="searchRecipients" />
        </label>
        <div class="recipients">
          <label v-for="r in recipients" :key="r.id" class="check">
            <input type="checkbox" :value="r.id" v-model="wiz.userIds" />
            {{ r.label }}
            <span class="sub">{{ r.email || r.telefono || '—' }}</span>
          </label>
        </div>
        <p class="muted">{{ wiz.userIds.length }} seleccionados</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="wizStep = 1">Atrás</button>
          <button type="button" class="btn-primary" :disabled="!wiz.userIds.length" @click="goPreview">
            Preview
          </button>
        </div>
      </div>

      <div v-if="wizStep === 3" class="panel">
        <h2>Vista previa</h2>
        <p v-if="preview?.subject"><strong>Asunto:</strong> {{ preview.subject }}</p>
        <pre class="preview">{{ preview?.body }}</pre>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="wizStep = 2">Atrás</button>
          <button type="button" class="btn-primary" :disabled="sendBusy" @click="sendBulk">
            {{ sendBusy ? 'Enviando…' : `Enviar a ${wiz.userIds.length}` }}
          </button>
        </div>
      </div>
    </section>

    <!-- Outbox -->
    <section v-if="tab === 'outbox'" class="section">
      <div class="filters">
        <select v-model="outFilter.channel" class="input" @change="loadOutbox">
          <option value="">Todos los canales</option>
          <option v-for="c in channels" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="outFilter.status" class="input" @change="loadOutbox">
          <option value="">Todos los estados</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
          <option value="pending">pending</option>
          <option value="delivered">delivered</option>
        </select>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Canal</th>
            <th>Destinatario</th>
            <th>Asunto</th>
            <th>Estado</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in outbox" :key="c.id">
            <td>{{ fmtDate(c.sentAt || c.createdAt) }}</td>
            <td>{{ c.channel }}</td>
            <td>
              {{ c.recipientName || c.recipient }}
              <p class="sub">{{ c.recipient }}</p>
            </td>
            <td>{{ c.subject || '—' }}</td>
            <td>
              <span class="badge" :class="c.status">{{ c.status }}</span>
            </td>
            <td class="sub">{{ c.errorMessage || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!outbox.length" class="muted">Sin envíos todavía.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const tabs = [
  { id: 'tipos', label: 'Tipos' },
  { id: 'plantillas', label: 'Plantillas' },
  { id: 'enviar', label: 'Enviar' },
  { id: 'outbox', label: 'Outbox' },
]

const tab = ref('tipos')
const busy = ref(false)
const error = ref('')
const okMsg = ref('')
const types = ref([])
const templates = ref([])
const outbox = ref([])
const recipients = ref([])
const channels = ref(['email', 'whatsapp', 'sms'])
const placeholders = ref([])
const health = ref(null)
const aiConfigured = ref(false)
const aiPrompt = ref('')
const aiBusy = ref(false)
const sendBusy = ref(false)
const preview = ref(null)
const recipientQ = ref('')
const wizStep = ref(1)

const typeForm = reactive({ id: '', codigo: '', nombre: '', descripcion: '' })
const tplForm = reactive({
  id: '',
  communicationType: '',
  channel: 'email',
  nombre: '',
  subject: '',
  body: '',
})
const wiz = reactive({
  type: '',
  channel: 'email',
  templateId: '',
  userIds: [],
  attachmentsRaw: '',
})
const outFilter = reactive({ channel: '', status: '' })

const activeTypes = computed(() => types.value.filter((t) => t.activo))
const wizTemplates = computed(() =>
  templates.value.filter(
    (t) => t.communicationType === wiz.type && t.channel === wiz.channel && t.activo !== false,
  ),
)

function flash(msg) {
  okMsg.value = msg
  setTimeout(() => {
    if (okMsg.value === msg) okMsg.value = ''
  }, 3500)
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('es-AR')
  } catch {
    return String(d)
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/communications/metadata')
  channels.value = data.channels || channels.value
  placeholders.value = data.placeholders || []
  health.value = data.health
  aiConfigured.value = Boolean(data.aiConfigured)
}

async function loadTypes() {
  const { data } = await api.get('/admin/communications/types')
  types.value = data.types || []
}

async function loadTemplates() {
  const { data } = await api.get('/admin/communications/templates')
  templates.value = data.templates || []
}

async function loadOutbox() {
  const params = {}
  if (outFilter.channel) params.channel = outFilter.channel
  if (outFilter.status) params.status = outFilter.status
  const { data } = await api.get('/admin/communications', { params })
  outbox.value = data.communications || []
  if (data.health) health.value = data.health
}

async function reloadAll() {
  busy.value = true
  error.value = ''
  try {
    await loadMeta()
    await Promise.all([loadTypes(), loadTemplates(), loadOutbox()])
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

function resetTypeForm() {
  typeForm.id = ''
  typeForm.codigo = ''
  typeForm.nombre = ''
  typeForm.descripcion = ''
}

function editType(t) {
  typeForm.id = t.id
  typeForm.codigo = t.codigo
  typeForm.nombre = t.nombre
  typeForm.descripcion = t.descripcion || ''
}

async function saveType() {
  error.value = ''
  try {
    if (typeForm.id) {
      await api.put(`/admin/communications/types/${typeForm.id}`, {
        nombre: typeForm.nombre,
        descripcion: typeForm.descripcion,
      })
    } else {
      await api.post('/admin/communications/types', { ...typeForm })
    }
    resetTypeForm()
    await loadTypes()
    flash('Tipo guardado')
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function deactivateType(t) {
  try {
    await api.delete(`/admin/communications/types/${t.id}`)
    await loadTypes()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function resetTplForm() {
  tplForm.id = ''
  tplForm.communicationType = activeTypes.value[0]?.codigo || ''
  tplForm.channel = 'email'
  tplForm.nombre = ''
  tplForm.subject = ''
  tplForm.body = ''
}

function editTemplate(t) {
  tplForm.id = t.id
  tplForm.communicationType = t.communicationType
  tplForm.channel = t.channel
  tplForm.nombre = t.nombre || ''
  tplForm.subject = t.subject || ''
  tplForm.body = t.body || ''
  tab.value = 'plantillas'
}

async function saveTemplate() {
  error.value = ''
  try {
    if (tplForm.id) {
      await api.put(`/admin/communications/templates/${tplForm.id}`, {
        nombre: tplForm.nombre,
        subject: tplForm.subject,
        body: tplForm.body,
      })
    } else {
      await api.post('/admin/communications/templates', { ...tplForm })
    }
    resetTplForm()
    await loadTemplates()
    flash('Plantilla guardada')
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function generateAi() {
  aiBusy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/communications/generate-template', {
      prompt: aiPrompt.value,
      communicationType: tplForm.communicationType,
      channel: tplForm.channel,
    })
    tplForm.subject = data.subject || tplForm.subject
    tplForm.body = data.body || tplForm.body
    flash('Plantilla generada — revisá y guardá')
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    aiBusy.value = false
  }
}

function useInWizard(t) {
  wiz.type = t.communicationType
  wiz.channel = t.channel
  wiz.templateId = t.id
  wizStep.value = 1
  tab.value = 'enviar'
}

function onWizTypeChange() {
  wiz.templateId = ''
}

let searchTimer
function searchRecipients() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/admin/communications/recipients', {
        params: { q: recipientQ.value },
      })
      recipients.value = data.recipients || []
    } catch (e) {
      error.value = e.response?.data?.error || e.message
    }
  }, 250)
}

async function goPreview() {
  error.value = ''
  try {
    const { data } = await api.post('/admin/communications/preview', {
      templateId: wiz.templateId,
      userId: wiz.userIds[0],
    })
    preview.value = data
    wizStep.value = 3
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function sendBulk() {
  sendBusy.value = true
  error.value = ''
  try {
    const attachmentUrls = wiz.attachmentsRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const { data } = await api.post('/admin/communications/send-bulk', {
      communicationType: wiz.type,
      channel: wiz.channel,
      templateId: wiz.templateId,
      userIds: wiz.userIds,
      attachmentUrls,
    })
    flash(`Enviado: ${data.summary?.sent || 0} · fallidos: ${data.summary?.failed || 0}`)
    wizStep.value = 1
    wiz.userIds = []
    tab.value = 'outbox'
    await loadOutbox()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    sendBusy.value = false
  }
}

watch(tab, (v) => {
  if (v === 'outbox') loadOutbox()
  if (v === 'enviar' && !recipients.value.length) searchRecipients()
})

onMounted(async () => {
  await reloadAll()
  resetTplForm()
})
</script>

<style scoped>
.page {
  max-width: none;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.page-head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.55rem;
}
.page-head p {
  margin: 0;
  color: var(--ink-soft);
  max-width: 42rem;
}
.health {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.health span {
  font-size: 0.75rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
}
.health span.on {
  background: #ccfbf1;
  color: var(--ok);
}
.tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.tabs button {
  border: 1px solid var(--line);
  background: var(--panel);
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.9rem;
}
.tabs button.on {
  background: var(--ok);
  color: #fff;
  border-color: var(--ok);
}
.section {
  display: grid;
  gap: 1rem;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
}
.panel h2 {
  margin: 0;
  font-size: 1.05rem;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--ink);
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  font: inherit;
}
.footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
.btn-primary,
.btn-ghost {
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font: inherit;
  cursor: pointer;
}
.btn-primary {
  background: var(--ok);
  color: #fff;
  border: none;
}
.btn-ghost {
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.btn-ghost.danger {
  color: var(--bad);
}
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.table th,
.table td {
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--panel-2);
  vertical-align: top;
  font-size: 0.9rem;
}
.table th {
  background: var(--panel-2);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.sub {
  margin: 0.15rem 0 0;
  color: var(--ink-faint);
  font-size: 0.8rem;
}
.err {
  color: var(--bad);
  background: var(--bad-bg);
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
}
.ok {
  color: var(--ok);
  background: #f0fdfa;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
}
.muted {
  color: var(--ink-faint);
  font-size: 0.85rem;
}
.muted code {
  margin-right: 0.35rem;
  background: var(--panel-2);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
.ai-box {
  border-top: 1px dashed var(--line);
  padding-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
}
.steps {
  display: flex;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--ink-faint);
}
.steps li.on {
  color: var(--ok);
  font-weight: 700;
}
.recipients {
  max-height: 280px;
  overflow: auto;
  display: grid;
  gap: 0.35rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.5rem;
}
.check {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  grid-template-columns: none;
}
.preview {
  white-space: pre-wrap;
  background: var(--panel-2);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.9rem;
}
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--line);
}
.badge.sent,
.badge.delivered,
.badge.read {
  background: #ccfbf1;
  color: var(--ok);
}
.badge.failed {
  background: var(--bad-bg);
  color: var(--bad);
}
.badge.pending {
  background: var(--warn-bg);
  color: var(--warn);
}
@media (max-width: 720px) {
  .row2 {
    grid-template-columns: 1fr;
  }
  .page-head {
    flex-direction: column;
  }
}
</style>
