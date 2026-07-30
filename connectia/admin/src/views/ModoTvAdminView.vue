<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Modo TV</h1>
        <p>Dispositivos de sede, playlists y emparejamiento</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" @click="activate">Activar módulo</button>
        <button type="button" class="btn-ghost" @click="tab = 'devices'" :class="{ on: tab === 'devices' }">
          Dispositivos
        </button>
        <button type="button" class="btn-ghost" @click="tab = 'playlists'" :class="{ on: tab === 'playlists' }">
          Playlists
        </button>
        <button v-if="tab === 'playlists'" type="button" class="btn-primary" @click="openNewPlaylist">
          Nueva playlist
        </button>
      </div>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <section class="share-card" aria-labelledby="tv-share-title">
      <div class="share-card__intro">
        <h2 id="tv-share-title">Abrir / compartir pantalla TV</h2>
        <p>
          Esta pantalla de admin (<code>{{ adminPath }}</code>) no es la TV.
          En la otra PC o monitor hay que abrir la <strong>app miembro</strong>:
        </p>
      </div>

      <div class="share-url">
        <label class="share-url__label" for="tv-open-url">Enlace para la TV</label>
        <div class="share-url__row">
          <input
            id="tv-open-url"
            class="share-url__input"
            type="text"
            readonly
            :value="tvOpenUrl"
            @focus="$event.target.select()"
          />
          <button type="button" class="btn-primary" @click="copyTvUrl">
            {{ copiedUrl ? 'Copiado' : 'Copiar enlace' }}
          </button>
          <a class="btn-ghost share-open" :href="tvOpenUrl" target="_blank" rel="noopener noreferrer">
            Abrir acá
          </a>
        </div>
      </div>

      <ol class="share-steps">
        <li>Copiá el enlace y pegalo en el navegador de la otra pantalla (Chrome en modo pantalla completa ayuda).</li>
        <li>La TV muestra un <strong>código de 6 dígitos</strong> y un QR.</li>
        <li>
          Desde el celular o la app, andá a <strong>Emparejar TV</strong>
          (<template v-if="tvPairUrl"> (<code class="inline">{{ tvPairPath }}</code>)</template>
          e ingresá el código (o escaneá el QR).
        </li>
      </ol>

      <div class="share-actions">
        <button type="button" class="btn-ghost" @click="copyInstructions">
          {{ copiedInstructions ? 'Instrucciones copiadas' : 'Copiar instrucciones para pegar' }}
        </button>
        <button type="button" class="btn-ghost" @click="shareOrCopy">
          {{ sharedOk ? 'Listo' : 'Compartir…' }}
        </button>
      </div>
    </section>

    <section v-if="tab === 'devices'">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th>Heartbeat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in devices" :key="d.id">
            <td>{{ d.name }}</td>
            <td>{{ d.locationLabel || '—' }}</td>
            <td>{{ d.status }}</td>
            <td>{{ formatDate(d.lastHeartbeatAt) }}</td>
            <td class="actions">
              <select
                :value="d.playlistId || ''"
                @change="assignPlaylist(d, $event.target.value)"
              >
                <option value="">Sin playlist</option>
                <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button
                v-if="d.status === 'active'"
                type="button"
                class="btn-ghost danger"
                @click="revoke(d)"
              >
                Revocar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!devices.length" class="empty">
        Todavía no hay dispositivos. Usá el enlace de arriba en la otra pantalla y emparejá con el código.
      </p>
    </section>

    <section v-else>
      <article v-for="p in playlists" :key="p.id" class="card">
        <div class="card-head">
          <h2>{{ p.name }} <small>v{{ p.version }}</small></h2>
          <button type="button" class="btn-ghost" @click="editPlaylist(p)">Editar ítems</button>
        </div>
        <p>{{ p.items?.length || 0 }} ítems · fallback: {{ p.fallbackText }}</p>
      </article>
      <p v-if="!playlists.length" class="empty">Todavía no hay playlists.</p>
    </section>

    <div v-if="editorOpen" class="sheet" @click.self="editorOpen = false">
      <form class="panel" @submit.prevent="savePlaylist">
        <h2>{{ editing?.id ? 'Editar playlist' : 'Nueva playlist' }}</h2>
        <label>Nombre <input v-model="form.name" required maxlength="120" /></label>
        <label>Fallback <input v-model="form.fallbackText" maxlength="300" /></label>
        <div v-for="(it, i) in form.items" :key="i" class="item-row">
          <select v-model="it.type">
            <option value="text">Texto</option>
            <option value="image">Imagen</option>
            <option value="video">Video</option>
            <option value="youtube">YouTube</option>
          </select>
          <input v-if="it.type !== 'text'" v-model="it.url" placeholder="URL https…" />
          <input v-else v-model="it.text" placeholder="Texto en pantalla" />
          <input v-model.number="it.durationSec" type="number" min="5" max="3600" title="Segundos" />
          <button type="button" class="btn-ghost" @click="form.items.splice(i, 1)">Quitar</button>
        </div>
        <button type="button" class="btn-ghost" @click="form.items.push({ type: 'text', text: '', url: '', durationSec: 15 })">
          + Ítem
        </button>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="editorOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const tab = ref('devices')
const devices = ref([])
const playlists = ref([])
const error = ref('')
const msg = ref('')
const editorOpen = ref(false)
const editing = ref(null)
const form = reactive({ name: '', fallbackText: 'Contenido no disponible', items: [] })
const copiedUrl = ref(false)
const copiedInstructions = ref(false)
const sharedOk = ref(false)

const adminPath = '/modo-tv'
const tvPairPath = '/tv/emparejar'

/** Base de la app U (en local: :5173; admin suele ser :5174). */
function memberAppBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && /localhost:5174/i.test(window.location.origin)) {
    return 'http://localhost:5173'
  }
  return String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
}

const tvOpenUrl = computed(() => `${memberAppBaseUrl()}/tv`)
const tvPairUrl = computed(() => `${memberAppBaseUrl()}${tvPairPath}`)

const instructionsText = computed(
  () =>
    `Modo TV — cómo abrir en otra pantalla

1) En la TV / otra PC abrí este enlace:
${tvOpenUrl.value}

2) Vas a ver un código de 6 dígitos (y un QR).

3) Desde la app Connectyx andá a Emparejar TV e ingresá el código
   (o abrí ${tvPairUrl.value}).

Nota: ${adminPath} es solo el panel de administración; la pantalla de sede es /tv.`,
)

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

async function copyTvUrl() {
  const ok = await copyText(tvOpenUrl.value)
  if (!ok) {
    error.value = 'No se pudo copiar el enlace'
    return
  }
  copiedUrl.value = true
  setTimeout(() => {
    copiedUrl.value = false
  }, 2000)
}

async function copyInstructions() {
  const ok = await copyText(instructionsText.value)
  if (!ok) {
    error.value = 'No se pudieron copiar las instrucciones'
    return
  }
  copiedInstructions.value = true
  setTimeout(() => {
    copiedInstructions.value = false
  }, 2000)
}

async function shareOrCopy() {
  const payload = {
    title: 'Modo TV — Connectyx',
    text: instructionsText.value,
    url: tvOpenUrl.value,
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(payload)
      sharedOk.value = true
      setTimeout(() => {
        sharedOk.value = false
      }, 2000)
      return
    }
  } catch (e) {
    if (e?.name === 'AbortError') return
  }
  await copyInstructions()
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

async function load() {
  error.value = ''
  try {
    const [d, p] = await Promise.all([api.get('/admin/tv/devices'), api.get('/admin/tv/playlists')])
    devices.value = d.data.items || []
    playlists.value = p.data.items || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function activate() {
  try {
    await api.post('/admin/tv/activate')
    msg.value = 'Módulo TV + Live activado (caps + menú)'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo activar'
  }
}

async function revoke(d) {
  if (!confirm(`¿Revocar ${d.name}?`)) return
  await api.post(`/admin/tv/devices/${d.id}/revoke`)
  await load()
}

async function assignPlaylist(d, playlistId) {
  await api.patch(`/admin/tv/devices/${d.id}`, { playlistId: playlistId || null })
  await load()
}

function openNewPlaylist() {
  editing.value = null
  form.name = 'Playlist sede'
  form.fallbackText = 'Contenido no disponible'
  form.items = [{ type: 'text', text: 'Bienvenidos', url: '', durationSec: 15 }]
  editorOpen.value = true
}

function editPlaylist(p) {
  editing.value = p
  form.name = p.name
  form.fallbackText = p.fallbackText || ''
  form.items = (p.items || []).map((it) => ({
    type: it.type,
    url: it.url || '',
    text: it.text || '',
    durationSec: it.durationSec || 15,
  }))
  editorOpen.value = true
}

async function savePlaylist() {
  const payload = {
    name: form.name,
    fallbackText: form.fallbackText,
    items: form.items.map((it, order) => ({ ...it, order })),
  }
  if (editing.value?.id) await api.patch(`/admin/tv/playlists/${editing.value.id}`, payload)
  else await api.post('/admin/tv/playlists', payload)
  editorOpen.value = false
  await load()
}

onMounted(load)
</script>

<style scoped>
.page { padding: 1.25rem; }
.page-head { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; margin-bottom: 1rem; }
.head-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.btn-ghost, .btn-primary {
  border: 0; border-radius: 10px; padding: 0.45rem 0.9rem; cursor: pointer; font-weight: 600;
  text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
  white-space: nowrap;
}
.btn-ghost { background: var(--panel-2); color: var(--ink); border: 1px solid var(--line); }
.btn-ghost.on { background: var(--line); }
.btn-ghost.danger { color: var(--bad); }
.btn-primary { background: var(--brand, #6b5bf0); color: #fff; }
.share-card {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  display: grid;
  gap: 0.85rem;
}
.share-card__intro h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: var(--ink);
}
.share-card__intro p {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-soft);
  line-height: 1.45;
}
.share-card code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--panel);
  color: var(--brand-ink, var(--ink));
}
.share-url__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-faint);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.share-url__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: stretch;
}
.share-url__input {
  flex: 1 1 14rem;
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92rem;
}
.share-steps {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.9rem;
  color: var(--ink-soft);
  line-height: 1.5;
  display: grid;
  gap: 0.35rem;
}
.share-steps .inline { word-break: break-all; }
.share-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 0.55rem; border-bottom: 1px solid var(--line); font-size: 0.92rem; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.card { background: var(--panel-2); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; }
.card-head { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
.card h2 { margin: 0; font-size: 1.05rem; }
.card small { opacity: 0.55; font-weight: 500; }
.err { color: var(--bad); }
.ok { color: var(--ok); }
.empty { opacity: 0.65; }
.sheet {
  position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid; place-items: center; padding: 1rem; z-index: 40;
}
.panel {
  background: var(--panel); border-radius: 14px; padding: 1.1rem; width: min(560px, 100%);
  display: grid; gap: 0.7rem; max-height: 90vh; overflow: auto;
}
.panel label { display: grid; gap: 0.25rem; font-size: 0.9rem; }
.panel input, .panel select { padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid var(--line-2); }
.item-row { display: grid; grid-template-columns: 7rem 1fr 4.5rem auto; gap: 0.35rem; align-items: center; }
.footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
@media (max-width: 700px) {
  .item-row { grid-template-columns: 1fr; }
}
</style>
