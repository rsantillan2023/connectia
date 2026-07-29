<template>
  <section class="feed">
    <div
      class="pull-indicator"
      :class="{ visible: pulling || refreshing }"
      :style="{ height: `${indicatorHeight}px` }"
      aria-live="polite"
    >
      <span class="pull-spinner" :class="{ spin: refreshing || ready }" />
      <span class="pull-label">
        {{ refreshing ? 'Actualizando…' : ready ? 'Soltá para actualizar' : 'Deslizá para actualizar' }}
      </span>
    </div>

    <HubQuickStrip compact surface="muro" class="feed-hub" />

    <header class="feed-section-head">
      <div class="feed-section-left">
        <h2 class="feed-section-title">Novedades</h2>
        <button
          v-if="viewMode === 'carousel' && items.length"
          type="button"
          class="see-all"
          @click="setViewMode('list')"
        >
          Conocer todos
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="feed-section-actions">
        <div class="view-toggle" role="group" aria-label="Formato de novedades">
          <button
            type="button"
            class="view-btn"
            :class="{ on: viewMode === 'list' }"
            aria-label="Vista lista"
            title="Lista"
            @click="setViewMode('list')"
          >
            <AppIcon name="list" :size="16" />
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ on: viewMode === 'carousel' }"
            aria-label="Vista carrusel"
            title="Carrusel"
            @click="setViewMode('carousel')"
          >
            <AppIcon name="grid" :size="16" />
          </button>
        </div>
        <button
          type="button"
          class="filter-btn"
          :class="{ on: filtersActive }"
          :aria-label="filtersActive ? 'Filtros activos' : 'Filtrar novedades'"
          title="Filtrar"
          @click="filterOpen = true"
        >
          <AppIcon name="filter" :size="18" :filled="filtersActive" />
          <span>Filtrar</span>
          <span v-if="filtersActive" class="filter-dot" aria-hidden="true" />
        </button>
      </div>
    </header>

    <p v-if="filtersActive" class="filter-summary">
      {{ filterSummary }}
      <button type="button" class="filter-clear" @click="clearFilters">Quitar filtros</button>
    </p>

    <p v-if="error" class="feed-banner">{{ error }}</p>
    <div v-if="loading && !items.length && !refreshing" class="feed-empty">Cargando novedades…</div>

    <NovedadesCarousel
      v-if="viewMode === 'carousel' && items.length"
      :items="items"
      :loading-more="loadingMore"
      @open="openPost"
      @need-more="load(false)"
    />

    <template v-if="viewMode === 'carousel'">
      <MuroStripSection
        title="Beneficios"
        tone="beneficio"
        default-kicker="Beneficio"
        empty-text="No hay beneficios por ahora."
        :items="beneficioCards"
        :loading="beneficiosLoading"
        @see-all="router.push('/beneficios')"
        @open="openBeneficio"
      />
      <MuroStripSection
        title="Agenda"
        tone="agenda"
        default-kicker="Evento"
        empty-text="No hay eventos próximos."
        :items="agendaCards"
        :loading="agendaLoading"
        @see-all="router.push('/agenda')"
        @open="openAgenda"
      />
      <MuroStripSection
        title="Mis solicitudes"
        tone="solicitud"
        default-kicker="Solicitud"
        empty-text="Todavía no tenés solicitudes."
        :items="solicitudCards"
        :loading="solicitudesLoading"
        @see-all="router.push('/solicitudes')"
        @open="openSolicitud"
      />
      <MuroStripSection
        title="Encuestas"
        tone="encuesta"
        default-kicker="Encuesta"
        empty-text="No hay encuestas abiertas."
        :items="encuestaCards"
        :loading="encuestasLoading"
        @see-all="router.push('/encuestas')"
        @open="openEncuesta"
      />
      <MuroStripSection
        title="Avisos"
        tone="aviso"
        default-kicker="Aviso"
        empty-text="No hay avisos por ahora."
        :items="avisoCards"
        :loading="avisosLoading"
        @see-all="router.push('/avisos')"
        @open="openAviso"
      />
      <MuroStripSection
        title="Chat"
        tone="chat"
        default-kicker="Chat"
        empty-text="Todavía no tenés conversaciones."
        :items="chatCards"
        :loading="chatsLoading"
        @see-all="router.push('/chat')"
        @open="openChat"
      />
    </template>

    <template v-if="viewMode === 'list'">
      <PostCard
        v-for="p in items"
        :key="p.id"
        :post="p"
        @open="openPost"
        @not-interested="askHide"
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
              :aria-label="p.saved ? 'Quitar de guardados' : 'Guardar publicación'"
              :title="p.saved ? 'Guardado' : 'Guardar'"
              @click="toggleSave(p)"
            >
              <AppIcon name="bookmark" :size="20" :filled="Boolean(p.saved)" />
            </button>
          </div>
        </template>
      </PostCard>
    </template>

    <div v-if="viewMode === 'list' && !loading && !items.length" class="feed-empty">
      {{
        filtersActive
          ? 'No hay novedades que coincidan con el filtro.'
          : 'Todavía no hay publicaciones en tu muro.'
      }}
    </div>
    <p
      v-else-if="viewMode === 'carousel' && !loading && !items.length"
      class="carousel-empty"
    >
      {{
        filtersActive
          ? 'No hay novedades que coincidan con el filtro.'
          : 'Todavía no hay novedades.'
      }}
    </p>
    <div v-if="viewMode === 'list'" ref="sentinel" class="feed-sentinel">
      <span v-if="loadingMore">Cargando más…</span>
    </div>

    <ConfirmSheet
      v-if="hideTarget"
      title="¿No te interesa?"
      :message="hideMessage"
      confirm-label="Sí, ocultarla"
      cancel-label="Cancelar"
      :busy="hiding"
      @confirm="confirmHide"
      @cancel="hideTarget = null"
    />

    <SharePostSheet v-if="shareTarget" :post="shareTarget" @close="shareTarget = null" />
    <GuardadosFilterSheet
      v-if="filterOpen"
      title="Filtrar novedades"
      :q="filters.q"
      :tipo="filters.tipo"
      :origin="filters.origin"
      @close="filterOpen = false"
      @apply="applyFilters"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import HubQuickStrip from '../components/HubQuickStrip.vue'
import PostCard from '../components/PostCard.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import SharePostSheet from '../components/SharePostSheet.vue'
import GuardadosFilterSheet from '../components/GuardadosFilterSheet.vue'
import NovedadesCarousel from '../components/NovedadesCarousel.vue'
import MuroStripSection from '../components/MuroStripSection.vue'
import ReactionBar from '../components/ReactionBar.vue'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { useAuthStore } from '../stores/auth'
import { useNotifBadge } from '../composables/useNotifBadge'
import { useChatBadge } from '../composables/useChatBadge'
import { mediaKind, resolveMediaUrl } from '../utils/media'

const VIEW_KEY = 'cx.muro.novedadesView'
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

const props = defineProps({
  searchQuery: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { setUnread: setNotifUnread, unreadCount: notifUnread } = useNotifBadge()
const { refreshBadge: refreshChatBadge } = useChatBadge()

const items = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const size = 10
const hasMore = ref(false)
const sentinel = ref(null)
const hideTarget = ref(null)
const hiding = ref(false)
const shareTarget = ref(null)
const filterOpen = ref(false)
const filters = reactive({ q: '', tipo: '', origin: '' })
const viewMode = ref(readViewMode())
const avisos = ref([])
const avisosLoading = ref(false)
const chats = ref([])
const chatsLoading = ref(false)
const beneficios = ref([])
const beneficiosLoading = ref(false)
const agenda = ref([])
const agendaLoading = ref(false)
const solicitudes = ref([])
const solicitudesLoading = ref(false)
const encuestas = ref([])
const encuestasLoading = ref(false)
let observer
let stripsLoaded = false

function formatShortDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/** Primera URL de imagen usable para cards del carrusel. */
function stripImageUrl(...candidates) {
  for (const raw of candidates) {
    if (Array.isArray(raw)) {
      for (const m of raw) {
        const url = stripImageUrl(m?.url || m?.imageUrl || m)
        if (url) return url
      }
      continue
    }
    const resolved = resolveMediaUrl(raw)
    if (resolved && mediaKind(resolved) === 'image') return resolved
  }
  return ''
}

function readViewMode() {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'carousel' ? 'carousel' : 'list'
  } catch {
    return 'list'
  }
}

function setViewMode(mode) {
  viewMode.value = mode === 'carousel' ? 'carousel' : 'list'
  try {
    localStorage.setItem(VIEW_KEY, viewMode.value)
  } catch {
    /* ignore */
  }
  if (viewMode.value === 'carousel') loadStrips()
}

const avisoCards = computed(() =>
  avisos.value.map((n) => ({
    id: n.id,
    title: n.title || 'Aviso',
    subtitle: n.body || '',
    unread: !n.readAt,
    kicker: n.readAt ? 'Aviso' : 'Sin leer',
    tone: 'aviso',
    icon: 'bell',
    raw: n,
  })),
)

const chatCards = computed(() =>
  chats.value.map((c) => ({
    id: c.id,
    title: c.title || 'Chat',
    subtitle: c.lastMessagePreview || 'Sin mensajes',
    unread: Boolean(c.unread),
    kicker: c.kind === 'group' ? 'Grupo' : 'Chat',
    tone: 'chat',
    icon: 'chat',
    raw: c,
  })),
)

const beneficioCards = computed(() =>
  beneficios.value.map((b) => ({
    id: b.id,
    title: b.titulo || 'Beneficio',
    subtitle: b.costoPuntos
      ? `${b.costoPuntos} pts${b.kindLabel ? ` · ${b.kindLabel}` : ''}`
      : b.kindLabel || b.descripcion || '',
    kicker: b.kindLabel || 'Beneficio',
    tone: 'beneficio',
    imageUrl: stripImageUrl(b.imageUrl, b.coverUrl, b.mediaUrl),
    raw: b,
  })),
)

const agendaCards = computed(() =>
  agenda.value.map((e) => ({
    id: e.id || e.eventId || `${e.origin}-${e.inicio}`,
    title: e.titulo || 'Evento',
    subtitle: formatShortDate(e.inicio) || (e.allDay ? 'Todo el día' : ''),
    kicker: e.origin === 'CORPORATE' ? 'Corporativo' : e.origin || 'Agenda',
    tone: 'agenda',
    imageUrl: stripImageUrl(e.imageUrl, e.coverUrl, e.media),
    raw: e,
  })),
)

const solicitudCards = computed(() =>
  solicitudes.value.map((r) => ({
    id: r.id,
    title: r.titulo || r.codigo || 'Solicitud',
    subtitle: [r.estadoLabel || r.estado, r.tipoNombre].filter(Boolean).join(' · '),
    unread: Boolean(r.needsCompletion),
    kicker: r.codigo || 'Solicitud',
    tone: 'solicitud',
    icon: 'inbox',
    imageUrl: stripImageUrl(r.mediaUrl, r.imageUrl, r.coverUrl),
    raw: r,
  })),
)

const encuestaCards = computed(() => {
  const sorted = [...encuestas.value].sort((a, b) => Number(Boolean(a.answered)) - Number(Boolean(b.answered)))
  return sorted.map((s) => ({
    id: s.id,
    title: s.titulo || 'Encuesta',
    subtitle: s.answered
      ? 'Respondida'
      : `${s.questionCount || 0} pregunta${s.questionCount === 1 ? '' : 's'}`,
    unread: !s.answered,
    kicker: s.answered ? 'Listo' : 'Pendiente',
    tone: 'encuesta',
    imageUrl: stripImageUrl(s.imageUrl, s.coverUrl, s.mediaUrl, s.portadaUrl),
    raw: s,
  }))
})

const filtersActive = computed(
  () => Boolean(filters.q?.trim() || filters.tipo || filters.origin),
)

const filterSummary = computed(() => {
  const parts = []
  if (filters.q?.trim()) parts.push(`“${filters.q.trim()}”`)
  if (filters.tipo) parts.push(TIPO_LABELS[filters.tipo] || filters.tipo)
  if (filters.origin) parts.push(ORIGIN_LABELS[filters.origin] || filters.origin)
  return parts.length ? `Filtro: ${parts.join(' · ')}` : ''
})

const hideMessage = computed(() => {
  const t = String(hideTarget.value?.titulo || '').trim()
  const short = t.length > 60 ? `${t.slice(0, 58)}…` : t
  return short
    ? `«${short}» va a desaparecer de tu muro. Solo vos dejás de verla; el resto de la comunidad sigue viéndola.`
    : 'Esta publicación va a desaparecer de tu muro. Solo vos dejás de verla.'
})

function openShare(p) {
  if (p?.id) shareTarget.value = p
}

function currentQ() {
  if (filters.q?.trim()) return filters.q.trim()
  if (props.searchQuery?.trim()) return props.searchQuery.trim()
  if (typeof route.query.q === 'string') return route.query.q.trim()
  return ''
}

function applyFilters(next) {
  filters.q = String(next?.q || '').trim()
  filters.tipo = next?.tipo || ''
  filters.origin = next?.origin || ''
  load(true)
}

function clearFilters() {
  applyFilters({ q: '', tipo: '', origin: '' })
}

function openPost(p) {
  if (p?.id) router.push(`/muro/${p.id}`)
}

async function loadAvisos() {
  avisosLoading.value = true
  try {
    const { data } = await api.get('/notifications', {
      params: { page: 1, limit: 12, status: 'all' },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    avisos.value = Array.isArray(data?.items) ? data.items : []
    if (data?.unreadCount != null) setNotifUnread(Number(data.unreadCount) || 0)
  } catch {
    avisos.value = []
  } finally {
    avisosLoading.value = false
  }
}

async function loadChats() {
  chatsLoading.value = true
  try {
    const { data } = await api.get('/chats', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    chats.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
    await refreshChatBadge()
  } catch {
    chats.value = []
  } finally {
    chatsLoading.value = false
  }
}

async function loadBeneficios() {
  beneficiosLoading.value = true
  try {
    const { data } = await api.get('/benefits', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    beneficios.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    beneficios.value = []
  } finally {
    beneficiosLoading.value = false
  }
}

async function loadAgenda() {
  agendaLoading.value = true
  try {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 45)
    const { data } = await api.get('/calendar/unified', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
        layers: 'CORPORATE',
      },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    agenda.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    agenda.value = []
  } finally {
    agendaLoading.value = false
  }
}

async function loadSolicitudes() {
  solicitudesLoading.value = true
  try {
    const { data } = await api.get('/requests', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    solicitudes.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    solicitudes.value = []
  } finally {
    solicitudesLoading.value = false
  }
}

async function loadEncuestas() {
  encuestasLoading.value = true
  try {
    const { data } = await api.get('/surveys', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    encuestas.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    encuestas.value = []
  } finally {
    encuestasLoading.value = false
  }
}

async function loadStrips({ force = false } = {}) {
  if (!force && stripsLoaded) return
  stripsLoaded = true
  await Promise.all([
    loadBeneficios(),
    loadAgenda(),
    loadSolicitudes(),
    loadEncuestas(),
    loadAvisos(),
    loadChats(),
  ])
}

async function openAviso(card) {
  const n = card?.raw || card
  if (!n?.id) return
  try {
    if (!n.readAt) {
      await api.post(`/notifications/${n.id}/read`)
      n.readAt = new Date().toISOString()
      const idx = avisos.value.findIndex((x) => x.id === n.id)
      if (idx >= 0) avisos.value[idx] = { ...avisos.value[idx], readAt: n.readAt }
      setNotifUnread(Math.max(0, notifUnread.value - 1))
    }
  } catch {
    /* igual navegamos */
  }
  const href = n.href || '/avisos'
  if (String(href).startsWith('http')) window.open(href, '_blank', 'noopener')
  else router.push(href)
}

function openChat(card) {
  const c = card?.raw || card
  if (c?.id) router.push(`/chat/${c.id}`)
}

function openBeneficio(card) {
  const b = card?.raw || card
  if (b?.id) router.push(`/beneficios/${b.id}`)
  else router.push('/beneficios')
}

function openAgenda(card) {
  const e = card?.raw || card
  if (e?.origin === 'CORPORATE' && (e.eventId || e.id)) {
    router.push(`/agenda/${e.eventId || e.id}`)
    return
  }
  if (e?.webLink) {
    window.open(e.webLink, '_blank', 'noopener')
    return
  }
  router.push('/agenda')
}

function openSolicitud(card) {
  const r = card?.raw || card
  if (r?.id) router.push(`/solicitudes/${r.id}`)
  else router.push('/solicitudes')
}

function openEncuesta(card) {
  const s = card?.raw || card
  if (s?.id) router.push(`/encuestas/${s.id}`)
  else router.push('/encuestas')
}

async function load(reset, { keepList = false } = {}) {
  error.value = ''
  if (reset) {
    page.value = 1
    // En pull-to-refresh no ocultamos la lista (evita parpadeo)
    if (!keepList) loading.value = true
  } else {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  }
  try {
    const { data } = await api.get('/posts/feed', {
      params: {
        page: page.value,
        size,
        q: currentQ() || undefined,
        tipo: filters.tipo || undefined,
        origin: filters.origin || undefined,
        // evita respuestas cacheadas del navegador al refrescar
        ...(reset ? { _t: Date.now() } : {}),
      },
      headers: reset
        ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        : undefined,
    })
    const next = data.items || []
    if (data.ugc && auth.tenant) auth.patchTenant({ ugc: data.ugc })
    items.value = reset ? next : [...items.value, ...next]
    total.value = data.total || 0
    hasMore.value = items.value.length < total.value
    if (next.length) page.value += 1
  } catch (e) {
    error.value =
      e.response?.status === 401
        ? 'Sesión inválida. Cerrá sesión e ingresá de nuevo.'
        : e.response?.data?.error || 'No se pudo cargar el muro.'
    if (reset && !keepList) items.value = []
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
    error.value = e.response?.data?.error || 'No se pudo reaccionar'
  }
}

async function toggleSave(p) {
  try {
    const { data } = await api.post(`/posts/${p.id}/save`)
    const idx = items.value.findIndex((x) => x.id === p.id)
    if (idx >= 0 && data.post) items.value[idx] = data.post
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

function askHide(p) {
  hideTarget.value = p
}

async function confirmHide() {
  const p = hideTarget.value
  if (!p?.id || hiding.value) return
  hiding.value = true
  error.value = ''
  try {
    await api.post(`/posts/${p.id}/hide`)
    items.value = items.value.filter((x) => x.id !== p.id)
    total.value = Math.max(0, total.value - 1)
    hideTarget.value = null
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ocultar la publicación'
  } finally {
    hiding.value = false
  }
}

const { pullDistance, refreshing, pulling, ready } = usePullToRefresh({
  getScrollEl: () => document.querySelector('.u-main'),
  onRefresh: async () => {
    await load(true, { keepList: true })
    if (viewMode.value === 'carousel') await loadStrips({ force: true })
  },
  threshold: 72,
})

const indicatorHeight = computed(() => {
  if (refreshing.value) return 52
  return Math.round(pullDistance.value)
})

watch(
  () => [props.searchQuery, route.query.q],
  () => load(true),
)

watch(viewMode, (mode) => {
  if (mode === 'carousel') loadStrips()
})

onMounted(() => {
  load(true)
  if (viewMode.value === 'carousel') loadStrips()
  const root = document.querySelector('.u-main')
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) load(false)
    },
    { root: root || null, rootMargin: '160px', threshold: 0.01 },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

watch(sentinel, (el, prev) => {
  if (prev && observer) observer.unobserve(prev)
  if (el && observer) observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.feed {
  background: var(--cx-page, #f1f5f9);
}
.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.15s ease;
  color: var(--cx-muted);
  font-size: 12px;
  font-weight: 600;
}
.pull-indicator.visible {
  opacity: 1;
}
.pull-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--brand-primary) 25%, transparent);
  border-top-color: var(--brand-primary);
  flex-shrink: 0;
  transform: rotate(0deg);
}
.pull-spinner.spin {
  animation: pull-spin 0.7s linear infinite;
}
@keyframes pull-spin {
  to {
    transform: rotate(360deg);
  }
}
.feed-hub {
  margin: 0;
}
.feed-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 8px;
}
.feed-section-left {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.feed-section-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--cx-text, #0f172a);
  line-height: 1.2;
}
.see-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  color: var(--brand-primary);
  cursor: pointer;
}
.feed-section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid var(--cx-border);
  border-radius: 999px;
  background: var(--cx-surface);
  padding: 2px;
  gap: 2px;
}
.view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cx-muted);
  cursor: pointer;
}
.view-btn.on {
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
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
@media (max-width: 420px) {
  .filter-btn span:not(.filter-dot) {
    display: none;
  }
  .filter-btn {
    padding: 8px;
  }
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
  margin: 0 16px 8px;
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
  margin: 10px 14px;
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
}
.carousel-empty {
  margin: 0 16px 8px;
  font-size: 13px;
  color: var(--cx-muted);
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
