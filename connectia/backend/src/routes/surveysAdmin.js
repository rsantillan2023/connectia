import { Router } from 'express'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { User } from '../models/User.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, usersFilterForAudience } from '../lib/audience.js'
import { SURVEY_QUESTION_TYPES, SURVEY_QUESTION_TYPE_META, needsOptions } from '../lib/surveyQuestions.js'
import {
  buildByQuestion,
  buildByQuestionGroup,
  buildExportRows,
  buildParticipationStats,
  buildSurveyOverview,
  rowsToCsv,
} from '../lib/surveyAnalytics.js'
import { analyzeSurveyWithAi, aiConfigured, generateSurveyDraftFromPrompt } from '../services/surveyAi.js'
import { notifySurveyPublished } from '../services/notifySurvey.js'
import { serializeSurvey } from './surveys.js'

const router = Router()

function qid() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeQuestions(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((q, i) => {
      const tipo = SURVEY_QUESTION_TYPES.includes(q?.tipo) ? q.tipo : 'text'
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
      }
    })
    .filter((q) => q.texto)
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
        return {
          ...serializeSurvey(s, { includeQuestions: false }),
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

    res.json({
      items: withParticipation,
      questionTypes: SURVEY_QUESTION_TYPES,
      questionTypeMeta: SURVEY_QUESTION_TYPE_META,
      aiConfigured: aiConfigured(),
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

router.post('/', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const questions = normalizeQuestions(body.questions)
    if (!String(body.titulo || '').trim()) return res.status(400).json({ error: 'Título requerido' })
    const status = ['draft', 'published', 'closed'].includes(body.status) ? body.status : 'draft'
    const audience = normalizeAudience(body.audience)
    let audienceSnapshot = undefined
    let publishedAt = null
    if (status === 'published') {
      publishedAt = new Date()
      audienceSnapshot = await captureAudienceSnapshot(req.tenant._id, audience)
    }
    const doc = await Survey.create({
      tenantId: req.tenant._id,
      titulo: String(body.titulo).trim().slice(0, 160),
      descripcion: String(body.descripcion || '').slice(0, 4000),
      status,
      questions,
      version: 1,
      audience,
      audienceSnapshot,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      anonymous: Boolean(body.anonymous),
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
    res.status(201).json({ survey: serializeSurvey(doc) })
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
    if (body.questions) {
      doc.questions = normalizeQuestions(body.questions)
      doc.version = (doc.version || 1) + 1
    }
    if (body.audience) doc.audience = normalizeAudience(body.audience)
    if (body.startsAt !== undefined) doc.startsAt = body.startsAt ? new Date(body.startsAt) : null
    if (body.endsAt !== undefined) doc.endsAt = body.endsAt ? new Date(body.endsAt) : null
    if (body.anonymous != null) doc.anonymous = Boolean(body.anonymous)
    if (body.purpose != null && ['general', 'onboarding', 'offboarding'].includes(body.purpose)) {
      doc.purpose = body.purpose
    }
    let newlyPublished = false
    if (['draft', 'published', 'closed'].includes(body.status)) {
      if (body.status === 'published' && doc.status !== 'published') {
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
    res.json({ survey: serializeSurvey(doc) })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, requireCapability('admin.encuestas'), async (req, res, next) => {
  try {
    const s = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!s) return res.status(404).json({ error: 'No encontrada' })
    res.json({ survey: serializeSurvey(s), questionTypes: SURVEY_QUESTION_TYPES, questionTypeMeta: SURVEY_QUESTION_TYPE_META })
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
      survey: serializeSurvey(s),
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
      survey: serializeSurvey(s, { includeQuestions: false }),
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
