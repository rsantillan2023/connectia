<template>
  <div class="resumen">
    <AdminPageHeader title="Reportes" subtitle="Panorama de adopción, muro, trámites y actividad.">
      <template #actions>
        <label class="date">
          Desde
          <input v-model="from" type="date" class="input" @change="reload" />
        </label>
        <label class="date">
          Hasta
          <input v-model="to" type="date" class="input" @change="reload" />
        </label>
        <button type="button" class="btn-ghost" :disabled="loading" @click="reload">
          <i class="fas fa-sync-alt text-xs" aria-hidden="true" />
          Actualizar
        </button>
        <button
          v-if="tab !== 'summary' && tab !== 'live'"
          type="button"
          class="btn-ghost"
          @click="exportFile('csv')"
        >
          CSV
        </button>
        <button
          v-if="tab !== 'summary' && tab !== 'live'"
          type="button"
          class="btn-primary"
          @click="exportFile('xlsx')"
        >
          Excel
        </button>
      </template>
    </AdminPageHeader>

    <div class="tabs tabs--sticky" role="tablist" aria-label="Tipo de reporte">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        class="chip"
        :class="{ active: tab === t.id }"
        :aria-selected="tab === t.id"
        @click="onTab(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" class="msg err">{{ error }}</p>
    <p v-else-if="okMsg" class="msg ok">{{ okMsg }}</p>
    <p v-else-if="loading && !summary && !data && !live" class="msg muted">Cargando panorama…</p>

    <!-- —— Resumen (estilo Resumen Hiryx) —— -->
    <template v-else-if="tab === 'summary' && summary">
      <section class="alert-strip" aria-label="Indicadores">
        <button
          v-for="card in summaryCards"
          :key="card.id"
          type="button"
          class="alert-card"
          :class="card.accent"
          :title="card.hint"
          @click="onTab(card.tab)"
        >
          <span class="alert-card__val">{{ card.value }}</span>
          <span class="alert-card__label">{{ card.label }}</span>
        </button>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div>
            <h2>Lectura rápida</h2>
            <p class="panel__hint">Tocá un indicador o una fila para abrir el informe</p>
          </div>
          <button type="button" class="panel__link" @click="onTab('live')">Ver en vivo</button>
        </header>
        <ul class="live-list">
          <li v-for="item in summaryInsights" :key="item.id" class="live-row">
            <span class="live-row__avatar" :class="'tone-' + item.tone" aria-hidden="true">
              <i :class="item.icon"></i>
            </span>
            <div class="live-row__body">
              <p class="live-row__title">{{ item.title }}</p>
              <p class="live-row__meta">{{ item.meta }}</p>
            </div>
            <button type="button" class="live-row__action" @click="onTab(item.tab)">{{ item.cta }}</button>
            <span class="live-row__time">{{ item.time }}</span>
          </li>
        </ul>
      </section>

      <div class="bottom-grid">
        <section class="panel">
          <header class="panel__head">
            <h2>Composición del período</h2>
          </header>
          <div class="donut-wrap">
            <div class="donut" :style="{ background: donutGradient }" role="img" :aria-label="donutAria">
              <div class="donut__hole">
                <strong>{{ contentTotal }}</strong>
                <span>SEÑALES</span>
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

        <section class="panel">
          <header class="panel__head">
            <h2>Adopción de la app</h2>
          </header>
          <div class="funnel">
            <div v-for="step in adoptionPipeline" :key="step.id" class="funnel__row">
              <div class="funnel__label">
                <span>{{ step.label }}</span>
                <strong>{{ step.value }}</strong>
              </div>
              <div class="funnel__track">
                <div class="funnel__bar" :style="{ width: step.width + '%', background: step.color }" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- —— En vivo —— -->
    <template v-else-if="tab === 'live' && live">
      <section class="alert-strip">
        <article class="alert-card accent-violet">
          <span class="alert-card__val">{{ live.totals?.events || 0 }}</span>
          <span class="alert-card__label">eventos</span>
        </article>
        <article class="alert-card accent-emerald">
          <span class="alert-card__val">{{ live.totals?.logins || 0 }}</span>
          <span class="alert-card__label">logins</span>
        </article>
        <article class="alert-card accent-amber">
          <span class="alert-card__val">{{ live.totals?.postViews || 0 }}</span>
          <span class="alert-card__label">vistas pubs</span>
        </article>
        <article class="alert-card accent-teal">
          <span class="alert-card__val">{{ live.totals?.uniqueUsers || 0 }}</span>
          <span class="alert-card__label">usuarios únicos</span>
        </article>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div>
            <h2>Actividad en vivo</h2>
            <p class="panel__hint">
              Últimos {{ live.windowMinutes }} min · lag
              {{ live.lagMs != null ? Math.round(live.lagMs / 1000) + 's' : '—' }}
              <span v-if="live.stale" class="warn"> · desactualizado</span>
            </p>
          </div>
          <div class="panel__actions">
            <label class="date">
              Minutos
              <input v-model.number="liveMinutes" type="number" min="1" max="120" class="input" @change="goLive" />
            </label>
            <button type="button" class="btn-ghost" @click="goLive">Refrescar</button>
          </div>
        </header>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Canal</th>
                <th>Recurso</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in live.events || []" :key="e.eventId">
                <td>{{ fmt(e.occurredAt) }}</td>
                <td>{{ e.type }}</td>
                <td>{{ e.nombre || e.usuarioHash }}</td>
                <td>{{ e.channel }}</td>
                <td>{{ e.recurso }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!(live.events || []).length" class="empty">Sin actividad en la ventana.</p>
      </section>
    </template>

    <!-- —— Resto de tabs —— -->
    <template v-else-if="data">
      <div class="toolbar panel toolbar-panel">
        <p class="muted small">Ventana {{ fmt(data.window?.from) }} → {{ fmt(data.window?.to) }}</p>
        <div class="toolbar-actions">
          <button
            v-if="tab === 'adoption'"
            type="button"
            class="btn-primary"
            :disabled="boostBusy"
            @click="boostSegment"
          >
            Convocar segmento
          </button>
        </div>
      </div>

      <template v-if="tab === 'adoption'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.summary?.pctAdopcion ?? 0 }}%</span>
            <span class="alert-card__label">adopción</span>
          </article>
          <article class="alert-card accent-emerald">
            <span class="alert-card__val">{{ data.summary?.active || 0 }}</span>
            <span class="alert-card__label">activos</span>
          </article>
          <article class="alert-card accent-amber">
            <span class="alert-card__val">{{ data.summary?.inactive || 0 }}</span>
            <span class="alert-card__label">inactivos</span>
          </article>
          <article class="alert-card accent-rose">
            <span class="alert-card__val">{{ data.summary?.never || 0 }}</span>
            <span class="alert-card__label">nunca</span>
          </article>
          <article class="alert-card accent-teal">
            <span class="alert-card__val">
              {{ data.summary?.byChannel?.mobile || 0 }} / {{ data.summary?.byChannel?.desktop || 0 }}
            </span>
            <span class="alert-card__label">móvil / desktop</span>
          </article>
        </section>
        <section class="panel">
          <div class="seg">
            <button type="button" class="chip" :class="{ active: segment === 'inactive' }" @click="segment = 'inactive'">
              Inactivos
            </button>
            <button type="button" class="chip" :class="{ active: segment === 'never' }" @click="segment = 'never'">
              Nunca
            </button>
            <button type="button" class="chip" :class="{ active: segment === 'active' }" @click="segment = 'active'">
              Activos
            </button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Último login</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in data.lists?.[segment] || []" :key="u.id">
                  <td>{{ u.nombre }}</td>
                  <td>{{ u.usuario }}</td>
                  <td>{{ u.lastLoginAt ? fmt(u.lastLoginAt) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'wall'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.posts || 0 }}</span>
            <span class="alert-card__label">publicaciones</span>
          </article>
          <article class="alert-card accent-emerald">
            <span class="alert-card__val">{{ data.totals?.engagement || 0 }}</span>
            <span class="alert-card__label">engagement</span>
          </article>
          <article class="alert-card accent-teal">
            <span class="alert-card__val">{{ data.totals?.views || 0 }}</span>
            <span class="alert-card__label">vistas únicas</span>
          </article>
        </section>
        <section class="panel">
          <header class="panel__head"><h2>Ranking de publicaciones</h2></header>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Vistas</th>
                  <th>Eng.</th>
                  <th>Reacc.</th>
                  <th>Com.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in data.ranking || []" :key="r.id">
                  <td>{{ i + 1 }}</td>
                  <td>{{ r.titulo }}</td>
                  <td>{{ r.views }}</td>
                  <td>{{ r.engagement }}</td>
                  <td>{{ r.reactions }}</td>
                  <td>{{ r.comments }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'surveys'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.surveys || 0 }}</span>
            <span class="alert-card__label">encuestas</span>
          </article>
          <article class="alert-card accent-emerald">
            <span class="alert-card__val">{{ data.totals?.responsesInWindow || 0 }}</span>
            <span class="alert-card__label">respuestas</span>
          </article>
        </section>
        <section class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Respuestas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in data.items || []" :key="s.id">
                  <td>{{ s.titulo }}</td>
                  <td>{{ s.status }}</td>
                  <td>{{ s.responsesInWindow }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'rsvp'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.events || 0 }}</span>
            <span class="alert-card__label">eventos</span>
          </article>
          <article class="alert-card accent-emerald">
            <span class="alert-card__val">{{ data.totals?.confirmados || 0 }}</span>
            <span class="alert-card__label">confirmados ({{ data.totals?.pctConfirmados ?? 0 }}%)</span>
          </article>
          <article class="alert-card accent-rose">
            <span class="alert-card__val">{{ data.totals?.rechazados || 0 }}</span>
            <span class="alert-card__label">rechazados</span>
          </article>
        </section>
        <section class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Inicio</th>
                  <th>Estado</th>
                  <th>Cupo</th>
                  <th>Conf.</th>
                  <th>Rech.</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in data.items || []" :key="e.id">
                  <td>{{ e.titulo }}</td>
                  <td>{{ fmt(e.inicio) }}</td>
                  <td>{{ e.status }}</td>
                  <td>{{ e.cupo == null ? '—' : e.cupo }}</td>
                  <td>{{ e.confirmados }}</td>
                  <td>{{ e.rechazados }}</td>
                  <td>{{ e.pctConfirmados }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!(data.items || []).length" class="empty">Sin eventos con inicio en la ventana.</p>
          <h3 v-if="(data.details || []).length" class="subhead">Últimas confirmaciones</h3>
          <div v-if="(data.details || []).length" class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Persona</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in (data.details || []).slice(0, 50)" :key="`${d.eventId}-${d.userId}-${i}`">
                  <td>{{ d.evento }}</td>
                  <td>{{ d.nombre || d.usuario || d.email || '—' }}</td>
                  <td>{{ d.estado }}</td>
                  <td>{{ fmt(d.confirmedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'requests'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.total || 0 }}</span>
            <span class="alert-card__label">trámites</span>
          </article>
        </section>
        <section class="panel">
          <div class="status-chips">
            <span v-for="(n, k) in data.totals?.byEstado || {}" :key="k" class="status-chip">{{ k }}: {{ n }}</span>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.items || []" :key="r.id">
                  <td>{{ r.titulo }}</td>
                  <td>{{ r.estado }}</td>
                  <td>{{ fmt(r.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'documents'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.downloads || 0 }}</span>
            <span class="alert-card__label">descargas</span>
          </article>
          <article class="alert-card accent-teal">
            <span class="alert-card__val">{{ data.totals?.uniqueDocs || 0 }}</span>
            <span class="alert-card__label">documentos</span>
          </article>
        </section>
        <section class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Descargas</th>
                  <th>Únicos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.ranking || []" :key="r.docId">
                  <td>{{ r.titulo }}</td>
                  <td>{{ r.downloads }}</td>
                  <td>{{ r.uniqueUsers }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'absences'">
        <section class="alert-strip">
          <article class="alert-card accent-violet">
            <span class="alert-card__val">{{ data.totals?.total || 0 }}</span>
            <span class="alert-card__label">solicitudes</span>
          </article>
          <article class="alert-card accent-amber">
            <span class="alert-card__val">{{ data.totals?.diasTotal || 0 }}</span>
            <span class="alert-card__label">días</span>
          </article>
        </section>
        <section class="panel">
          <div class="status-chips">
            <span v-for="(n, k) in data.totals?.byEstado || {}" :key="k" class="status-chip">{{ k }}: {{ n }}</span>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Solicitante</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Días</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.items || []" :key="r.id">
                  <td>{{ r.tipo }}</td>
                  <td>{{ r.solicitante }}</td>
                  <td>{{ r.desde ? String(r.desde).slice(0, 10) : '—' }}</td>
                  <td>{{ r.hasta ? String(r.hasta).slice(0, 10) : '—' }}</td>
                  <td>{{ r.dias }}</td>
                  <td>{{ r.estado }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'wiped'">
        <section class="alert-strip">
          <article class="alert-card accent-rose">
            <span class="alert-card__val">{{ data.totals?.total || 0 }}</span>
            <span class="alert-card__label">eventos de blanqueo</span>
          </article>
        </section>
        <section class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>Motivo</th>
                  <th>Disp.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in data.items || []" :key="r.id">
                  <td>{{ fmt(r.occurredAt) }}</td>
                  <td>{{ r.action }}</td>
                  <td>{{ r.nombre || r.usuario }}</td>
                  <td>{{ r.motivo }}</td>
                  <td>{{ r.devicesCleared }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'adoption', label: 'Adopción' },
  { id: 'wall', label: 'Muro' },
  { id: 'surveys', label: 'Encuestas' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'requests', label: 'Trámites' },
  { id: 'documents', label: 'Documentos' },
  { id: 'absences', label: 'Ausentismos' },
  { id: 'wiped', label: 'Blanqueados' },
  { id: 'live', label: 'En vivo' },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoIso(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const tab = ref('summary')
const from = ref(daysAgoIso(30))
const to = ref(todayIso())
const loading = ref(false)
const error = ref('')
const okMsg = ref('')
const summary = ref(null)
const data = ref(null)
const live = ref(null)
const liveMinutes = ref(15)
const segment = ref('inactive')
const boostBusy = ref(false)
let liveTimer = null

function n(v) {
  return Number(v) || 0
}

function fmt(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return String(v)
  }
}

function params() {
  return { from: from.value, to: to.value }
}

const summaryCards = computed(() => {
  const s = summary.value || {}
  return [
    {
      id: 'ado',
      accent: 'accent-violet',
      value: `${s.adoption?.pctAdopcion ?? 0}%`,
      label: 'adopción',
      hint: `${n(s.adoption?.active)} activos · ${n(s.adoption?.never)} nunca`,
      tab: 'adoption',
    },
    {
      id: 'wall',
      accent: 'accent-teal',
      value: n(s.wallPosts),
      label: 'publicaciones',
      hint: 'Muro en el período',
      tab: 'wall',
    },
    {
      id: 'docs',
      accent: 'accent-emerald',
      value: n(s.documentDownloads),
      label: 'descargas de docs',
      hint: 'Documentos',
      tab: 'documents',
    },
    {
      id: 'abs',
      accent: 'accent-amber',
      value: n(s.absences),
      label: 'ausentismos',
      hint: 'Solicitudes de ausencia',
      tab: 'absences',
    },
    {
      id: 'rsvp',
      accent: 'accent-rose',
      value: n(s.rsvpConfirmados),
      label: 'RSVP confirmados',
      hint: `${n(s.eventsInWindow)} eventos en ventana`,
      tab: 'rsvp',
    },
  ]
})

const summaryInsights = computed(() => {
  const s = summary.value || {}
  const items = [
    {
      id: 'i1',
      tone: 'violet',
      icon: 'fas fa-user-check',
      title: `Adopción al ${s.adoption?.pctAdopcion ?? 0}%`,
      meta: `${n(s.adoption?.active)} activos · ${n(s.adoption?.inactive)} inactivos · ${n(s.adoption?.never)} nunca`,
      cta: 'Ver adopción',
      tab: 'adoption',
      time: 'período',
    },
    {
      id: 'i2',
      tone: 'teal',
      icon: 'fas fa-newspaper',
      title: `${n(s.wallPosts)} publicaciones en el muro`,
      meta: 'Engagement y ranking por informe Muro',
      cta: 'Ver muro',
      tab: 'wall',
      time: 'período',
    },
    {
      id: 'i3',
      tone: 'emerald',
      icon: 'fas fa-file-download',
      title: `${n(s.documentDownloads)} descargas de documentos`,
      meta: 'Documentos más consultados',
      cta: 'Ver docs',
      tab: 'documents',
      time: 'período',
    },
  ]
  if (n(s.deviceWipes) > 0) {
    items.push({
      id: 'i4',
      tone: 'rose',
      icon: 'fas fa-mobile-alt',
      title: `${n(s.deviceWipes)} blanqueos de dispositivo`,
      meta: 'Revisá motivos y usuarios',
      cta: 'Ver blanqueos',
      tab: 'wiped',
      time: 'alerta',
    })
  }
  return items
})

const contentSlices = computed(() => {
  const s = summary.value || {}
  const raw = [
    { id: 'wall', label: 'Publicaciones', value: n(s.wallPosts), color: '#6b5bf0' },
    { id: 'docs', label: 'Descargas', value: n(s.documentDownloads), color: '#22c55e' },
    { id: 'abs', label: 'Ausentismos', value: n(s.absences), color: '#f59e0b' },
    { id: 'rsvp', label: 'RSVP', value: n(s.rsvpConfirmados), color: '#f43f5e' },
    { id: 'wipe', label: 'Blanqueos', value: n(s.deviceWipes), color: '#38bdf8' },
  ]
  const total = raw.reduce((a, x) => a + x.value, 0) || 1
  return raw.map((x) => ({ ...x, pct: Math.round((x.value / total) * 100) }))
})

const contentTotal = computed(() => contentSlices.value.reduce((a, s) => a + s.value, 0))

const donutGradient = computed(() => {
  const slices = contentSlices.value
  const total = contentTotal.value || 1
  if (!contentTotal.value) return `conic-gradient(var(--line) 0deg 360deg)`
  let acc = 0
  const parts = slices.map((s) => {
    const start = (acc / total) * 360
    acc += s.value
    const end = (acc / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${parts.join(', ')})`
})

const donutAria = computed(() => contentSlices.value.map((s) => `${s.label}: ${s.value}`).join(', '))

const adoptionPipeline = computed(() => {
  const a = summary.value?.adoption || {}
  const active = n(a.active)
  const inactive = n(a.inactive)
  const never = n(a.never)
  const max = Math.max(active, inactive, never, 1)
  return [
    { id: 'a', label: 'Activos', value: active, width: Math.max(8, (active / max) * 100), color: '#22c55e' },
    { id: 'i', label: 'Inactivos', value: inactive, width: Math.max(inactive ? 8 : 4, (inactive / max) * 100), color: '#f59e0b' },
    { id: 'n', label: 'Nunca', value: never, width: Math.max(never ? 8 : 4, (never / max) * 100), color: '#f43f5e' },
  ]
})

async function loadSummary() {
  summary.value = (await api.get('/admin/reports/summary', { params: params() })).data
}

async function loadTab(name) {
  data.value = (await api.get(`/admin/reports/${name}`, { params: params() })).data
}

async function reload() {
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    if (tab.value === 'summary') {
      data.value = null
      live.value = null
      await loadSummary()
    } else if (tab.value === 'live') {
      await goLive()
    } else {
      live.value = null
      await loadTab(tab.value)
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al cargar reportes'
  } finally {
    loading.value = false
  }
}

async function onTab(name) {
  if (name === 'live') return goLive()
  stopLive()
  tab.value = name
  await reload()
}

async function goLive() {
  stopLive()
  tab.value = 'live'
  loading.value = true
  error.value = ''
  try {
    live.value = (
      await api.get('/admin/reports/live', { params: { minutes: liveMinutes.value || 15 } })
    ).data
    liveTimer = setInterval(async () => {
      try {
        live.value = (
          await api.get('/admin/reports/live', { params: { minutes: liveMinutes.value || 15 } })
        ).data
      } catch {
        /* ignore */
      }
    }, 15000)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar en vivo'
  } finally {
    loading.value = false
  }
}

function stopLive() {
  if (liveTimer) {
    clearInterval(liveTimer)
    liveTimer = null
  }
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function exportFile(format) {
  if (tab.value === 'summary' || tab.value === 'live') return
  try {
    const res = await api.get(`/admin/reports/${tab.value}`, {
      params: { ...params(), export: format === 'xlsx' ? 'xlsx' : '1', segment: segment.value },
      responseType: format === 'xlsx' ? 'blob' : 'json',
    })
    if (format === 'xlsx') {
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `reportes-${tab.value}-${from.value}_${to.value}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    const payload = res.data
    const fields = payload.fields || []
    const rows = payload.rows || []
    const lines = [fields.join(','), ...rows.map((r) => fields.map((f) => csvEscape(r[f])).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reportes-${tab.value}-${from.value}_${to.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo exportar'
  }
}

async function boostSegment() {
  boostBusy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const { data: res } = await api.post('/admin/reports/adoption/boost', {
      ...params(),
      segment: segment.value,
      send: true,
      href: '/',
    })
    okMsg.value = `Campaña enviada a ${res.targeted} personas (${res.segment})`
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo crear la campaña'
  } finally {
    boostBusy.value = false
  }
}

watch(tab, (t) => {
  if (t === 'summary') reload()
})

onMounted(reload)
onUnmounted(stopLive)
</script>

<style scoped>
.resumen {
  max-width: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.date {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.68rem;
  color: var(--ink-faint);
}
.input {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
  font-size: 0.8rem;
  background: var(--panel-2);
  color: var(--ink);
}
.btn-ghost,
.btn-primary {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--ink-soft);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.btn-primary {
  background: var(--brand) !important;
  border-color: var(--brand) !important;
  color: #fff !important;
}

.tabs--sticky {
  position: sticky;
  top: 0;
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.45rem 0 0.65rem;
  background: color-mix(in srgb, var(--canvas) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.chip {
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  font-size: 0.78rem;
  font-weight: 560;
  cursor: pointer;
}
.chip:hover {
  border-color: var(--brand-line);
  color: var(--brand-ink);
}
.chip.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.msg {
  margin: 0;
  font-size: 0.875rem;
}
.msg.err {
  color: #f87171;
}
.msg.ok {
  color: var(--brand-ink);
}
.msg.muted,
.muted {
  color: var(--ink-faint);
}
.warn {
  color: #f59e0b;
}
.empty {
  margin: 0.75rem 0 0;
  text-align: center;
  color: var(--ink-faint);
  font-size: 0.85rem;
}
.subhead {
  margin: 1.25rem 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
}
.small {
  font-size: 0.78rem;
}

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
}
button.alert-card {
  font: inherit;
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
  border: 0;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-ink);
  cursor: pointer;
  text-decoration: none;
}
.panel__actions {
  display: flex;
  gap: 0.5rem;
  align-items: end;
  flex-wrap: wrap;
}

.live-list {
  list-style: none;
  margin: 0;
  padding: 0;
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
  cursor: pointer;
}
.live-row__time {
  font-size: 0.68rem;
  color: var(--ink-faint);
  min-width: 3.2rem;
  text-align: right;
}

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
}
.legend__pct {
  color: var(--ink-faint);
  min-width: 2.4rem;
  text-align: right;
}
.funnel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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
}

.toolbar-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
}
.toolbar-actions {
  display: flex;
  gap: 0.35rem;
}
.seg {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}
.status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.status-chip {
  font-size: 0.72rem;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  color: var(--ink-soft);
}

.table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid var(--line);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.table th,
.table td {
  padding: 0.65rem 0.75rem;
  border-top: 1px solid var(--line);
  text-align: left;
  color: var(--ink);
}
.table th {
  background: var(--panel-2);
  color: var(--ink-soft);
  font-weight: 600;
  border-top: 0;
}
.table tbody tr:hover td {
  background: color-mix(in srgb, var(--brand) 6%, transparent);
}
</style>
