<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Emociones y guardados</h1>
        <p>Cómo reacciona la comunidad a las publicaciones del muro.</p>
        <ScreenHelp
          purpose="Muestra totales de Me gusta, Me encanta, Aplausos y Guardados. Podés elegir publicaciones y pedir un análisis marketing con IA."
          can-do="Ordenar, seleccionar una o varias noticias, analizar engagement con IA y exportar CSV."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">Actualizar</button>
        <button type="button" class="btn-ghost" :disabled="!items.length" @click="exportCsv">Exportar CSV</button>
      </div>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-else-if="loading && !totals" class="muted">Cargando estadísticas…</p>

    <template v-else-if="totals">
      <section class="kpis">
        <article class="kpi">
          <p class="kpi-label">Me gusta</p>
          <p class="kpi-value">{{ totals.like }}</p>
          <p class="kpi-hint">👍 pulgar arriba</p>
        </article>
        <article class="kpi accent">
          <p class="kpi-label">Me encanta</p>
          <p class="kpi-value">{{ totals.love }}</p>
          <p class="kpi-hint">❤️ corazón</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Aplausos</p>
          <p class="kpi-value">{{ totals.clap }}</p>
          <p class="kpi-hint">👏 reconocimiento</p>
        </article>
        <article class="kpi love">
          <p class="kpi-label">Guardados</p>
          <p class="kpi-value">{{ totals.saves }}</p>
          <p class="kpi-hint">{{ totals.uniqueSavers }} personas · señal de “me encanta”</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Engagement total</p>
          <p class="kpi-value">{{ totals.engagement }}</p>
          <p class="kpi-hint">reacciones + guardados</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Señal de afinidad</p>
          <p class="kpi-value">{{ totals.loveSignal }}</p>
          <p class="kpi-hint">me encanta + guardados</p>
        </article>
      </section>

      <section class="legend">
        <p>
          En la app:
          <strong>👍 Me gusta</strong> ·
          <strong>❤️ Me encanta</strong> ·
          <strong>👏 Aplausos</strong> ·
          <strong>🔖 Guardar</strong>
        </p>
      </section>

      <section class="ai-panel">
        <div class="ai-panel-head">
          <div>
            <h2>Análisis marketing con IA</h2>
            <p class="muted small">
              Elegí una o varias publicaciones (máx. {{ maxAiPosts }}) para interpretar el engagement:
              mix emocional, qué rindió y qué conviene publicar después.
            </p>
          </div>
          <div v-if="aiConfigured" class="ai-provider">
            <button type="button" class="mode" :class="{ on: aiProvider === 'auto' }" @click="aiProvider = 'auto'">Auto</button>
            <button type="button" class="mode" :class="{ on: aiProvider === 'openai' }" @click="aiProvider = 'openai'">OpenAI</button>
            <button type="button" class="mode" :class="{ on: aiProvider === 'anthropic' }" @click="aiProvider = 'anthropic'">Anthropic</button>
          </div>
        </div>

        <p v-if="!aiConfigured" class="hint warn">
          IA no configurada. Definí <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code> en el backend.
        </p>

        <template v-else>
          <div class="ai-select-bar">
            <span class="sel-count">
              {{ selectedIds.length }} seleccionada{{ selectedIds.length === 1 ? '' : 's' }}
            </span>
            <button type="button" class="btn-ghost" @click="selectTop(5)">Top 5</button>
            <button type="button" class="btn-ghost" @click="selectAllVisible">Todas visibles</button>
            <button type="button" class="btn-ghost" :disabled="!selectedIds.length" @click="clearSelection">Limpiar</button>
            <button
              type="button"
              class="btn-primary"
              :disabled="aiLoading || !selectedIds.length"
              @click="runAiAnalysis"
            >
              {{ aiLoading ? 'Analizando…' : `Analizar con IA (${selectedIds.length || 0})` }}
            </button>
          </div>

          <label class="focus-label">
            Enfoque opcional
            <input
              v-model="aiFocus"
              class="input focus-input"
              type="text"
              maxlength="500"
              placeholder="Ej: comparar avisos vs beneficios, o qué temas generan más guardados"
            />
          </label>

          <p v-if="aiError" class="err">{{ aiError }}</p>

          <div v-if="aiAnalysis" class="ai-box">
            <div class="ai-box-head">
              <p class="hint">{{ aiMeta }}</p>
              <button type="button" class="btn-ghost" @click="aiAnalysis = null">Cerrar</button>
            </div>

            <div v-if="aiAnalysis.scoreGeneral != null" class="ai-score">
              <span class="ai-score-num">{{ aiAnalysis.scoreGeneral }}</span>
              <span class="ai-score-label">Score marketing del set</span>
            </div>

            <h4>Resumen ejecutivo</h4>
            <p>{{ aiAnalysis.resumenEjecutivo }}</p>

            <template v-if="aiAnalysis.lecturaMarketing">
              <h4>Lectura marketing</h4>
              <p>{{ aiAnalysis.lecturaMarketing }}</p>
            </template>

            <template v-if="aiAnalysis.mixEmocional?.interpretacion || aiAnalysis.mixEmocional?.dominante">
              <h4>Mix emocional</h4>
              <p>
                <span v-if="aiAnalysis.mixEmocional.dominante" class="pill">{{ aiAnalysis.mixEmocional.dominante }}</span>
                {{ aiAnalysis.mixEmocional.interpretacion }}
              </p>
            </template>

            <template v-if="(aiAnalysis.porPublicacion || []).length">
              <h4>Por publicación</h4>
              <ul class="per-post">
                <li v-for="(pp, i) in aiAnalysis.porPublicacion" :key="pp.id || i">
                  <div class="per-post-head">
                    <strong>{{ pp.titulo || pp.id || `Publicación ${i + 1}` }}</strong>
                    <span v-if="pp.score != null" class="pill soft">{{ pp.score }}/100</span>
                    <span v-if="pp.veredicto" class="pill" :class="verdictClass(pp.veredicto)">{{ pp.veredicto }}</span>
                  </div>
                  <p v-if="pp.porQueFunciona"><b>Qué funciona:</b> {{ pp.porQueFunciona }}</p>
                  <p v-if="pp.queMejorar"><b>Mejorar:</b> {{ pp.queMejorar }}</p>
                </li>
              </ul>
            </template>

            <template v-if="(aiAnalysis.patrones || []).length">
              <h4>Patrones</h4>
              <ul><li v-for="(p, i) in aiAnalysis.patrones" :key="'pat'+i">{{ p }}</li></ul>
            </template>

            <div class="ai-two">
              <div v-if="(aiAnalysis.fortalezas || []).length">
                <h4>Fortalezas</h4>
                <ul><li v-for="(f, i) in aiAnalysis.fortalezas" :key="'f'+i">{{ f }}</li></ul>
              </div>
              <div v-if="(aiAnalysis.oportunidades || []).length">
                <h4>Oportunidades</h4>
                <ul><li v-for="(o, i) in aiAnalysis.oportunidades" :key="'o'+i">{{ o }}</li></ul>
              </div>
            </div>

            <template v-if="(aiAnalysis.recomendaciones || []).length">
              <h4>Recomendaciones</h4>
              <ul><li v-for="(r, i) in aiAnalysis.recomendaciones" :key="'r'+i">{{ r }}</li></ul>
            </template>

            <template v-if="(aiAnalysis.proximosContenidos || []).length">
              <h4>Próximos contenidos sugeridos</h4>
              <ul><li v-for="(c, i) in aiAnalysis.proximosContenidos" :key="'nx'+i">{{ c }}</li></ul>
            </template>

            <p v-if="aiAnalysis.confianza || aiAnalysis.limitaciones" class="hint">
              <template v-if="aiAnalysis.confianza">Confianza: {{ aiAnalysis.confianza }}. </template>
              <template v-if="aiAnalysis.limitaciones">{{ aiAnalysis.limitaciones }}</template>
            </p>
          </div>
        </template>
      </section>

      <div class="toolbar">
        <label>
          Ordenar
          <select v-model="sortBy" class="input">
            <option value="engagement">Más engagement</option>
            <option value="loveSignal">Más afinidad (encanta + guardados)</option>
            <option value="like">Más me gusta</option>
            <option value="love">Más me encanta</option>
            <option value="clap">Más aplausos</option>
            <option value="saves">Más guardados</option>
            <option value="publishedAt">Más recientes</option>
          </select>
        </label>
        <p class="muted small">
          {{ totals.postsPublished }} publicadas ·
          {{ totals.postsWithReactions }} con reacciones ·
          {{ totals.postsWithSaves }} con guardados
        </p>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th class="check-col">
              <input
                type="checkbox"
                :checked="allVisibleSelected"
                :disabled="!sortedItems.length"
                aria-label="Seleccionar todas las visibles"
                @change="toggleAllVisible($event.target.checked)"
              />
            </th>
            <th>#</th>
            <th>Publicación</th>
            <th>👍</th>
            <th>❤️</th>
            <th>👏</th>
            <th>🔖</th>
            <th>Total</th>
            <th>Afinidad</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in sortedItems"
            :key="row.id"
            :class="{ selected: selectedSet.has(row.id) }"
            @click="toggleRow(row.id)"
          >
            <td class="check-col" @click.stop>
              <input
                type="checkbox"
                :checked="selectedSet.has(row.id)"
                :aria-label="`Seleccionar ${row.titulo || row.id}`"
                @change="toggleRow(row.id)"
              />
            </td>
            <td class="rank">{{ i + 1 }}</td>
            <td>
              <div class="post-title">
                <span v-if="row.pinned" class="pill">Fijada</span>
                {{ row.titulo || '(sin título)' }}
              </div>
              <div class="post-meta">
                {{ row.tipo || '—' }}
                <template v-if="row.authorName"> · {{ row.authorName }}</template>
                <template v-if="row.publishedAt"> · {{ formatDate(row.publishedAt) }}</template>
              </div>
            </td>
            <td>{{ row.reactions.like }}</td>
            <td>{{ row.reactions.love }}</td>
            <td>{{ row.reactions.clap }}</td>
            <td>{{ row.saves }}</td>
            <td class="strong">{{ row.engagement }}</td>
            <td>{{ row.loveSignal }}</td>
          </tr>
          <tr v-if="!sortedItems.length">
            <td colspan="9" class="empty">Todavía no hay publicaciones publicadas.</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const MAX_AI_POSTS = 12

const loading = ref(true)
const error = ref('')
const totals = ref(null)
const items = ref([])
const sortBy = ref('engagement')
const selectedIds = ref([])
const aiConfigured = ref(false)
const aiProvider = ref('auto')
const aiFocus = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const aiAnalysis = ref(null)
const aiMeta = ref('')
const maxAiPosts = MAX_AI_POSTS

const selectedSet = computed(() => new Set(selectedIds.value))

const sortedItems = computed(() => {
  const list = [...items.value]
  const key = sortBy.value
  if (key === 'publishedAt') {
    return list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  }
  if (key === 'like' || key === 'love' || key === 'clap') {
    return list.sort((a, b) => (b.reactions?.[key] || 0) - (a.reactions?.[key] || 0))
  }
  return list.sort((a, b) => (b[key] || 0) - (a[key] || 0))
})

const allVisibleSelected = computed(
  () =>
    sortedItems.value.length > 0 &&
    sortedItems.value.every((r) => selectedSet.value.has(r.id)),
)

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function verdictClass(v) {
  const s = String(v || '').toLowerCase()
  if (s.includes('alto')) return 'ok'
  if (s.includes('bajo') || s.includes('sin')) return 'bad'
  return 'mid'
}

function toggleRow(id) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    if (set.size >= MAX_AI_POSTS) {
      aiError.value = `Podés seleccionar hasta ${MAX_AI_POSTS} publicaciones para el análisis IA`
      return
    }
    set.add(id)
  }
  selectedIds.value = [...set]
  aiError.value = ''
}

function toggleAllVisible(checked) {
  if (!checked) {
    const visible = new Set(sortedItems.value.map((r) => r.id))
    selectedIds.value = selectedIds.value.filter((id) => !visible.has(id))
    return
  }
  const next = new Set(selectedIds.value)
  for (const row of sortedItems.value) {
    if (next.size >= MAX_AI_POSTS) break
    next.add(row.id)
  }
  selectedIds.value = [...next]
  if (sortedItems.value.length > MAX_AI_POSTS) {
    aiError.value = `Se seleccionaron las primeras ${MAX_AI_POSTS} (límite del análisis IA)`
  }
}

function selectTop(n) {
  selectedIds.value = sortedItems.value.slice(0, Math.min(n, MAX_AI_POSTS)).map((r) => r.id)
  aiError.value = ''
}

function selectAllVisible() {
  toggleAllVisible(true)
}

function clearSelection() {
  selectedIds.value = []
  aiError.value = ''
}

async function checkAi() {
  try {
    const { data } = await api.get('/admin/posts/ai/status')
    aiConfigured.value = Boolean(data.configured)
  } catch {
    aiConfigured.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/posts/engagement')
    totals.value = data.totals
    items.value = data.items || []
    const valid = new Set((data.items || []).map((i) => i.id))
    selectedIds.value = selectedIds.value.filter((id) => valid.has(id))
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las estadísticas'
    totals.value = null
    items.value = []
  } finally {
    loading.value = false
  }
}

async function runAiAnalysis() {
  if (!selectedIds.value.length) return
  aiLoading.value = true
  aiError.value = ''
  aiAnalysis.value = null
  try {
    const { data } = await api.post('/admin/posts/engagement/analyze', {
      postIds: selectedIds.value,
      provider: aiProvider.value,
      focus: aiFocus.value.trim() || undefined,
    })
    aiAnalysis.value = data.analysis
    const based = data.basedOn || {}
    aiMeta.value = [
      data.provider && data.model ? `${data.provider} · ${data.model}` : '',
      based.postCount != null ? `${based.postCount} pubs` : '',
      based.totalEngagement != null ? `engagement ${based.totalEngagement}` : '',
      based.totalSaves != null ? `${based.totalSaves} guardados` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message || 'No se pudo analizar con IA'
  } finally {
    aiLoading.value = false
  }
}

function exportCsv() {
  const header = [
    'titulo',
    'tipo',
    'autor',
    'publicado',
    'me_gusta',
    'me_encanta',
    'aplausos',
    'guardados',
    'engagement',
    'afinidad',
  ]
  const lines = [header.join(',')]
  for (const row of sortedItems.value) {
    const cells = [
      csv(row.titulo),
      csv(row.tipo),
      csv(row.authorName),
      csv(row.publishedAt ? new Date(row.publishedAt).toISOString() : ''),
      row.reactions.like,
      row.reactions.love,
      row.reactions.clap,
      row.saves,
      row.engagement,
      row.loveSignal,
    ]
    lines.push(cells.join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `emociones-muro-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function csv(v) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

onMounted(async () => {
  await Promise.all([load(), checkAi()])
})
</script>

<style scoped>
.page {
  max-width: 1100px;
}
.page-head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
}
.page-head p {
  margin: 0.35rem 0 0;
  color: var(--cx-muted);
  font-size: 0.9rem;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.err {
  color: #b91c1c;
  background: #fef2f2;
  padding: 10px 12px;
  border-radius: 10px;
}
.muted {
  color: var(--cx-muted);
}
.muted.small {
  font-size: 13px;
  margin: 0;
}
.hint {
  font-size: 13px;
  color: var(--cx-muted);
  margin: 0;
}
.hint.warn {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 10px 12px;
  border-radius: 10px;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.kpi {
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px 16px;
}
.kpi.accent {
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, var(--cx-border, #e2e8f0));
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 6%, transparent);
}
.kpi.love {
  border-color: color-mix(in srgb, #be123c 28%, var(--cx-border, #e2e8f0));
  background: color-mix(in srgb, #be123c 5%, transparent);
}
.kpi-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.kpi-value {
  margin: 6px 0 0;
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.kpi-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
}
.legend {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-surface, #fff) 80%, #f1f5f9);
  border: 1px solid var(--cx-border, #e2e8f0);
  font-size: 13px;
  color: var(--cx-muted);
}
.legend p {
  margin: 0;
}
.legend strong {
  color: var(--cx-text, #0f172a);
  font-weight: 650;
}
.ai-panel {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 16px;
  background: var(--cx-surface, #fff);
  display: grid;
  gap: 12px;
}
.ai-panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
}
.ai-panel h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
}
.ai-provider {
  display: flex;
  gap: 4px;
}
.mode {
  border: 1px solid var(--cx-border, #e2e8f0);
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mode.on {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-color: transparent;
}
.ai-select-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.sel-count {
  font-size: 13px;
  font-weight: 650;
  min-width: 9rem;
}
.focus-label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.focus-input {
  width: 100%;
  max-width: 640px;
}
.ai-box {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  background: #f8fafc;
  display: grid;
  gap: 6px;
}
.ai-box-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.ai-box h4 {
  margin: 10px 0 2px;
  font-size: 0.9rem;
}
.ai-box p,
.ai-box li {
  font-size: 0.9rem;
  line-height: 1.45;
  color: #334155;
}
.ai-score {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 4px 0 8px;
}
.ai-score-num {
  font-size: 2rem;
  font-weight: 750;
  color: var(--brand-primary, #0f766e);
  font-variant-numeric: tabular-nums;
}
.ai-score-label {
  font-size: 13px;
  color: var(--cx-muted);
  font-weight: 600;
}
.per-post {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.per-post li {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
}
.per-post-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
.per-post p {
  margin: 4px 0 0;
}
.ai-two {
  display: grid;
  gap: 12px;
}
@media (min-width: 720px) {
  .ai-two {
    grid-template-columns: 1fr 1fr;
  }
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.input {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 10px;
  padding: 7px 10px;
  background: var(--cx-surface, #fff);
  font-size: 13px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--cx-border, #e2e8f0);
  vertical-align: top;
}
.table th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cx-muted);
  font-weight: 700;
}
.table tbody tr {
  cursor: pointer;
}
.table tbody tr.selected {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, transparent);
}
.check-col {
  width: 36px;
}
.rank {
  color: var(--cx-muted);
  font-variant-numeric: tabular-nums;
  width: 28px;
}
.post-title {
  font-weight: 600;
  line-height: 1.35;
}
.post-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--cx-muted);
}
.pill {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, transparent);
  color: var(--brand-primary, #0f766e);
  text-transform: capitalize;
}
.pill.soft {
  background: #e2e8f0;
  color: #334155;
}
.pill.ok {
  background: #dcfce7;
  color: #166534;
}
.pill.mid {
  background: #fef3c7;
  color: #92400e;
}
.pill.bad {
  background: #fee2e2;
  color: #991b1b;
}
.strong {
  font-weight: 700;
}
.empty {
  text-align: center;
  color: var(--cx-muted);
  padding: 28px 8px !important;
}
.btn-ghost,
.btn-primary {
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-color: transparent;
}
.btn-ghost:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
