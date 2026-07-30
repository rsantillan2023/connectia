<template>
  <section class="sup">
    <header class="sup-head">
      <button type="button" class="link" @click="$router.push('/supervision')">←</button>
      <h1>Panel ECR</h1>
    </header>
    <p v-if="meta.mock" class="hint">
      Modo local (AttendancePunch) · sin API ECR externa
      <span v-if="meta.source"> · {{ meta.source }}</span>
    </p>
    <div class="tabs">
      <button type="button" :class="{ on: tab === 'marcas' }" @click="tab = 'marcas'">Marcas</button>
      <button type="button" :class="{ on: tab === 'domingos' }" @click="loadDomingos(); tab = 'domingos'">
        Domingos
      </button>
    </div>

    <div v-if="tab === 'marcas'">
      <label class="fecha">Fecha<input v-model="fecha" type="date" @change="loadMarcas" /></label>
      <p v-if="loading" class="muted">Cargando…</p>
      <ul class="list">
        <li v-for="(m, i) in marcas" :key="i" @click="openMark(m)">
          <strong>{{ m.nombreTrabajador }}</strong>
          <span class="muted">{{ m.nombreLocal }} · {{ m.mFueraRango }}</span>
        </li>
        <li v-if="!marcas.length && !loading" class="muted empty">Sin marcas</li>
      </ul>
    </div>

    <div v-else>
      <ul class="list">
        <li v-for="(d, i) in domingos" :key="i">
          <strong>{{ d.nombreTrabajador }}</strong>
          <span class="muted">por entregar: {{ d.domPorEntregar }} · entregados: {{ d.domEntregados }}</span>
        </li>
        <li v-if="!domingos.length && !loading" class="muted empty">Sin datos</li>
      </ul>
    </div>

    <div v-if="selected" class="sheet">
      <h2>{{ selected.nombreTrabajador }}</h2>
      <p class="muted">{{ selected.nombreClienteTrabajador }} · {{ selected.rutTrabajador }}</p>
      <p>{{ selected.horaMarca }} · {{ selected.mFueraRango }}</p>
      <div class="actions">
        <button v-if="selected.accJustificar" type="button" @click="justificar">Justificar</button>
        <button v-if="selected.accGenAnexo" type="button" @click="anexo">Anexo PDV</button>
        <button v-if="selected.accAmonestar" type="button" class="danger" @click="amonestar">Amonestar</button>
        <button type="button" @click="selected = null">Cerrar</button>
      </div>
    </div>
    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="error" class="sup-err">{{ error }}</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const tab = ref('marcas')
const fecha = ref(new Date().toISOString().slice(0, 10))
const marcas = ref([])
const domingos = ref([])
const selected = ref(null)
const loading = ref(false)
const error = ref('')
const msg = ref('')
const meta = ref({ mock: true })
const justificaciones = ref([])
const proyectos = ref([])

function toEcrFecha(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${d}-${m}-${y}`
}

async function loadMarcas() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/supervision/ecr/marcas', {
      params: { fecha: toEcrFecha(fecha.value) },
    })
    marcas.value = data.data || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error marcas'
  } finally {
    loading.value = false
  }
}

async function loadDomingos() {
  loading.value = true
  try {
    const { data } = await api.get('/supervision/ecr/domingos')
    domingos.value = data.data || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error domingos'
  } finally {
    loading.value = false
  }
}

async function openMark(m) {
  selected.value = m
  msg.value = ''
  try {
    const [j, p] = await Promise.all([
      api.get('/supervision/ecr/justificaciones'),
      api.get('/supervision/ecr/proyectos', {
        params: {
          division: m.idDivisionTrabajador,
          latRef: m.marcaLatitud,
          lngRef: m.marcaLongitud,
        },
      }),
    ])
    justificaciones.value = j.data.data || []
    proyectos.value = p.data.data || []
  } catch {
    /* ignore */
  }
}

function basePayload() {
  const m = selected.value
  return {
    fecha: m.fecha || toEcrFecha(fecha.value),
    rutTrabajador: m.rutTrabajador,
    idDivisionTrabajador: m.idDivisionTrabajador,
    tipoMarca: m.tipoMarca,
    punchId: m.punchId || null,
    userId: m.userId || null,
    motivo: '',
  }
}

async function justificar() {
  const idJustificacion = justificaciones.value[0]?.idJustificacion
  if (!idJustificacion) return (error.value = 'Sin justificaciones')
  if (!confirm('¿Confirmar justificación?')) return
  const { data } = await api.post('/supervision/ecr/justificar', { ...basePayload(), idJustificacion })
  msg.value = data.mensaje || 'Justificado'
  selected.value = null
  loadMarcas()
}

async function anexo() {
  const idProyecto = proyectos.value[0]?.idProyecto
  if (!idProyecto) return (error.value = 'Sin proyectos cercanos')
  if (!confirm('¿Generar anexo de contrato?')) return
  const { data } = await api.post('/supervision/ecr/anexo', { ...basePayload(), idProyecto })
  msg.value = data.mensaje || 'Anexo OK'
  selected.value = null
}

async function amonestar() {
  if (!confirm('¿Registrar amonestación?')) return
  const { data } = await api.post('/supervision/ecr/amonestar', basePayload())
  msg.value = data.mensaje || 'Amonestado'
  selected.value = null
}

onMounted(async () => {
  try {
    const { data } = await api.get('/supervision/ecr/meta')
    meta.value = data
  } catch {
    /* ignore */
  }
  loadMarcas()
})
</script>

<style scoped>
.sup { padding: 1rem 1rem 5rem; position: relative; }
.sup-head { display: flex; align-items: center; gap: 0.5rem; }
.sup-head h1 { margin: 0; font-size: 1.2rem; }
.link { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.hint { font-size: 0.8rem; color: #a16207; background: #fef9c3; padding: 0.4rem 0.6rem; border-radius: 8px; }
.tabs { display: flex; gap: 0.4rem; margin: 0.75rem 0; }
.tabs button { flex: 1; border: 0; background: #f1f5f9; padding: 0.55rem; border-radius: 8px; }
.tabs button.on { background: #0f766e; color: #fff; }
.fecha { display: grid; gap: 0.25rem; font-size: 0.85rem; margin-bottom: 0.75rem; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.list li { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem; display: grid; gap: 0.2rem; }
.muted { color: #64748b; font-size: 0.85rem; }
.empty { text-align: center; padding: 1rem; }
.sheet {
  position: sticky; bottom: 4.5rem; background: #fff; border: 1px solid #e2e8f0;
  border-radius: 16px; padding: 1rem; box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}
.actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
.actions button { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.5rem 0.7rem; }
.danger { color: #b91c1c; }
.ok { color: #0f766e; }
.sup-err { color: #b91c1c; }
</style>
