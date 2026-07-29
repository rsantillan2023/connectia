<template>
  <section class="sol">
    <header class="sol-head">
      <div>
        <h1>Mis solicitudes</h1>
        <p>Seguí el estado de tus pedidos</p>
      </div>
      <button type="button" class="sol-new" @click="openCreate">Nueva</button>
    </header>

    <div class="sol-filters">
      <select v-model="estado" class="sol-select" @change="load">
        <option v-for="f in estadoFilters" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
      <input v-model="q" type="search" placeholder="Buscar por asunto o código…" class="sol-search" @keyup.enter="load" />
    </div>

    <p v-if="error" class="sol-err">{{ error }}</p>
    <p v-if="loading" class="sol-muted">Cargando…</p>

    <div class="sol-list">
      <button
        v-for="r in items"
        :key="r.id"
        type="button"
        class="sol-card"
        :data-estado="r.estado"
        @click="$router.push(`/solicitudes/${r.id}`)"
      >
        <span class="sol-rail" aria-hidden="true" />
        <div class="sol-card-body">
          <div class="sol-card-top">
            <span class="sol-code">{{ r.codigo }}</span>
            <span class="sol-estado" :data-estado="r.estado">{{ r.estadoLabel || r.estado }}</span>
          </div>
          <div v-if="r.mediaUrl" class="sol-thumb">
            <PostMedia :url="r.mediaUrl" :alt="r.titulo" :autoplay-on-visible="false" />
          </div>
          <h2>{{ r.titulo }}</h2>
          <p class="sol-meta">
            <span>{{ r.tipoNombre }}</span>
            <span v-if="r.area" class="dot">·</span>
            <span v-if="r.area">{{ r.area }}</span>
          </p>
          <p v-if="r.cuerpo" class="sol-snippet">{{ snippet(r.cuerpo) }}</p>
          <dl v-if="cardCampos(r).length" class="sol-facts">
            <div v-for="c in cardCampos(r)" :key="c.key" class="sol-fact">
              <dt>{{ c.label }}</dt>
              <dd>{{ formatCampo(c) }}</dd>
            </div>
          </dl>
          <div class="sol-card-foot">
            <time :title="'Actualizado'">Act. {{ formatDate(r.updatedAt) }}</time>
            <time v-if="r.createdAt" class="sol-created" :title="'Creada'">Creada {{ formatDate(r.createdAt) }}</time>
            <span v-if="r.needsCompletion" class="sol-chip warn">Completar datos</span>
            <span v-else-if="r.origen === 'admin'" class="sol-chip">De gestión</span>
          </div>
        </div>
        <AppIcon class="sol-chevron" name="back" :size="18" />
      </button>
    </div>

    <p v-if="!loading && !items.length" class="sol-muted center">
      No tenés solicitudes{{ estado ? ' en este estado' : '' }}.
    </p>

    <div v-if="showCreate" class="sol-sheet" @click.self="showCreate = false">
      <form class="sol-sheet-panel" @submit.prevent="create">
        <h2>Nueva solicitud</h2>
        <select v-model="draft.tipoId" class="sol-select" required @change="onTipoChange">
          <option disabled value="">Tipo de solicitud</option>
          <option v-for="t in types" :key="t.id" :value="t.id">{{ t.nombre }} ({{ t.area }})</option>
        </select>
        <input v-model="draft.titulo" class="sol-search" placeholder="Asunto" required />

        <template v-for="c in selectedCampos" :key="c.key">
          <label class="sol-field">
            <span>{{ c.label }}<em v-if="c.required"> *</em></span>
            <select v-if="c.tipo === 'select'" v-model="draft.campos[c.key]" class="sol-select" :required="c.required">
              <option value="">Elegí…</option>
              <option v-for="o in c.opciones" :key="o" :value="o">{{ o }}</option>
            </select>
            <label v-else-if="c.tipo === 'check'" class="sol-check">
              <input v-model="draft.campos[c.key]" type="checkbox" />
              {{ c.placeholder || 'Sí' }}
            </label>
            <textarea
              v-else-if="c.tipo === 'textarea'"
              v-model="draft.campos[c.key]"
              rows="3"
              class="sol-search"
              :placeholder="c.placeholder"
              :required="c.required"
            />
            <input
              v-else
              v-model="draft.campos[c.key]"
              class="sol-search"
              :type="inputType(c.tipo)"
              :placeholder="c.placeholder"
              :required="c.required"
            />
          </label>
        </template>

        <textarea
          v-model="draft.cuerpo"
          rows="3"
          class="sol-search"
          :placeholder="selectedCampos.length ? 'Comentario adicional (opcional)' : 'Contanos qué necesitás'"
          :required="!selectedCampos.length"
        />

        <p v-if="formError" class="sol-err">{{ formError }}</p>
        <div class="sol-sheet-actions">
          <button type="button" class="sol-ghost" @click="showCreate = false">Cancelar</button>
          <button class="sol-new" :disabled="saving">{{ saving ? 'Enviando…' : 'Enviar' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import PostMedia from '../components/PostMedia.vue'

const route = useRoute()
const router = useRouter()
const items = ref([])
const types = ref([])
const estadosActivos = ref([])
const q = ref('')
const estado = ref('')
const loading = ref(true)
const error = ref('')
const showCreate = ref(false)
const formError = ref('')
const saving = ref(false)
const draft = ref({ tipoId: '', titulo: '', cuerpo: '', campos: {} })

const estadoFilters = computed(() => [
  { value: '', label: 'Todas' },
  ...estadosActivos.value.map((e) => ({ value: e.key, label: e.label })),
])

const selectedCampos = computed(() => {
  const t = types.value.find((x) => x.id === draft.value.tipoId)
  return t?.campos || []
})

function inputType(tipo) {
  if (tipo === 'number') return 'number'
  if (tipo === 'date') return 'date'
  if (tipo === 'email') return 'email'
  if (tipo === 'url') return 'url'
  return 'text'
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function snippet(text, max = 110) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function formatCampo(c) {
  if (c?.tipo === 'check') return c.value === true || c.value === 'true' || c.value === 'Sí' ? 'Sí' : 'No'
  return String(c?.value ?? '')
}

/** Motivo, fechas y detalle primero; máx. 4 en la card. */
function cardCampos(r) {
  const rows = Array.isArray(r?.camposValores) ? r.camposValores : []
  const prefer = ['motivo', 'desde', 'hasta', 'detalle', 'sistema', 'prioridad', 'planta', 'tema']
  const scored = rows
    .map((c) => ({
      ...c,
      value: formatCampo(c),
      _score: prefer.indexOf(String(c.key || '').toLowerCase()),
    }))
    .filter((c) => c.value !== '' && c.value != null)
  scored.sort((a, b) => {
    const as = a._score < 0 ? 99 : a._score
    const bs = b._score < 0 ? 99 : b._score
    return as - bs
  })
  return scored.slice(0, 4)
}

function onTipoChange() {
  const campos = {}
  for (const c of selectedCampos.value) {
    campos[c.key] = c.tipo === 'check' ? false : ''
  }
  draft.value.campos = campos
}

function openCreate(prefTipo = '') {
  formError.value = ''
  showCreate.value = true
  if (prefTipo) {
    const match = types.value.find((t) => t.id === prefTipo || t.key === prefTipo)
    if (match) {
      draft.value.tipoId = match.id
      onTipoChange()
      return
    }
  }
  if (types.value.length && !draft.value.tipoId) {
    draft.value.tipoId = types.value[0].id
    onTipoChange()
  }
}

function consumeNuevaQuery() {
  if (route.query.nueva !== '1' && route.query.nueva !== 'true') return
  openCreate(String(route.query.tipo || ''))
  const q = { ...route.query }
  delete q.nueva
  delete q.tipo
  router.replace({ path: route.path, query: q })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (estado.value) params.estado = estado.value
    if (q.value.trim().length >= 2) params.q = q.value.trim()
    const { data } = await api.get('/requests', { params })
    items.value = data.items || []
    if (data.estados?.length) estadosActivos.value = data.estados
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las solicitudes'
  } finally {
    loading.value = false
  }
}

async function loadMeta() {
  const [{ data: typesData }, { data: cfgData }] = await Promise.all([
    api.get('/request-types'),
    api.get('/requests/meta/config'),
  ])
  types.value = typesData.items || []
  estadosActivos.value = cfgData.config?.estados || []
  if (types.value.length && !draft.value.tipoId) {
    draft.value.tipoId = types.value[0].id
    onTipoChange()
  }
}

async function create() {
  formError.value = ''
  saving.value = true
  try {
    const { data } = await api.post('/requests', {
      tipoId: draft.value.tipoId,
      titulo: draft.value.titulo,
      cuerpo: draft.value.cuerpo,
      campos: draft.value.campos,
    })
    showCreate.value = false
    draft.value = { tipoId: types.value[0]?.id || '', titulo: '', cuerpo: '', campos: {} }
    onTipoChange()
    await router.push(`/solicitudes/${data.request.id}`)
  } catch (e) {
    formError.value = e.response?.data?.error || 'No se pudo crear'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadMeta().catch(() => {})
  await load()
  consumeNuevaQuery()
})

watch(
  () => route.query.nueva,
  () => consumeNuevaQuery(),
)
</script>

<style scoped>
.sol {
  padding: 12px 14px 28px;
}

.sol-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.sol-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  color: var(--cx-text);
}

.sol-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
}

.sol-new {
  border: 0;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.sol-filters {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.sol-select,
.sol-search {
  width: 100%;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 14px;
  padding: 11px 12px;
  font-size: 14px;
}

.sol-field {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--cx-muted);
}

.sol-field em {
  color: #b45309;
  font-style: normal;
}

.sol-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--cx-text);
}

.sol-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sol-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  text-align: left;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 18px;
  padding: 0;
  color: var(--cx-text);
  overflow: hidden;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--cx-text) 4%, transparent);
}

.sol-rail {
  width: 5px;
  flex-shrink: 0;
  background: var(--cx-muted);
}

.sol-card[data-estado='abierta'] .sol-rail,
.sol-estado[data-estado='abierta'] {
  --st: #0284c7;
}
.sol-card[data-estado='en_proceso'] .sol-rail,
.sol-estado[data-estado='en_proceso'] {
  --st: #ca8a04;
}
.sol-card[data-estado='a_completar'] .sol-rail,
.sol-estado[data-estado='a_completar'] {
  --st: #ea580c;
}
.sol-card[data-estado='en_espera'] .sol-rail,
.sol-estado[data-estado='en_espera'] {
  --st: #7c3aed;
}
.sol-card[data-estado='escalada'] .sol-rail,
.sol-estado[data-estado='escalada'] {
  --st: #db2777;
}
.sol-card[data-estado='resuelta'] .sol-rail,
.sol-estado[data-estado='resuelta'] {
  --st: var(--brand-primary);
}
.sol-card[data-estado='cerrada'] .sol-rail,
.sol-estado[data-estado='cerrada'] {
  --st: #64748b;
}
.sol-card[data-estado='cancelada'] .sol-rail,
.sol-estado[data-estado='cancelada'] {
  --st: #dc2626;
}

.sol-card[data-estado] .sol-rail {
  background: var(--st, var(--cx-muted));
}

.sol-card-body {
  flex: 1;
  min-width: 0;
  padding: 14px 4px 14px 14px;
}

.sol-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.sol-thumb {
  margin: 0 0 10px;
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 16 / 9;
  max-height: 140px;
}

.sol-thumb :deep(.pmedia),
.sol-thumb :deep(.el) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.sol-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--cx-muted);
  letter-spacing: 0.02em;
}

.sol-estado {
  --st: var(--cx-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--st);
  background: color-mix(in srgb, var(--st) 14%, transparent);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}

.sol-card h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--cx-text);
}

.sol-meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.sol-meta .dot {
  opacity: 0.5;
}

.sol-snippet {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--cx-text);
  opacity: 0.88;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sol-facts {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-border) 35%, transparent);
  display: grid;
  gap: 6px;
}

.sol-fact {
  display: grid;
  grid-template-columns: minmax(72px, 34%) 1fr;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
}

.sol-fact dt {
  margin: 0;
  color: var(--cx-muted);
  font-weight: 650;
}

.sol-fact dd {
  margin: 0;
  color: var(--cx-text);
  font-weight: 600;
  word-break: break-word;
}

.sol-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.sol-card-foot time {
  font-size: 12px;
  color: var(--cx-muted);
}

.sol-created {
  opacity: 0.85;
}

.sol-chip {
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  padding: 3px 8px;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}

.sol-chip.warn {
  background: color-mix(in srgb, #ea580c 16%, transparent);
  color: #c2410c;
}

.sol-chevron {
  flex-shrink: 0;
  align-self: center;
  margin-right: 12px;
  color: var(--cx-muted);
  opacity: 0.55;
  transform: rotate(180deg);
}

.sol-muted {
  font-size: 13px;
  color: var(--cx-muted);
}

.sol-muted.center {
  text-align: center;
  padding: 36px 8px;
}

.sol-err {
  font-size: 13px;
  color: #9a3412;
  background: #fff7ed;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.sol-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sol-sheet-panel {
  width: min(100%, 430px);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  padding: 18px 16px max(18px, env(safe-area-inset-bottom));
  display: grid;
  gap: 10px;
  max-height: 88dvh;
  overflow-y: auto;
}

.sol-sheet-panel h2 {
  margin: 0 0 4px;
  font-size: 1.1rem;
}

.sol-sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.sol-ghost {
  border: 1px solid var(--cx-border);
  background: transparent;
  color: var(--cx-text);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
}
</style>
