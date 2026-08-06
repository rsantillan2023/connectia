<template>
  <div class="msp" :class="{ 'msp--compact': compact }" :style="brandStyle">
    <p v-if="label" class="msp-label">{{ label }}</p>
    <div class="msp-phone">
      <header class="msp-topbar">
        <span class="msp-icon" aria-hidden="true">←</span>
        <div class="msp-brand">
          <p class="msp-bar-title">{{ shortTitle }}</p>
          <p class="msp-bar-sub">Encuesta</p>
        </div>
        <span v-if="showProgressUi" class="msp-progress" aria-hidden="true">0/{{ questionCount }}</span>
        <span v-else class="msp-progress msp-progress--spacer" aria-hidden="true" />
      </header>

      <div class="msp-screen">
        <header class="msp-hero">
          <div v-if="hasMedia" class="msp-media">
            <div v-if="isCarousel" class="msp-cover msp-cover--carousel">
              <PostMediaCarousel
                :urls="mediaUrls"
                :alt="survey.titulo || 'Portada'"
                :autoplay="false"
              />
            </div>
            <template v-else>
              <div v-if="coverImages.length" class="msp-cover">
                <img :src="coverImages[0]" :alt="survey.titulo || 'Portada'" />
              </div>
              <video
                v-else-if="survey.videoUrl"
                class="msp-cover-video"
                :src="survey.videoUrl"
                controls
                playsinline
                preload="metadata"
              />
            </template>
          </div>
          <p v-if="survey.anonymous" class="msp-pill">Anónima</p>
          <h2>{{ survey.titulo || 'Sin título' }}</h2>
          <p v-if="survey.descripcion" class="msp-desc">{{ survey.descripcion }}</p>
          <p class="msp-meta">
            {{ questionCount }} pregunta{{ questionCount === 1 ? '' : 's' }}
            <template v-if="scheduleHint"> · {{ scheduleHint }}</template>
          </p>
        </header>

        <div v-if="showProgressUi" class="msp-progress-card">
          <div class="msp-progress-top">
            <span>{{ isStepFlow ? 'Pregunta 1 de ' + questionCount : 'Empezá a responder' }}</span>
            <span>{{ isStepFlow ? Math.round(100 / Math.max(questionCount, 1)) : 0 }}%</span>
          </div>
          <div class="msp-progress-track"><span :style="isStepFlow ? { width: `${Math.round(100 / Math.max(questionCount, 1))}%` } : undefined" /></div>
        </div>

        <article v-for="(q, idx) in previewQuestions" :key="q.id || idx" class="msp-q">
          <header class="msp-q-head">
            <span class="msp-q-num">{{ idx + 1 }}</span>
            <div>
              <p class="msp-q-label">
                {{ q.texto || 'Pregunta sin texto' }}
                <em v-if="q.required !== false">*</em>
              </p>
              <p class="msp-q-hint">
                <span>{{ q.required !== false ? 'Obligatoria' : 'Opcional' }}</span>
                <span v-if="q.grupo && q.grupo !== 'General'"> · {{ q.grupo }}</span>
                <span v-if="typeLabel(q.tipo)"> · {{ typeLabel(q.tipo) }}</span>
              </p>
            </div>
          </header>

          <figure v-if="q.imageUrl" class="msp-q-image">
            <img :src="q.imageUrl" :alt="`Imagen de la pregunta ${idx + 1}`" />
          </figure>

          <div v-if="q.tipo === 'rating'" class="msp-rating">
            <span v-for="n in 5" :key="n">{{ n }}</span>
          </div>
          <div v-else-if="q.tipo === 'yesno'" class="msp-choice-grid">
            <span>Sí</span>
            <span>No</span>
          </div>
          <div v-else-if="q.tipo === 'single' || q.tipo === 'multiple'" class="msp-choice-list">
            <span v-for="(o, oi) in opcionesOf(q)" :key="oi" class="msp-choice-row">
              <i :class="q.tipo === 'multiple' ? 'box' : 'dot'" aria-hidden="true" />
              {{ o }}
            </span>
            <p v-if="!opcionesOf(q).length" class="msp-empty-opts">Sin opciones definidas</p>
          </div>
          <div v-else-if="q.tipo === 'textarea'" class="msp-fake-input tall">Escribí tu respuesta…</div>
          <div v-else class="msp-fake-input">{{ placeholderFor(q.tipo) }}</div>
        </article>

        <p v-if="!questions.length" class="msp-empty">Agregá preguntas para ver el cuestionario.</p>
        <p v-else-if="isStepFlow && questions.length > 1" class="msp-empty">
          Modo una a una · se muestra la primera; el resto con Siguiente en la app.
        </p>
      </div>

      <div class="msp-sticky">
        <div v-if="showProgressUi" class="msp-sticky-meta">
          <div class="msp-sticky-bar"><span /></div>
          <span>{{ isStepFlow ? `1 de ${questionCount}` : `0 de ${questionCount}` }}</span>
        </div>
        <button v-if="isStepFlow && questionCount > 1" type="button" class="msp-submit" disabled>
          Siguiente
        </button>
        <button v-else type="button" class="msp-submit" disabled>Completar obligatorias</button>
      </div>
    </div>
    <p v-if="note" class="msp-note">{{ note }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { communityAppPreviewStyle } from '../utils/communityAppPreviewTheme'
import PostMediaCarousel from './PostMediaCarousel.vue'

const props = defineProps({
  survey: { type: Object, required: true },
  typeMeta: { type: Array, default: () => [] },
  label: { type: String, default: 'Así lo ve el miembro' },
  note: { type: String, default: 'Vista previa · no se pueden enviar respuestas desde acá' },
  compact: { type: Boolean, default: false },
})

const auth = useAuthStore()

const questions = computed(() => (Array.isArray(props.survey?.questions) ? props.survey.questions : []).filter((q) => q?.texto || q?.id))
const questionCount = computed(() => questions.value.length)
const isStepFlow = computed(() => props.survey?.questionFlow === 'one_by_one')
const showProgressUi = computed(() => props.survey?.showProgress !== false)
const previewQuestions = computed(() => {
  if (!isStepFlow.value) return questions.value
  return questions.value.slice(0, 1)
})

const coverImages = computed(() => {
  const s = props.survey || {}
  if (Array.isArray(s.imageUrls) && s.imageUrls.length) return s.imageUrls.filter(Boolean)
  if (s.imageUrl) return [s.imageUrl]
  return []
})
const mediaUrls = computed(() => {
  const urls = [...coverImages.value]
  const video = String(props.survey?.videoUrl || '').trim()
  if (video && !urls.includes(video)) urls.push(video)
  return urls
})
const isCarousel = computed(() => mediaUrls.value.length > 1)
const hasMedia = computed(() => mediaUrls.value.length > 0)

const shortTitle = computed(() => {
  const t = String(props.survey?.titulo || 'Encuesta').trim()
  return t.length > 28 ? `${t.slice(0, 26)}…` : t || 'Encuesta'
})

const scheduleHint = computed(() => {
  const ends = props.survey?.endsAt
  if (!ends) return ''
  try {
    return `Hasta ${new Date(ends).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`
  } catch {
    return ''
  }
})

const brandStyle = computed(() => communityAppPreviewStyle(auth.tenant))

function typeLabel(tipo) {
  const hit = props.typeMeta.find((t) => t.id === tipo)
  return hit?.label || ''
}

function opcionesOf(q) {
  if (Array.isArray(q.opciones) && q.opciones.length) return q.opciones.map(String)
  if (q.opcionesText) {
    return String(q.opcionesText)
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function placeholderFor(tipo) {
  if (tipo === 'number') return 'Escribí un número'
  if (tipo === 'email') return 'nombre@empresa.com'
  if (tipo === 'phone') return '+54 11 …'
  if (tipo === 'date') return 'Fecha'
  if (tipo === 'time') return 'Hora'
  if (tipo === 'datetime') return 'Fecha y hora'
  if (tipo === 'geopoint') return 'Hacer check-in (GPS)'
  return 'Escribí tu respuesta…'
}
</script>

<style scoped>
.msp {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.msp--compact {
  max-width: 320px;
}
.msp-label {
  align-self: stretch;
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-soft, var(--cx-muted));
}
.msp-phone {
  width: min(100%, 390px);
  border-radius: 28px;
  border: 1px solid var(--cx-border, var(--line));
  background: var(--cx-page, var(--panel));
  color: var(--cx-text, var(--ink));
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  max-height: min(720px, 78vh);
}
.msp--compact .msp-phone {
  width: 100%;
  max-width: 300px;
  border-radius: 20px;
  max-height: min(520px, 58vh);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
}
.msp--compact .msp-topbar {
  padding: 6px 8px;
}
.msp--compact .msp-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-size: 13px;
}
.msp--compact .msp-bar-title {
  font-size: 12px;
}
.msp--compact .msp-screen {
  padding: 10px;
}
.msp--compact .msp-cover,
.msp--compact .msp-media {
  margin-bottom: 8px;
  border-radius: 10px;
}
.msp--compact .msp-cover-track,
.msp--compact .msp-cover-video {
  border-radius: 10px;
}
.msp--compact .msp-hero h2 {
  font-size: 1.05rem;
}
.msp--compact .msp-q {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 12px;
}
.msp--compact .msp-sticky {
  padding: 8px 10px 10px;
}
.msp--compact .msp-submit {
  padding: 10px;
  font-size: 0.82rem;
  border-radius: 10px;
}
.msp--compact .msp-note {
  display: none;
}
.msp-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cx-border, var(--line));
  background: var(--cx-nav, var(--cx-surface, var(--panel)));
}
.msp-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--cx-text, var(--ink, #0f172a));
  font-size: 16px;
}
.msp-brand {
  flex: 1;
  min-width: 0;
}
.msp-bar-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cx-text, var(--ink));
}
.msp-bar-sub {
  margin: 2px 0 0;
  font-size: 10px;
  color: var(--cx-muted, var(--ink-soft, #64748b));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.msp-progress {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
}
.msp-progress--spacer {
  visibility: hidden;
  min-width: 2.5rem;
}
.msp-screen {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 14px 18px;
  background:
    radial-gradient(120% 60% at 10% -10%, var(--cx-page-glow-a, color-mix(in srgb, var(--brand-primary) 18%, transparent)), transparent 55%),
    radial-gradient(90% 50% at 100% 0%, var(--cx-page-glow-b, color-mix(in srgb, var(--brand-secondary) 12%, transparent)), transparent 50%),
    var(--cx-page, var(--panel-2, #f8fafc));
  color: var(--cx-text, var(--ink));
}
.msp-hero {
  margin-bottom: 12px;
}
.msp-media {
  margin: 0 0 12px;
}
.msp-cover-video {
  width: 100%;
  border-radius: 14px;
  aspect-ratio: 16 / 9;
  background: #0f172a;
  border: 1px solid var(--line, #e2e8f0);
}
.msp-cover {
  border-radius: 14px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #e2e8f0;
  border: 1px solid var(--line, #e2e8f0);
}
.msp-cover--carousel {
  min-height: 0;
}
.msp-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.msp-pill {
  display: inline-block;
  margin: 0 0 8px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.msp-hero h2 {
  margin: 0 0 6px;
  font-size: 1.25rem;
  line-height: 1.25;
  color: var(--ink, #0f172a);
}
.msp-desc {
  margin: 0 0 8px;
  font-size: 0.86rem;
  line-height: 1.4;
  color: var(--ink-soft, #64748b);
}
.msp-meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ink-soft, #64748b);
}
.msp-progress-card {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--panel, #fff);
}
.msp-progress-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}
.msp-progress-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink-soft, #94a3b8) 18%, transparent);
  overflow: hidden;
}
.msp-progress-track span {
  display: block;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
}
.msp-q {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--cx-border, var(--line, #e2e8f0));
  background: var(--cx-surface, var(--panel, #fff));
}
.msp-q-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.msp-q-num {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.msp-q-label {
  margin: 0;
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.35;
}
.msp-q-label em {
  color: var(--cx-danger, #dc2626);
  font-style: normal;
}
.msp-q-hint {
  margin: 3px 0 0;
  font-size: 0.68rem;
  color: var(--cx-muted, var(--ink-soft, #64748b));
}
.msp-q-image {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--panel-2, #f8fafc);
}
.msp-q-image img {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: cover;
}
.msp-rating {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.msp-rating span,
.msp-choice-grid span,
.msp-choice-row,
.msp-fake-input {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 10px;
  background: var(--panel-2, #f8fafc);
  color: var(--ink, #0f172a);
}
.msp-rating span {
  height: 36px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.85rem;
}
.msp-choice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.msp-choice-grid span {
  padding: 10px;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
}
.msp-choice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.msp-choice-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}
.msp-choice-row i {
  width: 16px;
  height: 16px;
  border: 2px solid #94a3b8;
  flex-shrink: 0;
}
.msp-choice-row i.dot {
  border-radius: 999px;
}
.msp-choice-row i.box {
  border-radius: 4px;
}
.msp-fake-input {
  padding: 10px 12px;
  font-size: 0.82rem;
  color: var(--ink-soft, #94a3b8);
}
.msp-fake-input.tall {
  min-height: 72px;
}
.msp-empty,
.msp-empty-opts {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--ink-soft, #64748b);
  text-align: center;
}
.msp-sticky {
  flex-shrink: 0;
  display: grid;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--cx-border, var(--line, #e2e8f0));
  background: var(--cx-surface, var(--panel, #fff));
}
.msp-sticky-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--cx-muted, var(--ink-soft, #64748b));
}
.msp-sticky-bar {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cx-muted, var(--ink-soft, #94a3b8)) 18%, transparent);
  overflow: hidden;
}
.msp-sticky-bar span {
  display: block;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
}
.msp-submit {
  border: 0;
  border-radius: 12px;
  padding: 12px;
  background: color-mix(in srgb, var(--brand-primary) 82%, #0f172a);
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
  opacity: 0.85;
  cursor: default;
}
.msp-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--ink-soft, #64748b);
  text-align: center;
}
</style>
