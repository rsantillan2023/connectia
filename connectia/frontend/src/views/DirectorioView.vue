<template>
  <div class="dir">
    <header class="dir-hero">
      <div>
        <p class="dir-kicker">Encontrá y contactá al instante</p>
        <h1>Directorio</h1>
      </div>
      <div class="dir-view-toggle" role="group" aria-label="Vista">
        <button type="button" :class="{ on: view === 'list' }" @click="view = 'list'">Lista</button>
        <button type="button" :class="{ on: view === 'map' }" @click="openMap">Mapa</button>
      </div>
    </header>

    <div class="dir-search-wrap">
      <input
        v-model="q"
        type="search"
        class="dir-search"
        placeholder="Buscar por nombre, interno, área, sede…"
        autocomplete="off"
        @input="onSearchInput"
      />
      <button v-if="q" type="button" class="dir-clear" aria-label="Limpiar" @click="clearSearch">×</button>
    </div>

    <div class="dir-chips" role="tablist">
      <button
        v-for="chip in chips"
        :key="chip.id"
        type="button"
        class="chip"
        :class="{ on: activeChip === chip.id }"
        role="tab"
        :aria-selected="activeChip === chip.id"
        @click="setChip(chip.id)"
      >
        {{ chip.label }}
        <span v-if="chip.count != null" class="chip-n">{{ chip.count }}</span>
      </button>
    </div>

    <!-- Emergencias siempre a mano -->
    <section v-if="emergencias.length && activeChip !== 'favoritos'" class="dir-emer">
      <h2>Urgente</h2>
      <div class="emer-row">
        <a
          v-for="e in emergencias"
          :key="e.id"
          class="emer-card"
          :href="e.actions.call || e.actions.whatsapp || '#'"
          @click.prevent="openDetail(e)"
        >
          <div class="emer-thumb" :style="avatarBg(e)">
            <img v-if="showImage(e)" :src="e.imageUrl" alt="" @error="markBroken(e.id)" />
            <span v-else>{{ initials(e.nombre) }}</span>
          </div>
          <strong>{{ e.nombre }}</strong>
          <span>{{ e.telefono || e.interno || 'Ver ficha' }}</span>
        </a>
      </div>
    </section>

    <p v-if="error" class="dir-err">{{ error }}</p>
    <p v-if="loading" class="dir-muted">Buscando…</p>

    <template v-if="view === 'list' && !loading">
      <p v-if="!items.length" class="dir-empty">
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyHint }}</span>
      </p>

      <ul v-else class="dir-list">
        <li v-for="item in items" :key="item.id" class="dir-card" @click="openDetail(item)">
          <div class="dir-avatar" :style="avatarBg(item)" aria-hidden="true">
            <img v-if="showImage(item)" :src="item.imageUrl" alt="" @error="markBroken(item.id)" />
            <span v-else>{{ initials(item.nombre) }}</span>
          </div>
          <div class="dir-main">
            <div class="dir-title-row">
              <strong>{{ item.nombre }}</strong>
              <button
                type="button"
                class="fav-btn"
                :aria-pressed="item.favorite"
                :title="item.favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
                @click.stop="toggleFav(item)"
              >
                {{ item.favorite ? '★' : '☆' }}
              </button>
            </div>
            <p class="dir-meta">
              <span class="pill">{{ item.tipoLabel }}</span>
              <span v-if="item.categoria">{{ item.categoria }}</span>
              <span v-if="item.distanceKm != null">· {{ formatKm(item.distanceKm) }}</span>
            </p>
            <p v-if="item.descripcion" class="dir-desc">{{ item.descripcion }}</p>
            <p class="dir-contact-line">
              <span v-if="item.interno">Int. {{ item.interno }}</span>
              <span v-if="item.telefono">{{ item.telefono }}</span>
              <span v-if="item.horario">· {{ item.horario }}</span>
            </p>
          </div>
          <div class="dir-quick" @click.stop>
            <a v-if="item.actions.call" class="q-btn call" :href="item.actions.call" title="Llamar">☎</a>
            <a v-if="item.actions.whatsapp" class="q-btn wa" :href="item.actions.whatsapp" target="_blank" rel="noopener" title="WhatsApp">WA</a>
            <a v-if="item.actions.email" class="q-btn mail" :href="item.actions.email" title="Email">✉</a>
            <a v-if="item.actions.maps" class="q-btn map" :href="item.actions.maps" target="_blank" rel="noopener" title="Cómo llegar">↗</a>
          </div>
        </li>
      </ul>
    </template>

    <div v-show="view === 'map'" class="dir-map-panel">
      <p v-if="!mapItems.length && !loading" class="dir-muted">No hay sedes con ubicación cargada.</p>
      <div ref="mapEl" class="dir-map" />
      <p class="dir-map-hint">Tocá un marcador para abrir la ficha. No hace falta compartir tu ubicación.</p>
    </div>

    <!-- Detalle -->
    <Teleport to="body">
      <div v-if="detail" class="sheet-root" @keydown.esc="detail = null">
        <button type="button" class="sheet-backdrop" aria-label="Cerrar" @click="detail = null" />
        <aside class="sheet" role="dialog" aria-modal="true">
          <header class="sheet-head">
            <div class="dir-avatar lg" :style="avatarBg(detail)">
              <img v-if="showImage(detail)" :src="detail.imageUrl" alt="" @error="markBroken(detail.id)" />
              <span v-else>{{ initials(detail.nombre) }}</span>
            </div>
            <div>
              <p class="pill">{{ detail.tipoLabel }} · {{ detail.categoria }}</p>
              <h2>{{ detail.nombre }}</h2>
              <p v-if="detail.descripcion" class="sheet-desc">{{ detail.descripcion }}</p>
            </div>
          </header>

          <div class="sheet-actions">
            <a v-if="detail.actions.call" class="act primary" :href="detail.actions.call">Llamar</a>
            <a
              v-if="detail.actions.whatsapp"
              class="act"
              :href="detail.actions.whatsapp"
              target="_blank"
              rel="noopener"
            >WhatsApp</a>
            <a v-if="detail.actions.email" class="act" :href="detail.actions.email">Email</a>
            <a
              v-if="detail.actions.maps"
              class="act"
              :href="detail.actions.maps"
              target="_blank"
              rel="noopener"
            >Cómo llegar</a>
            <button type="button" class="act" @click="copyField(detail.actions.copyPhone || detail.interno)">
              Copiar teléfono
            </button>
            <button type="button" class="act" @click="toggleFav(detail)">
              {{ detail.favorite ? 'Quitar favorito' : 'Favorito' }}
            </button>
          </div>

          <dl class="sheet-dl">
            <div v-if="detail.interno"><dt>Interno</dt><dd>{{ detail.interno }}</dd></div>
            <div v-if="detail.telefono"><dt>Teléfono</dt><dd>{{ detail.telefono }}</dd></div>
            <div v-if="detail.email"><dt>Email</dt><dd>{{ detail.email }}</dd></div>
            <div v-if="detail.direccion || detail.ciudad">
              <dt>Dirección</dt>
              <dd>{{ [detail.direccion, detail.ciudad].filter(Boolean).join(', ') }}</dd>
            </div>
            <div v-if="detail.horario"><dt>Horario</dt><dd>{{ detail.horario }}</dd></div>
          </dl>

          <p v-if="toast" class="toast">{{ toast }}</p>
          <button type="button" class="sheet-close" @click="detail = null">Cerrar</button>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { resolveCssColor } from '../utils/applyBrandingCssVars'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const router = useRouter()

const q = ref('')
const activeChip = ref('todos')
const view = ref('list')
const items = ref([])
const emergencias = ref([])
const tipos = ref([])
const loading = ref(false)
const error = ref('')
const detail = ref(null)
const toast = ref('')
const mapEl = ref(null)
const mapItems = ref([])
const brokenImages = ref(new Set())

let map = null
let markersLayer = null
let searchTimer = null
let toastTimer = null

function showImage(item) {
  return Boolean(item?.imageUrl) && !brokenImages.value.has(item.id)
}

function markBroken(id) {
  const next = new Set(brokenImages.value)
  next.add(id)
  brokenImages.value = next
}

function avatarBg(item) {
  if (showImage(item)) return { background: '#e2e8f0' }
  return { background: item?.color || 'var(--brand-primary, #0f766e)' }
}

const chips = computed(() => {
  const base = [
    { id: 'todos', label: 'Todos' },
    { id: 'favoritos', label: 'Favoritos' },
  ]
  const fromTipos = (tipos.value || []).map((t) => ({ id: t.id, label: t.label }))
  return [...base, ...fromTipos]
})

const emptyTitle = computed(() => {
  if (activeChip.value === 'favoritos') return 'Todavía no tenés favoritos'
  if (q.value) return 'Sin resultados'
  return 'Directorio vacío'
})

const emptyHint = computed(() => {
  if (activeChip.value === 'favoritos') return 'Tocá ★ en un contacto para guardarlo acá.'
  if (q.value) return 'Probá con el interno, el apellido o el nombre del área.'
  return 'Cuando RRHH cargue contactos y sedes, van a aparecer acá.'
})

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatKm(km) {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function setChip(id) {
  activeChip.value = id
  load()
}

function clearSearch() {
  q.value = ''
  load()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 280)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { pageSize: 60 }
    if (q.value.trim().length >= 2) params.q = q.value.trim()
    if (activeChip.value === 'favoritos') params.favoritos = '1'
    else if (activeChip.value !== 'todos') params.tipo = activeChip.value

    const { data } = await api.get('/directory', { params })
    items.value = data.items || []
    emergencias.value = data.emergencias || []
    tipos.value = data.tipos || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el directorio'
  } finally {
    loading.value = false
  }
}

async function openDetail(item) {
  try {
    const { data } = await api.get(`/directory/${item.id}`)
    detail.value = data.item || item
  } catch {
    detail.value = item
  }
}

async function toggleFav(item) {
  try {
    if (item.favorite) {
      await api.delete(`/directory/${item.id}/favorite`)
      item.favorite = false
      showToast('Quitado de favoritos')
    } else {
      await api.post(`/directory/${item.id}/favorite`)
      item.favorite = true
      showToast('Guardado en favoritos')
    }
    if (detail.value?.id === item.id) detail.value.favorite = item.favorite
    if (activeChip.value === 'favoritos') await load()
  } catch (e) {
    showToast(e.response?.data?.error || 'No se pudo actualizar favorito')
  }
}

function copyField(value) {
  const v = String(value || '').trim()
  if (!v) {
    showToast('No hay dato para copiar')
    return
  }
  navigator.clipboard?.writeText(v).then(
    () => showToast('Copiado'),
    () => showToast(v),
  )
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

async function openMap() {
  view.value = 'map'
  await loadMap()
  await nextTick()
  ensureMap()
}

async function loadMap() {
  try {
    const { data } = await api.get('/directory/map')
    mapItems.value = data.items || []
  } catch {
    mapItems.value = items.value.filter((i) => i.hasLocation)
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
      fillColor: it.color || brand,
      fillOpacity: 0.95,
    })
    m.bindPopup(`<strong>${escapeHtml(it.nombre)}</strong><br/>${escapeHtml(it.categoria || '')}`)
    m.on('click', () => openDetail(it))
    markersLayer.addLayer(m)
    bounds.push([it.lat, it.lng])
  }
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })
  } else {
    map.setView([-34.6037, -58.3816], 11)
  }
  setTimeout(() => map?.invalidateSize(), 80)
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

watch(view, async (v) => {
  if (v === 'map') {
    await loadMap()
    await nextTick()
    ensureMap()
  }
})

onMounted(async () => {
  if (route.query.q) q.value = String(route.query.q)
  if (route.query.tipo) activeChip.value = String(route.query.tipo)
  await load()
  if (route.query.id) {
    try {
      const { data } = await api.get(`/directory/${route.query.id}`)
      if (data.item) detail.value = data.item
    } catch {
      /* ignore */
    }
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearTimeout(toastTimer)
  if (map) {
    map.remove()
    map = null
  }
})

watch([q, activeChip], () => {
  router.replace({
    query: {
      ...(q.value ? { q: q.value } : {}),
      ...(activeChip.value !== 'todos' ? { tipo: activeChip.value } : {}),
    },
  }).catch(() => {})
})
</script>

<style scoped>
.dir {
  padding: 12px 16px 40px;
  max-width: 720px;
  margin: 0 auto;
}
.dir-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.dir-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cx-muted, #64748b);
}
.dir-hero h1 {
  margin: 2px 0 0;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.dir-view-toggle {
  display: flex;
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 999px;
  overflow: hidden;
  background: var(--cx-surface, #fff);
}
.dir-view-toggle button {
  border: 0;
  background: transparent;
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
  color: var(--cx-muted, #64748b);
}
.dir-view-toggle button.on {
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.dir-search-wrap {
  position: relative;
  margin-bottom: 10px;
}
.dir-search {
  width: 100%;
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  padding: 13px 40px 13px 14px;
  font: inherit;
  font-size: 1rem;
  background: var(--cx-surface, #fff);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.dir-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: #e2e8f0;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}
.dir-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 12px;
  scrollbar-width: none;
}
.dir-chips::-webkit-scrollbar {
  display: none;
}
.chip {
  flex: 0 0 auto;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
  color: #334155;
}
.chip.on {
  background: var(--brand-primary, #0f766e);
  border-color: var(--brand-primary, #0f766e);
  color: #fff;
}
.chip-n {
  margin-left: 4px;
  opacity: 0.75;
}
.dir-emer {
  margin-bottom: 14px;
}
.dir-emer h2 {
  margin: 0 0 8px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #b91c1c;
}
.emer-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.emer-card {
  flex: 0 0 auto;
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  text-decoration: none;
  color: inherit;
  display: grid;
  gap: 4px;
}
.emer-thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 0.75rem;
  margin-bottom: 2px;
}
.emer-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.emer-card strong {
  display: block;
  font-size: 0.88rem;
}
.emer-card span {
  font-size: 0.78rem;
  color: #991b1b;
}
.dir-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dir-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 12px;
  border-radius: 16px;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  cursor: pointer;
}
.dir-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.85rem;
  overflow: hidden;
  flex-shrink: 0;
}
.dir-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dir-avatar.lg {
  width: 56px;
  height: 56px;
  font-size: 1rem;
  border-radius: 16px;
}
.dir-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.dir-title-row strong {
  font-size: 0.98rem;
}
.fav-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  color: #ca8a04;
  line-height: 1;
  padding: 0;
}
.dir-meta {
  margin: 3px 0 0;
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.pill {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #f1f5f9;
  font-weight: 650;
  font-size: 0.7rem;
}
.dir-desc {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dir-contact-line {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #0f172a;
  font-weight: 600;
}
.dir-quick {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.q-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 800;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
}
.q-btn.call {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}
.q-btn.wa {
  background: #f0fdf4;
  color: #15803d;
}
.dir-empty {
  text-align: center;
  padding: 36px 16px;
  color: var(--cx-muted, #64748b);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dir-empty strong {
  color: #0f172a;
  font-size: 1.05rem;
}
.dir-err {
  color: #b91c1c;
}
.dir-muted {
  color: var(--cx-muted, #64748b);
  font-size: 0.9rem;
}
.dir-map-panel {
  margin-top: 8px;
}
.dir-map {
  height: min(52vh, 420px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--cx-border, #e2e8f0);
  z-index: 1;
}
.dir-map-hint {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: var(--cx-muted, #64748b);
}
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.4);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(520px, 100%);
  max-height: 88vh;
  overflow: auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 18px 16px 28px;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
}
.sheet-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.sheet-head h2 {
  margin: 4px 0 0;
  font-size: 1.2rem;
}
.sheet-desc {
  margin: 6px 0 0;
  color: #475569;
  font-size: 0.9rem;
}
.sheet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.act {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  color: #0f172a;
  cursor: pointer;
}
.act.primary {
  background: var(--brand-primary, #0f766e);
  border-color: var(--brand-primary, #0f766e);
  color: #fff;
}
.sheet-dl {
  margin: 0;
  display: grid;
  gap: 10px;
}
.sheet-dl dt {
  font-size: 0.72rem;
  color: #64748b;
}
.sheet-dl dd {
  margin: 2px 0 0;
  font-weight: 650;
}
.sheet-close {
  width: 100%;
  margin-top: 16px;
  border: 0;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  background: #f1f5f9;
  cursor: pointer;
}
.toast {
  margin: 10px 0 0;
  padding: 8px 10px;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 650;
}
</style>
