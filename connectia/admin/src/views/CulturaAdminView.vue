<template>
  <div ref="pageEl" class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Cultura empresarial</h1>
        <p>Valores, reconocimientos, marketplace, referidos y pulso organizacional.</p>
        <ScreenHelp
          purpose="Administración del módulo de cultura §39: valores, moderación y campañas de pulso."
          can-do="Sembrar demo, ABM de valores, ocultar avisos, gestionar referidos y ver resultados eNPS."
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

    <!-- Valores -->
    <section v-if="tab === 'valores'" class="section">
      <form class="panel" @submit.prevent="saveValue">
        <h2>{{ valueForm.id ? 'Editar valor' : 'Nuevo valor' }}</h2>
        <label>Nombre<input v-model="valueForm.nombre" class="input" required /></label>
        <label>Descripción<textarea v-model="valueForm.descripcion" class="input" rows="2" /></label>
        <label>Color<input v-model="valueForm.color" type="color" class="input color" /></label>
        <label>Orden<input v-model.number="valueForm.orden" type="number" class="input" /></label>
        <label class="check"><input v-model="valueForm.activo" type="checkbox" /> Activo</label>
        <div class="footer">
          <button v-if="valueForm.id" type="button" class="btn-ghost" @click="resetValueForm">Cancelar</button>
          <button type="submit" class="btn-primary">{{ valueForm.id ? 'Guardar' : 'Crear' }}</button>
        </div>
      </form>
      <table class="table">
        <thead><tr><th>Valor</th><th>Orden</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          <tr v-for="v in values" :key="v.id">
            <td>
              <span class="dot" :style="{ background: v.color }" />
              <strong>{{ v.nombre }}</strong>
              <p class="sub">{{ v.descripcion }}</p>
            </td>
            <td>{{ v.orden }}</td>
            <td>{{ v.activo ? 'Activo' : 'Inactivo' }}</td>
            <td><button type="button" class="btn-ghost" @click="editValue(v)">Editar</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Reconocimientos -->
    <section v-if="tab === 'reconocimientos'" class="section">
      <table class="table">
        <thead><tr><th>De</th><th>Para</th><th>Valor</th><th>Mensaje</th><th>Fecha</th></tr></thead>
        <tbody>
          <tr v-for="r in recognitions" :key="r.id">
            <td>{{ r.fromName }}</td>
            <td>{{ r.toName }}</td>
            <td>{{ r.valueName || '—' }}</td>
            <td>{{ r.mensaje }}</td>
            <td>{{ fmtDate(r.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!recognitions.length" class="muted">Sin reconocimientos.</p>
    </section>

    <!-- Marketplace -->
    <section v-if="tab === 'marketplace'" class="section">
      <table class="table">
        <thead><tr><th>Título</th><th>Autor</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in listings" :key="l.id">
            <td>
              <strong>{{ l.titulo }}</strong>
              <p class="sub">{{ l.descripcion }}</p>
            </td>
            <td>{{ l.authorName }}</td>
            <td><span class="pill" :data-st="l.status">{{ l.status }}</span></td>
            <td>
              <button v-if="l.status !== 'hidden'" type="button" class="btn-ghost danger" @click="hideListing(l)">
                Ocultar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Referidos -->
    <section v-if="tab === 'referidos'" class="section">
      <table class="table">
        <thead><tr><th>Candidato</th><th>Referente</th><th>Estado</th><th>Recompensa</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in referrals" :key="r.id">
            <td>
              <strong>{{ r.candidateName }}</strong>
              <p class="sub">{{ r.vacancyTitle || 'Sin vacante' }}</p>
            </td>
            <td>{{ r.referrerName }}</td>
            <td>
              <select v-model="r._status" class="input inline">
                <option v-for="s in referralStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td>
              <label class="check">
                <input v-model="r._rewardGranted" type="checkbox" /> Otorgada
              </label>
            </td>
            <td><button type="button" class="btn-ghost" @click="saveReferral(r)">Guardar</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Pulso -->
    <section v-if="tab === 'pulso'" class="section">
      <form class="panel" @submit.prevent="savePulse">
        <h2>{{ pulseForm.id ? 'Editar campaña' : 'Nueva campaña' }}</h2>
        <label>Nombre<input v-model="pulseForm.nombre" class="input" required /></label>
        <label>Descripción<textarea v-model="pulseForm.descripcion" class="input" rows="2" /></label>
        <label>Inicio<input v-model="pulseForm.startsAt" type="date" class="input" required /></label>
        <label>Fin<input v-model="pulseForm.endsAt" type="date" class="input" required /></label>
        <label>Pregunta eNPS<textarea v-model="pulseForm.questionText" class="input" rows="2" required /></label>
        <label>Umbral anonimato<input v-model.number="pulseForm.anonymityThreshold" type="number" min="1" class="input" /></label>
        <label>Estado
          <select v-model="pulseForm.status" class="input">
            <option value="draft">Borrador</option>
            <option value="active">Activa</option>
            <option value="closed">Cerrada</option>
          </select>
        </label>
        <div class="footer">
          <button v-if="pulseForm.id" type="button" class="btn-ghost" @click="resetPulseForm">Cancelar</button>
          <button type="submit" class="btn-primary">{{ pulseForm.id ? 'Guardar' : 'Crear' }}</button>
        </div>
      </form>
      <table class="table">
        <thead><tr><th>Campaña</th><th>Estado</th><th>Período</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in pulseCampaigns" :key="c.id">
            <td>{{ c.nombre }}</td>
            <td><span class="pill" :data-st="c.status">{{ c.status }}</span></td>
            <td>{{ fmtDate(c.startsAt) }} – {{ fmtDate(c.endsAt) }}</td>
            <td class="actions">
              <button type="button" class="btn-ghost" @click="editPulse(c)">Editar</button>
              <button type="button" class="btn-ghost" @click="loadResults(c.id)">Ver resultados</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="pulseResults" class="sheet" @click.self="pulseResults = null">
      <div class="panel editor">
        <header class="res-head">
          <div>
            <h2>Resultados — {{ pulseResults.campaign?.nombre }}</h2>
            <p>{{ pulseResults.results?.n ?? 0 }} respuestas</p>
          </div>
          <button type="button" class="btn-ghost" @click="pulseResults = null">Cerrar</button>
        </header>
        <p v-if="!pulseResults.results?.visible" class="hint">{{ pulseResults.results?.reason }}</p>
        <template v-else>
          <p v-if="pulseResults.results.enps != null" class="enps">
            eNPS: <strong>{{ pulseResults.results.enps }}</strong>
          </p>
          <div v-for="(t, i) in pulseResults.results.openThemes || []" :key="i">
            <h3>{{ t.question }}</h3>
            <ul class="list">
              <li v-for="txt in t.texts" :key="txt">{{ txt }}</li>
            </ul>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const pageEl = ref(null)
const tab = ref('valores')
const tabs = [
  { id: 'valores', label: 'Valores' },
  { id: 'reconocimientos', label: 'Reconocimientos' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'referidos', label: 'Referidos' },
  { id: 'pulso', label: 'Pulso' },
]
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const values = ref([])
const valueForm = ref(emptyValue())

const recognitions = ref([])
const listings = ref([])
const referrals = ref([])
const referralStatuses = ref(['submitted', 'reviewing', 'interview', 'hired', 'rejected', 'rewarded'])

const pulseCampaigns = ref([])
const pulseForm = ref(emptyPulse())
const pulseResults = ref(null)

function emptyValue() {
  return { id: '', nombre: '', descripcion: '', color: 'var(--brand-primary)', orden: 100, activo: true }
}

function emptyPulse() {
  return {
    id: '',
    nombre: '',
    descripcion: '',
    startsAt: '',
    endsAt: '',
    questionText: '¿Qué tan probable es que recomiendes trabajar acá?',
    anonymityThreshold: 5,
    status: 'draft',
  }
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return '' }
}

function toIsoDate(d) {
  return d ? new Date(d).toISOString() : null
}

async function seedDefaults() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/admin/culture/seed-defaults')
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
    if (tab.value === 'valores') {
      const { data } = await api.get('/admin/culture/values')
      values.value = data.items || []
    } else if (tab.value === 'reconocimientos') {
      const { data } = await api.get('/admin/culture/recognitions')
      recognitions.value = data.items || []
    } else if (tab.value === 'marketplace') {
      const { data } = await api.get('/admin/culture/marketplace')
      listings.value = data.items || []
    } else if (tab.value === 'referidos') {
      const [meta, list] = await Promise.all([
        api.get('/admin/culture/meta').catch(() => ({ data: {} })),
        api.get('/admin/culture/referrals'),
      ])
      if (meta.data.referralStatuses?.length) referralStatuses.value = meta.data.referralStatuses
      referrals.value = (list.data.items || []).map((r) => ({
        ...r,
        _status: r.status,
        _rewardGranted: r.rewardGranted,
      }))
    } else if (tab.value === 'pulso') {
      const { data } = await api.get('/admin/culture/pulse')
      pulseCampaigns.value = data.items || []
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar'
  }
}

function editValue(v) {
  valueForm.value = { id: v.id, nombre: v.nombre, descripcion: v.descripcion || '', color: v.color || 'var(--brand-primary)', orden: v.orden ?? 100, activo: v.activo !== false }
}

function resetValueForm() {
  valueForm.value = emptyValue()
}

async function saveValue() {
  try {
    const payload = {
      nombre: valueForm.value.nombre.trim(),
      descripcion: valueForm.value.descripcion,
      color: valueForm.value.color,
      orden: valueForm.value.orden,
      activo: valueForm.value.activo,
    }
    if (valueForm.value.id) await api.patch(`/admin/culture/values/${valueForm.value.id}`, payload)
    else await api.post('/admin/culture/values', payload)
    resetValueForm()
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function hideListing(l) {
  if (!confirm('¿Ocultar este aviso?')) return
  try {
    await api.patch(`/admin/culture/marketplace/${l.id}`, { status: 'hidden' })
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ocultar'
  }
}

async function saveReferral(r) {
  try {
    await api.patch(`/admin/culture/referrals/${r.id}`, {
      status: r._status,
      rewardGranted: r._rewardGranted,
    })
    okMsg.value = 'Referido actualizado'
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

function editPulse(c) {
  const enpsQ = c.questions?.find((q) => q.tipo === 'enps')
  pulseForm.value = {
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion || '',
    startsAt: c.startsAt ? c.startsAt.slice(0, 10) : '',
    endsAt: c.endsAt ? c.endsAt.slice(0, 10) : '',
    questionText: enpsQ?.texto || '¿Qué tan probable es que recomiendes trabajar acá?',
    anonymityThreshold: c.anonymityThreshold ?? 5,
    status: c.status,
  }
}

function resetPulseForm() {
  pulseForm.value = emptyPulse()
}

async function savePulse() {
  try {
    const payload = {
      nombre: pulseForm.value.nombre.trim(),
      descripcion: pulseForm.value.descripcion,
      startsAt: toIsoDate(pulseForm.value.startsAt),
      endsAt: toIsoDate(pulseForm.value.endsAt),
      anonymityThreshold: pulseForm.value.anonymityThreshold,
      status: pulseForm.value.status,
      audience: { mode: 'all' },
      questions: [{ tipo: 'enps', texto: pulseForm.value.questionText.trim() }],
    }
    if (pulseForm.value.id) await api.patch(`/admin/culture/pulse/${pulseForm.value.id}`, payload)
    else await api.post('/admin/culture/pulse', payload)
    resetPulseForm()
    await loadTab()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function loadResults(id) {
  try {
    const { data } = await api.get(`/admin/culture/pulse/${id}/results`)
    pulseResults.value = data
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar resultados'
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
.panel { border: 1px solid var(--line); border-radius: 12px; padding: 16px; background: var(--panel); display: grid; gap: 10px; }
.panel.editor { width: min(640px, 100%); max-height: 90vh; overflow: auto; }
.table { width: 100%; border-collapse: collapse; background: var(--panel); border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid var(--line); font-size: 0.9rem; vertical-align: middle; }
.sub { margin: 4px 0 0; font-size: 0.75rem; color: var(--ink-soft); font-weight: 400; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.input { width: 100%; box-sizing: border-box; border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
.input.inline { width: auto; margin: 0; }
.input.color { height: 40px; padding: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.footer { display: flex; justify-content: flex-end; gap: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.btn-ghost.danger { color: var(--bad); }
.pill { display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: var(--line); }
.pill[data-st='published'], .pill[data-st='active'] { background: var(--ok-bg); color: var(--ok); }
.pill[data-st='hidden'] { background: var(--bad-bg); color: var(--bad); }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 6px; vertical-align: middle; }
.sheet { position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 45%, transparent); display: grid; place-items: center; z-index: 40; padding: 12px; }
.res-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.res-head h2 { margin: 0; }
.hint { color: var(--ink-soft); font-size: 0.9rem; }
.enps { font-size: 1.2rem; }
.list { margin: 0; padding-left: 1.1rem; }
.err { color: var(--bad); }
.ok { color: var(--ok); }
.muted { color: var(--ink-soft); }
</style>
