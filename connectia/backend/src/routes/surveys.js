import { Router } from 'express'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { requireAuth } from '../middleware/auth.js'
import { audienceFilterForUser, userMatchesAudience, serializeAudience } from '../lib/audience.js'
import { normalizeAnswerValue } from '../lib/surveyQuestions.js'
import { markSurveyNotificationsRead } from '../services/notifySurvey.js'
import { closeOnboardingMilestonesForSurvey } from '../services/onboardingSurveyHook.js'

const router = Router()

function isSurveyOpen(s, now = new Date()) {
  if (s.status !== 'published') return false
  if (s.startsAt && new Date(s.startsAt) > now) return false
  if (s.endsAt && new Date(s.endsAt) < now) return false
  return true
}

function serializeSurvey(s, { includeQuestions = true, answered = false } = {}) {
  const questions = includeQuestions
    ? (s.questions || []).map((q) => ({
        id: q.id,
        texto: q.texto,
        tipo: q.tipo,
        required: q.required !== false,
        opciones: q.opciones || [],
        grupo: q.grupo || 'General',
      }))
    : undefined
  return {
    id: String(s._id),
    titulo: s.titulo,
    descripcion: s.descripcion || '',
    status: s.status,
    version: s.version || 1,
    audience: serializeAudience(s.audience),
    audienceSnapshot: s.audienceSnapshot
      ? {
          invitedCount: s.audienceSnapshot.invitedCount,
          capturedAt: s.audienceSnapshot.capturedAt,
          mode: s.audienceSnapshot.mode || '',
        }
      : null,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    anonymous: Boolean(s.anonymous),
    purpose: s.purpose || 'general',
    authorName: s.authorName || '',
    publishedAt: s.publishedAt,
    questions,
    questionCount: (s.questions || []).length,
    answered: Boolean(answered),
    open: isSurveyOpen(s),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function validateAnswers(survey, answers) {
  const map = new Map((Array.isArray(answers) ? answers : []).map((a) => [String(a.questionId), a.value]))
  const out = []
  for (const q of survey.questions || []) {
    const raw = map.get(q.id)
    const missing = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && !raw.length)
    if (q.required && missing) {
      const err = new Error(`Falta responder: ${q.texto}`)
      err.status = 400
      throw err
    }
    if (missing) continue
    out.push({ questionId: q.id, value: normalizeAnswerValue(q, raw) })
  }
  return out
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const now = new Date()
    const items = await Survey.find({
      tenantId: req.tenant._id,
      status: 'published',
      $and: [
        audienceFilterForUser(req.user),
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ publishedAt: -1 })
      .lean()

    const ids = items.map((s) => s._id)
    const mine = await SurveyResponse.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      surveyId: { $in: ids },
    }).lean()
    const answered = new Set(mine.map((r) => String(r.surveyId)))

    res.json({
      items: items.map((s) =>
        serializeSurvey(s, { includeQuestions: false, answered: answered.has(String(s._id)) }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const s = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!s || s.status === 'draft') return res.status(404).json({ error: 'Encuesta no encontrada' })
    if (!userMatchesAudience(req.user, s.audience)) {
      return res.status(404).json({ error: 'Encuesta no encontrada' })
    }
    const resp = await SurveyResponse.findOne({ surveyId: s._id, userId: req.user._id }).lean()
    res.json({
      survey: serializeSurvey(s, { answered: Boolean(resp) }),
      myResponse: resp
        ? { answers: resp.answers, submittedAt: resp.submittedAt, surveyVersion: resp.surveyVersion }
        : null,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/respond', requireAuth, async (req, res, next) => {
  try {
    const s = await Survey.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!s || !isSurveyOpen(s)) return res.status(400).json({ error: 'La encuesta no está abierta' })
    if (!userMatchesAudience(req.user, s.audience)) {
      return res.status(403).json({ error: 'No tenés acceso a esta encuesta' })
    }
    const existing = await SurveyResponse.findOne({ surveyId: s._id, userId: req.user._id })
    if (existing) return res.status(409).json({ error: 'Ya respondiste esta encuesta' })
    const answers = validateAnswers(s, req.body?.answers)
    const doc = await SurveyResponse.create({
      tenantId: req.tenant._id,
      surveyId: s._id,
      surveyVersion: s.version || 1,
      userId: req.user._id,
      answers,
      submittedAt: new Date(),
    })
    markSurveyNotificationsRead({
      tenantId: req.tenant._id,
      userId: req.user._id,
      surveyId: s._id,
    }).catch(() => {})
    try {
      await closeOnboardingMilestonesForSurvey({
        tenantId: req.tenant._id,
        userId: req.user._id,
        surveyId: s._id,
        actorId: req.user._id,
        actorName: [req.user.nombre, req.user.apellido].filter(Boolean).join(' ').trim() || req.user.email || '',
      })
    } catch (hookErr) {
      console.warn('[surveys] onboarding hook:', hookErr?.message || hookErr)
    }
    res.status(201).json({ id: String(doc._id), submittedAt: doc.submittedAt })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Ya respondiste esta encuesta' })
    next(e)
  }
})

export { serializeSurvey, isSurveyOpen }
export default router
