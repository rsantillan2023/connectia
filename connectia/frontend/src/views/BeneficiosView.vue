<template>
  <section class="ben">
    <header class="ben-head">
      <div>
        <h1>Beneficios</h1>
        <p v-if="walletEnabled && balance != null" class="ben-balance">{{ balance }} pts</p>
        <p v-else class="ben-sub">Catálogo, canjes y billetera</p>
      </div>
      <button v-if="cartCount" type="button" class="ben-cart-btn" @click="tab = 'cart'">
        Carrito ({{ cartCount }})
      </button>
    </header>

    <div class="ben-tabs" role="tablist">
      <button v-for="t in tabs" :key="t.id" type="button" role="tab" :class="{ on: tab === t.id }" @click="setTab(t.id)">
        {{ t.label }}
      </button>
    </div>

    <div v-if="tab === 'all' || tab === 'benefit' || tab === 'reward' || tab === 'fav'" class="ben-toolbar">
      <input v-model="q" type="search" class="ben-search" placeholder="Buscar…" @keyup.enter="load" />
      <div class="ben-view-toggle">
        <button type="button" :class="{ on: view === 'list' }" @click="view = 'list'">Lista</button>
        <button type="button" :class="{ on: view === 'map' }" @click="openMap">Mapa</button>
      </div>
    </div>

    <p v-if="error" class="ben-err" role="alert">{{ error }}</p>
    <p v-if="okMsg" class="ben-ok">{{ okMsg }}</p>
    <p v-if="loading" class="ben-muted">Cargando…</p>

    <!-- Mapa -->
    <div v-show="view === 'map' && (tab === 'all' || tab === 'benefit' || tab === 'reward' || tab === 'fav')" class="ben-map-wrap">
      <div ref="mapEl" class="ben-map" />
      <p v-if="!mapItems.length && !loading" class="ben-muted center">Sin ubicaciones cargadas.</p>
    </div>

    <!-- Lista catálogo -->
    <ul v-if="!loading && view === 'list' && catalogTab" class="ben-list">
      <li v-for="item in items" :key="item.id">
        <div class="ben-card">
          <button type="button" class="ben-card-main" @click="$router.push(`/beneficios/${item.id}`)">
            <div class="ben-thumb">
              <img v-if="item.imageUrl" :src="item.imageUrl" alt="" @error="onImgErr" />
            </div>
            <div class="ben-main">
              <strong>{{ item.titulo }}</strong>
              <p class="ben-meta">
                <span class="ben-pill">{{ item.kindLabel }}</span>
                <span v-if="item.costoPuntos">{{ item.costoPuntos }} pts</span>
                <span v-if="item.distanceKm != null">· {{ item.distanceKm.toFixed(1) }} km</span>
              </p>
              <p v-if="item.descripcion" class="ben-desc">{{ excerpt(item.descripcion) }}</p>
            </div>
          </button>
          <div class="ben-card-actions">
            <button type="button" class="fav-btn" @click="toggleFav(item)">{{ item.favorite ? '★' : '☆' }}</button>
            <a
              v-if="item.directionsUrl"
              class="dir-btn"
              :href="item.directionsUrl"
              target="_blank"
              rel="noopener"
              title="Cómo llegar"
              @click.stop
            >
              Ir
            </a>
            <button type="button" class="add-btn" @click="addToCart(item)">+ Carrito</button>
          </div>
        </div>
      </li>
      <p v-if="!items.length" class="ben-muted center">No hay beneficios.</p>
    </ul>

    <!-- Carrito -->
    <div v-if="tab === 'cart'" class="ben-panel">
      <h2>Carrito</h2>
      <ul v-if="cart.length" class="ben-cart-list">
        <li v-for="c in cart" :key="c.benefitId">
          <div>
            <strong>{{ c.titulo }}</strong>
            <span>{{ c.costoPuntos }} pts c/u</span>
          </div>
          <div class="qty">
            <button type="button" @click="changeQty(c.benefitId, -1)">−</button>
            <em>{{ c.cantidad }}</em>
            <button type="button" @click="changeQty(c.benefitId, 1)">+</button>
          </div>
        </li>
      </ul>
      <p v-else class="ben-muted">El carrito está vacío.</p>
      <p v-if="cart.length" class="ben-total">Total: <strong>{{ cartTotal }} pts</strong></p>
      <button
        v-if="cart.length"
        type="button"
        class="ben-primary"
        :disabled="checkoutBusy"
        @click="checkout"
      >
        {{ checkoutBusy ? 'Canjeando…' : 'Canjear carrito' }}
      </button>
      <div v-if="lastRedemptions.length" class="ben-codes">
        <h3>Códigos generados</h3>
        <p v-for="r in lastRedemptions" :key="r.id"><code>{{ r.code }}</code></p>
      </div>
    </div>

    <!-- Partners -->
    <ul v-if="!loading && tab === 'partners'" class="ben-list">
      <li v-for="p in partners" :key="p.id">
        <a class="ben-card-main linkish" :href="p.url" target="_blank" rel="noopener">
          <div class="ben-thumb"><img v-if="p.imageUrl" :src="p.imageUrl" alt="" /></div>
          <div class="ben-main">
            <strong>{{ p.titulo }}</strong>
            <p class="ben-desc">{{ p.descripcion }}</p>
          </div>
        </a>
      </li>
    </ul>

    <!-- Cómo sumar puntos -->
    <div v-if="tab === 'earn'" class="ben-panel">
      <div class="ben-wallet-card">
        <span>Tu saldo</span>
        <strong>{{ balance ?? 0 }}</strong>
        <small>puntos</small>
      </div>
      <h3 class="ben-earn-title">Cómo sumar puntos</h3>
      <p class="ben-muted">Participá en la comunidad y sumá. Estas son las reglas activas:</p>
      <ul v-if="earnRules.length" class="ben-earn-list">
        <li v-for="r in earnRules" :key="r.id">
          <strong>{{ r.label || r.eventLabel }}</strong>
          <span>+{{ r.points }} pts</span>
          <small v-if="r.dailyCap != null">tope {{ r.dailyCap }}/día</small>
        </li>
      </ul>
      <p v-else class="ben-muted">Todavía no hay reglas de puntos configuradas.</p>
    </div>

    <!-- Billetera -->
    <div v-if="tab === 'wallet'" class="ben-panel">
      <div class="ben-wallet-card">
        <span>Tu saldo</span>
        <strong>{{ balance ?? 0 }}</strong>
        <small>puntos</small>
      </div>

      <div class="ben-wallet-actions">
        <button type="button" class="ben-primary ghost" @click="walletMode = 'transfer'">Transferir</button>
        <button type="button" class="ben-primary ghost" @click="showMyQr">Cobrar (mi QR)</button>
        <button type="button" class="ben-primary ghost" @click="walletMode = 'pay'">Pagar QR</button>
        <button type="button" class="ben-primary ghost" @click="walletMode = 'withdraw'">Retirar</button>
      </div>

      <form v-if="walletMode === 'transfer'" class="ben-form" @submit.prevent="transfer">
        <h3>Transferir puntos</h3>
        <input v-model="xferUsuario" class="ben-search" placeholder="Usuario destino" required />
        <input v-model.number="xferAmount" class="ben-search" type="number" min="1" required />
        <button type="submit" class="ben-primary" :disabled="xferBusy">Enviar</button>
      </form>

      <div v-if="walletMode === 'receive' && myQr" class="ben-qr-box">
        <h3>Tu QR de cobro</h3>
        <img :src="qrImg(myQr.payload)" alt="QR cobro" width="200" height="200" />
        <p class="ben-muted">Válido {{ myQr.ttlSec }}s · {{ myQr.displayName }}</p>
        <code class="ben-payload">{{ myQr.payload }}</code>
        <button type="button" class="ben-primary ghost" @click="showMyQr">Renovar</button>
      </div>

      <form v-if="walletMode === 'pay'" class="ben-form" @submit.prevent="payQr">
        <h3>Pagar con QR</h3>
        <textarea v-model="payPayload" class="ben-search" rows="2" placeholder="Pegá el código connectia:pay:…" required />
        <input v-model.number="payAmount" class="ben-search" type="number" min="1" required />
        <button type="submit" class="ben-primary" :disabled="payBusy">Pagar</button>
      </form>

      <form v-if="walletMode === 'withdraw'" class="ben-form" @submit.prevent="withdraw">
        <h3>Retiro</h3>
        <input v-model="wdAlias" class="ben-search" placeholder="Alias (opcional)" />
        <input v-model="wdCbu" class="ben-search" placeholder="CBU/CVU 22 dígitos" />
        <input v-model.number="wdAmount" class="ben-search" type="number" min="1" required />
        <button type="submit" class="ben-primary" :disabled="wdBusy">Solicitar retiro</button>
        <p class="ben-muted">El retiro queda pendiente de conciliación bancaria del tenant.</p>
      </form>

      <h3 class="ben-h2">Movimientos</h3>
      <ul class="ben-tx">
        <li v-for="t in txs" :key="t.id">
          <div>
            <strong>{{ t.concept || t.type }}</strong>
            <span>{{ formatDate(t.createdAt) }} · {{ t.status }}</span>
          </div>
          <em :class="{ neg: t.signedAmount < 0 }">
            {{ t.signedAmount > 0 ? '+' : '' }}{{ t.signedAmount }}
          </em>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const CART_KEY = 'connectia.benefits.cart'

const tab = ref('all')
const view = ref('list')
const q = ref('')
const items = ref([])
const partners = ref([])
const txs = ref([])
const mapItems = ref([])
const balance = ref(null)
const earnRules = ref([])
const walletEnabled = ref(false)
const partnersEnabled = ref(false)
const loading = ref(true)
const error = ref('')
const okMsg = ref('')
const cart = ref(loadCart())
const checkoutBusy = ref(false)
const lastRedemptions = ref([])
const mapEl = ref(null)
let map = null
let markersLayer = null
/** Cache GPS para no bloquear el catálogo en cada carga */
let cachedGeo = null
let geoPromise = null
let loadSeq = 0

const walletMode = ref('transfer')
const xferUsuario = ref('')
const xferAmount = ref(100)
const xferBusy = ref(false)
const myQr = ref(null)
const payPayload = ref('')
const payAmount = ref(100)
const payBusy = ref(false)
const wdAlias = ref('')
const wdCbu = ref('')
const wdAmount = ref(100)
const wdBusy = ref(false)

const catalogTab = computed(() => ['all', 'benefit', 'reward', 'fav'].includes(tab.value))
const cartCount = computed(() => cart.value.reduce((n, c) => n + c.cantidad, 0))
const cartTotal = computed(() => cart.value.reduce((n, c) => n + c.cantidad * (c.costoPuntos || 0), 0))

const tabs = computed(() => {
  const base = [
    { id: 'all', label: 'Todos' },
    { id: 'benefit', label: 'Beneficios' },
    { id: 'reward', label: 'Premios' },
    { id: 'fav', label: 'Favoritos' },
    { id: 'cart', label: 'Carrito' },
  ]
  if (partnersEnabled.value) base.push({ id: 'partners', label: 'Partners' })
  if (walletEnabled.value) {
    base.push({ id: 'earn', label: 'Cómo sumar' })
    base.push({ id: 'wallet', label: 'Billetera' })
  }
  return base
})

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart.value))
}

function excerpt(s, n = 90) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`
}
function onImgErr(e) {
  e.target.style.display = 'none'
}
function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}
function qrImg(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`
}

function setTab(t) {
  tab.value = t
  view.value = 'list'
  if (t === 'wallet') loadWallet()
  else if (t === 'earn') loadEarn()
  else if (t === 'partners') loadPartners()
  else if (t !== 'cart') load()
}

async function loadEarn() {
  loading.value = true
  error.value = ''
  try {
    const [w, r] = await Promise.all([
      api.get('/wallet/points'),
      api.get('/wallet/how-to-earn'),
    ])
    balance.value = w.data.balance
    earnRules.value = r.data.items || []
    walletEnabled.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las reglas de puntos'
  } finally {
    loading.value = false
  }
}

function addToCart(item) {
  const found = cart.value.find((c) => c.benefitId === item.id)
  if (found) found.cantidad += 1
  else {
    cart.value.push({
      benefitId: item.id,
      titulo: item.titulo,
      costoPuntos: item.costoPuntos || 0,
      cantidad: 1,
    })
  }
  saveCart()
  okMsg.value = `Agregado: ${item.titulo}`
}

function changeQty(id, delta) {
  const row = cart.value.find((c) => c.benefitId === id)
  if (!row) return
  row.cantidad += delta
  if (row.cantidad <= 0) cart.value = cart.value.filter((c) => c.benefitId !== id)
  saveCart()
}

async function checkout() {
  checkoutBusy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data } = await api.post('/benefits/cart/checkout', {
      items: cart.value.map((c) => ({ benefitId: c.benefitId, cantidad: c.cantidad })),
      idempotencyKey: `cart:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    })
    lastRedemptions.value = data.redemptions || []
    if (data.balance != null) balance.value = data.balance
    cart.value = []
    saveCart()
    okMsg.value = data.replay ? 'Canje ya registrado' : `Canje OK · ${data.totalPuntos || 0} pts`
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo canjear el carrito'
  } finally {
    checkoutBusy.value = false
  }
}

function catalogParams(extra = {}) {
  const params = { ...extra }
  if (q.value.trim()) params.q = q.value.trim()
  if (tab.value === 'benefit' || tab.value === 'reward') params.kind = tab.value
  if (tab.value === 'fav') params.favoritos = '1'
  if (cachedGeo) {
    params.lat = cachedGeo.lat
    params.lng = cachedGeo.lng
  }
  return params
}

/** GPS en paralelo / cache; no bloquea el listado. */
function ensureGeo() {
  if (cachedGeo) return Promise.resolve(cachedGeo)
  if (geoPromise) return geoPromise
  if (!navigator.geolocation) return Promise.resolve(null)
  geoPromise = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        resolve(cachedGeo)
      },
      () => resolve(null),
      { timeout: 4000, maximumAge: 120000 },
    )
  }).finally(() => {
    geoPromise = null
  })
  return geoPromise
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/benefits', { params: catalogParams() })
    if (seq !== loadSeq) return
    items.value = data.items || []
    walletEnabled.value = Boolean(data.walletEnabled)
    partnersEnabled.value = Boolean(data.partnersEnabled)
    if (walletEnabled.value && balance.value == null) {
      api
        .get('/wallet/points')
        .then((w) => {
          if (seq === loadSeq) balance.value = w.data.balance
        })
        .catch(() => {})
    }
    // Refinar distancias cuando llegue GPS (sin spinner)
    if (!cachedGeo) {
      ensureGeo().then(async (geo) => {
        if (!geo || seq !== loadSeq || !catalogTab.value) return
        try {
          const { data: again } = await api.get('/benefits', { params: catalogParams() })
          if (seq !== loadSeq) return
          items.value = again.items || []
        } catch {
          /* ok */
        }
      })
    }
  } catch (e) {
    if (seq === loadSeq) error.value = e.response?.data?.error || 'No se pudo cargar'
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function openMap() {
  view.value = 'map'
  loading.value = true
  error.value = ''
  try {
    const params = cachedGeo ? { lat: cachedGeo.lat, lng: cachedGeo.lng } : {}
    const { data } = await api.get('/benefits/map', { params })
    mapItems.value = data.items || []
    await nextTick()
    ensureMap()
    if (!cachedGeo) {
      ensureGeo().then(async (geo) => {
        if (!geo || view.value !== 'map') return
        try {
          const { data: again } = await api.get('/benefits/map', {
            params: { lat: geo.lat, lng: geo.lng },
          })
          mapItems.value = again.items || []
          await nextTick()
          ensureMap()
        } catch {
          /* ok */
        }
      })
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el mapa'
  } finally {
    loading.value = false
  }
}

function ensureMap() {
  if (!mapEl.value) return
  if (!map) {
    map = L.map(mapEl.value, { scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    markersLayer = L.layerGroup().addTo(map)
  }
  markersLayer.clearLayers()
  const bounds = []
  for (const it of mapItems.value) {
    if (it.lat == null || it.lng == null) continue
    const m = L.circleMarker([it.lat, it.lng], {
      radius: 9,
      color: '#fff',
      weight: 2,
      fillColor: '#0f766e',
      fillOpacity: 0.95,
    })
    const dirHref = it.directionsUrl ? escapeHtml(it.directionsUrl) : ''
    const detailHref = `/beneficios/${encodeURIComponent(it.id)}`
    m.bindPopup(
      `<strong>${escapeHtml(it.titulo)}</strong><br/>${it.costoPuntos || 0} pts` +
        (dirHref
          ? `<br/><a href="${dirHref}" target="_blank" rel="noopener">Cómo llegar</a>`
          : '') +
        `<br/><a href="${detailHref}">Ver ficha</a>`,
    )
    m.on('click', () => {
      /* detail via popup */
    })
    markersLayer.addLayer(m)
    bounds.push([it.lat, it.lng])
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })
  else map.setView([-34.6037, -58.3816], 11)
  setTimeout(() => map?.invalidateSize(), 80)
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function loadPartners() {
  loading.value = true
  try {
    const { data } = await api.get('/benefits/partners')
    partners.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'Error partners'
  } finally {
    loading.value = false
  }
}

async function loadWallet() {
  loading.value = true
  try {
    const { data } = await api.get('/wallet')
    balance.value = data.balance
    txs.value = data.items || []
    walletEnabled.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Billetera no disponible'
  } finally {
    loading.value = false
  }
}

async function toggleFav(item) {
  try {
    if (item.favorite) {
      await api.delete(`/benefits/${item.id}/favorite`)
      item.favorite = false
    } else {
      await api.post(`/benefits/${item.id}/favorite`)
      item.favorite = true
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Error favorito'
  }
}

async function transfer() {
  xferBusy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/wallet/transfer', {
      toUsuario: xferUsuario.value.trim(),
      amount: Number(xferAmount.value),
      idempotencyKey: `xfer:${Date.now()}`,
    })
    balance.value = data.balance
    okMsg.value = 'Transferencia OK'
    await loadWallet()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al transferir'
  } finally {
    xferBusy.value = false
  }
}

async function showMyQr() {
  walletMode.value = 'receive'
  error.value = ''
  try {
    const { data } = await api.get('/wallet/qr/mine')
    myQr.value = data
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo generar QR'
  }
}

async function payQr() {
  payBusy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/wallet/qr/pay', {
      payload: payPayload.value.trim(),
      amount: Number(payAmount.value),
      idempotencyKey: `qrpay:${Date.now()}`,
    })
    balance.value = data.balance
    okMsg.value = `Pagado a ${data.toUser?.nombre || 'usuario'}`
    payPayload.value = ''
    await loadWallet()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al pagar'
  } finally {
    payBusy.value = false
  }
}

async function withdraw() {
  wdBusy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/wallet/withdraw', {
      alias: wdAlias.value.trim(),
      cbu: wdCbu.value.trim(),
      amount: Number(wdAmount.value),
      idempotencyKey: `wd:${Date.now()}`,
    })
    balance.value = data.balance
    okMsg.value = data.note || 'Retiro solicitado'
    await loadWallet()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al retirar'
  } finally {
    wdBusy.value = false
  }
}

watch(view, (v) => {
  if (v === 'map') openMap()
})

onMounted(() => {
  if (route.query.tab === 'earn' || route.query.tab === 'wallet') {
    setTab(String(route.query.tab))
  } else {
    load()
  }
})
onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.ben {
  padding: 1rem 1rem 5rem;
  max-width: 640px;
  margin: 0 auto;
}
.ben-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.ben-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}
.ben-sub,
.ben-balance {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
}
.ben-balance {
  color: #0f766e;
  font-weight: 600;
}
.ben-sub {
  color: #64748b;
}
.ben-cart-btn,
.ben-tabs button,
.ben-view-toggle button {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
}
.ben-cart-btn {
  background: #0f766e;
  color: #fff;
}
.ben-tabs {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}
.ben-tabs button.on,
.ben-view-toggle button.on {
  background: #0f766e;
  color: #fff;
}
.ben-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.ben-search {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  background: #fff;
}
.ben-view-toggle {
  display: flex;
  gap: 0.35rem;
}
.ben-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.ben-card {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 1rem;
  overflow: hidden;
}
.ben-card-main {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.65rem;
  color: inherit;
  text-decoration: none;
}
.ben-card-main.linkish {
  cursor: pointer;
}
.ben-thumb {
  width: 72px;
  height: 72px;
  border-radius: 0.75rem;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #0f766e, #134e4a);
}
.ben-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ben-main {
  flex: 1;
  min-width: 0;
}
.ben-main strong {
  font-size: 0.95rem;
}
.ben-meta {
  margin: 0.25rem 0;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.ben-pill {
  background: #ecfdf5;
  color: #0f766e;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-weight: 600;
}
.ben-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #475569;
}
.ben-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0 0.65rem 0.65rem;
}
.fav-btn,
.add-btn,
.dir-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
}
.fav-btn {
  color: #ca8a04;
  border: none;
  font-size: 1.1rem;
}
.add-btn {
  color: #0f766e;
}
.dir-btn {
  color: #1d4ed8;
  text-decoration: none;
}
.ben-err {
  color: #b91c1c;
}
.ben-ok {
  color: #0f766e;
  font-weight: 600;
}
.ben-muted {
  color: #94a3b8;
}
.ben-muted.center {
  text-align: center;
  padding: 1.5rem 0;
}
.ben-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 1rem;
}
.ben-panel h2,
.ben-panel h3,
.ben-h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.ben-cart-list {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
}
.ben-cart-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.ben-cart-list span {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
}
.qty {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.qty button {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
}
.ben-total {
  margin: 0.5rem 0 0.75rem;
}
.ben-primary {
  display: block;
  width: 100%;
  border: none;
  background: #0f766e;
  color: #fff;
  border-radius: 0.75rem;
  padding: 0.75rem;
  font-weight: 700;
}
.ben-primary.ghost {
  background: #ecfdf5;
  color: #0f766e;
  width: auto;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
}
.ben-codes {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.75rem;
}
.ben-codes code {
  display: block;
  font-weight: 700;
  color: #0f766e;
  letter-spacing: 0.06em;
  margin: 0.25rem 0;
}
.ben-wallet-card {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  margin-bottom: 12px;
}
.ben-earn-title {
  margin: 8px 0 4px;
  font-size: 1.05rem;
}
.ben-earn-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.ben-earn-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 12px;
  padding: 10px 12px;
}
.ben-earn-list li span {
  margin-left: auto;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
}
.ben-earn-list li small {
  width: 100%;
  color: var(--cx-muted, #64748b);
}
  background: linear-gradient(145deg, #0f766e, #134e4a);
  color: #fff;
  border-radius: 1.25rem;
  padding: 1.25rem;
  margin-bottom: 0.75rem;
}
.ben-wallet-card strong {
  font-size: 2.2rem;
  display: block;
}
.ben-wallet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.ben-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.ben-qr-box {
  text-align: center;
  margin-bottom: 1rem;
}
.ben-payload {
  display: block;
  font-size: 0.65rem;
  word-break: break-all;
  color: #64748b;
  margin: 0.5rem 0;
}
.ben-tx {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ben-tx li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.ben-tx span {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
}
.ben-tx em {
  font-style: normal;
  font-weight: 700;
  color: #0f766e;
}
.ben-tx em.neg {
  color: #b45309;
}
.ben-map-wrap {
  margin-bottom: 1rem;
}
.ben-map {
  height: 320px;
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
</style>
