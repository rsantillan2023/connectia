<template>
  <section class="chat-list">
    <header class="chat-head">
      <div>
        <h1>Chat</h1>
        <p v-if="unreadCount">{{ unreadCount }} sin leer</p>
        <p v-else>Mensajes de tu comunidad</p>
      </div>
      <button type="button" class="btn-new" @click="openNew = true">Nuevo</button>
    </header>

    <div class="chat-search">
      <input v-model="q" type="search" placeholder="Buscar conversación…" @input="onSearch" />
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading && !items.length" class="muted">Cargando…</p>

    <ul class="threads">
      <li v-for="c in items" :key="c.id">
        <button type="button" class="thread" :class="{ unread: c.unread }" @click="open(c)">
          <span class="avatar" aria-hidden="true">{{ initials(c) }}</span>
          <div class="thread-body">
            <div class="thread-top">
              <strong>{{ c.title }}</strong>
              <time v-if="c.lastMessageAt">{{ formatDate(c.lastMessageAt) }}</time>
            </div>
            <p class="preview">
              <span v-if="c.kind === 'group'" class="tag">Grupo</span>
              <span v-if="c.createdByAdmin" class="tag">Aviso</span>
              <span v-if="c.allowReplies === false" class="tag mute">Solo lectura</span>
              {{ c.lastMessagePreview || 'Sin mensajes' }}
            </p>
          </div>
          <span v-if="c.unread" class="dot" aria-label="Sin leer" />
        </button>
      </li>
    </ul>

    <p v-if="!loading && !items.length" class="muted center">
      {{ q ? 'Sin resultados.' : 'Todavía no tenés chats. Tocá Nuevo para empezar.' }}
    </p>

    <Teleport to="body">
      <div v-if="openNew" class="sheet-root" @keydown.esc="closeNew">
        <button type="button" class="sheet-backdrop" aria-label="Cerrar" @click="closeNew" />
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Nuevo chat">
          <header class="sheet-head">
            <h2>Nuevo chat</h2>
            <button type="button" class="sheet-x" @click="closeNew">×</button>
          </header>

          <div class="tabs">
            <button type="button" class="tab" :class="{ on: newMode === 'direct' }" @click="newMode = 'direct'">
              1:1
            </button>
            <button
              v-if="allowGroups"
              type="button"
              class="tab"
              :class="{ on: newMode === 'group' }"
              @click="newMode = 'group'"
            >
              Grupo
            </button>
          </div>

          <input
            v-model="dirQ"
            type="search"
            class="sheet-input"
            placeholder="Buscar persona…"
            @input="searchDirectory"
          />

          <div v-if="newMode === 'group'" class="group-fields">
            <input v-model="groupTitle" type="text" class="sheet-input" placeholder="Nombre del grupo" maxlength="80" />
            <p class="hint">Elegí al menos un miembro</p>
          </div>

          <ul class="dir-list">
            <li v-for="u in directory" :key="u.id">
              <label class="dir-item">
                <input
                  v-if="newMode === 'group'"
                  type="checkbox"
                  :value="u.id"
                  v-model="pickedIds"
                />
                <button
                  v-else
                  type="button"
                  class="dir-btn"
                  :disabled="creating"
                  @click="startDirect(u)"
                >
                  <span class="avatar sm">{{ initialsUser(u) }}</span>
                  <span>
                    <strong>{{ u.displayName }}</strong>
                    <small>@{{ u.usuario }}</small>
                  </span>
                </button>
                <template v-if="newMode === 'group'">
                  <span class="avatar sm">{{ initialsUser(u) }}</span>
                  <span>
                    <strong>{{ u.displayName }}</strong>
                    <small>@{{ u.usuario }}</small>
                  </span>
                </template>
              </label>
            </li>
          </ul>
          <p v-if="!directory.length && !dirLoading" class="muted center">No hay personas</p>

          <button
            v-if="newMode === 'group'"
            type="button"
            class="btn-primary"
            :disabled="creating || !groupTitle.trim() || pickedIds.length < 1"
            @click="startGroup"
          >
            {{ creating ? 'Creando…' : 'Crear grupo' }}
          </button>
          <p v-if="newError" class="err">{{ newError }}</p>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useChatBadge } from '../composables/useChatBadge'

const router = useRouter()
const { unreadCount, setUnread, refreshBadge } = useChatBadge()

const items = ref([])
const loading = ref(false)
const error = ref('')
const q = ref('')
const allowGroups = ref(true)
const openNew = ref(false)
const newMode = ref('direct')
const directory = ref([])
const dirQ = ref('')
const dirLoading = ref(false)
const creating = ref(false)
const newError = ref('')
const groupTitle = ref('')
const pickedIds = ref([])
let searchTimer = null
let dirTimer = null
let fetchSeq = 0

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function initials(c) {
  const t = String(c?.title || '?')
  return t.slice(0, 2).toUpperCase()
}

function initialsUser(u) {
  const n = String(u?.displayName || u?.usuario || '?')
  return n.slice(0, 2).toUpperCase()
}

async function fetchList() {
  const seq = ++fetchSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/chats', {
      params: { q: q.value || undefined },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    if (seq !== fetchSeq) return
    items.value = Array.isArray(data?.items) ? data.items : []
    if (data?.config?.allowGroups === false) allowGroups.value = false
    const n = items.value.filter((c) => c.unread).length
    setUnread(n)
  } catch (e) {
    if (seq !== fetchSeq) return
    error.value = e.response?.data?.error || 'No se pudo cargar el chat'
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchList, 250)
}

function open(c) {
  router.push(`/chat/${c.id}`)
}

function closeNew() {
  openNew.value = false
  newError.value = ''
  pickedIds.value = []
  groupTitle.value = ''
}

async function searchDirectory() {
  clearTimeout(dirTimer)
  dirTimer = setTimeout(async () => {
    dirLoading.value = true
    try {
      const { data } = await api.get('/chats/directory', { params: { q: dirQ.value || undefined } })
      directory.value = Array.isArray(data?.items) ? data.items : []
    } catch {
      directory.value = []
    } finally {
      dirLoading.value = false
    }
  }, 200)
}

async function startDirect(u) {
  creating.value = true
  newError.value = ''
  try {
    const { data } = await api.post('/chats', { kind: 'direct', participantId: u.id })
    closeNew()
    router.push(`/chat/${data.chat.id}`)
  } catch (e) {
    newError.value = e.response?.data?.error || 'No se pudo crear el chat'
  } finally {
    creating.value = false
  }
}

async function startGroup() {
  creating.value = true
  newError.value = ''
  try {
    const { data } = await api.post('/chats', {
      kind: 'group',
      title: groupTitle.value.trim(),
      memberIds: pickedIds.value,
    })
    closeNew()
    router.push(`/chat/${data.chat.id}`)
  } catch (e) {
    newError.value = e.response?.data?.error || 'No se pudo crear el grupo'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await fetchList()
  refreshBadge()
  searchDirectory()
})
</script>

<style scoped>
.chat-list {
  padding: 12px 14px 28px;
}
.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.chat-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.55rem;
  color: var(--cx-text);
}
.chat-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
}
.btn-new {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: var(--brand-primary);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.chat-search input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 12px;
}
.threads {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.thread {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  color: inherit;
}
.thread.unread {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--cx-surface));
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand-primary) 18%, var(--cx-surface));
  color: var(--brand-primary);
  flex-shrink: 0;
}
.avatar.sm {
  width: 34px;
  height: 34px;
  font-size: 11px;
}
.thread-body {
  flex: 1;
  min-width: 0;
}
.thread-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.thread-top strong {
  font-size: 14px;
  color: var(--cx-text);
}
.thread-top time {
  font-size: 11px;
  color: var(--cx-muted);
  flex-shrink: 0;
}
.preview {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary);
  margin-right: 4px;
}
.tag.mute {
  color: var(--cx-muted);
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--brand-primary);
  flex-shrink: 0;
}
.muted {
  color: var(--cx-muted);
  font-size: 13px;
}
.center {
  text-align: center;
  padding: 24px 8px;
}
.err {
  color: var(--cx-danger, #b91c1c);
  font-size: 13px;
}

.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(15, 23, 42, 0.45);
}
.sheet {
  position: relative;
  width: min(430px, 100%);
  max-height: 85dvh;
  overflow: auto;
  background: var(--cx-surface);
  border-radius: 20px 20px 0 0;
  padding: 16px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sheet-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
}
.sheet-x {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  color: var(--cx-muted);
}
.tabs {
  display: flex;
  gap: 8px;
}
.tab {
  flex: 1;
  border: 1px solid var(--cx-border);
  background: var(--cx-page);
  border-radius: 999px;
  padding: 8px;
  cursor: pointer;
  color: var(--cx-text);
}
.tab.on {
  background: color-mix(in srgb, var(--brand-primary) 16%, var(--cx-surface));
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--cx-border));
  font-weight: 600;
}
.sheet-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--cx-muted);
}
.dir-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 40dvh;
  overflow: auto;
}
.dir-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
}
.dir-item small {
  display: block;
  color: var(--cx-muted);
  font-size: 11px;
}
.dir-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  padding: 0;
}
.btn-primary {
  border: none;
  border-radius: 12px;
  padding: 12px;
  background: var(--brand-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
