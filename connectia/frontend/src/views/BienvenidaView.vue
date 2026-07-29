<template>
  <div class="page">
    <header class="head">
      <h1>Bienvenida y egreso</h1>
      <p class="sub">Tus pasos de ingreso o checklist de egreso</p>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">
      No tenés procesos de bienvenida o egreso activos. Cuando RRHH te asigne uno, aparecerá acá.
    </p>

    <section v-for="inst in items" :key="inst.id" class="card">
      <div class="card-head">
        <div>
          <h2>{{ inst.templateName }}</h2>
          <p class="meta">
            {{ inst.kind === 'offboarding' ? 'Egreso' : 'Ingreso' }} · {{ inst.progressPercent }}% ·
            {{ statusLabel(inst.status) }}
          </p>
        </div>
        <div class="progress" :aria-valuenow="inst.progressPercent">
          <span :style="{ width: `${inst.progressPercent}%` }" />
        </div>
      </div>

      <ul class="milestones">
        <li v-for="m in inst.milestones" :key="m.key" :data-st="m.status">
          <div class="m-main">
            <strong>{{ m.titulo }}</strong>
            <span class="chip">{{ milestoneLabel(m) }}</span>
          </div>
          <p v-if="m.descripcion" class="desc">{{ m.descripcion }}</p>
          <div class="m-actions">
            <a
              v-if="m.tipo === 'survey' && m.surveyId && m.status === 'pending'"
              class="btn"
              :href="`/encuestas/${m.surveyId}`"
              @click.prevent="goSurvey(m.surveyId)"
            >
              Responder encuesta
            </a>
            <a
              v-if="m.tipo === 'content' && m.contentUrl && m.status === 'pending'"
              class="btn ghost"
              :href="m.contentUrl"
              target="_blank"
              rel="noopener"
            >
              Abrir contenido
            </a>
            <button
              v-if="canComplete(m, inst)"
              type="button"
              class="btn"
              :disabled="busyKey === `${inst.id}:${m.key}`"
              @click="complete(inst, m)"
            >
              {{ busyKey === `${inst.id}:${m.key}` ? '…' : 'Marcar como hecho' }}
            </button>
            <span v-if="m.status === 'done'" class="ok">Completado</span>
            <span v-else-if="m.status === 'locked'" class="muted">Bloqueado</span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onActivated, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const route = useRoute()
const items = ref([])
const loading = ref(true)
const error = ref('')
const busyKey = ref('')

function statusLabel(s) {
  return (
    {
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      revoked: 'Accesos revocados',
    }[s] || s
  )
}

function milestoneLabel(m) {
  const t =
    {
      task: 'Tarea',
      content: 'Contenido',
      survey: 'Encuesta',
      checklist: 'Checklist',
    }[m.tipo] || m.tipo
  return `${t} · ${m.status}`
}

function canComplete(m, inst) {
  if (!['pending', 'in_progress'].includes(inst.status)) return false
  if (m.status !== 'pending') return false
  if (m.tipo === 'survey') return false
  return true
}

function goSurvey(id) {
  router.push({ name: 'encuesta-detail', params: { id }, query: { from: 'bienvenida' } })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/onboarding/mine')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function complete(inst, m) {
  busyKey.value = `${inst.id}:${m.key}`
  try {
    const { data } = await api.post(
      `/onboarding/mine/${inst.id}/milestones/${encodeURIComponent(m.key)}/complete`,
    )
    const idx = items.value.findIndex((x) => x.id === inst.id)
    if (idx >= 0) items.value[idx] = data.instance
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    busyKey.value = ''
  }
}

onMounted(load)
onActivated(load)
watch(
  () => route.fullPath,
  () => {
    if (route.name === 'bienvenida' || route.path === '/bienvenida') load()
  },
)
</script>

<style scoped>
.page {
  padding: 1rem 1rem 2.5rem;
  max-width: 640px;
  margin: 0 auto;
}
.head h1 {
  margin: 0;
  font-size: 1.45rem;
}
.sub {
  margin: 0.25rem 0 1rem;
  color: var(--muted, #64748b);
}
.card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.card-head {
  display: grid;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}
.card-head h2 {
  margin: 0;
  font-size: 1.1rem;
}
.meta {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}
.progress {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  background: #0f766e;
}
.milestones {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.milestones li {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
}
.milestones li[data-st='done'] {
  border-color: #bbf7d0;
  background: #f0fdf4;
}
.milestones li[data-st='locked'] {
  opacity: 0.65;
}
.m-main {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.chip {
  font-size: 0.7rem;
  background: #f1f5f9;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}
.desc {
  margin: 0.35rem 0;
  font-size: 0.88rem;
  color: #475569;
}
.m-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.4rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  background: #0f172a;
  color: #fff;
  border: none;
  text-decoration: none;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn.ghost {
  background: #fff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}
.ok {
  color: #166534;
  font-size: 0.85rem;
}
.muted {
  color: #64748b;
}
.err {
  color: #b91c1c;
}
</style>
