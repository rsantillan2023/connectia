<template>
  <section class="sp">
    <header class="sp-hero">
      <h1>Espacios</h1>
      <p class="sp-lead">Reservá salas, cocheras, puestos y otros activos.</p>
      <div class="sp-seg" role="tablist" aria-label="Vista">
        <button
          type="button"
          role="tab"
          class="sp-seg__btn"
          :class="{ on: mode === 'book' }"
          :aria-selected="mode === 'book'"
          @click="mode = 'book'"
        >
          Buscar y reservar
        </button>
        <button
          type="button"
          role="tab"
          class="sp-seg__btn"
          :class="{ on: mode === 'mine' }"
          :aria-selected="mode === 'mine'"
          @click="mode = 'mine'"
        >
          Mis reservas
        </button>
      </div>
    </header>

    <div class="sp-body">
      <p v-if="error" class="sp-err" role="alert">{{ error }}</p>
      <p v-if="okMsg" class="sp-ok">{{ okMsg }}</p>

      <template v-if="mode === 'book'">
        <section class="sp-block sp-filters" aria-label="Filtros">
          <div class="sp-site-block">
            <h2 id="sp-when" class="sp-block__title">Cuándo</h2>
            <div class="sp-when__grid">
              <label>
                Desde
                <input
                  v-model="startLocal"
                  type="datetime-local"
                  aria-labelledby="sp-when"
                  @change="onWhenChange"
                />
              </label>
              <label>
                Hasta
                <input v-model="endLocal" type="datetime-local" @change="onWhenChange" />
              </label>
            </div>
          </div>

          <div class="sp-site-block">
            <h2 id="sp-site" class="sp-block__title">Sucursal</h2>
            <select
              v-model="siteId"
              class="sp-site-select"
              aria-labelledby="sp-site"
              @change="onSiteChange"
            >
              <option value="">Todas las sucursales</option>
              <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>

          <details v-if="filterableAttrs.length" class="sp-attrs-collapse">
            <summary>
              Características
              <em v-if="selectedAttrs.length" class="sp-attrs-collapse__badge">{{ selectedAttrs.length }}</em>
            </summary>
            <div class="sp-attrs__row" role="group" aria-label="Características">
              <button
                v-for="a in filterableAttrs"
                :key="a.key"
                type="button"
                class="sp-chip"
                :class="{ on: selectedAttrs.includes(a.key) }"
                :title="a.label"
                @click="toggleAttr(a.key)"
              >
                <span class="sp-chip-ico" aria-hidden="true">{{ attrIconMeta(a.key).glyph }}</span>
                {{ a.label }}
              </button>
            </div>
          </details>
        </section>

        <section class="sp-block" aria-labelledby="sp-what">
          <h2 id="sp-what" class="sp-block__title">Qué querés reservar</h2>
          <p v-if="!busy && !visibleTypes.length" class="sp-muted">
            No hay tipos con activos para esa sucursal
            {{ selectedAttrs.length ? ' y características' : '' }}.
          </p>
          <div v-else class="sp-types" role="list">
            <button
              v-for="t in visibleTypes"
              :key="t.id"
              type="button"
              class="sp-type"
              :class="{ on: String(typeId) === String(t.id) }"
              @click="selectType(t.id)"
            >
              <span class="sp-type__ico" aria-hidden="true">
                <SpaceTypeIcon :name="t.icon || 'box'" :size="22" />
              </span>
              <span class="sp-type__label">{{ t.label }}</span>
            </button>
          </div>
        </section>

        <section class="sp-block" aria-labelledby="sp-avail">
          <h2 id="sp-avail" class="sp-block__title">{{ availTitle }}</h2>

          <p v-if="busy" class="sp-muted">Cargando…</p>
          <FeedEmptyState
            v-else-if="loadIssue"
            :kind="loadIssue.kind"
            :title="loadIssue.title"
            :text="loadIssue.text"
            @retry="loadCatalog"
          />
          <template v-else>
            <div class="sp-grid">
              <article v-for="r in resources" :key="r.id" class="sp-offer">
                <div class="sp-offer-media" :class="{ 'no-img': !r.imageUrl }">
                  <span class="sp-offer-ph" aria-hidden="true">
                    <span class="sp-offer-avatar">
                      <SpaceTypeIcon :name="offerIcon(r)" :size="30" />
                    </span>
                  </span>
                  <img
                    v-if="r.imageUrl"
                    :src="mediaUrl(r.imageUrl)"
                    alt=""
                    loading="lazy"
                    @error="onOfferImgErr"
                  />
                </div>
                <div class="sp-offer-body">
                  <div class="sp-offer-title">
                    <span class="sp-offer-type" :title="r.typeLabel || r.kindLabel" aria-hidden="true">
                      <SpaceTypeIcon :name="r.typeIcon || 'box'" :size="14" />
                    </span>
                    <strong>{{ r.nombre }}</strong>
                  </div>
                  <p v-if="r.descripcion" class="sp-offer-desc">{{ excerpt(r.descripcion, 72) }}</p>
                  <p>
                    {{ r.siteNombre || 'Sin sucursal' }}
                    <template v-if="r.occupancyShort"> · {{ r.occupancyShort }}</template>
                    <template v-else-if="r.capacity"> · {{ r.capacity }} pers.</template>
                    <template v-else-if="r.effectiveCupo > 1"> · cupo {{ r.effectiveCupo }}</template>
                    <template v-if="r.zone"> · {{ r.zone }}</template>
                  </p>
                  <p
                    v-if="r.freeUnits != null && r.unitCount > 1"
                    class="sp-offer-free"
                    :class="{ none: r.freeUnits <= 0 }"
                  >
                    {{
                      r.freeUnits <= 0
                        ? 'Sin disponibilidad'
                        : `Quedan ${r.freeUnits} de ${r.unitCount}`
                    }}
                  </p>
                  <p
                    v-else-if="r.available === false && !(r.unitCount > 1)"
                    class="sp-offer-free none"
                  >
                    Ya reservado
                  </p>
                  <div v-if="r.attributes?.length" class="sp-attr-icons" aria-label="Características">
                    <span
                      v-for="a in r.attributes"
                      :key="a.key"
                      class="sp-attr-ico"
                      :class="{ texty: attrIconMeta(a.key).compact }"
                      :title="attrTooltip(a)"
                    >
                      {{ attrIconMeta(a.key).glyph }}
                    </span>
                  </div>
                <button
                  type="button"
                  class="sp-offer-cta"
                  :disabled="reserving === r.id"
                  @click="openBook(r)"
                >
                  {{
                    reserving === r.id
                      ? 'Reservando…'
                      : availabilityCta(r)
                  }}
                </button>
                </div>
              </article>
            </div>

            <p v-if="!resources.length" class="sp-empty">
              No hay {{ (selectedType?.label || 'activos').toLowerCase() }} con esos filtros.
              <span>Probá otro horario, tipo, sucursal o característica.</span>
            </p>
          </template>
        </section>
      </template>

      <template v-else>
        <section class="sp-block">
          <div class="sp-mine-seg" role="tablist" aria-label="Reservas">
            <button
              type="button"
              role="tab"
              class="sp-mine-seg__btn"
              :class="{ on: mineScope === 'active' }"
              :aria-selected="mineScope === 'active'"
              @click="setMineScope('active')"
            >
              Activas
            </button>
            <button
              type="button"
              role="tab"
              class="sp-mine-seg__btn"
              :class="{ on: mineScope === 'past' }"
              :aria-selected="mineScope === 'past'"
              @click="setMineScope('past')"
            >
              Pasadas
            </button>
          </div>

          <h2 class="sp-block__title">
            {{ mineScope === 'past' ? 'Reservas pasadas' : 'Reservas activas' }}
          </h2>
          <p v-if="busy" class="sp-muted">Cargando…</p>
          <FeedEmptyState
            v-else-if="loadIssue"
            :kind="loadIssue.kind"
            :title="loadIssue.title"
            :text="loadIssue.text"
            @retry="loadMine"
          />
          <template v-else>
            <ul class="sp-type-list">
              <li v-for="m in mine" :key="m.id">
                <div class="sp-type-row">
                  <div class="sp-type-avatar" :class="{ placeholder: !m.resourceImageUrl }">
                    <span class="sp-type-avatar-ph" aria-hidden="true">
                      <SpaceTypeIcon :name="offerIcon(m)" :size="22" />
                    </span>
                    <img
                      v-if="m.resourceImageUrl"
                      :src="mediaUrl(m.resourceImageUrl)"
                      alt=""
                      @error="onOfferImgErr"
                    />
                  </div>
                  <div class="sp-type-copy">
                    <strong>{{ m.resourceNombre || m.title }}</strong>
                    <p>{{ m.siteNombre }}</p>
                    <p>{{ fmt(m.startAt) }} → {{ fmt(m.endAt) }}</p>
                    <p v-if="m.unitCode">{{ m.unitCode }}</p>
                    <p v-if="m.plate">Patente {{ m.plate }}</p>
                    <span class="sp-status">{{ m.statusLabel }}</span>
                    <div v-if="mineScope === 'active'" class="sp-row-actions">
                      <button
                        v-if="m.checkInAvailable"
                        type="button"
                        class="sp-btn ghost"
                        @click="checkIn(m)"
                      >
                        Check-in
                      </button>
                      <p v-else-if="checkInHint(m)" class="sp-checkin-hint">{{ checkInHint(m) }}</p>
                      <button
                        v-if="m.status === 'checked_in'"
                        type="button"
                        class="sp-btn ghost"
                        @click="checkOut(m)"
                      >
                        Check-out
                      </button>
                      <button
                        v-if="['confirmed', 'pending', 'checked_in'].includes(m.status)"
                        type="button"
                        class="sp-btn danger"
                        @click="cancel(m)"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
            <p v-if="!mine.length" class="sp-empty">
              <template v-if="mineScope === 'past'">No hay reservas pasadas.</template>
              <template v-else>
                Todavía no tenés reservas activas.
                <button type="button" class="sp-link" @click="mode = 'book'">Ir a buscar y reservar</button>
              </template>
            </p>
          </template>
        </section>
      </template>
    </div>

    <div v-if="booking" class="sp-modal" @click.self="closeBook">
      <div class="sp-modal-card">
        <p class="sp-step">Confirmar reserva</p>
        <div class="sp-book-media" :class="{ 'no-img': !booking.imageUrl }">
          <span class="sp-offer-ph" aria-hidden="true">
            <span class="sp-offer-avatar">
              <SpaceTypeIcon :name="offerIcon(booking)" :size="36" />
            </span>
          </span>
          <img
            v-if="booking.imageUrl"
            :src="mediaUrl(booking.imageUrl)"
            alt=""
            @error="onOfferImgErr"
          />
        </div>
        <h2>{{ booking.nombre }}</h2>
        <p v-if="booking.descripcion" class="sp-meta">{{ booking.descripcion }}</p>
        <p class="sp-meta">{{ booking.siteNombre || 'Sin sucursal' }}</p>
        <p v-if="booking.occupancyShort" class="sp-meta">{{ booking.occupancyShort }}</p>
        <div v-if="booking.attributes?.length" class="sp-attr-icons">
          <span
            v-for="a in booking.attributes"
            :key="a.key"
            class="sp-attr-ico"
            :class="{ texty: attrIconMeta(a.key).compact }"
            :title="attrTooltip(a)"
          >
            {{ attrIconMeta(a.key).glyph }}
          </span>
        </div>

        <h3 class="sp-modal-sub">Cuándo</h3>
        <div class="sp-when__grid">
          <label>
            Desde
            <input v-model="startLocal" type="datetime-local" @change="refreshBookUnits" />
          </label>
          <label>
            Hasta
            <input v-model="endLocal" type="datetime-local" @change="refreshBookUnits" />
          </label>
        </div>

        <label v-if="booking.numbered">
          {{ booking.unitLabel || 'Unidad' }}
          <select v-model="bookForm.unitCode" :disabled="unitsLoading">
            <option value="">
              {{ unitsLoading ? 'Cargando…' : `Elegí un ${(booking.unitLabel || 'unidad').toLowerCase()}` }}
            </option>
            <option v-for="c in freeUnitCodes" :key="c" :value="c">{{ c }}</option>
          </select>
          <span v-if="!unitsLoading && !freeUnitCodes.length" class="sp-hint warn"
            >Sin unidades libres en esa franja. Probá otro día u horario.</span
          >
        </label>
        <p
          v-else-if="bookFreeUnits != null"
          class="sp-hint"
          :class="{ warn: bookFreeUnits <= 0 }"
        >
          {{
            bookFreeUnits <= 0
              ? 'Ocupado en esa franja. Probá otro día u horario.'
              : booking.unitCount > 1
                ? `Quedan ${bookFreeUnits} de ${booking.unitCount} ${(booking.unitLabel || 'lugares').toLowerCase()}`
                : 'Disponible en esa franja.'
          }}
        </p>

        <h3 class="sp-modal-sub">Datos de la reserva</h3>
        <label>
          Título (opcional)
          <input v-model="bookForm.title" type="text" maxlength="160" />
        </label>
        <label v-if="needsPlate">
          Patente
          <input v-model="bookForm.plate" type="text" maxlength="12" placeholder="AB123CD" />
        </label>
        <label v-if="needsPlate && booking.vehicleTypes?.length">
          Tipo de vehículo
          <select v-model="bookForm.vehicleType">
            <option value="">—</option>
            <option v-for="v in booking.vehicleTypes" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label>
          Motivo (opcional)
          <input v-model="bookForm.motivo" type="text" maxlength="200" />
        </label>
        <p v-if="booking.requiresApproval" class="sp-hint">
          Esta reserva queda pendiente de aprobación.
        </p>
        <p v-if="bookError" class="sp-err" role="alert">{{ bookError }}</p>
        <div class="sp-actions">
          <button type="button" class="sp-btn ghost" @click="closeBook">Volver</button>
          <button
            type="button"
            class="sp-btn"
            :disabled="!!reserving || unitsLoading || !bookSlotOk"
            @click="confirmBook"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>

    <div v-if="bookSuccess" class="sp-modal" @click.self="closeBookSuccess">
      <div class="sp-modal-card sp-modal-card--ok" role="dialog" aria-labelledby="sp-ok-title">
        <p class="sp-step">{{ bookSuccess.pending ? 'Reserva enviada' : 'Listo' }}</p>
        <div class="sp-ok-badge" aria-hidden="true">✓</div>
        <h2 id="sp-ok-title">
          {{ bookSuccess.pending ? 'Pendiente de aprobación' : 'Reserva confirmada' }}
        </h2>
        <p v-if="bookSuccess.resourceNombre" class="sp-ok-name">{{ bookSuccess.resourceNombre }}</p>
        <p v-if="bookSuccess.unitCode" class="sp-ok-unit">{{ bookSuccess.unitCode }}</p>
        <p v-if="bookSuccess.siteNombre" class="sp-meta">{{ bookSuccess.siteNombre }}</p>
        <p v-if="bookSuccess.when" class="sp-meta">{{ bookSuccess.when }}</p>
        <p v-if="bookSuccess.pending" class="sp-hint">
          Queda pendiente de aprobación. Te avisamos cuando la confirmen.
        </p>
        <div class="sp-actions">
          <button type="button" class="sp-btn ghost" @click="goToMineFromSuccess">Ver mis reservas</button>
          <button type="button" class="sp-btn" @click="closeBookSuccess">Listo</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import SpaceTypeIcon from '../components/SpaceTypeIcon.vue'
import FeedEmptyState from '../components/FeedEmptyState.vue'
import { resolveMediaUrl } from '../utils/media'
import { describeLoadError, friendlyErrorMessage } from '../utils/networkError'
import { attrIconMeta as attrIconMetaFn, attrTooltip as attrTooltipFn } from '../utils/spaceAttrIcons'

function mediaUrl(url) {
  return resolveMediaUrl(url)
}

function attrLabel(key) {
  return allAttributes.value.find((d) => d.key === key)?.label || key
}

function attrIconMeta(key) {
  return attrIconMetaFn(key)
}

function attrTooltip(attr) {
  return attrTooltipFn(attr, attrLabel)
}

function excerpt(s, n = 90) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`
}

function offerIcon(item) {
  return item?.typeIcon || item?.kindIcon || 'box'
}

function onOfferImgErr(e) {
  const media = e.target?.closest?.('.sp-offer-media, .sp-book-media, .sp-type-avatar')
  if (media) {
    e.target.remove()
    media.classList.add('no-img', 'placeholder')
  } else {
    e.target.style.display = 'none'
  }
}

const route = useRoute()
const mode = ref('book')
const mineScope = ref('active')
const sites = ref([])
const resources = ref([])
/** Inventario acotado por sucursal (sin filtrar por tipo ni attrs). */
const siteInventory = ref([])
const catalogTypes = ref([])
const allAttributes = ref([])
const mine = ref([])
const typeId = ref('')
const siteId = ref('')
const selectedAttrs = ref([])
const busy = ref(false)
const error = ref('')
const loadIssue = ref(null)
const bookError = ref('')
const okMsg = ref('')
const bookSuccess = ref(null)
const reserving = ref('')
const booking = ref(null)
const freeUnitCodes = ref([])
const bookFreeUnits = ref(null)
const unitsLoading = ref(false)
const bookForm = reactive({ title: '', plate: '', vehicleType: '', motivo: '', unitCode: '' })

function pad(n) {
  return String(n).padStart(2, '0')
}
function toLocalInput(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
}
function defaultRange() {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)
  return { start, end }
}
const initial = defaultRange()
const startLocal = ref(toLocalInput(initial.start))
const endLocal = ref(toLocalInput(initial.end))

const catalogTypeById = computed(() => {
  const map = new Map()
  for (const t of catalogTypes.value) map.set(String(t.id), t)
  return map
})

/** Recursos de la sucursal que cumplen las características elegidas. */
const filteredInventory = computed(() => {
  const want = selectedAttrs.value
  if (!want.length) return siteInventory.value
  return siteInventory.value.filter((r) => {
    const keys = new Set((r.attributes || []).map((a) => a.key))
    return want.every((k) => keys.has(k))
  })
})

const typeCounts = computed(() => {
  const counts = {}
  for (const r of filteredInventory.value) {
    const id = String(r.typeId || '')
    if (!id || !catalogTypeById.value.has(id)) continue
    counts[id] = (counts[id] || 0) + 1
  }
  return counts
})

/** Tipos con al menos un activo para sucursal + características. */
const visibleTypes = computed(() =>
  catalogTypes.value.filter((t) => typeCounts.value[String(t.id)]),
)

const selectedType = computed(() =>
  visibleTypes.value.find((t) => String(t.id) === String(typeId.value)) ||
  catalogTypes.value.find((t) => String(t.id) === String(typeId.value)),
)

function pluralTypeLabel(label, n) {
  const base = String(label || '').trim()
  if (!base) return n === 1 ? 'disponible' : 'disponibles'
  if (n === 1) return base
  const lower = base.toLowerCase()
  if (lower.endsWith('s')) return base
  if (lower.endsWith('z')) return `${base.slice(0, -1)}ces`
  if (/[aeiouáéíóú]$/i.test(base)) return `${base}s`
  return `${base}es`
}

const availTitle = computed(() => {
  if (busy.value || loadIssue.value) return 'Disponibles'
  const n = resources.value.length
  const label = selectedType.value?.label
  if (label) {
    return `${n} ${pluralTypeLabel(label, n)} ${n === 1 ? 'disponible' : 'disponibles'}`
  }
  return `${n} ${n === 1 ? 'disponible' : 'disponibles'}`
})

/** Características presentes en activos de la sucursal (o inventario total). */
const filterableAttrs = computed(() => {
  const keys = new Set()
  for (const r of siteInventory.value) {
    for (const a of r.attributes || []) {
      if (a?.key) keys.add(a.key)
    }
  }
  if (!keys.size) return []
  return allAttributes.value.filter((a) => keys.has(a.key) && a.valueType === 'flag')
})

const needsPlate = computed(
  () => booking.value?.exigePatente || booking.value?.kind === 'cochera',
)

/** ¿La franja elegida en el modal tiene cupo para confirmar? */
const bookSlotOk = computed(() => {
  if (!booking.value) return false
  if (booking.value.numbered) {
    return !!bookForm.unitCode && freeUnitCodes.value.includes(bookForm.unitCode)
  }
  if (bookFreeUnits.value != null) return bookFreeUnits.value > 0
  return booking.value.available !== false
})

/** CTA: si está ocupado en la franja filtrada, igual se puede abrir para elegir otro horario */
function availabilityCta(r) {
  return r?.available !== false ? 'Reservar' : 'Elegir otro horario'
}

function fmt(d) {
  try {
    const x =
      typeof d === 'string' && d.includes('T') && !d.endsWith('Z') && d.length <= 16
        ? new Date(d)
        : new Date(d)
    return x.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

function applyCatalogFromInventory() {
  const visible = visibleTypes.value
  if (!visible.length) {
    typeId.value = ''
    resources.value = []
    return
  }
  if (!visible.some((t) => String(t.id) === String(typeId.value))) {
    typeId.value = visible[0].id
  }
  resources.value = filteredInventory.value.filter(
    (r) => String(r.typeId || '') === String(typeId.value),
  )
}

async function loadMeta() {
  const { data } = await api.get('/spaces/meta')
  catalogTypes.value = (data.types || []).filter((t) => t.showInUserCatalog !== false)
  allAttributes.value = data.attributes || []
}

async function loadSites() {
  const { data } = await api.get('/spaces/sites')
  sites.value = data.items || []
}

async function loadCatalog() {
  if (mode.value !== 'book') return
  busy.value = true
  error.value = ''
  loadIssue.value = null
  try {
    const params = {
      start: new Date(startLocal.value).toISOString(),
      end: new Date(endLocal.value).toISOString(),
      siteId: siteId.value || undefined,
      // sin typeId: inventariamos todos los tipos visibles para acotar chips
    }
    const { data } = await api.get('/spaces/availability', { params })
    const items = data.items || []
    const allowed = new Set(catalogTypes.value.map((t) => String(t.id)))
    siteInventory.value = items.filter((r) => {
      const tid = String(r.typeId || '')
      return !allowed.size || allowed.has(tid)
    })
    // Limpiar attrs que ya no existen en este inventario
    if (selectedAttrs.value.length) {
      const present = new Set()
      for (const r of siteInventory.value) {
        for (const a of r.attributes || []) if (a?.key) present.add(a.key)
      }
      selectedAttrs.value = selectedAttrs.value.filter((k) => present.has(k))
    }
    applyCatalogFromInventory()
  } catch (e) {
    siteInventory.value = []
    resources.value = []
    loadIssue.value = describeLoadError(e, 'No se pudieron cargar los espacios.')
  } finally {
    busy.value = false
  }
}

async function loadMine() {
  busy.value = true
  error.value = ''
  loadIssue.value = null
  try {
    const { data } = await api.get('/spaces/reservations/mine', {
      params: { scope: mineScope.value },
    })
    mine.value = data.items || []
  } catch (e) {
    mine.value = []
    loadIssue.value = describeLoadError(e, 'No se pudieron cargar tus reservas.')
  } finally {
    busy.value = false
  }
}

function setMineScope(scope) {
  if (mineScope.value === scope) return
  mineScope.value = scope
  loadMine()
}

function onSiteChange() {
  selectedAttrs.value = []
  loadCatalog()
}

function onWhenChange() {
  if (booking.value) {
    refreshBookUnits()
    return
  }
  if (mode.value === 'book') loadCatalog()
}

function selectType(id) {
  typeId.value = id
  applyCatalogFromInventory()
}

function toggleAttr(key) {
  if (selectedAttrs.value.includes(key)) {
    selectedAttrs.value = selectedAttrs.value.filter((k) => k !== key)
  } else {
    selectedAttrs.value = [...selectedAttrs.value, key]
  }
  applyCatalogFromInventory()
}

function openBook(r) {
  booking.value = r
  bookError.value = ''
  // Conserva la franja del filtro de búsqueda (no la pisa con el default).
  if (!startLocal.value || !endLocal.value) {
    const range = defaultRange()
    startLocal.value = toLocalInput(range.start)
    endLocal.value = toLocalInput(range.end)
  }
  bookForm.title = r.nombre
  bookForm.plate = ''
  bookForm.vehicleType = r.vehicleTypes?.[0] || ''
  bookForm.motivo = ''
  bookForm.unitCode = ''
  freeUnitCodes.value = Array.isArray(r.freeUnitCodes) ? [...r.freeUnitCodes] : []
  bookFreeUnits.value = r.freeUnits ?? null
  if (r.numbered && freeUnitCodes.value[0]) bookForm.unitCode = freeUnitCodes.value[0]
  refreshBookUnits()
}

function closeBook() {
  booking.value = null
  bookError.value = ''
  freeUnitCodes.value = []
  bookFreeUnits.value = null
  bookForm.unitCode = ''
  if (mode.value === 'book') loadCatalog()
}

async function refreshBookUnits() {
  if (!booking.value || !startLocal.value || !endLocal.value) return
  unitsLoading.value = true
  try {
    const { data } = await api.get('/spaces/availability', {
      params: {
        start: new Date(startLocal.value).toISOString(),
        end: new Date(endLocal.value).toISOString(),
        resourceId: booking.value.id,
      },
    })
    const item = (data.items || [])[0]
    if (!item) {
      freeUnitCodes.value = []
      bookFreeUnits.value = 0
      return
    }
    freeUnitCodes.value = Array.isArray(item.freeUnitCodes) ? item.freeUnitCodes : []
    bookFreeUnits.value = item.freeUnits ?? null
    if (booking.value.numbered) {
      if (!freeUnitCodes.value.includes(bookForm.unitCode)) {
        bookForm.unitCode = freeUnitCodes.value[0] || ''
      }
    }
  } catch {
    /* keep previous */
  } finally {
    unitsLoading.value = false
  }
}

async function confirmBook() {
  if (!booking.value) return
  if (!bookSlotOk.value) {
    bookError.value = 'Elegí un día y horario en el que el activo esté libre.'
    return
  }
  if (booking.value.numbered && !bookForm.unitCode) {
    bookError.value = `Elegí un ${(booking.value.unitLabel || 'unidad').toLowerCase()}`
    return
  }
  reserving.value = booking.value.id
  bookError.value = ''
  okMsg.value = ''
  try {
    const snap = {
      resourceNombre: booking.value.nombre,
      siteNombre: booking.value.siteNombre || '',
      when: `${fmt(startLocal.value)} → ${fmt(endLocal.value)}`,
    }
    const { data } = await api.post('/spaces/reservations', {
      resourceId: booking.value.id,
      startAt: new Date(startLocal.value).toISOString(),
      endAt: new Date(endLocal.value).toISOString(),
      title: bookForm.title,
      motivo: bookForm.motivo,
      plate: bookForm.plate,
      vehicleType: bookForm.vehicleType,
      unitCode: bookForm.unitCode || undefined,
    })
    const item = data.item || {}
    closeBook()
    bookSuccess.value = {
      pending: item.status === 'pending',
      resourceNombre: item.resourceNombre || snap.resourceNombre,
      siteNombre: item.siteNombre || snap.siteNombre,
      unitCode: item.unitCode || '',
      when: snap.when,
    }
  } catch (e) {
    bookError.value = friendlyErrorMessage(e, 'No se pudo confirmar la reserva.')
  } finally {
    reserving.value = ''
  }
}

function closeBookSuccess() {
  bookSuccess.value = null
}

function goToMineFromSuccess() {
  bookSuccess.value = null
  mode.value = 'mine'
}

async function cancel(m) {
  if (!confirm('¿Cancelar esta reserva?')) return
  try {
    await api.post(`/spaces/reservations/${m.id}/cancel`)
    okMsg.value = 'Reserva cancelada.'
    await loadMine()
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo cancelar la reserva.')
  }
}

async function checkIn(m) {
  try {
    await api.post(`/spaces/reservations/${m.id}/check-in`)
    await loadMine()
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo hacer el check-in.')
  }
}

function showCheckIn(m) {
  return ['confirmed', 'pending'].includes(m.status)
}

function checkInHint(m) {
  if (!showCheckIn(m)) return ''
  if (m.checkInAvailable) return ''
  return m.checkInMessage || 'El check-in aún no está disponible.'
}

async function checkOut(m) {
  try {
    await api.post(`/spaces/reservations/${m.id}/check-out`)
    await loadMine()
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo hacer el check-out.')
  }
}

watch(mode, (m) => {
  loadIssue.value = null
  if (m === 'mine') loadMine()
  else loadCatalog()
})

onMounted(async () => {
  const q = route.query.tab
  if (q === 'mis') mode.value = 'mine'
  try {
    await loadMeta()
    await loadSites()
    if (mode.value === 'mine') await loadMine()
    else await loadCatalog()
  } catch (e) {
    loadIssue.value = describeLoadError(e, 'No se pudo cargar Espacios.')
  }
})
</script>

<style scoped>
.sp {
  padding: 0 0 5rem;
  min-height: 100%;
  background: var(--cx-page, #f8fafc);
  color: var(--cx-text, #0f172a);
}
.sp-hero {
  padding: 1rem 1rem 0.9rem;
  background: var(--cx-surface, #fff);
  border-bottom: 1px solid var(--cx-border, #e2e8f0);
}
.sp-hero h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--cx-text, #0f172a);
}
.sp-lead {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.88rem;
  color: var(--cx-muted, #64748b);
  line-height: 1.35;
}
.sp-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.85rem;
  background: var(--cx-surface-2, #f1f5f9);
}
.sp-seg__btn {
  border: none;
  background: transparent;
  border-radius: 0.7rem;
  padding: 0.55rem 0.5rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--cx-muted, #64748b);
}
.sp-seg__btn.on {
  background: var(--cx-elevated, #fff);
  color: var(--brand-primary, #0f766e);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--cx-text, #0f172a) 12%, transparent);
}
.sp-mine-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.85rem;
  background: var(--cx-surface-2, #f1f5f9);
}
.sp-mine-seg__btn {
  border: none;
  background: transparent;
  border-radius: 0.7rem;
  padding: 0.55rem 0.5rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--cx-muted, #64748b);
  cursor: pointer;
}
.sp-mine-seg__btn.on {
  background: var(--cx-elevated, #fff);
  color: var(--brand-primary, #0f766e);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--cx-text, #0f172a) 12%, transparent);
}
.sp-body {
  padding: 0.85rem 1rem 1rem;
  display: grid;
  gap: 0.85rem;
}
.sp-block {
  display: grid;
  gap: 0.55rem;
}
.sp-block__title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--cx-text, #0f172a);
}
.sp-types {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
@media (min-width: 520px) {
  .sp-types {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.sp-type {
  position: relative;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  border-radius: 14px;
  padding: 0.7rem 0.4rem;
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  text-align: center;
  font: inherit;
  color: var(--cx-muted, #475569);
  min-height: 5.2rem;
}
.sp-type.on {
  border-color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, var(--cx-surface, #fff));
  color: var(--brand-primary, #0f766e);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
}
.sp-type__ico {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.7rem;
  background: var(--cx-surface-2, #f8fafc);
  color: inherit;
  display: grid;
  place-items: center;
}
.sp-type.on .sp-type__ico {
  background: var(--cx-elevated, #fff);
}
.sp-type__label {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
}
.sp-when__grid {
  display: grid;
  gap: 0.55rem;
}
.sp-when__grid label,
.sp-modal-card label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
}
.sp-when__grid input,
.sp-when__grid select,
.sp-site-select,
.sp-site select,
.sp-modal-card input,
.sp-modal-card select {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 0.65rem;
  padding: 0.55rem 0.65rem;
  font: inherit;
  background: var(--cx-input, #fff);
  color: var(--cx-text, #0f172a);
}
.sp-filters {
  display: grid;
  gap: 0.75rem;
  background: transparent;
  border: none;
  padding: 0;
}
.sp-site-block {
  display: grid;
  gap: 0.55rem;
}
.sp-site-select {
  width: 100%;
}
.sp-attrs-collapse {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 0.75rem;
  background: var(--cx-surface, #fff);
  padding: 0.15rem 0.7rem 0.15rem;
}
.sp-attrs-collapse summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--cx-muted, #64748b);
}
.sp-attrs-collapse summary::-webkit-details-marker {
  display: none;
}
.sp-attrs-collapse summary::before {
  content: '▸';
  font-size: 0.7rem;
  opacity: 0.7;
}
.sp-attrs-collapse[open] summary::before {
  content: '▾';
}
.sp-attrs-collapse[open] {
  padding-bottom: 0.65rem;
}
.sp-attrs-collapse__badge {
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 650;
  min-width: 1.1rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, var(--cx-surface-2, #f1f5f9));
  color: var(--brand-primary, #0f766e);
}
.sp-attrs__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-top: 0.15rem;
}
.sp-chip {
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  border-radius: 999px;
  padding: 0.22rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--cx-muted, #64748b);
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}
.sp-chip.on {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, var(--cx-surface, #fff));
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 45%, var(--cx-border, #e2e8f0));
  color: var(--brand-primary, #0e7490);
  font-weight: 600;
}
.sp-chip-ico {
  font-size: 0.7rem;
}
.sp-modal-sub {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--cx-text, #0f172a);
}
.sp-muted {
  color: var(--cx-muted, #64748b);
  font-size: 0.85rem;
  margin: 0;
}
.sp-empty {
  margin: 0;
  text-align: center;
  padding: 1.25rem 0.75rem;
  border: 1px dashed var(--cx-border, #cbd5e1);
  border-radius: 0.85rem;
  background: var(--cx-surface, #fff);
  color: var(--cx-muted, #64748b);
  font-size: 0.88rem;
}
.sp-empty span {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
}
.sp-link {
  display: inline-block;
  margin-top: 0.55rem;
  border: none;
  background: none;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 0.88rem;
  text-decoration: underline;
  cursor: pointer;
}
.sp-err {
  color: var(--cx-danger, #b91c1c);
  margin: 0;
  font-size: 0.88rem;
}
.sp-ok {
  color: var(--cx-ok, #0f766e);
  margin: 0;
  font-size: 0.88rem;
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}
@media (min-width: 720px) {
  .sp-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.sp-offer {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  background: var(--cx-surface, #fff);
  overflow: hidden;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--cx-text, #0f172a) 8%, transparent);
  display: flex;
  flex-direction: column;
}
.sp-offer-media {
  position: relative;
  height: 110px;
  background: var(--cx-surface-2, #f1f5f9);
  overflow: hidden;
}
.sp-offer-media img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sp-offer-ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--brand-primary, #0f766e);
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--brand-primary, #0f766e) 18%, transparent), transparent 55%),
    color-mix(in srgb, var(--brand-primary, #0f766e) 10%, var(--cx-surface-2, #f1f5f9));
}
.sp-offer-avatar {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, #fff);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--cx-text, #0f172a) 10%, transparent);
}
.sp-offer-body {
  padding: 10px;
  display: grid;
  gap: 0.35rem;
  flex: 1;
}
.sp-offer-title {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}
.sp-offer-type {
  flex: 0 0 auto;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, var(--cx-surface-2, #fff));
  color: var(--brand-primary, #0f766e);
  display: grid;
  place-items: center;
  margin-top: 0.1rem;
}
.sp-offer-body strong {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--cx-text, #0f172a);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sp-offer-desc {
  margin: 0 !important;
  font-size: 0.72rem !important;
  color: var(--cx-muted, #334155) !important;
  line-height: 1.3 !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sp-offer-free {
  margin: 0 !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  color: var(--brand-primary, #0f766e) !important;
}
.sp-offer-free.none {
  color: var(--cx-danger, #b91c1c) !important;
}
.sp-offer-body p {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cx-muted, #64748b);
  line-height: 1.3;
}
.sp-offer-cta {
  margin-top: auto;
  width: 100%;
  border: none;
  border-radius: 0.65rem;
  padding: 0.5rem 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.sp-offer-cta:disabled {
  background: var(--cx-surface-2, #e2e8f0);
  color: var(--cx-muted, #94a3b8);
}
.sp-attr-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.sp-attr-ico {
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.25rem;
  border-radius: 0.35rem;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface-2, #f8fafc);
  display: inline-grid;
  place-items: center;
  font-size: 0.7rem;
  line-height: 1;
  color: var(--cx-text, #334155);
}
.sp-attr-ico.texty {
  font-size: 0.55rem;
  font-weight: 700;
}
.sp-type-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
}
.sp-type-row {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem;
  border-bottom: 1px solid var(--cx-border, #f1f5f9);
}
.sp-type-list li:last-child .sp-type-row {
  border-bottom: none;
}
.sp-type-avatar {
  position: relative;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--cx-surface-2, #f1f5f9);
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--brand-primary, #0f766e);
}
.sp-type-avatar.placeholder,
.sp-type-avatar.no-img {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, var(--cx-surface-2, #fff));
}
.sp-type-avatar-ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.sp-type-avatar img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sp-type-copy {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 0.2rem;
}
.sp-type-copy strong {
  font-size: 0.92rem;
  color: var(--cx-text, #0f172a);
}
.sp-type-copy p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--cx-muted, #64748b);
}
.sp-status {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--brand-primary, #0f766e);
}
.sp-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
  align-items: center;
}
.sp-checkin-hint {
  margin: 0;
  flex: 1 1 100%;
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
  line-height: 1.3;
}
.sp-btn {
  border: none;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-radius: 0.65rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
}
.sp-btn.ghost {
  background: var(--cx-surface, #fff);
  color: var(--brand-primary, #0f766e);
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 35%, var(--cx-border, #e2e8f0));
}
.sp-btn.danger {
  background: var(--cx-surface, #fff);
  color: var(--cx-danger, #b91c1c);
  border: 1px solid color-mix(in srgb, var(--cx-danger, #b91c1c) 35%, var(--cx-border, #e2e8f0));
}
.sp-modal {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, #020617 55%, transparent);
  display: grid;
  place-items: end center;
  z-index: 40;
}
.sp-modal-card {
  width: min(480px, 100%);
  max-height: 92vh;
  overflow: auto;
  background: var(--cx-surface, #fff);
  color: var(--cx-text, #0f172a);
  border: 1px solid var(--cx-border, transparent);
  border-radius: 1rem 1rem 0 0;
  padding: 1rem;
  display: grid;
  gap: 0.55rem;
}
.sp-modal-card--ok {
  place-items: center;
  text-align: center;
  padding: 1.35rem 1.1rem 1.15rem;
}
.sp-ok-badge {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 1.35rem;
  font-weight: 800;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, var(--cx-surface, #fff));
  color: var(--brand-primary, #0f766e);
}
.sp-ok-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--cx-text, #0f172a);
}
.sp-ok-unit {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--brand-primary, #0f766e);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.sp-modal-card--ok .sp-actions {
  width: 100%;
  margin-top: 0.35rem;
}
.sp-step {
  margin: 0;
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sp-modal-card h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--cx-text, #0f172a);
}
.sp-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cx-muted, #64748b);
}
.sp-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--cx-muted, #64748b);
}
.sp-hint.warn {
  color: #b45309;
}
.sp-book-media {
  position: relative;
  height: 9rem;
  border-radius: 0.85rem;
  overflow: hidden;
  background: var(--cx-surface-2, #f1f5f9);
}
.sp-book-media img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sp-book-media .sp-offer-ph {
  border-radius: 0.85rem;
}
.sp-book-media .sp-offer-avatar {
  width: 4rem;
  height: 4rem;
}
.sp-actions {
  display: flex;
  gap: 0.45rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
}
</style>
