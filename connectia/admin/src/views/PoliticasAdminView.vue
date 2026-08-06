<template>
  <div ref="pageEl" class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Políticas y cumplimiento</h1>
        <p>Políticas versionadas con acuse · al publicar se indexan en la KB del asistente</p>
        <ScreenHelp
          purpose="Biblioteca de políticas corporativas con acuse auditado."
          can-do="Alta manual o con IA, bump de versión (invalida acuses), reporte de quién firmó / quién falta (CSV)."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" @click="openAiNew">Nueva política con IA</button>
        <button type="button" class="btn-primary" @click="openNew">Nueva política</button>
      </div>
    </header>
    <p v-if="!aiConfigured" class="hint">
      Sin API keys la generación usa reglas locales. Con OPENAI_API_KEY / ANTHROPIC_API_KEY mejora la
      calidad del texto.
    </p>
    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="aiPromptOpen" class="sheet" @click.self="aiPromptOpen = false">
      <form class="panel editor" @submit.prevent="runAiCreate">
        <h2>Nueva política con IA</h2>
        <p class="hint">
          Contá el tema, el tono, si debe exigir acuse y a quién aplica. La IA arma el formulario
          (código, título, resumen y cuerpo); después lo revisás y publicás.
        </p>
        <div class="audience-modes" style="max-width: 360px">
          <button type="button" class="mode" :class="{ on: createAiProvider === 'auto' }" @click="createAiProvider = 'auto'">Auto</button>
          <button type="button" class="mode" :class="{ on: createAiProvider === 'openai' }" @click="createAiProvider = 'openai'">OpenAI</button>
          <button type="button" class="mode" :class="{ on: createAiProvider === 'anthropic' }" @click="createAiProvider = 'anthropic'">Anthropic</button>
        </div>
        <label>Brief / prompt detallado
          <textarea
            v-model="aiCreatePrompt"
            rows="7"
            class="input"
            required
            placeholder="Ej. Política de higiene y manipulación de alimentos para locales de heladería. Tono formal claro, exige acuse, secciones de alcance, principios y responsabilidades."
            :disabled="aiCreateLoading"
          />
        </label>
        <div class="footer">
          <button type="button" class="btn-ghost" :disabled="aiCreateLoading" @click="aiPromptOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="aiCreateLoading || !aiCreatePrompt.trim()">
            {{ aiCreateLoading ? 'Generando…' : 'Generar formulario' }}
          </button>
        </div>
        <p v-if="aiCreateError" class="err">{{ aiCreateError }}</p>
      </form>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Versión</th>
          <th>Estado</th>
          <th>Cumplimiento</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in items" :key="p.id">
          <td>
            <strong>{{ p.titulo }}</strong>
            <p class="sub">{{ p.codigo || p.category }}</p>
          </td>
          <td>v{{ p.version }}</td>
          <td><span class="pill" :data-st="p.status">{{ statusLabel(p.status) }}</span></td>
          <td>
            <template v-if="p.requiresAck && p.compliance">
              {{ p.compliance.acked }}/{{ p.compliance.invited }}
              <span v-if="p.compliance.rate != null"> ({{ p.compliance.rate }}%)</span>
            </template>
            <template v-else>—</template>
          </td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="openCompliance(p)">Reporte</button>
            <button type="button" class="btn-ghost" @click="edit(p)">Editar</button>
            <button type="button" class="btn-ghost danger" @click="archive(p)">Archivar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length" class="muted">Sin políticas aún.</p>

    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel editor" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar política' : 'Nueva política' }}</h2>
        <p v-if="draft.notas" class="hint">Nota IA: {{ draft.notas }}</p>
        <label>Código<input v-model="draft.codigo" class="input" placeholder="ETH-01" /></label>
        <label>Título<input v-model="draft.titulo" class="input" required /></label>
        <label>Resumen<textarea v-model="draft.resumen" class="input" rows="2" /></label>
        <label>Cuerpo<textarea v-model="draft.cuerpo" class="input" rows="10" required /></label>
        <label>Categoría<input v-model="draft.category" class="input" /></label>
        <label>Keywords (coma)<input v-model="draft.keywordsText" class="input" /></label>
        <label>Estado
          <select v-model="draft.status" class="input">
            <option value="draft">Borrador (no visible)</option>
            <option value="published">Publicada</option>
            <option value="archived">Archivada</option>
          </select>
        </label>
        <label class="check"><input v-model="draft.requiresAck" type="checkbox" /> Requiere acuse</label>
        <label class="check"><input v-model="draft.mandatory" type="checkbox" /> Obligatoria</label>
        <label v-if="draft.id" class="check">
          <input v-model="draft.bumpVersion" type="checkbox" />
          Nueva versión (invalida acuses previos)
        </label>

        <section class="block">
          <strong>Audiencia</strong>
          <p class="hint">Quién debe ver (y aceptar, si aplica) esta política.</p>
          <div class="audience-modes">
            <button type="button" class="mode" :class="{ on: draft.audience.mode === 'all' }" @click="draft.audience.mode = 'all'">Toda la comunidad</button>
            <button type="button" class="mode" :class="{ on: draft.audience.mode === 'restricted' }" @click="draft.audience.mode = 'restricted'">Áreas y/o grupos</button>
          </div>
          <div v-if="draft.audience.mode === 'restricted'" class="audience-picks">
            <div>
              <p class="pick-title">Áreas</p>
              <label v-for="a in areas" :key="a.id" class="check">
                <input v-model="draft.audience.areaIds" type="checkbox" :value="a.id" /> {{ a.nombre }}
              </label>
            </div>
            <div>
              <p class="pick-title">Grupos</p>
              <label v-for="g in groups" :key="g.id" class="check">
                <input v-model="draft.audience.groupIds" type="checkbox" :value="g.id" /> {{ g.nombre }}
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

    <div v-if="report" class="sheet" @click.self="report = null">
      <div class="panel editor">
        <header class="res-head">
          <div>
            <h2>Cumplimiento</h2>
            <p>{{ report.policy.titulo }} · v{{ report.policy.version }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="report = null">Cerrar</button>
        </header>
        <p class="hint">
          Aceptaron {{ report.compliance.acked }} / {{ report.compliance.invited }}
          <span v-if="report.compliance.rate != null"> ({{ report.compliance.rate }}%)</span>
          · Pendientes: {{ report.compliance.pending }}
        </p>
        <div class="footer" style="justify-content: flex-start">
          <button type="button" class="btn-primary" @click="exportCsv">Exportar CSV</button>
        </div>
        <h3>Pendientes</h3>
        <ul class="list">
          <li v-for="u in report.pending" :key="u.id">{{ u.nombre }} <span class="sub">({{ u.usuario }})</span></li>
        </ul>
        <p v-if="!report.pending.length" class="hint">Nadie pendiente.</p>
        <h3>Aceptaron</h3>
        <ul class="list">
          <li v-for="u in report.signed" :key="u.id">{{ u.nombre }} · {{ formatDate(u.acceptedAt) }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const pageEl = ref(null)
const items = ref([])
const areas = ref([])
const groups = ref([])
const error = ref('')
const formError = ref('')
const saving = ref(false)
const draft = ref(null)
const report = ref(null)
const aiConfigured = ref(false)
const aiPromptOpen = ref(false)
const aiCreatePrompt = ref('')
const createAiProvider = ref('auto')
const aiCreateLoading = ref(false)
const aiCreateError = ref('')

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function statusLabel(s) {
  return { draft: 'Borrador', published: 'Publicada', archived: 'Archivada' }[s] || s
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR')
  } catch {
    return ''
  }
}

function keywordsText(list) {
  return Array.isArray(list) ? list.join(', ') : ''
}

async function load() {
  error.value = ''
  try {
    const [list, meta] = await Promise.all([
      api.get('/admin/policies'),
      api.get('/admin/policies/meta').catch(() => ({ data: {} })),
    ])
    items.value = list.data.items || []
    areas.value = list.data.areas || meta.data.areas || []
    groups.value = list.data.groups || meta.data.groups || []
    aiConfigured.value = Boolean(meta.data.aiConfigured)
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar'
  }
}

function openNew() {
  formError.value = ''
  draft.value = {
    codigo: '',
    titulo: '',
    resumen: '',
    cuerpo: '',
    category: 'general',
    keywordsText: '',
    status: 'draft',
    requiresAck: true,
    mandatory: false,
    bumpVersion: false,
    audience: emptyAudience(),
  }
}

function openAiNew() {
  aiCreateError.value = ''
  aiCreatePrompt.value = ''
  createAiProvider.value = 'auto'
  aiPromptOpen.value = true
}

async function runAiCreate() {
  aiCreateLoading.value = true
  aiCreateError.value = ''
  try {
    const { data } = await api.post('/admin/policies/generate', {
      prompt: aiCreatePrompt.value,
      provider: createAiProvider.value,
    })
    const d = data.draft || {}
    draft.value = {
      codigo: d.codigo || '',
      titulo: d.titulo || '',
      resumen: d.resumen || '',
      cuerpo: d.cuerpo || '',
      category: d.category || 'general',
      keywordsText: keywordsText(d.keywords),
      status: 'draft',
      requiresAck: d.requiresAck !== false,
      mandatory: Boolean(d.mandatory),
      bumpVersion: false,
      audience: d.audience || emptyAudience(),
      notas: d.notas || (data.mode === 'heuristic' ? 'Borrador local (sin API IA).' : ''),
    }
    aiPromptOpen.value = false
  } catch (e) {
    aiCreateError.value = e.response?.data?.error || 'No se pudo generar'
  } finally {
    aiCreateLoading.value = false
  }
}

function edit(p) {
  draft.value = {
    id: p.id,
    codigo: p.codigo || '',
    titulo: p.titulo,
    resumen: p.resumen || '',
    cuerpo: p.cuerpo || '',
    category: p.category || 'general',
    keywordsText: keywordsText(p.keywords),
    status: p.status,
    requiresAck: p.requiresAck !== false,
    mandatory: Boolean(p.mandatory),
    bumpVersion: false,
    audience: {
      mode: p.audience?.mode || 'all',
      areaIds: [...(p.audience?.areaIds || [])],
      groupIds: [...(p.audience?.groupIds || [])],
      userIds: [...(p.audience?.userIds || [])],
    },
  }
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const d = draft.value
    const payload = {
      codigo: d.codigo,
      titulo: d.titulo,
      resumen: d.resumen,
      cuerpo: d.cuerpo,
      category: d.category,
      keywords: d.keywordsText,
      status: d.status,
      requiresAck: d.requiresAck,
      mandatory: d.mandatory,
      audience: d.audience,
      bumpVersion: Boolean(d.bumpVersion),
    }
    if (d.id) await api.put(`/admin/policies/${d.id}`, payload)
    else await api.post('/admin/policies', payload)
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function archive(p) {
  if (!confirm('¿Archivar esta política?')) return
  await api.delete(`/admin/policies/${p.id}`)
  await load()
}

async function openCompliance(p) {
  const { data } = await api.get(`/admin/policies/${p.id}/compliance`)
  report.value = data
}

async function exportCsv() {
  if (!report.value?.policy?.id) return
  const { data } = await api.get(`/admin/policies/${report.value.policy.id}/compliance.csv`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `politica-${report.value.policy.id}-cumplimiento.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await load()
  await nextTick()
  const main = document.querySelector('.admin-main')
  if (main) main.scrollTop = 0
  window.scrollTo(0, 0)
  pageEl.value?.querySelector('h1')?.focus?.({ preventScroll: true })
})
</script>

<style scoped>
.page-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; }
.page-head h1 { margin: 0; font-size: 1.5rem; outline: none; }
.page-head p { margin: 4px 0 0; color: var(--ink-soft); }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.table { width: 100%; border-collapse: collapse; background: var(--panel); border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid var(--line); font-size: 0.9rem; vertical-align: middle; }
.sub { margin: 4px 0 0; font-size: 0.75rem; color: var(--ink-soft); font-weight: 400; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; max-width: 320px; justify-content: flex-end; }
.pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  background: var(--line); color: var(--ink); text-transform: capitalize;
}
.pill[data-st='published'] { background: var(--ok-bg); color: var(--ok); }
.pill[data-st='draft'] { background: var(--warn-bg); color: var(--warn); }
.pill[data-st='archived'] { background: var(--line); color: var(--ink-soft); }
.sheet { position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 45%, transparent); display: grid; place-items: center; z-index: 40; padding: 12px; }
.panel { width: min(640px, 100%); max-height: 90vh; overflow: auto; background: var(--panel); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.panel.editor { width: min(900px, 100%); max-height: 92vh; padding: 24px 28px; }
.input { width: 100%; box-sizing: border-box; border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.block { border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.audience-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mode { border: 1px solid var(--line-2); border-radius: 10px; padding: 10px; background: var(--panel); cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.mode.on { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.audience-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pick-title { margin: 0 0 6px; font-size: 0.78rem; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.04em; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.hint { margin: 0; font-size: 0.78rem; font-weight: 400; color: var(--ink-soft); }
.footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--primary, var(--brand-primary)); color: #fff; border-color: transparent; }
.btn-ghost.danger { color: var(--bad); }
.btn-primary:disabled, .btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }
.err { color: var(--bad); }
.muted { color: var(--ink-soft); }
.res-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.res-head h2 { margin: 0; }
.res-head p { margin: 4px 0 0; color: var(--ink-soft); }
.list { margin: 0; padding-left: 1.1rem; }
</style>
