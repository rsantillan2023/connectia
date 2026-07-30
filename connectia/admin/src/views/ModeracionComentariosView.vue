<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Moderación de comentarios</h1>
        <p>La IA analiza y sugiere; vos confirmás. Por defecto no oculta sola.</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">Actualizar</button>
        <button type="button" class="btn-ghost" @click="exportCsv">Exportar CSV</button>
        <button type="button" class="btn-ghost" :class="{ on: tab === 'config' }" @click="tab = 'config'">
          Configuración
        </button>
      </div>
    </header>

    <div v-if="tab === 'inbox'" class="stats">
      <span class="stat">Pendientes <strong>{{ pendingCount }}</strong></span>
      <span class="stat risk">Alto riesgo <strong>{{ highRiskPending }}</strong></span>
    </div>

    <section v-if="tab === 'config'" class="panel">
      <h2>Configuración IA (§10.03)</h2>
      <p v-if="!aiConfigured" class="hint">
        Sin API key de IA se usa heurística local. Configurá <code>OPENAI_API_KEY</code> o
        <code>ANTHROPIC_API_KEY</code> para análisis completo.
      </p>
      <label class="check">
        <input v-model="cfg.enabled" type="checkbox" />
        Análisis automático con IA
      </label>
      <label class="check">
        <input v-model="cfg.requireApproval" type="checkbox" />
        Requiere aprobación antes de publicar el comentario
      </label>
      <label class="field">
        Auto-ocultar si score ≥ (0 = off)
        <input v-model.number="cfg.autoHideMinScore" type="number" min="0" max="100" />
      </label>
      <label class="field">
        Avisar moderadores si score ≥ (0 = off)
        <input v-model.number="cfg.notifyModeratorsMinScore" type="number" min="0" max="100" />
      </label>
      <label class="field">
        Glosario sensible (coma)
        <input v-model="glossaryText" type="text" placeholder="ej. confidencial, interno" />
      </label>
      <ul v-if="policies.length" class="policies">
        <li v-for="(p, i) in policies" :key="i">{{ p }}</li>
      </ul>
      <div class="head-actions">
        <button type="button" class="btn-ghost" @click="tab = 'inbox'">Volver</button>
        <button type="button" class="btn-primary" :disabled="savingCfg" @click="saveConfig">
          {{ savingCfg ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
      <p v-if="cfgMsg" class="ok">{{ cfgMsg }}</p>
      <p v-if="cfgErr" class="err">{{ cfgErr }}</p>
    </section>

    <template v-else>
      <div class="filters">
        <select v-model="filters.status" @change="load">
          <option value="">Todos (no borrados)</option>
          <option value="pending_review">Pendientes</option>
          <option value="visible">Visibles</option>
          <option value="hidden">Ocultos</option>
        </select>
        <select v-model="filters.risk" @change="load">
          <option value="">Cualquier riesgo</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
          <option value="low">Bajo</option>
        </select>
        <label class="check inline">
          <input v-model="filters.suggestionPending" type="checkbox" @change="load" />
          Con sugerencia pendiente
        </label>
        <input
          v-model="filters.q"
          type="search"
          placeholder="Buscar texto / autor"
          @keyup.enter="load"
        />
        <button type="button" class="btn-ghost sm" @click="load">Filtrar</button>
      </div>

      <p v-if="loading" class="muted">Cargando…</p>
      <p v-else-if="error" class="err">{{ error }}</p>
      <p v-else-if="!items.length" class="muted">No hay comentarios en esta ventana (15 días).</p>

      <div v-else class="layout">
        <ul class="list">
          <li
            v-for="c in items"
            :key="c.id"
            class="row"
            :class="{ selected: selected?.id === c.id, [`risk-${c.moderationAi?.risk || 'low'}`]: true }"
            @click="selectComment(c)"
          >
            <div class="row-main">
              <button
                type="button"
                class="preview-thumb"
                title="Vista previa de la noticia"
                aria-label="Vista previa de la noticia"
                @click.stop="openPreview(c)"
              >
                <img v-if="c.post?.imageUrl" :src="c.post.imageUrl" alt="" />
                <span v-else class="preview-fallback" aria-hidden="true">📰</span>
              </button>
              <div class="row-body">
                <div class="row-top">
                  <span class="badge" :class="c.moderationAi?.risk || 'low'">
                    {{ (c.moderationAi?.risk || '—').toUpperCase() }} · {{ c.moderationAi?.score ?? 0 }}
                  </span>
                  <span class="status">{{ statusLabel(c.status) }}</span>
                </div>
                <p class="author">{{ c.authorName || 'Usuario' }} · {{ formatDate(c.createdAt) }}</p>
                <p class="snippet">{{ c.texto }}</p>
                <p v-if="c.postTitulo" class="post-ref">En: {{ c.postTitulo }}</p>
                <p v-if="c.moderationAi?.suggestedAction" class="sug">
                  Sugerencia: {{ actionLabel(c.moderationAi.suggestedAction) }}
                </p>
              </div>
              <button
                type="button"
                class="preview-icon"
                title="Abrir preview y moderar"
                aria-label="Abrir preview y moderar"
                @click.stop="openPreview(c)"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </li>
        </ul>

        <aside v-if="selected" class="detail">
          <h2>Detalle</h2>
          <button type="button" class="btn-ghost sm preview-cta" @click="openPreview(selected)">
            Ver noticia + comentar / moderar
          </button>
          <p class="meta">
            <strong>{{ selected.authorName }}</strong>
            · {{ statusLabel(selected.status) }}
            · {{ formatDate(selected.createdAt) }}
          </p>
          <p v-if="selected.postTitulo" class="post-ref">Publicación: {{ selected.postTitulo }}</p>
          <blockquote>{{ selected.texto }}</blockquote>

          <div v-if="selected.moderationAi?.status === 'ready'" class="ai-panel">
            <h3>Sugerencia IA</h3>
            <p>{{ selected.moderationAi.summary }}</p>
            <p>
              Acción: <strong>{{ actionLabel(selected.moderationAi.suggestedAction) }}</strong>
              · score {{ selected.moderationAi.score }}
            </p>
            <ul v-if="selected.moderationAi.reasons?.length">
              <li v-for="(r, i) in selected.moderationAi.reasons" :key="i">{{ r }}</li>
            </ul>
            <p v-if="selected.moderationAi.draftReply" class="draft">
              Borrador: {{ selected.moderationAi.draftReply }}
            </p>
            <div class="head-actions wrap">
              <button
                type="button"
                class="btn-primary"
                :disabled="busy"
                @click="acceptSuggestion"
              >
                Aceptar sugerencia
              </button>
              <button type="button" class="btn-ghost" :disabled="busy" @click="ignoreSuggestion">
                Ignorar
              </button>
              <button type="button" class="btn-ghost" :disabled="busy" @click="reanalyze">
                Re-analizar
              </button>
            </div>
          </div>

          <label class="field">
            Respuesta al autor
            <textarea v-model="replyText" rows="3" placeholder="Opcional / borrador IA" />
          </label>
          <label class="field">
            Motivo (al ocultar)
            <input v-model="hideReason" type="text" />
          </label>

          <div class="head-actions wrap">
            <button type="button" class="btn-primary" :disabled="busy" @click="approve">Aprobar</button>
            <button type="button" class="btn-ghost" :disabled="busy" @click="hide">Ocultar</button>
            <button type="button" class="btn-ghost" :disabled="busy || !replyText.trim()" @click="reply">
              Responder
            </button>
            <button type="button" class="btn-ghost danger" :disabled="busy" @click="softDelete">
              Eliminar
            </button>
          </div>
          <p v-if="actionMsg" class="ok">{{ actionMsg }}</p>
          <p v-if="actionErr" class="err">{{ actionErr }}</p>
        </aside>
      </div>
    </template>

    <div v-if="previewOpen && selected" class="sheet" @click.self="previewOpen = false">
      <div class="viewer-panel">
        <header class="viewer-head">
          <div>
            <h2>Preview · moderar</h2>
            <p class="muted small">Noticia + comentario. Accioná desde acá.</p>
          </div>
          <button type="button" class="btn-ghost sm" @click="previewOpen = false">Cerrar</button>
        </header>
        <div class="viewer-body">
          <div class="viewer-preview">
            <MobileFeedPreview
              v-if="selected.post"
              :post="previewPostModel"
              :truncate="false"
              label="Así se ve la publicación"
            />
            <p v-else class="muted">No se encontró la publicación asociada.</p>
            <div class="comment-on-post">
              <p class="comment-on-post-label">Comentario a moderar</p>
              <p class="comment-on-post-meta">
                <strong>{{ selected.authorName || 'Usuario' }}</strong>
                · {{ statusLabel(selected.status) }}
                · {{ formatDate(selected.createdAt) }}
              </p>
              <blockquote>{{ selected.texto }}</blockquote>
              <p v-if="selected.adminReply" class="draft">Respuesta actual: {{ selected.adminReply }}</p>
            </div>
          </div>
          <div class="viewer-actions">
            <div v-if="selected.moderationAi?.status === 'ready'" class="ai-panel">
              <h3>Sugerencia IA</h3>
              <p>{{ selected.moderationAi.summary }}</p>
              <p>
                Acción: <strong>{{ actionLabel(selected.moderationAi.suggestedAction) }}</strong>
                · score {{ selected.moderationAi.score }}
              </p>
              <ul v-if="selected.moderationAi.reasons?.length">
                <li v-for="(r, i) in selected.moderationAi.reasons" :key="i">{{ r }}</li>
              </ul>
              <p v-if="selected.moderationAi.draftReply" class="draft">
                Borrador: {{ selected.moderationAi.draftReply }}
              </p>
              <div class="head-actions wrap">
                <button type="button" class="btn-primary" :disabled="busy" @click="acceptSuggestion">
                  Aceptar sugerencia
                </button>
                <button type="button" class="btn-ghost" :disabled="busy" @click="ignoreSuggestion">
                  Ignorar
                </button>
                <button type="button" class="btn-ghost" :disabled="busy" @click="reanalyze">
                  Re-analizar
                </button>
              </div>
            </div>
            <label class="field">
              Respuesta al autor
              <textarea v-model="replyText" rows="3" placeholder="Opcional / borrador IA" />
            </label>
            <label class="field">
              Motivo (al ocultar)
              <input v-model="hideReason" type="text" />
            </label>
            <div class="head-actions wrap">
              <button type="button" class="btn-primary" :disabled="busy" @click="approve">Aprobar</button>
              <button type="button" class="btn-ghost" :disabled="busy" @click="hide">Ocultar</button>
              <button type="button" class="btn-ghost" :disabled="busy || !replyText.trim()" @click="reply">
                Responder
              </button>
              <button type="button" class="btn-ghost danger" :disabled="busy" @click="softDelete">
                Eliminar
              </button>
            </div>
            <p v-if="actionMsg" class="ok">{{ actionMsg }}</p>
            <p v-if="actionErr" class="err">{{ actionErr }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'
import MobileFeedPreview from '../components/MobileFeedPreview.vue'

const tab = ref('inbox')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const items = ref([])
const selected = ref(null)
const previewOpen = ref(false)
const pendingCount = ref(0)
const highRiskPending = ref(0)
const replyText = ref('')
const hideReason = ref('')
const actionMsg = ref('')
const actionErr = ref('')

const filters = reactive({
  status: 'pending_review',
  risk: '',
  q: '',
  suggestionPending: false,
})

const cfg = reactive({
  enabled: true,
  requireApproval: false,
  autoHideMinScore: 0,
  notifyModeratorsMinScore: 0,
  glossary: [],
})
const glossaryText = ref('')
const policies = ref([])
const aiConfigured = ref(false)
const savingCfg = ref(false)
const cfgMsg = ref('')
const cfgErr = ref('')

const previewPostModel = computed(() => {
  const p = selected.value?.post
  if (!p) return null
  return {
    ...p,
    layout: p.layout || 'vertical',
    reactions: p.reactions || { like: 0, love: 0, clap: 0 },
  }
})

function selectComment(c) {
  selected.value = c
}

function openPreview(c) {
  selected.value = c
  previewOpen.value = true
}
function statusLabel(s) {
  return (
    {
      visible: 'Visible',
      pending_review: 'Pendiente',
      hidden: 'Oculto',
      deleted: 'Eliminado',
    }[s] || s
  )
}

function actionLabel(a) {
  return (
    {
      approve: 'Aprobar',
      hide: 'Ocultar',
      reply: 'Responder',
      escalate: 'Escalar',
      review: 'Revisar manual',
    }[a] || a
  )
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(d)
  }
}

watch(selected, (c) => {
  replyText.value = c?.moderationAi?.draftReply || c?.adminReply || ''
  hideReason.value = c?.rejectionReason || c?.moderationAi?.summary || ''
  actionMsg.value = ''
  actionErr.value = ''
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      status: filters.status || undefined,
      risk: filters.risk || undefined,
      q: filters.q || undefined,
      suggestionPending: filters.suggestionPending ? '1' : undefined,
      sort: 'risk',
    }
    const { data } = await api.get('/admin/comments', { params })
    items.value = data.comments || []
    pendingCount.value = data.pendingCount || 0
    highRiskPending.value = data.highRiskPending || 0
    if (selected.value) {
      selected.value = items.value.find((c) => c.id === selected.value.id) || items.value[0] || null
    } else {
      selected.value = items.value[0] || null
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la bandeja'
  } finally {
    loading.value = false
  }
}

async function loadConfig() {
  try {
    const { data } = await api.get('/admin/comments/config')
    Object.assign(cfg, data.config || {})
    glossaryText.value = (cfg.glossary || []).join(', ')
    policies.value = data.policies || []
    aiConfigured.value = Boolean(data.aiConfigured)
  } catch (e) {
    cfgErr.value = e.response?.data?.error || 'No se pudo cargar config'
  }
}

async function saveConfig() {
  savingCfg.value = true
  cfgMsg.value = ''
  cfgErr.value = ''
  try {
    cfg.glossary = glossaryText.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const { data } = await api.put('/admin/comments/config', { config: { ...cfg } })
    Object.assign(cfg, data.config || cfg)
    cfgMsg.value = 'Configuración guardada'
  } catch (e) {
    cfgErr.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    savingCfg.value = false
  }
}

function patchSelected(comment) {
  if (!comment) return
  const idx = items.value.findIndex((c) => c.id === comment.id)
  if (idx >= 0) items.value[idx] = comment
  selected.value = comment
}

async function run(fn) {
  if (!selected.value || busy.value) return
  busy.value = true
  actionMsg.value = ''
  actionErr.value = ''
  try {
    await fn()
    actionMsg.value = 'Listo'
    await load()
  } catch (e) {
    actionErr.value = e.response?.data?.error || 'Acción fallida'
  } finally {
    busy.value = false
  }
}

function approve() {
  return run(async () => {
    const { data } = await api.patch(`/admin/comments/${selected.value.id}/approve`)
    patchSelected(data.comment)
  })
}

function hide() {
  return run(async () => {
    const { data } = await api.patch(`/admin/comments/${selected.value.id}/hide`, {
      reason: hideReason.value,
    })
    patchSelected(data.comment)
  })
}

function reply() {
  return run(async () => {
    const { data } = await api.patch(`/admin/comments/${selected.value.id}/reply`, {
      adminReply: replyText.value,
    })
    patchSelected(data.comment)
  })
}

function acceptSuggestion() {
  return run(async () => {
    const { data } = await api.post(`/admin/comments/${selected.value.id}/accept-suggestion`, {
      adminReply: replyText.value,
      reason: hideReason.value,
    })
    patchSelected(data.comment)
  })
}

function ignoreSuggestion() {
  return run(async () => {
    const { data } = await api.post(`/admin/comments/${selected.value.id}/ignore-suggestion`)
    patchSelected(data.comment)
  })
}

function reanalyze() {
  return run(async () => {
    const { data } = await api.post(`/admin/comments/${selected.value.id}/analyze`)
    patchSelected(data.comment)
  })
}

function softDelete() {
  if (!confirm('¿Eliminar (soft) este comentario?')) return
  return run(async () => {
    await api.delete(`/admin/comments/${selected.value.id}`)
    selected.value = null
    previewOpen.value = false
  })
}

async function exportCsv() {
  try {
    const { data } = await api.get('/admin/comments/export.csv', {
      params: {
        status: filters.status || undefined,
        risk: filters.risk || undefined,
        q: filters.q || undefined,
      },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'comentarios.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo exportar'
  }
}

onMounted(async () => {
  await Promise.all([load(), loadConfig()])
})
</script>

<style scoped>
.page {
  padding: 1.25rem 1.5rem 2.5rem;
  max-width: none;
}
.page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.page-head h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
}
.page-head p {
  margin: 0;
  color: #5a6570;
}
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.head-actions.wrap {
  margin-top: 0.75rem;
}
.btn-primary,
.btn-ghost {
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  font: inherit;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.btn-primary {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.btn-ghost.on {
  border-color: var(--ink);
  color: var(--ink);
}
.btn-ghost.sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
}
.btn-ghost.danger {
  color: #9b1c1c;
  border-color: #e0a0a0;
}
.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.stat {
  background: var(--panel-2);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.stat.risk {
  background: #fde8e8;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}
.filters input,
.filters select,
.field input,
.field textarea {
  font: inherit;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--line-2);
  border-radius: 8px;
}
.filters input[type='search'] {
  min-width: 180px;
}
.check {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin: 0.5rem 0;
}
.check.inline {
  margin: 0;
  font-size: 0.9rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0.75rem 0;
  font-size: 0.9rem;
}
.layout {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.1fr);
  gap: 1rem;
  align-items: start;
}
@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  max-height: 70vh;
  overflow: auto;
}
.row {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid #edf1f4;
  cursor: pointer;
}
.row:hover,
.row.selected {
  background: var(--panel-2);
}
.row-main {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
}
.row-body {
  min-width: 0;
  flex: 1;
}
.preview-thumb {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  border: 1px solid var(--line);
  overflow: hidden;
  padding: 0;
  background: var(--panel-2);
  cursor: pointer;
}
.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.preview-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 1.25rem;
}
.preview-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.preview-icon:hover {
  background: #e8eef2;
}
.preview-cta {
  margin-bottom: 0.75rem;
}
.row-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}
.badge {
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #e8eef2;
}
.badge.high {
  background: #f8d0d0;
  color: #8a1515;
}
.badge.medium {
  background: #f8e6c0;
  color: #7a5500;
}
.badge.low {
  background: #d8efe0;
  color: #1a5c34;
}
.author,
.snippet,
.post-ref,
.sug {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
}
.snippet {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-ref {
  color: #5a6570;
}
.sug {
  color: var(--ink);
  font-weight: 500;
}
.detail {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1rem;
  background: var(--panel);
}
.detail h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.detail blockquote {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #f4f7f9;
  border-radius: 8px;
  white-space: pre-wrap;
}
.ai-panel {
  margin: 0.75rem 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--panel-2);
}
.ai-panel h3 {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
}
.ai-panel ul {
  margin: 0.4rem 0;
  padding-left: 1.1rem;
}
.draft {
  font-style: italic;
  color: #3a4a55;
}
.panel {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1rem;
  max-width: 560px;
}
.policies {
  font-size: 0.85rem;
  color: #5a6570;
  padding-left: 1.1rem;
}
.muted {
  color: #6a7680;
}
.err {
  color: #9b1c1c;
}
.ok {
  color: #1a5c34;
}
.hint {
  font-size: 0.9rem;
  color: #5a6570;
}
.small {
  font-size: 0.85rem;
}
.sheet {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.viewer-panel {
  width: min(980px, 100%);
  max-height: min(92vh, 900px);
  overflow: auto;
  background: var(--panel);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
.viewer-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid #edf1f4;
}
.viewer-head h2 {
  margin: 0 0 0.2rem;
  font-size: 1.15rem;
}
.viewer-body {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(280px, 1.05fr);
  gap: 1rem;
  padding: 1rem;
}
@media (max-width: 860px) {
  .viewer-body {
    grid-template-columns: 1fr;
  }
}
.viewer-preview {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.comment-on-post {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.85rem;
  background: var(--panel-2);
}
.comment-on-post-label {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5a6570;
}
.comment-on-post-meta {
  margin: 0 0 0.4rem;
  font-size: 0.85rem;
}
.comment-on-post blockquote {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.95rem;
}
.viewer-actions {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.9rem;
  background: var(--panel);
}
</style>
