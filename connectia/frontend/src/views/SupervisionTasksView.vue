<template>
  <section class="sup">
    <header class="sup-head">
      <button type="button" class="link" @click="$router.push('/supervision')">←</button>
      <h1>{{ mine ? 'Mis tareas' : 'Tareas' }}</h1>
      <button
        v-if="!mine"
        type="button"
        class="link"
        :class="{ on: selectMode }"
        @click="toggleSelectMode"
      >
        {{ selectMode ? 'Listo' : 'Masivas' }}
      </button>
      <button type="button" class="btn" @click="$router.push('/supervision/nueva')">+</button>
    </header>

    <div class="filters">
      <input v-model="q" class="inp" type="search" placeholder="Buscar título…" @keyup.enter="load" />
      <select v-model="status" @change="load">
        <option value="">Todos los estados</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="prioridad" @change="load">
        <option value="">Todas las prioridades</option>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      <select v-if="!mine" v-model="salaId" @change="load">
        <option value="">Todas las salas</option>
        <option v-for="s in salas" :key="s.id" :value="s.id">{{ s.nombre }}</option>
      </select>
    </div>

    <div v-if="selectMode" class="bulk-bar">
      <label class="all">
        <input type="checkbox" :checked="allSelected" @change="toggleAll($event.target.checked)" />
        {{ selected.size }} seleccionadas
      </label>
      <div class="bulk-actions">
        <button type="button" :disabled="!selected.size" @click="openSheet('assign')">Asignar</button>
        <button type="button" :disabled="!selected.size" @click="openSheet('prioritize')">Prioridad</button>
        <button type="button" :disabled="!selected.size" @click="openSheet('set_deadline')">Plazo</button>
        <button type="button" :disabled="!selected.size" @click="runBulk('start')">Iniciar</button>
        <button type="button" :disabled="!selected.size" @click="openSheet('complete')">Completar</button>
        <button type="button" class="danger" :disabled="!selected.size" @click="confirmCancel">
          Cancelar
        </button>
      </div>
    </div>

    <p v-if="bulkMsg" class="ok">{{ bulkMsg }}</p>
    <p v-if="error" class="sup-err">{{ error }}</p>
    <p v-if="loading" class="muted">Cargando…</p>
    <ul v-else class="list">
      <li
        v-for="t in items"
        :key="t.id"
        :class="{ selected: selected.has(t.id) }"
        @click="onRowClick(t)"
      >
        <div class="row">
          <input
            v-if="selectMode"
            type="checkbox"
            :checked="selected.has(t.id)"
            @click.stop="toggleOne(t.id)"
          />
          <strong>{{ t.titulo }}</strong>
          <span class="badge">{{ t.status }}</span>
        </div>
        <p class="muted">{{ t.prioridad }} · límite {{ formatDate(t.fechaLimite) }}</p>
      </li>
      <li v-if="!items.length" class="muted empty">Sin tareas</li>
    </ul>

    <div v-if="sheet" class="sheet-backdrop" @click.self="sheet = null">
      <div class="sheet">
        <h2>{{ sheetTitle }}</h2>
        <template v-if="sheet === 'assign'">
          <label>
            Operario
            <select v-model="bulkForm.asignadoId" class="inp">
              <option value="">Elegí operario</option>
              <option v-for="o in operarios" :key="o.id" :value="o.id">{{ o.nombre }}</option>
            </select>
          </label>
        </template>
        <template v-else-if="sheet === 'prioritize'">
          <label>
            Prioridad
            <select v-model="bulkForm.prioridad" class="inp">
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </template>
        <template v-else-if="sheet === 'set_deadline'">
          <label>
            Nuevo plazo
            <input v-model="bulkForm.fechaLimite" type="date" class="inp" />
          </label>
          <label>
            Prioridad (opcional)
            <select v-model="bulkForm.prioridadOpt" class="inp">
              <option value="">Sin cambiar</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </template>
        <template v-else-if="sheet === 'complete'">
          <label>
            Observación de cierre
            <textarea v-model="bulkForm.observacion" rows="3" class="inp" required />
          </label>
          <p class="hint">Se omiten tareas que requieren foto sin evidencia.</p>
        </template>
        <div class="sheet-actions">
          <button type="button" class="link" @click="sheet = null">Cerrar</button>
          <button type="button" class="primary" :disabled="busy" @click="submitSheet">Aplicar</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const mine = computed(() => route.path.includes('mis-tareas') || route.query.mine === '1')
const items = ref([])
const salas = ref([])
const operarios = ref([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const bulkMsg = ref('')
const status = ref('')
const prioridad = ref('')
const salaId = ref('')
const q = ref('')
const selectMode = ref(false)
const selected = ref(new Set())
const sheet = ref(null)
const statuses = ['pendiente', 'asignacion', 'en_progreso', 'completada', 'cancelada']
const bulkForm = reactive({
  asignadoId: '',
  prioridad: 'media',
  prioridadOpt: '',
  fechaLimite: '',
  observacion: '',
})

const sheetTitle = computed(() => {
  const map = {
    assign: 'Asignar masivo',
    prioritize: 'Cambiar prioridad',
    set_deadline: 'Cambiar plazo',
    complete: 'Completar masivo',
  }
  return map[sheet.value] || 'Acción masiva'
})

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((t) => selected.value.has(t.id)),
)

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return '—'
  }
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selected.value = new Set()
  bulkMsg.value = ''
}

function toggleOne(id) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll(on) {
  selected.value = on ? new Set(items.value.map((t) => t.id)) : new Set()
}

function onRowClick(t) {
  if (selectMode.value) {
    toggleOne(t.id)
    return
  }
  router.push(`/supervision/tareas/${t.id}`)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/supervision/tareas', {
      params: {
        mine: mine.value ? '1' : undefined,
        status: status.value || undefined,
        prioridad: prioridad.value || undefined,
        salaId: salaId.value || undefined,
        q: q.value.trim() || undefined,
      },
    })
    items.value = data.items || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al listar'
  } finally {
    loading.value = false
  }
}

async function openSheet(kind) {
  sheet.value = kind
  error.value = ''
  if (kind === 'assign' && !operarios.value.length) {
    const { data } = await api.get('/supervision/operarios')
    operarios.value = data.items || []
  }
}

function confirmCancel() {
  if (!selected.value.size) return
  if (!window.confirm(`¿Cancelar ${selected.value.size} tarea(s)?`)) return
  runBulk('cancel')
}

async function runBulk(action, extra = {}) {
  busy.value = true
  error.value = ''
  bulkMsg.value = ''
  try {
    const { data } = await api.post('/supervision/tareas/bulk', {
      action,
      ids: [...selected.value],
      ...extra,
    })
    bulkMsg.value = `OK ${data.ok} · omitidas ${data.skipped}`
    sheet.value = null
    selected.value = new Set()
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error en acción masiva'
  } finally {
    busy.value = false
  }
}

async function submitSheet() {
  if (sheet.value === 'assign') {
    if (!bulkForm.asignadoId) {
      error.value = 'Elegí operario'
      return
    }
    await runBulk('assign', { asignadoId: bulkForm.asignadoId })
  } else if (sheet.value === 'prioritize') {
    await runBulk('prioritize', { prioridad: bulkForm.prioridad })
  } else if (sheet.value === 'set_deadline') {
    if (!bulkForm.fechaLimite) {
      error.value = 'Fecha requerida'
      return
    }
    await runBulk('set_deadline', {
      fechaLimite: bulkForm.fechaLimite,
      prioridad: bulkForm.prioridadOpt || undefined,
    })
  } else if (sheet.value === 'complete') {
    if (!bulkForm.observacion.trim()) {
      error.value = 'Observación requerida'
      return
    }
    await runBulk('complete', { observacion: bulkForm.observacion })
  }
}

onMounted(async () => {
  if (!mine.value) {
    try {
      const { data } = await api.get('/supervision/salas')
      salas.value = data.items || []
    } catch {
      /* ignore */
    }
  }
  await load()
})
</script>

<style scoped>
.sup { padding: 1rem 1rem 5rem; }
.sup-head { display: flex; align-items: center; gap: 0.5rem; }
.sup-head h1 { flex: 1; margin: 0; font-size: 1.2rem; }
.link, .btn { border: 0; background: #f1f5f9; border-radius: 8px; padding: 0.4rem 0.7rem; }
.link.on { background: #0f766e; color: #fff; }
.filters { margin: 0.75rem 0; display: grid; gap: 0.4rem; }
.inp, select { width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #e2e8f0; font: inherit; box-sizing: border-box; }
.bulk-bar {
  position: sticky; top: 0; z-index: 5;
  background: #0f172a; color: #fff; border-radius: 12px;
  padding: 0.65rem 0.75rem; margin-bottom: 0.75rem;
}
.bulk-bar .all { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
.bulk-actions button {
  border: 0; background: #334155; color: #fff; border-radius: 8px;
  padding: 0.35rem 0.55rem; font-size: 0.78rem;
}
.bulk-actions button:disabled { opacity: 0.4; }
.bulk-actions .danger { background: #7f1d1d; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.list li { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem; cursor: pointer; }
.list li.selected { border-color: #0d9488; background: #f0fdfa; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.row strong { flex: 1; }
.badge { font-size: 0.75rem; background: #eef2ff; color: #3730a3; padding: 0.15rem 0.45rem; border-radius: 999px; }
.muted { color: #64748b; font-size: 0.85rem; margin: 0.25rem 0 0; }
.empty { text-align: center; padding: 1.5rem; }
.sup-err { color: #b91c1c; }
.ok { color: #0f766e; font-size: 0.85rem; }
.sheet-backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: flex-end; justify-content: center; z-index: 40;
}
.sheet {
  width: 100%; max-width: 28rem; background: #fff; border-radius: 16px 16px 0 0;
  padding: 1rem 1rem 1.5rem; display: grid; gap: 0.65rem;
}
.sheet h2 { margin: 0; font-size: 1.05rem; }
.sheet label { display: grid; gap: 0.3rem; font-size: 0.9rem; }
.sheet-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.35rem; }
.primary { background: #0f766e; color: #fff; border: 0; border-radius: 10px; padding: 0.55rem 0.9rem; }
.hint { margin: 0; font-size: 0.8rem; color: #64748b; }
</style>
