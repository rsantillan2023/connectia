<template>
  <section class="avisos">
    <header class="avisos-head">
      <button type="button" class="avisos-back" aria-label="Volver al muro" @click="router.push('/muro')">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M15 5L8 12l7 7"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <div class="avisos-head-text">
        <h1>Avisos</h1>
        <p v-if="unreadCount">{{ unreadCount }} sin leer</p>
        <p v-else>Tu bandeja de notificaciones</p>
      </div>
      <button
        v-if="unreadCount"
        type="button"
        class="avisos-all"
        :disabled="busy"
        @click="askMarkAll"
      >
        Marcar todas leídas
      </button>
    </header>

    <div class="avisos-filters" role="tablist" aria-label="Filtrar avisos">
      <button
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': statusFilter === 'all' }"
        :aria-selected="statusFilter === 'all'"
        @click="setFilter('all')"
      >
        Todas
      </button>
      <button
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': statusFilter === 'unread' }"
        :aria-selected="statusFilter === 'unread'"
        @click="setFilter('unread')"
      >
        No leídas
      </button>
      <button
        type="button"
        class="chip"
        role="tab"
        :class="{ 'is-active': statusFilter === 'read' }"
        :aria-selected="statusFilter === 'read'"
        @click="setFilter('read')"
      >
        Leídas
      </button>
    </div>

    <p v-if="error" class="avisos-err">{{ error }}</p>
    <p v-if="loading && !items.length" class="avisos-muted">Cargando…</p>

    <ul class="avisos-list">
      <li v-for="n in items" :key="n.id" class="aviso" :class="{ unread: isUnreadItem(n) }">
        <button type="button" class="aviso-main" @click="open(n)">
          <span class="aviso-dot" aria-hidden="true" />
          <div class="aviso-body">
            <strong>{{ n.title }}</strong>
            <p v-if="n.body">{{ n.body }}</p>
            <time>{{ formatDate(n.createdAt) }}</time>
          </div>
        </button>
        <div class="aviso-actions">
          <button
            v-if="isUnreadItem(n)"
            type="button"
            class="aviso-act"
            title="Marcar como leída"
            @click="markOne(n)"
          >
            Marcar leída
          </button>
          <span v-else class="aviso-status" title="Ya leída">Leída</span>
          <button type="button" class="aviso-act danger" title="Descartar" @click="dismiss(n)">
            ×
          </button>
        </div>
      </li>
    </ul>

    <p v-if="!loading && !items.length" class="avisos-muted center">
      {{ emptyMessage }}
    </p>

    <button
      v-if="hasMore"
      type="button"
      class="avisos-more"
      :disabled="loading"
      @click="loadMore"
    >
      {{ loading ? 'Cargando…' : 'Ver más' }}
    </button>

    <ConfirmSheet
      v-if="markAllConfirmOpen"
      title="¿Marcar todas como leídas?"
      :message="markAllMessage"
      confirm-label="Sí, marcar todas"
      cancel-label="Cancelar"
      busy-label="Marcando…"
      :busy="busy"
      @confirm="confirmMarkAll"
      @cancel="markAllConfirmOpen = false"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useNotifBadge } from '../composables/useNotifBadge'
import ConfirmSheet from '../components/ConfirmSheet.vue'

const router = useRouter()
const { setUnread, refreshBadge } = useNotifBadge()

const items = ref([])
const loading = ref(false)
const busy = ref(false)
const markAllConfirmOpen = ref(false)
const error = ref('')
const page = ref(1)
const hasMore = ref(false)
/** @type {import('vue').Ref<'all' | 'unread' | 'read'>} */
const statusFilter = ref('all')
const serverUnread = ref(0)
let fetchSeq = 0

const unreadCount = computed(() => serverUnread.value)

const markAllMessage = computed(() => {
  const n = unreadCount.value
  if (n === 1) return 'Se va a marcar 1 aviso como leído.'
  return `Se van a marcar ${n} avisos como leídos.`
})

const emptyMessage = computed(() => {
  if (statusFilter.value === 'unread') return 'No tenés avisos sin leer.'
  if (statusFilter.value === 'read') return 'No tenés avisos leídos.'
  return 'No hay avisos todavía.'
})

function isUnreadItem(n) {
  return n == null || n.readAt == null || n.readAt === ''
}

function applyStatusFilter(batch) {
  if (statusFilter.value === 'unread') return batch.filter(isUnreadItem)
  if (statusFilter.value === 'read') return batch.filter((n) => !isUnreadItem(n))
  return batch
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function listParams() {
  const params = {
    page: page.value,
    limit: 30,
    status: statusFilter.value,
  }
  if (statusFilter.value === 'unread') params.unread = '1'
  if (statusFilter.value === 'read') params.read = '1'
  return params
}

async function fetchPage({ reset = false } = {}) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  const seq = ++fetchSeq
  const requested = statusFilter.value
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/notifications', {
      params: listParams(),
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    if (seq !== fetchSeq || requested !== statusFilter.value) return
    const raw = Array.isArray(data?.items) ? data.items : []
    const batch = applyStatusFilter(raw)
    items.value = reset ? batch : [...items.value, ...batch]
    hasMore.value = Boolean(data?.hasMore)
    serverUnread.value = Number(data?.unreadCount) || 0
    setUnread(serverUnread.value)
  } catch (e) {
    if (seq !== fetchSeq) return
    error.value = e.response?.data?.error || 'No se pudieron cargar los avisos'
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

function setFilter(next) {
  if (statusFilter.value === next && !loading.value) {
    fetchPage({ reset: true })
    return
  }
  statusFilter.value = next
  fetchPage({ reset: true })
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  fetchPage()
}

async function markOne(n) {
  try {
    await api.post(`/notifications/${n.id}/read`)
    n.readAt = new Date().toISOString()
    serverUnread.value = Math.max(0, serverUnread.value - 1)
    setUnread(serverUnread.value)
    if (statusFilter.value === 'unread') items.value = items.value.filter((x) => x.id !== n.id)
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo marcar'
  }
}

function askMarkAll() {
  if (!unreadCount.value || busy.value) return
  markAllConfirmOpen.value = true
}

async function confirmMarkAll() {
  busy.value = true
  try {
    await api.post('/notifications/read-all')
    for (const n of items.value) n.readAt = n.readAt || new Date().toISOString()
    serverUnread.value = 0
    setUnread(0)
    if (statusFilter.value === 'unread') items.value = []
    else if (statusFilter.value === 'all') {
      await fetchPage({ reset: true })
    }
    markAllConfirmOpen.value = false
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo marcar todas'
  } finally {
    busy.value = false
  }
}

async function dismiss(n) {
  try {
    await api.post(`/notifications/${n.id}/dismiss`)
    const wasUnread = isUnreadItem(n)
    items.value = items.value.filter((x) => x.id !== n.id)
    if (wasUnread) {
      serverUnread.value = Math.max(0, serverUnread.value - 1)
      setUnread(serverUnread.value)
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo descartar'
  }
}

async function open(n) {
  if (isUnreadItem(n)) await markOne(n)
  const href = n.href || '/'
  if (href.startsWith('http')) window.open(href, '_blank', 'noopener')
  else router.push(href)
}

onMounted(async () => {
  await fetchPage({ reset: true })
  refreshBadge()
})
</script>

<style scoped>
.avisos {
  padding: 16px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.avisos-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.avisos-back {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin: -4px 0 0 -8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--cx-text, #0f172a);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.avisos-back:active {
  background: color-mix(in srgb, var(--cx-muted, #64748b) 12%, transparent);
}
.avisos-head-text {
  flex: 1;
  min-width: 0;
}
.avisos-head h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}
.avisos-head p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--cx-muted, #64748b);
}
.avisos-all {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 0;
  white-space: nowrap;
}
.avisos-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--cx-muted, #64748b) 12%, transparent);
  color: var(--cx-muted, #64748b);
  cursor: pointer;
}
/* Activo en tinta neutra: en tenants con brand rojo (p.ej. Arcor) el primary
   hacía que el chip elegido se viera “en error” y confundía No leídas / Leídas. */
.chip.is-active {
  background: var(--cx-text, #0f172a);
  color: var(--cx-surface, #fff);
  border-color: transparent;
}
.avisos-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.aviso {
  display: flex;
  align-items: stretch;
  gap: 4px;
  border-radius: 14px;
  background: var(--cx-surface, #fff);
  border: 1px solid var(--cx-border, #e2e8f0);
  overflow: hidden;
}
.aviso.unread {
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, var(--cx-surface, #fff));
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 28%, transparent);
}
.aviso-main {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 10px;
  text-align: left;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 12px;
  cursor: pointer;
  font: inherit;
}
.aviso-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 999px;
  flex-shrink: 0;
  background: transparent;
}
.aviso.unread .aviso-dot {
  background: var(--brand-primary, #0f766e);
}
.aviso-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aviso-body strong {
  font-size: 0.95rem;
}
.aviso-body p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--cx-muted, #64748b);
  line-height: 1.35;
}
.aviso-body time {
  font-size: 0.75rem;
  color: var(--cx-muted, #64748b);
}
.aviso-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 8px 8px 8px 0;
}
.aviso-act {
  border: 0;
  background: transparent;
  color: var(--brand-primary, #0f766e);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
}
.aviso-act.danger {
  color: #94a3b8;
  font-size: 1rem;
  line-height: 1;
}
.aviso-status {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cx-muted, #64748b);
  padding: 4px 6px;
  white-space: nowrap;
}
.avisos-err {
  margin: 0;
  color: #b91c1c;
  font-size: 0.9rem;
}
.avisos-muted {
  margin: 0;
  color: var(--cx-muted, #64748b);
  font-size: 0.9rem;
}
.avisos-muted.center {
  text-align: center;
  padding: 24px 8px;
}
.avisos-more {
  border: 0;
  border-radius: 12px;
  padding: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--brand-primary, #0f766e);
  cursor: pointer;
}
</style>
