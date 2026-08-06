<template>
  <section class="ben">
    <header class="ben-hero">
      <div class="ben-hero-top">
        <button
          v-if="tab === 'earn'"
          type="button"
          class="ben-back"
          aria-label="Volver a beneficios"
          @click="backToCatalog"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <h1>{{ tab === 'earn' ? 'Cómo sumar puntos' : 'Beneficios' }}</h1>
        <div class="ben-hero-badges">
          <button v-if="cartCount" type="button" class="ben-cart-btn" @click="tab = 'cart'">
            Carrito ({{ cartCount }})
          </button>
          <span v-if="balance != null" class="ben-level">
            {{ pointsLabel }}
            <span class="ben-level-hex" aria-hidden="true">pts</span>
          </span>
          <button
            v-if="catalogTab && canEarn"
            type="button"
            class="ben-search-toggle"
            aria-label="Cómo sumar puntos"
            @click="openEarn"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path
                d="M12 3.2l1.35 4.15h4.36l-3.53 2.56 1.35 4.15L12 11.5l-3.53 2.56 1.35-4.15-3.53-2.56h4.36L12 3.2z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path
                d="M18.2 14.2l.7 2.15h2.26l-1.83 1.33.7 2.15-1.83-1.33-1.83 1.33.7-2.15-1.83-1.33h2.26l.7-2.15z"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            v-if="catalogTab"
            type="button"
            class="ben-search-toggle"
            :class="{ on: searchOpen }"
            :aria-expanded="searchOpen"
            aria-controls="ben-search-panel"
            :aria-label="searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'"
            @click="toggleSearch"
          >
            <svg v-if="!searchOpen" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="catalogTab && searchOpen"
        id="ben-search-panel"
        class="ben-search-row"
      >
        <label class="ben-search-wrap">
          <span class="ben-search-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
              <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <input
            ref="searchInputEl"
            v-model="q"
            type="search"
            class="ben-search"
            placeholder="Buscar"
            @keyup.enter="load"
            @input="onSearchInput"
          />
        </label>
        <div class="ben-view-switch" role="group" aria-label="Vista lista o mapa">
          <button
            type="button"
            class="ben-view-opt"
            :class="{ on: view === 'list' }"
            :aria-pressed="view === 'list'"
            @click="view = 'list'"
          >
            Lista
          </button>
          <button
            type="button"
            class="ben-view-opt"
            :class="{ on: view === 'map' }"
            :aria-pressed="view === 'map'"
            @click="openMap"
          >
            Mapa
          </button>
        </div>
      </div>

      <div v-if="catalogTab" class="ben-cats" role="list">
        <button
          type="button"
          class="ben-cat"
          :class="{ on: !offerType }"
          @click="setOfferType('')"
        >
          Todos
        </button>
        <button
          v-for="t in offerTypeChips"
          :key="t.id"
          type="button"
          class="ben-cat"
          :class="{ on: offerType === t.id }"
          @click="setOfferType(t.id)"
        >
          {{ t.label }}
        </button>
      </div>
    </header>

    <div class="ben-body">
      <p v-if="error" class="ben-err" role="alert">{{ error }}</p>
      <p v-if="okMsg" class="ben-ok">{{ okMsg }}</p>
      <p v-if="loading" class="ben-muted">Cargando…</p>

      <!-- Mapa -->
      <div v-show="view === 'map' && (tab === 'all' || tab === 'benefit' || tab === 'reward' || tab === 'fav')" class="ben-map-wrap">
        <div ref="mapEl" class="ben-map" />
        <p v-if="!mapItems.length && !loading" class="ben-muted center">Sin ubicaciones cargadas.</p>
      </div>

      <!-- Catálogo en carruseles -->
      <div v-if="!loading && view === 'list' && catalogTab && showCarousels" class="ben-home">
        <section v-if="forYouItems.length" class="ben-rail">
          <h2 class="ben-rail-title">Pensados para vos</h2>
          <div class="ben-rail-scroll">
            <button
              v-for="item in forYouItems"
              :key="item.id"
              type="button"
              class="ben-offer"
              @click="$router.push(`/beneficios/${item.id}`)"
            >
              <div class="ben-offer-brand" :style="brandStyle(item)">
                <img v-if="item.imageUrl" :src="item.imageUrl" alt="" @error="onImgErr" />
                <span v-else>{{ (item.partnerName || item.titulo || '?').slice(0, 1) }}</span>
              </div>
              <div class="ben-offer-body">
                <strong>{{ offerHeadline(item) }}</strong>
                <p>{{ excerpt(item.descripcion || item.condiciones, 56) }}</p>
                <small v-if="item.costoPuntos">{{ item.costoPuntos }} pts</small>
                <small v-else-if="item.daysOfWeekLabels?.length">{{ item.daysOfWeekLabels.join(', ') }}</small>
                <small v-else>{{ item.categoriaLabel || item.kindLabel }}</small>
              </div>
            </button>
          </div>
        </section>

        <section v-if="categoryChips.length && !categoria && !q.trim()" class="ben-rail">
          <h2 class="ben-rail-title">Categorías destacadas 🏆</h2>
          <div class="ben-rail-scroll">
            <button
              v-for="c in categoryChips"
              :key="c.id"
              type="button"
              class="ben-cat-tile"
              @click="setCategoria(c.id)"
            >
              <span class="ben-cat-emoji" aria-hidden="true">{{ categoryEmoji(c.id) }}</span>
              <span class="ben-cat-name">{{ c.label }}</span>
            </button>
          </div>
        </section>

        <section v-for="rail in categoryRails" :key="rail.id" class="ben-rail">
          <div class="ben-rail-head">
            <h2 class="ben-rail-title">{{ rail.label }}</h2>
            <button
              v-if="!categoria"
              type="button"
              class="ben-rail-more"
              @click="setCategoria(rail.id)"
            >
              Ver todos
            </button>
          </div>
          <div class="ben-rail-scroll">
            <button
              v-for="item in rail.items"
              :key="item.id"
              type="button"
              class="ben-offer"
              @click="$router.push(`/beneficios/${item.id}`)"
            >
              <div class="ben-offer-brand" :style="brandStyle(item)">
                <img v-if="item.imageUrl" :src="item.imageUrl" alt="" @error="onImgErr" />
                <span v-else>{{ (item.partnerName || item.titulo || '?').slice(0, 1) }}</span>
              </div>
              <div class="ben-offer-body">
                <strong>{{ offerHeadline(item) }}</strong>
                <p>{{ excerpt(item.descripcion || item.condiciones, 56) }}</p>
                <small v-if="item.costoPuntos">{{ item.costoPuntos }} pts</small>
                <small v-else>{{ item.kindLabel }}</small>
              </div>
            </button>
          </div>
        </section>

        <p v-if="!forYouItems.length && !categoryRails.length" class="ben-muted center">No hay beneficios.</p>
      </div>

      <!-- Lista por tipo (estilo fila con logo) -->
      <div v-else-if="!loading && view === 'list' && catalogTab && showTypeCards" class="ben-type-panel">
        <h2 v-if="typeListTitle" class="ben-type-title">{{ typeListTitle }}</h2>
        <ul class="ben-type-list">
          <li v-for="item in items" :key="item.id">
            <button type="button" class="ben-type-row" @click="$router.push(`/beneficios/${item.id}`)">
              <div class="ben-type-avatar" :class="{ placeholder: !hasItemImage(item) }">
                <img
                  v-if="hasItemImage(item)"
                  :src="item.imageUrl"
                  alt=""
                  @error="onTypeImgErr(item)"
                />
                <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" stroke="currentColor" stroke-width="1.8" />
                  <path
                    d="M5.5 19.2c.9-3.2 3.2-4.9 6.5-4.9s5.6 1.7 6.5 4.9"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div class="ben-type-copy">
                <strong class="ben-type-brand">{{ brandName(item) }}</strong>
                <p class="ben-type-offer">{{ benefitOfferLine(item) }}</p>
                <p class="ben-type-meta">{{ benefitMetaLine(item) }}</p>
              </div>
            </button>
          </li>
        </ul>
        <p v-if="!items.length" class="ben-muted center">No hay beneficios.</p>
      </div>

      <!-- Lista clásica (favoritos) -->
      <ul v-else-if="!loading && view === 'list' && catalogTab" class="ben-list">
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
                  <span v-if="item.availableNow === false" class="ben-off">· Fuera de horario</span>
                  <span v-if="item.recommendReason">· {{ item.recommendReason }}</span>
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
        <p class="ben-muted">Usá la app y sumá puntos. Estas son las reglas activas:</p>
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
          <input v-model="xferUsuario" class="ben-search-plain" placeholder="Usuario destino" required />
          <input v-model.number="xferAmount" class="ben-search-plain" type="number" min="1" required />
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
          <textarea v-model="payPayload" class="ben-search-plain" rows="2" placeholder="Pegá el código connectia:pay:…" required />
          <input v-model.number="payAmount" class="ben-search-plain" type="number" min="1" required />
          <button type="submit" class="ben-primary" :disabled="payBusy">Pagar</button>
        </form>

        <form v-if="walletMode === 'withdraw'" class="ben-form" @submit.prevent="withdraw">
          <h3>Retiro</h3>
          <input v-model="wdAlias" class="ben-search-plain" placeholder="Alias (opcional)" />
          <input v-model="wdCbu" class="ben-search-plain" placeholder="CBU/CVU 22 dígitos" />
          <input v-model.number="wdAmount" class="ben-search-plain" type="number" min="1" required />
          <button type="submit" class="ben-primary" :disabled="wdBusy">Solicitar retiro</button>
          <p class="ben-muted">El retiro queda pendiente de conciliación bancaria del tenant.</p>
        </form>

        <h3 class="ben-h2">Movimientos</h3>
        <ul class="ben-tx">
          <li v-for="t in txs" :key="t.id">
            <div>
              <strong>{{ t.kindLabel || t.type }}</strong>
              <span>{{ formatDate(t.createdAt) }} · {{ t.concept || t.status }}</span>
            </div>
            <em :class="{ neg: t.signedAmount < 0 }">
              {{ t.signedAmount > 0 ? '+' : '' }}{{ t.signedAmount }}
            </em>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { resolveCssColor } from '../utils/applyBrandingCssVars'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const CART_KEY = 'connectia.benefits.cart'

const tab = ref('all')
const view = ref('list')
const q = ref('')
const searchOpen = ref(false)
const searchInputEl = ref(null)
const categoria = ref('')
const categories = ref([])
const offerType = ref('')
const offerTypes = ref([])
const disponibleHoy = ref(false)
const sedeOnly = ref(false)
const userSede = ref('')
const items = ref([])
let searchTimer = null

const CATEGORY_LABELS = {
  descuentos: 'Descuentos',
  salud: 'Salud',
  gastronomia: 'Gastronomía',
  transporte: 'Transporte',
  educacion: 'Educación',
  tecnologia: 'Electro y Tecno',
  premios: 'Premios',
  otros: 'Otros',
}

const categoryChips = computed(() =>
  (categories.value || [])
    .map((c) => {
      if (c && typeof c === 'object') {
        const id = String(c.id || c.value || '').trim()
        if (!id) return null
        return {
          id,
          label: c.label || CATEGORY_LABELS[id] || id.replace(/_/g, ' '),
        }
      }
      const id = String(c || '').trim()
      if (!id) return null
      return { id, label: CATEGORY_LABELS[id] || id.replace(/_/g, ' ') }
    })
    .filter(Boolean),
)

const offerTypeChips = computed(() =>
  (offerTypes.value || [])
    .map((t) => {
      if (!t) return null
      const id = String(t.id || '').trim()
      if (!id) return null
      return { id, label: String(t.label || id).trim() || id }
    })
    .filter(Boolean),
)

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

const pointsLabel = computed(() => {
  const pts = Number(balance.value) || 0
  return pts.toLocaleString('es-AR')
})

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

const catalogTab = computed(() => ['all', 'benefit', 'reward', 'fav', 'forYou'].includes(tab.value))

const canEarn = computed(() => {
  if (walletEnabled.value) return true
  const caps = [...(auth.user?.capabilities || []), ...(auth.tenant?.capabilities || [])]
  return caps.includes('beneficios.billetera')
})

function openEarn() {
  router.push({ name: 'beneficios', query: { tab: 'earn' } })
}

function backToCatalog() {
  router.push({ name: 'beneficios' })
}
const showCarousels = computed(
  () =>
    (tab.value === 'all' || tab.value === 'forYou') &&
    !categoria.value &&
    !offerType.value &&
    !String(q.value || '').trim(),
)
const showTypeCards = computed(() => {
  if (!catalogTab.value || tab.value === 'fav') return false
  if (categoria.value || offerType.value || String(q.value || '').trim()) return true
  return tab.value === 'benefit' || tab.value === 'reward'
})
const typeListTitle = computed(() => {
  if (offerType.value) {
    const found = offerTypeChips.value.find((t) => t.id === offerType.value)
    return found?.label || offerType.value
  }
  if (categoria.value) {
    return (
      categoryChips.value.find((c) => c.id === categoria.value)?.label ||
      CATEGORY_LABELS[categoria.value] ||
      String(categoria.value).replace(/_/g, ' ')
    )
  }
  if (String(q.value || '').trim()) return 'Resultados'
  if (tab.value === 'reward') return 'Premios'
  if (tab.value === 'benefit') return 'Beneficios'
  return ''
})
const cartCount = computed(() => cart.value.reduce((n, c) => n + c.cantidad, 0))
const cartTotal = computed(() => cart.value.reduce((n, c) => n + c.cantidad * (c.costoPuntos || 0), 0))

const forYouItems = ref([])

const categoryRails = computed(() => {
  const list = items.value || []
  const byCat = new Map()
  for (const it of list) {
    const id = it.categoria || 'otros'
    if (!byCat.has(id)) byCat.set(id, [])
    byCat.get(id).push(it)
  }
  const chips = categoryChips.value
  const order = chips.length ? chips.map((c) => c.id) : [...byCat.keys()]
  const labelOf = (id) =>
    chips.find((c) => c.id === id)?.label ||
    CATEGORY_LABELS[id] ||
    String(id).replace(/_/g, ' ')
  const rails = []
  for (const id of order) {
    const group = byCat.get(id)
    if (!group?.length) continue
    if (categoria.value && categoria.value !== id) continue
    rails.push({
      id,
      label: labelOf(id),
      items: group.slice(0, 12),
    })
  }
  for (const [id, group] of byCat) {
    if (rails.some((r) => r.id === id)) continue
    if (categoria.value && categoria.value !== id) continue
    rails.push({
      id,
      label: labelOf(id),
      items: group.slice(0, 12),
    })
  }
  return rails
})

function categoryEmoji(id) {
  const fromChip = (categories.value || []).find((c) => c && typeof c === 'object' && c.id === id)
  if (fromChip?.emoji) return fromChip.emoji
  const map = {
    gastronomia: '🍔',
    descuentos: '🛒',
    salud: '💊',
    transporte: '⛽',
    educacion: '📚',
    tecnologia: '📱',
    premios: '🎁',
    otros: '🍿',
  }
  return map[id] || '🏷️'
}

function offerHeadline(item) {
  const t = String(item?.titulo || '').trim()
  if (t.length <= 28) return t
  return `${t.slice(0, 27)}…`
}

function brandStyle(item) {
  const c = String(item?.partnerName || item?.categoria || '').toLowerCase()
  if (/personal|claro|movistar/.test(c) || item?.categoria === 'tecnologia') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 80%, #0f172a)' }
  }
  if (/dia|super|gastro/.test(c) || item?.categoria === 'gastronomia') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 70%, #dc2626)' }
  }
  if (/puma|nafta|combustible|transp/.test(c) || item?.categoria === 'transporte') {
    return { background: 'color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #0f172a)' }
  }
  return { background: 'var(--brand-primary, #0f766e)', color: '#fff' }
}

function brandName(item) {
  return String(item?.partnerName || item?.titulo || 'Beneficio').trim()
}

const brokenImageIds = ref(new Set())

function hasItemImage(item) {
  const id = String(item?.id || '')
  if (!id || brokenImageIds.value.has(id)) return false
  return Boolean(String(item?.imageUrl || '').trim())
}

function onTypeImgErr(item) {
  const id = String(item?.id || '')
  if (!id) return
  const next = new Set(brokenImageIds.value)
  next.add(id)
  brokenImageIds.value = next
}

function dayBadge(item) {
  const labels = item?.daysOfWeekLabels || []
  if (!labels.length || labels.length >= 7) return 'Todos los días'
  if (labels.length === 1) return labels[0]
  if (labels.length <= 3) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')}…`
}

function benefitOfferLine(item) {
  const t = String(item?.titulo || '').trim()
  const brand = brandName(item)
  if (t && t.toLowerCase() !== brand.toLowerCase()) return t
  if (item?.costoPuntos) return `${item.costoPuntos} pts`
  if (item?.offerTypeLabel) return item.offerTypeLabel
  return item?.kindLabel || 'Beneficio'
}

function benefitMetaLine(item) {
  const parts = []
  if (item?.cupo != null) parts.push(`Cupo ${item.cupo}`)
  else if (item?.limitePorUsuario != null) parts.push(`Tope ${item.limitePorUsuario}`)
  else if (item?.costoPuntos) parts.push(`${item.costoPuntos} pts`)
  else parts.push('Sin tope')

  const day = dayBadge(item)
  const place = String(item?.partnerName || item?.sucursal || brandName(item) || '').trim()
  if (day && place) parts.push(`${day} en ${place}`)
  else if (day) parts.push(day)
  else if (place) parts.push(place)

  return parts.filter(Boolean).join(' · ')
}

const OFFLINE_KEY = 'connectia.benefits.offlineQueue'

function loadOfflineQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveOfflineQueue(q) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(q))
}

async function flushOfflineQueue() {
  if (!navigator.onLine) return
  const queue = loadOfflineQueue()
  if (!queue.length) return
  const left = []
  for (const row of queue) {
    try {
      await api.post(`/benefits/${row.benefitId}/redeem`, {
        idempotencyKey: row.idempotencyKey,
        offlineAt: row.offlineAt,
        locationId: row.locationId || '',
        clientLat: row.clientLat,
        clientLng: row.clientLng,
      })
    } catch {
      left.push(row)
    }
  }
  saveOfflineQueue(left)
  if (queue.length !== left.length) okMsg.value = 'Canjes offline sincronizados'
}

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
  if (categoria.value) params.categoria = categoria.value
  if (offerType.value) params.offerType = offerType.value
  if (tab.value === 'benefit' || tab.value === 'reward') params.kind = tab.value
  if (tab.value === 'fav') params.favoritos = '1'
  if (disponibleHoy.value) params.disponibleHoy = '1'
  if (sedeOnly.value) params.sede = '1'
  if (cachedGeo) {
    params.lat = cachedGeo.lat
    params.lng = cachedGeo.lng
  }
  return params
}

function setCategoria(id) {
  categoria.value = id || ''
  if (!catalogTab.value) tab.value = 'all'
  load()
}

function setOfferType(id) {
  offerType.value = id || ''
  if (!catalogTab.value) tab.value = 'all'
  view.value = 'list'
  load()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (catalogTab.value) load()
  }, 350)
}

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInputEl.value?.focus?.()
  }
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
    await flushOfflineQueue()
    if (tab.value === 'forYou') {
      const params = cachedGeo ? { lat: cachedGeo.lat, lng: cachedGeo.lng } : {}
      const { data } = await api.get('/benefits/recommend', { params })
      if (seq !== loadSeq) return
      items.value = data.items || []
      forYouItems.value = data.items || []
    } else {
      const { data } = await api.get('/benefits', { params: catalogParams() })
      if (seq !== loadSeq) return
      items.value = data.items || []
      userSede.value = data.userSede || ''
      walletEnabled.value = Boolean(data.walletEnabled)
      partnersEnabled.value = Boolean(data.partnersEnabled)
      if (Array.isArray(data.offerTypes) && data.offerTypes.length) {
        offerTypes.value = data.offerTypes
      }
  if (Array.isArray(data.categories) && data.categories.length) {
        categories.value = data.categories
      } else if (Array.isArray(data.categoriesMeta)) {
        categories.value = data.categoriesMeta
      }
      if (showCarousels.value) {
        const params = cachedGeo ? { lat: cachedGeo.lat, lng: cachedGeo.lng } : {}
        api
          .get('/benefits/recommend', { params })
          .then((r) => {
            if (seq === loadSeq) forYouItems.value = r.data.items || []
          })
          .catch(() => {
            if (seq === loadSeq) {
              forYouItems.value = (items.value || []).filter((i) => i.destacado).slice(0, 12)
              if (!forYouItems.value.length) forYouItems.value = (items.value || []).slice(0, 8)
            }
          })
      }
    }
    if (walletEnabled.value || balance.value == null) {
      ensureBalance(seq)
    }
    // Refinar distancias cuando llegue GPS (sin spinner)
    if (!cachedGeo && catalogTab.value) {
      ensureGeo().then(async (geo) => {
        if (!geo || seq !== loadSeq || !catalogTab.value) return
        try {
          if (tab.value === 'forYou') {
            const { data: again } = await api.get('/benefits/recommend', {
              params: { lat: geo.lat, lng: geo.lng },
            })
            if (seq !== loadSeq) return
            items.value = again.items || []
          } else {
            const { data: again } = await api.get('/benefits', { params: catalogParams() })
            if (seq !== loadSeq) return
            items.value = again.items || []
          }
        } catch {
          /* ok */
        }
      })
    }
    api.post('/benefits/expiry-nudge').catch(() => {})
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
  const brand = resolveCssColor('--brand-primary')
  for (const it of mapItems.value) {
    if (it.lat == null || it.lng == null) continue
    const m = L.circleMarker([it.lat, it.lng], {
      radius: 9,
      color: '#fff',
      weight: 2,
      fillColor: brand,
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

function ensureBalance(seq = loadSeq) {
  api
    .get('/wallet/points')
    .then((w) => {
      if (seq !== loadSeq) return
      balance.value = w.data.balance
      walletEnabled.value = true
    })
    .catch(() => {})
}

/** Entrada a /beneficios: home con puntos y opción Todos marcada. */
function applyRouteEntry() {
  if (route.name !== 'beneficios') return
  const t = String(route.query.tab || '')
  if (t === 'earn' || t === 'wallet') {
    setTab(t)
    ensureBalance()
    return
  }
  tab.value = 'all'
  view.value = 'list'
  q.value = ''
  searchOpen.value = false
  categoria.value = ''
  offerType.value = ''
  disponibleHoy.value = false
  sedeOnly.value = false
  load()
}

onMounted(applyRouteEntry)

watch(
  () => [route.name, route.query.tab],
  () => {
    if (route.name === 'beneficios') applyRouteEntry()
  },
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.ben {
  padding: 0 0 5rem;
  max-width: 640px;
  margin: 0 auto;
}
.ben-hero {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  padding: 14px 16px 16px;
}
.ben-hero-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 12px;
}
.ben-hero h1 {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}
.ben-hero-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}
.ben-level {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, #000 28%, transparent);
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
}
.ben-level-hex {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  background: color-mix(in srgb, #fff 22%, transparent);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.ben-cart-btn {
  border: 1px solid color-mix(in srgb, #fff 55%, transparent);
  border-radius: 10px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  background: color-mix(in srgb, #000 22%, transparent);
  color: #fff;
  cursor: pointer;
}
.ben-back {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  margin-right: 4px;
  border: 1px solid color-mix(in srgb, #fff 55%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, #000 22%, transparent);
  color: #fff;
  cursor: pointer;
  padding: 0;
}
.ben-search-toggle {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, #fff 55%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, #000 22%, transparent);
  color: #fff;
  cursor: pointer;
  padding: 0;
}
.ben-search-toggle.on {
  background: #fff;
  color: var(--brand-primary, #0f766e);
  border-color: #fff;
}
.ben-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
}
.ben-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  background: #fff;
  border-radius: 999px;
  padding: 0 14px;
  min-height: 44px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
}
.ben-view-switch {
  display: inline-flex;
  flex-shrink: 0;
  align-items: stretch;
  padding: 3px;
  min-height: 44px;
  box-sizing: border-box;
  border-radius: 999px;
  background: color-mix(in srgb, #000 28%, transparent);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
}
.ben-view-opt {
  border: 0;
  background: transparent;
  color: color-mix(in srgb, #fff 78%, transparent);
  border-radius: 999px;
  padding: 0 12px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
}
.ben-view-opt.on {
  background: #fff;
  color: var(--brand-primary, #0f766e);
}
.ben-search-ico {
  display: grid;
  place-items: center;
  color: var(--brand-primary, #0f766e);
  flex-shrink: 0;
}
.ben-search {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 0.95rem;
  color: #334155;
  padding: 10px 0;
}
.ben-search::placeholder {
  color: #94a3b8;
}
.ben-cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  margin-top: 12px;
  padding-bottom: 2px;
}
.ben-cats::-webkit-scrollbar {
  display: none;
}
.ben-cat {
  flex: 0 0 auto;
  border: 1.5px solid color-mix(in srgb, #fff 85%, transparent);
  background: transparent;
  color: #fff;
  border-radius: 10px;
  padding: 7px 12px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.ben-cat.on {
  background: #fff;
  color: var(--brand-primary, #0f766e);
  border-color: #fff;
}
.ben-body {
  padding: 0.85rem 0 0;
  background: #f4f6f8;
  min-height: 40vh;
}
.ben-body > .ben-toolbar,
.ben-body > .ben-err,
.ben-body > .ben-ok,
.ben-body > .ben-muted,
.ben-body > .ben-map-wrap,
.ben-body > .ben-list,
.ben-body > .ben-type-panel,
.ben-body > .ben-panel,
.ben-body > .ben-list.linkish {
  padding-left: 1rem;
  padding-right: 1rem;
}
.ben-home {
  display: grid;
  gap: 1.25rem;
  padding: 0.25rem 0 1.5rem;
}
.ben-rail {
  min-width: 0;
}
.ben-rail-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 1rem;
}
.ben-rail-title {
  margin: 0 0 0.65rem;
  padding: 0 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.ben-rail-head .ben-rail-title {
  padding: 0;
  margin-bottom: 0.65rem;
}
.ben-rail-more {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 0.65rem;
}
.ben-rail-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 1rem 4px;
  scroll-snap-type: x mandatory;
}
.ben-rail-scroll::-webkit-scrollbar {
  display: none;
}
.ben-offer {
  flex: 0 0 148px;
  width: 148px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  padding: 0;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  scroll-snap-align: start;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.ben-offer-brand {
  height: 88px;
  display: grid;
  place-items: center;
  background: #fff;
  overflow: hidden;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 800;
}
.ben-offer-brand img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ben-offer-body {
  padding: 10px 10px 12px;
  display: grid;
  gap: 4px;
  background: #fff;
}
.ben-offer-body strong {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--brand-primary, #0f766e);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ben-offer-body p {
  margin: 0;
  font-size: 0.72rem;
  color: #334155;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ben-offer-body small {
  font-size: 0.7rem;
  color: #64748b;
}
.ben-cat-tile {
  flex: 0 0 104px;
  width: 104px;
  height: 104px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font: inherit;
  padding: 8px;
  scroll-snap-align: start;
}
.ben-cat-emoji {
  font-size: 2rem;
  line-height: 1;
}
.ben-cat-name {
  font-size: 0.68rem;
  font-weight: 700;
  color: #334155;
  text-align: center;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ben-type-panel {
  padding: 0.5rem 0 1.5rem;
  background: #fff;
}
.ben-type-title {
  margin: 0 0 0.35rem;
  padding: 0.35rem 0 0.65rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.ben-type-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: #fff;
}
.ben-type-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #e8edf2;
  padding: 14px 0;
}
.ben-type-list li:last-child .ben-type-row {
  border-bottom: 0;
}
.ben-type-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 999px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, #fff);
  color: var(--brand-primary, #0f766e);
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 22%, #e2e8f0);
}
.ben-type-avatar.placeholder {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, #fff);
  color: var(--brand-primary, #0f766e);
}
.ben-type-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ben-type-avatar svg {
  display: block;
}
.ben-type-copy {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}
.ben-type-brand {
  font-size: 0.98rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}
.ben-type-offer {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--brand-primary, #0f766e);
  line-height: 1.3;
}
.ben-type-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ben-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.ben-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.ben-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
}
.ben-off {
  color: #b45309;
}
.ben-search-plain {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  background: #fff;
  box-sizing: border-box;
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
  background: linear-gradient(
    135deg,
    var(--brand-primary, #0f766e),
    color-mix(in srgb, var(--brand-primary, #0f766e) 65%, #0f172a)
  );
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
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
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
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 28%, #e2e8f0);
  background: #fff;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--brand-primary, #0f766e);
  text-decoration: none;
}
.fav-btn {
  border: none;
  font-size: 1.1rem;
}
.add-btn {
  color: var(--brand-primary, #0f766e);
}
.dir-btn {
  color: var(--brand-primary, #0f766e);
}
.ben-err {
  color: #b91c1c;
}
.ben-ok {
  color: var(--brand-primary, #0f766e);
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
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 0.75rem;
  padding: 0.75rem;
  font-weight: 700;
}
.ben-primary.ghost {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, #fff);
  color: var(--brand-primary, #0f766e);
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
  color: var(--brand-primary, #0f766e);
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
  color: var(--brand-primary, #0f766e);
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
