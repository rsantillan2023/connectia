/**
 * Helpers puros §38 Talento — testeables sin Mongo.
 */

export const TALENT_CAPS = [
  'talento',
  'talento.okr',
  'talento.desempeno',
  'talento.carrera',
  'talento.lms',
  'talento.vacantes',
]

export const VACANCY_STATUSES = ['draft', 'open', 'closed', 'filled']
export const APPLICATION_STATUSES = [
  'submitted',
  'reviewing',
  'interview',
  'accepted',
  'rejected',
  'withdrawn',
]
export const REVIEW_TYPES = ['self', 'leader', 'peer']
export const OKR_STATUSES = ['draft', 'active', 'completed', 'cancelled']

export function displayName(user) {
  if (!user) return ''
  return [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario || ''
}

/**
 * Progress % from key results (average of current/target capped 0–100).
 * @param {{ target?: number, current?: number }[]} keyResults
 */
export function computeOkrProgress(keyResults) {
  const list = Array.isArray(keyResults) ? keyResults : []
  if (!list.length) return 0
  let sum = 0
  for (const kr of list) {
    const target = Number(kr.target) || 0
    const current = Number(kr.current) || 0
    if (target <= 0) {
      sum += Math.min(100, Math.max(0, current))
    } else {
      sum += Math.min(100, Math.max(0, (current / target) * 100))
    }
  }
  return Math.round(sum / list.length)
}

export function normalizeKeyResults(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 20)
    .map((kr) => ({
      titulo: String(kr?.titulo || '').trim().slice(0, 200),
      target: Math.max(0, Number(kr?.target) || 100),
      current: Math.max(0, Number(kr?.current) || 0),
      unit: String(kr?.unit || '%').trim().slice(0, 40) || '%',
    }))
    .filter((kr) => kr.titulo)
}

export function serializeOkrCycle(c) {
  return {
    id: String(c._id),
    nombre: c.nombre,
    descripcion: c.descripcion || '',
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export function serializeOkr(o) {
  const keyResults = (o.keyResults || []).map((kr) => ({
    id: kr._id ? String(kr._id) : undefined,
    titulo: kr.titulo,
    target: kr.target,
    current: kr.current,
    unit: kr.unit || '%',
  }))
  const progress =
    o.progress != null && o.progress !== ''
      ? Number(o.progress)
      : computeOkrProgress(keyResults)
  return {
    id: String(o._id),
    cycleId: o.cycleId ? String(o.cycleId) : null,
    ownerId: o.ownerId ? String(o.ownerId) : null,
    ownerName: o.ownerName || '',
    titulo: o.titulo,
    descripcion: o.descripcion || '',
    keyResults,
    progress,
    status: o.status,
    progressLog: (o.progressLog || []).slice(-10).map((l) => ({
      at: l.at,
      progress: l.progress,
      note: l.note || '',
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

export function serializePerformanceCycle(c) {
  return {
    id: String(c._id),
    nombre: c.nombre,
    descripcion: c.descripcion || '',
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    allowSelf: c.allowSelf !== false,
    allowLeader: c.allowLeader !== false,
    allowPeer: Boolean(c.allowPeer),
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export function serializeReview(r, { includeSubject = true } = {}) {
  return {
    id: String(r._id),
    cycleId: r.cycleId ? String(r.cycleId) : null,
    kind: r.kind || 'formal',
    subjectId: includeSubject && r.subjectId ? String(r.subjectId) : undefined,
    subjectName: includeSubject ? r.subjectName || '' : undefined,
    reviewerId: r.reviewerId ? String(r.reviewerId) : null,
    reviewerName: r.reviewerName || '',
    reviewType: r.reviewType,
    rating: r.rating,
    strengths: r.strengths || '',
    improvements: r.improvements || '',
    comments: r.comments || '',
    status: r.status,
    submittedAt: r.submittedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export function serializeCareerPlan(p) {
  return {
    id: String(p._id),
    userId: p.userId ? String(p.userId) : null,
    userName: p.userName || '',
    currentRole: p.currentRole || '',
    targetRole: p.targetRole || '',
    skillGaps: p.skillGaps || [],
    milestones: (p.milestones || []).map((m) => ({
      id: m._id ? String(m._id) : undefined,
      titulo: m.titulo,
      dueAt: m.dueAt,
      done: Boolean(m.done),
      proposedByLeader: Boolean(m.proposedByLeader),
    })),
    notes: p.notes || '',
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export function serializeCourse(c, { includeContent = false } = {}) {
  return {
    id: String(c._id),
    titulo: c.titulo,
    descripcion: c.descripcion || '',
    category: c.category || 'general',
    durationMinutes: c.durationMinutes || 30,
    contentUrl: includeContent ? c.contentUrl || '' : undefined,
    contentHtml: includeContent ? c.contentHtml || '' : undefined,
    quizCount: Array.isArray(c.quiz) ? c.quiz.length : 0,
    quiz: includeContent
      ? (c.quiz || []).map((q) => ({
          pregunta: q.pregunta,
          opciones: q.opciones || [],
          // no exponer correcta al alumno en listados; sí en admin
        }))
      : undefined,
    mandatory: Boolean(c.mandatory),
    status: c.status,
    publishedAt: c.publishedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export function serializeEnrollment(e, course = null) {
  return {
    id: String(e._id),
    courseId: e.courseId ? String(e.courseId) : null,
    userId: e.userId ? String(e.userId) : null,
    userName: e.userName || '',
    progress: e.progress || 0,
    completed: Boolean(e.completed),
    completedAt: e.completedAt,
    quizScore: e.quizScore,
    certificateCode: e.certificateCode || '',
    mandatory: Boolean(e.mandatory),
    course: course ? serializeCourse(course) : undefined,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

export function serializeVacancy(v) {
  return {
    id: String(v._id),
    titulo: v.titulo,
    descripcion: v.descripcion || '',
    area: v.area || '',
    ubicacion: v.ubicacion || '',
    requirements: v.requirements || '',
    status: v.status,
    closesAt: v.closesAt,
    publishedAt: v.publishedAt,
    authorName: v.authorName || '',
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }
}

export function serializeApplication(a) {
  return {
    id: String(a._id),
    vacancyId: a.vacancyId ? String(a.vacancyId) : null,
    userId: a.userId ? String(a.userId) : null,
    userName: a.userName || '',
    coverLetter: a.coverLetter || '',
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

/**
 * Score quiz: answers = array of option indices matching course.quiz order.
 */
export function scoreQuiz(quiz, answers) {
  const qs = Array.isArray(quiz) ? quiz : []
  const ans = Array.isArray(answers) ? answers : []
  if (!qs.length) return { score: 100, correct: 0, total: 0 }
  let correct = 0
  for (let i = 0; i < qs.length; i++) {
    if (Number(ans[i]) === Number(qs[i].correcta)) correct++
  }
  return {
    score: Math.round((correct / qs.length) * 100),
    correct,
    total: qs.length,
  }
}

export function makeCertificateCode(tenantCode, userId) {
  const t = String(tenantCode || 'T').slice(0, 6).toUpperCase()
  const u = String(userId || '').slice(-6).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `LMS-${t}-${u}-${r}`
}

export function tenantHasTalentCap(tenant, sub = null) {
  const caps = new Set(tenant?.capabilities || [])
  if (!caps.has('talento')) return false
  if (!sub) return true
  return caps.has(`talento.${sub}`)
}
