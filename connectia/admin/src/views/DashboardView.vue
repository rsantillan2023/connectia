<template>
  <div class="resumen">
    <AdminPageHeader
      :title="data?.mode === 'platform' ? 'Resumen' : 'Resumen'"
      :subtitle="
        data?.mode === 'platform'
          ? 'Panorama del operador / plataforma.'
          : `Panorama de ${data?.tenant?.nombre || 'tu comunidad'}.`
      "
    >
      <template #actions>
        <RouterLink
          v-if="data?.mode !== 'platform' && show('admin.publicaciones')"
          to="/publicaciones"
          class="btn-primary"
        >
          <i class="fas fa-plus text-xs" aria-hidden="true" />
          Nueva publicación
        </RouterLink>
        <RouterLink v-else-if="data?.mode === 'platform'" to="/suscriptores" class="btn-primary">
          Suscriptores
        </RouterLink>
        <RouterLink v-else-if="show('admin.usuarios')" to="/usuarios" class="btn-primary">
          <i class="fas fa-users text-xs" aria-hidden="true" />
          Usuarios
        </RouterLink>
      </template>
    </AdminPageHeader>

    <p v-if="error" class="resumen-err">{{ error }}</p>
    <p v-else-if="!data" class="resumen-muted">Cargando panorama…</p>

    <!-- Plataforma -->
    <template v-else-if="data.mode === 'platform'">
      <section class="alert-strip" aria-label="Indicadores">
        <button type="button" class="alert-card accent-rose" @click="$router.push('/suscriptores')">
          <span class="alert-card__val">{{ data.metrics.tenants }}</span>
          <span class="alert-card__label">suscriptores</span>
        </button>
        <button type="button" class="alert-card accent-emerald" @click="$router.push('/suscriptores')">
          <span class="alert-card__val">{{ data.metrics.activeTenants }}</span>
          <span class="alert-card__label">activos</span>
        </button>
        <button type="button" class="alert-card accent-violet" @click="$router.push('/suscriptores')">
          <span class="alert-card__val">{{ data.metrics.users }}</span>
          <span class="alert-card__label">usuarios totales</span>
        </button>
      </section>
    </template>

    <!-- Comunidad -->
    <template v-else>
      <section class="alert-strip" aria-label="Indicadores de atención">
        <button
          v-for="card in alertCards"
          :key="card.id"
          type="button"
          class="alert-card"
          :class="card.accent"
          :title="card.hint"
          @click="go(card.to)"
        >
          <span class="alert-card__val">{{ card.value }}</span>
          <span class="alert-card__label">{{ card.label }}</span>
        </button>
      </section>

      <section class="panel live">
        <header class="panel__head">
          <div>
            <h2>Novedades operativas</h2>
            <p class="panel__hint">Tocá un indicador de arriba o una fila para ir al detalle</p>
          </div>
          <RouterLink v-if="show('admin.solicitudes')" to="/solicitudes" class="panel__link">
            Ver bandeja
          </RouterLink>
        </header>

        <ul v-if="liveItems.length" class="live-list">
          <li v-for="item in liveItems" :key="item.id" class="live-row">
            <span class="live-row__avatar" :class="'tone-' + item.tone" aria-hidden="true">
              <i :class="item.icon"></i>
            </span>
            <div class="live-row__body">
              <p class="live-row__title">{{ item.title }}</p>
              <p class="live-row__meta">{{ item.meta }}</p>
            </div>
            <RouterLink :to="item.to" class="live-row__action">{{ item.cta }}</RouterLink>
            <span class="live-row__time">{{ item.time }}</span>
          </li>
        </ul>
        <p v-else class="live-empty">
          Todo en orden por ahora. Cuando haya pendientes de moderación, solicitudes o denuncias, aparecen acá.
        </p>
      </section>

      <div class="bottom-grid">
        <section class="panel chart-panel">
          <header class="panel__head">
            <h2>Composición del contenido</h2>
          </header>
          <div class="donut-wrap">
            <div class="donut" :style="{ background: donutGradient }" role="img" :aria-label="donutAria">
              <div class="donut__hole">
                <strong>{{ contentTotal }}</strong>
                <span>PIEZAS</span>
              </div>
            </div>
            <ul class="legend">
              <li v-for="slice in contentSlices" :key="slice.id">
                <span class="legend__swatch" :style="{ background: slice.color }" />
                <span class="legend__name">{{ slice.label }}</span>
                <span class="legend__n">{{ slice.value }}</span>
                <span class="legend__pct">{{ slice.pct }}%</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="panel chart-panel">
          <header class="panel__head">
            <h2>Pipeline de trámites</h2>
          </header>
          <div class="funnel">
            <div v-for="step in pipeline" :key="step.id" class="funnel__row">
              <div class="funnel__label">
                <span>{{ step.label }}</span>
                <strong>{{ step.value }}</strong>
              </div>
              <div class="funnel__track">
                <div
                  class="funnel__bar"
                  :style="{ width: step.width + '%', background: step.color }"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section v-if="quickLinks.length" class="panel shortcuts-panel">
        <header class="panel__head">
          <h2>Accesos frecuentes</h2>
        </header>
        <div class="quick-grid">
          <RouterLink v-for="q in quickLinks" :key="q.to" :to="q.to" class="quick">
            <i :class="q.icon" aria-hidden="true" />
            <span>{{ q.label }}</span>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const data = ref(null)
const error = ref('')

const m = computed(() => data.value?.metrics || {})

function show(cap) {
  return auth.can(cap)
}

function go(to) {
  if (to) router.push(to).catch(() => {})
}

function n(v) {
  return Number(v) || 0
}

/** Franja superior estilo Resumen Hiryx — alertas / KPIs de atención */
const alertCards = computed(() => {
  const x = m.value
  const cards = []
  if (show('admin.solicitudes')) {
    cards.push({
      id: 'req',
      accent: 'accent-rose',
      value: n(x.requestsOpen),
      label: n(x.requestsOpen) === 1 ? 'solicitud abierta' : 'solicitudes abiertas',
      hint: `${n(x.requestsTotal)} en total`,
      to: '/solicitudes',
    })
  }
  if (show('admin.comentarios')) {
    cards.push({
      id: 'com',
      accent: 'accent-amber',
      value: n(x.commentsPending),
      label: 'comentarios sin revisar',
      hint: 'Pendientes de moderación',
      to: '/moderacion-comentarios',
    })
  }
  if (show('admin.workflows')) {
    const ok = n(x.approvalsOpen) === 0
    cards.push({
      id: 'wf',
      accent: ok ? 'accent-emerald' : 'accent-amber',
      value: ok ? 'OK' : n(x.approvalsOpen),
      label: ok ? 'aprobaciones al día' : 'aprobaciones en curso',
      hint: `${n(x.workflowsActive)} flujos activos`,
      to: '/workflows',
    })
  }
  if (show('admin.chat')) {
    cards.push({
      id: 'chat',
      accent: 'accent-teal',
      value: n(x.chatReportsOpen),
      label: n(x.chatReportsOpen) === 1 ? 'denuncia de chat' : 'denuncias de chat',
      hint: 'Abiertas',
      to: '/chat-moderacion',
    })
  }
  if (show('admin.usuarios')) {
    cards.push({
      id: 'users',
      accent: 'accent-violet',
      value: n(x.activeUsers),
      label: 'miembros activos',
      hint: `${n(x.users)} en total`,
      to: '/usuarios',
    })
  }
  if (show('admin.publicaciones') && cards.length < 5) {
    cards.push({
      id: 'posts',
      accent: 'accent-violet',
      value: n(x.postsPublished),
      label: 'publicaciones vivas',
      hint: `${n(x.postsDraft)} borrador`,
      to: '/publicaciones',
    })
  }
  return cards.slice(0, 5)
})

/** Filas tipo “novedades en vivo” derivadas de pendientes reales */
const liveItems = computed(() => {
  const x = m.value
  const items = []
  if (show('admin.solicitudes') && n(x.requestsOpen) > 0) {
    items.push({
      id: 'live-req',
      tone: 'rose',
      icon: 'fas fa-inbox',
      title: `${n(x.requestsOpen)} solicitud${n(x.requestsOpen) === 1 ? '' : 'es'} esperando gestión`,
      meta: `Bandeja · ${n(x.requestsTotal)} históricas`,
      cta: 'Ver bandeja',
      to: '/solicitudes',
      time: 'ahora',
    })
  }
  if (show('admin.workflows') && n(x.approvalsOpen) > 0) {
    items.push({
      id: 'live-appr',
      tone: 'amber',
      icon: 'fas fa-project-diagram',
      title: `${n(x.approvalsOpen)} aprobación${n(x.approvalsOpen) === 1 ? '' : 'es'} en curso`,
      meta: `${n(x.workflowsActive)} flujos activos`,
      cta: 'Ver flujos',
      to: '/workflows',
      time: 'ahora',
    })
  }
  if (show('admin.comentarios') && n(x.commentsPending) > 0) {
    items.push({
      id: 'live-com',
      tone: 'amber',
      icon: 'fas fa-comment-dots',
      title: `${n(x.commentsPending)} comentario${n(x.commentsPending) === 1 ? '' : 's'} por moderar`,
      meta: 'Moderación asistida',
      cta: 'Revisar',
      to: '/moderacion-comentarios',
      time: 'pendiente',
    })
  }
  if (show('admin.chat') && n(x.chatReportsOpen) > 0) {
    items.push({
      id: 'live-chat',
      tone: 'teal',
      icon: 'fas fa-flag',
      title: `${n(x.chatReportsOpen)} denuncia${n(x.chatReportsOpen) === 1 ? '' : 's'} de chat abierta${n(x.chatReportsOpen) === 1 ? '' : 's'}`,
      meta: 'Moderación de chat',
      cta: 'Abrir',
      to: '/chat-moderacion',
      time: 'urgente',
    })
  }
  if (show('admin.publicaciones') && n(x.postsPendingModeration) > 0) {
    items.push({
      id: 'live-postmod',
      tone: 'violet',
      icon: 'fas fa-newspaper',
      title: `${n(x.postsPendingModeration)} publicación${n(x.postsPendingModeration) === 1 ? '' : 'es'} en moderación`,
      meta: 'Muro · revisión',
      cta: 'Ver pubs',
      to: '/publicaciones',
      time: 'hoy',
    })
  }
  if (show('admin.notificaciones') && n(x.notificationsScheduled) > 0) {
    items.push({
      id: 'live-push',
      tone: 'violet',
      icon: 'fas fa-bell',
      title: `${n(x.notificationsScheduled)} campaña${n(x.notificationsScheduled) === 1 ? '' : 's'} programada${n(x.notificationsScheduled) === 1 ? '' : 's'}`,
      meta: `${n(x.notificationsSent)} ya enviadas`,
      cta: 'Notificaciones',
      to: '/notificaciones',
      time: 'agenda',
    })
  }
  if (!items.length && show('admin.publicaciones')) {
    items.push({
      id: 'live-ok',
      tone: 'emerald',
      icon: 'fas fa-check',
      title: 'Sin pendientes críticos',
      meta: `${n(x.postsPublished)} publicaciones · ${n(x.activeUsers)} miembros activos`,
      cta: 'Publicar',
      to: '/publicaciones',
      time: 'ok',
    })
  }
  return items.slice(0, 8)
})

const CONTENT_COLORS = {
  posts: '#6b5bf0',
  docs: '#22c55e',
  surveys: '#f59e0b',
  hub: '#38bdf8',
  greet: '#ec4899',
}

const contentSlices = computed(() => {
  const x = m.value
  const raw = [
    { id: 'posts', label: 'Publicaciones', value: n(x.postsPublished), color: CONTENT_COLORS.posts, show: show('admin.publicaciones') },
    { id: 'docs', label: 'Documentos', value: n(x.docsPublished), color: CONTENT_COLORS.docs, show: show('admin.documentos') },
    { id: 'surveys', label: 'Encuestas', value: n(x.surveysOpen), color: CONTENT_COLORS.surveys, show: show('admin.encuestas') },
    { id: 'hub', label: 'Enlaces', value: n(x.hubLinks), color: CONTENT_COLORS.hub, show: show('admin.hub') },
    { id: 'greet', label: 'Saludos', value: n(x.greetingRulesActive), color: CONTENT_COLORS.greet, show: show('admin.saludos') },
  ].filter((s) => s.show)
  const total = raw.reduce((a, s) => a + s.value, 0) || 1
  return raw.map((s) => ({
    ...s,
    pct: Math.round((s.value / total) * 100),
  }))
})

const contentTotal = computed(() => contentSlices.value.reduce((a, s) => a + s.value, 0))

const donutGradient = computed(() => {
  const slices = contentSlices.value
  const total = contentTotal.value || 1
  if (!slices.length || contentTotal.value === 0) {
    return `conic-gradient(var(--line) 0deg 360deg)`
  }
  let acc = 0
  const parts = slices.map((s) => {
    const start = (acc / total) * 360
    acc += s.value
    const end = (acc / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${parts.join(', ')})`
})

const donutAria = computed(() =>
  contentSlices.value.map((s) => `${s.label}: ${s.value}`).join(', ') || 'Sin contenido',
)

const pipeline = computed(() => {
  const x = m.value
  const open = n(x.requestsOpen)
  const approvals = n(x.approvalsOpen)
  const closed = Math.max(0, n(x.requestsTotal) - open)
  const max = Math.max(open, approvals, closed, 1)
  return [
    { id: 'open', label: 'Abiertas', value: open, width: Math.max(8, (open / max) * 100), color: '#6b5bf0' },
    {
      id: 'appr',
      label: 'En aprobación',
      value: approvals,
      width: Math.max(approvals ? 8 : 4, (approvals / max) * 100),
      color: '#8b7cf7',
    },
    {
      id: 'done',
      label: 'Cerradas',
      value: closed,
      width: Math.max(closed ? 8 : 4, (closed / max) * 100),
      color: '#4a37c8',
    },
  ]
})

const quickLinks = computed(() => {
  const all = [
    { to: '/usuarios', label: 'Usuarios', icon: 'fas fa-user-friends', cap: 'admin.usuarios' },
    { to: '/solicitudes', label: 'Solicitudes', icon: 'fas fa-inbox', cap: 'admin.solicitudes' },
    { to: '/publicaciones', label: 'Publicaciones', icon: 'fas fa-newspaper', cap: 'admin.publicaciones' },
    { to: '/beneficios', label: 'Beneficios', icon: 'fas fa-gift', cap: 'admin.beneficios' },
    { to: '/eventos', label: 'Eventos', icon: 'fas fa-calendar', cap: 'admin.eventos' },
    { to: '/asistente-kb', label: 'Base KB', icon: 'fas fa-book', cap: 'admin.ia' },
    { to: '/comunicaciones', label: 'Comunicaciones', icon: 'fas fa-paper-plane', cap: 'admin.comunicaciones' },
    { to: '/reportes', label: 'Reportes', icon: 'fas fa-chart-bar', cap: 'admin.reportes' },
  ]
  return all.filter((i) => auth.can(i.cap)).slice(0, 8)
})

onMounted(async () => {
  try {
    const res = await api.get('/admin/tenants/me/dashboard')
    data.value = res.data
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el dashboard'
  }
})
</script>

<style scoped>
.resumen {
  max-width: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.resumen-err {
  color: #f87171;
  font-size: 0.875rem;
}
.resumen-muted {
  color: var(--ink-faint);
  font-size: 0.9rem;
}

/* —— Franja de alertas (Resumen Hiryx) —— */
.alert-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
}
@media (max-width: 1100px) {
  .alert-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .alert-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.alert-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  padding: 0.85rem 1rem 0.85rem 1.05rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: var(--sh);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
}
.alert-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--brand);
}
.alert-card:hover {
  border-color: var(--brand-line);
  transform: translateY(-1px);
}
.alert-card__val {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.35rem;
  font-weight: 650;
  color: var(--ink);
  line-height: 1.15;
}
.alert-card__label {
  font-size: 0.72rem;
  color: var(--ink-soft);
  line-height: 1.3;
}
.accent-rose::before {
  background: #f43f5e;
}
.accent-amber::before {
  background: #f59e0b;
}
.accent-emerald::before {
  background: #22c55e;
}
.accent-teal::before {
  background: #14b8a6;
}
.accent-violet::before {
  background: #6b5bf0;
}

/* —— Paneles —— */
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--sh);
  padding: 1rem 1.1rem 1.15rem;
}
.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.panel__head h2 {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.panel__hint {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: var(--ink-faint);
}
.panel__link {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-ink);
  text-decoration: none;
  white-space: nowrap;
}
.panel__link:hover {
  text-decoration: underline;
}

/* —— Feed —— */
.live-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
}
.live-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.7rem 0.25rem;
  border-top: 1px solid var(--line);
}
.live-row:first-child {
  border-top: 0;
}
.live-row__avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  color: #fff;
  background: var(--brand);
}
.tone-rose {
  background: #f43f5e;
}
.tone-amber {
  background: #f59e0b;
  color: #1a1624;
}
.tone-teal {
  background: #14b8a6;
}
.tone-violet {
  background: #6b5bf0;
}
.tone-emerald {
  background: #22c55e;
  color: #0b1a10;
}
.live-row__title {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 560;
  color: var(--ink);
}
.live-row__meta {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--ink-faint);
}
.live-row__action {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
}
.live-row__action:hover {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}
.live-row__time {
  font-size: 0.68rem;
  color: var(--ink-faint);
  min-width: 3.2rem;
  text-align: right;
}
.live-empty {
  margin: 0;
  padding: 1.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--ink-faint);
  text-align: center;
}
@media (max-width: 720px) {
  .live-row {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'av body'
      'av action'
      'av time';
  }
  .live-row__avatar {
    grid-area: av;
  }
  .live-row__body {
    grid-area: body;
  }
  .live-row__action {
    grid-area: action;
    justify-self: start;
  }
  .live-row__time {
    grid-area: time;
    text-align: left;
  }
}

/* —— Bottom charts —— */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 900px) {
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

.donut-wrap {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}
.donut {
  width: 148px;
  height: 148px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.donut__hole {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
}
.donut__hole strong {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.25rem;
  color: var(--ink);
}
.donut__hole span {
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  font-weight: 600;
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.legend li {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.78rem;
}
.legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.legend__name {
  color: var(--ink-soft);
}
.legend__n {
  color: var(--ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.legend__pct {
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  min-width: 2.4rem;
  text-align: right;
}

.funnel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}
.funnel__label {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--ink-soft);
  margin-bottom: 0.3rem;
}
.funnel__label strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.funnel__track {
  height: 10px;
  border-radius: 999px;
  background: var(--panel-2);
  overflow: hidden;
  border: 1px solid var(--line);
}
.funnel__bar {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  transition: width 0.35s ease;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.55rem;
}
.quick {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel-2);
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 560;
  transition: border-color 0.15s, color 0.15s;
}
.quick i {
  color: var(--brand-ink);
  width: 1rem;
  text-align: center;
}
.quick:hover {
  border-color: var(--brand-line);
  color: var(--ink);
}
</style>
