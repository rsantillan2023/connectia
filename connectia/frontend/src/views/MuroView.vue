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

    <HubQuickStrip compact surface="muro" class="feed-hub" @loaded="onHubLoaded" />

    <!-- Franja del color del header solo si hay botón de puntos a caballo (sin beneficios no hace falta). -->
    <div
      v-if="hubHasLinks && !hubOpen && showPtsBridge"
      class="muro-hub-spacer"
      aria-hidden="true"
    />

    <div v-if="showPtsBridge" class="muro-pts-bridge" :class="{ solo: !hubHasLinks }">
      <PointsHero bridge @open="goPointsEarn" />
    </div>

    <div v-if="liveCount > 0 && !liveBannerDismissed" class="live-banner">
      <RouterLink to="/en-vivo" class="live-banner-link">
        <span class="live-dot" aria-hidden="true" />
        Ver emisiones en vivo
      </RouterLink>
      <button
        type="button"
        class="live-banner-close"
        aria-label="Cerrar"
        @click="dismissLiveBanner"
      >
        ×
      </button>
    </div>

    <StoriesRail ref="storiesRail" />

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

    <p v-if="error && items.length" class="feed-banner">{{ error }}</p>
    <div v-if="loading && !items.length && !refreshing" class="feed-empty">Cargando novedades…</div>

    <FeedEmptyState
      v-else-if="!loading && !items.length && loadIssue"
      :kind="loadIssue.kind"
      :title="loadIssue.title"
      :text="loadIssue.text"
      @retry="load(true)"
    />
    <FeedEmptyState
      v-else-if="!loading && !items.length"
      kind="empty"
      icon="inbox"
      :title="filtersActive ? 'Sin resultados' : 'Todavía no hay novedades'"
      :text="
        filtersActive
          ? 'No hay publicaciones que coincidan con el filtro.'
          : 'Cuando haya información en el muro, va a aparecer acá.'
      "
    />

    <NovedadesCarousel
      v-if="viewMode === 'carousel' && items.length"
      :items="items"
      :loading-more="loadingMore"
      @open="openPost"
      @need-more="load(false)"
    />

    <template v-if="viewMode === 'carousel' && !(!items.length && loadIssue)">
      <MuroStripSection
        title="Beneficios"
        tone="beneficio"
        default-kicker="Beneficio"
        collapsible
        collapse-key="cx.muro.strip.beneficios"
        :items="beneficioCards"
        @see-all="router.push('/beneficios')"
        @open="openBeneficio"
      />
      <MuroStripSection
        title="Agenda"
        tone="agenda"
        default-kicker="Evento"
        collapsible
        collapse-key="cx.muro.strip.agenda"
        :items="agendaCards"
        @see-all="router.push('/agenda')"
        @open="openAgenda"
      />
      <MuroStripSection
        title="Solicitudes y aprobaciones"
        tone="solicitud"
        default-kicker="Pendiente"
        default-icon="inbox"
        variant="tiles"
        collapsible
        collapse-key="cx.muro.strip.solicitudes"
        :items="procesoCards"
        @see-all="seeAllProcesos"
        @open="openProceso"
      />
      <MuroStripSection
        title="Encuestas"
        tone="encuesta"
        default-kicker="Encuesta"
        collapsible
        collapse-key="cx.muro.strip.encuestas"
        :items="encuestaCards"
        @see-all="router.push('/encuestas')"
        @open="openEncuesta"
      />
      <MuroStripSection
        title="Avisos"
        tone="aviso"
        variant="pager"
        default-kicker="Aviso"
        collapsible
        collapse-key="cx.muro.strip.avisos"
        :items="avisoCards"
        @see-all="router.push('/avisos')"
        @open="openAviso"
      />
      <MuroStripSection
        title="Chat"
        tone="chat"
        variant="avatars"
        default-kicker="Chat"
        collapsible
        collapse-key="cx.muro.strip.chat"
        :items="chatCards"
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
      :section="filters.section"
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
import StoriesRail from '../components/StoriesRail.vue'
import PointsHero from '../components/PointsHero.vue'
import ReactionBar from '../components/ReactionBar.vue'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { useAuthStore } from '../stores/auth'
import { useNotifBadge } from '../composables/useNotifBadge'
import { useChatBadge } from '../composables/useChatBadge'
import { useMuroHubStrip } from '../composables/useMuroHubStrip'
import { mediaKind, resolveMediaUrl } from '../utils/media'
import { describeLoadError, friendlyErrorMessage } from '../utils/networkError'
import FeedEmptyState from '../components/FeedEmptyState.vue'

const VIEW_KEY = 'cx.muro.novedadesView'
const LIVE_BANNER_DISMISS_KEY = 'cx.muro.live_banner_dismiss'
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
const liveCount = ref(0)
const loadIssue = ref(null)
const liveBannerDismissed = ref(
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LIVE_BANNER_DISMISS_KEY) === '1',
)

function dismissLiveBanner() {
  liveBannerDismissed.value = true
  try {
    sessionStorage.setItem(LIVE_BANNER_DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}
/** Hay franja de enlaces en el muro (si no, el botón de puntos no sube bajo el header). */
const hubHasLinks = ref(false)
const { expanded: hubOpen, setHasLinks } = useMuroHubStrip()

/** Misma regla que PointsHero: sin beneficios no reservar spacer/puente (caso 3). */
const showPtsBridge = computed(() => {
  const u = auth.user?.capabilities || []
  const tCaps = auth.tenant?.capabilities || []
  const caps = [...new Set([...u, ...tCaps])]
  return caps.includes('beneficios.billetera') || caps.includes('beneficios')
})

function onHubLoaded(payload) {
  const has = Boolean(payload?.hasLinks ?? payload?.categories?.length)
  hubHasLinks.value = has
  setHasLinks(has)
}
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
const filters = reactive({ q: '', tipo: '', origin: '', section: '', knowledge: false })
const storiesRail = ref(null)
const viewMode = ref(readViewMode())
const avisos = ref([])
const chats = ref([])
const beneficios = ref([])
const agenda = ref([])
const solicitudes = ref([])
const aprobaciones = ref([])
const encuestas = ref([])
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
    kicker: 'Aviso',
    tone: 'aviso',
    icon: 'bell',
    raw: n,
  })),
)

const chatCards = computed(() => {
  const meId = String(auth.user?.id || auth.user?._id || '')
  const list = [...chats.value].sort((a, b) => {
    const ua = Number(Boolean(a.unread))
    const ub = Number(Boolean(b.unread))
    if (ub !== ua) return ub - ua
    return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
  })
  return list.slice(0, 16).map((c) => {
    const peers = (c.participants || []).filter((p) => String(p?.id || '') !== meId)
    const peer = peers.find((p) => p?.nombre || p?.displayName || p?.usuario) || peers[0]
    const nombre = String(peer?.nombre || '').trim()
    const apellido = String(peer?.apellido || '').trim()
    let nameLines = []
    if (c.kind === 'direct' && (nombre || apellido)) {
      nameLines = [nombre, apellido].filter(Boolean)
    } else {
      const full = String(c.title || peer?.displayName || peer?.usuario || 'Chat').trim()
      const parts = full.split(/\s+/).filter(Boolean)
      nameLines = parts.length >= 2 ? [parts[0], parts.slice(1).join(' ')] : [full || 'Chat']
    }
    const name = nameLines.join(' ') || 'Chat'
    const initials = nameLines
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
    return {
      id: c.id,
      title: name,
      nameLines: nameLines.slice(0, 2),
      initials,
      imageUrl: resolveMediaUrl(c.avatarUrl || peer?.avatarUrl || ''),
      unread: Boolean(c.unread),
      unreadCount: Number(c.unreadCount) || (c.unread ? 1 : 0),
      tone: 'chat',
      raw: c,
    }
  })
})

const beneficioCards = computed(() =>
  beneficios.value.map((b) => ({
    id: b.id,
    title: b.displayTitle || b.nombreComercial || b.titulo || 'Beneficio',
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

const SOLICITUD_STATUS_ICONS = {
  abierta: 'inbox',
  en_proceso: 'sparkles',
  a_completar: 'alert',
  en_espera: 'clock',
  escalada: 'alert',
  resuelta: 'check',
  cerrada: 'check',
  cancelada: 'close',
}

const APROBACION_STATUS_ICONS = {
  pendiente: 'clock',
  en_curso: 'sparkles',
  aprobado: 'check',
  rechazado: 'close',
  cancelado: 'close',
}

const APROBACION_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
}

const solicitudCards = computed(() =>
  solicitudes.value.map((r) => {
    const statusKey = String(r.estado || '').trim()
    return {
      id: `sol-${r.id}`,
      kind: 'solicitud',
      title: r.titulo || r.codigo || 'Solicitud',
      subtitle: [r.estadoLabel || r.estado, r.tipoNombre].filter(Boolean).join(' · '),
      unread: Boolean(r.needsCompletion),
      kicker: r.codigo || 'Solicitud',
      tone: 'solicitud',
      icon: 'inbox',
      typeLabel: r.tipoNombre || r.tipo?.nombre || 'Solicitud',
      typeIcon: 'clipboard',
      statusKey,
      statusLabel: r.estadoLabel || r.estado || '',
      statusIcon: SOLICITUD_STATUS_ICONS[statusKey] || 'inbox',
      imageUrl: stripImageUrl(r.mediaUrl, r.imageUrl, r.coverUrl),
      raw: r,
    }
  }),
)

const aprobacionCards = computed(() =>
  aprobaciones.value.map((a) => {
    const statusKey = String(a.status || '').trim()
    const typeLabel = a.origen?.moduleLabel || a.definitionName || 'Aprobación'
    return {
      id: `apr-${a.id}`,
      kind: 'aprobacion',
      title: a.origen?.titulo || a.definitionName || 'Aprobación pendiente',
      subtitle: [a.solicitanteName, a.currentStep?.nombre].filter(Boolean).join(' · '),
      unread: Boolean(a.canDecide),
      kicker: 'Aprobación',
      tone: 'solicitud',
      icon: 'check',
      typeLabel,
      typeIcon: 'check',
      statusKey,
      statusLabel: a.canDecide
        ? 'Para aprobar'
        : APROBACION_STATUS_LABELS[statusKey] || a.status || 'Pendiente',
      statusIcon: a.canDecide ? 'alert' : APROBACION_STATUS_ICONS[statusKey] || 'check',
      raw: a,
    }
  }),
)

/** Aprobaciones primero (acción), luego solicitudes. */
const procesoCards = computed(() => [...aprobacionCards.value, ...solicitudCards.value].slice(0, 16))

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
  () => Boolean(filters.q?.trim() || filters.tipo || filters.origin || filters.section || filters.knowledge),
)

const filterSummary = computed(() => {
  const parts = []
  if (filters.q?.trim()) parts.push(`“${filters.q.trim()}”`)
  if (filters.tipo) parts.push(TIPO_LABELS[filters.tipo] || filters.tipo)
  if (filters.origin) parts.push(ORIGIN_LABELS[filters.origin] || filters.origin)
  if (filters.section) parts.push(filters.section)
  if (filters.knowledge) parts.push('Conocimiento')
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
  filters.section = String(next?.section || '').trim()
  filters.knowledge = Boolean(next?.knowledge)
  load(true)
}

function clearFilters() {
  applyFilters({ q: '', tipo: '', origin: '', section: '', knowledge: false })
}

/** Deep links externos: /muro?tipo=&origin=&section=&knowledge=1&q= (Ola 3 · 04.15) */
function syncFiltersFromRoute() {
  const q = route.query
  const knowledgeRaw = String(q.knowledge ?? q.isKnowledge ?? '').toLowerCase()
  filters.tipo = typeof q.tipo === 'string' ? q.tipo.trim().toLowerCase() : filters.tipo
  filters.origin = typeof q.origin === 'string' ? q.origin.trim().toLowerCase() : filters.origin
  filters.section = typeof q.section === 'string' ? q.section.trim() : filters.section
  if (q.knowledge != null || q.isKnowledge != null) {
    filters.knowledge =
      knowledgeRaw === '1' ||
      knowledgeRaw === 'true' ||
      knowledgeRaw === 'si' ||
      knowledgeRaw === 'sí' ||
      knowledgeRaw === 'yes'
  }
  if (typeof q.q === 'string' && q.q.trim()) filters.q = q.q.trim()
}

function openPost(p) {
  if (p?.id) router.push(`/muro/${p.id}`)
}

function goPointsEarn() {
  router.push('/beneficios')
}

async function loadAvisos() {
  try {
    const { data } = await api.get('/notifications', {
      params: { page: 1, limit: 12, status: 'all' },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    avisos.value = Array.isArray(data?.items) ? data.items : []
    if (data?.unreadCount != null) setNotifUnread(Number(data.unreadCount) || 0)
  } catch {
    avisos.value = []
  }
}

async function loadChats() {
  try {
    const { data } = await api.get('/chats', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    chats.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
    await refreshChatBadge()
  } catch {
    chats.value = []
  }
}

async function loadBeneficios() {
  try {
    const { data } = await api.get('/benefits', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    beneficios.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    beneficios.value = []
  }
}

async function loadAgenda() {
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
  }
}

async function loadProcesos() {
  try {
    const [solRes, aprRes] = await Promise.allSettled([
      api.get('/requests', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }),
      api.get('/approvals', {
        params: { scope: 'mine', page: 1, limit: 12 },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }),
    ])
    solicitudes.value =
      solRes.status === 'fulfilled' && Array.isArray(solRes.value?.data?.items)
        ? solRes.value.data.items.slice(0, 12)
        : []
    const aprItems =
      aprRes.status === 'fulfilled' && Array.isArray(aprRes.value?.data?.items)
        ? aprRes.value.data.items
        : []
    // Priorizar las que el usuario puede decidir; si no hay flag, traer las abiertas
    const pending = aprItems.filter((a) => a.canDecide || ['pendiente', 'en_curso'].includes(a.status))
    aprobaciones.value = (pending.length ? pending : aprItems).slice(0, 12)
  } catch {
    solicitudes.value = []
    aprobaciones.value = []
  }
}

async function loadEncuestas() {
  try {
    const { data } = await api.get('/surveys', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    encuestas.value = Array.isArray(data?.items) ? data.items.slice(0, 12) : []
  } catch {
    encuestas.value = []
  }
}

async function loadStrips({ force = false } = {}) {
  if (!force && stripsLoaded) return
  stripsLoaded = true
  await Promise.all([
    loadBeneficios(),
    loadAgenda(),
    loadProcesos(),
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

function seeAllProcesos() {
  if (aprobacionCards.value.length && !solicitudCards.value.length) {
    router.push('/aprobaciones')
    return
  }
  if (solicitudCards.value.length && !aprobacionCards.value.length) {
    router.push('/solicitudes')
    return
  }
  router.push('/aprobaciones')
}

function openProceso(card) {
  if (card?.kind === 'aprobacion') {
    const a = card?.raw || card
    if (a?.origen?.deepLink && String(a.origen.deepLink).startsWith('/') && a.origen.deepLink !== '/aprobaciones') {
      router.push(a.origen.deepLink)
      return
    }
    router.push('/aprobaciones')
    return
  }
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
  if (reset && !keepList) loadIssue.value = null
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
        section: filters.section || undefined,
        knowledge: filters.knowledge ? 1 : undefined,
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
    loadIssue.value = null
  } catch (e) {
    const issue = describeLoadError(e, 'No se pudo cargar el muro.')
    if (reset && !keepList) {
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
    if (idx >= 0 && data.post) items.value[idx] = data.post
  } catch (e) {
    error.value = friendlyErrorMessage(e, 'No se pudo guardar')
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
    error.value = friendlyErrorMessage(e, 'No se pudo ocultar la publicación')
  } finally {
    hiding.value = false
  }
}

const { pullDistance, refreshing, pulling, ready } = usePullToRefresh({
  getScrollEl: () => document.querySelector('.u-main'),
  onRefresh: async () => {
    await load(true, { keepList: true })
    storiesRail.value?.reload?.()
    if (viewMode.value === 'carousel') await loadStrips({ force: true })
  },
  threshold: 72,
})

const indicatorHeight = computed(() => {
  if (refreshing.value) return 52
  return Math.round(pullDistance.value)
})

watch(
  () => [props.searchQuery, route.query.q, route.query.tipo, route.query.origin, route.query.section, route.query.knowledge],
  () => {
    syncFiltersFromRoute()
    load(true)
  },
)

watch(viewMode, (mode) => {
  if (mode === 'carousel') loadStrips()
})

onMounted(() => {
  syncFiltersFromRoute()
  load(true)
  if (viewMode.value === 'carousel') loadStrips()
  api
    .get('/live/active')
    .then(({ data }) => {
      const n = Array.isArray(data?.items) ? data.items.length : data?.liveNow ? 1 : 0
      liveCount.value = n
    })
    .catch(() => {
      liveCount.value = 0
    })
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
  position: relative;
  z-index: 1;
  margin: 0;
  overflow: visible;
}
.muro-hub-spacer {
  height: 44px;
  margin: 0;
  background: var(--brand-primary, #0f766e);
  pointer-events: none;
}
.muro-pts-bridge {
  position: relative;
  z-index: 5;
  margin: -28px 16px 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.muro-pts-bridge.solo {
  margin: 12px 16px 8px;
}
.muro-pts-bridge :deep(.pts-hero) {
  pointer-events: auto;
  position: relative;
  width: 100%;
  max-width: 100%;
}
.live-banner {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 8px 16px 0;
  padding: 4px 4px 4px 12px;
  border-radius: 12px;
  background: #fef2f2;
  color: #991b1b;
  font-weight: 700;
  font-size: 0.92rem;
}
.live-banner-link {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  color: inherit;
  text-decoration: none;
}
.live-banner-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #991b1b;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}
.live-banner-close:hover {
  background: rgba(153, 27, 27, 0.08);
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
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
