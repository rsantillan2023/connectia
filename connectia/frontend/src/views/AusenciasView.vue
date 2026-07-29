<template>
  <section class="aus">
    <header class="aus-head">
      <div>
        <h1>Ausencias</h1>
        <p>Registrá y seguí tus ausentismos</p>
      </div>
      <button type="button" class="aus-new" @click="showCreate = true">Nueva</button>
    </header>

    <select v-model="estado" class="aus-select" @change="load">
      <option value="">Todos</option>
      <option value="pendiente">Pendiente</option>
      <option value="aprobada">Aprobada</option>
      <option value="rechazada">Rechazada</option>
      <option value="cancelada">Cancelada</option>
    </select>

    <p v-if="error" class="aus-err">{{ error }}</p>
    <p v-if="loading" class="aus-muted">Cargando…</p>

    <div class="aus-list">
      <button
        v-for="r in items"
        :key="r.id"
        type="button"
        class="aus-card"
        @click="$router.push(`/ausencias/${r.id}`)"
      >
        <div class="aus-top">
          <span>{{ r.codigo }}</span>
          <span>{{ r.estadoLabel }}</span>
        </div>
        <h2>{{ r.tipoNombre }}</h2>
        <p>{{ r.desde }} → {{ r.hasta }} · {{ r.dias }} día(s)</p>
      </button>
    </div>

    <p v-if="!loading && !items.length" class="aus-muted">Sin ausencias registradas.</p>

    <div v-if="showCreate" class="aus-sheet" @click.self="showCreate = false">
      <form class="aus-panel" @submit.prevent="create">
        <h2>Nueva ausencia</h2>
        <select v-model="draft.tipoKey" class="aus-select" required>
          <option v-for="t in tipos" :key="t.key" :value="t.key">{{ t.nombre }}</option>
        </select>
        <input v-model="draft.desde" type="date" class="aus-select" required />
        <input v-model="draft.hasta" type="date" class="aus-select" required />
        <textarea v-model="draft.motivo" rows="3" class="aus-select" placeholder="Motivo" />
        <label class="aus-file">
          <span>
            Adjunto
            <em v-if="tipoSeleccionado?.requiereAdjunto"> (obligatorio)</em>
          </span>
          <input type="file" accept="image/*,application/pdf" @change="onFile" />
          <small v-if="uploading">Subiendo…</small>
          <small v-else-if="draft.adjuntos.length">
            {{ draft.adjuntos[0].nombre }}
            <button type="button" class="aus-link" @click="draft.adjuntos = []">Quitar</button>
          </small>
        </label>
        <p v-if="createError" class="aus-err">{{ createError }}</p>
        <div class="aus-actions">
          <button type="button" class="aus-ghost" @click="showCreate = false">Cancelar</button>
          <button type="submit" class="aus-new" :disabled="saving || uploading">Enviar</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const tipos = ref([])
const estado = ref('')
const loading = ref(false)
const error = ref('')
const showCreate = ref(false)
const saving = ref(false)
const uploading = ref(false)
const createError = ref('')
const draft = reactive({
  tipoKey: 'injustificada',
  desde: '',
  hasta: '',
  motivo: '',
  adjuntos: [],
})

const tipoSeleccionado = computed(() => tipos.value.find((t) => t.key === draft.tipoKey))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (estado.value) params.estado = estado.value
    const [list, tiposRes] = await Promise.all([
      api.get('/ausentismos', { params }),
      api.get('/ausentismos/tipos'),
    ])
    items.value = list.data.items || []
    tipos.value = tiposRes.data.tipos || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    loading.value = false
  }
}

async function onFile(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  uploading.value = true
  createError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/ausentismos/upload', fd)
    draft.adjuntos = [{ url: data.url, nombre: data.nombre || file.name }]
  } catch (err) {
    createError.value = err.response?.data?.error || 'No se pudo subir'
  } finally {
    uploading.value = false
  }
}

async function create() {
  saving.value = true
  createError.value = ''
  try {
    if (tipoSeleccionado.value?.requiereAdjunto && !draft.adjuntos.length) {
      createError.value = 'Este tipo requiere un adjunto'
      return
    }
    await api.post('/ausentismos', {
      tipoKey: draft.tipoKey,
      desde: draft.desde,
      hasta: draft.hasta || draft.desde,
      motivo: draft.motivo,
      adjuntos: draft.adjuntos,
    })
    showCreate.value = false
    draft.adjuntos = []
    await load()
  } catch (e) {
    createError.value = e.response?.data?.error || e.message || 'Error'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.aus {
  padding: 1rem 1rem 5rem;
}
.aus-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.aus-head h1 {
  margin: 0;
  font-size: 1.35rem;
}
.aus-head p {
  margin: 0.25rem 0 0;
  color: #64748b;
}
.aus-new {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
  font-weight: 600;
}
.aus-ghost {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
}
.aus-select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  padding: 0.55rem 0.75rem;
  margin-bottom: 0.65rem;
  font: inherit;
}
.aus-list {
  display: grid;
  gap: 0.65rem;
}
.aus-card {
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  background: #fff;
}
.aus-top {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.8rem;
}
.aus-card h2 {
  margin: 0.35rem 0 0;
  font-size: 1rem;
}
.aus-card p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}
.aus-err {
  color: #b91c1c;
}
.aus-muted {
  color: #64748b;
}
.aus-sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}
.aus-panel {
  width: 100%;
  background: #fff;
  border-radius: 1rem 1rem 0 0;
  padding: 1.1rem;
}
.aus-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.aus-file {
  display: grid;
  gap: 0.35rem;
  margin: 0.5rem 0;
  font-size: 0.85rem;
}
.aus-link {
  border: 0;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
}
</style>
