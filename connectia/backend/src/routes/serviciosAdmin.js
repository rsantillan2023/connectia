import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { ServiceArea } from '../models/ServiceArea.js'
import { ServiceCatalogItem } from '../models/ServiceCatalogItem.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { ServiceFeedback } from '../models/ServiceFeedback.js'
import { User } from '../models/User.js'
import {
  canTransitionServicio,
  serializeArea,
  serializeCatalogItem,
  serializeRequest,
  serializeFeedback,
  buildHistoryEntry,
  normalizeFields,
  normalizeKeywords,
  normalizeAudience,
  isSlaBreached,
  aggregateServiciosReport,
} from '../lib/servicios.js'
import { activateOla43ForTenant } from '../lib/ensureOla43Menu.js'
import { notifyServicioStatusChanged } from '../services/notifyServicios.js'
import { resolveReportWindow } from '../lib/reportsMetrics.js'

const router = Router()

function requireProduct(req, res, next) {
  if (
    !hasCapability(req.user, req.tenant, 'servicios') &&
    !hasCapability(req.user, req.tenant, 'admin.servicios')
  ) {
    return res.status(403).json({ error: 'Portal de servicios no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireCapability('admin.servicios'), requireProduct)

router.post('/ensure-menu', async (req, res, next) => {
  try {
    await activateOla43ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

router.get('/meta', async (req, res, next) => {
  try {
    const operators = await User.find({
      tenantId: req.tenant._id,
      activo: { $ne: false },
    })
      .select('_id nombre apellido usuario')
      .limit(200)
      .lean()
    res.json({
      statuses: ['recibido', 'en_curso', 'resuelto', 'cancelado'],
      users: operators.map((u) => ({
        id: String(u._id),
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/* ── Reportes ── */
router.get('/reportes', async (req, res, next) => {
  try {
    const window = resolveReportWindow(req.query)
    const list = await ServiceRequest.find({
      tenantId: req.tenant._id,
      createdAt: { $gte: window.from, $lte: window.to },
    })
      .select('status areaId catalogItemId slaDueAt slaBreached status csat')
      .lean()
    const areas = await ServiceArea.find({ tenantId: req.tenant._id }).select('name').lean()
    const cats = await ServiceCatalogItem.find({ tenantId: req.tenant._id })
      .select('label')
      .lean()
    const areaNames = Object.fromEntries(areas.map((a) => [String(a._id), a.name]))
    const catNames = Object.fromEntries(cats.map((c) => [String(c._id), c.label]))
    const agg = aggregateServiciosReport(list)
    const byAreaNamed = {}
    for (const [k, v] of Object.entries(agg.byArea)) {
      byAreaNamed[areaNames[k] || k] = v
    }
    const byCatalogNamed = {}
    for (const [k, v] of Object.entries(agg.byCatalog)) {
      byCatalogNamed[catNames[k] || k] = v
    }
    res.json({
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      totals: {
        ...agg,
        byArea: byAreaNamed,
        byCatalog: byCatalogNamed,
      },
    })
  } catch (e) {
    next(e)
  }
})

/* ── Feedback ── */
router.get('/feedback', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const q = { tenantId: req.tenant._id }
    if (['pendiente', 'revisado', 'descartado'].includes(status)) q.status = status
    const list = await ServiceFeedback.find(q).sort({ createdAt: -1 }).limit(200)
    res.json({ items: list.map(serializeFeedback) })
  } catch (e) {
    next(e)
  }
})

router.patch('/feedback/:id', async (req, res, next) => {
  try {
    const doc = await ServiceFeedback.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Feedback no encontrado' })
    const body = req.body || {}
    if (body.status && ['pendiente', 'revisado', 'descartado'].includes(body.status)) {
      doc.status = body.status
    }
    if (body.adminNote != null) doc.adminNote = String(body.adminNote).slice(0, 1000)
    await doc.save()
    res.json({ item: serializeFeedback(doc) })
  } catch (e) {
    next(e)
  }
})

/* ── Áreas ── */
router.get('/areas', async (req, res, next) => {
  try {
    const list = await ServiceArea.find({ tenantId: req.tenant._id }).sort({
      order: 1,
      name: 1,
    })
    res.json({ items: list.map(serializeArea) })
  } catch (e) {
    next(e)
  }
})

router.post('/areas', async (req, res, next) => {
  try {
    const body = req.body || {}
    const name = String(body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' })
    const doc = await ServiceArea.create({
      tenantId: req.tenant._id,
      name: name.slice(0, 120),
      color: String(body.color || '#0d9488').slice(0, 20),
      receptorUserIds: Array.isArray(body.receptorUserIds) ? body.receptorUserIds : [],
      active: body.active !== false,
      order: Number(body.order) || 0,
    })
    res.status(201).json({ item: serializeArea(doc) })
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Ya existe un área con ese nombre' })
    }
    next(e)
  }
})

router.patch('/areas/:id', async (req, res, next) => {
  try {
    const doc = await ServiceArea.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Área no encontrada' })
    const body = req.body || {}
    if (body.name != null) doc.name = String(body.name).trim().slice(0, 120)
    if (body.color != null) doc.color = String(body.color).slice(0, 20)
    if (body.receptorUserIds != null) doc.receptorUserIds = body.receptorUserIds
    if (body.active != null) doc.active = !!body.active
    if (body.order != null) doc.order = Number(body.order) || 0
    await doc.save()
    res.json({ item: serializeArea(doc) })
  } catch (e) {
    next(e)
  }
})

/* ── Ítems catálogo ── */
router.get('/items', async (req, res, next) => {
  try {
    const list = await ServiceCatalogItem.find({ tenantId: req.tenant._id }).sort({
      order: 1,
      label: 1,
    })
    res.json({ items: list.map(serializeCatalogItem) })
  } catch (e) {
    next(e)
  }
})

function catalogPayload(body) {
  return {
    label: String(body.label || '').trim().slice(0, 200),
    description: String(body.description || '').slice(0, 1000),
    keywords: normalizeKeywords(body.keywords),
    active: body.active !== false,
    order: Number(body.order) || 0,
    slaMinutes: Math.max(0, Number(body.slaMinutes) || 0),
    fields: normalizeFields(body.fields),
    audience: normalizeAudience(body.audience || { mode: 'all' }),
    requireApproval: !!body.requireApproval,
    createJiraIssue: !!body.createJiraIssue,
  }
}

router.post('/items', async (req, res, next) => {
  try {
    const body = req.body || {}
    const label = String(body.label || '').trim()
    if (!label) return res.status(400).json({ error: 'Etiqueta obligatoria' })
    if (!body.areaId) return res.status(400).json({ error: 'Área obligatoria' })
    const area = await ServiceArea.findOne({
      _id: body.areaId,
      tenantId: req.tenant._id,
    })
    if (!area) return res.status(400).json({ error: 'Área inexistente' })
    const payload = catalogPayload(body)
    const doc = await ServiceCatalogItem.create({
      tenantId: req.tenant._id,
      areaId: area._id,
      ...payload,
      label,
    })
    res.status(201).json({ item: serializeCatalogItem(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/items/:id', async (req, res, next) => {
  try {
    const doc = await ServiceCatalogItem.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Ítem no encontrado' })
    const body = req.body || {}
    if (body.label != null) doc.label = String(body.label).trim().slice(0, 200)
    if (body.description != null) {
      doc.description = String(body.description).slice(0, 1000)
    }
    if (body.areaId !== undefined) {
      const area = await ServiceArea.findOne({
        _id: body.areaId,
        tenantId: req.tenant._id,
      })
      if (!area) return res.status(400).json({ error: 'Área inexistente' })
      doc.areaId = area._id
    }
    if (body.active != null) doc.active = !!body.active
    if (body.order != null) doc.order = Number(body.order) || 0
    if (body.slaMinutes != null) doc.slaMinutes = Math.max(0, Number(body.slaMinutes) || 0)
    if (body.fields != null) doc.fields = normalizeFields(body.fields)
    if (body.keywords != null) doc.keywords = normalizeKeywords(body.keywords)
    if (body.audience != null) doc.audience = normalizeAudience(body.audience)
    if (body.requireApproval != null) doc.requireApproval = !!body.requireApproval
    if (body.createJiraIssue != null) doc.createJiraIssue = !!body.createJiraIssue
    await doc.save()
    res.json({ item: serializeCatalogItem(doc) })
  } catch (e) {
    next(e)
  }
})

function listQuery(req) {
  const q = { tenantId: req.tenant._id }
  const status = String(req.query.status || '').trim()
  const areaId = String(req.query.areaId || '').trim()
  if (['recibido', 'en_curso', 'resuelto', 'cancelado'].includes(status)) {
    q.status = status
  }
  if (areaId) q.areaId = areaId
  return q
}

/** GET /api/admin/servicios — bandeja */
router.get('/', async (req, res, next) => {
  try {
    const q = listQuery(req)
    const list = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(200)
    const areas = await ServiceArea.find({ tenantId: req.tenant._id })
    const items = await ServiceCatalogItem.find({ tenantId: req.tenant._id })
    const areaMap = Object.fromEntries(areas.map((a) => [String(a._id), a]))
    const itemMap = Object.fromEntries(items.map((i) => [String(i._id), i]))

    const now = new Date()
    for (const r of list) {
      if (!r.slaBreached && isSlaBreached(r, now)) {
        r.slaBreached = true
        r.save().catch(() => {})
      }
    }

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

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await ServiceRequest.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
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

router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await ServiceRequest.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Solicitud no encontrada' })
    const body = req.body || {}

    if (body.status != null && body.status !== doc.status) {
      if (!canTransitionServicio(doc.status, body.status)) {
        return res
          .status(400)
          .json({ error: `Transición inválida: ${doc.status} → ${body.status}` })
      }
      const from = doc.status
      doc.status = body.status
      doc.history.push(
        buildHistoryEntry({
          actorId: req.user._id,
          from,
          to: body.status,
          reason: body.reason || '',
        }),
      )
    }
    if (body.assigneeId !== undefined) {
      doc.assigneeId = body.assigneeId || null
    }
    if (body.internalNotes != null) {
      doc.internalNotes = String(body.internalNotes).slice(0, 4000)
    }
    if (isSlaBreached(doc)) doc.slaBreached = true
    await doc.save()

    if (body.status) {
      notifyServicioStatusChanged({
        tenant: req.tenant,
        request: doc,
        createdBy: doc.createdBy,
      }).catch(() => {})
    }

    res.json({ item: serializeRequest(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
