<template>
  <div class="composer" @click.self="emit('close')">
    <form class="panel" role="dialog" aria-modal="true" aria-labelledby="composer-title" @submit.prevent="submit">
      <header class="head">
        <h2 id="composer-title">Compartir en el muro</h2>
        <button type="button" class="icon" aria-label="Cerrar" @click="emit('close')">
          <AppIcon name="close" :size="20" />
        </button>
      </header>

      <p class="hint">
        {{
          requireApproval
            ? 'Tu publicación se enviará a revisión. Podés sumar foto, carrusel, video o audio.'
            : 'Podés sumar foto, carrusel, video o audio. Evitá groserías y contenido que no aporte.'
        }}
      </p>

      <label class="field">
        <span>Título</span>
        <input v-model="titulo" type="text" maxlength="120" placeholder="¿De qué se trata?" />
      </label>

      <label class="field">
        <span>Mensaje</span>
        <textarea
          v-model="cuerpo"
          rows="4"
          maxlength="2000"
          placeholder="Contá tu novedad a la comunidad…"
        />
      </label>

      <fieldset class="options">
        <legend>Tipo de publicación</legend>
        <div class="chip-row" role="radiogroup" aria-label="Tipo de publicación">
          <button
            v-for="t in tipos"
            :key="t.id"
            type="button"
            class="chip"
            :class="{ on: tipo === t.id }"
            role="radio"
            :aria-checked="tipo === t.id"
            @click="selectTipo(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="options">
        <legend>Formato</legend>
        <div class="chip-row" role="radiogroup" aria-label="Formato de publicación">
          <button
            v-for="l in layouts"
            :key="l.id"
            type="button"
            class="chip"
            :class="{ on: layout === l.id }"
            role="radio"
            :aria-checked="layout === l.id"
            @click="layout = l.id"
          >
            {{ l.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="options">
        <legend>Media</legend>
        <div class="chip-row" role="radiogroup" aria-label="Tipo de media">
          <button
            v-for="m in mediaTypes"
            :key="m.id"
            type="button"
            class="chip"
            :class="{ on: mediaType === m.id }"
            role="radio"
            :aria-checked="mediaType === m.id"
            @click="setMediaType(m.id)"
          >
            {{ m.label }}
          </button>
        </div>
      </fieldset>

      <!-- Foto -->
      <div v-if="mediaType === 'image'" class="media-block">
        <div class="media">
          <label class="media-btn">
            <AppIcon name="image" :size="18" />
            <span>{{ imageUrl ? 'Cambiar foto' : 'Agregar foto' }}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="onImageFile" />
          </label>
          <button v-if="imageUrl" type="button" class="media-clear" @click="clearVisualMedia">Quitar</button>
        </div>
        <div v-if="imageUrl" class="media-preview">
          <PostMedia :url="imageUrl" alt="Vista previa" :autoplay-on-visible="false" />
        </div>
      </div>

      <!-- Carrusel -->
      <div v-else-if="mediaType === 'carousel'" class="media-block">
        <div class="media">
          <label class="media-btn">
            <AppIcon name="image" :size="18" />
            <span>{{ imageUrls.length ? 'Agregar más fotos' : 'Elegir fotos' }}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              @change="onCarouselFiles"
            />
          </label>
          <button v-if="imageUrls.length" type="button" class="media-clear" @click="clearVisualMedia">Vaciar</button>
        </div>
        <p v-if="imageUrls.length === 1" class="hint warn">Agregá al menos 2 fotos para el carrusel.</p>
        <ul v-if="imageUrls.length" class="carousel-thumbs">
          <li v-for="(u, i) in imageUrls" :key="u + i">
            <img :src="resolveMediaUrl(u)" :alt="`Foto ${i + 1}`" />
            <button type="button" class="thumb-remove" aria-label="Quitar foto" @click="removeCarouselItem(i)">×</button>
          </li>
        </ul>
        <div v-if="imageUrls.length >= 2" class="media-preview">
          <PostMediaCarousel :urls="imageUrls" alt="Carrusel" />
        </div>
      </div>

      <!-- Video -->
      <div v-else class="media-block">
        <div class="media">
          <label class="media-btn">
            <AppIcon name="image" :size="18" />
            <span>{{ imageUrl ? 'Cambiar video' : 'Subir video' }}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" hidden @change="onVideoFile" />
          </label>
          <button v-if="imageUrl" type="button" class="media-clear" @click="clearVisualMedia">Quitar</button>
        </div>
        <label class="field">
          <span>O pegá un link (YouTube / video)</span>
          <input
            v-model="videoUrlDraft"
            type="url"
            inputmode="url"
            placeholder="https://youtube.com/watch?v=… o …/video.mp4"
            @change="applyVideoUrl"
            @keydown.enter.prevent="applyVideoUrl"
          />
        </label>
        <button v-if="videoUrlDraft.trim()" type="button" class="link-btn" @click="applyVideoUrl">Usar este link</button>
        <div v-if="imageUrl" class="media-preview media-preview--video">
          <PostMedia :url="imageUrl" alt="Vista previa del video" :autoplay-on-visible="false" />
        </div>
      </div>

      <!-- Audio (solo con foto/carrusel) -->
      <div v-if="mediaType !== 'video'" class="media-block audio-block">
        <p class="audio-label">Audio opcional</p>
        <p class="hint">Se reproduce sobre la foto o el carrusel. No aplica si hay video.</p>
        <div class="media">
          <label class="media-btn">
            <span>{{ audioUrl ? 'Cambiar audio' : 'Subir audio' }}</span>
            <input type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,.mp3,.m4a,.aac,.ogg,.wav" hidden @change="onAudioFile" />
          </label>
          <button v-if="audioUrl" type="button" class="media-clear" @click="audioUrl = ''">Quitar</button>
        </div>
        <label class="field">
          <span>O pegá un link de audio</span>
          <input
            v-model="audioUrlDraft"
            type="url"
            inputmode="url"
            placeholder="https://…/nota.mp3"
            @change="applyAudioUrl"
            @keydown.enter.prevent="applyAudioUrl"
          />
        </label>
        <button v-if="audioUrlDraft.trim()" type="button" class="link-btn" @click="applyAudioUrl">Usar este link</button>
        <audio
          v-if="audioUrl"
          :key="audioUrl"
          class="audio-player"
          controls
          preload="metadata"
          :src="resolveMediaUrl(audioUrl)"
        >
          Tu navegador no reproduce este audio.
        </audio>
      </div>

      <p v-if="error" class="err">{{ error }}</p>

      <div class="actions">
        <button type="button" class="btn-ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="busy || !canSubmit"
          @click="previewOpen = true"
        >
          Previsualizar
        </button>
        <button type="submit" class="btn-primary" :disabled="busy || !canSubmit">
          {{ busy ? 'Enviando…' : requireApproval ? 'Enviar a revisión' : 'Publicar' }}
        </button>
      </div>
    </form>

    <div
      v-if="previewOpen"
      class="preview-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      @click.self="previewOpen = false"
    >
      <div class="preview-panel">
        <header class="preview-head">
          <div>
            <h3 id="preview-title">Así se verá en el muro</h3>
            <p class="preview-note">Solo una vista previa · aún no se envió</p>
          </div>
          <button type="button" class="icon" aria-label="Cerrar vista previa" @click="previewOpen = false">
            <AppIcon name="close" :size="20" />
          </button>
        </header>
        <div class="preview-body">
          <PostCard :post="previewPost" :show-more-menu="false" :truncate="false" />
        </div>
        <div class="preview-actions">
          <button type="button" class="btn-ghost" @click="previewOpen = false">Seguir editando</button>
          <button type="button" class="btn-primary" :disabled="busy || !canSubmit" @click="submitFromPreview">
            {{ busy ? 'Enviando…' : requireApproval ? 'Enviar a revisión' : 'Publicar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { resolveMediaUrl } from '../utils/media'
import AppIcon from './AppIcon.vue'
import PostCard from './PostCard.vue'
import PostMedia from './PostMedia.vue'
import PostMediaCarousel from './PostMediaCarousel.vue'

const props = defineProps({
  requireApproval: { type: Boolean, default: true },
  initialTipo: { type: String, default: '' },
})

const emit = defineEmits(['close', 'created'])

const auth = useAuthStore()

const tipos = [
  { id: 'general', label: 'General' },
  { id: 'noticia', label: 'Noticia' },
  { id: 'aviso', label: 'Aviso' },
  { id: 'beneficio', label: 'Beneficio' },
  { id: 'evento', label: 'Evento' },
]

const layouts = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'banner', label: 'Banner' },
]

const mediaTypes = [
  { id: 'image', label: 'Foto' },
  { id: 'carousel', label: 'Carrusel' },
  { id: 'video', label: 'Video' },
]

const DEFAULT_LAYOUT_BY_TIPO = {
  noticia: 'banner',
  aviso: 'horizontal',
  beneficio: 'vertical',
  evento: 'vertical',
  general: 'horizontal',
}

const titulo = ref('')
const cuerpo = ref('')
const imageUrl = ref('')
const imageUrls = ref([])
const audioUrl = ref('')
const videoUrlDraft = ref('')
const audioUrlDraft = ref('')
const mediaType = ref('image')
const tipo = ref(
  tipos.some((t) => t.id === props.initialTipo) ? props.initialTipo : 'general',
)
const layout = ref(DEFAULT_LAYOUT_BY_TIPO[tipo.value] || DEFAULT_LAYOUT_BY_TIPO.general)
const busy = ref(false)
const error = ref('')
const previewOpen = ref(false)

const canSubmit = computed(() => Boolean(titulo.value.trim() || cuerpo.value.trim()))

const authorName = computed(() => {
  const u = auth.user
  if (!u) return 'Vos'
  const full = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
  return full || u.usuario || 'Vos'
})

const submitMedia = computed(() => {
  if (mediaType.value === 'carousel') {
    const urls = imageUrls.value.filter(Boolean)
    return {
      imageUrl: urls[0] || '',
      imageUrls: urls.length >= 2 ? urls : [],
      audioUrl: audioUrl.value || '',
    }
  }
  if (mediaType.value === 'video') {
    return {
      imageUrl: imageUrl.value || '',
      imageUrls: [],
      audioUrl: '',
    }
  }
  return {
    imageUrl: imageUrl.value || '',
    imageUrls: [],
    audioUrl: audioUrl.value || '',
  }
})

const previewPost = computed(() => {
  const title =
    titulo.value.trim() ||
    (cuerpo.value.trim().length > 80 ? `${cuerpo.value.trim().slice(0, 77)}…` : cuerpo.value.trim()) ||
    'Sin título'
  const m = submitMedia.value
  return {
    id: 'preview',
    titulo: title,
    cuerpo: cuerpo.value.trim() || 'Tu mensaje aparecerá acá.',
    tipo: tipo.value,
    layout: layout.value,
    imageUrl: m.imageUrl,
    imageUrls: m.imageUrls,
    audioUrl: m.audioUrl,
    authorName: authorName.value,
    publishedAt: new Date().toISOString(),
    pinned: false,
    reactionCounts: {},
    myReaction: null,
    isSaved: false,
    display: { show: { reactions: false } },
  }
})

function selectTipo(id) {
  tipo.value = id
  layout.value = DEFAULT_LAYOUT_BY_TIPO[id] || 'vertical'
}

function clearVisualMedia() {
  imageUrl.value = ''
  imageUrls.value = []
  videoUrlDraft.value = ''
}

function setMediaType(id) {
  if (mediaType.value === id) return
  mediaType.value = id
  clearVisualMedia()
  if (id === 'video') {
    audioUrl.value = ''
    audioUrlDraft.value = ''
  }
}

async function uploadFiles(fileList, { asAudio = false } = {}) {
  const files = Array.from(fileList || []).filter(Boolean)
  if (!files.length) return []
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const { data } = await api.post('/posts/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : data.url ? [data.url] : []
  if (!urls.length) throw new Error(asAudio ? 'No se pudo subir el audio' : 'No se pudo subir el archivo')
  return urls
}

async function onImageFile(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const urls = await uploadFiles([file])
    imageUrl.value = urls[0] || ''
    imageUrls.value = []
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo subir la imagen'
  } finally {
    busy.value = false
  }
}

async function onCarouselFiles(ev) {
  const files = ev.target?.files
  ev.target.value = ''
  if (!files?.length) return
  error.value = ''
  busy.value = true
  try {
    const remaining = Math.max(0, 8 - imageUrls.value.length)
    const slice = Array.from(files).slice(0, remaining)
    if (!slice.length) {
      error.value = 'Máximo 8 fotos en el carrusel'
      return
    }
    const urls = await uploadFiles(slice)
    imageUrls.value = [...imageUrls.value, ...urls].slice(0, 8)
    imageUrl.value = imageUrls.value[0] || ''
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudieron subir las fotos'
  } finally {
    busy.value = false
  }
}

function removeCarouselItem(index) {
  imageUrls.value = imageUrls.value.filter((_, i) => i !== index)
  imageUrl.value = imageUrls.value[0] || ''
}

async function onVideoFile(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const urls = await uploadFiles([file])
    imageUrl.value = urls[0] || ''
    imageUrls.value = []
    videoUrlDraft.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo subir el video'
  } finally {
    busy.value = false
  }
}

function applyVideoUrl() {
  const u = videoUrlDraft.value.trim()
  if (!u) return
  imageUrl.value = u
  imageUrls.value = []
}

async function onAudioFile(ev) {
  const file = ev.target?.files?.[0]
  ev.target.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const urls = await uploadFiles([file], { asAudio: true })
    audioUrl.value = urls[0] || ''
    audioUrlDraft.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo subir el audio'
  } finally {
    busy.value = false
  }
}

function applyAudioUrl() {
  const u = audioUrlDraft.value.trim()
  if (!u) return
  audioUrl.value = u
}

async function submit() {
  if (!canSubmit.value || busy.value) return
  if (mediaType.value === 'carousel' && imageUrls.value.length === 1) {
    error.value = 'El carrusel necesita al menos 2 fotos'
    return
  }
  error.value = ''
  busy.value = true
  try {
    const m = submitMedia.value
    const { data } = await api.post('/posts', {
      titulo: titulo.value.trim(),
      cuerpo: cuerpo.value.trim(),
      imageUrl: m.imageUrl,
      imageUrls: m.imageUrls,
      audioUrl: m.audioUrl,
      tipo: tipo.value,
      layout: layout.value,
    })
    previewOpen.value = false
    emit('created', data.post)
    emit('close')
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo enviar la publicación'
    previewOpen.value = false
  } finally {
    busy.value = false
  }
}

function submitFromPreview() {
  submit()
}
</script>

<style scoped>
.composer {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.panel {
  width: min(100%, 430px);
  max-height: min(92vh, 760px);
  overflow-y: auto;
  background: var(--cx-surface);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  padding: 16px 16px max(16px, env(safe-area-inset-bottom));
  border: 1px solid var(--cx-border);
  border-bottom: 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.18);
  display: grid;
  gap: 12px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.icon {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  padding: 6px;
  border-radius: 10px;
}
.hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--cx-muted);
}
.hint.warn {
  color: #9a3412;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
}
.field input,
.field textarea {
  width: 100%;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 11px 12px;
  font: inherit;
  font-weight: 500;
  color: var(--cx-text);
  background: var(--cx-bg, #fff);
  resize: vertical;
}
.options {
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 8px;
}
.options legend {
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
  padding: 0;
  margin-bottom: 2px;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--cx-border);
  background: var(--cx-bg, #fff);
  color: var(--cx-text);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.chip.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
}
.media-block {
  display: grid;
  gap: 8px;
}
.audio-block {
  padding-top: 4px;
  border-top: 1px dashed var(--cx-border);
}
.audio-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--cx-muted);
}
.media {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.media-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px dashed var(--cx-border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-primary);
  cursor: pointer;
}
.media-clear,
.link-btn {
  border: 0;
  background: transparent;
  color: var(--cx-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  justify-self: start;
}
.link-btn {
  color: var(--brand-primary);
}
.media-preview {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--cx-border);
}
.media-preview--video {
  min-height: 160px;
}
.carousel-thumbs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.carousel-thumbs li {
  position: relative;
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--cx-border);
}
.carousel-thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.audio-player {
  width: 100%;
  margin-top: 2px;
}
.err {
  margin: 0;
  font-size: 13px;
  color: #9a3412;
  background: #fff7ed;
  border-radius: 10px;
  padding: 8px 10px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.btn-ghost,
.btn-secondary,
.btn-primary {
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 700;
  border: 0;
}
.btn-ghost {
  background: transparent;
  color: var(--cx-muted);
}
.btn-secondary {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.btn-primary {
  background: var(--brand-primary);
  color: #fff;
}
.btn-primary:disabled,
.btn-secondary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
}

.preview-sheet {
  position: fixed;
  inset: 0;
  z-index: 96;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.preview-panel {
  width: min(100%, 430px);
  max-height: min(92vh, 760px);
  overflow: hidden;
  background: var(--cx-bg, #f8fafc);
  color: var(--cx-text);
  border-radius: 20px 20px 0 0;
  border: 1px solid var(--cx-border);
  border-bottom: 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.22);
  display: grid;
  grid-template-rows: auto 1fr auto;
}
.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 10px;
  background: var(--cx-surface);
  border-bottom: 1px solid var(--cx-border);
}
.preview-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.preview-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
}
.preview-body {
  overflow-y: auto;
  padding: 12px 12px 8px;
}
.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px max(16px, env(safe-area-inset-bottom));
  background: var(--cx-surface);
  border-top: 1px solid var(--cx-border);
}
</style>
