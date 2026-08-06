<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const tab = ref('bandeja')
const loading = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ users: [], statuses: [] })
const areas = ref([])
const catalog = ref([])
const items = ref([])
const feedback = ref([])
const report = ref(null)
const filters = ref({ status: '', areaId: '' })
const selected = ref(null)

const areaForm = ref({ name: '', color: '#0d9488' })
const itemForm = ref({
  label: '',
  areaId: '',
  slaMinutes: 1440,
  description: '',
  keywords: '',
  fieldsJson: '[]',
  requireApproval: false,
  createJiraIssue: false,
  audienceMode: 'all',
})

const statusLabel = {
  recibido: 'Recibido',
  en_curso: 'En curso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
}

const areaMap = computed(() => Object.fromEntries(areas.value.map((a) => [a.id, a])))

const openCount = computed(
  () => items.value.filter((r) => r.status === 'recibido' || r.status === 'en_curso').length,
)

const pendingIdeas = computed(
  () => feedback.value.filter((f) => f.status === 'pendiente').length,
)

async function ensureCaps() {
  try {
    await api.post('/admin/servicios/ensure-menu')
  } catch {
    /* ignore */
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/servicios/meta')
  meta.value = data
}

async function loadAreas() {
  const { data } = await api.get('/admin/servicios/areas')
  areas.value = data.items || []
  if (!itemForm.value.areaId && areas.value[0]) {
    itemForm.value.areaId = areas.value[0].id
  }
}

async function loadCatalog() {
  const { data } = await api.get('/admin/servicios/items')
  catalog.value = data.items || []
}

async function loadBandeja() {
  const params = {}
  if (filters.value.status) params.status = filters.value.status
  if (filters.value.areaId) params.areaId = filters.value.areaId
  const { data } = await api.get('/admin/servicios', { params })
  items.value = data.items || []
}

async function loadFeedback() {
  const { data } = await api.get('/admin/servicios/feedback')
  feedback.value = data.items || []
}

async function loadReport() {
  const { data } = await api.get('/admin/servicios/reportes')
  report.value = data
}

async function refreshAll() {
  err.value = ''
  ok.value = ''
  loading.value = true
  try {
    await ensureCaps()
    const results = await Promise.allSettled([
      loadMeta(),
      loadAreas(),
      loadCatalog(),
      loadBandeja(),
      loadFeedback(),
      loadReport(),
    ])
    const failed = results.find((r) => r.status === 'rejected')
    if (failed) {
      const e = failed.reason
      err.value =
        e?.response?.data?.error ||
        e?.message ||
        'No se pudo cargar el portal de servicios'
    }
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function createArea() {
  err.value = ''
  try {
    await api.post('/admin/servicios/areas', areaForm.value)
    areaForm.value = { name: '', color: '#0d9488' }
    ok.value = 'Área creada'
    await loadAreas()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function createItem() {
  err.value = ''
  try {
    let fields = []
    try {
      fields = JSON.parse(itemForm.value.fieldsJson || '[]')
    } catch {
      return (err.value = 'El JSON de campos no es válido')
    }
    await api.post('/admin/servicios/items', {
      label: itemForm.value.label,
      areaId: itemForm.value.areaId,
      slaMinutes: Number(itemForm.value.slaMinutes) || 0,
      description: itemForm.value.description,
      keywords: itemForm.value.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      fields,
      requireApproval: itemForm.value.requireApproval,
      createJiraIssue: itemForm.value.createJiraIssue,
      audience: { mode: itemForm.value.audienceMode || 'all' },
    })
    itemForm.value.label = ''
    itemForm.value.description = ''
    itemForm.value.keywords = ''
    itemForm.value.fieldsJson = '[]'
    itemForm.value.requireApproval = false
    itemForm.value.createJiraIssue = false
    ok.value = 'Servicio agregado al catálogo'
    await loadCatalog()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function patchRequest(payload) {
  if (!selected.value) return
  err.value = ''
  try {
    const { data } = await api.patch(`/admin/servicios/${selected.value.id}`, payload)
    selected.value = data.item
    ok.value = 'Pedido actualizado'
    await loadBandeja()
    await loadReport()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function patchFeedback(id, payload) {
  try {
    await api.patch(`/admin/servicios/feedback/${id}`, payload)
    await loadFeedback()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

function slaHoursLabel(minutes) {
  const m = Number(minutes) || 0
  if (!m) return 'Sin plazo'
  if (m < 60) return `${m} min`
  return `${Math.round(m / 60)} h`
}

onMounted(refreshAll)
</script>

<template>
  <div class="sa">
    <AdminPageHeader
      title="Servicios internos"
      subtitle="Lo que el equipo pide a RRHH, IT y otras áreas — y cómo lo atienden"
    >
      <template #actions>
        <button type="button" class="btn-ghost" :disabled="loading" @click="refreshAll">
          Actualizar
        </button>
      </template>
    </AdminPageHeader>

    <ScreenHelp
      purpose="Portal para que las personas pidan servicios internos (EPP, accesos, constancias…) y el staff los gestione con plazos y asignación."
      can-do="Atender la bandeja, armar el catálogo por área, revisar ideas del equipo y mirar el resumen de volumen."
    />

    <div class="sa-purpose">
      <div>
        <strong>Para la gente</strong>
        <span>Eligen un servicio del catálogo y cargan un pedido en la app.</span>
      </div>
      <div>
        <strong>Para gestión</strong>
        <span>Acá ven los pedidos, cambian estado, asignan y configuran qué se puede pedir.</span>
      </div>
    </div>

    <p v-if="err" class="sa-err" role="alert">{{ err }}</p>
    <p v-if="ok" class="sa-ok" role="status">{{ ok }}</p>

    <nav class="sa-tabs" aria-label="Secciones">
      <button type="button" :class="{ on: tab === 'bandeja' }" @click="tab = 'bandeja'">
        Pedidos
        <span v-if="openCount" class="sa-pill">{{ openCount }}</span>
      </button>
      <button type="button" :class="{ on: tab === 'items' }" @click="tab = 'items'">
        Catálogo
      </button>
      <button type="button" :class="{ on: tab === 'areas' }" @click="tab = 'areas'">Áreas</button>
      <button type="button" :class="{ on: tab === 'feedback' }" @click="tab = 'feedback'">
        Ideas
        <span v-if="pendingIdeas" class="sa-pill soft">{{ pendingIdeas }}</span>
      </button>
      <button type="button" :class="{ on: tab === 'reportes' }" @click="tab = 'reportes'">
        Resumen
      </button>
    </nav>

    <!-- Pedidos -->
    <section v-if="tab === 'bandeja'" class="sa-panel">
      <header class="sa-panel-head">
        <div>
          <h2>Pedidos entrantes</h2>
          <p>Tomá un pedido, asignalo y marcá el avance hasta resolverlo.</p>
        </div>
        <div class="sa-filters">
          <select v-model="filters.status" @change="loadBandeja">
            <option value="">Todos los estados</option>
            <option v-for="s in meta.statuses || []" :key="s" :value="s">
              {{ statusLabel[s] || s }}
            </option>
          </select>
          <select v-model="filters.areaId" @change="loadBandeja">
            <option value="">Todas las áreas</option>
            <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
      </header>

      <div v-if="!items.length && !loading" class="sa-empty">
        <strong>No hay pedidos todavía</strong>
        <p>
          Cuando alguien pida desde la app, aparecen acá. Si el catálogo está vacío, cargá
          servicios en la pestaña Catálogo.
        </p>
        <button type="button" class="sa-btn" @click="tab = 'items'">Ir al catálogo</button>
      </div>

      <div v-else class="sa-split">
        <ul class="sa-list">
          <li
            v-for="r in items"
            :key="r.id"
            :class="{ sel: selected?.id === r.id }"
            @click="selected = r"
          >
            <div class="sa-row-top">
              <strong>#{{ r.number }} · {{ r.catalogLabel }}</strong>
              <span class="sa-status">{{ statusLabel[r.status] || r.status }}</span>
            </div>
            <span class="muted">
              {{ r.areaName || 'Sin área' }}
              <template v-if="r.slaBreached"> · plazo vencido</template>
            </span>
          </li>
        </ul>

        <div v-if="selected" class="sa-detail">
          <h3>#{{ selected.number }} — {{ selected.catalogLabel }}</h3>
          <p class="muted">
            {{ selected.areaName }} · {{ statusLabel[selected.status] }}
            <template v-if="selected.jiraSync?.issueKey">
              · Jira {{ selected.jiraSync.issueKey }}
            </template>
            <template v-if="selected.csat?.score">
              · opinión {{ selected.csat.score }}/5
            </template>
          </p>
          <p v-if="selected.note" class="sa-note">“{{ selected.note }}”</p>
          <label>
            Estado
            <select
              :value="selected.status"
              @change="patchRequest({ status: $event.target.value })"
            >
              <option
                v-for="s in meta.statuses || []"
                :key="s"
                :value="s"
                :disabled="s === selected.status"
              >
                {{ statusLabel[s] || s }}
              </option>
            </select>
          </label>
          <label>
            Quién lo atiende
            <select
              :value="selected.assigneeId || ''"
              @change="patchRequest({ assigneeId: $event.target.value || null })"
            >
              <option value="">— sin asignar —</option>
              <option v-for="u in meta.users || []" :key="u.id" :value="u.id">
                {{ u.label }}
              </option>
            </select>
          </label>
          <label>
            Notas internas (solo gestión)
            <textarea
              :value="selected.internalNotes || ''"
              rows="3"
              @change="patchRequest({ internalNotes: $event.target.value })"
            />
          </label>
        </div>
        <div v-else class="sa-detail sa-detail--hint">
          <p>Elegí un pedido de la lista para ver el detalle y cambiar el estado.</p>
        </div>
      </div>
    </section>

    <!-- Catálogo -->
    <section v-else-if="tab === 'items'" class="sa-panel">
      <header class="sa-panel-head">
        <div>
          <h2>Catálogo de servicios</h2>
          <p>Estos son los pedidos que la gente ve y puede iniciar en la app.</p>
        </div>
      </header>

      <div class="sa-two">
        <form class="sa-form-card" @submit.prevent="createItem">
          <h3>Agregar servicio</h3>
          <label>
            Nombre
            <input v-model="itemForm.label" required placeholder="Ej. Pedido de EPP" />
          </label>
          <label>
            Área responsable
            <select v-model="itemForm.areaId" required>
              <option disabled value="">Elegí un área…</option>
              <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </label>
          <label>
            Plazo habitual (minutos)
            <input v-model.number="itemForm.slaMinutes" type="number" min="0" />
            <small>Ej. 1440 = 24 h. Se muestra en la app como tiempo de respuesta.</small>
          </label>
          <label>
            Descripción corta
            <input
              v-model="itemForm.description"
              placeholder="Qué cubre este servicio, en una frase"
            />
          </label>
          <label>
            Palabras clave (para búsqueda)
            <input v-model="itemForm.keywords" placeholder="vpn, acceso, notebook" />
          </label>
          <label class="chk">
            <input v-model="itemForm.requireApproval" type="checkbox" />
            Requiere aprobación antes de avanzar
          </label>
          <label class="chk">
            <input v-model="itemForm.createJiraIssue" type="checkbox" />
            Crear ticket en Jira al pedir
          </label>
          <label>
            Quién puede pedirlo
            <select v-model="itemForm.audienceMode">
              <option value="all">Toda la comunidad</option>
              <option value="none">Nadie (oculto)</option>
            </select>
          </label>
          <label>
            Campos del formulario (JSON)
            <textarea
              v-model="itemForm.fieldsJson"
              rows="4"
              placeholder='[{"key":"talle","label":"Talle","type":"select","required":true,"options":["S","M","L"]}]'
            />
            <small>Definí qué datos pide el formulario al usuario.</small>
          </label>
          <button type="submit" class="sa-btn" :disabled="!areas.length">
            {{ areas.length ? 'Agregar al catálogo' : 'Creá un área primero' }}
          </button>
        </form>

        <div>
          <div v-if="!catalog.length" class="sa-empty">
            <strong>Catálogo vacío</strong>
            <p>Sin ítems, la app no tiene nada que ofrecer. Agregá el primero con el formulario.</p>
          </div>
          <ul v-else class="sa-list">
            <li v-for="i in catalog" :key="i.id" class="sa-cat-item">
              <strong>{{ i.label }}</strong>
              <span class="muted">
                {{ areaMap[i.areaId]?.name || 'Sin área' }} · plazo
                {{ slaHoursLabel(i.slaMinutes) }}
                <template v-if="i.requireApproval"> · con aprobación</template>
                <template v-if="i.createJiraIssue"> · Jira</template>
              </span>
              <p v-if="i.description" class="sa-desc">{{ i.description }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Áreas -->
    <section v-else-if="tab === 'areas'" class="sa-panel">
      <header class="sa-panel-head">
        <div>
          <h2>Áreas receptoras</h2>
          <p>Grupos que atienden (RRHH, IT, Planta…). Cada servicio del catálogo cuelga de un área.</p>
        </div>
      </header>
      <div class="sa-form">
        <input v-model="areaForm.name" placeholder="Nombre del área" />
        <input v-model="areaForm.color" type="color" title="Color" />
        <button type="button" class="sa-btn" @click="createArea">Agregar área</button>
      </div>
      <ul class="sa-list">
        <li v-for="a in areas" :key="a.id">
          <span class="dot" :style="{ background: a.color }" />
          {{ a.name }}
        </li>
        <li v-if="!areas.length" class="muted">Todavía no hay áreas. Creá RRHH o IT para empezar.</li>
      </ul>
    </section>

    <!-- Ideas -->
    <section v-else-if="tab === 'feedback'" class="sa-panel">
      <header class="sa-panel-head">
        <div>
          <h2>Ideas del equipo</h2>
          <p>Pedidos de servicios que todavía no están en el catálogo.</p>
        </div>
      </header>
      <ul class="sa-list">
        <li v-for="f in feedback" :key="f.id">
          <p class="sa-idea">{{ f.text }}</p>
          <span class="muted">{{ f.status }} · {{ new Date(f.createdAt).toLocaleString() }}</span>
          <div class="sa-filters">
            <button type="button" class="sa-btn ghost" @click="patchFeedback(f.id, { status: 'revisado' })">
              Marcado revisado
            </button>
            <button type="button" class="sa-btn ghost" @click="patchFeedback(f.id, { status: 'descartado' })">
              Descartar
            </button>
          </div>
        </li>
        <li v-if="!feedback.length" class="muted">Nadie sugirió servicios nuevos todavía.</li>
      </ul>
    </section>

    <!-- Resumen -->
    <section v-else class="sa-panel">
      <header class="sa-panel-head">
        <div>
          <h2>Resumen</h2>
          <p>Volumen, demoras y opinión de quien recibió el servicio.</p>
        </div>
        <button type="button" class="sa-btn" @click="loadReport">Actualizar</button>
      </header>
      <div v-if="report" class="sa-report">
        <div class="sa-kpis">
          <article>
            <span>Total</span>
            <strong>{{ report.totals?.total ?? 0 }}</strong>
          </article>
          <article>
            <span>Plazo vencido</span>
            <strong>{{ report.totals?.slaBreached ?? 0 }}</strong>
          </article>
          <article>
            <span>Opinión promedio</span>
            <strong>
              {{ report.totals?.csat?.average ?? '—' }}
              <small v-if="report.totals?.csat?.count">({{ report.totals.csat.count }})</small>
            </strong>
          </article>
        </div>
        <h3>Por estado</h3>
        <ul>
          <li v-for="(v, k) in report.totals?.byStatus || {}" :key="k">
            {{ statusLabel[k] || k }}: {{ v }}
          </li>
        </ul>
        <h3>Por área</h3>
        <ul>
          <li v-for="(v, k) in report.totals?.byArea || {}" :key="k">{{ k }}: {{ v }}</li>
        </ul>
        <h3>Por servicio</h3>
        <ul>
          <li v-for="(v, k) in report.totals?.byCatalog || {}" :key="k">{{ k }}: {{ v }}</li>
        </ul>
      </div>
      <p v-else class="muted">Sin datos todavía.</p>
    </section>
  </div>
</template>

<style scoped>
.sa {
  padding: 0 0 2rem;
  max-width: 1100px;
  color: var(--ink);
}
.sa-purpose {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 0 0 1rem;
}
@media (max-width: 720px) {
  .sa-purpose {
    grid-template-columns: 1fr;
  }
}
.sa-purpose > div {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: grid;
  gap: 0.25rem;
  box-shadow: var(--sh);
}
.sa-purpose strong {
  font-size: 0.82rem;
  color: var(--brand-ink, var(--ink));
}
.sa-purpose span {
  font-size: 0.84rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.sa-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.sa-tabs button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sa-tabs button.on {
  background: var(--brand-soft);
  color: var(--brand-ink);
  border-color: var(--brand-line);
}
.sa-pill {
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.7rem;
  display: inline-grid;
  place-items: center;
}
.sa-pill.soft {
  background: color-mix(in srgb, var(--brand) 35%, var(--panel));
  color: var(--brand-ink);
}
.sa-panel {
  background: transparent;
}
.sa-panel-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
  align-items: flex-end;
}
.sa-panel-head h2 {
  margin: 0;
  font-size: 1.05rem;
}
.sa-panel-head p {
  margin: 0.25rem 0 0;
  color: var(--ink-soft);
  font-size: 0.85rem;
  max-width: 40rem;
}
.sa-filters,
.sa-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}
.sa-two {
  display: grid;
  grid-template-columns: minmax(280px, 22rem) 1fr;
  gap: 1rem;
}
@media (max-width: 900px) {
  .sa-two {
    grid-template-columns: 1fr;
  }
}
.sa-form-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
  box-shadow: var(--sh);
  align-content: start;
}
.sa-form-card h3 {
  margin: 0;
  font-size: 0.95rem;
}
.sa-form-card label,
.sa-detail label,
.chk {
  display: grid;
  gap: 0.25rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.sa-form-card small {
  font-weight: 400;
  color: var(--ink-faint, var(--ink-soft));
  font-size: 0.75rem;
}
.chk {
  grid-template-columns: auto 1fr;
  align-items: center;
}
.sa-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 800px) {
  .sa-split {
    grid-template-columns: 1fr;
  }
}
.sa-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.sa-list li {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  color: var(--ink);
  box-shadow: var(--sh);
}
.sa-list li.sel {
  border-color: var(--brand-line);
  background: color-mix(in srgb, var(--brand-soft) 55%, var(--panel));
}
.sa-row-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}
.sa-status {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--panel-2, #f1f5f9);
  color: var(--ink-soft);
  flex-shrink: 0;
}
.sa-detail {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
  box-shadow: var(--sh);
  align-content: start;
}
.sa-detail--hint {
  place-content: center;
  min-height: 10rem;
  text-align: center;
  color: var(--ink-soft);
}
.sa-detail h3 {
  margin: 0;
}
.sa-note {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink);
  background: color-mix(in srgb, var(--brand-soft) 40%, transparent);
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
}
.sa-desc {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.sa-cat-item {
  cursor: default;
}
.sa-idea {
  margin: 0 0 0.35rem;
  line-height: 1.4;
}
.sa-empty {
  background: var(--panel);
  border: 1px dashed var(--line-2);
  border-radius: 12px;
  padding: 1.25rem;
  display: grid;
  gap: 0.4rem;
  justify-items: start;
}
.sa-empty p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
  max-width: 36rem;
}
.sa-detail select,
.sa-detail textarea,
.sa-filters select,
.sa-form input,
.sa-form select,
.sa-form-card input,
.sa-form-card select,
.sa-form-card textarea {
  font: inherit;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--line-2);
  border-radius: 9px;
  background: var(--cx-input, var(--panel-2));
  color: var(--ink);
}
.sa-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  background: var(--brand);
  color: #fff;
}
.sa-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sa-btn.ghost {
  background: transparent;
  color: var(--brand-ink, var(--ink));
  border: 1px solid var(--line-2);
}
.btn-ghost {
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  border-radius: 10px;
  padding: 0.55rem 0.875rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.sa-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 1rem;
}
.sa-kpis article {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.85rem;
  display: grid;
  gap: 0.25rem;
}
.sa-kpis span {
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.sa-kpis strong {
  font-size: 1.35rem;
}
.sa-kpis small {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink-soft);
}
.sa-report h3 {
  margin: 0.85rem 0 0.35rem;
}
.sa-report ul {
  padding-left: 1.1rem;
  margin: 0;
}
.muted {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
.dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  margin-right: 0.35rem;
  vertical-align: middle;
}
.sa-err {
  color: var(--bad);
  background: var(--bad-bg);
  padding: 0.55rem 0.75rem;
  border-radius: 9px;
}
.sa-ok {
  color: var(--ok);
  background: var(--ok-bg);
  font-weight: 600;
  padding: 0.55rem 0.75rem;
  border-radius: 9px;
}
</style>
