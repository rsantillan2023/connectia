<template>
  <section class="att">
    <header class="att-head">
      <div>
        <h1>Mi asistencia</h1>
        <p>Marcá presencia en tu lugar asignado</p>
      </div>
    </header>

    <p v-if="queuePending" class="att-queue">
      {{ queuePending }} marca(s) en cola offline
      <button type="button" class="att-link" @click="flushQueue">Sincronizar</button>
    </p>

    <nav class="att-tabs">
      <button type="button" :class="{ on: tab === 'hoy' }" @click="tab = 'hoy'">Hoy</button>
      <button type="button" :class="{ on: tab === 'hist' }" @click="tab = 'hist'; loadHistory()">
        Historial
      </button>
      <button type="button" :class="{ on: tab === 'team' }" @click="tab = 'team'; loadHistory('team')">
        Equipo
      </button>
    </nav>

    <label v-if="tab === 'hoy'" class="att-mode">
      Modo
      <select v-model="punchMode">
        <option v-if="policy?.enableEnLugar !== false" value="en_lugar">En lugar</option>
        <option v-if="policy?.enableLibre" value="libre">Libre</option>
        <option v-if="policy?.enableTemporal" value="temporal">Temporal</option>
      </select>
    </label>

    <div v-if="tab === 'hoy' && prefichada.length" class="att-pre">
      <h2 class="att-sub">Prefichada</h2>
      <p v-for="p in prefichada" :key="p.shiftId" class="att-meta">
        {{ p.placeNombre || 'Lugar' }}
        <span v-if="p.servicio"> · {{ p.servicio }}</span>
        · {{ p.startTime }}–{{ p.endTime }} · {{ p.estadoMarcacion }}
      </p>
    </div>

    <div v-if="tab === 'hoy'" class="att-qr-bar">
      <button type="button" class="att-ghost" :disabled="qrBusy" @click="makeQr">
        {{ qrBusy ? 'Generando…' : 'Mi QR para marcar' }}
      </button>
      <button type="button" class="att-ghost" @click="toggleScan">
        {{ showScan ? 'Cerrar escáner' : 'Escanear QR' }}
      </button>
    </div>
    <div v-if="qrInfo" class="att-qr-card">
      <img :src="qrInfo.qrImageUrl" alt="QR asistencia" width="160" height="160" />
      <p class="att-meta">Vence {{ fmt(qrInfo.expiresAt) }}</p>
      <code class="att-code">{{ qrInfo.payload }}</code>
    </div>
    <div v-if="showScan" class="att-scan">
      <div class="att-scan-cam">
        <video ref="scanVideo" class="att-scan-video" playsinline muted autoplay />
        <div class="att-scan-frame" aria-hidden="true" />
      </div>
      <p class="att-meta">
        {{ scanHint }}
        <span v-if="scanEngine"> · {{ scanEngine }}</span>
      </p>
      <form class="att-scan-paste" @submit.prevent="punchByQr">
        <input
          v-model="scanPayload"
          class="att-input"
          placeholder="O pegá el token connectia-att:…"
        />
        <button type="submit" class="att-primary" :disabled="qrBusy || !scanPayload.trim()">
          Registrar marca QR
        </button>
      </form>
    </div>

    <p v-if="error" class="att-err">{{ error }}</p>
    <p v-if="okMsg" class="att-ok">{{ okMsg }}</p>

    <template v-if="tab === 'hoy'">
      <p v-if="loading" class="att-muted">Cargando turnos…</p>
      <p v-else-if="!shifts.length" class="att-muted center">
        No tenés turnos asignados para este rango.
      </p>

      <article v-for="s in shifts" :key="s.id" class="att-card">
        <div class="att-card-top">
          <span class="att-fecha">{{ s.fecha }}</span>
          <span class="att-estado">{{ s.estado }}</span>
        </div>
        <h2>{{ s.place?.nombre || 'Sin lugar' }}</h2>
        <p class="att-meta">
          {{ s.startTime }} – {{ s.endTime }}
          <span v-if="s.place">· radio {{ s.place.radioMetros }} m</span>
          <span v-if="s.place?.servicio">· {{ s.place.servicio }}</span>
          <span v-if="policy">· tol. ±{{ policy.toleranciaHorariaMin }} min</span>
        </p>
        <label v-if="placesFor(s).length > 1" class="att-mode">
          Instalación
          <select v-model="placePick[s.id]">
            <option v-for="pl in placesFor(s)" :key="pl.id" :value="pl.id">
              {{ pl.nombre }}{{ pl.servicio ? ` (${pl.servicio})` : '' }}
            </option>
          </select>
        </label>        <p v-if="s.place?.direccion" class="att-meta">{{ s.place.direccion }}</p>

        <div v-if="s.punches?.length" class="att-punches">
          <p v-for="p in s.punches" :key="p.id" class="att-punch" :data-geo="p.geoResult">
            {{ p.kind }} · {{ geoLabel(p.geoResult) }} · {{ p.mode }}
            <span v-if="p.distanceMetros != null">· {{ p.distanceMetros }} m</span>
            <span v-if="p.lateMinutes">· +{{ p.lateMinutes }} min</span>
            <span v-if="p.expiresAt">· vig. {{ fmt(p.expiresAt) }}</span>
            <span v-if="p.expired" class="att-exp">· vencida</span>
          </p>
        </div>

        <div class="att-actions">
          <button
            type="button"
            class="att-primary"
            :disabled="punching === s.id"
            @click="doPunch(s, 'entrada')"
          >
            {{ punching === s.id ? 'Marcando…' : 'Marcar entrada' }}
          </button>
          <button
            type="button"
            class="att-ghost"
            :disabled="punching === s.id"
            @click="doPunch(s, 'salida')"
          >
            Salida
          </button>
          <button
            type="button"
            class="att-ghost"
            :disabled="punching === s.id"
            @click="doPunch(s, 'presencia')"
          >
            Presencia
          </button>
        </div>
      </article>

      <div v-if="needJustify" class="att-sheet" @click.self="needJustify = null">
        <form class="att-sheet-panel" @submit.prevent="confirmJustify">
          <h2>Fuera de rango</h2>
          <p class="att-meta">
            Estás a {{ needJustify.distanceMetros }} m del lugar. Justificá para registrar la marca.
          </p>
          <textarea v-model="justifyText" rows="3" class="att-input" required placeholder="Motivo…" />
          <p v-if="justifyError" class="att-err">{{ justifyError }}</p>
          <div class="att-actions">
            <button type="button" class="att-ghost" @click="needJustify = null">Cancelar</button>
            <button type="submit" class="att-primary" :disabled="punching">Confirmar marca</button>
          </div>
        </form>
      </div>
    </template>

    <template v-else>
      <p v-if="histLoading" class="att-muted">Cargando…</p>
      <article v-for="p in history" :key="p.id" class="att-card">
        <div class="att-card-top">
          <span class="att-fecha">{{ fmt(p.serverReceivedAt) }}</span>
          <span class="att-estado" :data-geo="p.geoResult">{{ geoLabel(p.geoResult) }}</span>
        </div>
        <h2>{{ p.userName || 'Yo' }} · {{ p.kind }}</h2>
        <p class="att-meta">
          {{ p.place?.nombre || '—' }}
          <span v-if="p.distanceMetros != null">· {{ p.distanceMetros }} m</span>
          · modo {{ p.mode }}
          <span v-if="p.lateMinutes">· +{{ p.lateMinutes }} min</span>
        </p>
        <p v-if="p.justification" class="att-meta">Justificación: {{ p.justification }}</p>
      </article>
      <p v-if="!histLoading && !history.length" class="att-muted center">Sin marcas.</p>
    </template>
  </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '../services/api'
import {
  enqueuePunch,
  flushPunchQueue,
  isLikelyOffline,
  loadPunchQueue,
  pendingCount,
} from '../lib/attendanceOffline'
import { startQrScan, stopQrScan, supportsCameraScan } from '../lib/qrScan'

const tab = ref('hoy')
const shifts = ref([])
const history = ref([])
const loading = ref(false)
const histLoading = ref(false)
const error = ref('')
const okMsg = ref('')
const punching = ref('')
const needJustify = ref(null)
const justifyText = ref('')
const justifyError = ref('')
const policy = ref(null)
const punchMode = ref('en_lugar')
const queuePending = ref(0)
const prefichada = ref([])
const myPlaces = ref([])
const placePick = ref({})
const qrInfo = ref(null)
const qrBusy = ref(false)
const showScan = ref(false)
const scanPayload = ref('')
const scanVideo = ref(null)
const scanEngine = ref('')
const scanHint = ref('Apuntá la cámara al QR de asistencia')
let scanHandle = null
let scanLock = false

function placesFor(shift) {
  const ids = new Set([
    shift.placeId,
    ...(shift.alternatePlaceIds || []),
  ].filter(Boolean).map(String))
  const fromShift = myPlaces.value.filter((p) => ids.has(String(p.id)))
  if (fromShift.length) return fromShift
  if (shift.place) return [shift.place]
  return myPlaces.value
}

function refreshQueueBadge() {
  queuePending.value = pendingCount()
}

function geoLabel(r) {
  const map = {
    in_range: 'En rango',
    out_of_range: 'Fuera de rango',
    no_gps: 'Sin GPS',
    accuracy_poor: 'GPS impreciso',
    not_required: 'Libre',
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

function weekRange() {
  const from = new Date()
  from.setDate(from.getDate() - 1)
  const to = new Date()
  to.setDate(to.getDate() + 6)
  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: key(from), to: key(to) }
}

async function captureGps() {
  if (!navigator.geolocation) {
    throw new Error('Este dispositivo no soporta geolocalización')
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
          source: 'device',
        })
      },
      (err) => {
        const msg =
          err?.code === 1
            ? 'Permiso de ubicación denegado. Activá la ubicación para marcar en lugar.'
            : 'No se pudo obtener GPS. Verificá que la ubicación esté activa.'
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { from, to } = weekRange()
    const today = from
    const [shiftsRes, prefRes, placesRes] = await Promise.all([
      api.get('/attendance/my-shifts', { params: { from, to } }),
      api.get('/attendance/prefichada').catch(() => ({ data: { items: [] } })),
      api.get('/attendance/my-places').catch(() => ({ data: { items: [] } })),
    ])
    shifts.value = shiftsRes.data.items || []
    policy.value = shiftsRes.data.policy || null
    prefichada.value = prefRes.data.items || []
    myPlaces.value = placesRes.data.items || []
    const picks = { ...placePick.value }
    for (const s of shifts.value) {
      if (!picks[s.id]) picks[s.id] = s.placeId
    }
    placePick.value = picks
    if (policy.value?.defaultMode) punchMode.value = policy.value.defaultMode
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

async function loadHistory(scope = 'me') {
  histLoading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/attendance/history', { params: { scope, limit: 40 } })
    history.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar historial'
  } finally {
    histLoading.value = false
  }
}

function buildPayload(shift, kind, justification = '', gps = null) {
  return {
    shiftId: shift.id,
    placeId: placePick.value[shift.id] || shift.placeId,
    kind,
    mode: punchMode.value || policy.value?.defaultMode || 'en_lugar',
    gps,
    justification,
    deviceClockAt: new Date().toISOString(),
    idempotencyKey: `u-${shift.id}-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel: 'app',
  }
}

async function postPunch(payload) {
  const { data } = await api.post('/attendance/punch', payload)
  return data
}

async function flushQueue() {
  if (!navigator.onLine) {
    okMsg.value = 'Sin conexión: la cola se sincronizará al volver online'
    refreshQueueBadge()
    return
  }
  const r = await flushPunchQueue(postPunch)
  refreshQueueBadge()
  if (r.confirmed) {
    okMsg.value = `Sincronizadas ${r.confirmed} marca(s)`
    await load()
  } else if (r.failed) {
    error.value = `Fallaron ${r.failed} marca(s) de la cola`
  } else if (!r.pending) {
    okMsg.value = 'Cola al día'
  }
}

async function submitPunch(shift, kind, justification = '') {
  const mode = punchMode.value || policy.value?.defaultMode || 'en_lugar'
  let gps = null
  if (mode !== 'libre') {
    gps = await captureGps()
  }
  const payload = buildPayload(shift, kind, justification, gps)

  if (!navigator.onLine) {
    enqueuePunch(payload)
    refreshQueueBadge()
    return { queued: true }
  }

  try {
    return await postPunch(payload)
  } catch (e) {
    if (isLikelyOffline(e)) {
      enqueuePunch(payload)
      refreshQueueBadge()
      return { queued: true }
    }
    throw e
  }
}

async function doPunch(shift, kind) {
  punching.value = shift.id
  error.value = ''
  okMsg.value = ''
  justifyError.value = ''
  try {
    const data = await submitPunch(shift, kind)
    if (data.queued) {
      okMsg.value = 'Sin red: marca en cola (pending). Se confirmará al sincronizar.'
    } else {
      const late = data.item?.lateMinutes ? ` · +${data.item.lateMinutes} min` : ''
      const exp = data.item?.expiresAt ? ` · vigencia hasta ${fmt(data.item.expiresAt)}` : ''
      okMsg.value = `Marca ${kind} registrada · ${geoLabel(data.item?.geoResult)}${late}${exp}`
      await load()
    }
  } catch (e) {
    const body = e.response?.data
    if (body?.requiresJustification) {
      needJustify.value = {
        shift,
        kind,
        distanceMetros: body.distanceMetros,
      }
      justifyText.value = ''
    } else {
      error.value = body?.error || e.message || 'No se pudo marcar'
    }
  } finally {
    punching.value = ''
  }
}

async function confirmJustify() {
  if (!needJustify.value) return
  punching.value = needJustify.value.shift.id
  justifyError.value = ''
  try {
    const data = await submitPunch(
      needJustify.value.shift,
      needJustify.value.kind,
      justifyText.value.trim(),
    )
    if (data.queued) {
      okMsg.value = 'Marca fuera de rango en cola offline'
    } else {
      okMsg.value = `Marca registrada fuera de rango · ${data.item?.distanceMetros ?? ''} m`
      await load()
    }
    needJustify.value = null
  } catch (e) {
    justifyError.value = e.response?.data?.error || e.message || 'No se pudo marcar'
  } finally {
    punching.value = ''
  }
}

async function makeQr() {
  qrBusy.value = true
  error.value = ''
  try {
    const shift = shifts.value[0]
    const { data } = await api.post('/attendance/qr/token', {
      shiftId: shift?.id,
      placeId: shift ? placePick.value[shift.id] || shift.placeId : undefined,
    })
    qrInfo.value = data
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo generar QR'
  } finally {
    qrBusy.value = false
  }
}

async function closeScan() {
  scanLock = false
  scanHandle?.stop?.()
  scanHandle = null
  stopQrScan()
  scanEngine.value = ''
  showScan.value = false
}

async function toggleScan() {
  if (showScan.value) {
    await closeScan()
    return
  }
  error.value = ''
  scanPayload.value = ''
  scanHint.value = supportsCameraScan()
    ? 'Apuntá la cámara al QR de asistencia'
    : 'Cámara no disponible — pegá el token abajo'
  showScan.value = true
  await nextTick()
  if (!supportsCameraScan() || !scanVideo.value) return
  try {
    scanHandle = await startQrScan(scanVideo.value, onQrDetected)
    scanEngine.value = scanHandle.engine
    scanHint.value =
      scanHandle.engine === 'barcodeDetector'
        ? 'Cámara lista (nativa) — esperando QR…'
        : 'Cámara lista — esperando QR…'
  } catch (e) {
    scanHint.value = e.message || 'No se pudo abrir la cámara — pegá el token'
    scanEngine.value = ''
  }
}

async function onQrDetected(text) {
  if (scanLock || qrBusy.value) return
  const payload = String(text || '').trim()
  if (!payload) return
  scanPayload.value = payload
  scanHint.value = 'QR leído — registrando…'
  scanLock = true
  await punchByQr()
}

async function punchByQr() {
  const payload = scanPayload.value.trim()
  if (!payload) return
  qrBusy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    let gps = null
    if (punchMode.value !== 'libre') {
      try {
        gps = await captureGps()
      } catch {
        /* QR puede ir sin GPS si modo libre; si falla y es en_lugar el server rechazará */
      }
    }
    const { data } = await api.post('/attendance/qr/punch', {
      payload,
      kind: 'presencia',
      mode: punchMode.value || 'en_lugar',
      gps,
      idempotencyKey: `qr-scan-${Date.now()}`,
    })
    okMsg.value = `Marca QR OK · ${geoLabel(data.item?.geoResult)}`
    scanPayload.value = ''
    await closeScan()
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo marcar por QR'
    scanHint.value = 'No se pudo registrar — reintentá o pegá el token'
    scanLock = false
  } finally {
    qrBusy.value = false
  }
}

function onOnline() {
  flushQueue()
}

onMounted(() => {
  load()
  refreshQueueBadge()
  window.addEventListener('online', onOnline)
  if (navigator.onLine && loadPunchQueue().some((e) => e.status === 'pending')) {
    flushQueue()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', onOnline)
  stopQrScan()
})

watch(policy, (p) => {
  if (p?.defaultMode) punchMode.value = p.defaultMode
})

watch(tab, (t) => {
  if (t !== 'hoy' && showScan.value) closeScan()
})
</script>

<style scoped>
.att {
  padding: 1rem 1rem 5rem;
}
.att-head h1 {
  font-size: 1.35rem;
  margin: 0;
}
.att-head p {
  margin: 0.25rem 0 0;
  color: var(--muted, #64748b);
  font-size: 0.9rem;
}
.att-queue {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  border-radius: 0.55rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
}
.att-link {
  background: none;
  border: 0;
  color: #0f766e;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 0.35rem;
}
.att-mode {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
}
.att-mode select {
  border: 1px solid #cbd5e1;
  border-radius: 0.45rem;
  padding: 0.4rem 0.55rem;
}
.att-tabs {
  display: flex;
  gap: 0.35rem;
  margin: 1rem 0;
}
.att-tabs button {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.55rem;
  padding: 0.45rem;
  font-size: 0.85rem;
}
.att-tabs button.on {
  background: var(--brand, #0f766e);
  color: #fff;
  border-color: transparent;
}
.att-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.9rem 1rem;
  margin-bottom: 0.75rem;
}
.att-card h2 {
  margin: 0.35rem 0;
  font-size: 1.05rem;
}
.att-card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.att-fecha {
  color: #64748b;
}
.att-estado {
  text-transform: capitalize;
  color: #0f766e;
  font-weight: 600;
}
.att-estado[data-geo='out_of_range'],
.att-punch[data-geo='out_of_range'] {
  color: #b45309;
}
.att-estado[data-geo='in_range'],
.att-punch[data-geo='in_range'] {
  color: #047857;
}
.att-meta {
  margin: 0.2rem 0;
  color: #64748b;
  font-size: 0.85rem;
}
.att-punches {
  margin: 0.5rem 0;
}
.att-punch {
  font-size: 0.82rem;
  margin: 0.15rem 0;
}
.att-exp {
  color: #b91c1c;
  font-weight: 600;
}
.att-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.65rem;
}
.att-primary {
  background: var(--brand, #0f766e);
  color: #fff;
  border: 0;
  border-radius: 0.65rem;
  padding: 0.5rem 0.85rem;
  font-weight: 600;
}
.att-ghost {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  padding: 0.5rem 0.85rem;
}
.att-sub {
  font-size: 0.95rem;
  margin: 0.75rem 0 0.25rem;
}
.att-pre {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 0.65rem;
  padding: 0.65rem 0.75rem;
  margin-top: 0.75rem;
}
.att-qr-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.65rem 0;
}
.att-qr-card {
  text-align: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.att-code {
  display: block;
  font-size: 0.7rem;
  word-break: break-all;
  color: #475569;
}
.att-scan {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.att-scan-cam {
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 3 / 4;
  max-height: 320px;
}
.att-scan-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.att-scan-frame {
  position: absolute;
  inset: 18% 16%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 0.5rem;
  box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.35);
  pointer-events: none;
}
.att-scan-paste {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.att-err {
  color: #b91c1c;
  font-size: 0.9rem;
}
.att-ok {
  color: #047857;
  font-size: 0.9rem;
}
.att-muted {
  color: #64748b;
}
.att-muted.center {
  text-align: center;
  padding: 2rem 0;
}
.att-sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}
.att-sheet-panel {
  background: #fff;
  width: 100%;
  border-radius: 1rem 1rem 0 0;
  padding: 1.1rem;
}
.att-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.55rem;
  padding: 0.55rem;
  margin: 0.5rem 0;
  font: inherit;
}
</style>
