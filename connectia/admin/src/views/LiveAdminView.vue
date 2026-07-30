<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Live streaming</h1>
        <p>Emisiones por URL externa (YouTube / Vimeo / HLS) · Ola 26 Track B</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" @click="activate">Activar módulo</button>
        <button type="button" class="btn-primary" @click="openNew">Nueva emisión</button>
      </div>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <table class="table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Estado</th>
          <th>Inicio</th>
          <th>Views</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.title }}</td>
          <td>
            <span class="pill" :class="item.effectiveStatus">{{ item.effectiveStatus }}</span>
          </td>
          <td>{{ formatDate(item.startsAt) }}</td>
          <td>{{ item.viewCount || 0 }}</td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="edit(item)">Editar</button>
            <button type="button" class="btn-ghost" @click="setStatus(item, 'live')">LIVE</button>
            <button type="button" class="btn-ghost" @click="setStatus(item, 'ended')">Fin</button>
            <button type="button" class="btn-ghost danger" @click="remove(item)">Borrar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length" class="empty">Sin emisiones todavía.</p>

    <div v-if="editorOpen" class="sheet" @click.self="editorOpen = false">
      <form class="panel" @submit.prevent="save">
        <h2>{{ form.id ? 'Editar emisión' : 'Nueva emisión' }}</h2>
        <label>Título <input v-model="form.title" required maxlength="200" /></label>
        <label>URL stream (YouTube / Vimeo / .m3u8)
          <input v-model="form.streamUrl" required placeholder="https://www.youtube.com/watch?v=…" />
        </label>
        <label>Cover URL <input v-model="form.coverUrl" placeholder="https://…" /></label>
        <label>Replay URL <input v-model="form.replayUrl" placeholder="opcional" /></label>
        <label>Estado
          <select v-model="form.status">
            <option value="draft">Borrador</option>
            <option value="scheduled">Programado</option>
            <option value="live">En vivo</option>
            <option value="ended">Finalizado</option>
          </select>
        </label>
        <label>Inicio <input v-model="form.startsAt" type="datetime-local" /></label>
        <label>Fin <input v-model="form.endsAt" type="datetime-local" /></label>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="editorOpen = false">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const error = ref('')
const msg = ref('')
const editorOpen = ref(false)
const form = reactive({
  id: '',
  title: '',
  streamUrl: '',
  coverUrl: '',
  replayUrl: '',
  status: 'scheduled',
  startsAt: '',
  endsAt: '',
})

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

function toLocalInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

async function load() {
  try {
    const { data } = await api.get('/admin/live')
    items.value = data.items || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function activate() {
  try {
    await api.post('/admin/live/activate')
    msg.value = 'Módulo TV + Live activado'
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo activar'
  }
}

function openNew() {
  Object.assign(form, {
    id: '',
    title: '',
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    coverUrl: '',
    replayUrl: '',
    status: 'scheduled',
    startsAt: toLocalInput(new Date()),
    endsAt: '',
  })
  editorOpen.value = true
}

function edit(item) {
  Object.assign(form, {
    id: item.id,
    title: item.title,
    streamUrl: item.streamUrl,
    coverUrl: item.coverUrl || '',
    replayUrl: item.replayUrl || '',
    status: item.status,
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
  })
  editorOpen.value = true
}

async function save() {
  const payload = {
    title: form.title,
    streamUrl: form.streamUrl,
    coverUrl: form.coverUrl,
    replayUrl: form.replayUrl,
    status: form.status,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    audience: { mode: 'all' },
  }
  if (form.id) await api.patch(`/admin/live/${form.id}`, payload)
  else await api.post('/admin/live', payload)
  editorOpen.value = false
  await load()
}

async function setStatus(item, status) {
  await api.patch(`/admin/live/${item.id}`, { status })
  await load()
}

async function remove(item) {
  if (!confirm(`¿Borrar ${item.title}?`)) return
  await api.delete(`/admin/live/${item.id}`)
  await load()
}

onMounted(load)
</script>

<style scoped>
.page { padding: 1.25rem; }
.page-head { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; margin-bottom: 1rem; }
.head-actions { display: flex; gap: 0.5rem; }
.btn-ghost, .btn-primary {
  border: 0; border-radius: 999px; padding: 0.45rem 0.9rem; cursor: pointer; font-weight: 600;
}
.btn-ghost { background: var(--panel-2); }
.btn-ghost.danger { color: var(--bad); }
.btn-primary { background: var(--bad); color: #fff; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 0.55rem; border-bottom: 1px solid var(--line); font-size: 0.92rem; }
.actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pill {
  display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
  background: var(--line); text-transform: uppercase;
}
.pill.live { background: #fecaca; color: var(--bad); }
.pill.scheduled { background: var(--warn-bg); color: var(--warn); }
.err { color: var(--bad); }
.ok { color: var(--ok); }
.empty { opacity: 0.65; }
.sheet {
  position: fixed; inset: 0; background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid; place-items: center; padding: 1rem; z-index: 40;
}
.panel {
  background: var(--panel); border-radius: 14px; padding: 1.1rem; width: min(520px, 100%);
  display: grid; gap: 0.7rem;
}
.panel label { display: grid; gap: 0.25rem; font-size: 0.9rem; }
.panel input, .panel select { padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid var(--line-2); }
.footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
