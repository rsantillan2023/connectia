<template>
  <div ref="pageEl" class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Ayuda</h1>
        <p>FAQs y tutoriales del centro de ayuda · al publicar alimentan la KB del asistente</p>
        <ScreenHelp
          purpose="ABM de FAQs y tutoriales visibles en Ayuda de la app."
          can-do="Crear manual o con IA, editar, publicar/ocultar, segmentar por audiencia. Al publicar se indexa en la KB del bot."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :class="{ on: tab === 'faqs' }" @click="tab = 'faqs'">FAQs</button>
        <button type="button" class="btn-ghost" :class="{ on: tab === 'tutorials' }" @click="tab = 'tutorials'">
          Tutoriales
        </button>
        <button type="button" class="btn-ghost" @click="openAiNew">
          {{ tab === 'faqs' ? 'Nueva FAQ con IA' : 'Nuevo tutorial con IA' }}
        </button>
        <button type="button" class="btn-primary" @click="openNew">
          {{ tab === 'faqs' ? 'Nueva FAQ' : 'Nuevo tutorial' }}
        </button>
      </div>
    </header>
    <p v-if="!aiConfigured" class="hint">
      Sin API keys la generación usa reglas locales (siempre podés generar un borrador). Con
      OPENAI_API_KEY / ANTHROPIC_API_KEY mejora la calidad.
    </p>
    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="aiPromptOpen" class="sheet" @click.self="aiPromptOpen = false">
      <form class="panel editor" @submit.prevent="runAiCreate">
        <h2>{{ tab === 'faqs' ? 'Nueva FAQ con IA' : 'Nuevo tutorial con IA' }}</h2>
        <p class="hint">
          Describí el tema, el público y el tono. La IA arma el formulario completo; después lo
          revisás, ajustás audiencia y publicás.
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
            :placeholder="aiPlaceholder"
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

    <table v-if="tab === 'faqs'" class="table">
      <thead>
        <tr>
          <th>Pregunta</th>
          <th>Categoría</th>
          <th>Estado</th>
          <th>KB</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in faqs" :key="f.id">
          <td><strong>{{ f.pregunta }}</strong></td>
          <td>{{ f.category }}</td>
          <td><span class="pill" :data-st="f.status">{{ statusLabel(f.status) }}</span></td>
          <td>{{ f.kb?.syncedAt ? 'indexada' : '—' }}</td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="editFaq(f)">Editar</button>
            <button type="button" class="btn-ghost danger" @click="archiveFaq(f)">Archivar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <table v-else class="table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Pasos</th>
          <th>Estado</th>
          <th>KB</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tutorials" :key="t.id">
          <td>
            <strong>{{ t.titulo }}</strong>
            <p class="sub">{{ t.category }}</p>
          </td>
          <td>{{ t.stepCount || t.steps?.length || 0 }}</td>
          <td><span class="pill" :data-st="t.status">{{ statusLabel(t.status) }}</span></td>
          <td>{{ t.kb?.syncedAt ? 'indexada' : '—' }}</td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="editTutorial(t)">Editar</button>
            <button type="button" class="btn-ghost danger" @click="archiveTutorial(t)">Archivar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="tab === 'faqs' && !faqs.length" class="muted">Sin FAQs aún.</p>
    <p v-if="tab === 'tutorials' && !tutorials.length" class="muted">Sin tutoriales aún.</p>

    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel editor" @submit.prevent="save">
        <h2>
          {{
            draftKind === 'faq'
              ? draft.id
                ? 'Editar FAQ'
                : 'Nueva FAQ'
              : draft.id
                ? 'Editar tutorial'
                : 'Nuevo tutorial'
          }}
        </h2>
        <p v-if="draft.notas" class="hint">Nota IA: {{ draft.notas }}</p>

        <template v-if="draftKind === 'faq'">
          <label>Pregunta<input v-model="draft.pregunta" class="input" required /></label>
          <label>Respuesta<textarea v-model="draft.respuesta" class="input" rows="6" required /></label>
        </template>
        <template v-else>
          <label>Título<input v-model="draft.titulo" class="input" required /></label>
          <label>Descripción<textarea v-model="draft.descripcion" class="input" rows="2" /></label>
          <label>Módulo relacionado<input v-model="draft.moduloRelacionado" class="input" placeholder="muro, encuestas…" /></label>
          <label class="check"><input v-model="draft.showOnFirstLogin" type="checkbox" /> Mostrar en primer login</label>
          <div class="qs-head">
            <strong>Pasos</strong>
            <button type="button" class="btn-ghost" @click="addStep">+ Paso</button>
          </div>
          <div v-for="(s, i) in draft.steps" :key="i" class="q">
            <input v-model="s.titulo" class="input" placeholder="Título del paso" />
            <textarea v-model="s.cuerpo" class="input" rows="2" placeholder="Instrucción" />
            <button type="button" class="btn-ghost danger" @click="draft.steps.splice(i, 1)">Quitar</button>
          </div>
        </template>

        <label>Categoría<input v-model="draft.category" class="input" /></label>
        <label>Keywords (coma)<input v-model="draft.keywordsText" class="input" /></label>
        <label>Orden<input v-model.number="draft.orden" type="number" class="input" /></label>
        <label>Estado
          <select v-model="draft.status" class="input">
            <option value="draft">Borrador (no visible)</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </label>

        <section class="block">
          <strong>Audiencia</strong>
          <p class="hint">Quién puede ver este contenido en la app.</p>
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
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const tab = ref('faqs')
const pageEl = ref(null)
const faqs = ref([])
const tutorials = ref([])
const areas = ref([])
const groups = ref([])
const error = ref('')
const formError = ref('')
const saving = ref(false)
const draft = ref(null)
const draftKind = ref('faq')
const aiConfigured = ref(false)
const aiPromptOpen = ref(false)
const aiCreatePrompt = ref('')
const createAiProvider = ref('auto')
const aiCreateLoading = ref(false)
const aiCreateError = ref('')

const aiPlaceholder = computed(() =>
  tab.value === 'faqs'
    ? 'Ej. FAQ sobre cómo pedir vacaciones en temporada alta. Tono cercano, respuesta en 4 pasos, categoría RRHH.'
    : 'Ej. Tutorial para marcar asistencia en el local. 5 pasos claros, módulo solicitudes, para franquiciados nuevos.',
)

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function statusLabel(s) {
  return { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' }[s] || s
}

function keywordsText(list) {
  return Array.isArray(list) ? list.join(', ') : ''
}

async function load() {
  error.value = ''
  try {
    const [meta, f, t] = await Promise.all([
      api.get('/admin/help/meta'),
      api.get('/admin/help/faqs'),
      api.get('/admin/help/tutorials'),
    ])
    areas.value = meta.data.areas || []
    groups.value = meta.data.groups || []
    aiConfigured.value = Boolean(meta.data.aiConfigured)
    faqs.value = f.data.items || []
    tutorials.value = t.data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar'
  }
}

function openNew() {
  formError.value = ''
  if (tab.value === 'faqs') {
    draftKind.value = 'faq'
    draft.value = {
      pregunta: '',
      respuesta: '',
      category: 'general',
      keywordsText: '',
      orden: 100,
      status: 'draft',
      audience: emptyAudience(),
    }
  } else {
    draftKind.value = 'tutorial'
    draft.value = {
      titulo: '',
      descripcion: '',
      moduloRelacionado: '',
      showOnFirstLogin: false,
      steps: [{ titulo: '', cuerpo: '' }],
      category: 'general',
      keywordsText: '',
      orden: 100,
      status: 'draft',
      audience: emptyAudience(),
    }
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
    const kind = tab.value === 'tutorials' ? 'tutorial' : 'faq'
    const { data } = await api.post('/admin/help/generate', {
      kind,
      prompt: aiCreatePrompt.value,
      provider: createAiProvider.value,
    })
    const d = data.draft || {}
    draftKind.value = kind
    if (kind === 'faq') {
      draft.value = {
        pregunta: d.pregunta || '',
        respuesta: d.respuesta || '',
        category: d.category || 'general',
        keywordsText: keywordsText(d.keywords),
        orden: d.orden ?? 100,
        status: 'draft',
        audience: d.audience || emptyAudience(),
        notas: d.notas || (data.mode === 'heuristic' ? 'Borrador local (sin API IA).' : ''),
      }
    } else {
      draft.value = {
        titulo: d.titulo || '',
        descripcion: d.descripcion || '',
        moduloRelacionado: d.moduloRelacionado || '',
        showOnFirstLogin: Boolean(d.showOnFirstLogin),
        steps: (d.steps || []).map((s) => ({ titulo: s.titulo || '', cuerpo: s.cuerpo || '' })),
        category: d.category || 'general',
        keywordsText: keywordsText(d.keywords),
        orden: d.orden ?? 100,
        status: 'draft',
        audience: d.audience || emptyAudience(),
        notas: d.notas || (data.mode === 'heuristic' ? 'Borrador local (sin API IA).' : ''),
      }
      if (!draft.value.steps.length) draft.value.steps = [{ titulo: '', cuerpo: '' }]
    }
    aiPromptOpen.value = false
  } catch (e) {
    aiCreateError.value = e.response?.data?.error || 'No se pudo generar'
  } finally {
    aiCreateLoading.value = false
  }
}

function editFaq(f) {
  draftKind.value = 'faq'
  draft.value = {
    id: f.id,
    pregunta: f.pregunta,
    respuesta: f.respuesta,
    category: f.category || 'general',
    keywordsText: keywordsText(f.keywords),
    orden: f.orden ?? 100,
    status: f.status,
    audience: {
      mode: f.audience?.mode || 'all',
      areaIds: [...(f.audience?.areaIds || [])],
      groupIds: [...(f.audience?.groupIds || [])],
      userIds: [...(f.audience?.userIds || [])],
    },
  }
}

function editTutorial(t) {
  draftKind.value = 'tutorial'
  draft.value = {
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion || '',
    moduloRelacionado: t.moduloRelacionado || '',
    showOnFirstLogin: Boolean(t.showOnFirstLogin),
    steps: (t.steps || []).map((s) => ({ titulo: s.titulo || '', cuerpo: s.cuerpo || '' })),
    category: t.category || 'general',
    keywordsText: keywordsText(t.keywords),
    orden: t.orden ?? 100,
    status: t.status,
    audience: {
      mode: t.audience?.mode || 'all',
      areaIds: [...(t.audience?.areaIds || [])],
      groupIds: [...(t.audience?.groupIds || [])],
      userIds: [...(t.audience?.userIds || [])],
    },
  }
  if (!draft.value.steps.length) draft.value.steps = [{ titulo: '', cuerpo: '' }]
}

function addStep() {
  draft.value.steps.push({ titulo: '', cuerpo: '' })
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const d = draft.value
    const payload = {
      category: d.category,
      keywords: d.keywordsText,
      orden: d.orden,
      status: d.status,
      audience: d.audience,
    }
    if (draftKind.value === 'faq') {
      payload.pregunta = d.pregunta
      payload.respuesta = d.respuesta
      if (d.id) await api.put(`/admin/help/faqs/${d.id}`, payload)
      else await api.post('/admin/help/faqs', payload)
    } else {
      payload.titulo = d.titulo
      payload.descripcion = d.descripcion
      payload.moduloRelacionado = d.moduloRelacionado
      payload.showOnFirstLogin = d.showOnFirstLogin
      payload.steps = d.steps
      if (d.id) await api.put(`/admin/help/tutorials/${d.id}`, payload)
      else await api.post('/admin/help/tutorials', payload)
    }
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function archiveFaq(f) {
  if (!confirm('¿Archivar esta FAQ?')) return
  await api.delete(`/admin/help/faqs/${f.id}`)
  await load()
}

async function archiveTutorial(t) {
  if (!confirm('¿Archivar este tutorial?')) return
  await api.delete(`/admin/help/tutorials/${t.id}`)
  await load()
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
.page-head p { margin: 4px 0 0; color: #64748b; }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
.table th, .table td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; vertical-align: middle; }
.sub { margin: 4px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 400; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; max-width: 280px; justify-content: flex-end; }
.pill {
  display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  background: #e2e8f0; color: #334155; text-transform: capitalize;
}
.pill[data-st='published'] { background: #d1fae5; color: #065f46; }
.pill[data-st='draft'] { background: #fef3c7; color: #92400e; }
.pill[data-st='archived'] { background: #e2e8f0; color: #475569; }
.sheet { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; z-index: 40; padding: 12px; }
.panel { width: min(640px, 100%); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.panel.editor { width: min(900px, 100%); max-height: 92vh; padding: 24px 28px; }
.input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font: inherit; margin-top: 4px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
.block { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.audience-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mode { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; background: #fff; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.mode.on { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.audience-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pick-title { margin: 0 0 6px; font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
.qs-head { display: flex; justify-content: space-between; align-items: center; }
.q { display: grid; gap: 6px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; }
.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.hint { margin: 0; font-size: 0.78rem; font-weight: 400; color: #64748b; }
.footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; }
.btn-primary { background: var(--primary, #0F766E); color: #fff; border-color: transparent; }
.btn-ghost.on { background: color-mix(in srgb, var(--primary, #0F766E) 12%, #fff); border-color: var(--primary, #0F766E); color: var(--primary, #0F766E); }
.btn-ghost.danger { color: #b91c1c; }
.btn-primary:disabled, .btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }
.err { color: #b91c1c; }
.muted { color: #64748b; }
</style>
