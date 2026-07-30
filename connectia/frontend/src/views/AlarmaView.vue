<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'
import {
  enqueueAlarm,
  flushAlarmQueue,
  fileToDataUrl,
  isLikelyOffline,
  pendingAlarmCount,
  startAlarmOfflineFlush,
} from '../lib/pedidosOffline'

const loading = ref(true)
const sending = ref(false)
const uploading = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ categories: [], canAlarm: false })
const categoryId = ref('')
const note = ref('')
const photoUrl = ref('')
const photoDataUrl = ref('')
const photoPreview = ref('')
const gpsStatus = ref('')
const lastCreated = ref(null)
const mine = ref([])
const queuePending = ref(0)
const fileInput = ref(null)
let stopFlush = null

const defaultCat = computed(() => {
  const cats = meta.value.categories || []
  return cats.find((c) => c.defaultForAlarm) || cats[0] || null
})

function refreshQueue() {
  queuePending.value = pendingAlarmCount()
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const [m, list] = await Promise.all([
      api.get('/pedidos/meta'),
      api.get('/pedidos', { params: { source: 'alarm' } }),
    ])
    meta.value = m.data
    mine.value = list.data.items || []
    if (!categoryId.value && defaultCat.value) categoryId.value = defaultCat.value.id
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
    refreshQueue()
  }
}

function captureGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      gpsStatus.value = 'GPS no disponible en este dispositivo'
      resolve(null)
      return
    }
    gpsStatus.value = 'Obteniendo ubicación…'
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsStatus.value = `GPS ±${Math.round(pos.coords.accuracy || 0)} m`
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
          permission: 'granted',
        })
      },
      (e) => {
        gpsStatus.value =
          e.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener GPS'
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  })
}

function clearPhoto() {
  photoUrl.value = ''
  photoDataUrl.value = ''
  photoPreview.value = ''
}

async function onPhoto(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  uploading.value = true
  err.value = ''
  try {
    // Siempre guardar data URL local (sirve offline y como preview)
    const dataUrl = await fileToDataUrl(file)
    photoDataUrl.value = dataUrl
    photoPreview.value = dataUrl
    photoUrl.value = ''

    if (navigator.onLine) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await api.post('/pedidos/upload', fd)
        photoUrl.value = data.url
        photoPreview.value = resolveMediaUrl(data.url) || dataUrl
      } catch (ex) {
        if (!isLikelyOffline(ex)) {
          err.value = ex.response?.data?.error || 'No se pudo subir la foto'
          clearPhoto()
        }
        // Si es offline mid-upload, nos quedamos con dataUrl para la cola
      }
    }
  } catch (ex) {
    err.value = ex.message || 'No se pudo leer la foto'
    clearPhoto()
  } finally {
    uploading.value = false
  }
}

function queueLocally(geo, idem) {
  enqueueAlarm({
    categoryId: categoryId.value || undefined,
    note: note.value.trim(),
    geo,
    photoUrl: photoUrl.value || '',
    photoDataUrl: photoUrl.value ? '' : photoDataUrl.value,
    idempotencyKey: idem,
  })
  refreshQueue()
  ok.value = 'Sin señal: reporte guardado con ubicación. Se enviará al recuperar red.'
  note.value = ''
  clearPhoto()
}

async function flushQueue() {
  err.value = ''
  ok.value = ''
  if (!navigator.onLine) {
    ok.value = 'Todavía sin conexión'
    return
  }
  const r = await flushAlarmQueue(api)
  refreshQueue()
  if (r.confirmed) {
    ok.value = `Sincronizados ${r.confirmed} reporte(s)`
    await load()
  } else if (r.failed) {
    err.value = `Fallaron ${r.failed} reporte(s) de la cola`
  } else if (!r.pending) {
    ok.value = 'Cola al día'
  }
}

async function sendAlarm() {
  if (sending.value || uploading.value) return
  if (!photoUrl.value && !photoDataUrl.value) {
    err.value = 'Sacá o elegí una foto antes de enviar'
    return
  }
  sending.value = true
  err.value = ''
  ok.value = ''
  lastCreated.value = null
  try {
    // Capturar lugar YA (aunque no haya red)
    const geo = await captureGeo()
    const idem =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `alarm-${Date.now()}-${Math.random().toString(36).slice(2)}`

    if (!navigator.onLine) {
      queueLocally(geo, idem)
      return
    }

    try {
      let attachment = photoUrl.value
      if (!attachment && photoDataUrl.value) {
        const blobRes = await fetch(photoDataUrl.value)
        const blob = await blobRes.blob()
        const fd = new FormData()
        fd.append('file', blob, 'alarm.jpg')
        const up = await api.post('/pedidos/upload', fd)
        attachment = up.data.url
        photoUrl.value = attachment
      }
      const { data } = await api.post(
        '/pedidos/alarm',
        {
          categoryId: categoryId.value || undefined,
          note: note.value.trim(),
          geo,
          attachments: [attachment],
          idempotencyKey: idem,
        },
        { headers: { 'Idempotency-Key': idem } },
      )
      lastCreated.value = data.item
      ok.value = `Recibido: pedido #${data.item.number}`
      note.value = ''
      clearPhoto()
      await load()
    } catch (e) {
      if (isLikelyOffline(e)) {
        queueLocally(geo, idem)
        return
      }
      throw e
    }
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    sending.value = false
  }
}

async function cancelMine(id) {
  try {
    await api.patch(`/pedidos/${id}`, { status: 'cancelada', reason: 'cancelado por el miembro' })
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

function thumb(p) {
  const u = p.attachments?.[0]
  return u ? resolveMediaUrl(u) || u : ''
}

onMounted(() => {
  load()
  stopFlush = startAlarmOfflineFlush(api)
  refreshQueue()
})

onUnmounted(() => {
  if (stopFlush) stopFlush()
})
</script>

<template>
  <section class="al">
    <header class="al-head">
      <h1>Reportes</h1>
      <p>Botón rápido con foto y ubicación. Genera un pedido de campo.</p>
    </header>

    <p v-if="queuePending" class="al-queue">
      {{ queuePending }} reporte(s) en cola offline
      <button type="button" class="al-link" @click="flushQueue">Sincronizar</button>
    </p>

    <p v-if="loading" class="al-meta">Cargando…</p>
    <p v-else-if="err" class="al-err">{{ err }}</p>
    <p v-if="ok" class="al-ok">{{ ok }}</p>

    <div v-if="!loading" class="al-card">
      <label class="al-label">
        Categoría
        <select v-model="categoryId" class="al-input">
          <option v-for="c in meta.categories" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </label>

      <div class="al-photo">
        <p class="al-label">Foto <span class="al-req">(obligatoria)</span></p>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="al-file"
          @change="onPhoto"
        />
        <div class="al-photo-actions">
          <button type="button" class="al-ghost" :disabled="uploading" @click="fileInput?.click()">
            {{ uploading ? 'Subiendo…' : photoPreview ? 'Cambiar foto' : 'Sacar / elegir foto' }}
          </button>
          <button v-if="photoPreview" type="button" class="al-ghost" @click="clearPhoto">Quitar</button>
        </div>
        <img v-if="photoPreview" :src="photoPreview" alt="Evidencia" class="al-preview" />
      </div>

      <label class="al-label">
        Observación (opcional)
        <textarea v-model="note" class="al-input" rows="3" maxlength="2000" placeholder="Qué pasó…" />
      </label>
      <p v-if="gpsStatus" class="al-meta">{{ gpsStatus }}</p>
      <button
        type="button"
        class="al-panic"
        :disabled="sending || uploading || !photoPreview"
        @click="sendAlarm"
      >
        {{ sending ? 'Enviando…' : 'Enviar reporte' }}
      </button>
      <p v-if="lastCreated" class="al-ok">
        #{{ lastCreated.number }}
        <span v-if="lastCreated.geo"> · con GPS</span>
        <span v-else> · sin GPS</span>
        <span v-if="lastCreated.attachments?.length"> · con foto</span>
      </p>
    </div>

    <h2 class="al-sub">Mis reportes</h2>
    <ul v-if="mine.length" class="al-list">
      <li v-for="p in mine" :key="p.id" class="al-item">
        <img v-if="thumb(p)" :src="thumb(p)" alt="" class="al-thumb" />
        <div class="al-item-body">
          <strong>#{{ p.number }}</strong>
          <span class="al-badge" :style="{ background: p.categoryColor || '#dc2626' }">
            {{ p.categoryName || p.status }}
          </span>
          <p class="al-meta">{{ p.status }} · {{ p.priority }}</p>
          <p v-if="p.note" class="al-note">{{ p.note }}</p>
        </div>
        <button
          v-if="p.status === 'abierta'"
          type="button"
          class="al-ghost"
          @click="cancelMine(p.id)"
        >
          Cancelar
        </button>
      </li>
    </ul>
    <p v-else class="al-meta">Todavía no tenés reportes.</p>
  </section>
</template>

<style scoped>
.al {
  padding: 1rem 1rem 5rem;
  max-width: 32rem;
  margin: 0 auto;
}
.al-head h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}
.al-head p {
  margin: 0.35rem 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}
.al-queue {
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.al-link {
  background: none;
  border: 0;
  color: #c2410c;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 0.35rem;
}
.al-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}
.al-label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}
.al-req {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.8rem;
}
.al-input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  font: inherit;
}
.al-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}
.al-photo-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.al-preview {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.al-panic {
  background: #dc2626;
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1rem;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
}
.al-panic:disabled {
  opacity: 0.55;
}
.al-sub {
  margin: 1.5rem 0 0.75rem;
  font-size: 1rem;
}
.al-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}
.al-item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  align-items: flex-start;
}
.al-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.al-item-body {
  flex: 1;
  min-width: 0;
}
.al-badge {
  display: inline-block;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  margin-left: 0.35rem;
}
.al-meta {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.2rem 0 0;
}
.al-note {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
}
.al-err {
  color: #b91c1c;
}
.al-ok {
  color: #047857;
  font-weight: 600;
}
.al-ghost {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
  font-size: 0.8rem;
  align-self: start;
  cursor: pointer;
}
</style>
