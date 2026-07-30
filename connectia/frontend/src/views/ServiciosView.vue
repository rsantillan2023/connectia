<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'

const loading = ref(true)
const sending = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ areas: [], items: [] })
const items = ref([])
const filterArea = ref('')
const q = ref('')
const selectedId = ref('')
const note = ref('')
const answers = ref({})

const catalogVisible = computed(() => {
  let list = meta.value.items || []
  if (filterArea.value) list = list.filter((i) => i.areaId === filterArea.value)
  const term = q.value.trim().toLowerCase()
  if (term) {
    list = list.filter(
      (i) =>
        i.label.toLowerCase().includes(term) ||
        (i.description || '').toLowerCase().includes(term),
    )
  }
  return list
})

const selected = computed(() =>
  (meta.value.items || []).find((i) => i.id === selectedId.value) || null,
)

const areaName = (id) =>
  (meta.value.areas || []).find((a) => a.id === id)?.name || ''

watch(selectedId, (id) => {
  const item = (meta.value.items || []).find((i) => i.id === id)
  const next = {}
  for (const f of item?.fields || []) next[f.key] = ''
  answers.value = next
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const [m, list] = await Promise.all([
      api.get('/servicios/meta'),
      api.get('/servicios'),
    ])
    meta.value = m.data
    items.value = list.data.items || []
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!selected.value || sending.value) return
  sending.value = true
  err.value = ''
  ok.value = ''
  try {
    const idem =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `srv-${Date.now()}`
    const formAnswers = (selected.value.fields || []).map((f) => ({
      key: f.key,
      value: String(answers.value[f.key] ?? ''),
    }))
    const { data } = await api.post(
      '/servicios',
      {
        catalogItemId: selected.value.id,
        formAnswers,
        note: note.value.trim(),
        idempotencyKey: idem,
      },
      { headers: { 'Idempotency-Key': idem } },
    )
    ok.value = `Solicitud #${data.item.number} creada`
    note.value = ''
    selectedId.value = ''
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    sending.value = false
  }
}

async function cancel(req) {
  if (!confirm(`¿Cancelar solicitud #${req.number}?`)) return
  try {
    await api.patch(`/servicios/${req.id}`, { status: 'cancelado' })
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

const statusLabel = {
  recibido: 'Recibido',
  en_curso: 'En curso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
}

onMounted(load)
</script>

<template>
  <section class="sv">
    <header class="sv-head">
      <h1>Servicios</h1>
      <p>Pedí servicios internos y seguí el estado con SLA.</p>
    </header>

    <p v-if="err" class="sv-err">{{ err }}</p>
    <p v-if="ok" class="sv-ok">{{ ok }}</p>

    <div class="sv-filters">
      <input v-model="q" class="sv-input" type="search" placeholder="Buscar servicio…" />
      <select v-model="filterArea" class="sv-input">
        <option value="">Todas las áreas</option>
        <option v-for="a in meta.areas" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </div>

    <div class="sv-card">
      <h2 class="sv-sub">Nueva solicitud</h2>
      <label class="sv-label">
        Servicio
        <select v-model="selectedId" class="sv-input">
          <option value="">Elegí un servicio…</option>
          <option v-for="i in catalogVisible" :key="i.id" :value="i.id">
            {{ i.label }} · {{ areaName(i.areaId) }}
            <template v-if="i.slaMinutes"> (SLA {{ i.slaMinutes }} min)</template>
          </option>
        </select>
      </label>
      <p v-if="selected?.description" class="sv-meta">{{ selected.description }}</p>
      <template v-if="selected">
        <label
          v-for="f in selected.fields || []"
          :key="f.key"
          class="sv-label"
        >
          {{ f.label }}{{ f.required ? ' *' : '' }}
          <select
            v-if="f.type === 'select'"
            v-model="answers[f.key]"
            class="sv-input"
          >
            <option value="">—</option>
            <option v-for="o in f.options || []" :key="o" :value="o">{{ o }}</option>
          </select>
          <textarea
            v-else-if="f.type === 'textarea'"
            v-model="answers[f.key]"
            class="sv-input"
            rows="2"
          />
          <input
            v-else
            v-model="answers[f.key]"
            class="sv-input"
            :type="f.type === 'number' ? 'number' : 'text'"
          />
        </label>
        <label class="sv-label">
          Nota
          <textarea v-model="note" class="sv-input" rows="2" />
        </label>
        <button
          type="button"
          class="sv-primary"
          :disabled="sending || loading"
          @click="submit"
        >
          {{ sending ? 'Enviando…' : 'Confirmar solicitud' }}
        </button>
      </template>
    </div>

    <h2 class="sv-sub">Mis solicitudes</h2>
    <ul v-if="items.length" class="sv-list">
      <li v-for="r in items" :key="r.id" class="sv-item">
        <div class="sv-row">
          <strong>#{{ r.number }}</strong>
          <span class="sv-badge">{{ statusLabel[r.status] || r.status }}</span>
          <span v-if="r.slaBreached" class="sv-sla">SLA vencido</span>
        </div>
        <p class="sv-meta">
          {{ r.catalogLabel || 'Servicio' }}
          <span v-if="r.areaName"> · {{ r.areaName }}</span>
        </p>
        <button
          v-if="r.status === 'recibido'"
          type="button"
          class="sv-link"
          @click="cancel(r)"
        >
          Cancelar
        </button>
      </li>
    </ul>
    <p v-else-if="!loading" class="sv-meta">Sin solicitudes todavía.</p>
  </section>
</template>

<style scoped>
.sv {
  padding: 1rem 1rem 5rem;
  max-width: 32rem;
  margin: 0 auto;
}
.sv-head h1 {
  margin: 0;
  font-size: 1.35rem;
}
.sv-head p {
  margin: 0.35rem 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}
.sv-filters {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}
.sv-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}
.sv-sub {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.sv-label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.sv-input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  font: inherit;
}
.sv-primary {
  background: #0d9488;
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.sv-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.55rem;
}
.sv-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.9rem;
}
.sv-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.sv-badge {
  font-size: 0.7rem;
  background: #e2e8f0;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}
.sv-sla {
  font-size: 0.7rem;
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}
.sv-meta {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
}
.sv-link {
  margin-top: 0.4rem;
  background: none;
  border: 0;
  color: #0f766e;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.sv-err {
  color: #b91c1c;
}
.sv-ok {
  color: #047857;
  font-weight: 600;
}
</style>
