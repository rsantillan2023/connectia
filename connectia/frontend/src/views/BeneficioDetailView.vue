<template>
  <section class="bd">
    <button type="button" class="bd-back" @click="$router.push('/beneficios')">← Beneficios</button>

    <p v-if="loading" class="bd-muted">Cargando…</p>
    <p v-if="error" class="bd-err" role="alert">{{ error }}</p>

    <template v-if="item && !loading">
      <div class="bd-hero" :style="heroStyle">
        <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
      </div>

      <div class="bd-body">
        <div class="bd-tags">
          <span class="pill">{{ item.kindLabel }}</span>
          <span class="pill soft">{{ item.categoriaLabel }}</span>
          <button type="button" class="fav" @click="toggleFav">
            {{ item.favorite ? '★ Favorito' : '☆ Favorito' }}
          </button>
        </div>

        <h1>{{ item.titulo }}</h1>
        <p v-if="item.partnerName" class="bd-partner">{{ item.partnerName }}</p>
        <p v-if="item.costoPuntos" class="bd-cost">{{ item.costoPuntos }} puntos</p>
        <p v-if="walletEnabled && balance != null" class="bd-bal">Tu saldo: {{ balance }} pts</p>

        <div class="bd-block">
          <h2>Descripción</h2>
          <p class="bd-text">{{ item.descripcion || 'Sin descripción.' }}</p>
        </div>

        <div v-if="item.condiciones" class="bd-block">
          <h2>Condiciones</h2>
          <p class="bd-text">{{ item.condiciones }}</p>
        </div>

        <div v-if="item.sucursal || item.hasLocation" class="bd-block">
          <h2>Ubicación</h2>
          <p v-if="item.sucursal" class="bd-text">{{ item.sucursal }}</p>
          <p v-if="item.lat != null && item.lng != null" class="bd-coords">
            {{ Number(item.lat).toFixed(5) }}, {{ Number(item.lng).toFixed(5) }}
          </p>
          <button
            v-if="item.directionsUrl || item.hasLocation"
            type="button"
            class="bd-cta ghost"
            :disabled="directionsBusy"
            @click="openDirections"
          >
            {{ directionsBusy ? 'Abriendo ruta…' : 'Cómo llegar' }}
          </button>
        </div>

        <a
          v-if="item.partnerUrl"
          class="bd-link"
          :href="item.partnerUrl"
          target="_blank"
          rel="noopener"
        >
          Ir al partner
        </a>

        <button
          type="button"
          class="bd-cta ghost"
          @click="addToCart"
        >
          Agregar al carrito
        </button>

        <button
          type="button"
          class="bd-cta"
          :disabled="redeemBusy"
          @click="redeem"
        >
          {{ redeemLabel }}
        </button>

        <div v-if="redemption" class="bd-code">
          <h2>Tu código</h2>
          <code>{{ redemption.code }}</code>
          <p>Presentá este código / QR en el comercio.</p>
          <small>{{ redemption.qrPayload }}</small>
        </div>

        <p v-if="okMsg" class="bd-ok">{{ okMsg }}</p>
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

const heroStyle = computed(() =>
  item.value?.imageUrl
    ? {}
    : { background: 'linear-gradient(145deg,#0f766e,#115e59)' },
)

const redeemLabel = computed(() => {
  if (redeemBusy.value) return 'Procesando…'
  const c = item.value?.costoPuntos || 0
  if (c > 0) return `Canjear por ${c} pts`
  return 'Obtener código'
})

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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/benefits/${route.params.id}`)
    item.value = data.item
    walletEnabled.value = Boolean(data.walletEnabled)
    balance.value = data.balance
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el beneficio'
  } finally {
    loading.value = false
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
  try {
    const { data } = await api.post(`/benefits/${item.value.id}/redeem`, {
      idempotencyKey: `ui-redeem:${item.value.id}:${Date.now()}`,
    })
    redemption.value = data.redemption
    okMsg.value = data.replay ? 'Canje ya registrado' : 'Canje confirmado'
    if (data.benefit) item.value = { ...item.value, ...data.benefit }
    if (walletEnabled.value) {
      const w = await api.get('/wallet/points')
      balance.value = w.data.balance
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo canjear'
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
}
.bd-back {
  margin: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: #0f766e;
  font-weight: 600;
  font-size: 0.9rem;
}
.bd-hero {
  height: 200px;
  background: #0f766e;
  overflow: hidden;
}
.bd-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bd-body {
  padding: 1rem 1.1rem;
}
.bd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.pill {
  background: #0f766e;
  color: #fff;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
}
.pill.soft {
  background: #ecfdf5;
  color: #0f766e;
}
.fav {
  border: none;
  background: transparent;
  color: #ca8a04;
  font-weight: 600;
  font-size: 0.85rem;
  margin-left: auto;
}
.bd-body h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}
.bd-partner,
.bd-cost,
.bd-bal {
  margin: 0.15rem 0;
  color: #0f766e;
  font-weight: 600;
  font-size: 0.9rem;
}
.bd-block {
  margin-top: 1.1rem;
}
.bd-block h2 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
}
.bd-text {
  margin: 0;
  white-space: pre-wrap;
  color: #334155;
  line-height: 1.45;
  font-size: 0.95rem;
}
.bd-coords {
  margin: 0.25rem 0 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
}
.bd-link {
  display: inline-block;
  margin-top: 1rem;
  color: #0f766e;
  font-weight: 600;
}
.bd-cta {
  display: block;
  width: 100%;
  margin-top: 1.25rem;
  border: none;
  background: #0f766e;
  color: #fff;
  border-radius: 0.9rem;
  padding: 0.9rem;
  font-weight: 700;
  font-size: 1rem;
}
.bd-cta.ghost {
  margin-top: 0.75rem;
  background: #ecfdf5;
  color: #0f766e;
}
.bd-cta:disabled {
  opacity: 0.6;
}
.bd-code {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px dashed #0f766e;
  text-align: center;
}
.bd-code code {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0.5rem 0;
  color: #0f766e;
}
.bd-code small {
  word-break: break-all;
  color: #94a3b8;
  font-size: 0.7rem;
}
.bd-err {
  color: #b91c1c;
  padding: 0 1rem;
}
.bd-ok {
  color: #0f766e;
  font-weight: 600;
}
.bd-muted {
  color: #94a3b8;
  padding: 1rem;
}
</style>
