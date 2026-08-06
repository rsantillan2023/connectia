<template>
  <section class="subpage">
    <SubpageHeader title="Conocimiento" subtitle="Biblioteca de la comunidad">
      <template #actions>
        <button
          type="button"
          class="filter-btn"
          :class="{ on: filtersActive }"
          :aria-label="filtersActive ? 'Filtros activos' : 'Filtrar conocimiento'"
          title="Filtrar"
          @click="filterOpen = true"
        >
          <AppIcon name="filter" :size="18" :filled="filtersActive" />
          <span>Filtrar</span>
          <span v-if="filtersActive" class="filter-dot" aria-hidden="true" />
        </button>
      </template>
    </SubpageHeader>

    <p v-if="filtersActive" class="filter-summary">
      {{ filterSummary }}
      <button type="button" class="filter-clear" @click="clearFilters">Quitar filtros</button>
    </p>

    <p v-if="error && items.length" class="feed-banner">{{ error }}</p>
    <div v-if="loading && !items.length" class="feed-empty">Cargando conocimiento…</div>

    <FeedEmptyState
      v-else-if="!items.length && loadIssue"
      :kind="loadIssue.kind"
      :title="loadIssue.title"
      :text="loadIssue.text"
      @retry="() => load(true)"
    />
    <FeedEmptyState
      v-else-if="!loading && !items.length"
      kind="empty"
      icon="file"
      :title="filtersActive ? 'Sin resultados' : 'Todavía no hay conocimiento'"
      :text="
        filtersActive
          ? 'No hay piezas que coincidan con el filtro.'
          : 'Cuando publiquen piezas de la biblioteca, vas a verlas acá.'
      "
    />

    <PostCard
      v-for="p in items"
      :key="p.id"
      :post="p"
      :show-more-menu="false"
      @open="openPost"
    >
      <template #actions>
        <div class="card-actions">
          <ReactionBar :model-value="p" @react="(key) => react(p, key)" />
          <button
            v-if="p.commentsEnabled !== false"
            type="button"
            class="react"
            aria-label="Comentarios"
            title="Comentarios"
            @click="openPost(p)"
          >
            <AppIcon name="chat" :size="20" />
            <span class="react-count">{{ p.commentsCount || 0 }}</span>
          </button>
          <button
            type="button"
            class="react"
            aria-label="Derivar por chat"
            title="Derivar"
            @click="openShare(p)"
          >
            <AppIcon name="share" :size="20" />
          </button>
          <button
            type="button"
            class="react save"
            :class="{ on: p.saved }"
            :aria-label="p.saved ? 'Quitar de guardados' : 'Guardar'"
            :title="p.saved ? 'Guardado' : 'Guardar'"
            @click="toggleSave(p)"
          >
            <AppIcon name="bookmark" :size="20" :filled="Boolean(p.saved)" />
          </button>
        </div>
      </template>
    </PostCard>

    <div ref="sentinel" class="feed-sentinel">
      <span v-if="loadingMore">Cargando más…</span>
    </div>

    <SharePostSheet v-if="shareTarget" :post="shareTarget" @close="shareTarget = null" />
    <GuardadosFilterSheet
      v-if="filterOpen"
      title="Filtrar conocimiento"
      :q="filters.q"
      :tipo="filters.tipo"
      :origin="filters.origin"
      :section="filters.section"
      @close="filterOpen = false"
      @apply="applyFilters"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import PostCard from '../components/PostCard.vue'
import ReactionBar from '../components/ReactionBar.vue'
import SharePostSheet from '../components/SharePostSheet.vue'
import GuardadosFilterSheet from '../components/GuardadosFilterSheet.vue'
import FeedEmptyState from '../components/FeedEmptyState.vue'
import SubpageHeader from '../components/SubpageHeader.vue'
import { describeLoadError, friendlyErrorMessage } from '../utils/networkError'

const TIPO_LABELS = {
  noticia: 'Noticia',
  aviso: 'Aviso',
  beneficio: 'Beneficio',
  evento: 'Evento',
  celebracion: 'Celebración',
  general: 'General',
}

const ORIGIN_LABELS = {
  admin: 'Empresa',
  member: 'Comunidad',
}

const router = useRouter()
const items = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const loadIssue = ref(null)
const size = 10
const hasMore = ref(false)
const sentinel = ref(null)
const shareTarget = ref(null)
const filterOpen = ref(false)
const filters = reactive({ q: '', tipo: '', origin: '', section: '' })
let observer

const filtersActive = computed(
  () => Boolean(filters.q?.trim() || filters.tipo || filters.origin || filters.section?.trim()),
)

const filterSummary = computed(() => {
  const parts = []
  if (filters.q?.trim()) parts.push(`“${filters.q.trim()}”`)
  if (filters.tipo) parts.push(TIPO_LABELS[filters.tipo] || filters.tipo)
  if (filters.origin) parts.push(ORIGIN_LABELS[filters.origin] || filters.origin)
  if (filters.section?.trim()) parts.push(filters.section.trim())
  return parts.length ? `Filtro: ${parts.join(' · ')}` : ''
})

function openPost(p) {
  if (p?.id) router.push(`/muro/${p.id}`)
}

function openShare(p) {
  if (p?.id) shareTarget.value = p
}

function applyFilters(next) {
  filters.q = String(next?.q || '').trim()
  filters.tipo = next?.tipo || ''
  filters.origin = next?.origin || ''
  filters.section = String(next?.section || '').trim()
  load(true)
}

function clearFilters() {
  applyFilters({ q: '', tipo: '', origin: '', section: '' })
}

function filterParams() {
  const params = { knowledge: 1 }
  const q = filters.q?.trim()
  if (q) params.q = q
  if (filters.tipo) params.tipo = filters.tipo
  if (filters.origin) params.origin = filters.origin
  if (filters.section?.trim()) params.section = filters.section.trim()
  return params
}

async function load(reset) {
  error.value = ''
  if (reset) {
    page.value = 1
    loading.value = true
    loadIssue.value = null
  } else {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  }
  try {
    const { data } = await api.get('/posts/feed', {
      params: { page: page.value, size, ...filterParams() },
    })
    const next = data.items || []
    items.value = reset ? next : [...items.value, ...next]
    total.value = data.total || 0
    hasMore.value = items.value.length < total.value
    if (next.length) page.value += 1
    loadIssue.value = null
  } catch (e) {
    const issue = describeLoadError(e, 'No se pudo cargar el conocimiento.')
    if (reset) {
      loadIssue.value = issue
      items.value = []
    } else {
      error.value = issue.text
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function react(p, key) {
  try {
    const { data } = await api.post(`/posts/${p.id}/reactions`, { reaction: key })
    const idx = items.value.findIndex((x) => x.id === p.id)
    if (idx >= 0 && data.post) items.value[idx] = data.post
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo reaccionar')
  }
}

async function toggleSave(p) {
  try {
    const { data } = await api.post(`/posts/${p.id}/save`)
    const idx = items.value.findIndex((x) => x.id === p.id)
    if (idx >= 0) {
      if (data.post) items.value[idx] = data.post
      else items.value[idx] = { ...items.value[idx], saved: Boolean(data.saved) }
    }
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo actualizar el guardado')
  }
}

onMounted(() => {
  load(true)
  const root = document.querySelector('.u-main')
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) load(false)
    },
    { root: root || null, rootMargin: '160px', threshold: 0.01 },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.subpage {
  padding: 0 0 28px;
}
.filter-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 999px;
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.filter-btn.on {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}
.filter-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary);
}
.filter-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 10px 16px 8px;
  font-size: 12px;
  color: var(--cx-muted);
}
.filter-clear {
  border: 0;
  background: transparent;
  color: var(--brand-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
}
.feed-banner {
  margin: 10px 16px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  background: #fff7ed;
  color: #9a3412;
}
.feed-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--cx-muted);
  font-size: 14px;
  line-height: 1.45;
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding-top: 4px;
}
.react {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 36px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  box-sizing: border-box;
  cursor: pointer;
}
.react-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  color: inherit;
}
.react.on {
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}
.react.save {
  padding: 6px 8px;
}
.feed-sentinel {
  min-height: 28px;
  display: grid;
  place-items: center;
  padding: 12px;
  font-size: 12px;
  color: var(--cx-muted);
}
</style>
