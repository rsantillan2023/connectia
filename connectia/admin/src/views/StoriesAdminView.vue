<template>
  <div class="stories-admin">
    <header class="head">
      <div>
        <h1>Stories</h1>
        <p>Contenido efímero en la cabecera del muro (vigencia default 24 h).</p>
      </div>
      <button type="button" class="btn-primary" @click="openNew">Nueva story</button>
    </header>

    <p v-if="error" class="banner err">{{ error }}</p>
    <p v-if="okMsg" class="banner ok">{{ okMsg }}</p>

    <div v-if="loading" class="empty">Cargando…</div>
    <div v-else-if="!items.length" class="empty">Todavía no hay stories. Creá la primera.</div>
    <ul v-else class="list">
      <li v-for="s in items" :key="s.id" class="row">
        <img v-if="s.mediaType !== 'video'" :src="media(s.mediaUrl)" alt="" class="thumb" />
        <div v-else class="thumb video">Video</div>
        <div class="meta">
          <strong>{{ s.titulo || '(sin título)' }}</strong>
          <small>{{ s.category }} · {{ s.status }} · {{ formatRange(s) }} · {{ s.viewCount || 0 }} vistas</small>
        </div>
        <div class="actions">
          <button type="button" class="btn-ghost" @click="edit(s)">Editar</button>
          <button type="button" class="btn-ghost danger" @click="remove(s)">Borrar</button>
        </div>
      </li>
    </ul>

    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar story' : 'Nueva story' }}</h2>
        <label class="field">
          <span>Título</span>
          <input v-model="draft.titulo" maxlength="80" placeholder="Opcional" />
        </label>
        <label class="field">
          <span>Categoría</span>
          <input v-model="draft.category" required maxlength="60" placeholder="general" />
        </label>
        <label class="field">
          <span>URL media</span>
          <input v-model="draft.mediaUrl" required placeholder="/uploads/… o https://…" />
        </label>
        <p class="hint">Podés subir la imagen/video desde Publicaciones → Media y pegar la URL acá.</p>
        <label class="field">
          <span>Tipo</span>
          <select v-model="draft.mediaType">
            <option value="image">Imagen</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label class="field">
          <span>Estado</span>
          <select v-model="draft.status">
            <option value="published">Publicada</option>
            <option value="draft">Borrador</option>
            <option value="archived">Archivada</option>
          </select>
        </label>
        <label class="field">
          <span>Inicio</span>
          <input v-model="draft.startsAtLocal" type="datetime-local" />
        </label>
        <label class="field">
          <span>Fin</span>
          <input v-model="draft.endsAtLocal" type="datetime-local" />
        </label>
        <footer class="foot">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const items = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')
const draft = ref(null)

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
    const a = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
      new Date(s.startsAt),
    )
    const b = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
      new Date(s.endsAt),
    )
    return `${a} → ${b}`
  } catch {
    return ''
  }
}

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
  const now = new Date()
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  draft.value = {
    id: null,
    titulo: '',
    category: 'general',
    mediaUrl: '',
    mediaType: 'image',
    status: 'published',
    startsAtLocal: toLocalInput(now.toISOString()),
    endsAtLocal: toLocalInput(end.toISOString()),
  }
}

function edit(s) {
  draft.value = {
    id: s.id,
    titulo: s.titulo || '',
    category: s.category || 'general',
    mediaUrl: s.mediaUrl || '',
    mediaType: s.mediaType || 'image',
    status: s.status || 'published',
    startsAtLocal: toLocalInput(s.startsAt),
    endsAtLocal: toLocalInput(s.endsAt),
  }
}

async function save() {
  if (!draft.value?.mediaUrl?.trim()) return
  saving.value = true
  error.value = ''
  okMsg.value = ''
  const payload = {
    titulo: draft.value.titulo,
    category: draft.value.category,
    mediaUrl: draft.value.mediaUrl.trim(),
    mediaType: draft.value.mediaType,
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
    error.value = e?.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
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
.stories-admin { max-width: none; }
.head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.head h1 { margin: 0 0 4px; }
.head p { margin: 0; color: var(--ink-soft); }
.banner { padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; }
.banner.err { background: var(--bad-bg); color: var(--bad); }
.banner.ok { background: var(--ok-bg); color: var(--ok); }
.empty { padding: 24px; color: var(--ink-soft); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: 64px 1fr auto; gap: 12px; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 10px; background: var(--panel); }
.thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; background: var(--line); }
.thumb.video { display: grid; place-items: center; font-size: 12px; color: var(--ink-soft); }
.meta { display: grid; gap: 4px; }
.meta small { color: var(--ink-soft); }
.actions { display: flex; gap: 8px; }
.btn-primary, .btn-ghost { border-radius: 10px; padding: 8px 12px; cursor: pointer; border: 1px solid var(--line-2); background: var(--panel); }
.btn-primary { background: var(--brand-primary); color: #fff; border-color: var(--brand-primary); }
.btn-ghost.danger { color: var(--bad); }
.sheet { position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 45%, transparent); display: grid; place-items: center; z-index: 40; padding: 16px; }
.panel { width: min(480px, 100%); background: var(--panel); border-radius: 16px; padding: 18px; display: grid; gap: 12px; }
.field { display: grid; gap: 6px; }
.field input, .field select { border: 1px solid var(--line-2); border-radius: 10px; padding: 10px 12px; }
.hint { margin: -4px 0 0; font-size: 12px; color: var(--ink-soft); }
.foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
