import { Router } from 'express'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { FieldForm } from '../models/FieldForm.js'
import { FieldAssignment } from '../models/FieldAssignment.js'
import { FieldSubmission } from '../models/FieldSubmission.js'
import {
  evaluateFieldLogic,
  normalizeAnswerValue,
} from '../lib/fieldFormQuestions.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()

function requireRelCap(req, res, next) {
  if (
    !hasCapability(
      req.user,
      req.tenant,
      'relevamientos',
      'campo.relevamientos',
      'relevamientos.ejecutar',
    )
  ) {
    return res.status(403).json({ error: 'Módulo Relevamientos no disponible' })
  }
  next()
}

router.use(requireAuth, requireRelCap)

function todayYmd(tz) {
  try {
    if (tz) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
    }
  } catch {
    /* fallthrough */
  }
  return new Date().toISOString().slice(0, 10)
}

function serializeAssignment(doc, formTitle) {
  return {
    id: String(doc._id),
    day: doc.day,
    formId: String(doc.formId),
    formVersion: doc.formVersion,
    formTitle: formTitle || doc.formSnapshot?.titulo || '',
    routeId: doc.routeId ? String(doc.routeId) : null,
    stopId: doc.stopId || '',
    stopLabel: doc.stopLabel || '',
    modality: doc.modality,
    status: doc.status,
    order: doc.order ?? 0,
    windowStart: doc.windowStart || '',
    windowEnd: doc.windowEnd || '',
    notes: doc.notes || '',
    questions: doc.formSnapshot?.questions || [],
  }
}

/** GET /api/relevamientos/hoy — qué tengo hoy */
router.get('/hoy', async (req, res, next) => {
  try {
    const tz = req.tenant?.timezone || req.tenant?.metadata?.timezone || ''
    const day = String(req.query.day || todayYmd(tz)).slice(0, 10)
    const list = await FieldAssignment.find({
      tenantId: req.tenant._id,
      operatorId: req.user._id,
      day,
    })
      .sort({ order: 1, createdAt: 1 })
      .limit(200)
    res.json({
      day,
      items: list.map((a) => serializeAssignment(a)),
      pending: list.filter((a) => a.status === 'pending' || a.status === 'in_progress').length,
      done: list.filter((a) => ['submitted', 'synced'].includes(a.status)).length,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/assignments/:id', async (req, res, next) => {
  try {
    const doc = await FieldAssignment.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      operatorId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Asignación no encontrada' })
    res.json(serializeAssignment(doc))
  } catch (e) {
    next(e)
  }
})

router.post('/assignments/:id/start', async (req, res, next) => {
  try {
    const doc = await FieldAssignment.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      operatorId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Asignación no encontrada' })
    if (['submitted', 'synced', 'skipped'].includes(doc.status)) {
      return res.status(409).json({ error: 'Asignación ya cerrada', status: doc.status })
    }
    if (doc.status === 'pending') {
      doc.status = 'in_progress'
      await doc.save()
    }
    res.json(serializeAssignment(doc))
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/relevamientos/assignments/:id/submit
 * body: { answers, evidences?, clientMutationId?, offline? }
 */
router.post('/assignments/:id/submit', async (req, res, next) => {
  try {
    const doc = await FieldAssignment.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      operatorId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Asignación no encontrada' })
    if (['submitted', 'synced'].includes(doc.status)) {
      return res.status(409).json({ error: 'Ya enviado', status: doc.status })
    }

    const clientMutationId = String(req.body?.clientMutationId || '').slice(0, 120)
    if (clientMutationId) {
      const existing = await FieldSubmission.findOne({
        tenantId: req.tenant._id,
        clientMutationId,
      })
      if (existing) {
        return res.json({
          ok: true,
          idempotent: true,
          submissionId: String(existing._id),
          assignmentId: String(doc._id),
          status: doc.status,
        })
      }
    }

    const questions = doc.formSnapshot?.questions || []
    const rawAnswers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
    const { visible } = evaluateFieldLogic(questions, rawAnswers)
    const normalized = {}
    const evidences = []
    let checkin = null
    let checkout = null

    for (const q of visible) {
      const raw = rawAnswers[q.id]
      if ((raw === undefined || raw === null || raw === '') && q.requiredEffective) {
        return res.status(400).json({ error: `Falta respuesta: ${q.texto}`, questionId: q.id })
      }
      if (raw === undefined || raw === null || raw === '') continue
      try {
        const val = normalizeAnswerValue(q, raw)
        if (val == null) {
          if (q.requiredEffective) {
            return res.status(400).json({ error: `Falta respuesta: ${q.texto}`, questionId: q.id })
          }
          continue
        }
        normalized[q.id] = val
        if (q.tipo === 'multimedia' && val.url) {
          evidences.push({
            questionId: q.id,
            url: val.url,
            mime: val.mime || '',
            name: val.name || '',
          })
        }
        if (q.tipo === 'facility_checkin') checkin = val
        if (q.tipo === 'facility_checkout') checkout = val
      } catch (err) {
        err.status = err.status || 400
        throw err
      }
    }

    const submission = await FieldSubmission.create({
      tenantId: req.tenant._id,
      assignmentId: doc._id,
      formId: doc.formId,
      formVersion: doc.formVersion,
      operatorId: req.user._id,
      answers: normalized,
      evidences,
      facility: { checkin, checkout },
      clientMutationId,
      offline: Boolean(req.body?.offline),
      submittedAt: new Date(),
    })

    doc.status = 'synced'
    doc.submittedAt = submission.submittedAt
    await doc.save()

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'relevamiento_submitted',
      entityId: submission._id,
    })

    res.status(201).json({
      ok: true,
      submissionId: String(submission._id),
      assignmentId: String(doc._id),
      status: doc.status,
    })
  } catch (e) {
    if (e?.code === 11000 && req.body?.clientMutationId) {
      const existing = await FieldSubmission.findOne({
        tenantId: req.tenant._id,
        clientMutationId: String(req.body.clientMutationId),
      })
      if (existing) {
        return res.json({
          ok: true,
          idempotent: true,
          submissionId: String(existing._id),
          assignmentId: String(existing.assignmentId),
        })
      }
    }
    next(e)
  }
})

/** Sync batch offline */
router.post('/sync', async (req, res, next) => {
  try {
    const ops = Array.isArray(req.body?.ops) ? req.body.ops : []
    const results = []
    for (const op of ops.slice(0, 50)) {
      const assignmentId = op.assignmentId
      const clientMutationId = String(op.clientMutationId || '').slice(0, 120)
      try {
        if (!assignmentId) {
          results.push({ clientMutationId, ok: false, error: 'assignmentId requerido' })
          continue
        }
        const doc = await FieldAssignment.findOne({
          _id: assignmentId,
          tenantId: req.tenant._id,
          operatorId: req.user._id,
        })
        if (!doc) {
          results.push({ clientMutationId, ok: false, error: 'not_found' })
          continue
        }
        if (['submitted', 'synced'].includes(doc.status)) {
          results.push({ clientMutationId, ok: true, idempotent: true, status: doc.status })
          continue
        }
        if (clientMutationId) {
          const existing = await FieldSubmission.findOne({
            tenantId: req.tenant._id,
            clientMutationId,
          })
          if (existing) {
            results.push({
              clientMutationId,
              ok: true,
              idempotent: true,
              submissionId: String(existing._id),
            })
            continue
          }
        }
        const questions = doc.formSnapshot?.questions || []
        const rawAnswers = op.answers && typeof op.answers === 'object' ? op.answers : {}
        const { visible } = evaluateFieldLogic(questions, rawAnswers)
        const normalized = {}
        for (const q of visible) {
          const raw = rawAnswers[q.id]
          if ((raw === undefined || raw === null || raw === '') && q.requiredEffective) {
            results.push({ clientMutationId, ok: false, error: `Falta: ${q.texto}` })
            continue
          }
          if (raw === undefined || raw === null || raw === '') continue
          normalized[q.id] = normalizeAnswerValue(q, raw)
        }
        if (results.length && results[results.length - 1].ok === false) continue

        const submission = await FieldSubmission.create({
          tenantId: req.tenant._id,
          assignmentId: doc._id,
          formId: doc.formId,
          formVersion: doc.formVersion,
          operatorId: req.user._id,
          answers: normalized,
          evidences: [],
          facility: {},
          clientMutationId,
          offline: true,
          submittedAt: op.submittedAt ? new Date(op.submittedAt) : new Date(),
        })
        doc.status = 'synced'
        doc.submittedAt = submission.submittedAt
        await doc.save()
        results.push({
          clientMutationId,
          ok: true,
          submissionId: String(submission._id),
          status: doc.status,
        })
      } catch (err) {
        results.push({
          clientMutationId,
          ok: false,
          error: err.message || 'error',
        })
      }
    }
    res.json({ results })
  } catch (e) {
    next(e)
  }
})

/** Espontáneo / on-demand: crear asignación propia para hoy y devolverla */
router.post('/spontaneous', async (req, res, next) => {
  try {
    const form = await FieldForm.findOne({
      _id: req.body?.formId,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!form) return res.status(400).json({ error: 'Formulario publicado requerido' })
    const tz = req.tenant?.timezone || req.tenant?.metadata?.timezone || ''
    const day = String(req.body?.day || todayYmd(tz)).slice(0, 10)
    const doc = await FieldAssignment.create({
      tenantId: req.tenant._id,
      day,
      operatorId: req.user._id,
      formId: form._id,
      formVersion: form.version || 1,
      formSnapshot: {
        titulo: form.titulo,
        questions: form.questions,
        version: form.version || 1,
      },
      modality: 'spontaneous',
      status: 'in_progress',
      notes: String(req.body?.notes || '').slice(0, 500),
      createdBy: req.user._id,
    })
    res.status(201).json(serializeAssignment(doc))
  } catch (e) {
    next(e)
  }
})

router.get('/forms', async (req, res, next) => {
  try {
    const list = await FieldForm.find({
      tenantId: req.tenant._id,
      status: 'published',
    })
      .select('titulo descripcion version')
      .sort({ titulo: 1 })
      .limit(100)
    res.json({
      items: list.map((f) => ({
        id: String(f._id),
        titulo: f.titulo,
        descripcion: f.descripcion || '',
        version: f.version || 1,
      })),
    })
  } catch (e) {
    next(e)
  }
})

export default router
