<template>
  <div class="eq">
    <AdminPageHeader
      title="Equipos (supervisor)"
      subtitle="Quién ve a quién en «Mi equipo» y a quiénes puede publicar"
    >
      <template #actions>
        <button type="button" class="btn-ghost" :disabled="busy" @click="runSeedDemo">
          Cargar datos demo
        </button>
        <button type="button" class="btn-ghost" :disabled="busy" @click="ensure">
          Activar menú + caps
        </button>
        <button type="button" class="btn-primary" :disabled="busy" @click="startNew">
          + Nuevo equipo
        </button>
      </template>
    </AdminPageHeader>

    <ScreenHelp
      purpose="Con este módulo definís a quién ve y a quién le puede publicar un supervisor en «Mi equipo» — solo su gente, no toda la empresa."
      :six-w="helpSixW"
      :examples="helpExamples"
      guide-kind="equipos"
    />

    <p v-if="error" class="eq-err" role="alert">{{ error }}</p>
    <p v-if="okMsg" class="eq-ok" role="status">{{ okMsg }}</p>

    <div class="eq-layout">
      <section class="eq-form-card">
        <header class="eq-card-head">
          <div>
            <h2>{{ form.id ? 'Editar equipo' : 'Nuevo equipo' }}</h2>
            <p>Elegí supervisor, fuentes de alcance y módulos permitidos.</p>
          </div>
          <button v-if="form.id" type="button" class="btn-ghost" @click="resetForm">Limpiar</button>
        </header>

        <form class="eq-form" @submit.prevent="save">
          <label>
            Nombre
            <input v-model="form.nombre" class="eq-input" placeholder="Ej. Equipo Retail Norte" required />
          </label>
          <label>
            Supervisor
            <select v-model="form.supervisorId" class="eq-input" required>
              <option value="">Elegí una persona…</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nombre }}</option>
            </select>
          </label>

          <fieldset class="eq-fieldset">
            <legend>Áreas</legend>
            <div v-if="areas.length" class="eq-chips">
              <button
                v-for="a in areas"
                :key="a.id"
                type="button"
                class="eq-chip"
                :class="{ on: form.areaIds.includes(a.id) }"
                @click="toggleId(form.areaIds, a.id)"
              >
                {{ a.nombre }}
              </button>
            </div>
            <p v-else class="eq-hint">No hay áreas. Creálas en Organización.</p>
          </fieldset>

          <fieldset class="eq-fieldset">
            <legend>Grupos</legend>
            <div v-if="groups.length" class="eq-chips">
              <button
                v-for="g in groups"
                :key="g.id"
                type="button"
                class="eq-chip"
                :class="{ on: form.groupIds.includes(g.id) }"
                @click="toggleId(form.groupIds, g.id)"
              >
                {{ g.nombre }}
              </button>
            </div>
            <p v-else class="eq-hint">No hay grupos. Creálos en Organización.</p>
          </fieldset>

          <fieldset class="eq-fieldset">
            <legend>Clientes (supervisión comercial)</legend>
            <div v-if="clientes.length" class="eq-chips">
              <button
                v-for="c in clientes"
                :key="c.id"
                type="button"
                class="eq-chip"
                :class="{ on: form.clientIds.includes(c.id) }"
                @click="toggleId(form.clientIds, c.id)"
              >
                {{ c.nombre }}
              </button>
            </div>
            <p v-else class="eq-hint">Sin clientes. Cargalos en Supervisión comercial.</p>
          </fieldset>

          <fieldset class="eq-fieldset">
            <legend>Personas a mano</legend>
            <input
              v-model="peopleQ"
              class="eq-input"
              type="search"
              placeholder="Filtrar personas…"
            />
            <div class="eq-chips eq-chips--scroll">
              <button
                v-for="u in filteredUsers"
                :key="u.id"
                type="button"
                class="eq-chip"
                :class="{ on: form.userIds.includes(u.id) }"
                @click="toggleId(form.userIds, u.id)"
              >
                {{ u.nombre }}
              </button>
            </div>
          </fieldset>

          <label class="eq-check">
            <input v-model="form.areaClientIntersect" type="checkbox" />
            <span>
              Intersección <strong>área ∩ cliente</strong>
              <small>Si hay áreas y clientes, solo entran quienes cumplen ambas (unión con grupos/personas).</small>
            </span>
          </label>

          <fieldset class="eq-fieldset">
            <legend>Módulos que puede crear para el equipo</legend>
            <div class="eq-chips">
              <button
                v-for="m in moduleOptions"
                :key="m.id"
                type="button"
                class="eq-chip"
                :class="{ on: form.allowedModules.includes(m.id) }"
                @click="toggleId(form.allowedModules, m.id)"
              >
                {{ m.label }}
              </button>
            </div>
          </fieldset>

          <div class="eq-actions">
            <button class="btn-primary" type="submit" :disabled="busy || !canSave">
              {{ form.id ? 'Guardar y resolver' : 'Crear y resolver' }}
            </button>
            <button v-if="form.id" type="button" class="btn-ghost" @click="resetForm">Cancelar</button>
          </div>
        </form>
      </section>

      <section class="eq-list-wrap">
        <header class="eq-card-head">
          <div>
            <h2>Equipos configurados</h2>
            <p>{{ items.length ? 'Tocá Editar para ajustar el alcance.' : 'Todavía no hay equipos.' }}</p>
          </div>
          <input
            v-model="listQ"
            class="eq-input eq-input--sm"
            type="search"
            placeholder="Buscar…"
          />
        </header>

        <ul v-if="filteredItems.length" class="eq-list">
          <li
            v-for="t in filteredItems"
            :key="t.id"
            class="eq-card"
            :class="{ editing: form.id === t.id, inactive: t.activo === false }"
          >
            <div class="eq-card-top">
              <div>
                <h3>{{ t.nombre }}</h3>
                <p class="eq-meta">
                  Supervisor · {{ userName(t.supervisorId) }}
                </p>
              </div>
              <span class="eq-badge">{{ t.memberCount || 0 }} miembros</span>
            </div>

            <div class="eq-source-tags">
              <span v-if="t.source?.areaIds?.length" class="eq-tag">{{ t.source.areaIds.length }} áreas</span>
              <span v-if="t.source?.groupIds?.length" class="eq-tag">{{ t.source.groupIds.length }} grupos</span>
              <span v-if="t.source?.clientIds?.length" class="eq-tag">{{ t.source.clientIds.length }} clientes</span>
              <span v-if="t.source?.userIds?.length" class="eq-tag">{{ t.source.userIds.length }} personas</span>
              <span v-if="t.source?.areaClientIntersect" class="eq-tag eq-tag--accent">área ∩ cliente</span>
              <span v-if="t.activo === false" class="eq-tag eq-tag--warn">inactivo</span>
            </div>

            <div v-if="t.allowedModules?.length" class="eq-mods">
              <span v-for="m in t.allowedModules" :key="m" class="eq-mod">{{ moduleLabel(m) }}</span>
            </div>

            <div class="eq-card-actions">
              <button type="button" class="btn-ghost" @click="edit(t)">Editar</button>
              <button type="button" class="btn-ghost" :disabled="busy" @click="refresh(t.id)">
                Re-sync
              </button>
              <button
                type="button"
                class="btn-ghost danger"
                :disabled="busy"
                @click="deactivate(t.id)"
              >
                Desactivar
              </button>
            </div>
          </li>
        </ul>

        <div v-else class="eq-empty">
          <strong>Sin equipos para mostrar</strong>
          <p>Creá el primero a la izquierda o corré el seed de demo en el backend.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const helpSixW = {
  what: 'Armar el equipo de un supervisor: a quiénes ve y a quiénes les puede publicar.',
  who: 'El supervisor (dueño del equipo) y sus miembros (promotores u otras personas del alcance).',
  when: 'Cuando un supervisor necesita mirar y comunicar solo a su gente (alta o cambio de cobertura).',
  where: 'En la app, en el hub «Mi equipo»; el alcance se configura acá en admin.',
  why: 'Para que no vea ni publique a toda la empresa: solo a su equipo.',
  how: 'Creás el equipo, elegís supervisor + alcance (personas/áreas/grupos/clientes) y guardás. El sistema calcula los miembros.',
}

const helpExamples = [
  'Marta supervisa a Lucas y Ana: en «Mi equipo» ve solo a ellos y un aviso llega solo a esos dos.',
  'Si marcás un área entera, entran todos los usuarios de esa área (sin cargarlos a mano).',
  'Si dejás solo Muro y Avisos, Marta no usa chat/docs para ese equipo.',
]

const moduleOptions = [
  { id: 'muro', label: 'Muro' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'notif', label: 'Avisos' },
  { id: 'encuestas', label: 'Encuestas' },
  { id: 'docs', label: 'Docs' },
  { id: 'chat', label: 'Chat' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'reconocimientos', label: 'Reconocimientos' },
]

const items = ref([])
const users = ref([])
const areas = ref([])
const groups = ref([])
const clientes = ref([])
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const peopleQ = ref('')
const listQ = ref('')
const form = reactive({
  id: '',
  nombre: '',
  supervisorId: '',
  areaIds: [],
  groupIds: [],
  clientIds: [],
  userIds: [],
  areaClientIntersect: false,
  allowedModules: ['muro', 'eventos', 'notif', 'encuestas', 'docs', 'chat', 'beneficios', 'reconocimientos'],
})

const canSave = computed(() => Boolean(form.nombre.trim() && form.supervisorId))

const filteredUsers = computed(() => {
  const q = peopleQ.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((u) => String(u.nombre || '').toLowerCase().includes(q))
})

const filteredItems = computed(() => {
  const q = listQ.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((t) => {
    const sup = userName(t.supervisorId).toLowerCase()
    return String(t.nombre || '').toLowerCase().includes(q) || sup.includes(q)
  })
})

function userName(id) {
  if (!id) return '—'
  return users.value.find((u) => u.id === id)?.nombre || `…${String(id).slice(-6)}`
}

function moduleLabel(id) {
  return moduleOptions.find((m) => m.id === id)?.label || id
}

function toggleId(arr, id) {
  const i = arr.indexOf(id)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(id)
}

function resetForm() {
  form.id = ''
  form.nombre = ''
  form.supervisorId = ''
  form.areaIds = []
  form.groupIds = []
  form.clientIds = []
  form.userIds = []
  form.areaClientIntersect = false
  form.allowedModules = moduleOptions.map((m) => m.id)
}

function startNew() {
  resetForm()
  okMsg.value = ''
}

function edit(t) {
  form.id = t.id
  form.nombre = t.nombre
  form.supervisorId = t.supervisorId || ''
  form.areaIds = [...(t.source?.areaIds || [])]
  form.groupIds = [...(t.source?.groupIds || [])]
  form.clientIds = [...(t.source?.clientIds || [])]
  form.userIds = [...(t.source?.userIds || [])]
  form.areaClientIntersect = Boolean(t.source?.areaClientIntersect)
  form.allowedModules = [...(t.allowedModules?.length ? t.allowedModules : moduleOptions.map((m) => m.id))]
  okMsg.value = ''
}

async function load() {
  error.value = ''
  try {
    const [t, u, org] = await Promise.all([
      api.get('/admin/team'),
      api.get('/admin/team/candidates/users'),
      api.get('/admin/team/candidates/org'),
    ])
    items.value = t.data.items || []
    users.value = u.data.items || []
    areas.value = org.data.areas || []
    groups.value = org.data.groups || []
    clientes.value = org.data.clientes || []
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al cargar'
  }
}

async function ensure() {
  busy.value = true
  try {
    await api.post('/admin/team/ensure-menu')
    okMsg.value = 'Caps y menú Ola 32 activados'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error'
  } finally {
    busy.value = false
  }
}

async function runSeedDemo() {
  const force = confirm(
    '¿Cargar datos demo de Supervisión + Equipos en ESTA comunidad?\n\n' +
      'Aceptar = recrear la casuística demo (borra y vuelve a crear los datos de ejemplo).\n' +
      'Cancelar = no hacer nada.\n\n' +
      'Incluye usuarios demo (pass Demo1234!), cadenas/clientes/salas y 7 equipos con distintas fuentes de alcance.',
  )
  if (!force) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/team/seed-demo', { force: true })
    const s = data?.stats || {}
    okMsg.value = `Demo OK · ${s.teamScopes || 0} equipos · ${s.users || 0} usuarios · ${s.clientes || 0} clientes · ${s.areas || 0} áreas`
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Error al cargar demo'
  } finally {
    busy.value = false
  }
}

function sourcePayload() {
  return {
    areaIds: form.areaIds,
    groupIds: form.groupIds,
    clientIds: form.clientIds,
    userIds: form.userIds,
    areaClientIntersect: form.areaClientIntersect,
  }
}

async function save() {
  if (!canSave.value) return
  busy.value = true
  error.value = ''
  try {
    const body = {
      nombre: form.nombre.trim(),
      supervisorId: form.supervisorId,
      source: sourcePayload(),
      allowedModules: form.allowedModules.length ? [...form.allowedModules] : ['muro', 'notif'],
    }
    if (form.id) await api.patch(`/admin/team/${form.id}`, body)
    else await api.post('/admin/team', body)
    okMsg.value = form.id ? 'Equipo actualizado' : 'Equipo creado'
    resetForm()
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo guardar'
  } finally {
    busy.value = false
  }
}

async function refresh(id) {
  busy.value = true
  try {
    await api.post(`/admin/team/${id}/refresh`)
    okMsg.value = 'Miembros recalculados'
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al re-sincronizar'
  } finally {
    busy.value = false
  }
}

async function deactivate(id) {
  if (!confirm('¿Desactivar este equipo?')) return
  busy.value = true
  try {
    await api.delete(`/admin/team/${id}`)
    okMsg.value = 'Equipo desactivado'
    if (form.id === id) resetForm()
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error al desactivar'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.eq {
  max-width: 1200px;
}
.eq :deep(.admin-page-header__actions) {
  gap: 0.55rem !important;
}
.eq :deep(.admin-page-header__actions button) {
  margin: 0 !important;
}
.eq .btn-primary,
.eq .btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.eq .btn-primary {
  background: var(--brand) !important;
  border: 1px solid var(--brand) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand) 35%, transparent);
}
.eq .btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
}
.eq .btn-ghost {
  background: var(--panel) !important;
  border: 1px solid var(--line-2, var(--line)) !important;
  color: var(--ink) !important;
  box-shadow: none;
}
.eq .btn-ghost:hover:not(:disabled) {
  background: var(--brand-soft) !important;
  border-color: var(--brand-line) !important;
  color: var(--brand-ink) !important;
}
.eq .btn-primary:disabled,
.eq .btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.eq .btn-ghost.danger {
  color: #f87171 !important;
  border-color: color-mix(in srgb, #f87171 40%, var(--line)) !important;
}
.eq .btn-ghost.danger:hover:not(:disabled) {
  background: color-mix(in srgb, #f87171 12%, var(--panel)) !important;
  color: #fca5a5 !important;
}
.eq .eq-card-actions .btn-ghost {
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
}
.eq :deep(.screen-help) {
  margin: 0.35rem 0 1rem;
}
.eq-err {
  color: #f87171;
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
}
.eq-ok {
  color: #34d399;
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
}
.eq-layout {
  display: grid;
  grid-template-columns: minmax(300px, 22rem) 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 960px) {
  .eq-layout {
    grid-template-columns: 1fr;
  }
}
.eq-form-card,
.eq-list-wrap {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: var(--sh);
}
.eq-card-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.9rem;
}
.eq-card-head h2 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--ink);
}
.eq-card-head p {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}
.eq-form {
  display: grid;
  gap: 0.75rem;
}
.eq-form > label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}
.eq-input {
  width: 100%;
  border: 1px solid var(--line-2, var(--line));
  background: var(--panel-2, var(--canvas));
  color: var(--ink);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font: inherit;
  font-size: 0.875rem;
}
.eq-input--sm {
  max-width: 11rem;
  padding: 0.4rem 0.6rem;
}
.eq-fieldset {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.65rem 0.75rem 0.75rem;
  margin: 0;
}
.eq-fieldset legend {
  padding: 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-soft);
}
.eq-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.eq-chips--scroll {
  max-height: 9rem;
  overflow: auto;
  margin-top: 0.45rem;
  padding-right: 0.15rem;
}
.eq-chip {
  border: 1px solid var(--line-2);
  background: var(--panel-2, var(--canvas));
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.25;
  box-shadow: none;
}
.eq-chip.on {
  background: var(--brand-soft);
  color: var(--brand-ink);
  border-color: var(--brand-line);
}
.eq-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-faint, var(--ink-soft));
}
.eq-check {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: start;
  font-size: 0.84rem;
  color: var(--ink);
}
.eq-check small {
  display: block;
  margin-top: 0.15rem;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 400;
}
.eq-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.eq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.eq-card {
  border: 1px solid var(--line);
  background: var(--panel-2, var(--canvas));
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
}
.eq-card.editing {
  border-color: var(--brand-line);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand) 35%, transparent);
}
.eq-card.inactive {
  opacity: 0.72;
}
.eq-card-top {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  align-items: flex-start;
}
.eq-card h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink);
}
.eq-meta {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.eq-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-ink);
}
.eq-source-tags,
.eq-mods {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.55rem;
}
.eq-tag,
.eq-mod {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 40%, var(--canvas));
  border: 1px solid var(--line);
  color: var(--ink-soft);
}
.eq-tag--accent {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}
.eq-tag--warn {
  color: #fbbf24;
  border-color: color-mix(in srgb, #fbbf24 40%, var(--line));
}
.eq-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--line);
}
.eq-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--ink-soft);
}
.eq-empty strong {
  display: block;
  color: var(--ink);
  margin-bottom: 0.35rem;
}
.eq-empty p {
  margin: 0;
  font-size: 0.85rem;
}
</style>
