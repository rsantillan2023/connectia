<template>
  <section class="subpage">
    <SubpageHeader
      title="Mis publicaciones"
      subtitle="Estado de lo que enviaste al muro"
    >
      <template #actions>
        <button
          type="button"
          class="filter-btn"
          :class="{ on: filtersActive }"
          :aria-label="filtersActive ? 'Filtros activos' : 'Filtrar publicaciones'"
          title="Filtrar"
          @click="filterOpen = true"
        >
          <AppIcon name="filter" :size="18" :filled="filtersActive" />
          <span v-if="filtersActive" class="filter-dot" aria-hidden="true" />
        </button>
      </template>
    </SubpageHeader>

    <div
      v-if="!loading || items.length"
      class="status-filters"
      role="tablist"
      aria-label="Filtrar por estado"
    >
      <button
        v-for="opt in filterOptions"
        :key="opt.id"
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': statusFilter === opt.id }"
        :aria-selected="statusFilter === opt.id"
        @click="statusFilter = opt.id"
      >
        <span>{{ opt.label }}</span>
        <span class="chip-badge" :data-status="opt.id">{{ opt.count }}</span>
      </button>
    </div>

    <p v-if="error && items.length" class="banner">{{ error }}</p>
    <div v-if="loading" class="empty">Cargando…</div>

    <FeedEmptyState
      v-else-if="!items.length && loadIssue"
      :kind="loadIssue.kind"
      :title="loadIssue.title"
      :text="loadIssue.text"
      @retry="load"
    />
    <FeedEmptyState
      v-else-if="!items.length"
      kind="empty"
      icon="image"
      title="Todavía no hay publicaciones"
      text="Cuando envíes algo al muro, vas a ver el estado acá."
    />

    <FeedEmptyState
      v-else-if="!filteredItems.length"
      kind="empty"
      icon="filter"
      title="Sin resultados"
      text="No hay publicaciones con este estado."
    />

    <div v-else class="feed-list">
      <article v-for="p in filteredItems" :key="p.id" class="mine-item">
        <div class="mine-status">
          <span class="badge" :data-status="p.status">{{ statusLabel(p.status) }}</span>
          <span class="date">{{ formatDate(p.publishedAt || p.createdAt) }}</span>
        </div>
        <p v-if="p.status === 'rejected' && p.rejectionReason" class="reject">
          Motivo: {{ p.rejectionReason }}
        </p>
        <PostCard
          :post="cardPost(p)"
          :show-more-menu="false"
          :truncate="true"
          @open="openPost(p)"
        />
      </article>
    </div>

    <div
      v-if="filterOpen"
      class="sheet"
      @click.self="filterOpen = false"
    >
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="mine-filter-title">
        <header class="sheet-head">
          <h2 id="mine-filter-title">Filtrar por estado</h2>
          <button type="button" class="icon" aria-label="Cerrar" @click="filterOpen = false">
            <AppIcon name="close" :size="20" />
          </button>
        </header>
        <div class="sheet-opts" role="radiogroup" aria-label="Estado">
          <button
            v-for="opt in filterOptions"
            :key="`sheet-${opt.id}`"
            type="button"
            class="sheet-opt"
            role="radio"
            :aria-checked="statusFilter === opt.id"
            :class="{ on: statusFilter === opt.id }"
            @click="pickStatus(opt.id)"
          >
            <span>{{ opt.label }}</span>
            <span class="chip-badge" :data-status="opt.id">{{ opt.count }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import PostCard from '../components/PostCard.vue'
import FeedEmptyState from '../components/FeedEmptyState.vue'
import SubpageHeader from '../components/SubpageHeader.vue'
import { describeLoadError } from '../utils/networkError'

const router = useRouter()
const items = ref([])
const loading = ref(true)
const error = ref('')
const loadIssue = ref(null)
const filterOpen = ref(false)
/** all | published | pending_review | rejected | draft */
const statusFilter = ref('published')

const STATUS_OPTS = [
  { id: 'all', label: 'Todas' },
  { id: 'published', label: 'En el muro' },
  { id: 'pending_review', label: 'En revisión' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'draft', label: 'Borrador' },
]

const filtersActive = computed(() => statusFilter.value !== 'published')

function statusLabel(s) {
  return (
    {
      pending_review: 'En revisión',
      published: 'En el muro',
      rejected: 'Rechazada',
      draft: 'Borrador',
    }[s] || s
  )
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function countFor(id) {
  if (id === 'all') return items.value.length
  return items.value.filter((p) => p.status === id).length
}

const filterOptions = computed(() =>
  STATUS_OPTS.map((opt) => ({
    ...opt,
    count: countFor(opt.id),
  })).filter((opt) => opt.id === 'all' || opt.count > 0 || statusFilter.value === opt.id),
)

const filteredItems = computed(() => {
  if (statusFilter.value === 'all') return items.value
  return items.value.filter((p) => p.status === statusFilter.value)
})

function pickStatus(id) {
  statusFilter.value = id
  filterOpen.value = false
}

function cardPost(p) {
  if (!p) return p
  const show = { ...(p.display?.show || {}) }
  if (p.status !== 'published') show.reactions = false
  return {
    ...p,
    publishedAt: p.publishedAt || p.createdAt || null,
    display: { ...(p.display || {}), show },
  }
}

function openPost(p) {
  if (!p?.id) return
  if (p.status === 'published') router.push(`/muro/${p.id}`)
}

async function load() {
  loading.value = true
  error.value = ''
  loadIssue.value = null
  try {
    const { data } = await api.get('/posts/mine')
    items.value = data.items || []
  } catch (e) {
    loadIssue.value = describeLoadError(e, 'No se pudieron cargar tus publicaciones.')
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.subpage {
  padding: 0 0 28px;
}
.filter-btn {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  color: var(--cx-text, #0f172a);
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
}
.filter-btn.on {
  border-color: var(--brand-primary, #0f766e);
  color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
}
.filter-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary, #0f766e);
}
.status-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--cx-border, #e2e8f0);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 7px 10px 7px 12px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--cx-muted, #64748b) 12%, transparent);
  color: var(--cx-muted, #64748b);
  cursor: pointer;
}
.chip.is-active {
  background: var(--cx-text, #0f172a);
  color: var(--cx-surface, #fff);
  border-color: transparent;
}
.chip-badge {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-size: 0.68rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--cx-muted, #64748b) 18%, transparent);
  color: inherit;
}
.chip.is-active .chip-badge {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.banner {
  margin: 10px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  background: #fff7ed;
  color: #9a3412;
}
.empty {
  padding: 36px 16px;
  text-align: center;
  color: var(--cx-muted);
  font-size: 14px;
}
.feed-list {
  display: grid;
  gap: 4px;
  margin-top: 8px;
}
.mine-item {
  display: grid;
  gap: 6px;
}
.mine-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 9px;
}
.badge[data-status='pending_review'] {
  background: color-mix(in srgb, #ca8a04 18%, transparent);
  color: #a16207;
}
.badge[data-status='published'] {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 16%, transparent);
  color: var(--brand-primary, #0f766e);
}
.badge[data-status='rejected'] {
  background: color-mix(in srgb, #dc2626 14%, transparent);
  color: #b91c1c;
}
.badge[data-status='draft'] {
  background: color-mix(in srgb, var(--cx-muted) 18%, transparent);
  color: var(--cx-muted);
}
.date {
  font-size: 11px;
  color: var(--cx-muted);
}
.reject {
  margin: 0;
  padding: 0 16px;
  font-size: 0.78rem;
  color: #b91c1c;
}
.sheet {
  position: fixed;
  inset: 0;
  z-index: 92;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.panel {
  width: min(100%, 430px);
  background: var(--cx-surface, #fff);
  color: var(--cx-text, #0f172a);
  border-radius: 18px 18px 0 0;
  padding: 14px 16px max(18px, env(safe-area-inset-bottom));
  display: grid;
  gap: 12px;
}
.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sheet-head h2 {
  margin: 0;
  font-size: 1.05rem;
}
.icon {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.sheet-opts {
  display: grid;
  gap: 8px;
}
.sheet-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--cx-border, #e2e8f0);
  background: var(--cx-surface, #fff);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  color: inherit;
}
.sheet-opt.on {
  border-color: var(--brand-primary, #0f766e);
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 10%, transparent);
}
</style>
