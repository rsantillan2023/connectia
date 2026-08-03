<template>
  <section class="ag">
    <header class="ag-head">
      <div>
        <h1>Agenda</h1>
        <p>{{ monthLabel }}</p>
      </div>
      <div class="ag-head-actions">
        <button type="button" class="ag-gear" :class="{ on: viewMode === 'month' }" @click="viewMode = 'month'" title="Mes">
          ▦
        </button>
        <button type="button" class="ag-gear" :class="{ on: viewMode === 'list' }" @click="viewMode = 'list'" title="Lista">
          ☰
        </button>
        <button type="button" class="ag-gear" @click="showSettings = !showSettings" title="Calendarios">
          ⚙
        </button>
      </div>
    </header>

    <div v-if="todaySummary" class="ag-today">
      <div class="ag-today-head">
        <strong>Qué tengo hoy</strong>
        <button type="button" class="ag-link" :disabled="summaryBusy" @click="loadTodaySummary">
          {{ summaryBusy ? '…' : 'Actualizar' }}
        </button>
      </div>
      <p class="ag-today-text">{{ todaySummary }}</p>
    </div>

    <div v-if="showSettings" class="ag-settings">
      <h2>Calendarios personales</h2>
      <p class="ag-hint">
        Conectá Outlook o Google para verlos acá y sincronizar eventos (lectura y escritura).
      </p>
      <p v-if="calError" class="ag-err">{{ calError }}</p>
      <div v-if="calStatus" class="ag-conn">
        <div v-if="calStatus.policy?.outlookEnabled" class="ag-conn-row">
          <div>
            <strong>Outlook</strong>
            <span v-if="outlookConn"> · {{ outlookConn.accountEmail || 'conectado' }}</span>
            <span v-else class="muted"> · no conectado</span>
          </div>
          <button
            v-if="!outlookConn"
            type="button"
            class="ag-btn"
            :disabled="!calStatus.providers?.OUTLOOK?.configured"
            @click="connect('OUTLOOK')"
          >
            Conectar
          </button>
          <button v-else type="button" class="ag-btn ghost" @click="disconnect('OUTLOOK')">Desconectar</button>
        </div>
        <div v-if="calStatus.policy?.googleEnabled" class="ag-conn-row">
          <div>
            <strong>Google</strong>
            <span v-if="googleConn"> · {{ googleConn.accountEmail || 'conectado' }}</span>
            <span v-else class="muted"> · no conectado</span>
          </div>
          <button
            v-if="!googleConn"
            type="button"
            class="ag-btn"
            :disabled="!calStatus.providers?.GOOGLE?.configured"
            @click="connect('GOOGLE')"
          >
            Conectar
          </button>
          <button v-else type="button" class="ag-btn ghost" @click="disconnect('GOOGLE')">Desconectar</button>
        </div>
        <p
          v-if="!calStatus.policy?.outlookEnabled && !calStatus.policy?.googleEnabled"
          class="ag-hint"
        >
          Tu organización no habilitó calendarios externos. Podés ver solo eventos corporativos.
        </p>
      </div>

      <h3 class="ag-sub">Crear en mi calendario</h3>
      <form v-if="outlookConn || googleConn" class="ag-personal" @submit.prevent="createPersonal">
        <select v-model="personal.provider" class="ag-input" required>
          <option v-if="outlookConn" value="OUTLOOK">Outlook</option>
          <option v-if="googleConn" value="GOOGLE">Google</option>
        </select>
        <input v-model="personal.titulo" class="ag-input" placeholder="Título" required />
        <input v-model="personal.inicio" type="datetime-local" class="ag-input" required />
        <input v-model="personal.fin" type="datetime-local" class="ag-input" required />
        <button type="submit" class="ag-btn" :disabled="personalBusy">
          {{ personalBusy ? 'Creando…' : 'Crear evento' }}
        </button>
        <button type="button" class="ag-btn ghost" :disabled="slotsBusy" @click="suggestSlots">
          {{ slotsBusy ? 'Buscando…' : 'Sugerir horario libre' }}
        </button>
        <ul v-if="suggestedSlots.length" class="ag-slots">
          <li v-for="(s, i) in suggestedSlots" :key="i">
            <button type="button" class="ag-link" @click="applySlot(s)">{{ s.label }}</button>
          </li>
        </ul>
      </form>
    </div>

    <div class="ag-nav">
      <button type="button" class="ag-nav-btn" @click="shiftMonth(-1)">‹</button>
      <button type="button" class="ag-nav-btn" @click="goToday">Hoy</button>
      <button type="button" class="ag-nav-btn" @click="shiftMonth(1)">›</button>
    </div>

    <div class="ag-layers">
      <button
        v-for="l in layerOptions"
        :key="l.id"
        type="button"
        class="ag-chip"
        :class="{ on: layers.includes(l.id) }"
        @click="toggleLayer(l.id)"
      >
        <span class="dot" :style="{ background: l.color }" />
        {{ l.label }}
      </button>
    </div>

    <p v-for="(w, i) in warnings" :key="i" class="ag-warn">{{ w.provider }}: {{ w.message }}</p>
    <p v-if="error" class="ag-err" role="alert">{{ error }}</p>
    <p v-if="flash" class="ag-ok">{{ flash }}</p>

    <div v-if="loading" class="ag-muted">Cargando agenda…</div>

    <!-- Vista mes -->
    <div v-else-if="viewMode === 'month'" class="ag-month">
      <div class="ag-month-head">
        <span v-for="d in weekDays" :key="d">{{ d }}</span>
      </div>
      <div class="ag-month-grid">
        <button
          v-for="(cell, idx) in monthCells"
          :key="idx"
          type="button"
          class="ag-cell"
          :class="{
            muted: !cell.inMonth,
            today: cell.isToday,
            selected: cell.ymd === selectedDay,
            has: cell.count > 0,
          }"
          @click="selectDay(cell)"
        >
          <span class="ag-cell-num">{{ cell.day }}</span>
          <span v-if="cell.count" class="ag-cell-dots">
            <i
              v-for="(c, i) in cell.colors.slice(0, 3)"
              :key="i"
              :style="{ background: c }"
            />
          </span>
        </button>
      </div>
      <div class="ag-day-list">
        <h3 v-if="selectedDay">{{ selectedDayLabel }}</h3>
        <article
          v-for="item in dayItems"
          :key="item.id"
          class="ag-card"
          @click="openItem(item)"
        >
          <div class="ag-body">
            <div class="ag-meta">
              <span class="pill" :style="{ background: originColor(item.origin) }">{{ originLabel(item.origin) }}</span>
            </div>
            <h2>{{ item.titulo }}</h2>
            <p>{{ timeRange(item) }}{{ item.lugar ? ` · ${item.lugar}` : '' }}</p>
          </div>
        </article>
        <p v-if="selectedDay && !dayItems.length" class="ag-muted">Sin eventos este día</p>
      </div>
    </div>

    <div v-else class="ag-list">
      <article
        v-for="item in items"
        :key="item.id"
        class="ag-card"
        :class="`origin-${item.origin}`"
        @click="openItem(item)"
      >
        <div class="ag-when">
          <span class="ag-day">{{ dayNum(item.inicio) }}</span>
          <span class="ag-mon">{{ monShort(item.inicio) }}</span>
        </div>
        <div class="ag-body">
          <div class="ag-meta">
            <span class="pill" :style="{ background: originColor(item.origin) }">{{ originLabel(item.origin) }}</span>
            <span v-if="item.rsvp?.estado === 'confirmado'" class="pill soft">Vas</span>
          </div>
          <h2>{{ item.titulo }}</h2>
          <p>{{ timeRange(item) }}{{ item.lugar ? ` · ${item.lugar}` : '' }}</p>
        </div>
      </article>

      <div v-if="!items.length" class="ag-empty">
        <AppIcon name="calendar" :size="28" />
        <p>No hay eventos en este período</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const route = useRoute()

const cursor = ref(new Date())
const items = ref([])
const warnings = ref([])
const loading = ref(true)
const error = ref('')
const flash = ref('')
const timezone = ref('America/Argentina/Buenos_Aires')
const layers = ref(['CORPORATE', 'OUTLOOK', 'GOOGLE'])
const showSettings = ref(false)
const viewMode = ref('month')
const selectedDay = ref('')
const todaySummary = ref('')
const summaryBusy = ref(false)
const suggestedSlots = ref([])
const slotsBusy = ref(false)
const calStatus = ref(null)
const calError = ref('')
const personalBusy = ref(false)
const personal = reactive({
  provider: 'OUTLOOK',
  titulo: '',
  inicio: '',
  fin: '',
})

const layerOptions = [
  { id: 'CORPORATE', label: 'Corporativo', color: 'var(--brand-primary, #0f766e)' },
  { id: 'OUTLOOK', label: 'Outlook', color: '#0078d4' },
  { id: 'GOOGLE', label: 'Google', color: '#ea4335' },
]

const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: timezone.value }),
)

function ymdInTz(date, tz = timezone.value) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

const monthCells = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const first = new Date(y, m, 1)
  const startPad = (first.getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const todayYmd = ymdInTz(new Date())
  const byDay = new Map()
  for (const it of items.value) {
    const key = ymdInTz(new Date(it.inicio))
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(it)
  }
  const cells = []
  for (let i = 0; i < startPad; i++) {
    const d = new Date(y, m, 1 - (startPad - i))
    cells.push({ day: d.getDate(), inMonth: false, ymd: ymdInTz(d), count: 0, colors: [], isToday: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day)
    const key = ymdInTz(d)
    const list = byDay.get(key) || []
    const colors = [...new Set(list.map((x) => originColor(x.origin)))]
    cells.push({
      day,
      inMonth: true,
      ymd: key,
      count: list.length,
      colors,
      isToday: key === todayYmd,
    })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = new Date(last.ymd + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    cells.push({ day: d.getDate(), inMonth: false, ymd: ymdInTz(d), count: 0, colors: [], isToday: false })
  }
  return cells
})

const dayItems = computed(() => {
  if (!selectedDay.value) return []
  return items.value.filter((i) => ymdInTz(new Date(i.inicio)) === selectedDay.value)
})

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  try {
    return new Date(selectedDay.value + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return selectedDay.value
  }
})

function selectDay(cell) {
  if (!cell?.ymd) return
  selectedDay.value = cell.ymd
  if (!cell.inMonth) {
    cursor.value = new Date(cell.ymd + 'T12:00:00')
  }
}

const outlookConn = computed(() =>
  calStatus.value?.connections?.find((c) => c.provider === 'OUTLOOK' && c.status === 'active'),
)
const googleConn = computed(() =>
  calStatus.value?.connections?.find((c) => c.provider === 'GOOGLE' && c.status === 'active'),
)

function rangeForMonth(d) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const from = new Date(Date.UTC(y, m, 1))
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59))
  return { from, to }
}

function shiftMonth(delta) {
  const d = new Date(cursor.value)
  d.setMonth(d.getMonth() + delta)
  cursor.value = d
}

function goToday() {
  cursor.value = new Date()
  selectedDay.value = ymdInTz(new Date())
  viewMode.value = 'month'
}

async function loadTodaySummary() {
  summaryBusy.value = true
  try {
    const { data } = await api.get('/calendar/today-summary')
    todaySummary.value = data.text || ''
  } catch {
    todaySummary.value = ''
  } finally {
    summaryBusy.value = false
  }
}

async function suggestSlots() {
  slotsBusy.value = true
  suggestedSlots.value = []
  try {
    const { data } = await api.post('/calendar/suggest-slots', { durationHours: 1 })
    suggestedSlots.value = data.slots || []
    if (!suggestedSlots.value.length) calError.value = 'No encontré huecos libres próximos'
  } catch (e) {
    calError.value = e.response?.data?.error || e.message
  } finally {
    slotsBusy.value = false
  }
}

function applySlot(s) {
  const toLocal = (iso) => {
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  personal.inicio = toLocal(s.inicio)
  personal.fin = toLocal(s.fin)
}

function toggleLayer(id) {
  if (layers.value.includes(id)) {
    if (layers.value.length === 1) return
    layers.value = layers.value.filter((x) => x !== id)
  } else {
    layers.value = [...layers.value, id]
  }
}

function originColor(o) {
  return layerOptions.find((l) => l.id === o)?.color || '#64748b'
}
function originLabel(o) {
  return layerOptions.find((l) => l.id === o)?.label || o
}

function dayNum(iso) {
  try {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', timeZone: timezone.value }).format(new Date(iso))
  } catch {
    return '—'
  }
}
function monShort(iso) {
  try {
    return new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: timezone.value }).format(new Date(iso))
  } catch {
    return ''
  }
}
function timeRange(item) {
  if (item.allDay) return 'Todo el día'
  try {
    const opts = { hour: '2-digit', minute: '2-digit', timeZone: timezone.value }
    const a = new Intl.DateTimeFormat('es-AR', opts).format(new Date(item.inicio))
    const b = new Intl.DateTimeFormat('es-AR', opts).format(new Date(item.fin))
    return `${a} – ${b}`
  } catch {
    return ''
  }
}

function openItem(item) {
  if (item.origin === 'CORPORATE' && item.eventId) {
    router.push(`/agenda/${item.eventId}`)
  } else if (item.webLink) {
    window.open(item.webLink, '_blank', 'noopener')
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { from, to } = rangeForMonth(cursor.value)
    const { data } = await api.get('/calendar/unified', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
        layers: layers.value.join(','),
      },
    })
    items.value = data.items || []
    warnings.value = data.warnings || []
    if (data.timezone) timezone.value = data.timezone
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al cargar agenda'
  } finally {
    loading.value = false
  }
}

async function loadCalStatus() {
  try {
    const { data } = await api.get('/calendar/status')
    calStatus.value = data
    if (data.timezone) timezone.value = data.timezone
    if (outlookConn.value) personal.provider = 'OUTLOOK'
    else if (googleConn.value) personal.provider = 'GOOGLE'
  } catch (e) {
    calError.value = e.response?.data?.error || ''
  }
}

async function connect(provider) {
  calError.value = ''
  try {
    const { data } = await api.get(`/calendar/connect/${provider.toLowerCase()}`, {
      params: { redirect: '0', returnTo: '/agenda?connected=1' },
    })
    if (data.url) window.location.href = data.url
  } catch (e) {
    calError.value = e.response?.data?.error || e.message
  }
}

async function disconnect(provider) {
  try {
    await api.delete(`/calendar/connect/${provider.toLowerCase()}`)
    await loadCalStatus()
    await load()
  } catch (e) {
    calError.value = e.response?.data?.error || e.message
  }
}

async function createPersonal() {
  personalBusy.value = true
  calError.value = ''
  try {
    await api.post('/calendar/personal', {
      provider: personal.provider,
      titulo: personal.titulo,
      inicio: new Date(personal.inicio).toISOString(),
      fin: new Date(personal.fin).toISOString(),
    })
    personal.titulo = ''
    flash.value = 'Evento creado en tu calendario'
    await load()
  } catch (e) {
    calError.value = e.response?.data?.error || e.message
  } finally {
    personalBusy.value = false
  }
}

watch([cursor, layers], () => load(), { deep: true })

onMounted(async () => {
  if (route.query.connected) {
    flash.value = 'Calendario conectado'
    showSettings.value = true
  }
  if (route.query.calendar_error) {
    calError.value = `No se pudo conectar: ${route.query.calendar_error}`
    showSettings.value = true
  }
  await loadCalStatus()
  await load()
  selectedDay.value = ymdInTz(new Date())
  await loadTodaySummary()
})
</script>

<style scoped>
.ag {
  padding: 1rem 1rem 5rem;
  max-width: 560px;
  margin: 0 auto;
}
.ag-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}
.ag-head-actions {
  display: flex;
  gap: 0.35rem;
}
.ag-gear.on {
  border-color: var(--brand-primary, #0f766e);
  background: #f0fdfa;
}
.ag-today {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 14px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 0.75rem;
}
.ag-today-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}
.ag-today-text {
  margin: 0;
  font-size: 0.88rem;
  white-space: pre-wrap;
  line-height: 1.4;
  color: var(--brand-primary, #0f766e);
}
.ag-link {
  border: 0;
  background: none;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}
.ag-slots {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.ag-month {
  margin-bottom: 1rem;
}
.ag-month-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 0.25rem;
  font-weight: 600;
}
.ag-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.ag-cell {
  aspect-ratio: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0.15rem;
  font: inherit;
  cursor: pointer;
}
.ag-cell.muted {
  opacity: 0.35;
}
.ag-cell.today {
  border-color: var(--brand-primary, #0f766e);
}
.ag-cell.selected {
  background: #f0fdfa;
  border-color: var(--brand-primary, #0f766e);
}
.ag-cell.has .ag-cell-num {
  font-weight: 700;
}
.ag-cell-num {
  font-size: 0.85rem;
}
.ag-cell-dots {
  display: flex;
  gap: 2px;
}
.ag-cell-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: block;
}
.ag-day-list {
  margin-top: 0.85rem;
}
.ag-day-list h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  text-transform: capitalize;
}
.ag-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.ag-head p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
  text-transform: capitalize;
}
.ag-gear {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  font-size: 1.1rem;
}
.ag-settings {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.9rem;
  margin-bottom: 0.85rem;
}
.ag-settings h2 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}
.ag-sub {
  margin: 0.85rem 0 0.4rem;
  font-size: 0.85rem;
}
.ag-hint {
  margin: 0 0 0.6rem;
  font-size: 0.8rem;
  color: #64748b;
}
.ag-conn-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}
.ag-conn-row:last-child {
  border-bottom: 0;
}
.muted {
  color: #94a3b8;
}
.ag-personal {
  display: grid;
  gap: 0.4rem;
}
.ag-input {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font: inherit;
}
.ag-btn {
  border: 0;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.ag-btn.ghost {
  background: #fff;
  color: var(--brand-primary, #0f766e);
  border: 1px solid var(--brand-primary, #0f766e);
}
.ag-btn:disabled {
  opacity: 0.5;
}
.ag-nav {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.65rem;
}
.ag-nav-btn {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0.45rem;
  font: inherit;
}
.ag-layers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.ag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}
.ag-chip.on {
  border-color: var(--brand-primary, #0f766e);
  background: #f0fdfa;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.ag-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.ag-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}
.ag-when {
  width: 44px;
  text-align: center;
  flex-shrink: 0;
}
.ag-day {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
}
.ag-mon {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
}
.ag-body h2 {
  margin: 0.2rem 0;
  font-size: 1rem;
}
.ag-body p {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
}
.ag-meta {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.pill {
  font-size: 0.68rem;
  color: #fff;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-weight: 600;
}
.pill.soft {
  background: #ccfbf1;
  color: var(--brand-primary, #0f766e);
}
.ag-empty {
  text-align: center;
  color: #64748b;
  padding: 2rem 1rem;
}
.ag-err {
  color: #b91c1c;
  font-size: 0.85rem;
}
.ag-warn {
  color: #b45309;
  font-size: 0.8rem;
  margin: 0 0 0.4rem;
}
.ag-ok {
  color: var(--brand-primary, #0f766e);
  font-size: 0.85rem;
}
.ag-muted {
  color: #94a3b8;
}
</style>
