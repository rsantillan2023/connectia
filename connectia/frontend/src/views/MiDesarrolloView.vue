<template>
  <section class="dev">
    <header class="dev-head">
      <h1>Mi desarrollo</h1>
      <p>Objetivos, desempeño, carrera, aprendizaje y vacantes internas.</p>
    </header>

    <p v-if="moduleDisabled" class="err" role="alert">Módulo no habilitado</p>
    <template v-else>
      <div v-if="visibleTabs.length" class="dev-tabs" role="tablist">
        <button
          v-for="t in visibleTabs"
          :key="t.id"
          type="button"
          role="tab"
          :class="{ on: tab === t.id }"
          @click="setTab(t.id)"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="okMsg" class="ok">{{ okMsg }}</p>
      <p v-if="loading" class="muted">Cargando…</p>

      <!-- OKRs -->
      <div v-if="!loading && tab === 'okr'" class="dev-panel">
        <ul v-if="okrs.length" class="dev-list">
          <li v-for="o in okrs" :key="o.id" class="card">
            <button type="button" class="card-head" @click="toggleOkr(o.id)">
              <div>
                <strong>{{ o.titulo }}</strong>
                <span class="pill">{{ o.status }}</span>
              </div>
              <div class="prog-wrap">
                <div class="prog-bar"><span :style="{ width: `${o.progress || 0}%` }" /></div>
                <em>{{ Math.round(o.progress || 0) }}%</em>
              </div>
            </button>
            <div v-if="expandedOkr === o.id" class="card-body">
              <div v-for="(kr, i) in o.editKrs" :key="i" class="kr-row">
                <span>{{ kr.titulo }}</span>
                <input v-model.number="kr.current" type="number" class="input-sm" :placeholder="`/${kr.target}`" />
                <small>/ {{ kr.target }} {{ kr.unit || '%' }}</small>
              </div>
              <label>Nota del avance
                <textarea v-model="o.editNote" class="input" rows="2" />
              </label>
              <button type="button" class="btn" :disabled="saving" @click="saveOkr(o)">
                {{ saving ? 'Guardando…' : 'Guardar avance' }}
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="muted center">No tenés OKRs asignados.</p>
      </div>

      <!-- Desempeño -->
      <div v-if="!loading && tab === 'desempeno'" class="dev-panel">
        <h2 class="sub">Mis evaluaciones</h2>
        <ul v-if="reviews.length" class="dev-list">
          <li v-for="r in reviews" :key="r.id" class="card flat">
            <strong>{{ r.subjectName || 'Evaluación' }}</strong>
            <p class="meta">{{ r.reviewerName }} · {{ r.reviewType }} · {{ r.status }}</p>
            <p v-if="r.rating" class="meta">Calificación: {{ r.rating }}/5</p>
            <p v-if="r.comments">{{ r.comments }}</p>
          </li>
        </ul>
        <p v-else class="muted">Sin evaluaciones aún.</p>

        <form class="card form" @submit.prevent="submitFeedback">
          <h2 class="sub">Feedback continuo</h2>
          <PersonPicker
            v-model="fb.subjectId"
            v-model:selected-label="fb.subjectName"
            endpoint="/talent/people"
            label="Colaborador"
            placeholder="Buscar persona…"
          />
          <label>Comentarios
            <textarea v-model="fb.comments" class="input" rows="3" required />
          </label>
          <label>Calificación (1–5)
            <input v-model.number="fb.rating" type="number" min="1" max="5" class="input" />
          </label>
          <label>Fortalezas
            <textarea v-model="fb.strengths" class="input" rows="2" />
          </label>
          <label>Oportunidades de mejora
            <textarea v-model="fb.improvements" class="input" rows="2" />
          </label>
          <button type="submit" class="btn" :disabled="saving || !fb.subjectId">Enviar feedback</button>
        </form>
      </div>

      <!-- Carrera -->
      <div v-if="!loading && tab === 'carrera' && career" class="dev-panel">
        <div class="card">
          <p><strong>Rol actual:</strong> {{ career.currentRole || '—' }}</p>
          <p><strong>Objetivo:</strong> {{ career.targetRole || '—' }}</p>
          <div v-if="career.skillGaps?.length" class="gaps">
            <strong>Brechas de habilidades</strong>
            <span v-for="g in career.skillGaps" :key="g" class="tag">{{ g }}</span>
          </div>
          <p v-if="career.notes" class="muted">{{ career.notes }}</p>
        </div>
        <h2 class="sub">Hitos</h2>
        <ul class="dev-list">
          <li v-for="m in career.milestones" :key="m.id" class="card flat check-row">
            <label>
              <input v-model="m.done" type="checkbox" @change="saveMilestones" />
              {{ m.titulo }}
            </label>
            <small v-if="m.dueAt">{{ fmtDate(m.dueAt) }}</small>
          </li>
        </ul>
        <p v-if="!career.milestones?.length" class="muted">Sin hitos definidos.</p>
      </div>

      <!-- Aprendizaje -->
      <div v-if="!loading && tab === 'lms'" class="dev-panel">
        <ul v-if="courses.length" class="dev-list">
          <li v-for="c in courses" :key="c.id" class="card">
            <button type="button" class="card-head" @click="openCourse(c.id)">
              <div>
                <strong>{{ c.titulo }}</strong>
                <p class="meta">{{ c.category }} · {{ c.durationMinutes }} min</p>
              </div>
              <div class="prog-wrap">
                <div class="prog-bar"><span :style="{ width: `${c.enrollment?.progress || 0}%` }" /></div>
                <em>{{ c.enrollment?.progress || 0 }}%</em>
              </div>
            </button>
          </li>
        </ul>
        <p v-else class="muted center">No hay cursos disponibles.</p>
      </div>

      <!-- Vacantes -->
      <div v-if="!loading && tab === 'vacantes'" class="dev-panel">
        <h2 class="sub">Vacantes abiertas</h2>
        <ul v-if="vacancies.length" class="dev-list">
          <li v-for="v in vacancies" :key="v.id" class="card">
            <strong>{{ v.titulo }}</strong>
            <p class="meta">{{ v.area }} · {{ v.ubicacion }}</p>
            <p v-if="v.descripcion" class="desc">{{ v.descripcion }}</p>
            <label>Carta de presentación
              <textarea v-model="applyLetters[v.id]" class="input" rows="3" />
            </label>
            <button type="button" class="btn" :disabled="saving" @click="applyVacancy(v.id)">Postularme</button>
          </li>
        </ul>
        <p v-else class="muted">No hay vacantes abiertas.</p>

        <h2 class="sub">Mis postulaciones</h2>
        <ul v-if="applications.length" class="dev-list">
          <li v-for="a in applications" :key="a.id" class="card flat">
            <strong>{{ vacancyTitle(a.vacancyId) }}</strong>
            <span class="pill">{{ a.status }}</span>
            <p class="meta">{{ fmtDate(a.createdAt) }}</p>
          </li>
        </ul>
        <p v-else class="muted">Sin postulaciones.</p>
      </div>
    </template>

    <!-- Sheet curso -->
    <div v-if="courseDetail" class="sheet" @click.self="courseDetail = null">
      <div class="sheet-panel">
        <header class="sheet-head">
          <h2>{{ courseDetail.course.titulo }}</h2>
          <button type="button" class="btn-ghost" @click="courseDetail = null">Cerrar</button>
        </header>
        <div v-if="courseDetail.course.contentHtml" class="html" v-html="courseDetail.course.contentHtml" />
        <p v-else-if="courseDetail.course.descripcion">{{ courseDetail.course.descripcion }}</p>

        <label>Progreso {{ courseProgress }}%
          <input v-model.number="courseProgress" type="range" min="0" max="100" class="range" />
        </label>

        <div v-if="courseDetail.course.quiz?.length" class="quiz">
          <h3>Cuestionario</h3>
          <div v-for="(q, qi) in courseDetail.course.quiz" :key="qi" class="q-block">
            <p>{{ q.pregunta }}</p>
            <label v-for="(opt, oi) in q.opciones" :key="oi" class="radio">
              <input v-model="quizAnswers[qi]" type="radio" :value="oi" /> {{ opt }}
            </label>
          </div>
        </div>

        <button type="button" class="btn" :disabled="saving" @click="saveCourseProgress">
          {{ saving ? 'Guardando…' : 'Registrar avance' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import PersonPicker from '../components/PersonPicker.vue'

const caps = ref({ okr: false, desempeno: false, carrera: false, lms: false, vacantes: false })
const moduleDisabled = ref(false)
const tab = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')

const okrs = ref([])
const expandedOkr = ref(null)
const reviews = ref([])
const fb = ref({ subjectId: '', subjectName: '', comments: '', rating: null, strengths: '', improvements: '' })
const career = ref(null)
const courses = ref([])
const vacancies = ref([])
const applications = ref([])
const applyLetters = ref({})
const courseDetail = ref(null)
const courseProgress = ref(0)
const quizAnswers = ref({})

const TAB_DEF = [
  { id: 'okr', cap: 'okr', label: 'OKRs' },
  { id: 'desempeno', cap: 'desempeno', label: 'Desempeño' },
  { id: 'carrera', cap: 'carrera', label: 'Carrera' },
  { id: 'lms', cap: 'lms', label: 'Aprendizaje' },
  { id: 'vacantes', cap: 'vacantes', label: 'Vacantes' },
]

const visibleTabs = computed(() => TAB_DEF.filter((t) => caps.value[t.cap]))

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return '' }
}

function vacancyTitle(id) {
  return vacancies.value.find((v) => v.id === id)?.titulo || `Vacante ${id?.slice(-6) || ''}`
}

function handleErr(e, fallback) {
  if (e.response?.status === 403) {
    error.value = 'Módulo no habilitado'
    return true
  }
  error.value = e.response?.data?.error || fallback
  return false
}

async function loadMeta() {
  try {
    const { data } = await api.get('/talent/meta')
    caps.value = data.capabilities || {}
    moduleDisabled.value = false
    const first = visibleTabs.value[0]
    if (first && !tab.value) tab.value = first.id
  } catch (e) {
    if (e.response?.status === 403) {
      moduleDisabled.value = true
      error.value = 'Módulo no habilitado'
    } else {
      error.value = e.response?.data?.error || 'No se pudo cargar el módulo'
    }
  }
}

async function loadTabData() {
  if (moduleDisabled.value || !tab.value) return
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    if (tab.value === 'okr') {
      const { data } = await api.get('/talent/okrs')
      okrs.value = (data.items || []).map((o) => ({
        ...o,
        editKrs: (o.keyResults || []).map((kr) => ({ ...kr })),
        editNote: '',
      }))
    } else if (tab.value === 'desempeno') {
      const { data } = await api.get('/talent/reviews')
      reviews.value = data.items || []
    } else if (tab.value === 'carrera') {
      const { data } = await api.get('/talent/career')
      career.value = data.plan || null
    } else if (tab.value === 'lms') {
      const { data } = await api.get('/talent/courses')
      courses.value = data.items || []
    } else if (tab.value === 'vacantes') {
      const [v, a] = await Promise.all([
        api.get('/talent/vacancies'),
        api.get('/talent/applications/mine'),
      ])
      vacancies.value = v.data.items || []
      applications.value = a.data.items || []
    }
  } catch (e) {
    handleErr(e, 'Error al cargar datos')
  } finally {
    loading.value = false
  }
}

function setTab(id) {
  tab.value = id
  loadTabData()
}

function toggleOkr(id) {
  expandedOkr.value = expandedOkr.value === id ? null : id
}

async function saveOkr(o) {
  saving.value = true
  error.value = ''
  try {
    await api.patch(`/talent/okrs/${o.id}/progress`, {
      keyResults: o.editKrs.map((kr) => ({ titulo: kr.titulo, current: kr.current, target: kr.target })),
      note: o.editNote,
    })
    okMsg.value = 'Avance guardado'
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}

async function submitFeedback() {
  if (!fb.value.subjectId) {
    error.value = 'Elegí un colaborador'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await api.post('/talent/reviews/continuous', {
      subjectId: fb.value.subjectId,
      comments: fb.value.comments.trim(),
      rating: fb.value.rating || undefined,
      strengths: fb.value.strengths.trim(),
      improvements: fb.value.improvements.trim(),
    })
    okMsg.value = 'Feedback enviado'
    fb.value = { subjectId: '', subjectName: '', comments: '', rating: null, strengths: '', improvements: '' }
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo enviar')
  } finally {
    saving.value = false
  }
}

async function saveMilestones() {
  if (!career.value) return
  saving.value = true
  try {
    await api.patch('/talent/career', {
      milestones: career.value.milestones.map((m) => ({ id: m.id, done: m.done })),
    })
    okMsg.value = 'Hitos actualizados'
  } catch (e) {
    handleErr(e, 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}

async function openCourse(id) {
  error.value = ''
  try {
    const { data } = await api.get(`/talent/courses/${id}`)
    courseDetail.value = data
    courseProgress.value = data.enrollment?.progress || 0
    quizAnswers.value = {}
  } catch (e) {
    handleErr(e, 'No se pudo abrir el curso')
  }
}

async function saveCourseProgress() {
  if (!courseDetail.value) return
  saving.value = true
  try {
    const payload = { progress: courseProgress.value }
    const quiz = courseDetail.value.course.quiz
    if (quiz?.length && Object.keys(quizAnswers.value).length === quiz.length) {
      payload.answers = quiz.map((_, i) => ({ value: quizAnswers.value[i] }))
    }
    await api.post(`/talent/courses/${courseDetail.value.course.id}/progress`, payload)
    okMsg.value = 'Progreso registrado'
    courseDetail.value = null
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo registrar')
  } finally {
    saving.value = false
  }
}

async function applyVacancy(id) {
  saving.value = true
  try {
    await api.post(`/talent/vacancies/${id}/apply`, {
      coverLetter: applyLetters.value[id] || '',
    })
    okMsg.value = 'Postulación enviada'
    applyLetters.value[id] = ''
    const { data } = await api.get('/talent/applications/mine')
    applications.value = data.items || []
  } catch (e) {
    handleErr(e, 'No se pudo postular')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadMeta()
  if (!moduleDisabled.value) await loadTabData()
  else loading.value = false
})
</script>

<style scoped>
.dev { padding: 16px 16px 88px; max-width: 720px; margin: 0 auto; }
.dev-head h1 { margin: 0 0 4px; font-size: 1.45rem; }
.dev-head p { margin: 0; color: #64748b; font-size: 0.92rem; }
.dev-tabs { display: flex; gap: 6px; overflow-x: auto; margin: 14px 0 12px; padding-bottom: 4px; }
.dev-tabs button { flex-shrink: 0; border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 8px 14px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.dev-tabs button.on { background: #0f766e; color: #fff; border-color: transparent; }
.dev-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.card { border: 1px solid #e2e8f0; background: #fff; border-radius: 14px; padding: 14px; }
.card.flat { display: grid; gap: 4px; }
.card-head { width: 100%; text-align: left; border: none; background: none; padding: 0; cursor: pointer; }
.card-body { margin-top: 12px; display: grid; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
.prog-wrap { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.prog-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.prog-bar span { display: block; height: 100%; background: #0f766e; border-radius: 999px; }
.prog-wrap em { font-size: 0.8rem; color: #64748b; font-style: normal; min-width: 36px; }
.pill { font-size: 0.72rem; font-weight: 700; border-radius: 999px; padding: 3px 8px; background: #e2e8f0; margin-left: 6px; }
.meta { margin: 4px 0 0; color: #64748b; font-size: 0.85rem; }
.desc { font-size: 0.88rem; margin: 8px 0; }
.sub { font-size: 1rem; margin: 16px 0 8px; }
.form { display: grid; gap: 10px; margin-top: 16px; }
.input { width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; font: inherit; margin-top: 4px; }
.input-sm { width: 72px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; }
.kr-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.9rem; }
.gaps { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tag { background: #ecfdf5; color: #065f46; font-size: 0.78rem; padding: 4px 8px; border-radius: 999px; }
.check-row label { display: flex; gap: 8px; align-items: center; font-weight: 500; }
.btn { border: none; background: #0f766e; color: #fff; border-radius: 12px; padding: 10px 14px; font-weight: 600; cursor: pointer; justify-self: start; }
.btn-ghost { border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 6px 12px; cursor: pointer; }
.sheet { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 40; display: grid; place-items: end center; padding: 12px; }
.sheet-panel { width: min(720px, 100%); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; display: grid; gap: 12px; }
.sheet-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.sheet-head h2 { margin: 0; font-size: 1.1rem; }
.html :deep(p) { margin: 0 0 8px; font-size: 0.92rem; }
.range { width: 100%; margin-top: 6px; }
.quiz { border-top: 1px solid #e2e8f0; padding-top: 10px; }
.q-block { margin-bottom: 12px; }
.radio { display: flex; gap: 8px; align-items: center; font-weight: 400; margin: 4px 0; }
.err { color: #b91c1c; }
.ok { color: #065f46; }
.muted { color: #64748b; }
.center { text-align: center; margin-top: 24px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
</style>
