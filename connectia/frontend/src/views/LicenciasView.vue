<template>
  <section class="lic">
    <header class="lic-head">
      <div>
        <h1>Vacaciones y permisos</h1>
        <p>Consultá saldos y pedí licencias</p>
      </div>
      <button type="button" class="lic-new" @click="openCreate">Nueva</button>
    </header>

    <div v-if="saldos.length" class="lic-saldos">
      <p v-if="legislacion" class="lic-legis">
        Legislación {{ legislacion.pais === 'CL' ? 'Chile' : 'Argentina' }}
        · vacaciones en días {{ legislacion.cuentaVacaciones === 'habiles' ? 'hábiles' : 'corridos' }}
      </p>
      <article v-for="s in saldos" :key="s.tipo.key" class="lic-saldo">
        <h2>{{ s.tipo.nombre }}</h2>
        <p class="lic-disp">
          <strong>{{ s.saldo.disponible }}</strong> disponibles
          <span v-if="s.tipo.cuentaDias === 'habiles'" class="lic-chip">hábiles</span>
        </p>
        <p class="lic-meta">
          Devengados {{ s.saldo.devengados }} · Usados {{ s.saldo.usados }} · Pendientes
          {{ s.saldo.pendientes }}
        </p>
        <p v-if="s.antiguedad" class="lic-meta">
          Antigüedad {{ s.antiguedad.anios }} años → tramo {{ s.antiguedad.dias }} días
        </p>
      </article>
    </div>

    <div class="lic-filters">
      <select v-model="estado" class="lic-select" @change="load">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="aprobada">Aprobada</option>
        <option value="rechazada">Rechazada</option>
        <option value="cancelada">Cancelada</option>
      </select>
    </div>

    <p v-if="error" class="lic-err">{{ error }}</p>
    <p v-if="loading" class="lic-muted">Cargando…</p>

    <div class="lic-list">
      <button
        v-for="r in items"
        :key="r.id"
        type="button"
        class="lic-card"
        @click="$router.push(`/licencias/${r.id}`)"
      >
        <div class="lic-card-top">
          <span class="lic-code">{{ r.codigo }}</span>
          <span class="lic-estado" :data-estado="r.estado">{{ r.estadoLabel }}</span>
        </div>
        <h2>{{ r.tipoNombre }}</h2>
        <p class="lic-meta">{{ r.desde }} → {{ r.hasta }} · {{ r.dias }} día(s)</p>
      </button>
    </div>

    <p v-if="!loading && !items.length" class="lic-muted center">No tenés solicitudes todavía.</p>

    <div v-if="showCreate" class="lic-sheet" @click.self="showCreate = false">
      <form class="lic-sheet-panel" @submit.prevent="create">
        <h2>Nueva licencia</h2>
        <select v-model="draft.tipoKey" class="lic-select" required>
          <option disabled value="">Tipo</option>
          <option v-for="t in tipos" :key="t.key" :value="t.key">{{ t.nombre }}</option>
        </select>
        <label class="lic-field">
          <span>Desde</span>
          <input v-model="draft.desde" type="date" class="lic-input" required />
        </label>
        <label class="lic-field">
          <span>Hasta</span>
          <input v-model="draft.hasta" type="date" class="lic-input" required />
        </label>
        <label class="lic-field">
          <span>Motivo</span>
          <textarea v-model="draft.motivo" rows="3" class="lic-input" />
        </label>
        <label class="lic-field">
          <span>
            Adjunto
            <em v-if="tipoSeleccionado?.requiereAdjunto" class="lic-req"> (obligatorio)</em>
          </span>
          <input type="file" accept="image/*,application/pdf" class="lic-input" @change="onFile" />
          <span v-if="uploading" class="lic-meta">Subiendo…</span>
          <span v-else-if="draft.adjuntos.length" class="lic-meta">
            {{ draft.adjuntos.map((a) => a.nombre).join(', ') }}
            <button type="button" class="lic-link" @click="draft.adjuntos = []">Quitar</button>
          </span>
        </label>
        <p v-if="createError" class="lic-err">{{ createError }}</p>
        <div class="lic-actions">
          <button type="button" class="lic-ghost" @click="showCreate = false">Cancelar</button>
          <button type="submit" class="lic-new" :disabled="saving || uploading">Enviar</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const items = ref([])
const saldos = ref([])
const tipos = ref([])
const legislacion = ref(null)
const estado = ref('')
const loading = ref(false)
const error = ref('')
const showCreate = ref(false)
const saving = ref(false)
const uploading = ref(false)
const createError = ref('')
const draft = reactive({
  tipoKey: 'vacaciones',
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
    const [list, saldoRes, tiposRes] = await Promise.all([
      api.get('/licencias', { params }),
      api.get('/licencias/saldo'),
      api.get('/licencias/tipos'),
    ])
    items.value = list.data.items || []
    saldos.value = saldoRes.data.saldos || []
    tipos.value = tiposRes.data.tipos || []
    legislacion.value = saldoRes.data.legislacion || tiposRes.data.legislacion || null
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  draft.adjuntos = []
  showCreate.value = true
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
    const { data } = await api.post('/licencias/upload', fd)
    draft.adjuntos = [{ url: data.url, nombre: data.nombre || file.name }]
  } catch (err) {
    createError.value = err.response?.data?.error || 'No se pudo subir el archivo'
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
    await api.post('/licencias', {
      tipoKey: draft.tipoKey,
      desde: draft.desde,
      hasta: draft.hasta || draft.desde,
      motivo: draft.motivo,
      adjuntos: draft.adjuntos,
    })
    showCreate.value = false
    draft.motivo = ''
    draft.adjuntos = []
    await load()
  } catch (e) {
    createError.value = e.response?.data?.error || e.message || 'Error al crear'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.lic {
  padding: 1rem 1rem 5rem;
}
.lic-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.lic-head h1 {
  font-size: 1.35rem;
  margin: 0;
}
.lic-head p {
  margin: 0.25rem 0 0;
  color: var(--muted, #64748b);
  font-size: 0.9rem;
}
.lic-new {
  background: var(--brand, #0f766e);
  color: #fff;
  border: 0;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
  font-weight: 600;
}
.lic-ghost {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
}
.lic-saldos {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1rem;
}
.lic-legis {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
}
.lic-chip {
  margin-left: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #0f766e;
}
.lic-req {
  font-style: normal;
  color: #b45309;
  font-size: 0.8rem;
}
.lic-link {
  border: 0;
  background: transparent;
  color: #0f766e;
  font-size: 0.8rem;
  margin-left: 0.35rem;
  cursor: pointer;
}
.lic-saldo {
  background: #f8fafc;
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
}
.lic-saldo h2 {
  margin: 0;
  font-size: 0.95rem;
}
.lic-disp {
  margin: 0.35rem 0 0;
  font-size: 1.1rem;
}
.lic-meta {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}
.lic-filters {
  margin-bottom: 0.75rem;
}
.lic-select,
.lic-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  padding: 0.55rem 0.75rem;
  font: inherit;
}
.lic-list {
  display: grid;
  gap: 0.65rem;
}
.lic-card {
  text-align: left;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
}
.lic-card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.lic-code {
  font-size: 0.75rem;
  color: #64748b;
}
.lic-estado {
  font-size: 0.75rem;
  font-weight: 600;
}
.lic-estado[data-estado='pendiente'] {
  color: #b45309;
}
.lic-estado[data-estado='aprobada'] {
  color: #047857;
}
.lic-estado[data-estado='rechazada'],
.lic-estado[data-estado='cancelada'] {
  color: #b91c1c;
}
.lic-card h2 {
  margin: 0.35rem 0 0;
  font-size: 1rem;
}
.lic-err {
  color: #b91c1c;
}
.lic-muted {
  color: #64748b;
}
.lic-muted.center {
  text-align: center;
}
.lic-sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}
.lic-sheet-panel {
  width: 100%;
  background: #fff;
  border-radius: 1rem 1rem 0 0;
  padding: 1.1rem;
  display: grid;
  gap: 0.65rem;
}
.lic-field {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.lic-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
</style>
