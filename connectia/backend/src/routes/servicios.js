import { Router } from 'express'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { ServiceArea } from '../models/ServiceArea.js'
import { ServiceCatalogItem } from '../models/ServiceCatalogItem.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { ServiceFeedback } from '../models/ServiceFeedback.js'
import {
  serializeArea,
  serializeCatalogItem,
  serializeRequest,
  serializeFeedback,
  validateFormAnswers,
  validateCsat,
  computeSlaDueAt,
  buildHistoryEntry,
  canTransitionServicio,
  heuristicServiceFromText,
} from '../lib/servicios.js'
import { userMatchesAudience } from '../lib/audience.js'
import {
  notifyServicioCreated,
  notifyServicioStatusChanged,
} from '../services/notifyServicios.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'
import { createJiraIssueFromServicio } from '../lib/jiraServiciosAdapter.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()

function requireServicios(req, res, next) {
  if (!hasCapability(req.user, req.tenant, 'servicios')) {
    return res.status(403).json({ error: 'Portal de servicios no disponible' })
  }
  next()
}

router.use(requireAuth, requireServicios)

async function nextNumber(tenantId) {
  const last = await ServiceRequest.findOne({ tenantId })
    .sort({ number: -1 })
    .select('number')
    .lean()
  return (last?.number || 0) + 1
}

function visibleCatalog(items, user) {
  return (items || []).filter((it) => userMatchesAudience(user, it.audience || { mode: 'all' }))
}

/** GET /api/servicios/meta */
router.get('/meta', async (req, res, next) => {
  try {
    const [areas, items] = await Promise.all([
      ServiceArea.find({ tenantId: req.tenant._id, active: true }).sort({
        order: 1,
        name: 1,
      }),
      ServiceCatalogItem.find({ tenantId: req.tenant._id, active: true }).sort({
        order: 1,
        label: 1,
      }),
    ])
    const visible = visibleCatalog(items, req.user)
    res.json({
      areas: areas.map(serializeArea),
      items: visible.map(serializeCatalogItem),
      statuses: ['recibido', 'en_curso', 'resuelto', 'cancelado'],
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/servicios/suggest — enrutamiento heurístico */
router.post('/suggest', async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.q || '').trim()
    const [areas, items] = await Promise.all([
      ServiceArea.find({ tenantId: req.tenant._id, active: true }).lean(),
      ServiceCatalogItem.find({ tenantId: req.tenant._id, active: true }).lean(),
    ])
    const visible = visibleCatalog(items, req.user).map((i) => ({
      ...i,
      id: String(i._id),
      areaId: i.areaId ? String(i.areaId) : null,
    }))
    const areaList = areas.map((a) => ({ id: String(a._id), name: a.name }))
    const result = heuristicServiceFromText(prompt, visible, areaList)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/** GET /api/servicios — mis solicitudes */
router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const q = {
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    }
    if (['recibido', 'en_curso', 'resuelto', 'cancelado'].includes(status)) {
      q.status = status
    }
    const list = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(100)
    const areaIds = [...new Set(list.map((r) => String(r.areaId)))]
    const itemIds = [...new Set(list.map((r) => String(r.catalogItemId)))]
    const [areas, items] = await Promise.all([
      ServiceArea.find({ tenantId: req.tenant._id, _id: { $in: areaIds } }),
      ServiceCatalogItem.find({ tenantId: req.tenant._id, _id: { $in: itemIds } }),
    ])
    const areaMap = Object.fromEntries(areas.map((a) => [String(a._id), a]))
    const itemMap = Object.fromEntries(items.map((i) => [String(i._id), i]))
    res.json({
      items: list.map((r) =>
        serializeRequest(r, {
          areaName: areaMap[String(r.areaId)]?.name || '',
          areaColor: areaMap[String(r.areaId)]?.color || '#0d9488',
          catalogLabel: itemMap[String(r.catalogItemId)]?.label || '',
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/servicios/feedback */
router.post('/feedback', async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim()
    if (text.length < 5) {
      return res.status(400).json({ error: 'Escribí una sugerencia (mín. 5 caracteres)' })
    }
    const doc = await ServiceFeedback.create({
      tenantId: req.tenant._id,
      createdBy: req.user._id,
      text: text.slice(0, 2000),
      catalogItemId: req.body?.catalogItemId || null,
      areaId: req.body?.areaId || null,
      status: 'pendiente',
    })
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'service_feedback_given',
      entityId: doc._id,
      meta: { kind: 'suggestion' },
    })
    res.status(201).json({ item: serializeFeedback(doc) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/servicios/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await ServiceRequest.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Solicitud no encontrada' })
    const [area, item] = await Promise.all([
      ServiceArea.findOne({ _id: doc.areaId, tenantId: req.tenant._id }),
      ServiceCatalogItem.findOne({ _id: doc.catalogItemId, tenantId: req.tenant._id }),
    ])
    res.json({
      item: serializeRequest(doc, {
        areaName: area?.name || '',
        areaColor: area?.color || '#0d9488',
        catalogLabel: item?.label || '',
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/servicios/:id/csat */
router.post('/:id/csat', async (req, res, next) => {
  try {
    const doc = await ServiceRequest.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (doc.status !== 'resuelto') {
      return res.status(400).json({ error: 'Solo se califica una solicitud resuelta' })
    }
    if (doc.csat?.score) {
      return res.status(400).json({ error: 'Ya calificaste esta solicitud' })
    }
    const v = validateCsat(req.body || {})
    if (!v.ok) return res.status(400).json({ error: v.error })
    doc.csat = v.csat
    await doc.save()
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'service_feedback_given',
      entityId: doc._id,
      meta: { kind: 'csat' },
    })
    res.json({ item: serializeRequest(doc) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/servicios */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const idem = String(
      body.idempotencyKey || req.headers['idempotency-key'] || '',
    )
      .trim()
      .slice(0, 180)
    if (idem) {
      const existing = await ServiceRequest.findOne({
        tenantId: req.tenant._id,
        idempotencyKey: idem,
      })
      if (existing) {
        return res.status(200).json({
          item: serializeRequest(existing),
          idempotent: true,
        })
      }
    }

    const catalogItemId = body.catalogItemId
    if (!catalogItemId) {
      return res.status(400).json({ error: 'Servicio del catálogo requerido' })
    }
    const catalog = await ServiceCatalogItem.findOne({
      _id: catalogItemId,
      tenantId: req.tenant._id,
      active: true,
    })
    if (!catalog) {
      return res.status(400).json({ error: 'Servicio inexistente o inactivo' })
    }
    if (!userMatchesAudience(req.user, catalog.audience || { mode: 'all' })) {
      return res.status(403).json({ error: 'Este servicio no está disponible para tu perfil' })
    }
    const area = await ServiceArea.findOne({
      _id: catalog.areaId,
      tenantId: req.tenant._id,
      active: true,
    })
    if (!area) return res.status(400).json({ error: 'Área de servicio inactiva' })

    const validated = validateFormAnswers(catalog.fields, body.formAnswers)
    if (!validated.ok) {
      return res.status(400).json({ error: validated.errors[0] || 'Formulario inválido' })
    }

    const slaMinutes = catalog.slaMinutes || 0
    const number = await nextNumber(req.tenant._id)
    const doc = await ServiceRequest.create({
      tenantId: req.tenant._id,
      number,
      areaId: area._id,
      catalogItemId: catalog._id,
      status: 'recibido',
      formAnswers: validated.answers,
      note: String(body.note || '').slice(0, 2000),
      attachments: Array.isArray(body.attachments)
        ? body.attachments.map((a) => String(a).slice(0, 500)).slice(0, 10)
        : [],
      createdBy: req.user._id,
      slaMinutes,
      slaDueAt: computeSlaDueAt(slaMinutes),
      idempotencyKey: idem,
      history: [
        buildHistoryEntry({
          actorId: req.user._id,
          from: '',
          to: 'recibido',
          reason: 'alta',
        }),
      ],
    })

    notifyServicioCreated({ tenant: req.tenant, request: doc, area }).catch(() => {})

    if (catalog.requireApproval) {
      try {
        const authorName = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') ||
          req.user.usuario
        const wf = await startWorkflowForOrigin({
          tenantId: req.tenant._id,
          module: 'servicios',
          refId: doc._id,
          titulo: `${catalog.label} #${doc.number}`,
          codigo: String(doc.number),
          tipoKey: String(catalog._id),
          solicitanteId: req.user._id,
          solicitanteName: authorName,
        })
        if (wf) {
          doc.workflowStarted = true
          await doc.save()
        }
      } catch (wfErr) {
        console.warn('[wf] servicios', wfErr?.message || wfErr)
      }
    }

    if (catalog.createJiraIssue) {
      try {
        const sync = await createJiraIssueFromServicio({
          tenant: req.tenant,
          request: doc,
          catalog,
          area,
        })
        doc.jiraSync = sync
        await doc.save()
      } catch (jErr) {
        console.warn('[jira] servicios', jErr?.message || jErr)
      }
    }

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'service_request_created',
      entityId: doc._id,
    })

    res.status(201).json({ item: serializeRequest(doc) })
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Conflicto de correlativo o idempotencia' })
    }
    next(e)
  }
})

/** PATCH /api/servicios/:id — cancelar propia si recibido */
router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await ServiceRequest.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Solicitud no encontrada' })
    const body = req.body || {}
    if (body.status === 'cancelado') {
      if (!canTransitionServicio(doc.status, 'cancelado')) {
        return res.status(400).json({ error: 'No se puede cancelar en este estado' })
      }
      const from = doc.status
      doc.status = 'cancelado'
      doc.history.push(
        buildHistoryEntry({
          actorId: req.user._id,
          from,
          to: 'cancelado',
          reason: body.reason || 'cancelado por solicitante',
        }),
      )
      await doc.save()
      notifyServicioStatusChanged({
        tenant: req.tenant,
        request: doc,
        createdBy: doc.createdBy,
      }).catch(() => {})
      return res.json({ item: serializeRequest(doc) })
    }
    if (body.note != null && doc.status === 'recibido') {
      doc.note = String(body.note).slice(0, 2000)
      await doc.save()
      return res.json({ item: serializeRequest(doc) })
    }
    return res.status(400).json({ error: 'Solo se puede cancelar o editar nota en recibido' })
  } catch (e) {
    next(e)
  }
})

export default router
