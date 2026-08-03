<template>
  <section class="sup" v-if="item">
    <header class="sup-head">
      <button type="button" class="link" @click="$router.push('/supervision/tareas')">←</button>
      <h1>{{ item.titulo }}</h1>
    </header>
    <p class="badge">{{ item.status }} · {{ item.prioridad }}</p>
    <p v-if="offlineNote" class="offline">{{ offlineNote }}</p>
    <p class="body">{{ item.descripcion || 'Sin descripción' }}</p>
    <p class="muted">Límite: {{ formatDate(item.fechaLimite) }}</p>

    <div class="actions" v-if="item.status !== 'completada' && item.status !== 'cancelada'">
      <button v-if="item.status !== 'en_progreso'" type="button" @click="iniciar">Iniciar</button>
      <button type="button" class="danger" @click="patch({ action: 'cancelar' })">Cancelar</button>
    </div>

    <h2 v-if="item.medicionesSnapshot?.length">Checklist</h2>
    <ul class="checks">
      <li v-for="m in item.medicionesSnapshot" :key="m.key">
        <label>
          <input
            type="checkbox"
            :checked="respuesta(m.key)?.completada"
            :disabled="item.status === 'completada'"
            @change="toggleMed(m.key, $event.target.checked)"
          />
          {{ m.nombre }}
        </label>
        <input
          v-if="item.status !== 'completada'"
          class="obs"
          :value="respuesta(m.key)?.observacion || ''"
          placeholder="Observación medición"
          @change="setObs(m.key, $event.target.value)"
        />
      </li>
    </ul>

    <h2>Adjuntos</h2>
    <form class="form row" @submit.prevent="uploadAdjunto">
      <input type="file" @change="onAdj" />
      <button type="submit" :disabled="!adjFile || busy">Subir</button>
    </form>
    <ul class="comments">
      <li v-for="a in adjuntos" :key="a.id">
        <a :href="a.url" target="_blank" rel="noopener">{{ a.nombre || a.url }}</a>
        <button type="button" class="danger tiny" @click="delAdjunto(a.id)">×</button>
      </li>
    </ul>

    <h2>Completar</h2>
    <form v-if="item.status !== 'completada'" class="form" @submit.prevent="completar">
      <label>Observación<textarea v-model="observacion" rows="3" required /></label>
      <label v-if="item.requiereFoto">Foto<input type="file" accept="image/*" @change="onFile" /></label>
      <button class="primary" type="submit" :disabled="busy">Marcar completada</button>
    </form>
    <p v-else class="ok">Completada {{ formatDate(item.fechaCompletado) }}</p>
    <img v-if="item.fotoUrl" :src="item.fotoUrl" alt="Evidencia" class="foto" />

    <h2>Comentarios</h2>
    <form class="form row" @submit.prevent="addComment">
      <input v-model="nuevoComentario" placeholder="Escribí un comentario" required />
      <button type="submit">Enviar</button>
    </form>
    <ul class="comments">
      <li v-for="c in comentarios" :key="c.id">{{ c.texto }}</li>
    </ul>
    <p v-if="error" class="sup-err">{{ error }}</p>
  </section>
  <p v-else-if="loading" class="muted pad">Cargando…</p>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import {
  cacheSupervisionGet,
  enqueueSupervisionOp,
  readSupervisionCache,
} from '../composables/useSupervisionOffline'

const route = useRoute()
const item = ref(null)
const comentarios = ref([])
const adjuntos = ref([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const observacion = ref('')
const nuevoComentario = ref('')
const file = ref(null)
const adjFile = ref(null)
const offlineNote = ref('')

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return '—'
  }
}

function respuesta(key) {
  return (item.value?.respuestas || []).find((r) => r.key === key)
}

async function load() {
  loading.value = true
  const cacheKey = `tarea:${route.params.id}`
  const cached = readSupervisionCache(cacheKey)
  if (cached?.item) {
    item.value = cached.item
    comentarios.value = cached.comentarios || []
  }
  try {
    const { data } = await api.get(`/supervision/tareas/${route.params.id}`)
    item.value = data.item
    comentarios.value = data.comentarios || []
    cacheSupervisionGet(cacheKey, data)
    const adj = await api.get(`/supervision/tareas/${route.params.id}/adjuntos`)
    adjuntos.value = adj.data.items || []
    offlineNote.value = ''
  } catch (e) {
    if (!item.value) error.value = e?.response?.data?.error || 'Error'
    else offlineNote.value = 'Mostrando cache offline'
  } finally {
    loading.value = false
  }
}

async function patch(body) {
  error.value = ''
  try {
    const { data } = await api.patch(`/supervision/tareas/${route.params.id}`, body)
    item.value = data.item
  } catch (e) {
    if (!e?.response && body.respuestas) {
      enqueueSupervisionOp({
        type: 'respuestas',
        tareaId: route.params.id,
        respuestas: body.respuestas,
      })
      item.value = { ...item.value, respuestas: body.respuestas }
      offlineNote.value = 'Cambio encolado offline'
      return
    }
    error.value = e?.response?.data?.error || 'Error al actualizar'
  }
}

async function iniciar() {
  try {
    await patch({ action: 'iniciar' })
  } catch {
    enqueueSupervisionOp({ type: 'iniciar', tareaId: route.params.id })
    item.value = { ...item.value, status: 'en_progreso' }
    offlineNote.value = 'Inicio encolado offline'
  }
}

async function toggleMed(key, completada) {
  const respuestas = (item.value.respuestas || []).map((r) =>
    r.key === key ? { ...r, completada } : r,
  )
  if (!respuestas.find((r) => r.key === key)) respuestas.push({ key, completada, valor: '', observacion: '' })
  await patch({ respuestas })
}

async function setObs(key, observacionVal) {
  const respuestas = (item.value.respuestas || []).map((r) =>
    r.key === key ? { ...r, observacion: observacionVal } : r,
  )
  if (!respuestas.find((r) => r.key === key)) {
    respuestas.push({ key, completada: false, valor: '', observacion: observacionVal })
  }
  await patch({ respuestas })
}

function onFile(e) {
  file.value = e.target.files?.[0] || null
}
function onAdj(e) {
  adjFile.value = e.target.files?.[0] || null
}

async function uploadAdjunto() {
  if (!adjFile.value) return
  busy.value = true
  try {
    const fd = new FormData()
    fd.append('file', adjFile.value)
    const { data } = await api.post(`/supervision/tareas/${route.params.id}/adjuntos`, fd)
    adjuntos.value.unshift(data.item)
    adjFile.value = null
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error adjunto'
  } finally {
    busy.value = false
  }
}

async function delAdjunto(id) {
  await api.delete(`/supervision/tareas/${route.params.id}/adjuntos/${id}`)
  adjuntos.value = adjuntos.value.filter((a) => a.id !== id)
}

async function completar() {
  busy.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('observacion', observacion.value)
    if (file.value) fd.append('foto', file.value)
    const { data } = await api.post(`/supervision/tareas/${route.params.id}/completar`, fd)
    item.value = data.item
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo completar'
  } finally {
    busy.value = false
  }
}

async function addComment() {
  try {
    const { data } = await api.post(`/supervision/tareas/${route.params.id}/comentarios`, {
      texto: nuevoComentario.value,
    })
    comentarios.value.unshift(data.item)
    nuevoComentario.value = ''
  } catch (e) {
    if (!e?.response) {
      enqueueSupervisionOp({
        type: 'comment',
        tareaId: route.params.id,
        texto: nuevoComentario.value,
      })
      comentarios.value.unshift({ id: `local_${Date.now()}`, texto: nuevoComentario.value })
      nuevoComentario.value = ''
      offlineNote.value = 'Comentario encolado offline'
      return
    }
    error.value = e?.response?.data?.error || 'Error comentario'
  }
}

onMounted(load)
</script>

<style scoped>
.sup { padding: 1rem 1rem 5rem; }
.pad { padding: 1rem; }
.sup-head { display: flex; align-items: center; gap: 0.5rem; }
.sup-head h1 { margin: 0; font-size: 1.15rem; }
.link { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.badge { display: inline-block; background: #eef2ff; color: #3730a3; padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.8rem; }
.offline { background: #fff7ed; color: #9a3412; padding: 0.4rem 0.6rem; border-radius: 8px; font-size: 0.85rem; }
.body { white-space: pre-wrap; }
.muted { color: #64748b; font-size: 0.85rem; }
.actions { display: flex; gap: 0.5rem; margin: 0.75rem 0; }
.actions button { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.5rem 0.75rem; }
.danger { color: #b91c1c !important; }
.tiny { border: 0; background: transparent; margin-left: 0.5rem; }
h2 { font-size: 1rem; margin: 1.25rem 0 0.5rem; }
.checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.obs { width: 100%; margin-top: 0.25rem; padding: 0.35rem; border: 1px solid #e2e8f0; border-radius: 6px; font: inherit; font-size: 0.85rem; }
.form { display: grid; gap: 0.5rem; }
.form.row { grid-template-columns: 1fr auto; }
textarea, input[type='text'], .form.row input { padding: 0.55rem; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; }
.primary { background: var(--brand-primary, #0f766e); color: #fff; border: 0; border-radius: 10px; padding: 0.7rem; }
.foto { max-width: 100%; border-radius: 12px; margin-top: 0.5rem; }
.comments { list-style: none; padding: 0; }
.comments li { background: #f8fafc; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; font-size: 0.9rem; display: flex; align-items: center; }
.ok { color: var(--brand-primary, #0f766e); }
.sup-err { color: #b91c1c; }
</style>
