<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'

const tab = ref('bandeja')
const loading = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ users: [], statuses: [], sources: [], closeReasons: [] })
const categories = ref([])
const articles = ref([])
const items = ref([])
const mapItems = ref([])
const filters = ref({ source: '', status: '', categoryId: '', from: '', to: '' })
const selected = ref(null)
const editingCatId = ref('')

const catForm = ref({
  name: '',
  colorMap: '#dc2626',
  defaultForAlarm: false,
  requireGps: false,
  receptorUserIds: [],
})
const artForm = ref({ label: '', unit: 'u', categoryId: '' })

const mapEl = ref(null)
let map = null
let markersLayer = null

const statusLabel = {
  abierta: 'Abierta',
  en_curso: 'En curso',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
}

async function ensureCaps() {
  try {
    await api.post('/admin/pedidos/ensure-menu')
  } catch {
    /* ignore */
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/pedidos/meta')
  meta.value = data
}

async function loadCategories() {
  const { data } = await api.get('/admin/pedidos/categories')
  categories.value = data.items || []
}

async function loadArticles() {
  const { data } = await api.get('/admin/pedidos/articles')
  articles.value = data.items || []
}

function queryParams() {
  const p = {}
  if (filters.value.source) p.source = filters.value.source
  if (filters.value.status) p.status = filters.value.status
  if (filters.value.categoryId) p.categoryId = filters.value.categoryId
  if (filters.value.from) p.from = filters.value.from
  if (filters.value.to) {
    // fin de día inclusive
    const d = new Date(filters.value.to)
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      p.to = d.toISOString()
    } else {
      p.to = filters.value.to
    }
  }
  return p
}

function applyFilters() {
  if (tab.value === 'mapa') return loadMap()
  return loadBandeja()
}

function userLabel(id) {
  const u = (meta.value.users || []).find((x) => x.id === id)
  return u?.label || id
}

function startEditCat(c) {
  editingCatId.value = c.id
  catForm.value = {
    name: c.name,
    colorMap: c.colorMap || '#dc2626',
    defaultForAlarm: !!c.defaultForAlarm,
    requireGps: !!c.requireGps,
    receptorUserIds: [...(c.receptorUserIds || [])],
  }
}

function resetCatForm() {
  editingCatId.value = ''
  catForm.value = {
    name: '',
    colorMap: '#dc2626',
    defaultForAlarm: false,
    requireGps: false,
    receptorUserIds: [],
  }
}

async function loadBandeja() {
  loading.value = true
  err.value = ''
  try {
    const { data } = await api.get('/admin/pedidos', { params: queryParams() })
    items.value = data.items || []
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function loadMap() {
  loading.value = true
  err.value = ''
  try {
    const { data } = await api.get('/admin/pedidos/map', { params: queryParams() })
    mapItems.value = data.items || []
    await nextTick()
    renderMap()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
    markersLayer = null
  }
}

function renderMap() {
  if (!mapEl.value) return
  if (!map) {
    map = L.map(mapEl.value, { scrollWheelZoom: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    markersLayer = L.layerGroup().addTo(map)
  }
  markersLayer.clearLayers()
  const bounds = []
  for (const it of mapItems.value) {
    if (!it.geo) continue
    const color = it.categoryColor || '#dc2626'
    const m = L.circleMarker([it.geo.lat, it.geo.lng], {
      radius: 10,
      color: '#fff',
      weight: 2,
      fillColor: color,
      fillOpacity: 0.95,
    })
    m.bindPopup(
      `<strong>#${it.number}</strong> · ${it.categoryName || ''}<br/>${it.status}<br/>${(it.note || '').slice(0, 80)}`,
    )
    m.on('click', () => {
      selected.value = it
    })
    m.addTo(markersLayer)
    bounds.push([it.geo.lat, it.geo.lng])
  }
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  } else {
    map.setView([-34.6, -58.38], 11)
  }
  setTimeout(() => map?.invalidateSize(), 80)
}

async function transition(id, status, closeReason) {
  err.value = ''
  ok.value = ''
  try {
    const body = { status }
    if (closeReason) body.closeReason = closeReason
    if (status === 'en_curso') body.reason = 'tomado por operador'
    const { data } = await api.patch(`/admin/pedidos/${id}`, body)
    ok.value = `Pedido #${data.item.number} → ${data.item.status}`
    selected.value = data.item
    if (tab.value === 'mapa') await loadMap()
    else await loadBandeja()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function createCategory() {
  try {
    const payload = {
      name: catForm.value.name,
      colorMap: catForm.value.colorMap,
      defaultForAlarm: catForm.value.defaultForAlarm,
      requireGps: catForm.value.requireGps,
      receptorUserIds: catForm.value.receptorUserIds || [],
    }
    if (editingCatId.value) {
      await api.patch(`/admin/pedidos/categories/${editingCatId.value}`, payload)
      ok.value = 'Categoría actualizada'
    } else {
      await api.post('/admin/pedidos/categories', payload)
      ok.value = 'Categoría creada'
    }
    resetCatForm()
    await loadCategories()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function createArticle() {
  try {
    await api.post('/admin/pedidos/articles', { ...artForm.value })
    artForm.value = { label: '', unit: 'u', categoryId: '' }
    await loadArticles()
    ok.value = 'Artículo creado'
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

watch(tab, async (t) => {
  destroyMap()
  selected.value = null
  if (t === 'bandeja') await loadBandeja()
  if (t === 'mapa') await loadMap()
  if (t === 'cats') await loadCategories()
  if (t === 'arts') {
    await loadCategories()
    await loadArticles()
  }
})

onMounted(async () => {
  await ensureCaps()
  await loadMeta()
  await loadCategories()
  await loadBandeja()
})

onBeforeUnmount(destroyMap)

const mapEmpty = computed(() => !loading.value && mapItems.value.length === 0)
</script>

<template>
  <div class="wrap">
    <header class="head">
      <div>
        <h1>Alarmas</h1>
        <p class="muted">Bandeja unificada · canal alarma · mapa por categoría</p>
      </div>
      <button type="button" class="btn ghost" @click="ensureCaps">Activar caps / menú</button>
    </header>

    <nav class="tabs">
      <button type="button" :class="{ on: tab === 'bandeja' }" @click="tab = 'bandeja'">Bandeja</button>
      <button type="button" :class="{ on: tab === 'mapa' }" @click="tab = 'mapa'">Mapa</button>
      <button type="button" :class="{ on: tab === 'cats' }" @click="tab = 'cats'">Categorías</button>
      <button type="button" :class="{ on: tab === 'arts' }" @click="tab = 'arts'">Artículos</button>
    </nav>

    <p v-if="err" class="err">{{ err }}</p>
    <p v-if="ok" class="ok">{{ ok }}</p>

    <div v-if="tab === 'bandeja' || tab === 'mapa'" class="filters">
      <select v-model="filters.source" title="Fuente">
        <option value="">Fuente (todas)</option>
        <option value="alarm">Alarma / reporte</option>
        <option value="catalog">Catálogo</option>
      </select>
      <select v-model="filters.categoryId" title="Categoría">
        <option value="">Categoría (todas)</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filters.status" title="Estado">
        <option value="">Estado</option>
        <option v-for="s in meta.statuses || []" :key="s" :value="s">{{ statusLabel[s] || s }}</option>
      </select>
      <label class="date-lab">
        Desde
        <input v-model="filters.from" type="date" />
      </label>
      <label class="date-lab">
        Hasta
        <input v-model="filters.to" type="date" />
      </label>
      <button type="button" class="btn" @click="applyFilters">Filtrar</button>
    </div>

    <template v-if="tab === 'bandeja'">
      <p v-if="loading" class="muted">Cargando…</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Fuente</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Geo</th>
            <th>Nota</th>
            <th>Foto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in items" :key="p.id">
            <td>{{ p.number }}</td>
            <td>{{ p.source }}</td>
            <td>
              <span class="dot" :style="{ background: p.categoryColor }" />
              {{ p.categoryName }}
            </td>
            <td>{{ statusLabel[p.status] || p.status }}</td>
            <td>{{ p.hasGeo || p.geo ? 'sí' : '—' }}</td>
            <td class="clip">{{ p.note }}</td>
            <td>
              <a v-if="p.attachments?.[0]" :href="p.attachments[0]" target="_blank" rel="noopener">foto</a>
              <span v-else>—</span>
            </td>
            <td class="actions">
              <button
                v-if="p.status === 'abierta'"
                type="button"
                class="btn sm"
                @click="transition(p.id, 'en_curso')"
              >
                Tomar
              </button>
              <button
                v-if="p.status === 'abierta' || p.status === 'en_curso'"
                type="button"
                class="btn sm"
                @click="transition(p.id, 'cerrada', 'resuelto')"
              >
                Cerrar
              </button>
              <button
                v-if="p.status === 'abierta' || p.status === 'en_curso'"
                type="button"
                class="btn sm ghost"
                @click="transition(p.id, 'cerrada', 'falsa_alarma')"
              >
                Falsa
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !items.length" class="muted">Sin pedidos.</p>
    </template>

    <template v-if="tab === 'mapa'">
      <div ref="mapEl" class="map" />
      <p v-if="mapEmpty" class="muted map-empty">
        No hay pedidos con GPS en este filtro. Los sin ubicación solo aparecen en la bandeja.
      </p>
      <aside v-if="selected" class="side">
        <h3>#{{ selected.number }} · {{ selected.categoryName }}</h3>
        <p>{{ statusLabel[selected.status] || selected.status }} · {{ selected.source }}</p>
        <p v-if="selected.note">{{ selected.note }}</p>
        <p v-if="selected.attachments?.[0]">
          <a :href="selected.attachments[0]" target="_blank" rel="noopener">Ver foto</a>
        </p>
        <p v-if="selected.geo" class="muted">
          {{ selected.geo.lat.toFixed(5) }}, {{ selected.geo.lng.toFixed(5) }}
        </p>
        <div class="actions">
          <button
            v-if="selected.status === 'abierta'"
            type="button"
            class="btn sm"
            @click="transition(selected.id, 'en_curso')"
          >
            Tomar
          </button>
          <button
            v-if="selected.status === 'abierta' || selected.status === 'en_curso'"
            type="button"
            class="btn sm"
            @click="transition(selected.id, 'cerrada', 'resuelto')"
          >
            Cerrar
          </button>
          <button
            v-if="selected.status === 'abierta' || selected.status === 'en_curso'"
            type="button"
            class="btn sm ghost"
            @click="transition(selected.id, 'cerrada', 'falsa_alarma')"
          >
            Falsa alarma
          </button>
        </div>
      </aside>
    </template>

    <template v-if="tab === 'cats'">
      <form class="form cat-form" @submit.prevent="createCategory">
        <input v-model="catForm.name" placeholder="Nombre" required />
        <input v-model="catForm.colorMap" type="color" title="Color mapa" />
        <label><input v-model="catForm.defaultForAlarm" type="checkbox" /> Default alarma</label>
        <label><input v-model="catForm.requireGps" type="checkbox" /> Exige GPS</label>
        <label class="receptors">
          Quién recibe aviso (push + email)
          <select v-model="catForm.receptorUserIds" multiple size="6" class="multi">
            <option v-for="u in meta.users || []" :key="u.id" :value="u.id">{{ u.label }}</option>
          </select>
          <span class="hint">Ctrl/Cmd + clic para varios</span>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn">
            {{ editingCatId ? 'Guardar categoría' : 'Crear categoría' }}
          </button>
          <button v-if="editingCatId" type="button" class="btn ghost" @click="resetCatForm">
            Cancelar
          </button>
        </div>
      </form>
      <ul class="list">
        <li v-for="c in categories" :key="c.id">
          <span class="dot" :style="{ background: c.colorMap }" />
          <strong>{{ c.name }}</strong>
          <span v-if="c.defaultForAlarm" class="pill">alarma</span>
          <span v-if="!c.active" class="pill">inactiva</span>
          <p class="muted receptors-line">
            Receptores:
            <template v-if="c.receptorUserIds?.length">
              {{ c.receptorUserIds.map(userLabel).join(', ') }}
            </template>
            <template v-else>—</template>
          </p>
          <button type="button" class="btn sm ghost" @click="startEditCat(c)">Editar</button>
        </li>
      </ul>
    </template>

    <template v-if="tab === 'arts'">
      <form class="form" @submit.prevent="createArticle">
        <input v-model="artForm.label" placeholder="Artículo" required />
        <input v-model="artForm.unit" placeholder="Unidad" style="width: 5rem" />
        <select v-model="artForm.categoryId">
          <option value="">Categoría</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button type="submit" class="btn">Crear</button>
      </form>
      <ul class="list">
        <li v-for="a in articles" :key="a.id">
          <strong>{{ a.label }}</strong> · {{ a.unit }}
          <span v-if="!a.active" class="pill">inactivo</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.wrap {
  padding: 1.25rem 1.5rem 2.5rem;
  max-width: none;
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.head h1 {
  margin: 0;
  font-size: 1.4rem;
}
.muted {
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.tabs button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}
.tabs button.on {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  align-items: flex-end;
}
.filters select,
.filters input[type='date'] {
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
}
.date-lab {
  display: grid;
  gap: 0.15rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.cat-form {
  flex-direction: column;
  align-items: stretch;
  max-width: 28rem;
}
.receptors {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.receptors .multi {
  width: 100%;
  min-height: 8rem;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 0.35rem;
}
.hint {
  font-weight: 400;
  color: var(--ink-faint);
  font-size: 0.75rem;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
}
.receptors-line {
  margin: 0.25rem 0;
  width: 100%;
}
.btn {
  background: var(--brand-primary);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  font-weight: 600;
}
.btn.ghost {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line-2);
}
.btn.sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: var(--panel);
}
.table th,
.table td {
  border-bottom: 1px solid var(--line);
  padding: 0.55rem 0.4rem;
  text-align: left;
  vertical-align: top;
}
.clip {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  margin-right: 0.25rem;
  vertical-align: middle;
}
.map {
  height: 420px;
  border-radius: 12px;
  border: 1px solid var(--line);
  z-index: 0;
}
.map-empty {
  margin-top: 0.5rem;
}
.side {
  margin-top: 0.75rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.85rem;
}
.side h3 {
  margin: 0 0 0.35rem;
}
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}
.form input,
.form select {
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}
.list li {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
}
.pill {
  font-size: 0.7rem;
  background: var(--line);
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  margin-left: 0.35rem;
}
.err {
  color: var(--bad);
}
.ok {
  color: var(--ok);
  font-weight: 600;
}
</style>
