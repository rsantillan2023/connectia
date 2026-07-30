<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 tabindex="-1">Listas para el legajo</h1>
        <p>
          Opciones de los desplegables (género, provincias, bancos…). Sin estas listas, la ficha de empleado
          no tiene valores para elegir.
        </p>
        <ScreenHelp
          purpose="Listas maestras que alimentan el legajo."
          can-do="Cargar un set inicial para Argentina, o alta/edición de cada ítem. Desactivar sin borrar."
        />
      </div>
      <div class="head-actions">
        <button type="button" class="btn-ghost" :disabled="seeding" @click="seedDefaults">
          {{ seeding ? 'Cargando…' : 'Cargar listas iniciales (AR)' }}
        </button>
        <button type="button" class="btn-primary" @click="openNew">Nuevo ítem</button>
      </div>
    </header>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="filters filters--sticky" role="toolbar" aria-label="Filtro rápido por tipo">
      <button
        type="button"
        class="chip"
        :class="{ active: !tipo }"
        @click="setTipo('')"
      >
        Todos
      </button>
      <button
        v-for="t in tipos"
        :key="t"
        type="button"
        class="chip"
        :class="{ active: tipo === t }"
        :title="t"
        @click="setTipo(t)"
      >
        {{ labelTipo(t) }}
      </button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Código</th>
          <th>Etiqueta</th>
          <th>Padre</th>
          <th>Orden</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>{{ it.tipo }}</td>
          <td><code>{{ it.codigo }}</code></td>
          <td>{{ it.label }}</td>
          <td>{{ it.parentCodigo || '—' }}</td>
          <td>{{ it.orden }}</td>
          <td>
            <span class="pill" :data-st="it.activo ? 'published' : 'closed'">
              {{ it.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td class="actions">
            <button type="button" class="btn-ghost" @click="edit(it)">Editar</button>
            <button v-if="it.activo" type="button" class="btn-ghost danger" @click="deactivate(it)">
              Desactivar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!items.length" class="muted">Sin ítems. Probá «Cargar defaults AR».</p>

    <div v-if="draft" class="sheet" @click.self="draft = null">
      <form class="panel editor" @submit.prevent="save">
        <h2>{{ draft.id ? 'Editar' : 'Nuevo ítem' }}</h2>
        <label
          >Tipo
          <select v-model="draft.tipo" class="input" :disabled="Boolean(draft.id)" required>
            <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label
          >Código
          <input v-model="draft.codigo" class="input" required :disabled="Boolean(draft.id)" />
        </label>
        <label>Etiqueta <input v-model="draft.label" class="input" required /></label>
        <label>Código padre <input v-model="draft.parentCodigo" class="input" /></label>
        <label>Orden <input v-model.number="draft.orden" type="number" class="input" /></label>
        <label class="check"><input v-model="draft.activo" type="checkbox" /> Activo</label>
        <p v-if="formError" class="err">{{ formError }}</p>
        <div class="footer">
          <button type="button" class="btn-ghost" @click="draft = null">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="saving">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'

const items = ref([])
const tipos = ref([])
const tipo = ref('')
const error = ref('')
const formError = ref('')
const draft = ref(null)
const saving = ref(false)
const seeding = ref(false)

const TIPO_LABELS = {
  pais: 'País',
  provincia: 'Provincia',
  genero: 'Género',
  parentesco: 'Parentesco',
  estado_civil: 'Estado civil',
  tipo_contrato: 'Tipo contrato',
  modalidad: 'Modalidad',
  banco: 'Banco',
  obra_social: 'Obra social',
  clasificacion_legajo: 'Clasificación',
  subestado_laboral: 'Subestado laboral',
  nivel_skill: 'Nivel skill',
  tipo_domicilio: 'Tipo domicilio',
}

function labelTipo(t) {
  return TIPO_LABELS[t] || String(t || '').replace(/_/g, ' ')
}

function setTipo(next) {
  tipo.value = next
  load()
}

async function loadMeta() {
  const { data } = await api.get('/admin/hr-catalogs/meta')
  tipos.value = data.tipos || []
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/hr-catalogs', {
      params: tipo.value ? { tipo: tipo.value } : {},
    })
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

function openNew() {
  formError.value = ''
  draft.value = {
    tipo: tipos.value[0] || 'genero',
    codigo: '',
    label: '',
    parentCodigo: '',
    orden: 0,
    activo: true,
  }
}

function edit(it) {
  formError.value = ''
  draft.value = { ...it }
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (draft.value.id) {
      await api.patch(`/admin/hr-catalogs/${draft.value.id}`, {
        label: draft.value.label,
        parentCodigo: draft.value.parentCodigo,
        orden: draft.value.orden,
        activo: draft.value.activo,
      })
    } else {
      await api.post('/admin/hr-catalogs', draft.value)
    }
    draft.value = null
    await load()
  } catch (e) {
    formError.value = e.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

async function deactivate(it) {
  if (!confirm(`Desactivar ${it.codigo}?`)) return
  try {
    await api.delete(`/admin/hr-catalogs/${it.id}`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  }
}

async function seedDefaults() {
  seeding.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/hr-catalogs/seed-defaults')
    error.value = `Defaults: ${data.created} nuevos (${data.totalDefaults} en catálogo base)`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    seeding.value = false
  }
}

onMounted(async () => {
  await loadMeta()
  await load()
})
</script>

<style scoped>
.page {
  padding: 1.25rem 1.5rem 3rem;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.page-head h1 {
  margin: 0 0 0.25rem;
  font-size: 1.4rem;
}
.page-head p {
  margin: 0;
  color: var(--muted, var(--ink-soft));
  font-size: 0.9rem;
}
.head-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.filters {
  margin-bottom: 1rem;
}
.filters--sticky {
  position: sticky;
  top: 0;
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 0 0.65rem;
  margin: 0 0 0.75rem;
  background: color-mix(in srgb, var(--canvas, var(--panel-2)) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.chip {
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--line-2, var(--line));
  background: var(--panel);
  color: var(--ink-soft, var(--ink));
  font-size: 0.78rem;
  font-weight: 560;
  cursor: pointer;
  line-height: 1.25;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.chip:hover {
  border-color: var(--brand-line, var(--brand));
  color: var(--brand-ink, var(--ink));
}
.chip.active {
  background: var(--brand, #6b5bf0);
  border-color: var(--brand, #6b5bf0);
  color: #fff;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.table th,
.table td {
  text-align: left;
  padding: 0.55rem 0.4rem;
  border-bottom: 1px solid var(--line);
}
.actions {
  display: flex;
  gap: 0.35rem;
}
.muted {
  color: var(--ink-soft);
}
.err {
  color: var(--bad);
}
.pill {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--line);
}
.pill[data-st='published'] {
  background: #dcfce7;
  color: #166534;
}
.pill[data-st='closed'] {
  background: var(--bad-bg);
  color: var(--bad);
}
.sheet {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
  display: grid;
  place-items: center;
  z-index: 40;
  padding: 1rem;
}
.panel {
  background: var(--panel);
  border-radius: 12px;
  padding: 1.25rem;
  width: min(480px, 100%);
  display: grid;
  gap: 0.65rem;
}
.panel label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
}
.check {
  display: flex !important;
  align-items: center;
  gap: 0.4rem;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.btn-primary,
.btn-ghost {
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  cursor: pointer;
}
.btn-primary {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
.btn-ghost.danger {
  color: var(--bad);
}
</style>
