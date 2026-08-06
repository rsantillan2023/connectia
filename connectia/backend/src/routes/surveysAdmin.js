import { Router } from 'express'
import mongoose from 'mongoose'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { User } from '../models/User.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, usersFilterForAudience } from '../lib/audience.js'
import { SURVEY_QUESTION_TYPES, needsOptions } from '../lib/surveyQuestions.js'
import { seedSurveysForTenant } from '../lib/surveysSeed.js'
import { Tenant } from '../models/Tenant.js'
import {
  normalizeSurveysConfig,
  normalizeSurveyCategoriesInput,
  normalizeEnabledQuestionTypes,
  normalizeSurveyCategoryForTenant,
  resolveSurveyCategories,
  resolveQuestionTypeMeta,
  resolveEnabledQuestionTypes,
  surveysMeta,
  surveyCategoryLabel,
} from '../lib/surveysConfig.js'
import {
  buildByQuestion,
  buildByQuestionGroup,
  buildExportRows,
  buildParticipationStats,
  buildSurveyOverview,
  rowsToCsv,
} from '../lib/surveyAnalytics.js'
import {
  analyzeSurveyWithAi,
  aiConfigured,
  generateSurveyDraftFromPrompt,
  generateSurveyGeneralFromPrompt,
  generateSurveyQuestionsFromContext,
} from '../services/surveyAi.js'
import { notifySurveyPublished } from '../services/notifySurvey.js'
import { serializeSurvey } from './surveys.js'
import { resolveSurveyMediaFields, toPublicMediaUrl } from '../lib/mediaUrl.js'
import {
  parseAudienceImportFile,
  resolveAudienceImportRows,
  buildAudienceImportTemplateXlsx,
  buildAudienceImportTemplateCsv,
} from '../lib/surveyAudienceImport.js'
import multer from 'multer'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const audienceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mapAudienceCandidate(u) {
  return {
    id: String(u._id),
    usuario: u.usuario || '',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    areaId: u.areaId ? String(u.areaId) : null,
    label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
  }
}

function qid() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeQuestions(raw, { tenant = null, enforceEnabledTypes = false } = {}) {
  const list = Array.isArray(raw) ? raw : []
  const enabled = tenant ? new Set(resolveEnabledQuestionTypes(tenant)) : null
  return list
    .map((q, i) => {
      let tipo = SURVEY_QUESTION_TYPES.includes(q?.tipo) ? q.tipo : 'text'
      if (enforceEnabledTypes && enabled && !enabled.has(tipo)) {
        tipo = enabled.has('text') ? 'text' : [...enabled][0] || 'text'
      }
      const opciones = Array.isArray(q?.opciones)
        ? q.opciones.map((o) => String(o).trim()).filter(Boolean)
        : []
      return {
        id: String(q?.id || qid() + i).slice(0, 64),
        texto: String(q?.texto || '').trim().slice(0, 500),
        tipo,
        required: q?.required !== false,
        opciones: needsOptions(tipo) ? opciones : [],
        grupo: String(q?.grupo || 'General').trim().slice(0, 80) || 'General',
        imageUrl: toPublicMediaUrl(String(q?.imageUrl || '').trim()).slice(0, 500),
      }
    })
    .filter((q) => q.texto)
}

function assertQuestionsUseEnabledTypes(questions, tenant, { allowTipos = [] } = {}) {
  const enabled = new Set(resolveEnabledQuestionTypes(tenant))
  for (const t of allowTipos) enabled.add(t)
  const bad = (questions || []).find((q) => q?.tipo && !enabled.has(q.tipo))
  if (!bad) return null
  return `El tipo de pregunta «${bad.tipo}» no está habilitado en esta comunidad`
}

function parseQuestionIds(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function invitedForSurvey(s, liveCount) {
  if (s.audienceSnapshot?.invitedCount != null) return s.audienceSnapshot.invitedCount
  return liveCount
}

async function captureAudienceSnapshot(tenantId, audience) {
  const invitedCount = await User.countDocuments(usersFilterForAudience(tenantId, audience))
  const a = normalizeAudience(audience)
  return {
    invitedCount,
    capturedAt: new Date(),
    mode: a.mode,
    areaIds: a.areaIds,
    groupIds: a.groupIds,
    userIds: a.userIds,
  }
}

async function loadSurveyBundle(req, surveyId) {
  const s = await Survey.findOne({ _id: surveyId, tenantId: req.tenant._id }).lean()
  if (!s) return null
  const responses = await SurveyResponse.find({ surveyId: s._id, tenantId: req.tenant._id })
    .sort({ submittedAt: -1 })
    .lean()
  const liveInvited = await User.countDocuments(usersFilterForAudience(req.tenant._id, s.audience))
  const invited = invitedForSurvey(s, liveInvited)
  const answered = responses.length
  const participation = {
    invited,
    invitedLive: liveInvited,
    fromSnapshot: s.audienceSnapshot?.invitedCount != null,
    answered,
    pending: Math.max(0, invited - answered),
    rate: invited ? Math.round((answered / invited) * 1000) / 10 : null,
  }
  return { survey: s, responses, participation, liveInvited }
}

router.get('/', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (['draft', 'published', 'closed'].includes(status)) filter.status = status
    const items = await Survey.find(filter).sort({ updatedAt: -1 }).lean()
    const counts = await SurveyResponse.aggregate([
      { $match: { tenantId: req.tenant._id, surveyId: { $in: items.map((i) => i._id) } } },
      { $group: { _id: '$surveyId', n: { $sum: 1 } } },
    ])
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]))

    const withParticipation = await Promise.all(
      items.map(async (s) => {
        const answered = byId[String(s._id)] || 0
        const liveInvited = await User.countDocuments(usersFilterForAudience(req.tenant._id, s.audience))
        const invited = invitedForSurvey(s, liveInvited)
        const pending = Math.max(0, invited - answered)
        const rate = invited ? Math.round((answered / invited) * 1000) / 10 : null
        const base = serializeSurvey(s, { includeQuestions: false, includeAdminFields: true })
        return {
          ...base,
          categoriaLabel: surveyCategoryLabel(s.categoria, req.tenant) || base.categoriaLabel,
          responseCount: answered,
          participation: {
            invited,
            invitedLive: liveInvited,
            fromSnapshot: s.audienceSnapshot?.invitedCount != null,
            answered,
            pending,
            rate,
          },
        }
      }),
    )

    const meta = surveysMeta(req.tenant)
    res.json({
      items: withParticipation,
      questionTypes: meta.questionTypes,
      questionTypeMeta: meta.questionTypeMeta,
      questionTypeMetaAll: meta.questionTypeMetaAll,
      categories: meta.categories,
      surveysConfig: meta.surveysConfig,
      aiConfigured: aiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/** Config: categorías del tenant */
router.get('/categories', requireAuth, requireCapability('admin.encuestas'), async (req, res) => {
  res.json({
    items: resolveSurveyCategories(req.tenant),
    surveysConfig: normalizeSurveysConfig(req.tenant?.surveysConfig),
  })
})

router.put('/categories', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const prev = req.tenant.surveysConfig || {}
    const list = req.body?.categories ?? req.body?.items ?? req.body
    const normalized = normalizeSurveysConfig({
      ...prev,
      categories: normalizeSurveyCategoriesInput(list),
    })
    req.tenant.surveysConfig = normalized
    await Tenant.updateOne({ _id: req.tenant._id }, { $set: { surveysConfig: normalized } })
    res.json({
      items: resolveSurveyCategories(req.tenant),
      surveysConfig: normalized,
    })
  } catch (e) {
    next(e)
  }
})

/** Config: tipos de pregunta habilitados */
router.get('/question-types', requireAuth, requireCapability('admin.encuestas'), async (req, res) => {
  res.json({
    items: resolveQuestionTypeMeta(req.tenant, { includeDisabled: true }),
    enabled: resolveEnabledQuestionTypes(req.tenant),
    surveysConfig: normalizeSurveysConfig(req.tenant?.surveysConfig),
  })
})

router.put('/question-types', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const prev = req.tenant.surveysConfig || {}
    const raw = req.body?.enabledQuestionTypes ?? req.body?.questionTypes ?? req.body?.enabled ?? req.body
    const normalized = normalizeSurveysConfig({
      ...prev,
      enabledQuestionTypes: normalizeEnabledQuestionTypes(raw),
    })
    req.tenant.surveysConfig = normalized
    await Tenant.updateOne({ _id: req.tenant._id }, { $set: { surveysConfig: normalized } })
    res.json({
      items: resolveQuestionTypeMeta(req.tenant, { includeDisabled: true }),
      enabled: resolveEnabledQuestionTypes(req.tenant),
      surveysConfig: normalized,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Completa título, descripción y contexto IA (sin preguntas).
 * Body: { prompt, provider?, current? }
 */
router.post('/generate-general', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await generateSurveyGeneralFromPrompt({
      prompt: body.prompt,
      current: body.current || {},
      tenant: req.tenant,
      provider: body.provider || 'auto',
    })
    res.json({
      general: result.general,
      notas: result.notas || '',
      provider: result.provider,
      model: result.model,
      configured: true,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Genera borrador de encuesta (cuestionario completo) con IA.
 * Body: { prompt, provider? }
 */
router.post('/generate', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await generateSurveyDraftFromPrompt({
      prompt: body.prompt,
      tenant: req.tenant,
      provider: body.provider || 'auto',
    })
    // Normaliza preguntas con la misma regla que el CRUD
    const questions = normalizeQuestions(result.draft.questions)
    if (!questions.length) {
      return res.status(502).json({ error: 'La IA no generó preguntas válidas' })
    }
    res.json({
      draft: {
        ...result.draft,
        questions,
        status: 'draft',
      },
      provider: result.provider,
      model: result.model,
      configured: true,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Genera preguntas con IA usando contexto de la encuesta + plan de tipologías.
 * Body: { context, typeSpecs?, notes?, provider?, mode?: 'smart'|'manual', total? }
 */
router.post('/generate-questions', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await generateSurveyQuestionsFromContext({
      context: body.context || {},
      typeSpecs: body.typeSpecs || [],
      notes: body.notes || '',
      tenant: req.tenant,
      provider: body.provider || 'auto',
      mode: body.mode || 'smart',
      total: body.total,
    })
    const questions = normalizeQuestions(result.questions, { tenant: req.tenant })
    if (!questions.length) {
      return res.status(502).json({ error: 'La IA no generó preguntas válidas' })
    }
    res.json({
      questions,
      notas: result.notas || '',
      expectedCount: result.expectedCount,
      typeSpecs: result.typeSpecs || [],
      mode: result.mode || body.mode || 'smart',
      provider: result.provider,
      model: result.model,
      configured: true,
    })
  } catch (e) {
    next(e)
  }
})

/** Candidatos para destinatarios puntuales de encuestas. */
router.get('/audience-candidates', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .slice(0, 100)
      .map((id) => new ObjectId(id))

    if (ids.length) {
      const items = await User.find({ tenantId: req.tenant._id, _id: { $in: ids } })
        .select('_id usuario nombre apellido email areaId')
        .lean()
      return res.json({ items: items.map(mapAudienceCandidate) })
    }

    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    }
    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(40)
      .lean()
    res.json({ items: items.map(mapAudienceCandidate) })
  } catch (e) {
    next(e)
  }
})

/** Plantilla Excel/CSV para cargar destinatarios por legajo/DNI/nombre. */
router.get('/audience-import/template', requireAuth, requireCapability('admin.encuestas'), (req, res) => {
  const format = String(req.query.format || 'xlsx').toLowerCase()
  if (format === 'csv') {
    const csv = buildAudienceImportTemplateCsv()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-audiencia-encuesta.csv"')
    return res.send(csv)
  }
  const buf = buildAudienceImportTemplateXlsx()
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-audiencia-encuesta.xlsx"')
  return res.send(Buffer.from(buf))
})

/**
 * Resuelve un Excel/CSV de destinatarios contra usuarios del tenant.
 * No persiste: el admin confirma y guarda la encuesta con los userIds.
 */
router.post(
  '/audience-import',
  requireAuth,
  requireCapability('admin.encuestas'),
  (req, res, next) => {
    audienceUpload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  async (req, res, next) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: 'Subí un archivo Excel o CSV' })
      const parsed = parseAudienceImportFile(req.file.buffer, req.file.originalname || '')
      if (parsed.errors?.length && !parsed.rows.length) {
        return res.status(400).json({ error: parsed.errors[0].message, parseErrors: parsed.errors })
      }
      if (!parsed.rows.length) {
        return res.status(400).json({ error: 'El archivo no tiene filas de datos' })
      }
      const users = await User.find({ tenantId: req.tenant._id, activo: true })
        .select('_id usuario nombre apellido email idExterno dni cuil')
        .lean()
      const result = resolveAudienceImportRows(parsed.rows, users)
      res.json({
        ...result,
        headers: parsed.headers,
        format: parsed.format,
        parseErrors: parsed.errors || [],
      })
    } catch (e) {
      next(e)
    }
  },
)

/** Seed demo de encuestas (idempotente por externalId) para esta membresía. */
router.post('/seed-defaults', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const authorName =
      [req.user?.nombre, req.user?.apellido].filter(Boolean).join(' ') ||
      req.user?.usuario ||
      `Admin ${req.tenant.nombre || req.tenant.empCodigo || ''}`.trim()
    const result = await seedSurveysForTenant(req.tenant._id, {
      authorId: req.user?._id || null,
      authorName,
    })
    res.json({
      ok: true,
      message: `Seed listo: ${result.total} encuestas (${result.created} nuevas, ${result.updated} actualizadas)${
        result.responsesUpserted ? ` · ${result.responsesUpserted} respuestas demo` : ''
      }.`,
      ...result,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const questions = normalizeQuestions(body.questions, { tenant: req.tenant })
    const typeErr = assertQuestionsUseEnabledTypes(questions, req.tenant)
    if (typeErr) return res.status(400).json({ error: typeErr })
    if (!String(body.titulo || '').trim()) return res.status(400).json({ error: 'Título requerido' })
    const categoria = normalizeSurveyCategoryForTenant(body.categoria, req.tenant)
    if (!categoria) return res.status(400).json({ error: 'Categoría requerida' })
    const status = ['draft', 'published', 'closed'].includes(body.status) ? body.status : 'draft'
    const audience = normalizeAudience(body.audience)
    let audienceSnapshot = undefined
    let publishedAt = null
    if (status === 'published') {
      publishedAt = new Date()
      audienceSnapshot = await captureAudienceSnapshot(req.tenant._id, audience)
    }
    const media = resolveSurveyMediaFields(body)
    const doc = await Survey.create({
      tenantId: req.tenant._id,
      titulo: String(body.titulo).trim().slice(0, 160),
      descripcion: String(body.descripcion || '').slice(0, 4000),
      aiContext: String(body.aiContext || '').slice(0, 4000),
      imageUrl: media.imageUrl.slice(0, 500),
      imageUrls: media.imageUrls.map((u) => u.slice(0, 500)),
      videoUrl: media.videoUrl.slice(0, 500),
      status,
      questions,
      version: 1,
      audience,
      audienceSnapshot,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      anonymous: Boolean(body.anonymous),
      questionFlow: body.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
      showProgress: body.showProgress !== false,
      categoria,
      purpose: ['general', 'onboarding', 'offboarding'].includes(body.purpose) ? body.purpose : 'general',
      authorId: req.user._id,
      authorName: [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario,
      publishedAt,
    })
    if (status === 'published') {
      notifySurveyPublished({ survey: doc.toObject ? doc.toObject() : doc, tenant: req.tenant }).catch((err) =>
        console.warn('[surveys] notify on create:', err?.message || err),
      )
    }
    res.status(201).json({ survey: serializeSurvey(doc, { includeAdminFields: true }) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const doc = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrada' })
    const body = req.body || {}
    const wasPublished = doc.status === 'published'
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 160)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).slice(0, 4000)
    if (body.aiContext != null) doc.aiContext = String(body.aiContext).slice(0, 4000)
    if (body.imageUrl !== undefined || body.imageUrls !== undefined || body.videoUrl !== undefined) {
      const media = resolveSurveyMediaFields({
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : doc.imageUrl,
        imageUrls: body.imageUrls !== undefined ? body.imageUrls : doc.imageUrls,
        videoUrl: body.videoUrl !== undefined ? body.videoUrl : doc.videoUrl,
      })
      doc.imageUrl = media.imageUrl.slice(0, 500)
      doc.imageUrls = media.imageUrls.map((u) => u.slice(0, 500))
      doc.videoUrl = media.videoUrl.slice(0, 500)
    }
    if (body.questions) {
      const questions = normalizeQuestions(body.questions, { tenant: req.tenant })
      const typeErr = assertQuestionsUseEnabledTypes(questions, req.tenant, {
        allowTipos: (doc.questions || []).map((q) => q.tipo),
      })
      if (typeErr) return res.status(400).json({ error: typeErr })
      doc.questions = questions
      doc.version = (doc.version || 1) + 1
    }
    if (body.audience) doc.audience = normalizeAudience(body.audience)
    if (body.startsAt !== undefined) doc.startsAt = body.startsAt ? new Date(body.startsAt) : null
    if (body.endsAt !== undefined) doc.endsAt = body.endsAt ? new Date(body.endsAt) : null
    if (body.anonymous != null) doc.anonymous = Boolean(body.anonymous)
    if (body.questionFlow != null) {
      doc.questionFlow = body.questionFlow === 'one_by_one' ? 'one_by_one' : 'all'
    }
    if (body.showProgress != null) doc.showProgress = Boolean(body.showProgress)
    if (body.categoria !== undefined) {
      const categoria = normalizeSurveyCategoryForTenant(body.categoria, req.tenant)
      if (!categoria) return res.status(400).json({ error: 'Categoría inválida o faltante' })
      doc.categoria = categoria
    }
    if (body.purpose != null && ['general', 'onboarding', 'offboarding'].includes(body.purpose)) {
      doc.purpose = body.purpose
    }
    let newlyPublished = false
    if (['draft', 'published', 'closed'].includes(body.status)) {
      if (body.status === 'published' && doc.status !== 'published') {
        if (!normalizeSurveyCategoryForTenant(doc.categoria, req.tenant)) {
          return res.status(400).json({ error: 'Categoría requerida para publicar' })
        }
        doc.publishedAt = new Date()
        doc.audienceSnapshot = await captureAudienceSnapshot(req.tenant._id, doc.audience)
        newlyPublished = true
      }
      doc.status = body.status
    }
    // Permite refrescar el universo enviado sin cambiar estado
    if (body.refreshAudienceSnapshot) {
      doc.audienceSnapshot = await captureAudienceSnapshot(req.tenant._id, doc.audience)
    }
    await doc.save()
    if (newlyPublished || (body.renotifyAudience && wasPublished && doc.status === 'published')) {
      notifySurveyPublished({ survey: doc.toObject(), tenant: req.tenant }).catch((err) =>
        console.warn('[surveys] notify on publish:', err?.message || err),
      )
    }
    res.json({ survey: serializeSurvey(doc, { includeAdminFields: true }) })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const s = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!s) return res.status(404).json({ error: 'No encontrada' })
    const meta = surveysMeta(req.tenant)
    res.json({
      survey: {
        ...serializeSurvey(s, { includeAdminFields: true }),
        categoriaLabel: surveyCategoryLabel(s.categoria, req.tenant),
      },
      questionTypes: meta.questionTypes,
      questionTypeMeta: meta.questionTypeMeta,
      questionTypeMetaAll: meta.questionTypeMetaAll,
      categories: meta.categories,
    })
  } catch (e) {
    next(e)
  }
})

/** Clona encuesta como borrador (sin respuestas ni snapshot de audiencia). */
router.post('/:id/duplicate', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrada' })
    const src = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!src) return res.status(404).json({ error: 'No encontrada' })

    const authorName =
      [req.user?.nombre, req.user?.apellido].filter(Boolean).join(' ') ||
      req.user?.usuario ||
      ''
    const questions = normalizeQuestions(
      (src.questions || []).map((q, i) => ({
        ...q,
        id: qid() + i,
      })),
      { tenant: req.tenant },
    )
    const audience = normalizeAudience(src.audience)
    const media = resolveSurveyMediaFields({
      imageUrl: src.imageUrl,
      imageUrls: src.imageUrls,
      videoUrl: src.videoUrl,
    })

    const doc = await Survey.create({
      tenantId: req.tenant._id,
      titulo: `${String(src.titulo || 'Encuesta').trim()} (copia)`.slice(0, 160),
      descripcion: src.descripcion || '',
      aiContext: src.aiContext || '',
      imageUrl: media.imageUrl.slice(0, 500),
      imageUrls: media.imageUrls.map((u) => u.slice(0, 500)),
      videoUrl: media.videoUrl.slice(0, 500),
      status: 'draft',
      questions,
      version: 1,
      audience,
      audienceSnapshot: undefined,
      startsAt: src.startsAt || null,
      endsAt: src.endsAt || null,
      anonymous: Boolean(src.anonymous),
      questionFlow: src.questionFlow === 'one_by_one' ? 'one_by_one' : 'all',
      showProgress: src.showProgress !== false,
      categoria: normalizeSurveyCategoryForTenant(src.categoria, req.tenant) || 'general',
      purpose: ['general', 'onboarding', 'offboarding'].includes(src.purpose) ? src.purpose : 'general',
      authorId: req.user._id,
      authorName,
      publishedAt: null,
      externalId: '',
    })

    res.status(201).json({
      survey: serializeSurvey(doc, { includeAdminFields: true }),
      message: 'Copia creada en borrador',
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/results', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const bundle = await loadSurveyBundle(req, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'No encontrada' })
    const { survey: s, responses: allResponses, participation } = bundle

    const areaId = String(req.query.areaId || '').trim()
    const groupId = String(req.query.groupId || '').trim()
    const grupo = String(req.query.grupo || '').trim()

    let responses = allResponses
    let segmentLabel = 'Toda la audiencia enviada'
    let segmentInvited = participation.invited

    if (areaId || groupId) {
      const userFilter = { tenantId: req.tenant._id, activo: true }
      if (areaId) userFilter.areaId = areaId
      if (groupId) userFilter.groupIds = groupId
      const users = await User.find(userFilter).select('_id').lean()
      const allowed = new Set(users.map((u) => String(u._id)))
      responses = allResponses.filter((r) => allowed.has(String(r.userId)))
      segmentInvited = users.length
      segmentLabel = [
        areaId ? `Área filtrada` : null,
        groupId ? `Grupo filtrado` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    }

    let surveyForAgg = s
    if (grupo) {
      surveyForAgg = {
        ...s,
        questions: (s.questions || []).filter((q) => String(q.grupo || 'General') === grupo),
      }
    }

    const byQuestion = buildByQuestion(surveyForAgg, responses)
    const byGroup = buildByQuestionGroup(s, responses)
    const overview = buildSurveyOverview(surveyForAgg, responses, {
      invited: segmentInvited,
      answered: responses.length,
      pending: Math.max(0, segmentInvited - responses.length),
      rate: segmentInvited ? Math.round((responses.length / segmentInvited) * 1000) / 10 : null,
    })

    const includeIndividuals = String(req.query.individuals || '1') !== '0'
    let individuals = []
    if (includeIndividuals) {
      const users = s.anonymous
        ? []
        : await User.find({
            _id: { $in: responses.map((r) => r.userId).filter(Boolean) },
            tenantId: req.tenant._id,
          })
            .select('nombre apellido usuario email areaId groupIds')
            .lean()
      const byUser = Object.fromEntries(users.map((u) => [String(u._id), u]))
      const qMeta = new Map(
        (s.questions || []).map((q) => [
          q.id,
          { texto: q.texto, tipo: q.tipo, grupo: q.grupo || 'General', order: true },
        ]),
      )
      const questionOrder = (s.questions || []).map((q) => q.id)

      individuals = responses.slice(0, 500).map((r, idx) => {
        const u = byUser[String(r.userId)]
        const answerMap = new Map((r.answers || []).map((a) => [String(a.questionId), a.value]))
        const orderedIds = [
          ...questionOrder.filter((id) => answerMap.has(id)),
          ...[...answerMap.keys()].filter((id) => !questionOrder.includes(id)),
        ]
        const answersDetailed = orderedIds
          .filter((qid) => !grupo || String(qMeta.get(qid)?.grupo || 'General') === grupo)
          .map((qid) => {
            const meta = qMeta.get(qid) || { texto: qid, tipo: 'text', grupo: 'General' }
            return {
              questionId: qid,
              texto: meta.texto,
              tipo: meta.tipo,
              grupo: meta.grupo,
              value: answerMap.get(qid),
            }
          })

        return {
          id: String(r._id),
          submittedAt: r.submittedAt,
          surveyVersion: r.surveyVersion,
          respondent: s.anonymous
            ? { anonymous: true, name: `Respuesta #${idx + 1}`, email: '', usuario: '' }
            : u
              ? {
                  anonymous: false,
                  id: String(u._id),
                  name: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
                  email: u.email || '',
                  usuario: u.usuario || '',
                  areaId: u.areaId ? String(u.areaId) : null,
                }
              : {
                  anonymous: false,
                  id: String(r.userId),
                  name: 'Usuario',
                  email: '',
                  usuario: '',
                },
          answers: (r.answers || []).map((a) => ({ questionId: a.questionId, value: a.value })),
          answersDetailed,
        }
      })
    }

    const grupos = [...new Set((s.questions || []).map((q) => q.grupo || 'General'))]

    res.json({
      survey: serializeSurvey(s, { includeAdminFields: true }),
      participation,
      segment: {
        label: segmentLabel,
        areaId: areaId || null,
        groupId: groupId || null,
        grupo: grupo || null,
        invited: segmentInvited,
        answered: responses.length,
        rate: segmentInvited ? Math.round((responses.length / segmentInvited) * 1000) / 10 : null,
      },
      overview,
      byQuestion,
      byGroup,
      grupos,
      individuals,
      aiAvailable: aiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/** Estadísticas de participación (no resultados de contenido). */
router.get('/:id/stats', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const bundle = await loadSurveyBundle(req, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'No encontrada' })
    const { survey: s, responses, participation } = bundle
    const stats = buildParticipationStats(responses, participation.invited)
    res.json({
      survey: serializeSurvey(s, { includeQuestions: false, includeAdminFields: true }),
      participation,
      stats,
      note: participation.fromSnapshot
        ? 'El universo enviado es el congelado al publicar.'
        : 'Todavía no hay snapshot: se usa el conteo live de la audiencia actual.',
    })
  } catch (e) {
    next(e)
  }
})

/** Descarga de cuestionarios respondidos (todo o subset de preguntas). */
router.get('/:id/export', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const bundle = await loadSurveyBundle(req, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'No encontrada' })
    const { survey: s, responses } = bundle
    const questionIds = parseQuestionIds(req.query.questionIds)
    const includeRespondents = String(req.query.includeRespondents || '0') === '1' && !s.anonymous
    const format = String(req.query.format || 'csv').toLowerCase()

    let usersById = {}
    if (includeRespondents) {
      const users = await User.find({
        _id: { $in: responses.map((r) => r.userId).filter(Boolean) },
        tenantId: req.tenant._id,
      })
        .select('nombre apellido usuario email')
        .lean()
      usersById = Object.fromEntries(users.map((u) => [String(u._id), u]))
    }

    const packed = buildExportRows(s, responses, usersById, {
      questionIds,
      includeRespondents,
    })
    const slug = String(s.titulo || 'encuesta')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .slice(0, 40)

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${slug}-respuestas.json"`)
      return res.json({
        survey: { id: String(s._id), titulo: s.titulo, version: s.version },
        exportedAt: new Date().toISOString(),
        questionIds: packed.questions.map((q) => q.id),
        count: packed.rows.length,
        rows: packed.rows,
      })
    }

    const csv = rowsToCsv(packed)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-respuestas.csv"`)
    res.send(`\uFEFF${csv}`)
  } catch (e) {
    next(e)
  }
})

/**
 * Análisis IA de la encuesta completa (agregados + muestras abiertas).
 * Body: { provider?, focus?, questionIds? }
 */
router.post('/:id/analyze', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const bundle = await loadSurveyBundle(req, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'No encontrada' })
    const { survey: s, responses, participation } = bundle
    const body = req.body || {}
    const result = await analyzeSurveyWithAi({
      survey: s,
      responses,
      participation,
      tenant: req.tenant,
      provider: body.provider || 'auto',
      focus: body.focus || '',
      questionIds: parseQuestionIds(body.questionIds),
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

export default router
