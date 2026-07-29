<template>
  <section class="chat-detail">
    <header class="cd-head">
      <button type="button" class="back" aria-label="Volver" @click="router.push('/chat')">←</button>
      <div class="cd-titles">
        <h1>{{ chat?.title || 'Chat' }}</h1>
        <p v-if="chat?.kind === 'group'">Grupo · {{ chat.participants?.length || 0 }} personas</p>
        <p v-else-if="subtitle">{{ subtitle }}</p>
      </div>
      <button type="button" class="more" aria-label="Más" @click="menuOpen = !menuOpen">⋯</button>
    </header>

    <div v-if="menuOpen" class="menu">
      <button type="button" @click="askReport">Denunciar</button>
      <button
        v-if="chat?.kind === 'direct' && otherUser"
        type="button"
        class="danger"
        @click="blockOther"
      >
        Bloquear
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading && !messages.length" class="muted">Cargando…</p>

    <div ref="threadEl" class="thread">
      <button v-if="hasMore" type="button" class="load-more" :disabled="loadingMore" @click="loadOlder">
        {{ loadingMore ? 'Cargando…' : 'Mensajes anteriores' }}
      </button>
      <div
        v-for="m in messages"
        :key="m.id"
        class="bubble"
        :class="{ 'is-me': isMe(m), 'is-other': !isMe(m), pinned: m.pinnedAt }"
      >
        <p class="bubble-meta">
          <span v-if="!isMe(m)">{{ m.authorName }}</span>
          <span v-if="m.pinnedAt"> · Anclado</span>
          <span> · {{ formatDate(m.createdAt) }}</span>
        </p>
        <p v-if="m.deleted" class="bubble-text muted">Mensaje eliminado</p>
        <p v-else class="bubble-text">
          <template v-for="(part, i) in linkify(m.texto)" :key="i">
            <RouterLink v-if="part.type === 'route'" :to="part.to" class="bubble-link">{{ part.text }}</RouterLink>
            <a
              v-else-if="part.type === 'url'"
              :href="part.href"
              class="bubble-link"
              target="_blank"
              rel="noopener noreferrer"
              >{{ part.text }}</a
            >
            <span v-else>{{ part.text }}</span>
          </template>
        </p>
        <div v-if="m.adjuntos?.length" class="bubble-files">
          <a v-for="(a, i) in m.adjuntos" :key="i" :href="a.url" target="_blank" rel="noopener">
            {{ a.nombre || 'Adjunto' }}
          </a>
        </div>
        <div v-if="m.reactions?.length" class="reactions">
          <button
            v-for="r in m.reactions"
            :key="r.emoji"
            type="button"
            class="rx"
            :class="{ on: r.me }"
            @click="toggleReact(m, r.emoji)"
          >
            {{ r.emoji }} {{ r.count }}
          </button>
        </div>
        <div class="bubble-actions">
          <button type="button" @click="toggleReact(m, '👍')">👍</button>
          <button type="button" @click="togglePin(m)">{{ m.pinnedAt ? 'Desanclar' : 'Anclar' }}</button>
        </div>
      </div>
    </div>

    <form v-if="chat && !chat.closedAt && chat.canReply !== false" class="composer" @submit.prevent="send">
      <div v-if="pendingFile" class="pending">
        <span>{{ pendingFile.nombre }}</span>
        <button type="button" @click="pendingFile = null">×</button>
      </div>
      <div class="composer-row">
        <label class="attach" title="Adjuntar">
          <input type="file" accept="image/*,.pdf,video/mp4" hidden @change="onFile" />
          📎
        </label>
        <textarea
          v-model="draft"
          rows="1"
          placeholder="Escribí un mensaje… (@usuario)"
          @keydown.enter.exact.prevent="send"
        />
        <button type="submit" class="send" :disabled="sending || (!draft.trim() && !pendingFile)">
          {{ sending ? '…' : 'Enviar' }}
        </button>
      </div>
    </form>
    <p v-else-if="chat?.closedAt" class="closed">Este chat fue cerrado por moderación.</p>
    <p v-else-if="chat && chat.canReply === false" class="closed">
      Canal de solo lectura: no admite respuestas.
    </p>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useChatBadge } from '../composables/useChatBadge'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { refreshBadge } = useChatBadge()

const chat = ref(null)
const messages = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const error = ref('')
const draft = ref('')
const sending = ref(false)
const pendingFile = ref(null)
const menuOpen = ref(false)
const threadEl = ref(null)
let pollTimer = null
let fetchSeq = 0

const meId = computed(() => String(auth.user?.id || auth.user?._id || ''))

const otherUser = computed(() => {
  if (!chat.value || chat.value.kind !== 'direct') return null
  return (chat.value.participants || []).find((p) => String(p.id) !== meId.value) || null
})

const subtitle = computed(() => {
  if (!otherUser.value) return ''
  return otherUser.value.usuario ? `@${otherUser.value.usuario}` : ''
})

function isMe(m) {
  return String(m.authorId) === meId.value
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

/** Convierte /muro/:id y URLs http(s) en segmentos clickeables */
function linkify(raw) {
  const text = String(raw || '')
  if (!text) return [{ type: 'text', text: '' }]
  const re = /(\/muro\/[a-f0-9]{24})|(https?:\/\/[^\s<>"']+)/gi
  const parts = []
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: text.slice(last, m.index) })
    if (m[1]) {
      parts.push({ type: 'route', to: m[1], text: m[1] })
    } else if (m[2]) {
      parts.push({ type: 'url', href: m[2], text: m[2] })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', text }]
}

async function scrollBottom() {
  await nextTick()
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

async function loadChat() {
  const { data } = await api.get(`/chats/${route.params.id}`)
  chat.value = data?.chat || null
}

async function loadMessages({ older = false } = {}) {
  const seq = ++fetchSeq
  if (older) loadingMore.value = true
  else if (!messages.value.length) loading.value = true
  error.value = ''
  try {
    const params = { limit: 40 }
    if (older && messages.value.length) {
      params.before = messages.value[0].createdAt
    }
    const { data } = await api.get(`/chats/${route.params.id}/messages`, {
      params,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    if (seq !== fetchSeq) return
    const batch = Array.isArray(data?.items) ? data.items : []
    hasMore.value = Boolean(data?.hasMore)
    if (older) {
      messages.value = [...batch, ...messages.value]
    } else if (!messages.value.length) {
      messages.value = batch
      await scrollBottom()
    } else {
      const known = new Set(messages.value.map((m) => m.id))
      const fresh = batch.filter((m) => !known.has(m.id))
      if (fresh.length) {
        messages.value = [...messages.value, ...fresh]
        await scrollBottom()
      } else {
        // sync reactions/pins
        const byId = new Map(batch.map((m) => [m.id, m]))
        messages.value = messages.value.map((m) => byId.get(m.id) || m)
      }
    }
  } catch (e) {
    if (seq !== fetchSeq) return
    error.value = e.response?.data?.error || 'No se pudieron cargar mensajes'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function markRead() {
  try {
    await api.post(`/chats/${route.params.id}/read`)
    refreshBadge()
  } catch {
    /* ignore */
  }
}

async function loadOlder() {
  await loadMessages({ older: true })
}

async function onFile(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const { data } = await api.post('/chats/upload', fd)
    pendingFile.value = {
      url: data.url,
      nombre: data.nombre || file.name,
      mimeType: data.mimeType || file.type,
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo subir el archivo'
  }
}

async function send() {
  if (sending.value) return
  const texto = draft.value.trim()
  if (!texto && !pendingFile.value) return
  sending.value = true
  error.value = ''
  try {
    const body = { texto }
    if (pendingFile.value) body.adjuntos = [pendingFile.value]
    const { data } = await api.post(`/chats/${route.params.id}/messages`, body)
    draft.value = ''
    pendingFile.value = null
    if (data?.message) {
      messages.value.push(data.message)
      await scrollBottom()
    }
    await markRead()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo enviar'
  } finally {
    sending.value = false
  }
}

async function toggleReact(m, emoji) {
  try {
    const { data } = await api.post(`/chats/${route.params.id}/messages/${m.id}/react`, { emoji })
    if (data?.message) {
      const i = messages.value.findIndex((x) => x.id === m.id)
      if (i >= 0) messages.value[i] = data.message
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo reaccionar'
  }
}

async function togglePin(m) {
  try {
    const { data } = await api.post(`/chats/${route.params.id}/messages/${m.id}/pin`, {
      pin: !m.pinnedAt,
    })
    if (data?.message) {
      const i = messages.value.findIndex((x) => x.id === m.id)
      if (i >= 0) messages.value[i] = data.message
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo anclar'
  }
}

async function askReport() {
  menuOpen.value = false
  const reason = window.prompt('¿Por qué denunciás este chat?')
  if (!reason?.trim()) return
  try {
    await api.post(`/chats/${route.params.id}/report`, { reason: reason.trim() })
    error.value = ''
    window.alert('Denuncia enviada. Gracias.')
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo denunciar'
  }
}

async function blockOther() {
  menuOpen.value = false
  if (!otherUser.value) return
  if (!window.confirm(`¿Bloquear a ${otherUser.value.displayName}?`)) return
  try {
    await api.post('/chats/block', { userId: otherUser.value.id })
    router.push('/chat')
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo bloquear'
  }
}

function startPoll() {
  stopPoll()
  pollTimer = setInterval(() => {
    loadMessages()
  }, 6000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function boot() {
  loading.value = true
  messages.value = []
  try {
    await loadChat()
    await loadMessages()
    await markRead()
    startPoll()
  } catch (e) {
    error.value = e.response?.data?.error || 'Chat no encontrado'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, boot)
onMounted(boot)
onUnmounted(stopPoll)
</script>

<style scoped>
.chat-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
}
.cd-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 10px;
  border-bottom: 1px solid var(--cx-border);
  background: var(--cx-page);
}
.back,
.more {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: var(--cx-text);
  width: 36px;
  height: 36px;
}
.cd-titles {
  flex: 1;
  min-width: 0;
}
.cd-titles h1 {
  margin: 0;
  font-size: 1.05rem;
  font-family: var(--font-display);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cd-titles p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
}
.menu {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--cx-border);
  background: var(--cx-surface);
}
.menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 12px 16px;
  cursor: pointer;
  color: var(--cx-text);
  font-size: 14px;
}
.menu button.danger {
  color: var(--cx-danger, #b91c1c);
}
.thread {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}
.load-more {
  align-self: center;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--cx-muted);
}
.bubble {
  max-width: 88%;
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid var(--cx-border);
}
.bubble.is-me {
  align-self: flex-end;
  background: color-mix(in srgb, var(--brand-primary) 14%, var(--cx-surface));
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  margin-left: 18px;
}
.bubble.is-other {
  align-self: flex-start;
  background: var(--cx-surface);
  margin-right: 18px;
}
.bubble.pinned {
  box-shadow: inset 3px 0 0 var(--brand-primary);
}
.bubble-meta {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--cx-muted);
}
.bubble-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-text);
  white-space: pre-wrap;
  word-break: break-word;
}
.bubble-link {
  color: var(--brand-primary, #0f766e);
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.bubble-files {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bubble-files a {
  font-size: 13px;
  color: var(--brand-primary);
}
.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.rx {
  border: 1px solid var(--cx-border);
  background: var(--cx-page);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
.rx.on {
  border-color: var(--brand-primary);
}
.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  opacity: 0.7;
}
.bubble-actions button {
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--cx-muted);
  cursor: pointer;
  padding: 0;
}
.composer {
  flex-shrink: 0;
  border-top: 1px solid var(--cx-border);
  padding: 10px 12px max(14px, env(safe-area-inset-bottom));
  background: var(--cx-surface);
  z-index: 5;
}
.pending {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  color: var(--cx-muted);
}
.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.attach {
  cursor: pointer;
  font-size: 18px;
  padding: 6px;
}
.composer textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  max-height: 120px;
}
.send {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--brand-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.closed,
.muted,
.err {
  font-size: 13px;
  padding: 8px 14px;
  flex-shrink: 0;
}
.muted {
  color: var(--cx-muted);
}
.err {
  color: var(--cx-danger, #b91c1c);
}
.closed {
  text-align: center;
  color: var(--cx-muted);
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
</style>
