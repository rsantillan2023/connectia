import { Router } from 'express'
import mongoose from 'mongoose'
import { OnboardingTemplate } from '../models/OnboardingTemplate.js'
import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { Survey } from '../models/Survey.js'
import { User } from '../models/User.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import {
  serializeTemplate,
  serializeInstance,
  applyTemplatePatch,
  normalizeMilestoneDefs,
  snapshotMilestonesFromTemplate,
  originKeyFor,
  completeMilestoneOnDoc,
  TEMPLATE_KINDS,
} from '../lib/onboarding.js'
import { notifyOnboardingAssigned } from '../services/notifyOnboarding.js'

const router = Router()
router.use(requireAuth, requireCapability('admin.onboarding'))

function displayName(u) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || u?.email || 'Usuario'
}

router.get('/templates', async (req, res, next) => {
  try {
    const q = { tenantId: req.tenant._id }
    if (req.query.kind && TEMPLATE_KINDS.includes(req.query.kind)) q.kind = req.query.kind
    if (req.query.status) q.status = String(req.query.status)
    const items = await OnboardingTemplate.find(q).sort({ updatedAt: -1 }).lean()
    res.json({ items: items.map(serializeTemplate) })
  } catch (e) {
    next(e)
  }
})

router.get('/templates/:id', async (req, res, next) => {
  try {
    const doc = await OnboardingTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'Plantilla no encontrada' })
    res.json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

router.post('/templates', async (req, res, next) => {
  try {
    const nombre = String(req.body?.nombre || '').trim()
    if (!nombre) return res.status(400).json({ error: 'nombre obligatorio' })
    const kind = TEMPLATE_KINDS.includes(req.body?.kind) ? req.body.kind : 'onboarding'
    const milestones = normalizeMilestoneDefs(req.body?.milestones || [])
    for (const m of milestones) {
      if (m.tipo === 'survey' && m.surveyId) {
        const ok = await Survey.exists({ _id: m.surveyId, tenantId: req.tenant._id })
        if (!ok) return res.status(400).json({ error: `Encuesta inválida en hito ${m.key}` })
      }
    }
    const doc = await OnboardingTemplate.create({
      tenantId: req.tenant._id,
      kind,
      nombre,
      descripcion: String(req.body?.descripcion || '').trim(),
      milestones,
      slaDias: req.body?.slaDias != null ? Number(req.body.slaDias) : null,
      status: 'draft',
      authorId: req.user._id,
      authorName: displayName(req.user),
    })
    res.status(201).json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/templates/:id', async (req, res, next) => {
  try {
    const doc = await OnboardingTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Plantilla no encontrada' })
    if (Array.isArray(req.body?.milestones)) {
      const milestones = normalizeMilestoneDefs(req.body.milestones)
      for (const m of milestones) {
        if (m.tipo === 'survey' && m.surveyId) {
          const ok = await Survey.exists({ _id: m.surveyId, tenantId: req.tenant._id })
          if (!ok) return res.status(400).json({ error: `Encuesta inválida en hito ${m.key}` })
        }
      }
      req.body.milestones = milestones
    }
    applyTemplatePatch(doc, req.body)
    if (doc.status === 'published' && Array.isArray(req.body?.milestones)) {
      doc.version = (doc.version || 1) + 1
    }
    await doc.save()
    res.json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

router.post('/templates/:id/publish', async (req, res, next) => {
  try {
    const doc = await OnboardingTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Plantilla no encontrada' })
    if (!(doc.milestones || []).length) {
      return res.status(400).json({ error: 'La plantilla necesita al menos un hito' })
    }
    doc.status = 'published'
    doc.publishedAt = new Date()
    doc.activo = true
    await doc.save()
    res.json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

router.post('/templates/:id/archive', async (req, res, next) => {
  try {
    const doc = await OnboardingTemplate.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Plantilla no encontrada' })
    doc.status = 'archived'
    doc.activo = false
    await doc.save()
    res.json({ template: serializeTemplate(doc) })
  } catch (e) {
    next(e)
  }
})

/** Listado de instancias / incorporaciones */
router.get('/instances', async (req, res, next) => {
  try {
    const q = { tenantId: req.tenant._id }
    if (req.query.kind && TEMPLATE_KINDS.includes(req.query.kind)) q.kind = req.query.kind
    if (req.query.status) q.status = String(req.query.status)
    if (req.query.userId && mongoose.isValidObjectId(req.query.userId)) q.userId = req.query.userId
    const items = await OnboardingInstance.find(q).sort({ updatedAt: -1 }).limit(200)
    res.json({ items: items.map((d) => serializeInstance(d)) })
  } catch (e) {
    next(e)
  }
})

router.get('/instances/:id', async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    res.json({ instance: serializeInstance(doc, { includeHistory: true }) })
  } catch (e) {
    next(e)
  }
})

/** Alta de incorporación / inicio de proceso */
router.post('/instances', async (req, res, next) => {
  try {
    const templateId = req.body?.templateId
    const userId = req.body?.userId
    if (!mongoose.isValidObjectId(templateId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'templateId y userId obligatorios' })
    }
    const template = await OnboardingTemplate.findOne({
      _id: templateId,
      tenantId: req.tenant._id,
      status: 'published',
      activo: true,
    })
    if (!template) return res.status(404).json({ error: 'Plantilla publicada no encontrada' })
    const user = await User.findOne({ _id: userId, tenantId: req.tenant._id })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const originKey = originKeyFor({
      userId,
      kind: template.kind,
      templateId: template._id,
    })
    const existing = await OnboardingInstance.findOne({ tenantId: req.tenant._id, originKey })
    if (existing && !['cancelled', 'completed', 'revoked'].includes(existing.status)) {
      return res.status(409).json({
        error: 'Ya hay un proceso activo para este usuario y plantilla',
        instance: serializeInstance(existing),
      })
    }

    const startedAt = new Date()
    let dueAt = null
    if (template.slaDias != null) {
      dueAt = new Date(startedAt.getTime() + Number(template.slaDias) * 86400000)
    }
    const legajo = await EmployeeLegajo.findOne({ tenantId: req.tenant._id, userId: user._id }).lean()

    const doc = await OnboardingInstance.create({
      tenantId: req.tenant._id,
      kind: template.kind,
      templateId: template._id,
      templateName: template.nombre,
      templateVersion: template.version || 1,
      milestones: snapshotMilestonesFromTemplate(template, startedAt),
      status: 'in_progress',
      userId: user._id,
      userName: displayName(user),
      legajoId: legajo?._id || null,
      progressPercent: 0,
      startedAt,
      dueAt,
      originKey: existing
        ? `${originKey}:${Date.now()}`
        : originKey,
      history: [
        {
          at: startedAt,
          actorId: req.user._id,
          actorName: displayName(req.user),
          action: 'started',
          detail: template.nombre,
        },
      ],
    })
    notifyOnboardingAssigned({
      tenantId: req.tenant._id,
      userId: user._id,
      instance: doc,
      tenant: req.tenant,
    }).catch((err) => console.warn('[onboarding] notify:', err?.message || err))
    res.status(201).json({ instance: serializeInstance(doc, { includeHistory: true }) })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Proceso duplicado' })
    next(e)
  }
})

router.post('/instances/:id/milestones/:key/complete', async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    if (!['pending', 'in_progress'].includes(doc.status)) {
      return res.status(400).json({ error: 'El proceso no admite cambios' })
    }
    completeMilestoneOnDoc(doc, req.params.key, {
      actorId: req.user._id,
      actorName: displayName(req.user),
      notes: req.body?.notes,
    })
    await doc.save()
    res.json({ instance: serializeInstance(doc, { includeHistory: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/instances/:id/cancel', async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    doc.status = 'cancelled'
    doc.history.push({
      at: new Date(),
      actorId: req.user._id,
      actorName: displayName(req.user),
      action: 'cancelled',
      detail: String(req.body?.reason || '').slice(0, 300),
    })
    await doc.save()
    res.json({ instance: serializeInstance(doc, { includeHistory: true }) })
  } catch (e) {
    next(e)
  }
})

/**
 * Offboarding: revoca accesos del usuario (activo=false, limpia refresh tokens).
 */
router.post('/instances/:id/revoke-access', async (req, res, next) => {
  try {
    const doc = await OnboardingInstance.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Proceso no encontrado' })
    if (doc.kind !== 'offboarding') {
      return res.status(400).json({ error: 'Solo aplica a procesos de offboarding' })
    }
    const user = await User.findOne({ _id: doc.userId, tenantId: req.tenant._id })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    user.activo = false
    user.refreshTokens = []
    await user.save()

    const legajo = await EmployeeLegajo.findOne({ tenantId: req.tenant._id, userId: user._id })
    if (legajo) {
      legajo.estadoLaboral = 'baja'
      await legajo.save()
    }

    doc.accessRevokedAt = new Date()
    doc.status = 'revoked'
    doc.completedAt = new Date()
    doc.progressPercent = 100
    doc.history.push({
      at: new Date(),
      actorId: req.user._id,
      actorName: displayName(req.user),
      action: 'access_revoked',
      detail: 'Usuario desactivado y tokens revocados',
    })
    await doc.save()
    res.json({ instance: serializeInstance(doc, { includeHistory: true }), userId: String(user._id) })
  } catch (e) {
    next(e)
  }
})

/** Personas del tenant para iniciar incorporación */
router.get('/user-options', async (req, res, next) => {
  try {
    const items = await User.find({ tenantId: req.tenant._id, activo: true })
      .select('nombre apellido usuario email')
      .sort({ apellido: 1, nombre: 1 })
      .limit(300)
      .lean()
    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        usuario: u.usuario || '',
        email: u.email || '',
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Encuestas publicadas del tenant para selector de hitos */
router.get('/survey-options', async (req, res, next) => {
  try {
    const purpose = req.query.purpose ? String(req.query.purpose) : null
    const q = { tenantId: req.tenant._id, status: { $in: ['published', 'draft'] } }
    if (purpose) q.purpose = purpose
    const items = await Survey.find(q)
      .select('titulo status purpose version publishedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()
    res.json({
      items: items.map((s) => ({
        id: String(s._id),
        titulo: s.titulo,
        status: s.status,
        purpose: s.purpose || 'general',
        version: s.version || 1,
        publishedAt: s.publishedAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
