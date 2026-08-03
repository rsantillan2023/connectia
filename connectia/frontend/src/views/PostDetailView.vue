<template>
  <section class="detail">
    <header class="detail-bar">
      <button type="button" class="detail-back" aria-label="Volver" @click="goBack">
        <AppIcon name="back" :size="22" />
      </button>
      <div class="detail-bar-text">
        <p class="detail-bar-title">{{ barTitle }}</p>
        <p v-if="post?.tipo" class="detail-bar-sub">{{ post.tipo }}</p>
      </div>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <PostCard
      v-else-if="post"
      :post="post"
      :truncate="false"
      @open="() => {}"
      @not-interested="askHide = true"
    >
      <template #actions>
        <div class="card-actions">
          <ReactionBar :model-value="post" @react="react" />
          <button
            v-if="post.commentsEnabled !== false"
            type="button"
            class="react"
            aria-label="Comentarios"
            title="Comentarios"
          >
            <AppIcon name="chat" :size="20" />
            <span class="react-count">{{ commentsTotal }}</span>
          </button>
          <button
            type="button"
            class="react"
            aria-label="Derivar por chat"
            title="Derivar"
            @click="openShare"
          >
            <AppIcon name="share" :size="20" />
          </button>
          <button
            type="button"
            class="react save"
            :class="{ on: post.saved }"
            :aria-label="post.saved ? 'Quitar de guardados' : 'Guardar publicación'"
            :title="post.saved ? 'Guardado' : 'Guardar'"
            @click="toggleSave"
          >
            <AppIcon name="bookmark" :size="20" :filled="Boolean(post.saved)" />
          </button>
        </div>
      </template>
    </PostCard>

    <section v-if="post && post.commentsEnabled !== false" class="comments">
      <h2 class="comments-title">Comentarios {{ commentsCount ? `(${commentsCount})` : '' }}</h2>
      <p v-if="commentsLoading" class="muted">Cargando comentarios…</p>
      <p v-else-if="commentsError" class="err">{{ commentsError }}</p>
      <ul v-else class="comments-list">
        <li v-for="c in rootComments" :key="c.id" class="comment">
          <p class="comment-meta">
            <strong>{{ c.authorName || 'Usuario' }}</strong>
            <span v-if="c.status === 'pending_review'" class="pill">En revisión</span>
            <span v-else-if="c.status === 'hidden'" class="pill warn">Oculto</span>
          </p>
          <p class="comment-text">{{ c.texto }}</p>
          <p v-if="c.adminReply" class="admin-reply">Respuesta: {{ c.adminReply }}</p>
          <button
            v-if="c.authorId === myId && c.status !== 'deleted'"
            type="button"
            class="comment-del"
            @click="deleteComment(c)"
          >
            Eliminar
          </button>
          <ul v-if="repliesOf(c.id).length" class="replies">
            <li v-for="r in repliesOf(c.id)" :key="r.id" class="comment">
              <p class="comment-meta"><strong>{{ r.authorName || 'Usuario' }}</strong></p>
              <p class="comment-text">{{ r.texto }}</p>
            </li>
          </ul>
        </li>
        <li v-if="!rootComments.length" class="muted">Sé el primero en comentar.</li>
      </ul>

      <form class="composer" @submit.prevent="submitComment">
        <textarea
          ref="draftEl"
          v-model="draft"
          rows="2"
          maxlength="4000"
          placeholder="Escribí un comentario…"
          :disabled="sending"
        />
        <div class="composer-actions">
          <EmojiPicker @pick="insertEmoji" />
          <button type="submit" class="send" :disabled="sending || !draft.trim()">
            {{ sending ? 'Enviando…' : 'Comentar' }}
          </button>
        </div>
      </form>
    </section>
    <p v-else-if="post" class="muted comments-off">Los comentarios están deshabilitados en esta publicación.</p>

    <ConfirmSheet
      v-if="askHide && post"
      title="¿No te interesa?"
      :message="`«${post.titulo}» va a desaparecer de tu muro. Solo vos dejás de verla.`"
      confirm-label="Sí, ocultarla"
      cancel-label="Cancelar"
      :busy="hiding"
      @confirm="confirmHide"
      @cancel="askHide = false"
    />

    <SharePostSheet v-if="shareOpen && post" :post="post" @close="shareOpen = false" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import PostCard from '../components/PostCard.vue'
import AppIcon from '../components/AppIcon.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import SharePostSheet from '../components/SharePostSheet.vue'
import EmojiPicker from '../components/EmojiPicker.vue'
import ReactionBar from '../components/ReactionBar.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const post = ref(null)
const loading = ref(true)
const error = ref('')
const askHide = ref(false)
const hiding = ref(false)
const shareOpen = ref(false)

const comments = ref([])
const commentsLoading = ref(false)
const commentsError = ref('')
const draft = ref('')
const draftEl = ref(null)
const sending = ref(false)

const myId = computed(() => (auth.user?.id ? String(auth.user.id) : ''))

/** Comentarios que el usuario ve en esta pantalla (visibles + propios pendientes/ocultos). */
function isListedComment(c) {
  return Boolean(c) && c.status !== 'deleted'
}

const commentsCount = computed(
  () => comments.value.filter((c) => isListedComment(c) && !c.parentId).length,
)
const commentsTotal = computed(() => {
  const n = comments.value.filter(isListedComment).length
  if (commentsLoading.value && n === 0) return post.value?.commentsCount || 0
  return n
})
const rootComments = computed(() => comments.value.filter((c) => !c.parentId))

function syncPostCommentsCount() {
  if (!post.value) return
  const n = comments.value.filter(isListedComment).length
  if (post.value.commentsCount === n) return
  post.value = { ...post.value, commentsCount: n }
}

function repliesOf(parentId) {
  return comments.value.filter((c) => c.parentId === parentId && c.status === 'visible')
}

function insertEmoji(emoji) {
  const el = draftEl.value
  const current = draft.value || ''
  if (el && typeof el.selectionStart === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd
    draft.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`
    requestAnimationFrame(() => {
      const pos = start + emoji.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
    return
  }
  draft.value = `${current}${emoji}`
}

const barTitle = computed(() => {
  const t = String(post.value?.titulo || '').trim()
  if (!t) return 'Publicación'
  return t.length > 42 ? `${t.slice(0, 40)}…` : t
})

function goBack() {
  if ((window.history.state?.position ?? 0) > 0) {
    router.back()
    return
  }
  router.replace({ name: 'muro' })
}

function openShare() {
  if (post.value?.id) shareOpen.value = true
}

async function load() {
  loading.value = true
  error.value = ''
  post.value = null
  askHide.value = false
  comments.value = []
  try {
    const { data } = await api.get(`/posts/${route.params.id}`)
    post.value = data.post
    if (data.post?.commentsEnabled !== false) await loadComments()
  } catch (e) {
    error.value =
      e.response?.status === 404
        ? 'Publicación no encontrada o no disponible.'
        : e.response?.data?.error || 'No se pudo cargar la publicación'
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  commentsLoading.value = true
  commentsError.value = ''
  try {
    const { data } = await api.get('/comments', { params: { postId: route.params.id } })
    comments.value = data.comments || []
    syncPostCommentsCount()
  } catch (e) {
    commentsError.value = e.response?.data?.error || 'No se pudieron cargar los comentarios'
  } finally {
    commentsLoading.value = false
  }
}

async function submitComment() {
  if (sending.value || !draft.value.trim() || !post.value) return
  sending.value = true
  commentsError.value = ''
  try {
    const { data } = await api.post('/comments', {
      postId: post.value.id,
      texto: draft.value.trim(),
    })
    if (data.comment) {
      comments.value = [...comments.value, data.comment]
      draft.value = ''
      syncPostCommentsCount()
    }
  } catch (e) {
    commentsError.value = e.response?.data?.error || 'No se pudo publicar el comentario'
  } finally {
    sending.value = false
  }
}

async function deleteComment(c) {
  try {
    await api.delete(`/comments/${c.id}`)
    comments.value = comments.value.filter((x) => x.id !== c.id)
    syncPostCommentsCount()
  } catch (e) {
    commentsError.value = e.response?.data?.error || 'No se pudo eliminar'
  }
}

async function react(key) {
  try {
    const { data } = await api.post(`/posts/${post.value.id}/reactions`, { reaction: key })
    if (data.post) post.value = data.post
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo reaccionar'
  }
}

async function toggleSave() {
  try {
    const { data } = await api.post(`/posts/${post.value.id}/save`)
    if (data.post) post.value = data.post
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  }
}

async function confirmHide() {
  if (!post.value?.id || hiding.value) return
  hiding.value = true
  try {
    await api.post(`/posts/${post.value.id}/hide`)
    askHide.value = false
    router.replace({ name: 'muro' })
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo ocultar la publicación'
  } finally {
    hiding.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.detail {
  padding-bottom: 16px;
}
.detail-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cx-border);
  background: var(--cx-surface);
  position: sticky;
  top: 0;
  z-index: 5;
}
.detail-back {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--cx-text);
  display: grid;
  place-items: center;
}
.detail-bar-text {
  min-width: 0;
}
.detail-bar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-bar-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--cx-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.muted {
  padding: 24px;
  color: var(--cx-muted);
  font-size: 14px;
}
.err {
  margin: 10px 14px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  background: #fff7ed;
  color: #9a3412;
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
.react.save {
  /* mismo tamaño que el resto */
}

.comments {
  margin: 12px 14px 24px;
  padding-top: 8px;
  border-top: 1px solid var(--cx-border);
}
.comments-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
}
.comments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comment {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--cx-surface, #f6f8fa);
}
.comment-meta {
  margin: 0 0 4px;
  font-size: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.comment-text {
  margin: 0;
  font-size: 14px;
  white-space: pre-wrap;
}
.admin-reply {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cx-muted);
  font-style: italic;
}
.pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #e8eef2;
  color: #3a4a55;
}
.pill.warn {
  background: #fde8e8;
  color: #8a1515;
}
.comment-del {
  margin-top: 6px;
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font-size: 12px;
  padding: 0;
  cursor: pointer;
}
.replies {
  list-style: none;
  margin: 8px 0 0;
  padding: 0 0 0 12px;
  border-left: 2px solid var(--cx-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.composer {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.composer textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
  background: var(--cx-surface);
  color: var(--cx-text);
}
.composer .send {
  align-self: flex-end;
  border: 0;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  background: var(--brand-primary, #1a3a4a);
  color: #fff;
  cursor: pointer;
}
.composer .send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.comments-off {
  margin: 8px 14px;
}
</style>
