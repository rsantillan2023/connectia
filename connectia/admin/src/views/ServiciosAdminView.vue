<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const tab = ref('bandeja')
const loading = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ users: [], statuses: [] })
const areas = ref([])
const catalog = ref([])
const items = ref([])
const filters = ref({ status: '', areaId: '' })
const selected = ref(null)

const areaForm = ref({ name: '', color: '#0d9488' })
const itemForm = ref({
  label: '',
  areaId: '',
  slaMinutes: 1440,
  description: '',
  fieldsJson: '[]',
})

const statusLabel = {
  recibido: 'Recibido',
  en_curso: 'En curso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
}

const areaMap = computed(() =>
  Object.fromEntries(areas.value.map((a) => [a.id, a])),
)

async function ensureCaps() {
  try {
    await api.post('/admin/servicios/ensure-menu')
  } catch {
    /* ignore */
  }
}

async function loadMeta() {
  const { data } = await api.get('/admin/servicios/meta')
  meta.value = data
}

async function loadAreas() {
  const { data } = await api.get('/admin/servicios/areas')
  areas.value = data.items || []
  if (!itemForm.value.areaId && areas.value[0]) {
    itemForm.value.areaId = areas.value[0].id
  }
}

async function loadCatalog() {
  const { data } = await api.get('/admin/servicios/items')
  catalog.value = data.items || []
}

async function loadBandeja() {
  loading.value = true
  err.value = ''
  try {
    const params = {}
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.areaId) params.areaId = filters.value.areaId
    const { data } = await api.get('/admin/servicios', { params })
    items.value = data.items || []
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await ensureCaps()
  await Promise.all([loadMeta(), loadAreas(), loadCatalog(), loadBandeja()])
}

async function createArea() {
  err.value = ''
  try {
    await api.post('/admin/servicios/areas', areaForm.value)
    areaForm.value = { name: '', color: '#0d9488' }
    ok.value = 'Área creada'
    await loadAreas()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function createItem() {
  err.value = ''
  try {
    let fields = []
    try {
      fields = JSON.parse(itemForm.value.fieldsJson || '[]')
    } catch {
      return (err.value = 'fields JSON inválido')
    }
    await api.post('/admin/servicios/items', {
      label: itemForm.value.label,
      areaId: itemForm.value.areaId,
      slaMinutes: Number(itemForm.value.slaMinutes) || 0,
      description: itemForm.value.description,
      fields,
    })
    itemForm.value.label = ''
    itemForm.value.description = ''
    itemForm.value.fieldsJson = '[]'
    ok.value = 'Ítem creado'
    await loadCatalog()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

async function patchRequest(payload) {
  if (!selected.value) return
  err.value = ''
  try {
    const { data } = await api.patch(
      `/admin/servicios/${selected.value.id}`,
      payload,
    )
    selected.value = data.item
    ok.value = 'Actualizado'
    await loadBandeja()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  }
}

onMounted(refreshAll)
</script>

<template>
  <div class="sa">
    <header class="sa-head">
      <h1>Gestión de servicios</h1>
      <p>Catálogo + bandeja de agentes (Ola 43).</p>
    </header>

    <p v-if="err" class="sa-err">{{ err }}</p>
    <p v-if="ok" class="sa-ok">{{ ok }}</p>

    <nav class="sa-tabs">
      <button
        type="button"
        :class="{ on: tab === 'bandeja' }"
        @click="tab = 'bandeja'"
      >
        Bandeja
      </button>
      <button type="button" :class="{ on: tab === 'areas' }" @click="tab = 'areas'">
        Áreas
      </button>
      <button type="button" :class="{ on: tab === 'items' }" @click="tab = 'items'">
        Catálogo
      </button>
    </nav>

    <section v-if="tab === 'bandeja'" class="sa-panel">
      <div class="sa-filters">
        <select v-model="filters.status" @change="loadBandeja">
          <option value="">Todos los estados</option>
          <option v-for="s in meta.statuses || []" :key="s" :value="s">
            {{ statusLabel[s] || s }}
          </option>
        </select>
        <select v-model="filters.areaId" @change="loadBandeja">
          <option value="">Todas las áreas</option>
          <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <button type="button" @click="loadBandeja">Actualizar</button>
      </div>

      <div class="sa-split">
        <ul class="sa-list">
          <li
            v-for="r in items"
            :key="r.id"
            :class="{ sel: selected?.id === r.id }"
            @click="selected = r"
          >
            <strong>#{{ r.number }}</strong>
            {{ r.catalogLabel }}
            <span class="muted"> · {{ statusLabel[r.status] || r.status }}</span>
            <span v-if="r.slaBreached" class="sla">SLA</span>
          </li>
          <li v-if="!items.length && !loading" class="muted">Sin solicitudes.</li>
        </ul>

        <div v-if="selected" class="sa-detail">
          <h3>#{{ selected.number }} — {{ selected.catalogLabel }}</h3>
          <p class="muted">
            {{ selected.areaName }} · {{ statusLabel[selected.status] }}
            <template v-if="selected.slaDueAt">
              · SLA hasta {{ new Date(selected.slaDueAt).toLocaleString() }}
            </template>
          </p>
          <ul v-if="selected.formAnswers?.length" class="sa-answers">
            <li v-for="a in selected.formAnswers" :key="a.key">
              <strong>{{ a.key }}:</strong> {{ a.value }}
            </li>
          </ul>
          <label>
            Estado
            <select
              :value="selected.status"
              @change="patchRequest({ status: $event.target.value })"
            >
              <option
                v-for="s in meta.statuses || []"
                :key="s"
                :value="s"
                :disabled="s === selected.status"
              >
                {{ statusLabel[s] || s }}
              </option>
            </select>
          </label>
          <label>
            Asignado
            <select
              :value="selected.assigneeId || ''"
              @change="patchRequest({ assigneeId: $event.target.value || null })"
            >
              <option value="">— sin asignar —</option>
              <option v-for="u in meta.users || []" :key="u.id" :value="u.id">
                {{ u.label }}
              </option>
            </select>
          </label>
          <label>
            Notas internas
            <textarea
              :value="selected.internalNotes || ''"
              rows="3"
              @change="patchRequest({ internalNotes: $event.target.value })"
            />
          </label>
        </div>
      </div>
    </section>

    <section v-else-if="tab === 'areas'" class="sa-panel">
      <div class="sa-form">
        <input v-model="areaForm.name" placeholder="Nombre área" />
        <input v-model="areaForm.color" type="color" />
        <button type="button" @click="createArea">Agregar área</button>
      </div>
      <ul class="sa-list">
        <li v-for="a in areas" :key="a.id">
          <span class="dot" :style="{ background: a.color }" />
          {{ a.name }}
          <span class="muted">{{ a.active === false ? ' (inactiva)' : '' }}</span>
        </li>
      </ul>
    </section>

    <section v-else class="sa-panel">
      <div class="sa-form col">
        <input v-model="itemForm.label" placeholder="Nombre del servicio" />
        <select v-model="itemForm.areaId">
          <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <input
          v-model.number="itemForm.slaMinutes"
          type="number"
          min="0"
          placeholder="SLA minutos"
        />
        <input v-model="itemForm.description" placeholder="Descripción" />
        <textarea
          v-model="itemForm.fieldsJson"
          rows="4"
          placeholder='fields JSON ej. [{"key":"talle","label":"Talle","type":"select","required":true,"options":["S","M"]}]'
        />
        <button type="button" @click="createItem">Agregar ítem</button>
      </div>
      <ul class="sa-list">
        <li v-for="i in catalog" :key="i.id">
          <strong>{{ i.label }}</strong>
          · {{ areaMap[i.areaId]?.name || '—' }}
          · SLA {{ i.slaMinutes || 0 }} min
          <span class="muted"> · {{ (i.fields || []).length }} campos</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.sa {
  padding: 1.25rem 1.5rem 2rem;
  max-width: 1100px;
}
.sa-head h1 {
  margin: 0;
  font-size: 1.4rem;
}
.sa-head p {
  margin: 0.35rem 0 1rem;
  color: #64748b;
}
.sa-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.sa-tabs button {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}
.sa-tabs button.on {
  background: #0d9488;
  color: #fff;
  border-color: #0d9488;
}
.sa-filters,
.sa-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}
.sa-form.col {
  flex-direction: column;
  align-items: stretch;
  max-width: 36rem;
}
.sa-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 800px) {
  .sa-split {
    grid-template-columns: 1fr;
  }
}
.sa-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.sa-list li {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
}
.sa-list li.sel {
  border-color: #0d9488;
  box-shadow: 0 0 0 1px #0d9488;
}
.sa-detail {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
}
.sa-detail label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.sa-detail select,
.sa-detail textarea,
.sa-filters select,
.sa-form input,
.sa-form select,
.sa-form textarea,
.sa-filters button,
.sa-form button {
  font: inherit;
  padding: 0.45rem 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}
.sa-form button,
.sa-filters button {
  cursor: pointer;
  background: #0d9488;
  color: #fff;
  border-color: #0d9488;
  font-weight: 600;
}
.muted {
  color: #64748b;
  font-size: 0.85rem;
}
.sla {
  margin-left: 0.35rem;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.7rem;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}
.dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  margin-right: 0.35rem;
}
.sa-answers {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sa-err {
  color: #b91c1c;
}
.sa-ok {
  color: #047857;
  font-weight: 600;
}
</style>
