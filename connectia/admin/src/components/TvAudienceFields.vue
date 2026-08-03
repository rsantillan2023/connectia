<template>
  <div class="tv-aud">
    <p v-if="hint" class="hint">{{ hint }}</p>
    <div class="tv-aud__modes" role="group" aria-label="Modo de audiencia">
      <button
        v-for="m in modes"
        :key="m.id"
        type="button"
        class="tv-aud__mode"
        :class="{ on: model.mode === m.id }"
        @click="setMode(m.id)"
      >
        <strong>{{ m.label }}</strong>
        <small>{{ m.desc }}</small>
      </button>
    </div>

    <p v-if="model.mode === 'none'" class="hint">
      Nadie de la app podrá elegir este canal al emparejar una TV.
    </p>

    <div v-if="model.mode === 'restricted'" class="tv-aud__picks">
      <div>
        <p class="cfg-label">Áreas</p>
        <label v-for="a in areas" :key="a.id" class="check">
          <input v-model="model.areaIds" type="checkbox" :value="a.id" />
          {{ a.nombre }}
        </label>
        <p v-if="!areas.length" class="hint">No hay áreas. Creálas en Organización.</p>
      </div>
      <div>
        <p class="cfg-label">Grupos</p>
        <label v-for="g in groups" :key="g.id" class="check">
          <input v-model="model.groupIds" type="checkbox" :value="g.id" />
          {{ g.nombre }}
        </label>
        <p v-if="!groups.length" class="hint">No hay grupos. Creálos en Organización.</p>
      </div>
    </div>

    <div v-if="model.mode === 'restricted' || model.mode === 'users'" class="tv-aud__users">
      <p class="cfg-label">
        {{ model.mode === 'users' ? 'Personas' : 'También personas puntuales' }}
      </p>
      <input
        v-model="query"
        type="search"
        placeholder="Buscar por nombre o email…"
        @input="onQuery"
      />
      <p v-if="searching" class="hint">Buscando…</p>
      <ul v-else-if="results.length" class="tv-aud__results">
        <li v-for="u in results" :key="u.id">
          <button type="button" class="btn-ghost btn-compact" @click="addUser(u)">
            + {{ u.nombre || u.email || u.id }}
          </button>
        </li>
      </ul>
      <ul v-if="selectedUsers.length" class="tv-aud__selected">
        <li v-for="u in selectedUsers" :key="u.id">
          <span>{{ u.nombre || u.email || u.id }}</span>
          <button type="button" class="btn-ghost btn-compact danger" @click="removeUser(u.id)">
            Quitar
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../services/api'

const props = defineProps({
  modelValue: { type: Object, required: true },
  hint: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const modes = [
  { id: 'all', label: 'Toda la comunidad', desc: 'Cualquier miembro puede elegirlo' },
  { id: 'restricted', label: 'Áreas y/o grupos', desc: 'Solo esas áreas/grupos' },
  { id: 'users', label: 'Solo personas', desc: 'Destinatarios puntuales' },
  { id: 'none', label: 'Nadie', desc: 'No aparece al emparejar' },
]

const model = reactive(normalize(props.modelValue))
const areas = ref([])
const groups = ref([])
const query = ref('')
const searching = ref(false)
const results = ref([])
const userCache = ref({})
let searchTimer = 0

function audienceSnapshot(a) {
  return JSON.stringify(normalize(a))
}

watch(
  () => props.modelValue,
  (v) => {
    const next = normalize(v)
    if (audienceSnapshot(model) === JSON.stringify(next)) return
    Object.assign(model, next)
  },
  { deep: true },
)

watch(
  model,
  () => {
    const next = normalize(model)
    if (audienceSnapshot(props.modelValue) === JSON.stringify(next)) return
    emit('update:modelValue', next)
  },
  { deep: true },
)

const selectedUsers = computed(() =>
  (model.userIds || []).map((id) => userCache.value[id] || { id, nombre: `Usuario ${String(id).slice(-6)}` }),
)

function normalize(a) {
  const mode = ['restricted', 'users', 'none'].includes(a?.mode) ? a.mode : 'all'
  return {
    mode,
    areaIds: mode === 'restricted' ? [...(a?.areaIds || [])].map(String) : [],
    groupIds: mode === 'restricted' ? [...(a?.groupIds || [])].map(String) : [],
    userIds: mode === 'restricted' || mode === 'users' ? [...(a?.userIds || [])].map(String) : [],
    clientIds: [],
  }
}

function setMode(mode) {
  Object.assign(model, normalize({ ...model, mode }))
}

function addUser(u) {
  const id = String(u.id)
  userCache.value = { ...userCache.value, [id]: { id, nombre: u.nombre || u.name, email: u.email } }
  if (!model.userIds.includes(id)) model.userIds.push(id)
  query.value = ''
  results.value = []
}

function removeUser(id) {
  model.userIds = model.userIds.filter((x) => x !== String(id))
}

function onQuery() {
  clearTimeout(searchTimer)
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const { data } = await api.get('/admin/posts/audience-candidates', { params: { q } })
      results.value = (data.items || data.users || []).slice(0, 8)
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 250)
}

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/org/options')
    areas.value = data.areas || []
    groups.value = data.groups || []
  } catch {
    areas.value = []
    groups.value = []
  }
})

defineExpose({ normalize })
</script>

<style scoped>
.tv-aud { display: grid; gap: 0.65rem; }
.tv-aud__modes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.35rem;
}
.tv-aud__mode {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 0.45rem 0.55rem;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 0.15rem;
}
.tv-aud__mode strong { font-size: 0.78rem; color: var(--ink); }
.tv-aud__mode small { font-size: 0.68rem; color: var(--ink-soft); line-height: 1.3; }
.tv-aud__mode.on {
  border-color: var(--brand, #6b5bf0);
  background: color-mix(in srgb, var(--brand, #6b5bf0) 10%, var(--panel));
}
.tv-aud__picks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.tv-aud__picks .check { font-size: 0.82rem; }
.cfg-label {
  margin: 0 0 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint, #94a3b8);
}
.hint { margin: 0; font-size: 0.78rem; color: var(--ink-soft); line-height: 1.4; }
.tv-aud__users input[type='search'] {
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--line-2, var(--line));
  background: var(--panel-2, var(--panel));
  color: var(--ink);
}
.tv-aud__results, .tv-aud__selected {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.tv-aud__selected li {
  display: flex;
  justify-content: space-between;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.82rem;
}
.btn-ghost {
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 8px;
  padding: 0.3rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--ink);
}
.btn-compact { padding: 0.3rem 0.45rem; font-size: 0.76rem; }
.danger { color: var(--bad, #b91c1c); }
@media (max-width: 640px) {
  .tv-aud__picks { grid-template-columns: 1fr; }
}
</style>
