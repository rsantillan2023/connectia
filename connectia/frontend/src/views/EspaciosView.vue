<template>
  <section class="sp">
    <header class="sp-hero">
      <h1>Reservar</h1>
      <p>Salas, cocheras, proyectores, herramientas y más.</p>
    </header>

    <nav class="sp-mode">
      <button type="button" :class="{ on: mode === 'book' }" @click="mode = 'book'">Reservar</button>
      <button type="button" :class="{ on: mode === 'mine' }" @click="mode = 'mine'">Mis reservas</button>
    </nav>

    <p v-if="error" class="sp-err">{{ error }}</p>
    <p v-if="okMsg" class="sp-ok">{{ okMsg }}</p>

    <template v-if="mode === 'book'">
      <div class="sp-types" role="tablist">
        <button
          v-for="t in catalogTypes"
          :key="t.id"
          type="button"
          role="tab"
          :class="{ on: typeId === t.id }"
          @click="selectType(t.id)"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="sp-filters">
        <label>
          Sede
          <select v-model="siteId" @change="loadAvailability">
            <option value="">Todas</option>
            <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </label>
        <label>
          Desde
          <input v-model="startLocal" type="datetime-local" @change="loadAvailability" />
        </label>
        <label>
          Hasta
          <input v-model="endLocal" type="datetime-local" @change="loadAvailability" />
        </label>
      </div>

      <div v-if="filterableAttrs.length" class="sp-attrs">
        <span class="sp-attrs-label">Filtrar por</span>
        <button
          v-for="a in filterableAttrs"
          :key="a.key"
          type="button"
          class="sp-chip"
          :class="{ on: selectedAttrs.includes(a.key) }"
          @click="toggleAttr(a.key)"
        >
          {{ a.label }}
        </button>
      </div>

      <div v-if="busy" class="sp-muted">Buscando disponibilidad…</div>

      <ul class="sp-list">
        <li v-for="r in resources" :key="r.id" class="sp-card">
          <div class="sp-card-top">
            <div>
              <strong>{{ r.nombre }}</strong>
              <p class="sp-meta">
                {{ r.siteNombre }}
                <template v-if="r.capacity"> · {{ r.capacity }} pers.</template>
                <template v-if="r.effectiveCupo > 1">
                  · {{ r.occupied || 0 }}/{{ r.effectiveCupo }} ocupados
                </template>
                <template v-if="r.zone"> · {{ r.zone }}</template>
              </p>
            </div>
            <span class="sp-badge" :class="r.available ? 'ok' : 'busy'">
              {{ r.available ? 'Libre' : 'Ocupado' }}
            </span>
          </div>
          <p v-if="attrChips(r).length" class="sp-equip">
            <span v-for="c in attrChips(r)" :key="c">{{ c }}</span>
          </p>
          <button
            type="button"
            class="sp-btn"
            :disabled="!r.available || reserving === r.id"
            @click="openBook(r)"
          >
            Reservar
          </button>
        </li>
        <li v-if="!busy && !resources.length" class="sp-empty">
          No hay recursos libres en ese horario.
          <span>Probá otro rango o quitá filtros.</span>
        </li>
      </ul>
    </template>

    <template v-else>
      <ul class="sp-list">
        <li v-for="m in mine" :key="m.id" class="sp-card">
          <div class="sp-card-top">
            <div>
              <strong>{{ m.resourceNombre || m.title }}</strong>
              <p class="sp-meta">
                {{ m.kindLabel }} · {{ m.siteNombre }} · {{ fmt(m.startAt) }} → {{ fmt(m.endAt) }}
              </p>
              <p v-if="m.plate" class="sp-meta">Patente {{ m.plate }}</p>
            </div>
            <span class="sp-badge">{{ m.statusLabel }}</span>
          </div>
          <div class="sp-actions">
            <button
              v-if="['confirmed', 'pending'].includes(m.status)"
              type="button"
              class="sp-btn ghost"
              @click="checkIn(m)"
            >
              Check-in
            </button>
            <button
              v-if="m.status === 'checked_in'"
              type="button"
              class="sp-btn ghost"
              @click="checkOut(m)"
            >
              Check-out
            </button>
            <button
              v-if="['confirmed', 'pending', 'checked_in'].includes(m.status)"
              type="button"
              class="sp-btn danger"
              @click="cancel(m)"
            >
              Cancelar
            </button>
          </div>
        </li>
        <li v-if="!busy && !mine.length" class="sp-empty">
          Todavía no tenés reservas.
          <span>Andá a Reservar y elegí un recurso.</span>
        </li>
      </ul>
    </template>

    <div v-if="booking" class="sp-modal" @click.self="booking = null">
      <div class="sp-modal-card">
        <p class="sp-step">Confirmar reserva</p>
        <h2>{{ booking.nombre }}</h2>
        <p class="sp-meta">
          {{ booking.siteNombre }} · {{ fmt(startLocal) }} → {{ fmt(endLocal) }}
        </p>
        <label>
          Título (opcional)
          <input v-model="bookForm.title" type="text" maxlength="160" />
        </label>
        <label v-if="needsPlate">
          Patente
          <input v-model="bookForm.plate" type="text" maxlength="12" placeholder="AB123CD" />
        </label>
        <label v-if="needsPlate && booking.vehicleTypes?.length">
          Tipo de vehículo
          <select v-model="bookForm.vehicleType">
            <option value="">—</option>
            <option v-for="v in booking.vehicleTypes" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label>
          Motivo (opcional)
          <input v-model="bookForm.motivo" type="text" maxlength="200" />
        </label>
        <p v-if="booking.requiresApproval" class="sp-hint">
          Esta reserva queda pendiente de aprobación.
        </p>
        <div class="sp-actions">
          <button type="button" class="sp-btn ghost" @click="booking = null">Volver</button>
          <button type="button" class="sp-btn" :disabled="!!reserving" @click="confirmBook">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const mode = ref('book')
const sites = ref([])
const resources = ref([])
const catalogTypes = ref([])
const allAttributes = ref([])
const mine = ref([])
const typeId = ref('')
const siteId = ref('')
const selectedAttrs = ref([])
const busy = ref(false)
const error = ref('')
const okMsg = ref('')
const reserving = ref('')
const booking = ref(null)
const bookForm = reactive({ title: '', plate: '', vehicleType: '', motivo: '' })

function pad(n) {
  return String(n).padStart(2, '0')
}
function toLocalInput(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
}
function defaultRange() {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)
  return { start, end }
}
const initial = defaultRange()
const startLocal = ref(toLocalInput(initial.start))
const endLocal = ref(toLocalInput(initial.end))

const selectedType = computed(() => catalogTypes.value.find((t) => t.id === typeId.value))

const filterableAttrs = computed(() => {
  const keys = selectedType.value?.attributeKeys || []
  if (!keys.length) return []
  return allAttributes.value.filter((a) => keys.includes(a.key) && a.valueType === 'flag')
})

const needsPlate = computed(
  () => booking.value?.exigePatente || booking.value?.kind === 'cochera',
)

function attrChips(r) {
  const labels = []
  for (const a of r.attributes || []) {
    const def = allAttributes.value.find((d) => d.key === a.key)
    labels.push(a.value ? `${def?.label || a.key}: ${a.value}` : def?.label || a.key)
  }
  return labels.slice(0, 6)
}

function fmt(d) {
  try {
    const x = typeof d === 'string' && d.includes('T') && !d.endsWith('Z') && d.length <= 16
      ? new Date(d)
      : new Date(d)
    return x.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

async function loadMeta() {
  const { data } = await api.get('/spaces/meta')
  catalogTypes.value = (data.types || []).filter((t) => t.showInUserCatalog !== false)
  allAttributes.value = data.attributes || []
  if (!typeId.value && catalogTypes.value.length) {
    typeId.value = catalogTypes.value[0].id
  }
}

async function loadSites() {
  const { data } = await api.get('/spaces/sites')
  sites.value = data.items || []
}

async function loadAvailability() {
  if (mode.value !== 'book') return
  busy.value = true
  error.value = ''
  try {
    const params = {
      start: new Date(startLocal.value).toISOString(),
      end: new Date(endLocal.value).toISOString(),
      siteId: siteId.value || undefined,
      typeId: typeId.value || undefined,
      attrs: selectedAttrs.value.length ? selectedAttrs.value.join(',') : undefined,
    }
    const { data } = await api.get('/spaces/availability', { params })
    resources.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function loadMine() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.get('/spaces/reservations/mine', { params: { upcoming: '1' } })
    mine.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

function selectType(id) {
  typeId.value = id
  selectedAttrs.value = []
  loadAvailability()
}

function toggleAttr(key) {
  if (selectedAttrs.value.includes(key)) {
    selectedAttrs.value = selectedAttrs.value.filter((k) => k !== key)
  } else {
    selectedAttrs.value = [...selectedAttrs.value, key]
  }
  loadAvailability()
}

function openBook(r) {
  booking.value = r
  bookForm.title = r.nombre
  bookForm.plate = ''
  bookForm.vehicleType = r.vehicleTypes?.[0] || ''
  bookForm.motivo = ''
}

async function confirmBook() {
  if (!booking.value) return
  reserving.value = booking.value.id
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.post('/spaces/reservations', {
      resourceId: booking.value.id,
      startAt: new Date(startLocal.value).toISOString(),
      endAt: new Date(endLocal.value).toISOString(),
      title: bookForm.title,
      motivo: bookForm.motivo,
      plate: bookForm.plate,
      vehicleType: bookForm.vehicleType,
    })
    okMsg.value =
      data.item?.status === 'pending'
        ? 'Reserva enviada: queda pendiente de aprobación.'
        : 'Reserva confirmada.'
    booking.value = null
    await loadAvailability()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    reserving.value = ''
  }
}

async function cancel(m) {
  if (!confirm('¿Cancelar esta reserva?')) return
  try {
    await api.post(`/spaces/reservations/${m.id}/cancel`)
    okMsg.value = 'Reserva cancelada.'
    await loadMine()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function checkIn(m) {
  try {
    await api.post(`/spaces/reservations/${m.id}/check-in`)
    await loadMine()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function checkOut(m) {
  try {
    await api.post(`/spaces/reservations/${m.id}/check-out`)
    await loadMine()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

watch(mode, (m) => {
  if (m === 'mine') loadMine()
  else loadAvailability()
})

onMounted(async () => {
  const q = route.query.tab
  if (q === 'mis') mode.value = 'mine'
  try {
    await loadMeta()
    await loadSites()
    if (mode.value === 'mine') await loadMine()
    else await loadAvailability()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
})
</script>

<style scoped>
.sp {
  padding: 1rem 1rem 5rem;
  max-width: 640px;
  margin: 0 auto;
  background:
    radial-gradient(ellipse 80% 40% at 10% 0%, #ccfbf1 0%, transparent 55%),
    radial-gradient(ellipse 60% 30% at 100% 5%, #e0f2fe 0%, transparent 50%);
  min-height: 100%;
}
.sp-hero h1 {
  margin: 0;
  font-size: 1.55rem;
  letter-spacing: -0.02em;
}
.sp-hero p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}
.sp-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin: 1rem 0 0.85rem;
  padding: 0.3rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
}
.sp-mode button {
  border: none;
  background: transparent;
  border-radius: 0.65rem;
  padding: 0.55rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
}
.sp-mode button.on {
  background: #0f766e;
  color: #fff;
}
.sp-types {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.35rem;
  margin-bottom: 0.65rem;
  -webkit-overflow-scrolling: touch;
}
.sp-types button {
  flex: 0 0 auto;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  white-space: nowrap;
}
.sp-types button.on {
  background: #134e4a;
  color: #fff;
  border-color: #134e4a;
}
.sp-filters {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}
.sp-filters label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.sp-filters input,
.sp-filters select,
.sp-modal-card input,
.sp-modal-card select {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
  background: #fff;
}
.sp-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.sp-attrs-label {
  font-size: 0.75rem;
  color: #64748b;
}
.sp-chip {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
.sp-chip.on {
  background: #ecfeff;
  border-color: #67e8f9;
  color: #0e7490;
}
.sp-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}
.sp-card {
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 0.95rem;
  background: #fff;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.sp-card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}
.sp-badge {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  flex-shrink: 0;
}
.sp-badge.ok {
  background: #ccfbf1;
  color: #0f766e;
}
.sp-badge.busy {
  background: #fee2e2;
  color: #b91c1c;
}
.sp-meta,
.sp-muted,
.sp-hint {
  color: #64748b;
  font-size: 0.82rem;
  margin: 0.25rem 0 0;
}
.sp-equip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin: 0.5rem 0 0;
}
.sp-equip span {
  font-size: 0.72rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
}
.sp-empty {
  text-align: center;
  color: #334155;
  padding: 1.5rem 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 1rem;
  background: #fff;
  display: grid;
  gap: 0.25rem;
}
.sp-empty span {
  color: #64748b;
  font-size: 0.85rem;
}
.sp-btn {
  margin-top: 0.65rem;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 0.65rem;
  padding: 0.5rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 600;
}
.sp-btn:disabled {
  opacity: 0.5;
}
.sp-btn.ghost {
  background: #fff;
  color: #0f766e;
  border: 1px solid #99f6e4;
}
.sp-btn.danger {
  background: #fff;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.sp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
}
.sp-err {
  color: #b91c1c;
  font-size: 0.9rem;
}
.sp-ok {
  color: #0f766e;
  font-size: 0.9rem;
}
.sp-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: end center;
  z-index: 40;
  padding: 1rem;
}
.sp-modal-card {
  width: min(440px, 100%);
  background: #fff;
  border-radius: 1.1rem 1.1rem 0.65rem 0.65rem;
  padding: 1.1rem;
  display: grid;
  gap: 0.65rem;
}
.sp-step {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #0f766e;
  font-weight: 700;
}
.sp-modal-card h2 {
  margin: 0;
  font-size: 1.15rem;
}
.sp-modal-card label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.82rem;
  color: #475569;
}
</style>
