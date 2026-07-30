<template>
  <section class="th">
    <header class="th-head">
      <h1>Mi equipo</h1>
      <p class="th-sub">Seguimiento y creación solo para tus supervisados</p>
    </header>
    <p v-if="error" class="th-err">{{ error }}</p>

    <div v-if="hub.role === 'supervisor'" class="th-kpis">
      <div class="th-kpi"><strong>{{ hub.counters?.members || 0 }}</strong><span>Miembros</span></div>
      <div class="th-kpi"><strong>{{ hub.counters?.openTasks || 0 }}</strong><span>Tareas abiertas</span></div>
      <div v-if="hub.relevamientosEnabled" class="th-kpi">
        <strong>{{ hub.counters?.pendingRelevamientos || 0 }}</strong><span>Relev. hoy</span>
      </div>
      <div class="th-kpi"><strong>{{ hub.teams?.length || 0 }}</strong><span>Equipos</span></div>
    </div>

    <button
      v-if="hub.role === 'supervisor'"
      type="button"
      class="th-cta"
      @click="$router.push('/mi-equipo/crear')"
    >
      Crear para mi equipo
    </button>

    <div v-if="hub.role === 'member'" class="th-member">
      <p>Formás parte de estos equipos. Solo recibís contenido dirigido a vos.</p>
      <ul>
        <li v-for="t in hub.teams" :key="t.id">{{ t.nombre }} · {{ t.memberCount }} miembros</li>
      </ul>
    </div>

    <template v-if="hub.role === 'supervisor'">
      <h2>Equipos</h2>
      <select v-model="scopeId" class="th-select" @change="loadMembers">
        <option v-for="t in hub.teams" :key="t.id" :value="t.id">
          {{ t.nombre }} ({{ t.memberCount }})
        </option>
      </select>

      <h2>Supervisados</h2>
      <ul class="th-list">
        <li v-for="m in members" :key="m.id" @click="$router.push(`/mi-equipo/miembro/${m.id}`)">
          <strong>{{ m.nombre }}</strong>
          <span>{{ m.cargo || m.email || '—' }}</span>
        </li>
        <li v-if="!members.length" class="muted">Sin miembros resueltos. Pedí al admin que configure el alcance.</li>
      </ul>

      <h2>Actividad reciente</h2>
      <ul class="th-list">
        <li
          v-for="it in timeline"
          :key="it.type + it.id"
          :class="{ clickable: !!it.href || it.type === 'relevamiento' }"
          @click="openTimelineItem(it)"
        >
          <span class="badge">{{ labelType(it.type) }}</span>
          {{ it.title }}
        </li>
        <li v-if="!timeline.length" class="muted">Sin actividad aún</li>
      </ul>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const error = ref('')
const hub = ref({ role: '', teams: [], counters: {}, relevamientosEnabled: false })
const scopeId = ref('')
const members = ref([])
const timeline = ref([])

function labelType(t) {
  const map = {
    post: 'pub',
    event: 'evento',
    notif: 'aviso',
    absence: 'ausencia',
    license: 'licencia',
    task: 'tarea',
    relevamiento: 'relev.',
  }
  return map[t] || t
}

function openTimelineItem(it) {
  if (it.href) {
    router.push(it.href)
    return
  }
  if (it.type === 'relevamiento' && it.operatorId) {
    router.push(`/mi-equipo/miembro/${it.operatorId}`)
  }
}

async function loadMembers() {
  if (!scopeId.value) {
    members.value = []
    return
  }
  const { data } = await api.get(`/team/scopes/${scopeId.value}/members`)
  members.value = data.items || []
  const tl = await api.get('/team/timeline', { params: { scopeId: scopeId.value } })
  timeline.value = tl.data.items || []
}

onMounted(async () => {
  try {
    const { data } = await api.get('/team/hub')
    hub.value = data
    if (data.teams?.length && data.role === 'supervisor') {
      scopeId.value = data.teams[0].id
      await loadMembers()
    }
  } catch (e) {
    error.value = e?.response?.data?.error || 'No se pudo cargar Mi equipo'
  }
})

watch(scopeId, loadMembers)
</script>

<style scoped>
.th { padding: 1rem 1rem 5rem; }
.th-head h1 { margin: 0; font-size: 1.35rem; }
.th-sub { margin: 0.25rem 0 1rem; color: #64748b; font-size: 0.9rem; }
.th-err { color: #b91c1c; }
.th-list li.clickable { border-color: #99f6e4; }
.th-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
@media (min-width: 420px) {
  .th-kpis { grid-template-columns: repeat(4, 1fr); }
}
.th-kpi { background: #f8fafc; border-radius: 10px; padding: 0.6rem; text-align: center; display: flex; flex-direction: column; gap: 0.15rem; }
.th-kpi span { font-size: 0.7rem; color: #64748b; }
.th-cta {
  width: 100%; border: 0; background: #0f766e; color: #fff; border-radius: 12px;
  padding: 0.85rem; font-weight: 600; margin-bottom: 1rem;
}
.th-select { width: 100%; padding: 0.55rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 0.75rem; }
h2 { font-size: 1rem; margin: 1rem 0 0.5rem; }
.th-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.45rem; }
.th-list li {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.15rem; cursor: pointer;
}
.th-list li span { font-size: 0.8rem; color: #64748b; }
.muted { color: #64748b; text-align: center; padding: 1rem; cursor: default !important; }
.badge { display: inline-block; font-size: 0.7rem; background: #eef2ff; color: #3730a3; padding: 0.1rem 0.4rem; border-radius: 999px; margin-right: 0.35rem; }
.th-member { background: #f0fdfa; border-radius: 12px; padding: 1rem; font-size: 0.9rem; }
</style>
