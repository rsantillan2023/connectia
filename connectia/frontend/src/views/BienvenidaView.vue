<template>
  <div class="page">
    <header class="head">
      <h1>{{ pageTitle }}</h1>
      <p class="sub">{{ pageSub }}</p>
    </header>

    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="err">{{ error }}</p>

    <section v-else-if="!items.length" class="empty card">
      <h2>Todavía no tenés pasos pendientes</h2>
      <p>
        Acá vas a ver tu checklist de <strong>ingreso</strong> (o de egreso, si aplica) cuando RRHH o tu líder te
        asigne un proceso.
      </p>
      <p class="muted">Si creés que debería aparecer algo, pedile a RRHH que te inicie la bienvenida.</p>
      <router-link class="btn ghost" to="/">Volver al inicio</router-link>
    </section>

    <template v-else>
      <div v-if="showKindTabs" class="kind-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="kind-tab"
          :class="{ on: filterKind === 'onboarding' }"
          :aria-selected="filterKind === 'onboarding'"
          @click="filterKind = 'onboarding'"
        >
          Tu ingreso
        </button>
        <button
          type="button"
          role="tab"
          class="kind-tab"
          :class="{ on: filterKind === 'offboarding' }"
          :aria-selected="filterKind === 'offboarding'"
          @click="filterKind = 'offboarding'"
        >
          Tu egreso
        </button>
      </div>

      <section v-for="inst in filteredItems" :key="inst.id" class="card">
        <div class="card-head">
          <div>
            <p class="kind-badge">{{ inst.kind === 'offboarding' ? 'Egreso' : 'Ingreso' }}</p>
            <h2>{{ inst.templateName }}</h2>
            <p class="meta">{{ statusLabel(inst.status) }} · {{ inst.progressPercent }}% completo</p>
          </div>
          <div class="progress" :aria-valuenow="inst.progressPercent" role="progressbar">
            <span :style="{ width: `${inst.progressPercent}%` }" />
          </div>
        </div>

        <div v-if="nextMilestone(inst)" class="next-step">
          <p class="next-label">Siguiente paso</p>
          <strong>{{ nextMilestone(inst).titulo }}</strong>
          <p v-if="nextMilestone(inst).descripcion" class="desc">{{ nextMilestone(inst).descripcion }}</p>
          <div class="m-actions">
            <template v-if="nextMilestone(inst).tipo === 'survey' && nextMilestone(inst).surveyId">
              <button type="button" class="btn" @click="goSurvey(nextMilestone(inst).surveyId)">
                Responder encuesta
              </button>
              <p class="hint-back">Al terminar, volvé a esta pantalla para ver el avance.</p>
            </template>
            <a
              v-else-if="nextMilestone(inst).tipo === 'content' && nextMilestone(inst).contentUrl"
              class="btn"
              :href="nextMilestone(inst).contentUrl"
              target="_blank"
              rel="noopener"
            >
              Abrir material
            </a>
            <button
              v-else-if="canComplete(nextMilestone(inst), inst)"
              type="button"
              class="btn"
              :disabled="busyKey === `${inst.id}:${nextMilestone(inst).key}`"
              @click="complete(inst, nextMilestone(inst))"
            >
              {{ busyKey === `${inst.id}:${nextMilestone(inst).key}` ? '…' : 'Marcar como hecho' }}
            </button>
            <span v-else-if="nextMilestone(inst).status === 'locked'" class="muted">
              Todavía no disponible: completá el paso anterior.
            </span>
          </div>
        </div>
        <p v-else-if="inst.status === 'completed'" class="ok-banner">Listo: completaste todos los pasos.</p>

        <details class="all-steps">
          <summary>Ver todos los pasos ({{ inst.milestones?.length || 0 }})</summary>
          <ul class="milestones">
            <li
              v-for="m in inst.milestones"
              :key="m.key"
              :data-st="m.status"
              :class="{ 'is-next': nextMilestone(inst)?.key === m.key }"
            >
              <div class="m-main">
                <strong>{{ m.titulo }}</strong>
                <span class="chip">{{ milestoneTypeLabel(m) }} · {{ milestoneStatusLabel(m) }}</span>
              </div>
              <p v-if="m.descripcion" class="desc">{{ m.descripcion }}</p>
              <div class="m-actions">
                <button
                  v-if="m.tipo === 'survey' && m.surveyId && m.status === 'pending'"
                  type="button"
                  class="btn"
                  @click="goSurvey(m.surveyId)"
                >
                  Responder encuesta
                </button>
                <a
                  v-if="m.tipo === 'content' && m.contentUrl && m.status === 'pending'"
                  class="btn ghost"
                  :href="m.contentUrl"
                  target="_blank"
                  rel="noopener"
                >
                  Abrir material
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
                <span v-else-if="m.status === 'locked'" class="muted">Bloqueado hasta el paso anterior</span>
              </div>
            </li>
          </ul>
        </details>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onActivated, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const route = useRoute()
const items = ref([])
const loading = ref(true)
const error = ref('')
const busyKey = ref('')
const filterKind = ref('onboarding')

const hasOnboarding = computed(() => items.value.some((i) => i.kind !== 'offboarding'))
const hasOffboarding = computed(() => items.value.some((i) => i.kind === 'offboarding'))
const showKindTabs = computed(() => hasOnboarding.value && hasOffboarding.value)

const pageTitle = computed(() => {
  if (!items.value.length) return 'Tu checklist'
  if (showKindTabs.value) return filterKind.value === 'offboarding' ? 'Tu egreso' : 'Tu ingreso'
  if (hasOffboarding.value && !hasOnboarding.value) return 'Tu egreso'
  return 'Tu ingreso'
})

const pageSub = computed(() => {
  if (!items.value.length) return 'Pasos que RRHH te pide al entrar o al salir de la empresa'
  if (pageTitle.value === 'Tu egreso') return 'Completá estos pasos para cerrar tu ciclo en la empresa'
  return 'Completá estos pasos para tu llegada a la comunidad'
})

const filteredItems = computed(() => {
  if (!showKindTabs.value) return items.value
  if (filterKind.value === 'offboarding') return items.value.filter((i) => i.kind === 'offboarding')
  return items.value.filter((i) => i.kind !== 'offboarding')
})

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

function milestoneTypeLabel(m) {
  return (
    {
      task: 'Tarea',
      content: 'Material',
      survey: 'Encuesta',
      checklist: 'Lista',
    }[m.tipo] || 'Paso'
  )
}

function milestoneStatusLabel(m) {
  return (
    {
      pending: 'Pendiente',
      in_progress: 'En curso',
      done: 'Hecho',
      locked: 'Bloqueado',
      skipped: 'Omitido',
    }[m.status] || m.status
  )
}

function nextMilestone(inst) {
  const list = inst.milestones || []
  return list.find((m) => m.status === 'pending' || m.status === 'in_progress') || null
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
    if (!hasOnboarding.value && hasOffboarding.value) filterKind.value = 'offboarding'
    else if (hasOnboarding.value) filterKind.value = 'onboarding'
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
.kind-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
}
.kind-tab {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.kind-tab.on {
  background: #0f766e;
  border-color: #0f766e;
  color: #fff;
}
.card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.empty h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.card-head {
  display: grid;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}
.kind-badge {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.card-head h2 {
  margin: 0.15rem 0 0;
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
.next-step {
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  border-radius: 12px;
  padding: 0.85rem;
  margin-bottom: 0.75rem;
}
.next-label {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ok-banner {
  margin: 0 0 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: #f0fdf4;
  color: #166534;
  font-weight: 600;
}
.hint-back {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
  width: 100%;
}
.all-steps {
  margin-top: 0.25rem;
}
.all-steps summary {
  cursor: pointer;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
}
.milestones {
  list-style: none;
  margin: 0.65rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.milestones li {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
}
.milestones li.is-next {
  border-color: #5eead4;
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
