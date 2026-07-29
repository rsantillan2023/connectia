<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Eventos</h1>
        <p class="text-sm text-slate-500 mt-1">
          Agenda corporativa, RSVP y reporte de confirmaciones. Timezone: {{ timezone }}
        </p>
        <ScreenHelp
          purpose="ABM de eventos del tenant visibles en Agenda (app) con confirmación de asistencia."
          can-do="Crear/editar/publicar eventos, segmentar audiencia, ver confirmados y enviar email."
        />
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          type="button"
          class="rounded-lg border border-teal-700 text-teal-800 px-4 py-2 text-sm font-medium bg-white"
          @click="showAi = !showAi"
        >
          {{ showAi ? 'Ocultar IA' : 'Crear con IA' }}
        </button>
        <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
          + Evento
        </button>
      </div>
    </div>

    <section v-if="showAi" class="ai-panel mt-4">
      <h2 class="ai-title">IA — redactar o extraer evento</h2>
      <p class="ai-hint">
        Describí el objetivo (“town hall de planta, 80 personas, Arroyito”) o pegá un mail. La IA arma el borrador; vos confirmás.
      </p>
      <p v-if="!aiConfigured" class="ai-warn">
        Sin API de IA configurada: igual funciona con heurística local.
      </p>
      <label class="ai-label">
        Objetivo o texto
        <textarea v-model="aiPrompt" class="input" rows="3" placeholder="Ej: Capacitación de seguridad industrial para 40 operarios en planta Arroyito la próxima semana" />
      </label>
      <label class="check">
        <input v-model="aiExtract" type="checkbox" />
        Extraer desde mail / texto (no inventar objetivo)
      </label>
      <div class="ai-actions">
        <button type="button" class="btn-primary" :disabled="aiBusy || !aiPrompt.trim()" @click="runAiDraft">
          {{ aiBusy ? 'Generando…' : 'Generar borrador' }}
        </button>
        <button type="button" class="btn-ghost" :disabled="aiBusy" @click="runSuggestSlots">
          Sugerir horarios libres
        </button>
      </div>
      <ul v-if="aiSlots.length" class="ai-slots">
        <li v-for="(s, i) in aiSlots" :key="i">
          <button type="button" class="link" @click="applyAiSlot(s)">{{ s.label }}</button>
        </li>
      </ul>
      <p v-if="aiNotes" class="hint">{{ aiNotes }}</p>
    </section>

    <div class="filters mt-4">
      <input v-model="q" class="input" placeholder="Buscar por título…" @keyup.enter="load" />
      <select v-model="statusFilter" class="input" @change="load">
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="published">Publicado</option>
        <option value="cancelled">Cancelado</option>
      </select>
      <button type="button" class="btn-ghost" @click="load">Buscar</button>
    </div>

    <p v-if="error" class="err mt-3">{{ error }}</p>
    <p v-if="loading" class="text-slate-500 mt-4">Cargando…</p>

    <div v-else class="table-wrap mt-4">
      <table class="table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Inicio</th>
            <th>Estado</th>
            <th>RSVP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in items" :key="e.id">
            <td>
              <strong>{{ e.titulo }}</strong>
              <div class="sub">{{ e.tipoLabel }}{{ e.lugar ? ` · ${e.lugar}` : '' }}</div>
            </td>
            <td class="nowrap">{{ fmt(e.inicio) }}</td>
            <td><span class="badge" :class="e.status">{{ statusLabel(e.status) }}</span></td>
            <td>{{ e.rsvpConfirmados || 0 }} conf. / {{ e.rsvpRechazados || 0 }} rech.</td>
            <td class="actions">
              <button type="button" class="link" @click="openEdit(e)">Editar</button>
              <button type="button" class="link" @click="openRsvps(e)">Confirmaciones</button>
              <button
                v-if="e.status !== 'published'"
                type="button"
                class="link"
                @click="publish(e)"
              >
                Publicar
              </button>
              <button type="button" class="link danger" @click="remove(e)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="text-slate-500 p-4">No hay eventos. Creá el primero.</p>
    </div>

    <!-- Formulario -->
    <div v-if="draft" class="modal">
      <form class="panel" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar evento' : 'Nuevo evento' }}</h2>
        <label>Título
          <input v-model="draft.titulo" class="input" required maxlength="200" />
        </label>
        <label>Descripción
          <textarea v-model="draft.descripcion" class="input" rows="4" />
        </label>
        <div class="row">
          <label>Tipo
            <select v-model="draft.tipo" class="input">
              <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </label>
          <label>Estado
            <select v-model="draft.status" class="input">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label>Inicio
            <input v-model="draft.inicioLocal" type="datetime-local" class="input" required />
          </label>
          <label>Fin
            <input v-model="draft.finLocal" type="datetime-local" class="input" required />
          </label>
        </div>
        <label class="check"><input v-model="draft.allDay" type="checkbox" /> Todo el día</label>
        <div class="row">
          <label>Lugar
            <input v-model="draft.lugar" class="input" />
          </label>
          <label>Cupo (vacío = ilimitado)
            <input v-model="draft.cupo" type="number" min="1" class="input" />
          </label>
        </div>
        <label>Imagen
          <div class="row">
            <input v-model="draft.imageUrl" class="input" placeholder="URL o subí un archivo" />
            <label class="btn-ghost file-btn">
              Subir
              <input type="file" accept="image/*" hidden @change="onImageFile" />
            </label>
          </div>
          <img v-if="draft.imageUrl" :src="draft.imageUrl" alt="" class="preview" />
        </label>
        <label>Multimedia (URLs, una por línea)
          <textarea v-model="draft.mediaText" class="input" rows="2" placeholder="https://…|nombre" />
        </label>
        <button type="button" class="btn-ghost" :disabled="slotsBusy" @click="runSuggestSlotsForDraft">
          {{ slotsBusy ? 'Buscando huecos…' : 'Sugerir horario sin choques' }}
        </button>
        <ul v-if="aiSlots.length && draft" class="ai-slots">
          <li v-for="(s, i) in aiSlots" :key="i">
            <button type="button" class="link" @click="applyAiSlot(s)">Usar {{ s.label }}</button>
          </li>
        </ul>

        <section class="block">
          <strong>Audiencia</strong>
          <div class="audience-modes">
            <button type="button" class="mode" :class="{ on: draft.audience.mode === 'all' }" @click="draft.audience.mode = 'all'">
              Toda la comunidad
            </button>
            <button type="button" class="mode" :class="{ on: draft.audience.mode === 'restricted' }" @click="draft.audience.mode = 'restricted'">
              Áreas y/o grupos
            </button>
          </div>
          <div v-if="draft.audience.mode === 'restricted'" class="audience-picks">
            <div>
              <p class="pick-title">Áreas</p>
              <label v-for="a in areas" :key="a.id" class="check">
                <input v-model="draft.audience.areaIds" type="checkbox" :value="a.id" />
                {{ a.nombre }}
              </label>
            </div>
            <div>
              <p class="pick-title">Grupos</p>
              <label v-for="g in groups" :key="g.id" class="check">
                <input v-model="draft.audience.groupIds" type="checkbox" :value="g.id" />
                {{ g.nombre }}
              </label>
            </div>
          </div>
        </section>

        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        </div>
        <p v-if="formError" class="err">{{ formError }}</p>
      </form>
    </div>

    <!-- Reporte RSVP -->
    <div v-if="rsvpPanel" class="modal">
      <div class="panel wide">
        <h2>Confirmaciones — {{ rsvpPanel.event.titulo }}</h2>
        <p class="hint">
          {{ rsvpPanel.totals.confirmados }} confirmados · {{ rsvpPanel.totals.rechazados }} rechazados
        </p>
        <div class="filters">
          <select v-model="rsvpEstado" class="input" @change="reloadRsvps">
            <option value="">Todos</option>
            <option value="confirmado">Confirmados</option>
            <option value="rechazado">Rechazados</option>
          </select>
          <button type="button" class="btn-ghost" @click="exportCsv">Exportar CSV</button>
          <button type="button" class="btn-primary" :disabled="notifyBusy" @click="notifyConfirmados">
            {{ notifyBusy ? 'Enviando…' : 'Email a confirmados' }}
          </button>
        </div>
        <p v-if="notifyMsg" class="ok">{{ notifyMsg }}</p>
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rsvpPanel.items" :key="r.id">
              <td>{{ r.nombre || r.usuario }}</td>
              <td>{{ r.email }}</td>
              <td>{{ r.estado }}</td>
              <td class="nowrap">{{ fmt(r.confirmedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="rsvpPanel = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const statusFilter = ref('')
const timezone = ref('America/Argentina/Buenos_Aires')
const tipos = ref([])
const draft = ref(null)
const saving = ref(false)
const formError = ref('')
const areas = ref([])
const groups = ref([])
const rsvpPanel = ref(null)
const rsvpEstado = ref('confirmado')
const notifyBusy = ref(false)
const notifyMsg = ref('')
const showAi = ref(false)
const aiPrompt = ref('')
const aiExtract = ref(false)
const aiBusy = ref(false)
const aiConfigured = ref(false)
const aiNotes = ref('')
const aiSlots = ref([])
const slotsBusy = ref(false)

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusLabel(s) {
  return { draft: 'Borrador', published: 'Publicado', cancelled: 'Cancelado' }[s] || s
}

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: timezone.value,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/events/meta')
  tipos.value = data.tipos || []
  if (data.timezone) timezone.value = data.timezone
  aiConfigured.value = !!data.aiConfigured
}

async function onImageFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/events/upload', fd)
    draft.value.imageUrl = data.url || data.urls?.[0] || ''
  } catch (err) {
    formError.value = err.response?.data?.error || 'No se pudo subir la imagen'
  } finally {
    e.target.value = ''
  }
}

async function runAiDraft() {
  aiBusy.value = true
  aiNotes.value = ''
  try {
    const { data } = await api.post('/admin/events/ai-draft', {
      prompt: aiPrompt.value,
      extract: aiExtract.value,
    })
    const d = data.draft
    openNew()
    draft.value.titulo = d.titulo || ''
    draft.value.descripcion = d.descripcion || ''
    draft.value.tipo = d.tipo || 'general'
    draft.value.lugar = d.lugar || ''
    draft.value.cupo = d.cupo ?? ''
    draft.value.inicioLocal = toLocalInput(d.inicio)
    draft.value.finLocal = toLocalInput(d.fin)
    draft.value.allDay = !!d.allDay
    aiNotes.value = `Fuente: ${d.source || 'heuristic'}`
    showAi.value = false
  } catch (e) {
    aiNotes.value = e.response?.data?.error || e.message
  } finally {
    aiBusy.value = false
  }
}

async function runSuggestSlots() {
  slotsBusy.value = true
  aiSlots.value = []
  try {
    const { data } = await api.post('/admin/events/ai-suggest-slots', { durationHours: 1 })
    aiSlots.value = data.slots || []
    aiNotes.value = aiSlots.value.length
      ? `${aiSlots.value.length} horarios libres (evita choques corporativos)`
      : 'Sin huecos libres en el rango'
  } catch (e) {
    aiNotes.value = e.response?.data?.error || e.message
  } finally {
    slotsBusy.value = false
  }
}

async function runSuggestSlotsForDraft() {
  await runSuggestSlots()
}

function applyAiSlot(s) {
  if (!draft.value) openNew()
  draft.value.inicioLocal = toLocalInput(s.inicio)
  draft.value.finLocal = toLocalInput(s.fin)
}

async function exportCsv() {
  if (!rsvpPanel.value) return
  try {
    const id = rsvpPanel.value.event.id
    const { data } = await api.get(`/admin/events/${id}/rsvps`, {
      params: { estado: rsvpEstado.value || undefined, format: 'csv' },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `rsvp-${id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    notifyMsg.value = e.response?.data?.error || e.message || 'No se pudo exportar'
  }
}

async function loadOrg() {
  try {
    const { data } = await api.get('/admin/org/options')
    areas.value = (data.areas || []).map((x) => ({
      id: String(x.id || x._id),
      nombre: x.nombre,
    }))
    groups.value = (data.groups || []).map((x) => ({
      id: String(x.id || x._id),
      nombre: x.nombre,
    }))
  } catch {
    areas.value = []
    groups.value = []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/events', {
      params: { q: q.value || undefined, status: statusFilter.value || undefined },
    })
    items.value = data.items || []
    if (data.timezone) timezone.value = data.timezone
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function openNew() {
  formError.value = ''
  const now = new Date()
  const end = new Date(now.getTime() + 60 * 60 * 1000)
  draft.value = {
    id: null,
    titulo: '',
    descripcion: '',
    tipo: 'general',
    status: 'draft',
    inicioLocal: toLocalInput(now.toISOString()),
    finLocal: toLocalInput(end.toISOString()),
    allDay: false,
    lugar: '',
    cupo: '',
    imageUrl: '',
    mediaText: '',
    audience: emptyAudience(),
  }
}

function openEdit(e) {
  formError.value = ''
  draft.value = {
    id: e.id,
    titulo: e.titulo,
    descripcion: e.descripcion || '',
    tipo: e.tipo || 'general',
    status: e.status,
    inicioLocal: toLocalInput(e.inicio),
    finLocal: toLocalInput(e.fin),
    allDay: !!e.allDay,
    lugar: e.lugar || '',
    cupo: e.cupo ?? '',
    imageUrl: e.imageUrl || '',
    mediaText: (e.media || []).map((m) => (m.nombre ? `${m.url}|${m.nombre}` : m.url)).join('\n'),
    audience: {
      mode: e.audience?.mode || 'all',
      areaIds: (e.audience?.areaIds || []).map(String),
      groupIds: (e.audience?.groupIds || []).map(String),
      userIds: (e.audience?.userIds || []).map(String),
    },
  }
}

function parseMedia(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, nombre] = line.split('|')
      return { url: url.trim(), nombre: (nombre || '').trim(), tipo: 'image' }
    })
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const body = {
      titulo: draft.value.titulo,
      descripcion: draft.value.descripcion,
      tipo: draft.value.tipo,
      status: draft.value.status,
      inicio: new Date(draft.value.inicioLocal).toISOString(),
      fin: new Date(draft.value.finLocal).toISOString(),
      allDay: draft.value.allDay,
      lugar: draft.value.lugar,
      cupo: draft.value.cupo === '' ? null : Number(draft.value.cupo),
      imageUrl: draft.value.imageUrl,
      media: parseMedia(draft.value.mediaText),
      audience: draft.value.audience,
    }
    if (draft.value.id) {
      await api.patch(`/admin/events/${draft.value.id}`, body)
    } else {
      await api.post('/admin/events', body)
    }
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function publish(e) {
  try {
    await api.patch(`/admin/events/${e.id}`, { status: 'published' })
    await load()
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  }
}

async function remove(e) {
  if (!confirm(`¿Eliminar «${e.titulo}»?`)) return
  try {
    await api.delete(`/admin/events/${e.id}`)
    await load()
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  }
}

async function openRsvps(e) {
  notifyMsg.value = ''
  rsvpEstado.value = 'confirmado'
  const { data } = await api.get(`/admin/events/${e.id}/rsvps`, {
    params: { estado: rsvpEstado.value || undefined },
  })
  rsvpPanel.value = data
}

async function reloadRsvps() {
  if (!rsvpPanel.value) return
  const id = rsvpPanel.value.event.id
  const { data } = await api.get(`/admin/events/${id}/rsvps`, {
    params: { estado: rsvpEstado.value || undefined },
  })
  rsvpPanel.value = data
}

async function notifyConfirmados() {
  if (!rsvpPanel.value) return
  notifyBusy.value = true
  notifyMsg.value = ''
  try {
    const { data } = await api.post(`/admin/events/${rsvpPanel.value.event.id}/rsvps/notify`, {
      onlyConfirmados: true,
      message: `Te recordamos tu asistencia a «${rsvpPanel.value.event.titulo}».`,
    })
    notifyMsg.value = `Enviados: ${data.ok || 0} · Fallidos: ${data.fail || 0}`
  } catch (e) {
    notifyMsg.value = e.response?.data?.error || e.message
  } finally {
    notifyBusy.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadMeta(), loadOrg(), load()])
})
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.input {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  font: inherit;
  min-width: 10rem;
}
.table-wrap {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.table th,
.table td {
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}
.sub {
  font-size: 0.78rem;
  color: #64748b;
}
.nowrap {
  white-space: nowrap;
}
.badge {
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #e2e8f0;
}
.badge.published {
  background: #ccfbf1;
  color: #0f766e;
}
.badge.draft {
  background: #f1f5f9;
}
.badge.cancelled {
  background: #fee2e2;
  color: #b91c1c;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.link {
  background: none;
  border: 0;
  color: #0f766e;
  cursor: pointer;
  font: inherit;
  padding: 0;
}
.link.danger {
  color: #b91c1c;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow: auto;
  z-index: 50;
}
.panel {
  background: #fff;
  border-radius: 0.85rem;
  padding: 1.25rem;
  width: min(560px, 100%);
  display: grid;
  gap: 0.65rem;
}
.panel.wide {
  width: min(720px, 100%);
}
.panel h2 {
  margin: 0;
  font-size: 1.15rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.block {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
}
.audience-modes {
  display: flex;
  gap: 0.4rem;
  margin: 0.4rem 0;
}
.mode {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.mode.on {
  border-color: #0f766e;
  background: #f0fdfa;
}
.audience-picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.pick-title {
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.btn-primary {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-ghost {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
}
.err {
  color: #b91c1c;
  font-size: 0.85rem;
}
.ok {
  color: #0f766e;
  font-size: 0.85rem;
}
.hint {
  color: #64748b;
  font-size: 0.85rem;
}
.ai-panel {
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  border-radius: 0.85rem;
  padding: 1rem;
}
.ai-title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}
.ai-hint,
.ai-warn {
  font-size: 0.85rem;
  color: #475569;
  margin: 0 0 0.5rem;
}
.ai-warn {
  color: #b45309;
}
.ai-label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}
.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.ai-slots {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.preview {
  margin-top: 0.4rem;
  max-height: 120px;
  border-radius: 0.5rem;
  object-fit: cover;
}
.file-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
}
</style>
