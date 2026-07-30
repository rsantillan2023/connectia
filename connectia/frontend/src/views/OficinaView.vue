<template>
  <section class="of">
    <header class="of-head">
      <h1>Oficina</h1>
      <p>Declará tu día en sede y reservá un puesto si querés.</p>
    </header>

    <p v-if="error" class="of-err">{{ error }}</p>
    <p v-if="okMsg" class="of-ok">{{ okMsg }}</p>

    <div class="of-filters">
      <label>
        Sede
        <select v-model="siteId" @change="refresh">
          <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.nombre }}</option>
        </select>
      </label>
      <label>
        Día
        <input v-model="dateKey" type="date" @change="refresh" />
      </label>
    </div>

    <section class="of-cta">
      <h2>Voy a la oficina</h2>
      <p class="of-hint">Un toque para marcar que vas ese día. Después podés elegir puesto.</p>
      <button type="button" class="of-btn" :disabled="!siteId || busy" @click="declareDay">
        Confirmar día en sede
      </button>
    </section>

    <section class="of-block">
      <h2>Puestos y zonas</h2>
      <div v-if="busy" class="of-muted">Cargando…</div>
      <ul class="of-zones">
        <li v-for="z in zones" :key="z.zone" class="of-zone">
          <div class="of-zone-top">
            <strong>{{ z.zone || 'General' }}</strong>
            <span>{{ z.occupied }}/{{ z.capacity }}</span>
          </div>
          <div class="of-bar">
            <i :style="{ width: `${Math.min(100, Math.round((z.ratio || 0) * 100))}%` }" />
          </div>
          <ul class="of-res">
            <li v-for="r in z.resources" :key="r.id">
              <span>{{ r.nombre }} · {{ r.available ? 'Libre' : 'Lleno' }}</span>
              <button type="button" class="of-link" :disabled="!r.available" @click="bookDesk(r)">
                Reservar
              </button>
            </li>
          </ul>
        </li>
        <li v-if="!zones.length && !busy" class="of-muted">Sin puestos en esta sede.</li>
      </ul>
    </section>

    <section class="of-block">
      <h2>Quién está hoy</h2>
      <p v-if="!who.enabled" class="of-hint">
        Hoy hay <strong>{{ who.count }}</strong> persona(s) en sede (nombres ocultos por política).
      </p>
      <ul v-else class="of-who">
        <li v-for="p in who.items" :key="p.userId">
          {{ p.name }}
          <small>{{ statusEs(p.status) }}</small>
        </li>
        <li v-if="!who.items?.length" class="of-muted">Nadie registrado aún.</li>
      </ul>
    </section>

    <section class="of-block">
      <h2>Mis días</h2>
      <ul class="of-days">
        <li v-for="d in days" :key="d.id" class="of-day">
          <div>
            <strong>{{ d.dateKey }}</strong>
            <span>{{ d.siteNombre }} · {{ statusEs(d.status) }}</span>
          </div>
          <div class="of-actions">
            <button
              v-if="d.status === 'confirmed'"
              type="button"
              class="of-link"
              @click="checkInDay(d)"
            >
              Check-in
            </button>
            <button
              v-if="['confirmed', 'checked_in'].includes(d.status)"
              type="button"
              class="of-link danger"
              @click="cancelDay(d)"
            >
              Cancelar
            </button>
          </div>
        </li>
        <li v-if="!days.length" class="of-muted">Sin días próximos.</li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const sites = ref([])
const siteId = ref('')
const dateKey = ref(new Date().toISOString().slice(0, 10))
const zones = ref([])
const days = ref([])
const who = ref({ enabled: false, count: 0, items: [] })
const busy = ref(false)
const error = ref('')
const okMsg = ref('')

const STATUS_ES = {
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  checked_in: 'Con check-in',
  no_show: 'No asistió',
  pending: 'Pendiente',
}

function statusEs(s) {
  return STATUS_ES[s] || s || ''
}

async function loadSites() {
  const { data } = await api.get('/spaces/sites')
  sites.value = data.items || []
  if (!siteId.value && sites.value[0]) siteId.value = sites.value[0].id
}

async function refresh() {
  if (!siteId.value) return
  busy.value = true
  error.value = ''
  try {
    const [z, w, d] = await Promise.all([
      api.get('/spaces/zones', { params: { siteId: siteId.value, dateKey: dateKey.value } }),
      api.get('/spaces/who-is-here', { params: { siteId: siteId.value, dateKey: dateKey.value } }),
      api.get('/spaces/office-days/mine'),
    ])
    zones.value = z.data.zones || []
    who.value = w.data
    days.value = d.data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busy.value = false
  }
}

async function declareDay() {
  okMsg.value = ''
  try {
    await api.post('/spaces/office-days', { siteId: siteId.value, dateKey: dateKey.value })
    okMsg.value = 'Día en sede confirmado.'
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function bookDesk(r) {
  const start = new Date(`${dateKey.value}T09:00:00`)
  const end = new Date(`${dateKey.value}T18:00:00`)
  try {
    await api.post('/spaces/reservations', {
      resourceId: r.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      title: r.nombre,
      linkOfficeDay: true,
    })
    okMsg.value = 'Puesto reservado.'
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function cancelDay(d) {
  try {
    await api.post(`/spaces/office-days/${d.id}/cancel`)
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function checkInDay(d) {
  try {
    await api.post(`/spaces/office-days/${d.id}/check-in`)
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

onMounted(async () => {
  try {
    await loadSites()
    await refresh()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
})
</script>

<style scoped>
.of {
  padding: 1rem 1rem 5rem;
  max-width: 640px;
  margin: 0 auto;
  background: radial-gradient(ellipse 70% 35% at 0% 0%, #e0f2fe 0%, transparent 55%);
  min-height: 100%;
}
.of-head h1 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}
.of-head p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.of-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 1rem 0;
}
.of-filters label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #475569;
}
.of-filters input,
.of-filters select {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.45rem 0.6rem;
  background: #fff;
}
.of-cta {
  border: 1px solid #99f6e4;
  background: linear-gradient(160deg, #f0fdfa, #fff);
  border-radius: 1rem;
  padding: 1rem;
  margin-bottom: 1.25rem;
}
.of-cta h2,
.of-block h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}
.of-block {
  margin: 0 0 1.35rem;
}
.of-hint,
.of-muted {
  color: #64748b;
  font-size: 0.85rem;
}
.of-btn {
  margin-top: 0.65rem;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 0.65rem;
  padding: 0.55rem 1rem;
  font-weight: 600;
}
.of-zones,
.of-who,
.of-days,
.of-res {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: grid;
  gap: 0.55rem;
}
.of-zone,
.of-day {
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.75rem;
  background: #fff;
}
.of-zone-top,
.of-day {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}
.of-day div:first-child {
  display: grid;
}
.of-day span {
  color: #64748b;
  font-size: 0.8rem;
}
.of-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  margin: 0.45rem 0;
  overflow: hidden;
}
.of-bar i {
  display: block;
  height: 100%;
  background: #0f766e;
}
.of-res li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.25rem 0;
  border-top: 1px dashed #e2e8f0;
}
.of-link {
  background: none;
  border: none;
  color: #0f766e;
  font-size: 0.82rem;
  padding: 0;
  font-weight: 600;
}
.of-link:disabled {
  opacity: 0.4;
}
.of-link.danger {
  color: #b91c1c;
}
.of-actions {
  display: flex;
  gap: 0.5rem;
}
.of-err {
  color: #b91c1c;
}
.of-ok {
  color: #0f766e;
}
.of-who li {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}
.of-who small {
  color: #64748b;
}
</style>
