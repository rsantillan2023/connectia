<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Asistencia y turnos</h1>
        <p class="text-sm text-slate-500 mt-1">
          Lugares con geocerca, turnos asignados, marcas GPS y novedades.
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedDefaults">
          Seed demo
        </button>
        <button type="button" class="btn-primary" @click="openPlace()">+ Lugar</button>
        <button type="button" class="btn-primary" @click="openShift()">+ Turno</button>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>

    <nav class="tabs">
      <button type="button" :class="{ on: tab === 'novedades' }" @click="tab = 'novedades'">
        Novedades
      </button>
      <button type="button" :class="{ on: tab === 'domingos' }" @click="tab = 'domingos'; loadDomingos()">
        Domingos
      </button>
      <button type="button" :class="{ on: tab === 'lugares' }" @click="tab = 'lugares'">Lugares</button>
      <button type="button" :class="{ on: tab === 'turnos' }" @click="tab = 'turnos'">Turnos</button>
      <button type="button" :class="{ on: tab === 'policy' }" @click="tab = 'policy'">Políticas</button>
    </nav>

    <section v-if="tab === 'novedades'" class="panel">
      <div class="filters">
        <select v-model="geoFilter" @change="loadPunches">
          <option value="">Todos</option>
          <option value="in_range">En rango</option>
          <option value="out_of_range">Fuera de rango</option>
          <option value="not_required">Libre</option>
        </select>
        <button type="button" class="btn-ghost" :disabled="busy" @click="exportCsv">
          Export CSV
        </button>
      </div>
      <ul class="list">
        <li v-for="p in punches" :key="p.id" class="card">
          <div>
            <strong>{{ p.userName || '—' }} · {{ p.kind }}</strong>
            <p class="muted">
              {{ fmt(p.serverReceivedAt) }} · {{ geoLabel(p.geoResult) }}
              <span v-if="p.distanceMetros != null"> · {{ p.distanceMetros }} m</span>
              · {{ p.place?.nombre || 'sin lugar' }}
            </p>
            <p v-if="p.justification" class="muted">Justif.: {{ p.justification }}</p>
          </div>
        </li>
        <li v-if="!punches.length" class="muted">Sin marcas.</li>
      </ul>
    </section>

    <section v-if="tab === 'domingos'" class="panel">
      <ul class="list">
        <li v-for="d in domingos" :key="d.userId" class="card">
          <div>
            <strong>{{ d.nombreTrabajador }}</strong>
            <p class="muted">
              entregados {{ d.domEntregados }} · por entregar {{ d.domPorEntregar }} · meta
              {{ d.domDeberiaEntregar }} · diff {{ d.domDiferencia }}
            </p>
          </div>
        </li>
        <li v-if="!domingos.length" class="muted">Sin datos de domingos este mes.</li>
      </ul>
    </section>

    <section v-if="tab === 'lugares'" class="panel">
      <ul class="list">
        <li v-for="p in places" :key="p.id" class="card">
          <div>
            <strong>{{ p.nombre }}</strong>
            <p class="muted">
              {{ p.codigo || '—' }} · {{ p.lat }}, {{ p.lng }} · radio {{ p.radioMetros }} m
              <span v-if="p.servicio"> · {{ p.servicio }}</span>
              · {{ p.activo ? 'activo' : 'inactivo' }}
            </p>
          </div>
          <button type="button" class="btn-ghost" @click="openPlace(p)">Editar</button>
        </li>
      </ul>
    </section>

    <section v-if="tab === 'turnos'" class="panel">
      <div class="filters">
        <input v-model="shiftFecha" type="date" @change="loadShifts" />
      </div>
      <ul class="list">
        <li v-for="s in shifts" :key="s.id" class="card">
          <div>
            <strong>{{ s.userName || s.userId }}</strong>
            <p class="muted">
              {{ s.fecha }} · {{ s.startTime }}–{{ s.endTime }} · {{ s.place?.nombre }} ·
              {{ s.estado }}
            </p>
          </div>
          <div class="row">
            <button type="button" class="btn-ghost" @click="openShift(s)">Editar</button>
            <button
              v-if="s.estado === 'asignado'"
              type="button"
              class="btn-ghost"
              @click="cancelShift(s)"
            >
              Cancelar
            </button>
          </div>
        </li>
        <li v-if="!shifts.length" class="muted">Sin turnos.</li>
      </ul>
    </section>

    <section v-if="tab === 'policy'" class="panel form">
      <label
        >Fuera de rango
        <select v-model="policy.fueraDeRango">
          <option value="allow">Permitir</option>
          <option value="block">Bloquear</option>
          <option value="justify">Exigir justificación</option>
        </select>
      </label>
      <label
        >Precisión GPS máx. (m)
        <input v-model.number="policy.minAccuracyMetros" type="number" min="10" max="500" />
      </label>
      <label
        >Tolerancia horaria (min)
        <input v-model.number="policy.toleranciaHorariaMin" type="number" min="0" max="180" />
      </label>
      <label
        >Vigencia marca temporal (min)
        <input v-model.number="policy.temporalVigenciaMin" type="number" min="5" max="240" />
      </label>
      <label
        >Domingos esperados / mes
        <input v-model.number="policy.domingosEsperadosMes" type="number" min="0" max="8" />
      </label>
      <label class="check"
        ><input v-model="policy.enableGeopopPrefichada" type="checkbox" /> Prefichada Geopop
        (mock)</label
      >
      <label class="check"
        ><input v-model="policy.enableQrPunch" type="checkbox" /> Marcación por QR</label
      >
      <label
        >Modo default
        <select v-model="policy.defaultMode">
          <option value="en_lugar">En lugar</option>
          <option value="libre">Libre</option>
          <option value="temporal">Temporal</option>
        </select>
      </label>
      <label class="check"
        ><input v-model="policy.enableLibre" type="checkbox" /> Habilitar modo libre</label
      >
      <label class="check"
        ><input v-model="policy.enableEnLugar" type="checkbox" /> Habilitar en lugar</label
      >
      <label class="check"
        ><input v-model="policy.enableTemporal" type="checkbox" /> Habilitar temporal</label
      >
      <button type="button" class="btn-primary" :disabled="busy" @click="savePolicy">
        Guardar políticas
      </button>
    </section>

    <div v-if="placeModal" class="modal" @click.self="placeModal = false">
      <form class="modal-panel" @submit.prevent="savePlace">
        <h2>{{ placeDraft.id ? 'Editar lugar' : 'Nuevo lugar' }}</h2>
        <label>Nombre <input v-model="placeDraft.nombre" required /></label>
        <label>Código <input v-model="placeDraft.codigo" /></label>
        <label>Lat <input v-model.number="placeDraft.lat" type="number" step="any" required /></label>
        <label>Lng <input v-model.number="placeDraft.lng" type="number" step="any" required /></label>
        <button type="button" class="btn-ghost" @click="fillPlaceGps">Usar mi GPS</button>
        <label
          >Radio (m) <input v-model.number="placeDraft.radioMetros" type="number" min="10"
        /></label>
        <label>Dirección <input v-model="placeDraft.direccion" /></label>
        <label>Servicio <input v-model="placeDraft.servicio" placeholder="ej. Retail Norte" /></label>
        <label>Objetivo <input v-model="placeDraft.objetivo" placeholder="ej. Cobertura PDV" /></label>
        <label class="check"
          ><input v-model="placeDraft.activo" type="checkbox" /> Activo</label
        >
        <div class="row">
          <button type="button" class="btn-ghost" @click="placeModal = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="busy">Guardar</button>
        </div>
      </form>
    </div>

    <div v-if="shiftModal" class="modal" @click.self="shiftModal = false">
      <form class="modal-panel" @submit.prevent="saveShift">
        <h2>{{ shiftDraft.id ? 'Editar turno' : 'Nuevo turno' }}</h2>
        <label
          >Usuario
          <select v-model="shiftDraft.userId" required>
            <option disabled value="">Elegir…</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nombre }}</option>
          </select>
        </label>
        <label
          >Lugar
          <select v-model="shiftDraft.placeId" required>
            <option disabled value="">Elegir…</option>
            <option v-for="p in places.filter((x) => x.activo)" :key="p.id" :value="p.id">
              {{ p.nombre }}
            </option>
          </select>
        </label>
        <label>Fecha <input v-model="shiftDraft.fecha" type="date" required /></label>
        <label>Inicio <input v-model="shiftDraft.startTime" type="time" required /></label>
        <label>Fin <input v-model="shiftDraft.endTime" type="time" required /></label>
        <label>Notas <input v-model="shiftDraft.notas" /></label>
        <div class="row">
          <button type="button" class="btn-ghost" @click="shiftModal = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="busy">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const tab = ref('novedades')
const places = ref([])
const shifts = ref([])
const punches = ref([])
const domingos = ref([])
const users = ref([])
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const geoFilter = ref('')
const shiftFecha = ref(todayKey())
const placeModal = ref(false)
const shiftModal = ref(false)
const placeDraft = reactive({
  id: '',
  nombre: '',
  codigo: '',
  lat: -34.6037,
  lng: -58.3816,
  radioMetros: 150,
  direccion: '',
  servicio: '',
  objetivo: '',
  activo: true,
})
const shiftDraft = reactive({
  id: '',
  userId: '',
  placeId: '',
  fecha: todayKey(),
  startTime: '09:00',
  endTime: '18:00',
  notas: '',
})
const policy = reactive({
  fueraDeRango: 'justify',
  minAccuracyMetros: 80,
  defaultMode: 'en_lugar',
  enableLibre: true,
  enableEnLugar: true,
  enableTemporal: true,
  toleranciaHorariaMin: 15,
  temporalVigenciaMin: 30,
  domingosEsperadosMes: 2,
  enableGeopopPrefichada: true,
  enableQrPunch: true,
})

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function geoLabel(r) {
  const map = {
    in_range: 'En rango',
    out_of_range: 'Fuera de rango',
    not_required: 'Libre',
    no_gps: 'Sin GPS',
    accuracy_poor: 'GPS impreciso',
  }
  return map[r] || r
}

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

async function loadPlaces() {
  const { data } = await api.get('/admin/attendance/places')
  places.value = data.items || []
}

async function loadShifts() {
  const params = {}
  if (shiftFecha.value) params.fecha = shiftFecha.value
  const { data } = await api.get('/admin/attendance/shifts', { params })
  shifts.value = data.items || []
}

async function loadPunches() {
  const params = {}
  if (geoFilter.value) params.geoResult = geoFilter.value
  const { data } = await api.get('/admin/attendance/punches', { params })
  punches.value = data.items || []
}

async function loadDomingos() {
  try {
    const { data } = await api.get('/admin/attendance/domingos')
    domingos.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function loadPolicy() {
  const { data } = await api.get('/admin/attendance/policy')
  Object.assign(policy, data.item || {})
}

async function loadUsers() {
  const { data } = await api.get('/admin/attendance/users')
  users.value = data.items || []
}

async function refresh() {
  error.value = ''
  try {
    await Promise.all([loadPlaces(), loadShifts(), loadPunches(), loadPolicy(), loadUsers()])
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al cargar'
  }
}

function openPlace(p) {
  if (p) {
    Object.assign(placeDraft, {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo || '',
      lat: p.lat,
      lng: p.lng,
      radioMetros: p.radioMetros,
      direccion: p.direccion || '',
      servicio: p.servicio || '',
      objetivo: p.objetivo || '',
      activo: p.activo !== false,
    })
  } else {
    Object.assign(placeDraft, {
      id: '',
      nombre: '',
      codigo: '',
      lat: -34.6037,
      lng: -58.3816,
      radioMetros: 150,
      direccion: '',
      servicio: '',
      objetivo: '',
      activo: true,
    })
  }
  placeModal.value = true
}

function openShift(s) {
  if (s) {
    Object.assign(shiftDraft, {
      id: s.id,
      userId: s.userId,
      placeId: s.placeId,
      fecha: s.fecha,
      startTime: s.startTime,
      endTime: s.endTime,
      notas: s.notas || '',
    })
  } else {
    Object.assign(shiftDraft, {
      id: '',
      userId: users.value[0]?.id || '',
      placeId: places.value.find((p) => p.activo)?.id || '',
      fecha: shiftFecha.value || todayKey(),
      startTime: '09:00',
      endTime: '18:00',
      notas: '',
    })
  }
  shiftModal.value = true
}

async function savePlace() {
  busy.value = true
  error.value = ''
  try {
    const payload = { ...placeDraft }
    delete payload.id
    if (placeDraft.id) {
      await api.put(`/admin/attendance/places/${placeDraft.id}`, payload)
    } else {
      await api.post('/admin/attendance/places', payload)
    }
    placeModal.value = false
    okMsg.value = 'Lugar guardado'
    await loadPlaces()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function saveShift() {
  busy.value = true
  error.value = ''
  try {
    const payload = {
      userId: shiftDraft.userId,
      placeId: shiftDraft.placeId,
      fecha: shiftDraft.fecha,
      startTime: shiftDraft.startTime,
      endTime: shiftDraft.endTime,
      notas: shiftDraft.notas,
    }
    if (shiftDraft.id) {
      await api.put(`/admin/attendance/shifts/${shiftDraft.id}`, payload)
    } else {
      await api.post('/admin/attendance/shifts', payload)
    }
    shiftModal.value = false
    okMsg.value = 'Turno guardado'
    await loadShifts()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function cancelShift(s) {
  if (!confirm('¿Cancelar este turno?')) return
  busy.value = true
  try {
    await api.post(`/admin/attendance/shifts/${s.id}/cancel`)
    okMsg.value = 'Turno cancelado'
    await loadShifts()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function savePolicy() {
  busy.value = true
  error.value = ''
  try {
    await api.put('/admin/attendance/policy', { ...policy })
    okMsg.value = 'Políticas guardadas'
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function seedDefaults() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/attendance/seed-defaults')
    okMsg.value = `Seed OK · turnos ${data.shiftsCreated} · marcas ${data.punchesCreated}`
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function exportCsv() {
  busy.value = true
  error.value = ''
  try {
    const params = {}
    if (geoFilter.value) params.geoResult = geoFilter.value
    const { data } = await api.get('/admin/attendance/punches/export', {
      params,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'asistencia-marcas.csv'
    a.click()
    URL.revokeObjectURL(url)
    okMsg.value = 'CSV descargado'
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo exportar'
  } finally {
    busy.value = false
  }
}

function fillPlaceGps() {
  if (!navigator.geolocation) {
    error.value = 'Geolocalización no disponible'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      placeDraft.lat = pos.coords.latitude
      placeDraft.lng = pos.coords.longitude
      okMsg.value = 'Coords tomadas del GPS'
    },
    () => {
      error.value = 'No se pudo obtener GPS'
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

onMounted(refresh)
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 0.35rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}
.tabs button {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}
.tabs button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: transparent;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1rem;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.card {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  padding: 0.75rem 0.9rem;
}
.muted {
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin: 0.2rem 0 0;
}
.filters {
  margin-bottom: 0.75rem;
}
.filters select,
.filters input,
.form input,
.form select,
.modal-panel input,
.modal-panel select {
  border: 1px solid var(--line-2);
  border-radius: 0.45rem;
  padding: 0.4rem 0.55rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-width: 28rem;
}
.form label,
.modal-panel label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.check {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem !important;
}
.row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.err {
  color: var(--bad);
}
.ok {
  color: var(--ok);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}
.modal-panel {
  background: var(--panel);
  border-radius: 0.85rem;
  padding: 1.1rem;
  width: min(28rem, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.45rem 0.8rem;
  font-weight: 600;
}
.btn-ghost {
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.45rem 0.8rem;
}
</style>
