<template>
  <div class="share-sheet" @click.self="emit('close')">
    <div class="share-panel" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <header class="share-head">
        <h2 id="share-title">Derivar publicación</h2>
        <button type="button" class="share-close" aria-label="Cerrar" @click="emit('close')">×</button>
      </header>
      <p class="share-sub">
        Enviá un link por chat interno para que otra persona vea
        <strong>«{{ postTitle }}»</strong>.
      </p>

      <label class="share-search">
        <span class="sr-only">Buscar persona</span>
        <input
          v-model="q"
          type="search"
          placeholder="Buscar por nombre o usuario…"
          autocomplete="off"
          @input="onSearch"
        />
      </label>

      <label class="share-note">
        <span>Mensaje opcional</span>
        <textarea v-model="note" rows="2" maxlength="280" placeholder="Ej.: mirá esto cuando puedas" />
      </label>

      <p v-if="error" class="share-err">{{ error }}</p>
      <p v-if="loading" class="share-muted">Buscando…</p>

      <ul v-else class="share-list">
        <li v-for="u in directory" :key="u.id">
          <button type="button" class="share-user" :disabled="busy" @click="shareWith(u)">
            <span class="share-avatar" aria-hidden="true">{{ initials(u) }}</span>
            <span class="share-user-text">
              <strong>{{ u.displayName || label(u) }}</strong>
              <small v-if="u.usuario">@{{ u.usuario }}</small>
            </span>
            <span class="share-send">{{ busyId === u.id ? 'Enviando…' : 'Enviar' }}</span>
          </button>
        </li>
        <li v-if="!directory.length" class="share-empty">No hay resultados.</li>
      </ul>

      <p v-if="done" class="share-ok">
        Listo. Se envió por chat.
        <button type="button" class="share-link" @click="openChat">Abrir conversación</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const props = defineProps({
  post: { type: Object, required: true },
})

const emit = defineEmits(['close', 'shared'])

const router = useRouter()
const q = ref('')
const note = ref('')
const directory = ref([])
const loading = ref(false)
const busy = ref(false)
const busyId = ref('')
const error = ref('')
const done = ref(false)
const chatId = ref('')
let timer = null

const postTitle = computed(() => String(props.post?.titulo || 'Publicación').trim() || 'Publicación')

function label(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function initials(u) {
  const name = u.displayName || label(u)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

async function fetchDirectory() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/chats/directory', { params: { q: q.value || undefined } })
    directory.value = Array.isArray(data?.items) ? data.items : []
  } catch (e) {
    directory.value = []
    error.value = e.response?.data?.error || 'No se pudo cargar el directorio'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(fetchDirectory, 200)
}

async function shareWith(u) {
  if (busy.value) return
  busy.value = true
  busyId.value = u.id
  error.value = ''
  done.value = false
  try {
    const { data } = await api.post(`/posts/${props.post.id}/share`, {
      userId: u.id,
      note: note.value.trim() || undefined,
    })
    chatId.value = data?.chatId || ''
    done.value = true
    emit('shared', { chatId: chatId.value, user: u })
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo derivar la publicación'
  } finally {
    busy.value = false
    busyId.value = ''
  }
}

function openChat() {
  if (!chatId.value) return
  emit('close')
  router.push(`/chat/${chatId.value}`)
}

onMounted(fetchDirectory)
</script>

<style scoped>
.share-sheet {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.share-panel {
  width: min(100%, 430px);
  max-height: min(88vh, 640px);
  overflow: auto;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  padding: 18px 16px max(18px, env(safe-area-inset-bottom));
  border: 1px solid var(--cx-border);
  border-bottom: 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
}
.share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.share-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.share-close {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font-size: 1.5rem;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}
.share-sub {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cx-muted);
}
.share-sub strong {
  color: var(--cx-text);
  font-weight: 650;
}
.share-search,
.share-note {
  display: block;
  margin-top: 14px;
}
.share-note span {
  display: block;
  font-size: 12px;
  font-weight: 650;
  color: var(--cx-muted);
  margin-bottom: 6px;
}
.share-search input,
.share-note textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 11px 12px;
  font: inherit;
  font-size: 14px;
  background: var(--cx-bg, #fff);
  color: var(--cx-text);
  resize: vertical;
}
.share-err {
  margin: 10px 0 0;
  color: #b91c1c;
  font-size: 13px;
}
.share-muted,
.share-empty {
  margin: 12px 0 0;
  color: var(--cx-muted);
  font-size: 13px;
}
.share-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.share-user {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.share-user:disabled {
  opacity: 0.65;
  cursor: wait;
}
.share-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--cx-primary, #0f766e) 16%, transparent);
  color: var(--cx-primary, #0f766e);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.share-user-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.share-user-text strong {
  font-size: 14px;
  font-weight: 700;
}
.share-user-text small {
  color: var(--cx-muted);
  font-size: 12px;
}
.share-send {
  font-size: 12px;
  font-weight: 700;
  color: var(--cx-primary, #0f766e);
  flex-shrink: 0;
}
.share-ok {
  margin: 14px 0 0;
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-primary, #0f766e) 10%, transparent);
  font-size: 13px;
  line-height: 1.4;
}
.share-link {
  display: inline;
  margin-left: 6px;
  border: 0;
  background: transparent;
  color: var(--cx-primary, #0f766e);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
