<template>
  <section class="encd">
    <header class="detail-bar">
      <button type="button" class="detail-back" aria-label="Volver" @click="goBack">
        <AppIcon name="back" :size="22" />
      </button>
      <div class="detail-bar-text">
        <p class="detail-bar-title">{{ barTitle }}</p>
        <p class="detail-bar-sub">{{ readOnly ? 'Tu respuesta' : 'Encuesta' }}</p>
      </div>
      <div v-if="!loading && survey && !readOnly" class="detail-progress-mini" aria-hidden="true">
        {{ answeredCount }}/{{ totalQuestions }}
      </div>
    </header>

    <form
      class="encd-shell"
      :class="{ 'is-readonly': readOnly, 'has-footer': !readOnly && survey }"
      @submit.prevent="submit"
    >
      <div ref="scrollEl" class="encd-scroll">
        <p v-if="error" class="encd-banner encd-banner--err" role="alert">{{ error }}</p>
        <p v-if="offlineHint" class="encd-banner encd-banner--ok">{{ offlineHint }}</p>

        <div v-if="loading" class="encd-skel" aria-busy="true" aria-label="Cargando encuesta">
          <div class="encd-skel-line lg" />
          <div class="encd-skel-line" />
          <div class="encd-skel-card" />
          <div class="encd-skel-card" />
        </div>

        <template v-else-if="survey">
          <header class="encd-hero">
            <div v-if="survey.imageUrl" class="encd-cover">
              <img :src="survey.imageUrl" :alt="survey.titulo || 'Portada de la encuesta'" />
            </div>
            <p v-if="survey.anonymous" class="encd-pill">Anónima</p>
            <h1>{{ survey.titulo }}</h1>
            <p v-if="survey.descripcion" class="encd-desc">{{ survey.descripcion }}</p>
            <div class="encd-meta">
              <span>{{ totalQuestions }} pregunta{{ totalQuestions === 1 ? '' : 's' }}</span>
              <span v-if="scheduleLine"> · {{ scheduleLine }}</span>
            </div>
          </header>

          <div v-if="readOnly" class="encd-banner encd-banner--ok">
            <strong>Respuesta enviada</strong>
            <span>{{ formatDate(myResponse.submittedAt) }} · solo lectura</span>
          </div>

          <div v-else class="encd-progress" role="status" :aria-label="progressLabel">
            <div class="encd-progress-top">
              <span>{{ progressLabel }}</span>
              <span>{{ progressPct }}%</span>
            </div>
            <div class="encd-progress-track">
              <div class="encd-progress-fill" :style="{ width: `${progressPct}%` }" />
            </div>
          </div>

          <fieldset :disabled="readOnly" class="encd-fieldset">
            <article
              v-for="(q, idx) in survey.questions"
              :key="q.id"
              :ref="(el) => setQuestionEl(q.id, el)"
              class="encd-q"
              :class="{
                'is-answered': isAnswered(q),
                'is-missing': missingIds.has(q.id),
              }"
            >
              <header class="encd-q-head">
                <span class="encd-q-num" aria-hidden="true">{{ idx + 1 }}</span>
                <div class="encd-q-title">
                  <p class="encd-label">
                    {{ q.texto }}
                    <em v-if="q.required && !readOnly" title="Obligatoria">*</em>
                  </p>
                  <p class="encd-q-hint">
                    <span v-if="q.required && !readOnly">Obligatoria</span>
                    <span v-else-if="!readOnly">Opcional</span>
                    <span v-if="q.grupo && q.grupo !== 'General'"> · {{ q.grupo }}</span>
                    <span v-if="q.tipo === 'multiple'"> · Podés elegir varias</span>
                  </p>
                </div>
              </header>

              <div v-if="q.tipo === 'rating'" class="encd-rating" role="group" :aria-label="q.texto">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="encd-rate-btn"
                  :class="{ on: answers[q.id] === n }"
                  :aria-pressed="answers[q.id] === n"
                  :tabindex="readOnly ? -1 : 0"
                  @click="setAnswer(q.id, n)"
                >
                  {{ n }}
                </button>
              </div>

              <div v-else-if="q.tipo === 'yesno'" class="encd-choice-grid encd-choice-grid--2" role="group">
                <button
                  type="button"
                  class="encd-choice"
                  :class="{ on: answers[q.id] === true }"
                  :aria-pressed="answers[q.id] === true"
                  @click="setAnswer(q.id, true)"
                >
                  Sí
                </button>
                <button
                  type="button"
                  class="encd-choice"
                  :class="{ on: answers[q.id] === false }"
                  :aria-pressed="answers[q.id] === false"
                  @click="setAnswer(q.id, false)"
                >
                  No
                </button>
              </div>

              <div v-else-if="q.tipo === 'single'" class="encd-choice-list" role="radiogroup" :aria-label="q.texto">
                <button
                  v-for="o in q.opciones"
                  :key="o"
                  type="button"
                  class="encd-choice encd-choice--row"
                  :class="{ on: answers[q.id] === o }"
                  role="radio"
                  :aria-checked="answers[q.id] === o"
                  @click="setAnswer(q.id, o)"
                >
                  <span class="encd-choice-dot" aria-hidden="true" />
                  <span>{{ o }}</span>
                </button>
              </div>

              <div v-else-if="q.tipo === 'multiple'" class="encd-choice-list" role="group" :aria-label="q.texto">
                <button
                  v-for="o in q.opciones"
                  :key="o"
                  type="button"
                  class="encd-choice encd-choice--row"
                  :class="{ on: (multi[q.id] || []).includes(o) }"
                  :aria-pressed="(multi[q.id] || []).includes(o)"
                  @click="toggleMulti(q.id, o)"
                >
                  <span class="encd-choice-box" aria-hidden="true" />
                  <span>{{ o }}</span>
                </button>
              </div>

              <input
                v-else-if="q.tipo === 'number'"
                v-model.number="answers[q.id]"
                type="number"
                class="encd-input"
                inputmode="decimal"
                placeholder="Escribí un número"
                @input="clearMissing(q.id)"
              />

              <input
                v-else-if="q.tipo === 'date'"
                v-model="answers[q.id]"
                type="date"
                class="encd-input"
                @change="clearMissing(q.id)"
              />

              <input
                v-else-if="q.tipo === 'time'"
                v-model="answers[q.id]"
                type="time"
                class="encd-input"
                @change="clearMissing(q.id)"
              />

              <input
                v-else-if="q.tipo === 'datetime'"
                v-model="answers[q.id]"
                type="datetime-local"
                class="encd-input"
                @change="clearMissing(q.id)"
              />

              <input
                v-else-if="q.tipo === 'email'"
                v-model="answers[q.id]"
                type="email"
                class="encd-input"
                autocomplete="email"
                placeholder="nombre@empresa.com"
                @input="clearMissing(q.id)"
              />

              <input
                v-else-if="q.tipo === 'phone'"
                v-model="answers[q.id]"
                type="tel"
                class="encd-input"
                autocomplete="tel"
                placeholder="+54 11 …"
                @input="clearMissing(q.id)"
              />

              <div v-else-if="q.tipo === 'geopoint'" class="encd-geo">
                <div v-if="answers[q.id]" class="encd-geo-ok">
                  <AppIcon name="check" :size="18" />
                  <div>
                    <strong>Ubicación capturada</strong>
                    <small>
                      {{ Number(answers[q.id].lat).toFixed(5) }},
                      {{ Number(answers[q.id].lng).toFixed(5) }}
                    </small>
                  </div>
                </div>
                <p v-else class="encd-muted">Todavía no capturaste tu ubicación.</p>
                <button
                  v-if="!readOnly"
                  type="button"
                  class="encd-geo-btn"
                  :disabled="geoLoading === q.id"
                  @click="captureGeo(q.id)"
                >
                  {{
                    geoLoading === q.id
                      ? 'Obteniendo GPS…'
                      : answers[q.id]
                        ? 'Volver a capturar'
                        : 'Hacer check-in (GPS)'
                  }}
                </button>
                <p v-if="geoError[q.id]" class="encd-field-err">{{ geoError[q.id] }}</p>
              </div>

              <textarea
                v-else-if="q.tipo === 'textarea'"
                v-model="answers[q.id]"
                rows="4"
                class="encd-input encd-textarea"
                placeholder="Escribí tu respuesta…"
                @input="clearMissing(q.id)"
              />

              <input
                v-else
                v-model="answers[q.id]"
                type="text"
                class="encd-input"
                placeholder="Escribí tu respuesta…"
                @input="clearMissing(q.id)"
              />

              <p v-if="missingIds.has(q.id)" class="encd-field-err">Completá esta pregunta para continuar</p>
            </article>
          </fieldset>
        </template>
      </div>

      <div v-if="!readOnly && survey" class="encd-sticky" aria-label="Enviar encuesta">
        <div class="encd-sticky-meta">
          <div class="encd-sticky-bar">
            <div class="encd-sticky-fill" :style="{ width: `${progressPct}%` }" />
          </div>
          <span>{{ answeredCount }} de {{ totalQuestions }}</span>
        </div>
        <button
          type="submit"
          class="encd-submit"
          :class="{ 'is-incomplete': !canSubmit }"
          :disabled="saving"
        >
          {{ saving ? 'Enviando…' : canSubmit ? 'Enviar respuestas' : 'Completar obligatorias' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'
import {
  enqueueSurveyResponse,
  flushSurveyQueue,
  startSurveyOfflineFlush,
} from '../composables/useSurveyOfflineQueue'

const route = useRoute()
const router = useRouter()
const survey = ref(null)
const myResponse = ref(null)
const answers = reactive({})
const multi = reactive({})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const offlineHint = ref('')
const geoLoading = ref('')
const geoError = reactive({})
const missingIds = ref(new Set())
const questionEls = {}
const scrollEl = ref(null)
let stopFlush = null

const readOnly = computed(() => Boolean(myResponse.value))

const barTitle = computed(() => {
  const t = String(survey.value?.titulo || '').trim()
  if (!t) return 'Encuesta'
  return t.length > 42 ? `${t.slice(0, 40)}…` : t
})

const totalQuestions = computed(() => survey.value?.questions?.length || 0)

const answeredCount = computed(() => {
  const qs = survey.value?.questions || []
  return qs.filter((q) => isAnswered(q)).length
})

const progressPct = computed(() => {
  if (!totalQuestions.value) return 0
  return Math.round((answeredCount.value / totalQuestions.value) * 100)
})

const progressLabel = computed(() => {
  if (!answeredCount.value) return 'Empezá a responder'
  if (answeredCount.value >= totalQuestions.value) return 'Listo para enviar'
  return `${answeredCount.value} de ${totalQuestions.value} respondidas`
})

const requiredMissing = computed(() => {
  const qs = survey.value?.questions || []
  return qs.filter((q) => q.required !== false && !isAnswered(q))
})

const canSubmit = computed(() => requiredMissing.value.length === 0)

const scheduleLine = computed(() => {
  const s = survey.value
  if (!s?.endsAt) return ''
  try {
    return `Disponible hasta ${new Date(s.endsAt).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } catch {
    return ''
  }
})

function setQuestionEl(id, el) {
  if (el) questionEls[id] = el
  else delete questionEls[id]
}

function isEmpty(val) {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)
}

function isAnswered(q) {
  if (q.tipo === 'multiple') return !isEmpty(multi[q.id])
  if (q.tipo === 'yesno') return answers[q.id] === true || answers[q.id] === false
  return !isEmpty(answers[q.id])
}

function clearMissing(qid) {
  if (!missingIds.value.has(qid)) return
  const next = new Set(missingIds.value)
  next.delete(qid)
  missingIds.value = next
}

function setAnswer(qid, value) {
  if (readOnly.value) return
  answers[qid] = value
  clearMissing(qid)
}

function toggleMulti(qid, option) {
  if (readOnly.value) return
  const cur = Array.isArray(multi[qid]) ? [...multi[qid]] : []
  const i = cur.indexOf(option)
  if (i >= 0) cur.splice(i, 1)
  else cur.push(option)
  multi[qid] = cur
  clearMissing(qid)
}

function goBack() {
  if ((window.history.state?.position ?? 0) > 0) {
    router.back()
    return
  }
  router.replace({ name: 'encuestas' })
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString('es-AR')
  } catch {
    return ''
  }
}

function toDatetimeLocal(val) {
  if (val == null || val === '') return ''
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16)
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return s
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hydrateAnswers(questions, response) {
  const byId = new Map((response?.answers || []).map((a) => [String(a.questionId), a.value]))
  for (const q of questions || []) {
    const val = byId.get(String(q.id))
    if (q.tipo === 'multiple') {
      multi[q.id] = Array.isArray(val) ? [...val] : []
      continue
    }
    if (val === undefined || val === null) continue
    if (q.tipo === 'datetime') {
      answers[q.id] = toDatetimeLocal(val)
      continue
    }
    if (q.tipo === 'rating' || q.tipo === 'number') {
      answers[q.id] = Number(val)
      continue
    }
    answers[q.id] = val
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/surveys/${route.params.id}`)
    survey.value = data.survey
    myResponse.value = data.myResponse
    for (const key of Object.keys(answers)) delete answers[key]
    for (const key of Object.keys(multi)) delete multi[key]
    for (const q of data.survey?.questions || []) {
      if (q.tipo === 'multiple') multi[q.id] = []
    }
    if (data.myResponse) hydrateAnswers(data.survey?.questions, data.myResponse)
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function captureGeo(qid) {
  geoError[qid] = ''
  if (!navigator.geolocation) {
    geoError[qid] = 'Este dispositivo no soporta GPS'
    return
  }
  geoLoading.value = qid
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      })
    })
    answers[qid] = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      capturedAt: new Date().toISOString(),
      source: 'geolocation',
    }
    clearMissing(qid)
  } catch (e) {
    geoError[qid] = e?.message || 'No se pudo obtener la ubicación'
  } finally {
    geoLoading.value = ''
  }
}

async function submit() {
  if (readOnly.value) return
  error.value = ''
  offlineHint.value = ''

  const missing = requiredMissing.value
  if (missing.length) {
    missingIds.value = new Set(missing.map((q) => q.id))
    error.value =
      missing.length === 1
        ? 'Falta completar 1 pregunta obligatoria.'
        : `Faltan completar ${missing.length} preguntas obligatorias.`
    const first = questionEls[missing[0].id]
    first?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }

  saving.value = true
  const payload = (survey.value.questions || []).map((q) => ({
    questionId: q.id,
    value: q.tipo === 'multiple' ? multi[q.id] || [] : answers[q.id],
  }))
  try {
    await api.post(`/surveys/${route.params.id}/respond`, { answers: payload })
    await load()
    scrollEl.value?.scrollTo?.({ top: 0, behavior: 'smooth' })
    if (route.query.from === 'bienvenida') {
      setTimeout(() => router.push({ name: 'bienvenida' }), 600)
    }
  } catch (e) {
    const offline = !navigator.onLine || !e?.response
    if (offline) {
      enqueueSurveyResponse({
        surveyId: String(route.params.id),
        userKey: 'me',
        answers: payload,
      })
      offlineHint.value =
        'Sin conexión: guardamos tu respuesta y la enviaremos automáticamente cuando vuelvas a estar online.'
      myResponse.value = { submittedAt: new Date().toISOString(), pendingSync: true }
    } else {
      error.value = e.response?.data?.error || e.message
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  stopFlush = startSurveyOfflineFlush(api)
  await flushSurveyQueue(api)
  await load()
})

onUnmounted(() => {
  if (stopFlush) stopFlush()
})
</script>

<style scoped>
.encd {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
  background:
    radial-gradient(120% 60% at 10% -10%, var(--cx-page-glow-a), transparent 55%),
    radial-gradient(90% 50% at 100% 0%, var(--cx-page-glow-b), transparent 50%),
    var(--cx-page);
}

.detail-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cx-border);
  background: var(--cx-surface);
  z-index: 5;
}
.detail-back {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--cx-text);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.detail-back:active {
  background: color-mix(in srgb, var(--cx-text) 8%, transparent);
}
.detail-bar-text {
  min-width: 0;
  flex: 1;
}
.detail-bar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cx-text);
}
.detail-bar-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--cx-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.detail-progress-mini {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary) 14%, transparent);
  color: var(--brand-primary);
}

.encd-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
}

.encd-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  padding: 16px 16px 24px;
}

.encd-hero {
  margin-bottom: 14px;
}
.encd-cover {
  margin: 0 0 14px;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: color-mix(in srgb, var(--cx-muted) 12%, transparent);
  border: 1px solid var(--cx-border);
}
.encd-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.encd-pill {
  display: inline-block;
  margin: 0 0 8px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.encd-hero h1 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.4rem;
  line-height: 1.25;
  color: var(--cx-text);
}
.encd-desc {
  margin: 0 0 10px;
  color: var(--cx-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}
.encd-meta {
  font-size: 0.8rem;
  color: var(--cx-muted);
}

.encd-progress {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
}
.encd-progress-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--cx-text);
}
.encd-progress-track {
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cx-muted) 16%, transparent);
  overflow: hidden;
}
.encd-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
  transition: width 0.25s ease;
}

.encd-banner {
  display: grid;
  gap: 2px;
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.35;
}
.encd-banner strong {
  font-size: 0.92rem;
}
.encd-banner--ok {
  background: color-mix(in srgb, var(--cx-ok) 12%, transparent);
  color: var(--cx-ok);
  border: 1px solid color-mix(in srgb, var(--cx-ok) 25%, transparent);
}
.encd-banner--err {
  background: color-mix(in srgb, var(--cx-danger) 10%, transparent);
  color: var(--cx-danger);
  border: 1px solid color-mix(in srgb, var(--cx-danger) 22%, transparent);
}

.encd-fieldset {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.encd-q {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.encd-q.is-answered {
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--cx-border));
}
.encd-q.is-missing {
  border-color: color-mix(in srgb, var(--cx-danger) 55%, var(--cx-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cx-danger) 12%, transparent);
}
.encd-q-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.encd-q-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.encd-q.is-answered .encd-q-num {
  background: var(--brand-primary);
  color: #fff;
}
.encd-q-title {
  min-width: 0;
  flex: 1;
}
.encd-label {
  margin: 0;
  font-weight: 700;
  font-size: 0.98rem;
  line-height: 1.35;
  color: var(--cx-text);
}
.encd-label em {
  color: var(--cx-danger);
  font-style: normal;
}
.encd-q-hint {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--cx-muted);
}

.encd-rating {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.encd-rate-btn {
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: var(--cx-input);
  color: var(--cx-text);
  cursor: pointer;
  font-weight: 800;
  font-size: 0.95rem;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
.encd-rate-btn:active {
  transform: scale(0.96);
}
.encd-rate-btn.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: transparent;
}

.encd-choice-grid {
  display: grid;
  gap: 8px;
}
.encd-choice-grid--2 {
  grid-template-columns: 1fr 1fr;
}
.encd-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.encd-choice {
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--cx-input);
  color: var(--cx-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
.encd-choice:active {
  transform: scale(0.985);
}
.encd-choice--row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}
.encd-choice.on {
  border-color: color-mix(in srgb, var(--brand-primary) 55%, transparent);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
}
.encd-choice-dot,
.encd-choice-box {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 2px solid color-mix(in srgb, var(--cx-muted) 55%, transparent);
  background: transparent;
}
.encd-choice-dot {
  border-radius: 999px;
}
.encd-choice-box {
  border-radius: 5px;
}
.encd-choice.on .encd-choice-dot,
.encd-choice.on .encd-choice-box {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  box-shadow: inset 0 0 0 3px var(--cx-surface);
}

.encd-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  background: var(--cx-input);
  color: var(--cx-text);
}
.encd-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--brand-primary) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 16%, transparent);
}
.encd-textarea {
  resize: vertical;
  min-height: 96px;
}

.encd-geo {
  display: grid;
  gap: 10px;
}
.encd-geo-ok {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cx-ok) 12%, transparent);
  color: var(--cx-ok);
}
.encd-geo-ok strong {
  display: block;
  font-size: 0.88rem;
}
.encd-geo-ok small {
  display: block;
  margin-top: 2px;
  opacity: 0.85;
  font-size: 0.75rem;
}
.encd-geo-btn {
  border: 1px solid color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  border-radius: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--brand-primary) 8%, transparent);
  color: var(--brand-primary);
  font-weight: 700;
  cursor: pointer;
}
.encd-geo-btn:disabled {
  opacity: 0.6;
}

.encd-field-err {
  margin: 0;
  font-size: 0.78rem;
  color: var(--cx-danger);
  font-weight: 600;
}
.encd-muted {
  margin: 0;
  color: var(--cx-muted);
  font-size: 0.88rem;
}

.encd-shell.is-readonly .encd-rate-btn,
.encd-shell.is-readonly .encd-choice {
  cursor: default;
  pointer-events: none;
}
.encd-shell.is-readonly .encd-input {
  background: var(--cx-surface-2);
  color: var(--cx-text);
}

.encd-sticky {
  flex-shrink: 0;
  display: grid;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--cx-surface);
  border-top: 1px solid var(--cx-border);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06);
}
.encd-sticky-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cx-muted);
}
.encd-sticky-bar {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cx-muted) 16%, transparent);
  overflow: hidden;
}
.encd-sticky-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--brand-primary);
  transition: width 0.25s ease;
}
.encd-submit {
  border: 0;
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--brand-primary);
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease, filter 0.15s ease;
}
.encd-submit:disabled {
  opacity: 0.65;
}
.encd-submit:active:not(:disabled) {
  transform: scale(0.985);
}
.encd-submit.is-incomplete {
  filter: saturate(0.85);
  background: color-mix(in srgb, var(--brand-primary) 82%, #0f172a);
}

.encd-skel {
  display: grid;
  gap: 12px;
}
.encd-skel-line,
.encd-skel-card {
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 0%,
    color-mix(in srgb, var(--cx-muted) 14%, transparent) 50%,
    color-mix(in srgb, var(--cx-muted) 8%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: encd-shimmer 1.2s ease-in-out infinite;
}
.encd-skel-line {
  height: 18px;
  width: 70%;
}
.encd-skel-line.lg {
  height: 28px;
  width: 90%;
}
.encd-skel-card {
  height: 120px;
  border-radius: 16px;
}
@keyframes encd-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

</style>
