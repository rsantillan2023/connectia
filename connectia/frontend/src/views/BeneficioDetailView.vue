<template>
  <section class="bd">
    <header class="bd-nav">
      <button type="button" class="bd-nav-btn" aria-label="Volver" @click="$router.push('/beneficios')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M15 5L8 12l7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h1 class="bd-nav-title">{{ navTitle }}</h1>
      <button type="button" class="bd-nav-btn" aria-label="Compartir" @click="share">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" stroke="currentColor" stroke-width="1.8" />
          <circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8" />
          <circle cx="18" cy="19" r="2.5" stroke="currentColor" stroke-width="1.8" />
          <path d="M8.3 10.8l7.4-4.2M8.3 13.2l7.4 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <p v-if="loading" class="bd-muted">Cargando…</p>
    <p v-if="error" class="bd-err" role="alert">{{ error }}</p>

    <template v-if="item && !loading">
      <div class="bd-body">
        <article class="bd-highlight">
          <div class="bd-type-head">
            <div class="bd-type-brand-block">
              <strong class="bd-type-brand">{{ brandName }}</strong>
              <span class="bd-type-cat">{{ item.categoriaLabel || item.kindLabel }}</span>
            </div>
            <span class="bd-type-badge">{{ dayBadge }}</span>
          </div>
          <p class="bd-type-main">{{ benefitMain }}</p>
          <p v-for="(line, i) in detailLines" :key="i" class="bd-type-detail">{{ line }}</p>

          <button type="button" class="bd-help" :aria-expanded="helpOpen" @click="toggleHelp">
            ¿Cómo funcionan los reintegros?
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" :class="{ open: helpOpen }">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <p v-if="helpOpen" class="bd-help-text">{{ explainText || 'Cargando…' }}</p>
        </article>

        <section v-if="payWithLabel" class="bd-sec">
          <h2>Pagá con</h2>
          <div class="bd-row">
            <span class="bd-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.7" />
                <path d="M3 10h18" stroke="currentColor" stroke-width="1.7" />
              </svg>
            </span>
            <span>{{ payWithLabel }}</span>
          </div>
        </section>

        <section class="bd-sec">
          <h2>Podés usarlo</h2>
          <div v-if="usageFrequency" class="bd-row">
            <span class="bd-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.7" />
                <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </span>
            <span>
              {{ usageFrequency }}
              <small v-if="usageHint" class="bd-hint">{{ usageHint }}</small>
            </span>
          </div>
          <div v-if="validityLabel" class="bd-row">
            <span class="bd-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path
                  d="M4 9.5h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9zM4 9.5l2.5-4h11L20 9.5"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
                <path d="M9 14h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </span>
            <span>{{ validityLabel }}</span>
          </div>
          <div v-if="item.timeFrom || item.timeTo" class="bd-row">
            <span class="bd-ico" aria-hidden="true">⏱</span>
            <span>{{ item.timeFrom || '00:00' }}–{{ item.timeTo || '23:59' }}</span>
          </div>
        </section>

        <button
          v-if="item.hasLocation || item.locations?.length || item.sucursal"
          type="button"
          class="bd-cta soft"
          :disabled="directionsBusy"
          @click="openBranches"
        >
          {{ branchesLabel }}
        </button>

        <div v-if="showBranches && (item.locations?.length || item.sucursal)" class="bd-branches">
          <ul v-if="item.locations?.length" class="bd-locs">
            <li v-for="loc in item.locations" :key="loc.id">
              <button
                type="button"
                class="bd-loc"
                :class="{ on: selectedLocationId === loc.id }"
                @click="selectedLocationId = loc.id"
              >
                {{ loc.name || 'Sucursal' }}
                <span v-if="loc.stock != null">· stock {{ loc.stock }}</span>
              </button>
            </li>
          </ul>
          <p v-else-if="item.sucursal" class="bd-text">{{ item.sucursal }}</p>
          <button type="button" class="bd-cta ghost" :disabled="directionsBusy" @click="openDirections">
            {{ directionsBusy ? 'Abriendo ruta…' : 'Cómo llegar' }}
          </button>
        </div>

        <section v-if="item.condiciones" class="bd-sec">
          <h2>Condiciones de uso</h2>
          <p class="bd-text">{{ item.condiciones }}</p>
        </section>

        <section v-else-if="item.descripcion" class="bd-sec">
          <h2>Condiciones de uso</h2>
          <p class="bd-text">{{ item.descripcion }}</p>
        </section>

        <div class="bd-actions">
          <button type="button" class="bd-fav" @click="toggleFav">
            {{ item.favorite ? '★ Favorito' : '☆ Favorito' }}
          </button>
          <button type="button" class="bd-cta ghost" @click="addToCart">Agregar al carrito</button>
          <button type="button" class="bd-cta" :disabled="redeemBusy" @click="redeem">
            {{ redeemLabel }}
          </button>
          <button
            v-if="item.allowWaitlist"
            type="button"
            class="bd-cta ghost"
            :disabled="waitBusy"
            @click="joinWaitlist"
          >
            {{ waitBusy ? 'Anotando…' : 'Lista de espera' }}
          </button>
          <a
            v-if="item.partnerUrl"
            class="bd-link"
            :href="item.partnerUrl"
            target="_blank"
            rel="noopener"
          >
            Ir al partner
          </a>
        </div>

        <div v-if="redemption" class="bd-code">
          <h2>Tu código</h2>
          <code>{{ redemption.code }}</code>
          <p>Presentá este código / QR en el comercio.</p>
          <small>{{ redemption.qrPayload }}</small>
        </div>

        <p v-if="okMsg" class="bd-ok">{{ okMsg }}</p>
        <p v-if="walletEnabled && balance != null" class="bd-bal">Tu saldo: {{ balance }} pts</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const item = ref(null)
const balance = ref(null)
const walletEnabled = ref(false)
const loading = ref(true)
const error = ref('')
const redeemBusy = ref(false)
const redemption = ref(null)
const okMsg = ref('')
const directionsBusy = ref(false)
const selectedLocationId = ref('')
const explainText = ref('')
const waitBusy = ref(false)
const helpOpen = ref(false)
const showBranches = ref(false)

const navTitle = computed(() => {
  const it = item.value
  if (!it) return 'Beneficio'
  return it.offerTypeLabel || it.kindLabel || 'Beneficio'
})

const brandName = computed(() =>
  String(item.value?.partnerName || item.value?.titulo || 'Beneficio').trim(),
)

const dayBadge = computed(() => {
  const labels = item.value?.daysOfWeekLabels || []
  if (!labels.length || labels.length >= 7) return 'Todos los días'
  if (labels.length === 1) return labels[0]
  return labels[0]
})

const benefitMain = computed(() => {
  const t = String(item.value?.titulo || '').trim()
  if (t) return t
  if (item.value?.costoPuntos) return `${item.value.costoPuntos} puntos`
  return item.value?.offerTypeLabel || item.value?.kindLabel || 'Beneficio'
})

const detailLines = computed(() => {
  const it = item.value
  if (!it) return []
  const lines = []
  const desc = String(it.descripcion || '').trim()
  if (desc) lines.push(excerpt(desc, 72))
  else if (it.categoriaLabel) lines.push(`En ${String(it.categoriaLabel).toLowerCase()}`)

  if (it.cupo != null) lines.push(`Cupo ${it.cupo}`)
  else if (it.limitePorUsuario != null) lines.push(`Tope ${it.limitePorUsuario} por uso`)
  else if (it.costoPuntos) lines.push(`${it.costoPuntos} pts`)
  return lines.slice(0, 2)
})

const payWithLabel = computed(() => {
  const it = item.value
  if (!it) return ''
  if (it.costoPuntos > 0) return 'Puntos Connectia'
  if (it.partnerName) return `Tarjeta / app ${it.partnerName}`
  return 'Medio de pago del comercio'
})

const usageFrequency = computed(() => {
  const it = item.value
  if (!it) return ''
  if (it.limitePorMes != null) return `${it.limitePorMes} ${it.limitePorMes === 1 ? 'vez' : 'veces'} por mes`
  if (it.limitePorSemana != null) {
    return `${it.limitePorSemana} ${it.limitePorSemana === 1 ? 'vez' : 'veces'} por semana`
  }
  if (it.limitePorDia != null) return `${it.limitePorDia} ${it.limitePorDia === 1 ? 'vez' : 'veces'} por día`
  if (it.limitePorUsuario != null) return `Hasta ${it.limitePorUsuario} por usuario`
  return ''
})

const usageHint = computed(() => {
  const it = item.value
  if (!it) return ''
  if (it.limitePorMes != null) return '(Se renueva el primer día de cada mes)'
  if (it.limitePorSemana != null) return '(Se renueva cada lunes)'
  return ''
})

const validityLabel = computed(() => {
  const until = item.value?.vigenciaHasta
  if (!until) return ''
  const d = new Date(until)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `Válido hasta el ${dd}/${mm}/${yyyy}`
})

const branchesLabel = computed(() => {
  if (showBranches.value) return 'Ocultar sucursales'
  return directionsBusy.value ? 'Abriendo…' : 'Consultar sucursales'
})

const redeemLabel = computed(() => {
  if (redeemBusy.value) return 'Procesando…'
  const c = item.value?.costoPuntos || 0
  if (c > 0) return `Canjear por ${c} pts`
  return 'Obtener código'
})

function excerpt(s, n = 90) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return `${t.slice(0, n - 1)}…`
}

async function toggleHelp() {
  helpOpen.value = !helpOpen.value
  if (helpOpen.value && !explainText.value) await explain()
}

function openBranches() {
  showBranches.value = !showBranches.value
  if (showBranches.value && !item.value?.locations?.length && item.value?.directionsUrl) {
    openDirections()
  }
}

function buildDirectionsUrl(origin) {
  const it = item.value
  if (!it) return ''
  const hasCoords = it.lat != null && it.lng != null
  const dest = hasCoords
    ? `${Number(it.lat)},${Number(it.lng)}`
    : String(it.sucursal || '').trim()
  if (!dest) return it.directionsUrl || ''
  const params = new URLSearchParams({
    api: '1',
    destination: dest,
    travelmode: 'driving',
  })
  if (origin?.lat != null && origin?.lng != null) {
    params.set('origin', `${origin.lat},${origin.lng}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function openDirections() {
  if (!item.value) return
  directionsBusy.value = true
  const fallback = item.value.directionsUrl || buildDirectionsUrl()
  const open = (url) => {
    window.open(url || fallback, '_blank', 'noopener')
    directionsBusy.value = false
  }
  if (!navigator.geolocation) {
    open(fallback)
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      open(
        buildDirectionsUrl({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      )
    },
    () => open(fallback),
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 },
  )
}

async function share() {
  const it = item.value
  if (!it) return
  const url = window.location.href
  const title = brandName.value
  const text = benefitMain.value
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return
    }
  } catch {
    /* cancelado */
  }
  try {
    await navigator.clipboard.writeText(url)
    okMsg.value = 'Enlace copiado'
  } catch {
    okMsg.value = url
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/benefits/${route.params.id}`)
    item.value = data.item
    walletEnabled.value = Boolean(data.walletEnabled)
    balance.value = data.balance
    if (data.item?.locations?.length) selectedLocationId.value = data.item.locations[0].id
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el beneficio'
  } finally {
    loading.value = false
  }
}

async function explain() {
  if (!item.value) return
  try {
    const { data } = await api.post(`/benefits/${item.value.id}/explain`)
    explainText.value = data.text || item.value.descripcion || 'Consultá las condiciones de uso.'
  } catch {
    explainText.value = item.value.descripcion || item.value.condiciones || 'Consultá las condiciones de uso.'
  }
}

async function joinWaitlist() {
  if (!item.value) return
  waitBusy.value = true
  try {
    await api.post(`/benefits/${item.value.id}/waitlist`)
    okMsg.value = 'Quedaste en lista de espera'
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo anotar'
  } finally {
    waitBusy.value = false
  }
}

async function toggleFav() {
  if (!item.value) return
  try {
    if (item.value.favorite) {
      await api.delete(`/benefits/${item.value.id}/favorite`)
      item.value.favorite = false
    } else {
      await api.post(`/benefits/${item.value.id}/favorite`)
      item.value.favorite = true
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al actualizar favorito'
  }
}

async function addToCart() {
  if (!item.value) return
  const key = 'connectia.benefits.cart'
  let cart = []
  try {
    cart = JSON.parse(localStorage.getItem(key) || '[]')
    if (!Array.isArray(cart)) cart = []
  } catch {
    cart = []
  }
  const found = cart.find((c) => c.benefitId === item.value.id)
  if (found) found.cantidad += 1
  else {
    cart.push({
      benefitId: item.value.id,
      titulo: item.value.titulo,
      costoPuntos: item.value.costoPuntos || 0,
      cantidad: 1,
    })
  }
  localStorage.setItem(key, JSON.stringify(cart))
  okMsg.value = 'Agregado al carrito'
}

async function redeem() {
  if (!item.value) return
  redeemBusy.value = true
  error.value = ''
  okMsg.value = ''
  const idempotencyKey = `ui-redeem:${item.value.id}:${Date.now()}`
  const body = {
    idempotencyKey,
    locationId: selectedLocationId.value || '',
  }
  const doRequest = async (extra = {}) => {
    const { data } = await api.post(`/benefits/${item.value.id}/redeem`, { ...body, ...extra })
    return data
  }
  try {
    let geo = null
    if (navigator.geolocation) {
      geo = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ clientLat: pos.coords.latitude, clientLng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 3000, maximumAge: 120000 },
        )
      })
    }
    const data = await doRequest(geo || {})
    redemption.value = data.redemption
    okMsg.value = data.replay ? 'Canje ya registrado' : 'Canje confirmado'
    if (data.benefit) item.value = { ...item.value, ...data.benefit }
    if (walletEnabled.value) {
      const w = await api.get('/wallet/points')
      balance.value = w.data.balance
    }
  } catch (e) {
    if (!navigator.onLine || e.message === 'Network Error' || !e.response) {
      const queue = JSON.parse(localStorage.getItem('connectia.benefits.offlineQueue') || '[]')
      queue.push({
        benefitId: item.value.id,
        idempotencyKey,
        offlineAt: new Date().toISOString(),
        locationId: selectedLocationId.value || '',
      })
      localStorage.setItem('connectia.benefits.offlineQueue', JSON.stringify(queue))
      okMsg.value = 'Sin conexión: canje guardado para sincronizar'
    } else if (e.response?.data?.waitlist) {
      error.value = e.response.data.error
    } else {
      error.value = e.response?.data?.error || 'No se pudo canjear'
    }
  } finally {
    redeemBusy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bd {
  padding: 0 0 5rem;
  max-width: 640px;
  margin: 0 auto;
  background: #fff;
  min-height: 60vh;
}
.bd-nav {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 4px;
  padding: 0.55rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  z-index: 5;
  background: #fff;
}
.bd-nav-btn {
  border: 0;
  background: transparent;
  color: #0f172a;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 10px;
}
.bd-nav-title {
  margin: 0;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.bd-body {
  padding: 1rem 1.1rem 1.5rem;
  display: grid;
  gap: 1.15rem;
}
.bd-highlight {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  background: #fff;
  display: grid;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.bd-type-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.bd-type-brand-block {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.bd-type-brand {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}
.bd-type-cat {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 500;
}
.bd-type-badge {
  flex-shrink: 0;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.2;
  white-space: nowrap;
}
.bd-type-main {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  line-height: 1.25;
}
.bd-type-detail {
  margin: 0;
  font-size: 0.9rem;
  color: #1e293b;
  line-height: 1.35;
}
.bd-type-detail + .bd-type-detail {
  margin-top: -6px;
}
.bd-help {
  margin-top: 4px;
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.bd-help svg {
  transition: transform 0.15s ease;
}
.bd-help svg.open {
  transform: rotate(180deg);
}
.bd-help-text {
  margin: 0;
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.45;
  white-space: pre-wrap;
}
.bd-sec h2 {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}
.bd-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #1e293b;
  font-size: 0.92rem;
  line-height: 1.35;
  margin-bottom: 0.65rem;
}
.bd-row:last-child {
  margin-bottom: 0;
}
.bd-ico {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #64748b;
  display: grid;
  place-items: center;
  margin-top: 1px;
}
.bd-hint {
  display: block;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 2px;
}
.bd-cta {
  display: block;
  width: 100%;
  border: none;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 12px;
  padding: 0.9rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}
.bd-cta.soft {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 18%, #fff);
  color: var(--brand-primary, #0f766e);
}
.bd-cta.ghost {
  margin-top: 0.55rem;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
}
.bd-cta:disabled {
  opacity: 0.6;
}
.bd-branches {
  margin-top: -0.4rem;
}
.bd-locs {
  list-style: none;
  margin: 0 0 0.5rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.bd-loc {
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.bd-loc.on {
  border-color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, #fff);
  color: var(--brand-primary, #0f766e);
}
.bd-text {
  margin: 0;
  white-space: pre-wrap;
  color: #475569;
  line-height: 1.5;
  font-size: 0.9rem;
}
.bd-actions {
  display: grid;
  gap: 0.55rem;
  padding-top: 0.25rem;
}
.bd-fav {
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, #fff);
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
}
.bd-link {
  display: block;
  text-align: center;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.65rem;
}
.bd-code {
  padding: 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px dashed var(--brand-primary, #0f766e);
  text-align: center;
}
.bd-code h2 {
  margin: 0;
  font-size: 0.95rem;
}
.bd-code code {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0.5rem 0;
  color: var(--brand-primary, #0f766e);
}
.bd-code small {
  word-break: break-all;
  color: #94a3b8;
  font-size: 0.7rem;
}
.bd-err {
  color: #b91c1c;
  padding: 0 1.1rem;
}
.bd-ok {
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  margin: 0;
}
.bd-bal {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}
.bd-muted {
  color: #94a3b8;
  padding: 1rem 1.1rem;
}
</style>
