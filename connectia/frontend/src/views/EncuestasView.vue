<template>
  <section class="enc">
    <header class="enc-head">
      <h1>Encuestas</h1>
      <p v-if="pending.length">{{ pendingHint }}</p>
      <p v-else>Consultá lo que ya respondiste o esperá nuevas encuestas.</p>
    </header>

    <p v-if="error" class="enc-err" role="alert">{{ error }}</p>

    <div v-if="loading" class="enc-skel" aria-busy="true" aria-label="Cargando encuestas">
      <div v-for="n in 3" :key="n" class="enc-skel-card" />
    </div>

    <template v-else>
      <section v-if="pending.length" class="enc-section" aria-labelledby="enc-pending-title">
        <div class="enc-section-head">
          <h2 id="enc-pending-title">Pendientes</h2>
          <span class="enc-count">{{ pending.length }}</span>
        </div>
        <div class="enc-list">
          <button
            v-for="s in pending"
            :key="s.id"
            type="button"
            class="enc-card enc-card--pending"
            :class="{ 'enc-card--urgent': isUrgent(s) }"
            @click="$router.push(`/encuestas/${s.id}`)"
          >
            <span v-if="s.imageUrl" class="enc-card-thumb" aria-hidden="true">
              <img :src="s.imageUrl" alt="" @error="onImgErr" />
            </span>
            <span v-else class="enc-card-icon" aria-hidden="true">
              <AppIcon name="clipboard" :size="20" />
            </span>
            <div class="enc-card-body">
              <div v-if="cardBadges(s).length" class="enc-card-badges">
                <span
                  v-for="b in cardBadges(s)"
                  :key="b.key"
                  class="enc-badge"
                  :class="b.className"
                >
                  {{ b.label }}
                </span>
              </div>
              <h3>{{ s.titulo }}</h3>
              <p v-if="excerpt(s.descripcion)" class="enc-card-desc">{{ excerpt(s.descripcion) }}</p>
              <p class="enc-card-meta">
                <span>{{ questionLabel(s) }}</span>
                <span v-if="scheduleHint(s)"> · {{ scheduleHint(s) }}</span>
                <span v-if="authorHint(s)"> · {{ authorHint(s) }}</span>
              </p>
            </div>
            <span class="enc-card-cta">Responder</span>
          </button>
        </div>
      </section>

      <section v-if="done.length" class="enc-section" aria-labelledby="enc-done-title">
        <div class="enc-section-head">
          <h2 id="enc-done-title">Respondidas</h2>
          <span class="enc-count enc-count--muted">{{ done.length }}</span>
        </div>
        <div class="enc-list">
          <button
            v-for="s in done"
            :key="s.id"
            type="button"
            class="enc-card enc-card--done"
            @click="$router.push(`/encuestas/${s.id}`)"
          >
            <span v-if="s.imageUrl" class="enc-card-thumb enc-card-thumb--done" aria-hidden="true">
              <img :src="s.imageUrl" alt="" @error="onImgErr" />
            </span>
            <span v-else class="enc-card-icon enc-card-icon--done" aria-hidden="true">
              <AppIcon name="check" :size="20" />
            </span>
            <div class="enc-card-body">
              <div v-if="cardBadges(s).length" class="enc-card-badges">
                <span
                  v-for="b in cardBadges(s)"
                  :key="b.key"
                  class="enc-badge"
                  :class="b.className"
                >
                  {{ b.label }}
                </span>
              </div>
              <h3>{{ s.titulo }}</h3>
              <p v-if="excerpt(s.descripcion)" class="enc-card-desc">{{ excerpt(s.descripcion) }}</p>
              <p class="enc-card-meta">
                <span>{{ questionLabel(s) }}</span>
                <span v-if="answeredHint(s)"> · {{ answeredHint(s) }}</span>
                <span v-else-if="scheduleHint(s)"> · {{ scheduleHint(s) }}</span>
                <span v-if="authorHint(s)"> · {{ authorHint(s) }}</span>
              </p>
            </div>
            <span class="enc-card-cta enc-card-cta--ghost">Ver</span>
          </button>
        </div>
      </section>

      <div v-if="!items.length" class="enc-empty">
        <span class="enc-empty-icon" aria-hidden="true">
          <AppIcon name="clipboard" :size="28" />
        </span>
        <p class="enc-empty-title">No hay encuestas abiertas</p>
        <p class="enc-empty-hint">Cuando tu organización publique una, va a aparecer acá.</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'

const PURPOSE_LABELS = {
  onboarding: 'Ingreso',
  offboarding: 'Egreso',
  general: '',
}

const items = ref([])
const loading = ref(true)
const error = ref('')

const pending = computed(() => items.value.filter((s) => !s.answered))
const done = computed(() => items.value.filter((s) => s.answered))
const pendingHint = computed(() => {
  const n = pending.value.length
  return n === 1
    ? 'Tenés 1 encuesta esperando tu respuesta'
    : `Tenés ${n} encuestas esperando tu respuesta`
})

function excerpt(text, max = 110) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return ''
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function questionLabel(s) {
  const n = Number(s.questionCount) || 0
  return `${n} pregunta${n === 1 ? '' : 's'}`
}

function formatShortDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return ''
  }
}

function formatDateTime(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function daysUntilEnd(s) {
  if (!s?.endsAt) return null
  const end = new Date(s.endsAt).getTime()
  if (Number.isNaN(end)) return null
  const ms = end - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function isUrgent(s) {
  const d = daysUntilEnd(s)
  return d != null && d >= 0 && d <= 2
}

function scheduleHint(s) {
  const d = daysUntilEnd(s)
  if (d != null) {
    if (d < 0) return `Cerró ${formatShortDate(s.endsAt)}`
    if (d === 0) return 'Cierra hoy'
    if (d === 1) return 'Cierra mañana'
    if (d <= 7) return `Cierra en ${d} días`
    return `Hasta ${formatShortDate(s.endsAt)}`
  }
  if (s.startsAt) {
    const start = formatShortDate(s.startsAt)
    if (start) return `Desde ${start}`
  }
  if (s.publishedAt) {
    const pub = formatShortDate(s.publishedAt)
    if (pub) return `Publicada ${pub}`
  }
  return ''
}

function answeredHint(s) {
  if (!s.answeredAt) return ''
  const when = formatDateTime(s.answeredAt)
  return when ? `Respondida ${when}` : ''
}

function authorHint(s) {
  const name = String(s.authorName || '').trim()
  return name ? `Por ${name}` : ''
}

function cardBadges(s) {
  const out = []
  if (s.anonymous) {
    out.push({ key: 'anon', label: 'Anónima', className: 'enc-badge--anon' })
  }
  const purpose = PURPOSE_LABELS[String(s.purpose || '').toLowerCase()]
  if (purpose) {
    out.push({ key: 'purpose', label: purpose, className: 'enc-badge--purpose' })
  }
  if (!s.answered && isUrgent(s)) {
    out.push({ key: 'urgent', label: 'Por vencer', className: 'enc-badge--urgent' })
  }
  return out
}

function onImgErr(e) {
  const el = e?.target
  if (el) el.style.display = 'none'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/surveys')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.enc {
  padding: 16px 16px 32px;
}
.enc-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  color: var(--cx-text);
}
.enc-head p {
  margin: 6px 0 0;
  color: var(--cx-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}
.enc-section {
  margin-top: 20px;
}
.enc-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.enc-section-head h2 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cx-muted);
}
.enc-count {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
  color: var(--brand-primary);
}
.enc-count--muted {
  background: color-mix(in srgb, var(--cx-muted) 16%, transparent);
  color: var(--cx-muted);
}
.enc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.enc-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.enc-card:active {
  transform: scale(0.985);
}
.enc-card--pending {
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--brand-primary) 10%, transparent);
}
.enc-card--urgent {
  border-color: color-mix(in srgb, #c2410c 35%, var(--cx-border));
}
.enc-card--done {
  opacity: 0.96;
}
.enc-card-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
  margin-top: 2px;
}
.enc-card-icon--done {
  background: color-mix(in srgb, var(--cx-ok) 12%, transparent);
  color: var(--cx-ok);
}
.enc-card-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in srgb, var(--cx-muted) 12%, transparent);
  margin-top: 2px;
}
.enc-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.enc-card-thumb--done {
  opacity: 0.9;
}
.enc-card-body {
  flex: 1;
  min-width: 0;
}
.enc-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.enc-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.4;
}
.enc-badge--anon {
  background: color-mix(in srgb, var(--cx-muted) 14%, transparent);
  color: var(--cx-muted);
}
.enc-badge--purpose {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.enc-badge--urgent {
  background: color-mix(in srgb, #c2410c 14%, transparent);
  color: #c2410c;
}
.enc-card-body h3 {
  margin: 0 0 4px;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--cx-text);
  line-height: 1.3;
}
.enc-card-desc {
  margin: 0 0 6px;
  font-size: 0.82rem;
  color: var(--cx-text);
  opacity: 0.78;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.enc-card-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--cx-muted);
  line-height: 1.35;
}
.enc-card-cta {
  flex-shrink: 0;
  align-self: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
}
.enc-card-cta--ghost {
  background: color-mix(in srgb, var(--cx-muted) 12%, transparent);
  color: var(--cx-muted);
}
.enc-skel {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.enc-skel-card {
  height: 96px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 0%,
    color-mix(in srgb, var(--cx-muted) 14%, transparent) 50%,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: enc-shimmer 1.2s ease-in-out infinite;
}
@keyframes enc-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
.enc-empty {
  margin-top: 48px;
  text-align: center;
  padding: 0 12px;
}
.enc-empty-icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
  color: var(--brand-primary);
}
.enc-empty-title {
  margin: 0;
  font-weight: 700;
  color: var(--cx-text);
}
.enc-empty-hint {
  margin: 6px 0 0;
  font-size: 0.88rem;
  color: var(--cx-muted);
  line-height: 1.4;
}
.enc-err {
  margin: 12px 0 0;
  color: var(--cx-danger);
  font-size: 0.9rem;
}
</style>
