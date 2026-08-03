<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'

const loading = ref(true)
const sending = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ areas: [], items: [] })
const items = ref([])
const mode = ref('pedir') // pedir | mis
const filterArea = ref('')
const q = ref('')
const selectedId = ref('')
const note = ref('')
const answers = ref({})
const feedbackText = ref('')
const csatScore = ref(5)
const csatComment = ref('')
const showFeedback = ref(false)

const catalogVisible = computed(() => {
  let list = meta.value.items || []
  if (filterArea.value) list = list.filter((i) => i.areaId === filterArea.value)
  const term = q.value.trim().toLowerCase()
  if (term) {
    list = list.filter(
      (i) =>
        i.label.toLowerCase().includes(term) ||
        (i.description || '').toLowerCase().includes(term) ||
        (i.keywords || []).some((k) => String(k).toLowerCase().includes(term)),
    )
  }
  return list
})

const catalogByArea = computed(() => {
  const areas = meta.value.areas || []
  const groups = []
  for (const a of areas) {
    const list = catalogVisible.value.filter((i) => i.areaId === a.id)
    if (list.length) groups.push({ area: a, items: list })
  }
  const known = new Set(areas.map((a) => a.id))
  const orphan = catalogVisible.value.filter((i) => !known.has(i.areaId))
  if (orphan.length) {
    groups.push({ area: { id: '_', name: 'Otros', color: '#64748b' }, items: orphan })
  }
  return groups
})

const selected = computed(() =>
  (meta.value.items || []).find((i) => i.id === selectedId.value) || null,
)

const openCount = computed(
  () => items.value.filter((r) => r.status === 'recibido' || r.status === 'en_curso').length,
)

const areaName = (id) => (meta.value.areas || []).find((a) => a.id === id)?.name || ''

const areaColor = (id) => (meta.value.areas || []).find((a) => a.id === id)?.color || 'var(--brand-primary, #0d9488)'

watch(selectedId, (id) => {
  const item = (meta.value.items || []).find((i) => i.id === id)
  const next = {}
  for (const f of item?.fields || []) next[f.key] = ''
  answers.value = next
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const [m, list] = await Promise.all([api.get('/servicios/meta'), api.get('/servicios')])
    meta.value = m.data
    items.value = list.data.items || []
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function pickService(id) {
  selectedId.value = id
  mode.value = 'pedir'
}

function clearSelection() {
  selectedId.value = ''
  note.value = ''
}

async function submit() {
  if (!selected.value || sending.value) return
  sending.value = true
  err.value = ''
  ok.value = ''
  try {
    const idem =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `srv-${Date.now()}`
    const formAnswers = (selected.value.fields || []).map((f) => ({
      key: f.key,
      value: String(answers.value[f.key] ?? ''),
    }))
    const { data } = await api.post(
      '/servicios',
      {
        catalogItemId: selected.value.id,
        formAnswers,
        note: note.value.trim(),
        idempotencyKey: idem,
      },
      { headers: { 'Idempotency-Key': idem } },
    )
    ok.value = `Listo: pedido #${data.item.number} enviado`
    clearSelection()
    mode.value = 'mis'
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    sending.value = false
  }
}

async function cancel(req) {
  if (!confirm(`¿Cancelar el pedido #${req.number}?`)) return
  try {
    await api.patch(`/servicios/${req.id}`, { status: 'cancelado' })
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function sendCsat(req) {
  try {
    await api.post(`/servicios/${req.id}/csat`, {
      score: Number(csatScore.value),
      comment: csatComment.value,
    })
    ok.value = `Gracias por tu opinión sobre #${req.number}`
    csatComment.value = ''
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function sendFeedback() {
  try {
    await api.post('/servicios/feedback', {
      text: feedbackText.value,
      catalogItemId: selectedId.value || undefined,
    })
    ok.value = 'Gracias, lo revisamos del lado de gestión'
    feedbackText.value = ''
    showFeedback.value = false
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

function statusTone(status) {
  if (status === 'resuelto') return 'ok'
  if (status === 'cancelado') return 'muted'
  if (status === 'en_curso') return 'warn'
  return 'new'
}

const statusLabel = {
  recibido: 'Recibido',
  en_curso: 'En curso',
  resuelto: 'Listo',
  cancelado: 'Cancelado',
}

function slaHint(item) {
  const m = Number(item?.slaMinutes) || 0
  if (!m) return ''
  if (m < 60) return `Respuesta habitual: ~${m} min`
  const h = Math.round(m / 60)
  return `Respuesta habitual: ~${h} h`
}

onMounted(load)
</script>

<template>
  <section class="sv">
    <header class="sv-hero">
      <p class="sv-kicker">Ayuda interna</p>
      <h1>Servicios</h1>
      <p class="sv-lead">
        Pedí a RRHH, IT u otras áreas lo que necesitás para trabajar: EPP, accesos, constancias y
        más. Seguís el estado acá.
      </p>
    </header>

    <nav class="sv-tabs" role="tablist" aria-label="Servicios">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'pedir'"
        :class="{ on: mode === 'pedir' }"
        @click="mode = 'pedir'"
      >
        Pedir
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'mis'"
        :class="{ on: mode === 'mis' }"
        @click="mode = 'mis'"
      >
        Mis pedidos
        <span v-if="openCount" class="sv-count">{{ openCount }}</span>
      </button>
    </nav>

    <p v-if="err" class="sv-banner err" role="alert">{{ err }}</p>
    <p v-if="ok" class="sv-banner ok" role="status">{{ ok }}</p>

    <template v-if="mode === 'pedir'">
      <!-- Formulario de un servicio elegido -->
      <div v-if="selected" class="sv-form-card">
        <button type="button" class="sv-back" @click="clearSelection">← Volver al catálogo</button>
        <div class="sv-form-head">
          <span class="sv-area-pill" :style="{ '--ac': areaColor(selected.areaId) }">
            {{ areaName(selected.areaId) }}
          </span>
          <h2>{{ selected.label }}</h2>
          <p v-if="selected.description">{{ selected.description }}</p>
          <p v-if="slaHint(selected)" class="sv-sla-hint">{{ slaHint(selected) }}</p>
        </div>

        <label v-for="f in selected.fields || []" :key="f.key" class="sv-label">
          {{ f.label }}{{ f.required ? ' *' : '' }}
          <select v-if="f.type === 'select'" v-model="answers[f.key]" class="sv-input">
            <option value="">Elegí…</option>
            <option v-for="o in f.options || []" :key="o" :value="o">{{ o }}</option>
          </select>
          <textarea
            v-else-if="f.type === 'textarea'"
            v-model="answers[f.key]"
            class="sv-input"
            rows="3"
          />
          <input
            v-else
            v-model="answers[f.key]"
            class="sv-input"
            :type="f.type === 'number' ? 'number' : 'text'"
          />
        </label>

        <label class="sv-label">
          Comentario (opcional)
          <textarea
            v-model="note"
            class="sv-input"
            rows="2"
            placeholder="Algo más que el equipo deba saber…"
          />
        </label>

        <button type="button" class="sv-primary" :disabled="sending || loading" @click="submit">
          {{ sending ? 'Enviando…' : 'Enviar pedido' }}
        </button>
      </div>

      <!-- Catálogo -->
      <template v-else>
        <div class="sv-search-row">
          <input
            v-model="q"
            class="sv-input"
            type="search"
            placeholder="Buscar: VPN, EPP, constancia…"
          />
          <select v-model="filterArea" class="sv-input sv-area-select">
            <option value="">Todas las áreas</option>
            <option v-for="a in meta.areas" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>

        <p v-if="loading" class="sv-empty">Cargando catálogo…</p>
        <p v-else-if="!catalogVisible.length" class="sv-empty">
          No hay servicios con ese filtro. Probá otra búsqueda o pedí que agreguen uno.
        </p>

        <section v-for="g in catalogByArea" :key="g.area.id" class="sv-group">
          <h2 class="sv-group-title">
            <span class="sv-dot" :style="{ background: g.area.color || 'var(--brand-primary, #0d9488)' }" />
            {{ g.area.name }}
          </h2>
          <div class="sv-grid">
            <button
              v-for="i in g.items"
              :key="i.id"
              type="button"
              class="sv-card"
              @click="pickService(i.id)"
            >
              <strong>{{ i.label }}</strong>
              <span v-if="i.description">{{ i.description }}</span>
              <em v-if="slaHint(i)">{{ slaHint(i) }}</em>
            </button>
          </div>
        </section>

        <button type="button" class="sv-ghost" @click="showFeedback = !showFeedback">
          {{ showFeedback ? 'Ocultar' : '¿Falta un servicio? Decilo' }}
        </button>
        <div v-if="showFeedback" class="sv-feedback">
          <textarea
            v-model="feedbackText"
            class="sv-input"
            rows="3"
            placeholder="Ej. necesito pedir cambio de domicilio desde la app…"
          />
          <button type="button" class="sv-secondary" @click="sendFeedback">Enviar idea</button>
        </div>
      </template>
    </template>

    <template v-else>
      <p v-if="loading" class="sv-empty">Cargando…</p>
      <p v-else-if="!items.length" class="sv-empty">
        Todavía no pediste nada. Andá a <button type="button" class="sv-inline" @click="mode = 'pedir'">Pedir</button>
        y elegí un servicio.
      </p>
      <ul v-else class="sv-list">
        <li v-for="r in items" :key="r.id" class="sv-item">
          <div class="sv-item-top">
            <strong>#{{ r.number }} · {{ r.catalogLabel || 'Servicio' }}</strong>
            <span class="sv-badge" :data-tone="statusTone(r.status)">
              {{ statusLabel[r.status] || r.status }}
            </span>
          </div>
          <p class="sv-meta">
            <span v-if="r.areaName">{{ r.areaName }}</span>
            <span v-if="r.slaBreached" class="sv-late"> · demorado</span>
          </p>
          <button
            v-if="r.status === 'recibido'"
            type="button"
            class="sv-link"
            @click="cancel(r)"
          >
            Cancelar pedido
          </button>
          <div v-if="r.status === 'resuelto' && !r.csat?.score" class="sv-rate">
            <p>¿Cómo te fue?</p>
            <div class="sv-rate-row">
              <select v-model.number="csatScore" class="sv-input">
                <option v-for="n in 5" :key="n" :value="n">{{ n }} / 5</option>
              </select>
              <input
                v-model="csatComment"
                class="sv-input"
                placeholder="Comentario opcional"
              />
              <button type="button" class="sv-secondary" @click="sendCsat(r)">Enviar</button>
            </div>
          </div>
          <p v-else-if="r.csat?.score" class="sv-meta">Tu nota: {{ r.csat.score }}/5</p>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.sv {
  padding: 1rem 1rem 5.5rem;
  max-width: 36rem;
  margin: 0 auto;
}
.sv-hero {
  margin-bottom: 1rem;
}
.sv-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-primary, #0f766e);
}
.sv-hero h1 {
  margin: 0;
  font-size: 1.55rem;
  letter-spacing: -0.03em;
  color: var(--cx-text, #0f172a);
}
.sv-lead {
  margin: 0.4rem 0 0;
  color: var(--cx-muted, #64748b);
  font-size: 0.95rem;
  line-height: 1.45;
}
.sv-tabs {
  display: flex;
  gap: 0.35rem;
  margin: 0 0 1rem;
  padding: 0.25rem;
  background: #f1f5f9;
  border-radius: 999px;
}
.sv-tabs button {
  flex: 1;
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-weight: 650;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
.sv-tabs button.on {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}
.sv-count {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--brand-primary, #0d9488);
  color: #fff;
  font-size: 0.7rem;
  display: inline-grid;
  place-items: center;
}
.sv-banner {
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  margin: 0 0 0.85rem;
  font-size: 0.9rem;
}
.sv-banner.err {
  background: #fef2f2;
  color: #b91c1c;
}
.sv-banner.ok {
  background: #ecfdf5;
  color: #047857;
  font-weight: 600;
}
.sv-search-row {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.sv-group {
  margin-bottom: 1.25rem;
}
.sv-group-title {
  margin: 0 0 0.55rem;
  font-size: 0.85rem;
  font-weight: 750;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sv-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
}
.sv-grid {
  display: grid;
  gap: 0.55rem;
}
.sv-card {
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  cursor: pointer;
  display: grid;
  gap: 0.3rem;
  font: inherit;
  color: inherit;
}
.sv-card:hover {
  border-color: #99f6e4;
  background: #f0fdfa;
}
.sv-card strong {
  font-size: 0.98rem;
}
.sv-card span {
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sv-card em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
}
.sv-form-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}
.sv-back {
  border: 0;
  background: none;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-weight: 650;
  padding: 0;
  cursor: pointer;
  text-align: left;
  width: fit-content;
}
.sv-form-head h2 {
  margin: 0.35rem 0 0.25rem;
  font-size: 1.2rem;
}
.sv-form-head p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.4;
}
.sv-area-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ac, var(--brand-primary, #0d9488));
  background: color-mix(in srgb, var(--ac, var(--brand-primary, #0d9488)) 12%, #fff);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.sv-sla-hint {
  color: var(--brand-primary, #0f766e) !important;
  font-weight: 600;
  margin-top: 0.35rem !important;
}
.sv-label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 650;
  color: #334155;
}
.sv-input {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  font: inherit;
  width: 100%;
  box-sizing: border-box;
  background: #fff;
}
.sv-primary,
.sv-secondary {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.sv-primary {
  background: var(--brand-primary, #0d9488);
  color: #fff;
}
.sv-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.sv-secondary {
  background: #e2e8f0;
  color: #0f172a;
}
.sv-ghost {
  border: 0;
  background: none;
  color: #64748b;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.sv-feedback {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
.sv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.sv-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.9rem 1rem;
}
.sv-item-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}
.sv-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
}
.sv-badge[data-tone='ok'] {
  background: #d1fae5;
  color: #047857;
}
.sv-badge[data-tone='warn'] {
  background: #ffedd5;
  color: #c2410c;
}
.sv-badge[data-tone='new'] {
  background: #ccfbf1;
  color: var(--brand-primary, #0f766e);
}
.sv-badge[data-tone='muted'] {
  background: #f1f5f9;
  color: #64748b;
}
.sv-meta {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}
.sv-late {
  color: #b91c1c;
  font-weight: 650;
}
.sv-link {
  margin-top: 0.5rem;
  border: 0;
  background: none;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  padding: 0;
}
.sv-rate {
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid #e2e8f0;
}
.sv-rate p {
  margin: 0 0 0.4rem;
  font-weight: 650;
  font-size: 0.88rem;
}
.sv-rate-row {
  display: grid;
  gap: 0.4rem;
}
.sv-empty {
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.45;
  margin: 0.5rem 0 1rem;
}
.sv-inline {
  border: 0;
  background: none;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
</style>
