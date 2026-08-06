<template>
  <div class="stories-page">
    <AdminPageHeader
      title="Stories"
      subtitle="Contenido efímero en la cabecera del muro · vigencia típica 24 h"
    >
      <template #actions>
        <button type="button" class="btn-ghost" :disabled="loading" @click="load">
          <i class="fas fa-sync-alt" aria-hidden="true"></i>
          Actualizar
        </button>
        <button type="button" class="btn-primary" @click="openNew">
          <i class="fas fa-plus" aria-hidden="true"></i>
          Nueva story
        </button>
      </template>
    </AdminPageHeader>

    <ScreenHelp
      purpose="Stories cortas que aparecen arriba del muro en la app. Caducan solas al llegar a la fecha de fin."
      can-do="Crear con imagen o video, definir cuántos segundos se muestra cada story, asociar música opcional a imágenes, filtrar por estado, editar vigencia y archivar o borrar."
    />

    <section class="kpi-strip" aria-label="Resumen">
      <article class="kpi">
        <span class="kpi__label">Total</span>
        <strong class="kpi__value">{{ stats.total }}</strong>
      </article>
      <article class="kpi kpi--live">
        <span class="kpi__label">En vivo</span>
        <strong class="kpi__value">{{ stats.live }}</strong>
      </article>
      <article class="kpi">
        <span class="kpi__label">Publicadas</span>
        <strong class="kpi__value">{{ stats.published }}</strong>
      </article>
      <article class="kpi">
        <span class="kpi__label">Borradores</span>
        <strong class="kpi__value">{{ stats.draft }}</strong>
      </article>
      <article class="kpi">
        <span class="kpi__label">Vistas</span>
        <strong class="kpi__value">{{ stats.views }}</strong>
      </article>
    </section>

    <div class="filters" role="toolbar" aria-label="Filtro por estado">
      <button
        v-for="f in filters"
        :key="f.id"
        type="button"
        class="chip"
        :class="{ on: statusFilter === f.id }"
        @click="statusFilter = f.id"
      >
        {{ f.label }}
        <span class="chip__n">{{ f.count }}</span>
      </button>
    </div>

    <p v-if="error" class="banner err" role="alert">{{ error }}</p>
    <p v-if="okMsg" class="banner ok" role="status">{{ okMsg }}</p>

    <div v-if="loading" class="empty">Cargando stories…</div>
    <div v-else-if="!filtered.length" class="empty empty--cta">
      <i class="fas fa-camera" aria-hidden="true"></i>
      <p>{{ items.length ? 'No hay stories con este filtro.' : 'Todavía no hay stories.' }}</p>
      <button v-if="!items.length" type="button" class="btn-primary" @click="openNew">Crear la primera</button>
    </div>

    <ul v-else class="story-grid">
      <li v-for="s in filtered" :key="s.id" class="story-card" :data-status="s.status">
        <button type="button" class="story-card__preview" @click="edit(s)">
          <img
            v-if="s.mediaType !== 'video'"
            :src="media(s.mediaUrl)"
            alt=""
            class="story-card__media"
          />
          <div v-else class="story-card__media story-card__media--video">
            <i class="fas fa-play" aria-hidden="true"></i>
            <span>Video</span>
          </div>
          <div class="story-card__scrim">
            <span class="pill" :data-st="lifecycle(s).key">{{ lifecycle(s).label }}</span>
            <strong>{{ s.titulo || 'Sin título' }}</strong>
          </div>
          <span v-if="s.audioUrl" class="story-card__music" title="Con música">
            <i class="fas fa-music" aria-hidden="true"></i>
          </span>
        </button>
        <div class="story-card__body">
          <div class="story-card__meta">
            <span class="cat">{{ s.category || 'general' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ s.viewCount || 0 }} vistas</span>
          </div>
          <p class="story-card__range">{{ formatRange(s) }}</p>
          <p class="story-card__ttl" :data-tone="lifecycle(s).tone">
            {{ lifecycle(s).detail }} · {{ Number(s.durationSec) || 5 }} s
          </p>
          <div class="story-card__actions">
            <button type="button" class="btn-ghost sm" @click="edit(s)">Editar</button>
            <button
              v-if="s.status === 'published'"
              type="button"
              class="btn-ghost sm"
              @click="quickStatus(s, 'archived')"
            >
              Archivar
            </button>
            <button
              v-else-if="s.status === 'draft'"
              type="button"
              class="btn-ghost sm"
              @click="quickStatus(s, 'published')"
            >
              Publicar
            </button>
            <button type="button" class="btn-ghost sm danger" @click="remove(s)">Borrar</button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="draft" class="sheet" @click.self="closeDraft" @keydown.esc="closeDraft">
      <form class="editor" @submit.prevent="save">
        <header class="editor__head">
          <div>
            <h2>{{ draft.id ? 'Editar story' : 'Nueva story' }}</h2>
            <p>Se muestra en la app mientras esté publicada y dentro de la vigencia.</p>
          </div>
          <button type="button" class="icon-close" aria-label="Cerrar" @click="closeDraft">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <div class="editor__grid">
          <div class="editor__preview-col">
            <div class="phone">
              <div class="phone__bar" aria-hidden="true"></div>
              <div class="phone__frame">
                <img
                  v-if="draft.mediaType !== 'video' && draft.mediaUrl"
                  :src="media(draft.mediaUrl)"
                  alt=""
                  class="phone__media"
                />
                <div v-else-if="draft.mediaType === 'video' && draft.mediaUrl" class="phone__media phone__media--video">
                  <i class="fas fa-play-circle" aria-hidden="true"></i>
                  <span>Video listo</span>
                </div>
                <div v-else class="phone__media phone__media--empty">
                  <i class="fas fa-image" aria-hidden="true"></i>
                  <span>Vista previa</span>
                </div>
                <div class="phone__caption">
                  <strong>{{ draft.titulo || 'Sin título' }}</strong>
                  <small>{{ draft.category || 'general' }}</small>
                  <small v-if="draft.audioUrl && draft.mediaType !== 'video'" class="phone__music">
                    <i class="fas fa-music" aria-hidden="true"></i> Con música
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div class="editor__fields">
            <label class="field">
              <span>Título</span>
              <input v-model="draft.titulo" maxlength="80" placeholder="Opcional" class="input" />
            </label>
            <label class="field">
              <span>Categoría</span>
              <input v-model="draft.category" required maxlength="60" placeholder="general" class="input" />
            </label>

            <div class="field">
              <span>Media</span>
              <div class="media-row">
                <input
                  v-model="draft.mediaUrl"
                  required
                  class="input"
                  placeholder="/uploads/… o https://…"
                />
                <label class="btn-ghost file-btn">
                  {{ uploading ? 'Subiendo…' : 'Subir' }}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    :disabled="uploading"
                    @change="onMediaFile"
                  />
                </label>
              </div>
              <p class="hint">Subí un archivo o pegá una URL. Ideal: imagen vertical.</p>
            </div>

            <div class="field">
              <span>Música (opcional)</span>
              <div class="media-row">
                <input
                  v-model="draft.audioUrl"
                  class="input"
                  placeholder="https://…/nota.mp3"
                  :disabled="draft.mediaType === 'video'"
                />
                <label class="btn-ghost file-btn">
                  {{ uploadingAudio ? 'Subiendo…' : 'Subir' }}
                  <input
                    type="file"
                    accept="audio/*"
                    hidden
                    :disabled="uploadingAudio || draft.mediaType === 'video'"
                    @change="onAudioFile"
                  />
                </label>
              </div>
              <audio
                v-if="draft.audioUrl && draft.mediaType !== 'video'"
                :key="draft.audioUrl"
                class="audio-preview"
                controls
                preload="none"
                :src="media(draft.audioUrl)"
              />
              <p v-if="draft.mediaType === 'video'" class="hint">
                En video la música asociada se ignora (el video lleva su propio audio).
              </p>
              <p v-else class="hint">Se reproduce al abrir la story en la app.</p>
            </div>

            <div class="field-row">
              <label class="field">
                <span>Tipo</span>
                <select v-model="draft.mediaType" class="input">
                  <option value="image">Imagen</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <label class="field">
                <span>Estado</span>
                <select v-model="draft.status" class="input">
                  <option value="published">Publicada</option>
                  <option value="draft">Borrador</option>
                  <option value="archived">Archivada</option>
                </select>
              </label>
            </div>

            <label class="field">
              <span>Duración en app (segundos)</span>
              <input
                v-model.number="draft.durationSec"
                type="number"
                min="1"
                max="60"
                step="1"
                class="input"
                required
              />
              <p class="hint">
                Tiempo visible antes de pasar sola a la siguiente (1–60 s). El usuario también puede avanzar con el dedo.
              </p>
            </label>

            <div class="field-row">
              <label class="field">
                <span>Inicio</span>
                <input v-model="draft.startsAtLocal" type="datetime-local" class="input" />
              </label>
              <label class="field">
                <span>Fin</span>
                <input v-model="draft.endsAtLocal" type="datetime-local" class="input" />
              </label>
            </div>
            <div class="ttl-presets" role="group" aria-label="Vigencia rápida">
              <button type="button" class="chip sm" @click="setTtlHours(24)">24 h</button>
              <button type="button" class="chip sm" @click="setTtlHours(48)">48 h</button>
              <button type="button" class="chip sm" @click="setTtlHours(168)">7 días</button>
            </div>

            <p v-if="formError" class="banner err">{{ formError }}</p>

            <footer class="editor__foot">
              <button type="button" class="btn-ghost" @click="closeDraft">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="saving || uploading || uploadingAudio">
                {{ saving ? 'Guardando…' : 'Guardar' }}
              </button>
            </footer>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const uploadingAudio = ref(false)
const error = ref('')
const okMsg = ref('')
const formError = ref('')
const draft = ref(null)
const statusFilter = ref('all')

function media(u) {
  return resolveMediaUrl(u)
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function formatRange(s) {
  try {
    const fmt = new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${fmt.format(new Date(s.startsAt))} → ${fmt.format(new Date(s.endsAt))}`
  } catch {
    return ''
  }
}

function isLive(s) {
  if (s.status !== 'published') return false
  const now = Date.now()
  const a = new Date(s.startsAt).getTime()
  const b = new Date(s.endsAt).getTime()
  return a <= now && now < b
}

function lifecycle(s) {
  const now = Date.now()
  const start = new Date(s.startsAt).getTime()
  const end = new Date(s.endsAt).getTime()
  if (s.status === 'draft') return { key: 'draft', label: 'Borrador', tone: 'muted', detail: 'No visible en la app' }
  if (s.status === 'archived') return { key: 'archived', label: 'Archivada', tone: 'muted', detail: 'Fuera del muro' }
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { key: 'published', label: 'Publicada', tone: 'ok', detail: 'Sin vigencia clara' }
  }
  if (now < start) {
    const h = Math.max(1, Math.round((start - now) / 3600000))
    return { key: 'scheduled', label: 'Programada', tone: 'warn', detail: `Empieza en ~${h} h` }
  }
  if (now >= end) {
    return { key: 'expired', label: 'Vencida', tone: 'bad', detail: 'Ya no se muestra' }
  }
  const hLeft = Math.max(1, Math.round((end - now) / 3600000))
  return { key: 'live', label: 'En vivo', tone: 'ok', detail: `Quedan ~${hLeft} h` }
}

const stats = computed(() => {
  const list = items.value
  return {
    total: list.length,
    live: list.filter(isLive).length,
    published: list.filter((s) => s.status === 'published').length,
    draft: list.filter((s) => s.status === 'draft').length,
    views: list.reduce((n, s) => n + (Number(s.viewCount) || 0), 0),
  }
})

const filters = computed(() => [
  { id: 'all', label: 'Todas', count: items.value.length },
  { id: 'live', label: 'En vivo', count: stats.value.live },
  { id: 'published', label: 'Publicadas', count: stats.value.published },
  { id: 'draft', label: 'Borradores', count: stats.value.draft },
  {
    id: 'archived',
    label: 'Archivadas',
    count: items.value.filter((s) => s.status === 'archived').length,
  },
])

const filtered = computed(() => {
  const list = items.value
  if (statusFilter.value === 'all') return list
  if (statusFilter.value === 'live') return list.filter(isLive)
  return list.filter((s) => s.status === statusFilter.value)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/stories')
    items.value = Array.isArray(data?.items) ? data.items : []
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudieron cargar stories'
  } finally {
    loading.value = false
  }
}

function openNew() {
  formError.value = ''
  const now = new Date()
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  draft.value = {
    id: null,
    titulo: '',
    category: 'general',
    mediaUrl: '',
    mediaType: 'image',
    audioUrl: '',
    durationSec: 5,
    status: 'published',
    startsAtLocal: toLocalInput(now.toISOString()),
    endsAtLocal: toLocalInput(end.toISOString()),
  }
}

function edit(s) {
  formError.value = ''
  draft.value = {
    id: s.id,
    titulo: s.titulo || '',
    category: s.category || 'general',
    mediaUrl: s.mediaUrl || '',
    mediaType: s.mediaType || 'image',
    audioUrl: s.audioUrl || '',
    durationSec: Number(s.durationSec) || 5,
    status: s.status || 'published',
    startsAtLocal: toLocalInput(s.startsAt),
    endsAtLocal: toLocalInput(s.endsAt),
  }
}

function closeDraft() {
  if (saving.value || uploading.value || uploadingAudio.value) return
  draft.value = null
  formError.value = ''
}

function setTtlHours(hours) {
  if (!draft.value) return
  const start = fromLocalInput(draft.value.startsAtLocal) || new Date().toISOString()
  const end = new Date(new Date(start).getTime() + hours * 3600000)
  draft.value.startsAtLocal = toLocalInput(start)
  draft.value.endsAtLocal = toLocalInput(end.toISOString())
}

async function onMediaFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  uploading.value = true
  formError.value = ''
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/posts/upload', fd)
    const url = data.url || data.urls?.[0] || ''
    if (!url) throw new Error('Sin URL de media')
    draft.value.mediaUrl = url
    if (String(file.type || '').startsWith('video/')) draft.value.mediaType = 'video'
    else draft.value.mediaType = 'image'
  } catch (err) {
    formError.value = err.response?.data?.error || err.message || 'No se pudo subir el archivo'
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function onAudioFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  uploadingAudio.value = true
  formError.value = ''
  try {
    const fd = new FormData()
    fd.append('files', file)
    const { data } = await api.post('/admin/posts/upload', fd)
    const url = data.url || data.urls?.[0] || ''
    if (!url) throw new Error('Sin URL de audio')
    draft.value.audioUrl = url
  } catch (err) {
    formError.value = err.response?.data?.error || err.message || 'No se pudo subir el audio'
  } finally {
    uploadingAudio.value = false
    e.target.value = ''
  }
}

async function save() {
  if (!draft.value?.mediaUrl?.trim()) {
    formError.value = 'La media es obligatoria'
    return
  }
  saving.value = true
  error.value = ''
  okMsg.value = ''
  formError.value = ''
  const durationRaw = Number(draft.value.durationSec)
  const durationSec = Number.isFinite(durationRaw)
    ? Math.min(60, Math.max(1, Math.round(durationRaw)))
    : 5
  const payload = {
    titulo: draft.value.titulo,
    category: draft.value.category,
    mediaUrl: draft.value.mediaUrl.trim(),
    mediaType: draft.value.mediaType,
    audioUrl: draft.value.mediaType === 'video' ? '' : String(draft.value.audioUrl || '').trim(),
    durationSec,
    status: draft.value.status,
    startsAt: fromLocalInput(draft.value.startsAtLocal),
    endsAt: fromLocalInput(draft.value.endsAtLocal),
  }
  try {
    if (draft.value.id) {
      await api.patch(`/admin/stories/${draft.value.id}`, payload)
    } else {
      await api.post('/admin/stories', payload)
    }
    draft.value = null
    okMsg.value = 'Story guardada'
    await load()
  } catch (e) {
    formError.value = e?.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function quickStatus(s, status) {
  try {
    await api.patch(`/admin/stories/${s.id}`, { status })
    okMsg.value = status === 'published' ? 'Story publicada' : 'Story archivada'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo actualizar'
  }
}

async function remove(s) {
  if (!confirm(`¿Borrar story «${s.titulo || s.category}»?`)) return
  try {
    await api.delete(`/admin/stories/${s.id}`)
    okMsg.value = 'Story borrada'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo borrar'
  }
}

onMounted(load)
</script>

<style scoped>
.stories-page {
  max-width: none;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 1rem 0 0.85rem;
}

.kpi {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.7rem 0.85rem;
  display: grid;
  gap: 0.2rem;
  box-shadow: var(--sh);
}

.kpi--live {
  border-color: color-mix(in srgb, var(--ok, #22c55e) 45%, var(--line));
  background: color-mix(in srgb, var(--ok, #22c55e) 10%, var(--panel));
}

.kpi__label {
  font-size: 0.7rem;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.kpi__value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  font-family: 'Space Grotesk', 'IBM Plex Sans', sans-serif;
  letter-spacing: -0.02em;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
  position: sticky;
  top: 3.6rem;
  z-index: 10;
  padding: 0.35rem 0;
  background: color-mix(in srgb, var(--canvas, var(--panel-2)) 92%, transparent);
  backdrop-filter: blur(6px);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.chip.sm {
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
}

.chip:hover {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}

.chip.on {
  background: var(--brand-soft);
  border-color: var(--brand-line);
  color: var(--brand-ink);
}

.chip__n {
  min-width: 1.1rem;
  text-align: center;
  font-size: 0.68rem;
  opacity: 0.85;
}

.banner {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.banner.err {
  background: var(--bad-bg);
  color: var(--bad);
}

.banner.ok {
  background: var(--ok-bg);
  color: var(--ok);
}

.empty {
  padding: 2rem 1rem;
  color: var(--ink-soft);
  text-align: center;
}

.empty--cta {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  border: 1px dashed var(--line-2);
  border-radius: 16px;
  background: var(--panel-2);
}

.empty--cta i {
  font-size: 1.5rem;
  color: var(--brand-ink);
  opacity: 0.8;
}

.story-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.story-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--sh);
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, transform 0.15s;
}

.story-card:hover {
  border-color: var(--brand-line);
  transform: translateY(-1px);
}

.story-card__preview {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 9 / 14;
  padding: 0;
  border: 0;
  cursor: pointer;
  background: var(--panel-2);
  overflow: hidden;
}

.story-card__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.story-card__media--video {
  display: grid;
  place-content: center;
  gap: 0.35rem;
  color: var(--ink-soft);
  background: linear-gradient(160deg, var(--panel-2), color-mix(in srgb, var(--brand) 18%, var(--panel)));
  font-size: 0.8rem;
  font-weight: 600;
}

.story-card__media--video i {
  font-size: 1.4rem;
  color: var(--brand-ink);
}

.story-card__scrim {
  position: absolute;
  inset: auto 0 0;
  padding: 2.2rem 0.7rem 0.7rem;
  background: linear-gradient(transparent, color-mix(in srgb, #000 72%, transparent));
  color: #fff;
  display: grid;
  gap: 0.35rem;
  text-align: left;
}

.story-card__scrim strong {
  font-size: 0.9rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-card__music {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.7rem;
}

.pill {
  display: inline-flex;
  align-self: start;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.pill[data-st='live'] {
  background: color-mix(in srgb, var(--ok, #22c55e) 85%, #000);
}

.pill[data-st='scheduled'] {
  background: color-mix(in srgb, #f59e0b 85%, #000);
}

.pill[data-st='expired'],
.pill[data-st='archived'] {
  background: rgba(0, 0, 0, 0.45);
}

.pill[data-st='draft'] {
  background: rgba(255, 255, 255, 0.28);
  color: #111;
}

.story-card__body {
  padding: 0.7rem 0.75rem 0.8rem;
  display: grid;
  gap: 0.25rem;
}

.story-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.cat {
  color: var(--brand-ink);
  font-weight: 600;
}

.story-card__range {
  margin: 0;
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.35;
}

.story-card__ttl {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
}

.story-card__ttl[data-tone='ok'] {
  color: var(--ok, #16a34a);
}

.story-card__ttl[data-tone='warn'] {
  color: #d97706;
}

.story-card__ttl[data-tone='bad'] {
  color: var(--bad);
}

.story-card__ttl[data-tone='muted'] {
  color: var(--ink-faint);
}

.story-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.btn-primary,
.btn-ghost {
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--ink);
  font-size: 0.8125rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-primary {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}

.btn-ghost.sm {
  padding: 0.3rem 0.55rem;
  font-size: 0.72rem;
}

.btn-ghost.danger {
  color: var(--bad);
}

.btn-ghost:hover {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}

.sheet {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, #000 52%, transparent);
  display: grid;
  place-items: center;
  z-index: 80;
  padding: 1rem;
}

.editor {
  width: min(880px, 100%);
  max-height: min(92vh, 900px);
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 1rem 1.1rem 1.15rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.editor__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
}

.editor__head h2 {
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
  color: var(--ink);
}

.editor__head p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.icon-close {
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  border: 1px solid var(--line-2);
  background: var(--panel-2);
  color: var(--ink-soft);
  cursor: pointer;
}

.editor__grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.phone {
  width: 100%;
  max-width: 210px;
  margin: 0 auto;
}

.phone__bar {
  height: 10px;
  border-radius: 12px 12px 0 0;
  background: color-mix(in srgb, var(--ink) 18%, var(--panel-2));
}

.phone__frame {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 0 0 18px 18px;
  overflow: hidden;
  border: 1px solid var(--line-2);
  background: #0b0b10;
}

.phone__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.phone__media--video,
.phone__media--empty {
  display: grid;
  place-content: center;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.78rem;
  text-align: center;
  background: linear-gradient(165deg, #1a1724, #2a2440);
}

.phone__media--video i,
.phone__media--empty i {
  font-size: 1.6rem;
  opacity: 0.85;
}

.phone__caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.5rem 0.7rem 0.75rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
  display: grid;
  gap: 0.15rem;
}

.phone__caption strong {
  font-size: 0.85rem;
}

.phone__caption small {
  opacity: 0.8;
  font-size: 0.7rem;
}

.phone__music {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
}

.audio-preview {
  width: 100%;
  height: 2.25rem;
  margin-top: 0.15rem;
}

.editor__fields {
  display: grid;
  gap: 0.75rem;
}

.field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.input {
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: var(--panel-2);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 500;
  width: 100%;
}

.media-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
}

.file-btn {
  white-space: nowrap;
  cursor: pointer;
}

.hint {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--ink-faint);
}

.ttl-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.editor__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.35rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
}

@media (max-width: 760px) {
  .kpi-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .editor__grid {
    grid-template-columns: 1fr;
  }
  .phone {
    max-width: 180px;
  }
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
