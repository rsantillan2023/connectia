import { Router } from 'express'
import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeInstance, completeMilestoneOnDoc } from '../lib/onboarding.js'
import { syncSurveyMilestonesForUser } from '../services/onboardingSurveyHook.js'

const router = Router()

function displayName(u) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || u?.email || 'Usuario'
}

/** Mis procesos de bienvenida / egreso */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    await syncSurveyMilestonesForUser({
      tenantId: req.tenant._id,
      userId: req.user._id,
    }).catch(() => {})
    const items = await OnboardingInstance.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: { $in: ['pending', 'in_progress', 'completed'] },
    }).sort({ updatedAt: -1 })
    res.json({ items: items.map((d) => serializeInstance(d)) })
  } catch (e) {
    next(e)
  }
})

router.get('/mine/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    res.json({ instance: serializeInstance(doc, { includeHistory: true }) })
  } catch (e) {
    next(e)
  }
})

/** Completar hito task/content/checklist (survey se cierra al responder §15) */
router.post('/mine/:id/milestones/:key/complete', requireAuth, async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    if (!['pending', 'in_progress'].includes(doc.status)) {
      return res.status(400).json({ error: 'El proceso no admite cambios' })
    }
    const milestones = doc.milestones || []
    const m = milestones.find((x) => x.key === req.params.key)
    if (m?.tipo === 'survey') {
      return res.status(400).json({
        error: 'Este hito se completa respondiendo la encuesta vinculada',
        surveyId: m.surveyId ? String(m.surveyId) : null,
      })
    }
    completeMilestoneOnDoc(doc, req.params.key, {
      actorId: req.user._id,
      actorName: displayName(req.user),
      notes: req.body?.notes,
    })
    await doc.save()
    res.json({ instance: serializeInstance(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
