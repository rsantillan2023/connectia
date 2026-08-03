<template>
  <section class="aprob">
    <header class="aprob-head">
      <div>
        <h1>Aprobaciones</h1>
        <p v-if="pendingCount">{{ pendingCount }} pendiente{{ pendingCount === 1 ? '' : 's' }} para vos</p>
        <p v-else>Tu bandeja unificada de trámites</p>
      </div>
    </header>

    <div class="aprob-filters" role="tablist" aria-label="Filtrar aprobaciones">
      <button
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': scope === 'mine' }"
        :aria-selected="scope === 'mine'"
        @click="setScope('mine')"
      >
        Para aprobar
      </button>
      <button
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': scope === 'requested' }"
        :aria-selected="scope === 'requested'"
        @click="setScope('requested')"
      >
        Mis pedidos
      </button>
    </div>

    <p v-if="error" class="aprob-err">{{ error }}</p>
    <p v-if="loading && !items.length" class="aprob-muted">Cargando…</p>

    <ul class="aprob-list">
      <li v-for="a in items" :key="a.id" class="card" :class="{ actionable: a.canDecide }">
        <button type="button" class="card-main" @click="openDetail(a)">
          <span class="mod" :data-mod="a.origen?.module">{{ a.origen?.moduleLabel || 'Trámite' }}</span>
          <strong>{{ a.origen?.titulo || a.definitionName }}</strong>
          <p class="meta">
            <span v-if="a.origen?.codigo">{{ a.origen.codigo }} · </span>
            {{ a.solicitanteName || 'Solicitante' }}
            <span v-if="a.currentStep"> · {{ a.currentStep.nombre }}</span>
          </p>
          <p v-if="a.origenDetalle?.tipoNombre" class="meta soft">
            {{ a.origenDetalle.tipoNombre }}
            <span v-if="a.origenDetalle.area"> · {{ a.origenDetalle.area }}</span>
          </p>
          <p v-if="a.origenDetalle?.cuerpo" class="snippet">{{ snippet(a.origenDetalle.cuerpo) }}</p>
          <dl v-if="previewCampos(a).length" class="facts">
            <div v-for="c in previewCampos(a)" :key="c.key" class="fact">
              <dt>{{ c.label }}</dt>
              <dd>{{ c.value }}</dd>
            </div>
          </dl>
          <p v-if="a.currentStep?.condition" class="cond">{{ a.currentStep.condition }}</p>
          <div class="row">
            <span class="badge" :data-st="a.status">{{ statusLabel(a.status) }}</span>
            <time>Act. {{ formatDate(a.updatedAt || a.createdAt) }}</time>
          </div>
          <div v-if="a.origenDetalle?.createdAt" class="row dates">
            <time>Creado {{ formatDate(a.origenDetalle.createdAt) }}</time>
          </div>
        </button>

        <div v-if="a.canDecide && scope === 'mine'" class="actions">
          <button type="button" class="btn reject" :disabled="busyId === a.id" @click="askDecide(a, 'rechazar')">
            Rechazar
          </button>
          <button type="button" class="btn ok" :disabled="busyId === a.id" @click="askDecide(a, 'aprobar')">
            Aprobar
          </button>
        </div>
        <div v-else class="actions subtle">
          <button type="button" class="link" @click="openDetail(a)">Ver detalle</button>
          <button
            v-if="a.origen?.deepLink && a.origen.deepLink !== '/aprobaciones'"
            type="button"
            class="link"
            @click="goOrigin(a)"
          >
            Ir al origen
          </button>
        </div>
      </li>
    </ul>

    <p v-if="!loading && !items.length" class="aprob-muted center">{{ emptyMessage }}</p>

    <button v-if="hasMore" type="button" class="more" :disabled="loading" @click="loadMore">
      {{ loading ? 'Cargando…' : 'Ver más' }}
    </button>

    <!-- Sheet detalle / decidir -->
    <div v-if="detail" class="sheet-root" @click.self="detail = null">
      <div class="sheet" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <h2>{{ detail.origen?.titulo || detail.definitionName }}</h2>
          <button type="button" class="x" aria-label="Cerrar" @click="detail = null">×</button>
        </header>
        <p class="sheet-meta">
          {{ detail.definitionName }} · {{ detail.origen?.moduleLabel }}
          <span v-if="detail.origen?.codigo"> · {{ detail.origen.codigo }}</span>
        </p>
        <p class="sheet-who">De {{ detail.solicitanteName }} · {{ statusLabel(detail.status) }}</p>

        <div v-if="detail.origenDetalle" class="origin-box">
          <h3>Datos del pedido</h3>
          <p v-if="detail.origenDetalle.tipoNombre" class="origin-type">
            {{ detail.origenDetalle.tipoNombre }}
            <span v-if="detail.origenDetalle.area"> · {{ detail.origenDetalle.area }}</span>
          </p>
          <p v-if="detail.origenDetalle.cuerpo" class="origin-body">{{ detail.origenDetalle.cuerpo }}</p>
          <dl v-if="detail.origenDetalle.campos?.length" class="facts sheet-facts">
            <div v-for="c in detail.origenDetalle.campos" :key="c.key" class="fact">
              <dt>{{ c.label }}</dt>
              <dd>{{ c.value }}</dd>
            </div>
          </dl>
          <p class="origin-dates">
            <span v-if="detail.origenDetalle.createdAt">Creado {{ formatDate(detail.origenDetalle.createdAt) }}</span>
            <span v-if="detail.origenDetalle.updatedAt"> · Act. {{ formatDate(detail.origenDetalle.updatedAt) }}</span>
          </p>
        </div>

        <ol class="timeline">
          <li
            v-for="(s, i) in detail.steps"
            :key="i"
            :class="{
              done: i < detail.stepIndex || detail.status === 'aprobado',
              current: i === detail.stepIndex && ['en_curso', 'pendiente'].includes(detail.status),
              rejected: detail.status === 'rechazado' && i === detail.stepIndex,
            }"
          >
            <span class="dot" />
            <div>
              <strong>{{ s.nombre }}</strong>
              <small v-if="s.condition">{{ s.condition }}</small>
              <small>SLA {{ s.slaHoras || 48 }} h</small>
            </div>
          </li>
        </ol>

        <div v-if="detail.history?.length" class="hist">
          <h3>Historial</h3>
          <ul>
            <li v-for="(h, i) in detail.history" :key="i">
              <strong>{{ h.actorName || '—' }}</strong>
              {{ decisionWord(h.decision) }}
              <span v-if="h.comentario"> — {{ h.comentario }}</span>
              <time>{{ formatDate(h.at) }}</time>
            </li>
          </ul>
        </div>

        <label v-if="detail.canDecide" class="lbl">
          Comentario (opcional)
          <textarea v-model="comment" class="ta" rows="2" maxlength="500" placeholder="Ej. OK solo lectura" />
        </label>

        <footer class="sheet-foot">
          <button
            v-if="detail.origen?.deepLink"
            type="button"
            class="btn ghost"
            @click="goOrigin(detail)"
          >
            Ver origen
          </button>
          <template v-if="detail.canDecide">
            <button type="button" class="btn reject" :disabled="busyId === detail.id" @click="confirmDecide('rechazar')">
              Rechazar
            </button>
            <button type="button" class="btn ok" :disabled="busyId === detail.id" @click="confirmDecide('aprobar')">
              Aprobar
            </button>
          </template>
        </footer>
      </div>
    </div>

    <ConfirmSheet
      v-if="confirmOpen"
      :title="confirmDecision === 'aprobar' ? '¿Aprobar este trámite?' : '¿Rechazar este trámite?'"
      :message="confirmMessage"
      :confirm-label="confirmDecision === 'aprobar' ? 'Sí, aprobar' : 'Sí, rechazar'"
      cancel-label="Cancelar"
      busy-label="Guardando…"
      :busy="Boolean(busyId)"
      @confirm="doDecide"
      @cancel="confirmOpen = false"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ConfirmSheet from '../components/ConfirmSheet.vue'

const router = useRouter()
const items = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const hasMore = ref(false)
const scope = ref('mine')
const busyId = ref('')
const detail = ref(null)
const comment = ref('')
const confirmOpen = ref(false)
const confirmDecision = ref('aprobar')
const pendingTarget = ref(null)

const pendingCount = computed(() => (scope.value === 'mine' ? items.value.filter((a) => a.canDecide).length : 0))

const emptyMessage = computed(() => {
  if (scope.value === 'mine') return 'No tenés nada para aprobar ahora. ¡Buen momento!'
  return 'Todavía no pediste trámites con workflow.'
})

const confirmMessage = computed(() => {
  const t = pendingTarget.value?.origen?.titulo || 'este trámite'
  return confirmDecision.value === 'aprobar'
    ? `Se va a aprobar «${t}» y el flujo avanzará al siguiente paso (o cerrará).`
    : `Se va a rechazar «${t}». El solicitante verá el rechazo en el historial.`
})

function statusLabel(s) {
  return (
    {
      pendiente: 'Pendiente',
      en_curso: 'En curso',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      cancelado: 'Cancelado',
    }[s] || s
  )
}

function decisionWord(d) {
  if (d === 'aprobar') return 'aprobó'
  if (d === 'rechazar') return 'rechazó'
  if (d === 'inicio') return 'inició'
  if (d === 'omitido') return 'omitió (no aplicaba)'
  if (d === 'aprobado') return 'cerró automáticamente'
  if (d === 'sistema') return 'sistema'
  return d
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function snippet(text, max = 100) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function previewCampos(a) {
  const rows = a?.origenDetalle?.campos || []
  const prefer = ['motivo', 'desde', 'hasta', 'detalle', 'sistema', 'prioridad', 'planta', 'tema', 'category']
  const scored = [...rows].sort((x, y) => {
    const as = prefer.indexOf(String(x.key || '').toLowerCase())
    const bs = prefer.indexOf(String(y.key || '').toLowerCase())
    return (as < 0 ? 99 : as) - (bs < 0 ? 99 : bs)
  })
  return scored.slice(0, 4)
}

function setScope(s) {
  scope.value = s
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/approvals', {
      params: { scope: scope.value, page: page.value, limit: 30 },
    })
    const rows = data?.items || []
    items.value = page.value === 1 ? rows : [...items.value, ...rows]
    hasMore.value = Boolean(data?.hasMore)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la bandeja'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  page.value += 1
  load()
}

async function openDetail(a) {
  comment.value = ''
  try {
    const { data } = await api.get(`/approvals/${a.id}`)
    detail.value = data?.approval || a
  } catch {
    detail.value = a
  }
}

function goOrigin(a) {
  const link = a.origen?.deepLink
  if (!link) return
  detail.value = null
  router.push(link)
}

function askDecide(a, decision) {
  pendingTarget.value = a
  confirmDecision.value = decision
  confirmOpen.value = true
}

function confirmDecide(decision) {
  pendingTarget.value = detail.value
  confirmDecision.value = decision
  confirmOpen.value = true
}

async function doDecide() {
  const a = pendingTarget.value
  if (!a) return
  busyId.value = a.id
  try {
    const { data } = await api.post(`/approvals/${a.id}/decide`, {
      decision: confirmDecision.value,
      comentario: comment.value,
    })
    const updated = data?.approval
    confirmOpen.value = false
    detail.value = null
    comment.value = ''
    if (updated) {
      const idx = items.value.findIndex((x) => x.id === a.id)
      if (scope.value === 'mine') {
        if (idx >= 0) items.value.splice(idx, 1)
      } else if (idx >= 0) {
        items.value[idx] = updated
      }
    } else {
      await load()
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo registrar la decisión'
    confirmOpen.value = false
  } finally {
    busyId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.aprob {
  padding: 16px 16px 40px;
  max-width: 640px;
  margin: 0 auto;
  min-height: 100%;
  background:
    linear-gradient(180deg, #f0fdfa 0%, #f8fafc 28%, #f8fafc 100%);
}
.aprob-head h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.aprob-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.92rem;
}
.aprob-filters {
  display: flex;
  gap: 8px;
  margin: 16px 0 12px;
}
.chip {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 8px 14px;
  font: inherit;
  font-weight: 650;
  font-size: 0.88rem;
  cursor: pointer;
}
.chip.is-active {
  background: var(--brand-primary, #0f766e);
  border-color: var(--brand-primary, #0f766e);
  color: #fff;
}
.aprob-err {
  color: #b91c1c;
  background: #fef2f2;
  padding: 10px 12px;
  border-radius: 12px;
}
.aprob-muted {
  color: #94a3b8;
  margin: 20px 0;
}
.aprob-muted.center {
  text-align: center;
  padding: 32px 12px;
}
.aprob-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}
.card.actionable {
  border-color: #99f6e4;
}
.card-main {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 14px 16px 10px;
  font: inherit;
  cursor: pointer;
  color: inherit;
}
.mod {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  margin-bottom: 8px;
}
.mod[data-mod='documentos'] {
  background: #f3e8ff;
  color: #6b21a8;
}
.card-main strong {
  display: block;
  font-size: 1.02rem;
  color: #0f172a;
  line-height: 1.3;
}
.meta {
  margin: 6px 0 0;
  font-size: 0.86rem;
  color: #64748b;
}
.meta.soft {
  color: #94a3b8;
  font-size: 0.8rem;
}
.snippet {
  margin: 8px 0 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.facts {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: grid;
  gap: 6px;
}
.fact {
  display: grid;
  grid-template-columns: minmax(70px, 36%) 1fr;
  gap: 8px;
  font-size: 0.8rem;
}
.fact dt {
  margin: 0;
  color: #94a3b8;
  font-weight: 650;
}
.fact dd {
  margin: 0;
  color: #0f172a;
  font-weight: 650;
  word-break: break-word;
}
.row.dates {
  margin-top: 4px;
  justify-content: flex-start;
}
.cond {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--brand-primary, #0f766e);
  background: #f0fdfa;
  padding: 6px 8px;
  border-radius: 8px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 8px;
}
.row time {
  font-size: 0.78rem;
  color: #94a3b8;
}
.badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
}
.badge[data-st='en_curso'],
.badge[data-st='pendiente'] {
  background: #fef3c7;
  color: #92400e;
}
.badge[data-st='aprobado'] {
  background: #d1fae5;
  color: #065f46;
}
.badge[data-st='rechazado'] {
  background: #fee2e2;
  color: #991b1b;
}
.actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}
.actions.subtle {
  justify-content: flex-end;
}
.btn {
  flex: 1;
  border-radius: 12px;
  padding: 11px 12px;
  font: inherit;
  font-weight: 700;
  border: 0;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.55;
}
.btn.ok {
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.btn.reject {
  background: #fff;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.btn.ghost {
  background: #f1f5f9;
  color: #334155;
  flex: 0 1 auto;
}
.link {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-weight: 650;
  font-size: 0.88rem;
  cursor: pointer;
  padding: 8px;
}
.more {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font: inherit;
  font-weight: 650;
  color: #334155;
  cursor: pointer;
}
.sheet-root {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: min(520px, 100%);
  max-height: 88vh;
  overflow: auto;
  background: #fff;
  border-radius: 22px 22px 0 0;
  padding: 16px 18px 24px;
  animation: up 0.22s ease;
}
@keyframes up {
  from {
    transform: translateY(24px);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.sheet-head h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.3;
}
.x {
  border: 0;
  background: #f1f5f9;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
  color: #475569;
}
.sheet-meta,
.sheet-who {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.88rem;
}
.origin-box {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.origin-box h3 {
  margin: 0 0 6px;
  font-size: 0.88rem;
  color: #0f172a;
}
.origin-type {
  margin: 0 0 6px;
  font-size: 0.82rem;
  color: #64748b;
}
.origin-body {
  margin: 0 0 8px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #334155;
  white-space: pre-wrap;
}
.sheet-facts {
  margin-top: 8px;
  background: #fff;
}
.origin-dates {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
}
.timeline {
  list-style: none;
  margin: 18px 0 0;
  padding: 0 0 0 8px;
  border-left: 2px solid #e2e8f0;
}
.timeline li {
  position: relative;
  padding: 0 0 14px 16px;
}
.timeline .dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #fff;
}
.timeline li.done .dot {
  background: var(--brand-primary, #0f766e);
}
.timeline li.current .dot {
  background: #f59e0b;
  box-shadow: 0 0 0 4px #fef3c7;
}
.timeline li.rejected .dot {
  background: #dc2626;
}
.timeline strong {
  display: block;
  font-size: 0.92rem;
}
.timeline small {
  display: block;
  color: #94a3b8;
  font-size: 0.78rem;
  margin-top: 2px;
}
.hist {
  margin-top: 8px;
}
.hist h3 {
  margin: 0 0 8px;
  font-size: 0.9rem;
}
.hist ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.hist li {
  font-size: 0.86rem;
  color: #475569;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}
.hist time {
  display: block;
  color: #94a3b8;
  font-size: 0.75rem;
  margin-top: 2px;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  font-size: 0.88rem;
  font-weight: 650;
  color: #334155;
}
.ta {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
}
.sheet-foot {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.sheet-foot .btn {
  flex: 1;
  min-width: 110px;
}
</style>
