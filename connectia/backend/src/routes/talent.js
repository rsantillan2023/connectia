import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import {
  audienceFilterForUser,
  userMatchesAudience,
  serializeAudience,
} from '../lib/audience.js'
import {
  Okr,
  PerformanceReview,
  PerformanceCycle,
  CareerPlan,
  LmsCourse,
  LmsEnrollment,
  InternalVacancy,
  VacancyApplication,
} from '../models/Talent.js'
import { User } from '../models/User.js'
import {
  tenantHasTalentCap,
  displayName,
  computeOkrProgress,
  normalizeKeyResults,
  serializeOkr,
  serializeReview,
  serializeCareerPlan,
  serializeCourse,
  serializeEnrollment,
  serializeVacancy,
  serializeApplication,
  scoreQuiz,
  makeCertificateCode,
  REVIEW_TYPES,
} from '../lib/talent.js'
import { notifyVacancyApplication } from '../services/notifyTalentCulture.js'
import { searchTenantPeople } from '../lib/peopleSearch.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function talentCaps(tenant) {
  return {
    okr: tenantHasTalentCap(tenant, 'okr'),
    desempeno: tenantHasTalentCap(tenant, 'desempeno'),
    carrera: tenantHasTalentCap(tenant, 'carrera'),
    lms: tenantHasTalentCap(tenant, 'lms'),
    vacantes: tenantHasTalentCap(tenant, 'vacantes'),
  }
}

function requireTalentCap(sub) {
  return (req, res, next) => {
    if (!tenantHasTalentCap(req.tenant, sub)) {
      const label = sub ? `talento.${sub}` : 'talento'
      return res.status(403).json({ error: `Capability ${label} no habilitada en esta comunidad` })
    }
    next()
  }
}

/** GET /api/talent/meta */
router.get('/meta', requireAuth, (req, res) => {
  if (!tenantHasTalentCap(req.tenant)) {
    return res.status(403).json({ error: 'Módulo talento no habilitado en esta comunidad' })
  }
  res.json({ capabilities: talentCaps(req.tenant) })
})

/** GET /api/talent/people?q= — picker de colegas */
router.get('/people', requireAuth, async (req, res, next) => {
  try {
    if (!tenantHasTalentCap(req.tenant)) {
      return res.status(403).json({ error: 'Módulo talento no habilitado en esta comunidad' })
    }
    const items = await searchTenantPeople({
      tenantId: req.tenant._id,
      excludeUserId: req.user._id,
      q: req.query.q,
      limit: Number(req.query.limit) || 40,
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/okrs */
router.get('/okrs', requireAuth, requireTalentCap('okr'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const filter = { tenantId, ownerId: req.user._id }
    const cycleId = String(req.query.cycleId || '').trim()
    if (cycleId && ObjectId.isValid(cycleId)) filter.cycleId = new ObjectId(cycleId)
    const items = await Okr.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeOkr) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/talent/okrs/:id/progress */
router.patch('/okrs/:id/progress', requireAuth, requireTalentCap('okr'), async (req, res, next) => {
  try {
    const doc = await Okr.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      ownerId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'OKR no encontrado' })

    const body = req.body || {}
    if (body.keyResults != null) {
      const incoming = normalizeKeyResults(body.keyResults)
      for (const kr of incoming) {
        const existing = doc.keyResults.find(
          (x) => x.titulo && kr.titulo && String(x.titulo).trim() === String(kr.titulo).trim(),
        )
        if (existing) {
          if (kr.current != null) existing.current = kr.current
          if (kr.target != null) existing.target = kr.target
        }
      }
    }

    const progress = computeOkrProgress(doc.keyResults)
    doc.progress = progress
    doc.progressLog = doc.progressLog || []
    doc.progressLog.push({
      at: new Date(),
      by: req.user._id,
      progress,
      note: String(body.note || '').trim().slice(0, 500),
    })
    if (doc.progressLog.length > 100) doc.progressLog = doc.progressLog.slice(-80)
    if (progress >= 100 && doc.status === 'active') doc.status = 'completed'
    await doc.save()
    res.json({ okr: serializeOkr(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/reviews */
router.get('/reviews', requireAuth, requireTalentCap('desempeno'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const uid = req.user._id
    const items = await PerformanceReview.find({
      tenantId,
      $or: [{ subjectId: uid }, { reviewerId: uid }],
    })
      .sort({ updatedAt: -1 })
      .lean()
    res.json({ items: items.map((r) => serializeReview(r)) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/talent/reviews/continuous */
router.post('/reviews/continuous', requireAuth, requireTalentCap('desempeno'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const subjectIdRaw = String(body.subjectId || '').trim()
    if (!ObjectId.isValid(subjectIdRaw)) {
      return res.status(400).json({ error: 'subjectId inválido' })
    }
    const subjectId = new ObjectId(subjectIdRaw)
    const subject = await User.findOne({ _id: subjectId, tenantId: req.tenant._id, activo: true }).lean()
    if (!subject) return res.status(404).json({ error: 'Colaborador no encontrado' })

    const isSelf = String(subjectId) === String(req.user._id)
    let reviewType = isSelf ? 'self' : String(body.reviewType || 'leader').trim()
    if (!isSelf && !['leader', 'peer'].includes(reviewType)) {
      return res.status(400).json({ error: 'reviewType debe ser leader o peer' })
    }
    if (isSelf) reviewType = 'self'

    const comments = String(body.comments || '').trim().slice(0, 4000)
    if (!comments) return res.status(400).json({ error: 'comments es requerido' })

    let rating = body.rating != null ? Number(body.rating) : null
    if (rating != null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating debe ser entre 1 y 5' })
    }

    const doc = await PerformanceReview.create({
      tenantId: req.tenant._id,
      kind: 'continuous',
      subjectId,
      subjectName: displayName(subject),
      reviewerId: req.user._id,
      reviewerName: displayName(req.user),
      reviewType,
      rating,
      strengths: String(body.strengths || '').trim().slice(0, 4000),
      improvements: String(body.improvements || '').trim().slice(0, 4000),
      comments,
      status: 'submitted',
      submittedAt: new Date(),
    })
    res.status(201).json({ review: serializeReview(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/talent/reviews — evaluación formal */
router.post('/reviews', requireAuth, requireTalentCap('desempeno'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const cycleIdRaw = String(body.cycleId || '').trim()
    if (!ObjectId.isValid(cycleIdRaw)) {
      return res.status(400).json({ error: 'cycleId inválido' })
    }
    const cycle = await PerformanceCycle.findOne({
      _id: cycleIdRaw,
      tenantId: req.tenant._id,
      status: 'active',
    }).lean()
    if (!cycle) return res.status(404).json({ error: 'Ciclo de desempeño no encontrado o inactivo' })
    if (!userMatchesAudience(req.user, cycle.audience)) {
      return res.status(403).json({ error: 'No participás en este ciclo' })
    }

    const subjectIdRaw = String(body.subjectId || req.user._id).trim()
    if (!ObjectId.isValid(subjectIdRaw)) {
      return res.status(400).json({ error: 'subjectId inválido' })
    }
    const subjectId = new ObjectId(subjectIdRaw)
    const subject = await User.findOne({ _id: subjectId, tenantId: req.tenant._id, activo: true }).lean()
    if (!subject) return res.status(404).json({ error: 'Colaborador no encontrado' })

    const isSelf = String(subjectId) === String(req.user._id)
    let reviewType = String(body.reviewType || (isSelf ? 'self' : 'leader')).trim()
    if (!REVIEW_TYPES.includes(reviewType)) {
      return res.status(400).json({ error: 'reviewType inválido' })
    }
    if (reviewType === 'self' && !cycle.allowSelf) {
      return res.status(403).json({ error: 'Autoevaluación no habilitada en este ciclo' })
    }
    if (reviewType === 'leader' && !cycle.allowLeader && !isSelf) {
      return res.status(403).json({ error: 'Evaluación de líder no habilitada' })
    }
    if (reviewType === 'peer' && !cycle.allowPeer) {
      return res.status(403).json({ error: 'Evaluación entre pares no habilitada' })
    }

    const submit = body.submit === true || body.status === 'submitted'
    let rating = body.rating != null ? Number(body.rating) : null
    if (rating != null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating debe ser entre 1 y 5' })
    }

    let doc = await PerformanceReview.findOne({
      tenantId: req.tenant._id,
      cycleId: cycle._id,
      subjectId,
      reviewerId: req.user._id,
      reviewType,
      kind: 'formal',
    })

    if (doc && doc.status === 'closed') {
      return res.status(400).json({ error: 'Esta evaluación ya está cerrada' })
    }

    if (!doc) {
      doc = new PerformanceReview({
        tenantId: req.tenant._id,
        cycleId: cycle._id,
        kind: 'formal',
        subjectId,
        subjectName: displayName(subject),
        reviewerId: req.user._id,
        reviewerName: displayName(req.user),
        reviewType,
        status: 'draft',
      })
    }

    if (body.rating != null) doc.rating = rating
    if (body.strengths != null) doc.strengths = String(body.strengths).trim().slice(0, 4000)
    if (body.improvements != null) doc.improvements = String(body.improvements).trim().slice(0, 4000)
    if (body.comments != null) doc.comments = String(body.comments).trim().slice(0, 4000)

    if (submit) {
      doc.status = 'submitted'
      doc.submittedAt = new Date()
    }

    await doc.save()
    res.status(doc.createdAt?.getTime() === doc.updatedAt?.getTime() ? 201 : 200).json({
      review: serializeReview(doc.toObject()),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/career */
router.get('/career', requireAuth, requireTalentCap('carrera'), async (req, res, next) => {
  try {
    let plan = await CareerPlan.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
    }).lean()
    if (!plan) {
      const created = await CareerPlan.create({
        tenantId: req.tenant._id,
        userId: req.user._id,
        userName: displayName(req.user),
        currentRole: '',
        targetRole: '',
        skillGaps: [],
        milestones: [],
        notes: '',
        status: 'active',
      })
      plan = created.toObject()
    }
    res.json({ plan: serializeCareerPlan(plan) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/talent/career */
router.patch('/career', requireAuth, requireTalentCap('carrera'), async (req, res, next) => {
  try {
    const doc = await CareerPlan.findOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!doc) {
      return res.status(404).json({ error: 'Plan de carrera no encontrado' })
    }

    const body = req.body || {}
    if (body.notes != null) {
      doc.notes = String(body.notes).trim().slice(0, 2000)
    }
    if (Array.isArray(body.milestones)) {
      for (const m of body.milestones.slice(0, 30)) {
        const id = m?.id ? String(m.id) : null
        if (!id) continue
        const existing = doc.milestones.id(id)
        if (!existing) continue
        if (m.done != null) existing.done = Boolean(m.done)
      }
    }

    await doc.save()
    res.json({ plan: serializeCareerPlan(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/courses */
router.get('/courses', requireAuth, requireTalentCap('lms'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const courses = await LmsCourse.find({
      tenantId,
      status: 'published',
      $and: [audienceFilterForUser(req.user)],
    })
      .sort({ publishedAt: -1, titulo: 1 })
      .lean()

    const enrollments = await LmsEnrollment.find({
      tenantId,
      userId: req.user._id,
    }).lean()
    const enByCourse = new Map(enrollments.map((e) => [String(e.courseId), e]))

    res.json({
      items: courses.map((c) => {
        const en = enByCourse.get(String(c._id))
        return {
          ...serializeCourse(c),
          enrollment: en
            ? {
                progress: en.progress || 0,
                completed: Boolean(en.completed),
                completedAt: en.completedAt,
                quizScore: en.quizScore,
                certificateCode: en.certificateCode || '',
              }
            : null,
        }
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/courses/:id */
router.get('/courses/:id', requireAuth, requireTalentCap('lms'), async (req, res, next) => {
  try {
    const course = await LmsCourse.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    }).lean()
    if (!course || !userMatchesAudience(req.user, course.audience)) {
      return res.status(404).json({ error: 'Curso no encontrado' })
    }

    const enrollment = await LmsEnrollment.findOne({
      tenantId: req.tenant._id,
      courseId: course._id,
      userId: req.user._id,
    }).lean()

    res.json({
      course: serializeCourse(course, { includeContent: true }),
      enrollment: enrollment ? serializeEnrollment(enrollment) : null,
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/talent/courses/:id/progress */
router.post('/courses/:id/progress', requireAuth, requireTalentCap('lms'), async (req, res, next) => {
  try {
    const course = await LmsCourse.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!course || !userMatchesAudience(req.user, course.audience)) {
      return res.status(404).json({ error: 'Curso no encontrado' })
    }

    const body = req.body || {}
    let progress = Math.min(100, Math.max(0, Number(body.progress) || 0))
    let quizScore = null
    let quizPassed = false

    if (Array.isArray(course.quiz) && course.quiz.length && body.answers != null) {
      const scored = scoreQuiz(course.quiz, body.answers)
      quizScore = scored.score
      quizPassed = scored.score >= 70
      if (quizPassed) progress = Math.max(progress, 100)
    }

    let enrollment = await LmsEnrollment.findOne({
      tenantId: req.tenant._id,
      courseId: course._id,
      userId: req.user._id,
    })

    const now = new Date()
    const completed = progress >= 100 || quizPassed
    const wasCompleted = Boolean(enrollment?.completed)

    if (!enrollment) {
      enrollment = new LmsEnrollment({
        tenantId: req.tenant._id,
        courseId: course._id,
        userId: req.user._id,
        userName: displayName(req.user),
        progress,
        mandatory: Boolean(course.mandatory),
      })
    } else {
      enrollment.progress = Math.max(enrollment.progress || 0, progress)
    }

    if (quizScore != null) enrollment.quizScore = quizScore
    if (completed && !enrollment.completed) {
      enrollment.completed = true
      enrollment.completedAt = now
      enrollment.progress = 100
      if (!enrollment.certificateCode) {
        enrollment.certificateCode = makeCertificateCode(req.tenant.empCodigo, req.user._id)
      }
    }

    await enrollment.save()
    if (completed && !wasCompleted) {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'course_completed',
        entityId: course._id,
      })
    }
    res.json({ enrollment: serializeEnrollment(enrollment.toObject(), course.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/applications/mine */
router.get('/applications/mine', requireAuth, requireTalentCap('vacantes'), async (req, res, next) => {
  try {
    const items = await VacancyApplication.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ items: items.map(serializeApplication) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/vacancies */
router.get('/vacancies', requireAuth, requireTalentCap('vacantes'), async (req, res, next) => {
  try {
    const now = new Date()
    const items = await InternalVacancy.find({
      tenantId: req.tenant._id,
      status: 'open',
      $and: [
        audienceFilterForUser(req.user),
        {
          $or: [{ closesAt: null }, { closesAt: { $gte: now } }],
        },
      ],
    })
      .sort({ publishedAt: -1, titulo: 1 })
      .lean()
    res.json({ items: items.map(serializeVacancy) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/talent/vacancies/:id */
router.get('/vacancies/:id', requireAuth, requireTalentCap('vacantes'), async (req, res, next) => {
  try {
    const vacancy = await InternalVacancy.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'open',
    }).lean()
    if (!vacancy || !userMatchesAudience(req.user, vacancy.audience)) {
      return res.status(404).json({ error: 'Vacante no encontrada' })
    }
    res.json({ vacancy: serializeVacancy(vacancy) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/talent/vacancies/:id/apply */
router.post('/vacancies/:id/apply', requireAuth, requireTalentCap('vacantes'), async (req, res, next) => {
  try {
    const vacancy = await InternalVacancy.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'open',
    })
    if (!vacancy || !userMatchesAudience(req.user, vacancy.audience)) {
      return res.status(404).json({ error: 'Vacante no encontrada' })
    }

    const existing = await VacancyApplication.findOne({
      tenantId: req.tenant._id,
      vacancyId: vacancy._id,
      userId: req.user._id,
    })
    if (existing) {
      return res.status(409).json({ error: 'Ya postulaste a esta vacante', application: serializeApplication(existing.toObject()) })
    }

    const coverLetter = String(req.body?.coverLetter || '').trim().slice(0, 4000)
    const application = await VacancyApplication.create({
      tenantId: req.tenant._id,
      vacancyId: vacancy._id,
      userId: req.user._id,
      userName: displayName(req.user),
      coverLetter,
      status: 'submitted',
    })

    await notifyVacancyApplication({
      tenant: req.tenant,
      vacancy: vacancy.toObject(),
      application: application.toObject(),
    })

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'vacancy_applied',
      entityId: vacancy._id,
    })

    res.status(201).json({ application: serializeApplication(application.toObject()) })
  } catch (e) {
    next(e)
  }
})

export default router
