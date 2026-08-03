<template>
  <section class="sup">
    <header class="sup-head">
      <h1>{{ t.title }}</h1>
      <p class="sup-sub">{{ t.subtitle }}</p>
    </header>
    <p v-if="error" class="sup-err">{{ error }}</p>
    <p v-if="queueLeft" class="sup-banner">{{ queueLeft }} {{ t.pendingSync }}</p>

    <div v-if="stats" class="sup-kpis">
      <div class="sup-kpi"><strong>{{ stats.total }}</strong><span>{{ t.total }}</span></div>
      <div class="sup-kpi"><strong>{{ stats.overdue }}</strong><span>{{ t.overdue }}</span></div>
      <div class="sup-kpi"><strong>{{ stats.high }}</strong><span>{{ t.high }}</span></div>
      <div class="sup-kpi"><strong>{{ openCount }}</strong><span>{{ t.open }}</span></div>
    </div>

    <div v-if="ai?.day" class="sup-ai">
      <p>{{ ai.day.summary }}</p>
      <p class="sup-ai-note">{{ t.aiConfirm }}</p>
      <ol v-if="ai.prioritized?.length" class="sup-prio">
        <li v-for="p in ai.prioritized.slice(0, 5)" :key="p.tareaId">
          {{ p.titulo }} — {{ p.reason }}
        </li>
      </ol>
    </div>

    <div class="sup-grid">
      <button type="button" class="sup-card" @click="$router.push('/supervision/tareas')">
        <strong>{{ t.tasks }}</strong>
        <span>{{ t.tasksHint }}</span>
      </button>
      <button type="button" class="sup-card" @click="$router.push('/supervision/mis-tareas')">
        <strong>{{ t.mine }}</strong>
        <span>{{ t.mineHint }}</span>
      </button>
      <button type="button" class="sup-card" @click="$router.push('/supervision/nueva')">
        <strong>{{ t.create }}</strong>
        <span>{{ t.createHint }}</span>
      </button>
      <button
        v-if="meta.ecr"
        type="button"
        class="sup-card"
        @click="$router.push('/supervision/ecr')"
      >
        <strong>Panel ECR</strong>
        <span>{{ t.ecrHint }}</span>
      </button>
      <button
        v-if="meta.relevamientos"
        type="button"
        class="sup-card"
        @click="$router.push('/relevamientos')"
      >
        <strong>Relevamientos</strong>
        <span>{{ t.relHint }}</span>
      </button>
      <button type="button" class="sup-card" @click="$router.push('/supervision/config')">
        <strong>{{ t.config }}</strong>
        <span>{{ t.configHint }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import api from '../services/api'
import {
  cacheSupervisionGet,
  peekSupervisionQueue,
  readSupervisionCache,
  startSupervisionOfflineFlush,
} from '../composables/useSupervisionOffline'

const error = ref('')
const meta = reactive({ ecr: false, comercial: true, role: null, relevamientos: false })
const stats = ref(null)
const ai = ref(null)
const queueLeft = ref(0)
const locale = ref(localStorage.getItem('cx_sup_locale') || 'es')
let stopFlush = () => {}

const copy = {
  es: {
    title: 'Supervisión',
    subtitle: 'Tareas de campo y panel ECR',
    total: 'Total',
    overdue: 'Vencidas',
    high: 'Alta prio',
    open: 'Abiertas',
    pendingSync: 'cambios pendientes de sync',
    aiConfirm: 'Sugerencia IA — confirmar antes de actuar.',
    tasks: 'Tareas comerciales',
    tasksHint: 'Listado, filtros y asignación',
    mine: 'Mis tareas',
    mineHint: 'Lo asignado a vos',
    create: 'Crear tarea',
    createHint: 'Libre o desde plantilla',
    ecrHint: 'Marcas fuera de rango y domingos',
    relHint: 'Inspecciones y rutas del día',
    config: 'Configuración',
    configHint: 'Idioma y PWA',
  },
  en: {
    title: 'Supervision',
    subtitle: 'Field tasks and ECR panel',
    total: 'Total',
    overdue: 'Overdue',
    high: 'High prio',
    open: 'Open',
    pendingSync: 'pending sync changes',
    aiConfirm: 'AI suggestion — confirm before acting.',
    tasks: 'Commercial tasks',
    tasksHint: 'List, filters and assignment',
    mine: 'My tasks',
    mineHint: 'Assigned to you',
    create: 'Create task',
    createHint: 'Free or from template',
    ecrHint: 'Out-of-range marks and Sundays',
    relHint: 'Field surveys and day routes',
    config: 'Settings',
    configHint: 'Language and PWA',
  },
}

const t = computed(() => copy[locale.value] || copy.es)
const openCount = computed(() => {
  const b = stats.value?.byStatus || {}
  return (b.pendiente || 0) + (b.asignacion || 0) + (b.en_progreso || 0)
})

onMounted(async () => {
  stopFlush = startSupervisionOfflineFlush(api)
  queueLeft.value = peekSupervisionQueue().length
  try {
    const cachedStats = readSupervisionCache('stats')
    if (cachedStats) stats.value = cachedStats
    const { data: m } = await api.get('/supervision/meta')
    Object.assign(meta, m)
    const { data: s } = await api.get('/supervision/stats')
    stats.value = s
    cacheSupervisionGet('stats', s)
    const { data: insights } = await api.get('/supervision/ai/insights')
    ai.value = insights
    const { data: cfg } = await api.get('/supervision/config')
    if (cfg.locale) {
      locale.value = cfg.locale
      localStorage.setItem('cx_sup_locale', cfg.locale)
    }
  } catch (e) {
    if (!stats.value) error.value = e?.response?.data?.error || 'No se pudo cargar supervisión'
  }
})

onUnmounted(() => stopFlush())
</script>

<style scoped>
.sup { padding: 1rem 1rem 5rem; }
.sup-head h1 { margin: 0; font-size: 1.35rem; }
.sup-sub { margin: 0.25rem 0 1rem; color: #64748b; font-size: 0.9rem; }
.sup-err { color: #b91c1c; font-size: 0.9rem; }
.sup-banner {
  background: #fff7ed;
  color: #9a3412;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.sup-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.sup-kpi {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.6rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.sup-kpi strong { font-size: 1.1rem; }
.sup-kpi span { font-size: 0.7rem; color: #64748b; }
.sup-ai {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 12px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}
.sup-ai-note { color: var(--brand-primary, #0f766e); font-size: 0.75rem; margin: 0.35rem 0; }
.sup-prio { margin: 0.35rem 0 0; padding-left: 1.1rem; font-size: 0.85rem; }
.sup-grid { display: grid; gap: 0.75rem; }
.sup-card {
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.sup-card strong { font-size: 1rem; }
.sup-card span { font-size: 0.85rem; color: #64748b; }
@media (max-width: 480px) {
  .sup-kpis { grid-template-columns: repeat(2, 1fr); }
}
</style>
