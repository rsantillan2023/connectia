import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import {
  OkrCycle,
  Okr,
  PerformanceCycle,
  PerformanceReview,
  CareerPlan,
  LmsCourse,
  LmsEnrollment,
  InternalVacancy,
  VacancyApplication,
} from '../models/Talent.js'
import {
  tenantHasTalentCap,
  displayName,
  normalizeKeyResults,
  computeOkrProgress,
  serializeOkrCycle,
  serializeOkr,
  serializePerformanceCycle,
  serializeReview,
  serializeCareerPlan,
  serializeCourse,
  serializeEnrollment,
  serializeVacancy,
  serializeApplication,
  OKR_STATUSES,
  VACANCY_STATUSES,
  APPLICATION_STATUSES,
  REVIEW_TYPES,
  TALENT_CAPS,
} from '../lib/talent.js'
import { seedTalentCultureForTenant } from '../lib/talentCultureSeed.js'
import { notifyCourseAssigned } from '../services/notifyTalentCulture.js'
import { searchTenantPeople } from '../lib/peopleSearch.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const cap = 'admin.talento'

router.use(requireAuth, requireCapability(cap))

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, groups, users] = await Promise.all([
    a.mode === 'restricted' && areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id')
      : [],
    a.mode === 'restricted' && groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id')
      : [],
    userIds.length ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id') : [],
  ])
  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

function serializeCourseAdmin(c) {
  return {
    ...serializeCourse(c, { includeContent: true }),
    audience: serializeAudience(c.audience),
    authorId: c.authorId ? String(c.authorId) : null,
    authorName: c.authorName || '',
    quiz: (c.quiz || []).map((q) => ({
      pregunta: q.pregunta,
      opciones: q.opciones || [],
      correcta: q.correcta ?? 0,
    })),
  }
}

function serializeVacancyAdmin(v) {
  return {
    ...serializeVacancy(v),
    audience: serializeAudience(v.audience),
    authorId: v.authorId ? String(v.authorId) : null,
  }
}

function talentCaps(tenant) {
  return {
    okr: tenantHasTalentCap(tenant, 'okr'),
    desempeno: tenantHasTalentCap(tenant, 'desempeno'),
    carrera: tenantHasTalentCap(tenant, 'carrera'),
    lms: tenantHasTalentCap(tenant, 'lms'),
    vacantes: tenantHasTalentCap(tenant, 'vacantes'),
  }
}

/** GET /api/admin/talent/meta */
router.get('/meta', async (req, res) => {
  res.json({
    capabilities: talentCaps(req.tenant),
    productCaps: TALENT_CAPS,
    okrStatuses: ['draft', 'active', 'closed'],
    okrItemStatuses: OKR_STATUSES,
    performanceStatuses: ['draft', 'active', 'closed'],
    reviewStatuses: ['draft', 'submitted', 'closed'],
    reviewTypes: REVIEW_TYPES,
    courseStatuses: ['draft', 'published', 'archived'],
    vacancyStatuses: VACANCY_STATUSES,
    applicationStatuses: APPLICATION_STATUSES,
    careerStatuses: ['active', 'completed', 'archived'],
  })
})

/** GET /api/admin/talent/people?q= */
router.get('/people', async (req, res, next) => {
  try {
    const items = await searchTenantPeople({
      tenantId: req.tenant._id,
      q: req.query.q,
      limit: Number(req.query.limit) || 40,
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/talent/seed-defaults */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedTalentCultureForTenant(req.tenant._id, {
      brandName: req.tenant.nombre || req.tenant.name || 'Connectia',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/** ─── OKR cycles ─── */
router.get('/okr-cycles', async (req, res, next) => {
  try {
    const items = await OkrCycle.find({ tenantId: req.tenant._id }).sort({ startsAt: -1 }).lean()
    res.json({ items: items.map(serializeOkrCycle) })
  } catch (e) {
    next(e)
  }
})

router.post('/okr-cycles', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim().slice(0, 160)
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const startsAt = body.startsAt ? new Date(body.startsAt) : null
    const endsAt = body.endsAt ? new Date(body.endsAt) : null
    if (!startsAt || !endsAt || Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return res.status(400).json({ error: 'startsAt y endsAt son requeridos' })
    }
    const status = ['draft', 'active', 'closed'].includes(body.status) ? body.status : 'draft'
    const doc = await OkrCycle.create({
      tenantId: req.tenant._id,
      nombre,
      descripcion: String(body.descripcion || '').trim().slice(0, 2000),
      startsAt,
      endsAt,
      status,
    })
    res.status(201).json({ cycle: serializeOkrCycle(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/okr-cycles/:id', async (req, res, next) => {
  try {
    const doc = await OkrCycle.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Ciclo OKR no encontrado' })
    const body = req.body || {}
    if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 160)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 2000)
    if (body.startsAt != null) doc.startsAt = new Date(body.startsAt)
    if (body.endsAt != null) doc.endsAt = new Date(body.endsAt)
    if (body.status != null && ['draft', 'active', 'closed'].includes(body.status)) {
      doc.status = body.status
    }
    await doc.save()
    res.json({ cycle: serializeOkrCycle(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── OKRs ─── */
router.get('/okrs', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const cycleId = String(req.query.cycleId || '').trim()
    const ownerId = String(req.query.ownerId || '').trim()
    if (cycleId && ObjectId.isValid(cycleId)) filter.cycleId = new ObjectId(cycleId)
    if (ownerId && ObjectId.isValid(ownerId)) filter.ownerId = new ObjectId(ownerId)
    const items = await Okr.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeOkr) })
  } catch (e) {
    next(e)
  }
})

router.post('/okrs', async (req, res, next) => {
  try {
    const body = req.body || {}
    const cycleIdRaw = String(body.cycleId || '').trim()
    const ownerIdRaw = String(body.ownerId || '').trim()
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    if (!ObjectId.isValid(cycleIdRaw)) return res.status(400).json({ error: 'cycleId inválido' })
    if (!ObjectId.isValid(ownerIdRaw)) return res.status(400).json({ error: 'ownerId inválido' })
    if (!titulo) return res.status(400).json({ error: 'titulo es requerido' })

    const [cycle, owner] = await Promise.all([
      OkrCycle.findOne({ _id: cycleIdRaw, tenantId: req.tenant._id }),
      User.findOne({ _id: ownerIdRaw, tenantId: req.tenant._id, activo: true }),
    ])
    if (!cycle) return res.status(404).json({ error: 'Ciclo OKR no encontrado' })
    if (!owner) return res.status(404).json({ error: 'Owner no encontrado' })

    const keyResults = normalizeKeyResults(body.keyResults)
    const progress = computeOkrProgress(keyResults)
    const status = OKR_STATUSES.includes(body.status) ? body.status : 'active'

    const doc = await Okr.create({
      tenantId: req.tenant._id,
      cycleId: cycle._id,
      ownerId: owner._id,
      ownerName: displayName(owner),
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 4000),
      keyResults,
      progress,
      status,
      createdBy: req.user._id,
    })
    res.status(201).json({ okr: serializeOkr(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/okrs/:id', async (req, res, next) => {
  try {
    const doc = await Okr.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'OKR no encontrado' })
    const body = req.body || {}

    if (body.ownerId != null && ObjectId.isValid(String(body.ownerId))) {
      const owner = await User.findOne({
        _id: body.ownerId,
        tenantId: req.tenant._id,
        activo: true,
      })
      if (!owner) return res.status(404).json({ error: 'Owner no encontrado' })
      doc.ownerId = owner._id
      doc.ownerName = displayName(owner)
    }
    if (body.cycleId != null && ObjectId.isValid(String(body.cycleId))) {
      const cycle = await OkrCycle.findOne({ _id: body.cycleId, tenantId: req.tenant._id })
      if (!cycle) return res.status(404).json({ error: 'Ciclo OKR no encontrado' })
      doc.cycleId = cycle._id
    }
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 4000)
    if (body.keyResults != null) doc.keyResults = normalizeKeyResults(body.keyResults)
    if (body.status != null && OKR_STATUSES.includes(body.status)) doc.status = body.status
    doc.progress = computeOkrProgress(doc.keyResults)
    await doc.save()
    res.json({ okr: serializeOkr(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── Performance cycles ─── */
router.get('/performance-cycles', async (req, res, next) => {
  try {
    const items = await PerformanceCycle.find({ tenantId: req.tenant._id }).sort({ startsAt: -1 }).lean()
    res.json({
      items: items.map((c) => ({
        ...serializePerformanceCycle(c),
        audience: serializeAudience(c.audience),
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/performance-cycles', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim().slice(0, 160)
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const startsAt = body.startsAt ? new Date(body.startsAt) : null
    const endsAt = body.endsAt ? new Date(body.endsAt) : null
    if (!startsAt || !endsAt || Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return res.status(400).json({ error: 'startsAt y endsAt son requeridos' })
    }
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const doc = await PerformanceCycle.create({
      tenantId: req.tenant._id,
      nombre,
      descripcion: String(body.descripcion || '').trim().slice(0, 2000),
      startsAt,
      endsAt,
      allowSelf: body.allowSelf !== false,
      allowLeader: body.allowLeader !== false,
      allowPeer: Boolean(body.allowPeer),
      status: ['draft', 'active', 'closed'].includes(body.status) ? body.status : 'draft',
      audience,
    })
    res.status(201).json({
      cycle: { ...serializePerformanceCycle(doc.toObject()), audience: serializeAudience(doc.audience) },
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/performance-cycles/:id', async (req, res, next) => {
  try {
    const doc = await PerformanceCycle.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Ciclo no encontrado' })
    const body = req.body || {}
    if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 160)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 2000)
    if (body.startsAt != null) doc.startsAt = new Date(body.startsAt)
    if (body.endsAt != null) doc.endsAt = new Date(body.endsAt)
    if (body.allowSelf != null) doc.allowSelf = Boolean(body.allowSelf)
    if (body.allowLeader != null) doc.allowLeader = Boolean(body.allowLeader)
    if (body.allowPeer != null) doc.allowPeer = Boolean(body.allowPeer)
    if (body.status != null && ['draft', 'active', 'closed'].includes(body.status)) {
      doc.status = body.status
    }
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    await doc.save()
    res.json({
      cycle: { ...serializePerformanceCycle(doc.toObject()), audience: serializeAudience(doc.audience) },
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/talent/reviews */
router.get('/reviews', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const cycleId = String(req.query.cycleId || '').trim()
    if (cycleId && ObjectId.isValid(cycleId)) filter.cycleId = new ObjectId(cycleId)
    const items = await PerformanceReview.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map((r) => serializeReview(r)) })
  } catch (e) {
    next(e)
  }
})

router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const doc = await PerformanceReview.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Evaluación no encontrada' })
    const body = req.body || {}
    if (body.status != null && ['draft', 'submitted', 'closed'].includes(body.status)) {
      doc.status = body.status
      if (body.status === 'submitted' && !doc.submittedAt) doc.submittedAt = new Date()
    }
    if (body.rating != null) {
      const rating = Number(body.rating)
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) doc.rating = rating
    }
    if (body.comments != null) doc.comments = String(body.comments).trim().slice(0, 4000)
    if (body.strengths != null) doc.strengths = String(body.strengths).trim().slice(0, 4000)
    if (body.improvements != null) doc.improvements = String(body.improvements).trim().slice(0, 4000)
    await doc.save()
    res.json({ review: serializeReview(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── Courses ─── */
router.get('/courses', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const status = String(req.query.status || '').trim()
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const items = await LmsCourse.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeCourseAdmin) })
  } catch (e) {
    next(e)
  }
})

router.post('/courses', async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    if (!titulo) return res.status(400).json({ error: 'titulo es requerido' })
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft'
    const doc = await LmsCourse.create({
      tenantId: req.tenant._id,
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 8000),
      category: String(body.category || 'general').trim().slice(0, 80) || 'general',
      durationMinutes: Math.max(1, Number(body.durationMinutes) || 30),
      contentUrl: String(body.contentUrl || '').trim().slice(0, 500),
      contentHtml: String(body.contentHtml || '').trim().slice(0, 100000),
      quiz: Array.isArray(body.quiz)
        ? body.quiz.slice(0, 30).map((q) => ({
            pregunta: String(q?.pregunta || '').trim().slice(0, 500),
            opciones: (q?.opciones || []).slice(0, 8).map((o) => String(o).trim().slice(0, 200)),
            correcta: Math.max(0, Number(q?.correcta) || 0),
          }))
        : [],
      mandatory: Boolean(body.mandatory),
      status,
      audience,
      authorId: req.user._id,
      authorName: displayName(req.user),
      publishedAt: status === 'published' ? new Date() : null,
    })
    res.status(201).json({ course: serializeCourseAdmin(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/courses/:id', async (req, res, next) => {
  try {
    const doc = await LmsCourse.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Curso no encontrado' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 8000)
    if (body.category != null) doc.category = String(body.category).trim().slice(0, 80) || 'general'
    if (body.durationMinutes != null) doc.durationMinutes = Math.max(1, Number(body.durationMinutes) || 30)
    if (body.contentUrl != null) doc.contentUrl = String(body.contentUrl).trim().slice(0, 500)
    if (body.contentHtml != null) doc.contentHtml = String(body.contentHtml).trim().slice(0, 100000)
    if (body.quiz != null && Array.isArray(body.quiz)) {
      doc.quiz = body.quiz.slice(0, 30).map((q) => ({
        pregunta: String(q?.pregunta || '').trim().slice(0, 500),
        opciones: (q?.opciones || []).slice(0, 8).map((o) => String(o).trim().slice(0, 200)),
        correcta: Math.max(0, Number(q?.correcta) || 0),
      }))
    }
    if (body.mandatory != null) doc.mandatory = Boolean(body.mandatory)
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (body.status != null && ['draft', 'published', 'archived'].includes(body.status)) {
      if (body.status === 'published' && doc.status !== 'published') doc.publishedAt = new Date()
      doc.status = body.status
    }
    await doc.save()
    res.json({ course: serializeCourseAdmin(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.post('/courses/:id/assign', async (req, res, next) => {
  try {
    const course = await LmsCourse.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' })

    const userIds = [...new Set((req.body?.userIds || []).map(String).filter((id) => ObjectId.isValid(id)))]
    if (!userIds.length) return res.status(400).json({ error: 'userIds es requerido' })

    const users = await User.find({
      tenantId: req.tenant._id,
      _id: { $in: userIds.map((id) => new ObjectId(id)) },
      activo: true,
    }).lean()

    const created = []
    for (const u of users) {
      const en = await LmsEnrollment.findOneAndUpdate(
        { tenantId: req.tenant._id, courseId: course._id, userId: u._id },
        {
          $setOnInsert: {
            tenantId: req.tenant._id,
            courseId: course._id,
            userId: u._id,
            userName: displayName(u),
            progress: 0,
            completed: false,
            mandatory: Boolean(course.mandatory),
            assignedBy: req.user._id,
          },
        },
        { upsert: true, new: true },
      )
      created.push(serializeEnrollment(en.toObject(), course.toObject()))
      await notifyCourseAssigned({ tenant: req.tenant, userId: u._id, course: course.toObject() })
    }

    res.status(201).json({ enrollments: created, assigned: created.length })
  } catch (e) {
    next(e)
  }
})

/** ─── Vacancies ─── */
router.get('/vacancies', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const status = String(req.query.status || '').trim()
    if (VACANCY_STATUSES.includes(status)) filter.status = status
    const items = await InternalVacancy.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeVacancyAdmin) })
  } catch (e) {
    next(e)
  }
})

router.post('/vacancies', async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    if (!titulo) return res.status(400).json({ error: 'titulo es requerido' })
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const status = VACANCY_STATUSES.includes(body.status) ? body.status : 'draft'
    const doc = await InternalVacancy.create({
      tenantId: req.tenant._id,
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 8000),
      area: String(body.area || '').trim().slice(0, 120),
      ubicacion: String(body.ubicacion || '').trim().slice(0, 160),
      requirements: String(body.requirements || '').trim().slice(0, 4000),
      status,
      audience,
      closesAt: body.closesAt ? new Date(body.closesAt) : null,
      authorId: req.user._id,
      authorName: displayName(req.user),
      publishedAt: status === 'open' ? new Date() : null,
    })
    res.status(201).json({ vacancy: serializeVacancyAdmin(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/vacancies/:id', async (req, res, next) => {
  try {
    const doc = await InternalVacancy.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Vacante no encontrada' })
    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 8000)
    if (body.area != null) doc.area = String(body.area).trim().slice(0, 120)
    if (body.ubicacion != null) doc.ubicacion = String(body.ubicacion).trim().slice(0, 160)
    if (body.requirements != null) doc.requirements = String(body.requirements).trim().slice(0, 4000)
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (body.closesAt != null) doc.closesAt = body.closesAt ? new Date(body.closesAt) : null
    if (body.status != null && VACANCY_STATUSES.includes(body.status)) {
      if (body.status === 'open' && doc.status !== 'open') doc.publishedAt = new Date()
      doc.status = body.status
    }
    await doc.save()
    res.json({ vacancy: serializeVacancyAdmin(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.get('/vacancies/:id/applications', async (req, res, next) => {
  try {
    const vacancy = await InternalVacancy.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!vacancy) return res.status(404).json({ error: 'Vacante no encontrada' })
    const items = await VacancyApplication.find({
      tenantId: req.tenant._id,
      vacancyId: vacancy._id,
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ vacancy: serializeVacancyAdmin(vacancy), items: items.map(serializeApplication) })
  } catch (e) {
    next(e)
  }
})

router.patch('/applications/:id', async (req, res, next) => {
  try {
    const doc = await VacancyApplication.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Postulación no encontrada' })
    const status = String(req.body?.status || '').trim()
    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'status inválido' })
    }
    doc.status = status
    await doc.save()
    res.json({ application: serializeApplication(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── Career plans ─── */
router.get('/career-plans', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const userId = String(req.query.userId || '').trim()
    if (userId && ObjectId.isValid(userId)) filter.userId = new ObjectId(userId)
    const items = await CareerPlan.find(filter).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeCareerPlan) })
  } catch (e) {
    next(e)
  }
})

router.post('/career-plans', async (req, res, next) => {
  try {
    const body = req.body || {}
    const userIdRaw = String(body.userId || '').trim()
    if (!ObjectId.isValid(userIdRaw)) return res.status(400).json({ error: 'userId inválido' })
    const user = await User.findOne({ _id: userIdRaw, tenantId: req.tenant._id, activo: true })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const existing = await CareerPlan.findOne({ tenantId: req.tenant._id, userId: user._id })
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un plan para este usuario', plan: serializeCareerPlan(existing.toObject()) })
    }

    const milestones = Array.isArray(body.milestones)
      ? body.milestones.slice(0, 30).map((m) => ({
          titulo: String(m?.titulo || '').trim().slice(0, 200),
          dueAt: m?.dueAt ? new Date(m.dueAt) : null,
          done: Boolean(m?.done),
          proposedByLeader: Boolean(m?.proposedByLeader),
        }))
      : []

    const doc = await CareerPlan.create({
      tenantId: req.tenant._id,
      userId: user._id,
      userName: displayName(user),
      currentRole: String(body.currentRole || '').trim().slice(0, 160),
      targetRole: String(body.targetRole || '').trim().slice(0, 160),
      skillGaps: Array.isArray(body.skillGaps)
        ? body.skillGaps.slice(0, 20).map((s) => String(s).trim().slice(0, 120)).filter(Boolean)
        : [],
      milestones: milestones.filter((m) => m.titulo),
      notes: String(body.notes || '').trim().slice(0, 4000),
      status: ['active', 'completed', 'archived'].includes(body.status) ? body.status : 'active',
    })
    res.status(201).json({ plan: serializeCareerPlan(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/career-plans/:id', async (req, res, next) => {
  try {
    const doc = await CareerPlan.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Plan no encontrado' })
    const body = req.body || {}
    if (body.currentRole != null) doc.currentRole = String(body.currentRole).trim().slice(0, 160)
    if (body.targetRole != null) doc.targetRole = String(body.targetRole).trim().slice(0, 160)
    if (body.notes != null) doc.notes = String(body.notes).trim().slice(0, 4000)
    if (body.status != null && ['active', 'completed', 'archived'].includes(body.status)) {
      doc.status = body.status
    }
    if (Array.isArray(body.skillGaps)) {
      doc.skillGaps = body.skillGaps.slice(0, 20).map((s) => String(s).trim().slice(0, 120)).filter(Boolean)
    }
    if (Array.isArray(body.milestones)) {
      doc.milestones = body.milestones.slice(0, 30).map((m) => ({
        titulo: String(m?.titulo || '').trim().slice(0, 200),
        dueAt: m?.dueAt ? new Date(m.dueAt) : null,
        done: Boolean(m?.done),
        proposedByLeader: Boolean(m?.proposedByLeader),
      })).filter((m) => m.titulo)
    }
    await doc.save()
    res.json({ plan: serializeCareerPlan(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

export default router
