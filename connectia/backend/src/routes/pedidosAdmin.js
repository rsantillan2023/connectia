import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { Pedido } from '../models/Pedido.js'
import { PedidoCategory } from '../models/PedidoCategory.js'
import { PedidoArticle } from '../models/PedidoArticle.js'
import { User } from '../models/User.js'
import {
  canTransitionPedido,
  normalizeGeo,
  serializePedido,
  serializeCategory,
  serializeArticle,
  buildHistoryEntry,
  geoMapFilter,
  pedidoHasGeo,
} from '../lib/pedidos.js'
import { activateOla25ForTenant } from '../lib/ensureOla25Menu.js'
import {
  notifyPedidoStatusChanged,
} from '../services/notifyPedidos.js'

const router = Router()

function requireProduct(req, res, next) {
  if (
    !hasCapability(req.user, req.tenant, 'pedidos') &&
    !hasCapability(req.user, req.tenant, 'admin.pedidos')
  ) {
    return res.status(403).json({ error: 'Módulo Pedidos no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireCapability('admin.pedidos'), requireProduct)

router.post('/ensure-menu', async (req, res, next) => {
  try {
    await activateOla25ForTenant(req.tenant)
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
      statuses: ['abierta', 'en_curso', 'cerrada', 'cancelada'],
      sources: ['alarm', 'catalog', 'api'],
      closeReasons: ['resuelto', 'falsa_alarma', 'otro'],
      users: operators.map((u) => ({
        id: String(u._id),
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/* ── Categorías ── */
router.get('/categories', async (req, res, next) => {
  try {
    const list = await PedidoCategory.find({ tenantId: req.tenant._id }).sort({
      order: 1,
      name: 1,
    })
    res.json({ items: list.map(serializeCategory) })
  } catch (e) {
    next(e)
  }
})

router.post('/categories', async (req, res, next) => {
  try {
    const body = req.body || {}
    const name = String(body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' })
    if (body.defaultForAlarm) {
      await PedidoCategory.updateMany(
        { tenantId: req.tenant._id, defaultForAlarm: true },
        { $set: { defaultForAlarm: false } },
      )
    }
    const doc = await PedidoCategory.create({
      tenantId: req.tenant._id,
      name: name.slice(0, 120),
      colorMap: String(body.colorMap || '#dc2626').slice(0, 20),
      receptorUserIds: Array.isArray(body.receptorUserIds) ? body.receptorUserIds : [],
      requireGps: !!body.requireGps,
      requirePhoto: !!body.requirePhoto,
      defaultForAlarm: !!body.defaultForAlarm,
      active: body.active !== false,
      order: Number(body.order) || 0,
    })
    res.status(201).json({ item: serializeCategory(doc) })
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' })
    next(e)
  }
})

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const doc = await PedidoCategory.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Categoría no encontrada' })
    const body = req.body || {}
    if (body.name != null) doc.name = String(body.name).trim().slice(0, 120)
    if (body.colorMap != null) doc.colorMap = String(body.colorMap).slice(0, 20)
    if (body.receptorUserIds != null) doc.receptorUserIds = body.receptorUserIds
    if (body.requireGps != null) doc.requireGps = !!body.requireGps
    if (body.requirePhoto != null) doc.requirePhoto = !!body.requirePhoto
    if (body.active != null) doc.active = !!body.active
    if (body.order != null) doc.order = Number(body.order) || 0
    if (body.defaultForAlarm) {
      await PedidoCategory.updateMany(
        { tenantId: req.tenant._id, defaultForAlarm: true, _id: { $ne: doc._id } },
        { $set: { defaultForAlarm: false } },
      )
      doc.defaultForAlarm = true
    } else if (body.defaultForAlarm === false) {
      doc.defaultForAlarm = false
    }
    await doc.save()
    res.json({ item: serializeCategory(doc) })
  } catch (e) {
    next(e)
  }
})

/* ── Artículos ── */
router.get('/articles', async (req, res, next) => {
  try {
    const list = await PedidoArticle.find({ tenantId: req.tenant._id }).sort({
      order: 1,
      label: 1,
    })
    res.json({ items: list.map(serializeArticle) })
  } catch (e) {
    next(e)
  }
})

router.post('/articles', async (req, res, next) => {
  try {
    const body = req.body || {}
    const label = String(body.label || '').trim()
    if (!label) return res.status(400).json({ error: 'Etiqueta obligatoria' })
    const doc = await PedidoArticle.create({
      tenantId: req.tenant._id,
      label: label.slice(0, 200),
      description: String(body.description || '').slice(0, 1000),
      unit: String(body.unit || 'u').slice(0, 40),
      categoryId: body.categoryId || null,
      active: body.active !== false,
      order: Number(body.order) || 0,
    })
    res.status(201).json({ item: serializeArticle(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/articles/:id', async (req, res, next) => {
  try {
    const doc = await PedidoArticle.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Artículo no encontrado' })
    const body = req.body || {}
    if (body.label != null) doc.label = String(body.label).trim().slice(0, 200)
    if (body.description != null) doc.description = String(body.description).slice(0, 1000)
    if (body.unit != null) doc.unit = String(body.unit).slice(0, 40)
    if (body.categoryId !== undefined) doc.categoryId = body.categoryId || null
    if (body.active != null) doc.active = !!body.active
    if (body.order != null) doc.order = Number(body.order) || 0
    await doc.save()
    res.json({ item: serializeArticle(doc) })
  } catch (e) {
    next(e)
  }
})

function listQuery(req) {
  const q = { tenantId: req.tenant._id }
  const source = String(req.query.source || '').trim()
  const status = String(req.query.status || '').trim()
  const categoryId = String(req.query.categoryId || '').trim()
  if (['alarm', 'catalog', 'api'].includes(source)) q.source = source
  if (['abierta', 'en_curso', 'cerrada', 'cancelada'].includes(status)) q.status = status
  if (categoryId) q.categoryId = categoryId
  if (req.query.from || req.query.to) {
    q.createdAt = {}
    if (req.query.from) {
      const from = String(req.query.from)
      q.createdAt.$gte = /^\d{4}-\d{2}-\d{2}$/.test(from)
        ? new Date(`${from}T00:00:00.000`)
        : new Date(from)
    }
    if (req.query.to) {
      const to = String(req.query.to)
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        q.createdAt.$lte = new Date(`${to}T23:59:59.999`)
      } else {
        q.createdAt.$lte = new Date(to)
      }
    }
  }
  return q
}

/** GET /api/admin/pedidos — bandeja */
router.get('/', async (req, res, next) => {
  try {
    const q = listQuery(req)
    const list = await Pedido.find(q).sort({ createdAt: -1 }).limit(200)
    const cats = await PedidoCategory.find({ tenantId: req.tenant._id })
    const catMap = Object.fromEntries(cats.map((c) => [String(c._id), c]))
    res.json({
      items: list.map((p) =>
        serializePedido(p, {
          categoryName: catMap[String(p.categoryId)]?.name || '',
          categoryColor: catMap[String(p.categoryId)]?.colorMap || '#dc2626',
          hasGeo: pedidoHasGeo(p),
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/pedidos/map — solo con geo (DoD mapa) */
router.get('/map', async (req, res, next) => {
  try {
    const base = listQuery(req)
    const q = geoMapFilter(base)
    const list = await Pedido.find(q).sort({ createdAt: -1 }).limit(500)
    const cats = await PedidoCategory.find({ tenantId: req.tenant._id })
    const catMap = Object.fromEntries(cats.map((c) => [String(c._id), c]))
    res.json({
      items: list.map((p) =>
        serializePedido(p, {
          categoryName: catMap[String(p.categoryId)]?.name || '',
          categoryColor: catMap[String(p.categoryId)]?.colorMap || '#dc2626',
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Pedido.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Pedido no encontrado' })
    const cat = await PedidoCategory.findOne({ _id: doc.categoryId, tenantId: req.tenant._id })
    res.json({
      item: serializePedido(doc, {
        categoryName: cat?.name || '',
        categoryColor: cat?.colorMap || '#dc2626',
        hasGeo: pedidoHasGeo(doc),
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** PATCH — tomar / cerrar / falsa alarma / asignar */
router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await Pedido.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Pedido no encontrado' })
    const body = req.body || {}
    let statusChanged = false

    if (body.status) {
      const to = String(body.status)
      if (!canTransitionPedido(doc.status, to)) {
        return res.status(409).json({
          error: `Transición inválida: ${doc.status} → ${to}`,
        })
      }
      const from = doc.status
      doc.status = to
      if (to === 'cerrada' || to === 'cancelada') {
        const reason = String(body.closeReason || body.reason || 'resuelto')
        doc.closeReason = ['resuelto', 'falsa_alarma', 'otro'].includes(reason)
          ? reason
          : 'otro'
      }
      if (to === 'en_curso' && !doc.assigneeId) {
        doc.assigneeId = req.user._id
      }
      doc.history.push(
        buildHistoryEntry({
          actorId: req.user._id,
          from,
          to,
          reason: body.reason || body.closeReason || '',
        }),
      )
      statusChanged = true
    }
    if (body.assigneeId !== undefined) {
      doc.assigneeId = body.assigneeId || null
    }
    if (body.note != null) {
      doc.note = String(body.note).slice(0, 2000)
    }
    if (body.geo) {
      const g = normalizeGeo(body.geo)
      if (g) doc.geo = g
    }

    await doc.save()

    if (statusChanged) {
      const cat = await PedidoCategory.findOne({ _id: doc.categoryId, tenantId: req.tenant._id })
      await notifyPedidoStatusChanged({
        tenant: req.tenant,
        pedido: doc,
        receptorUserIds: cat?.receptorUserIds || [],
        creatorId: doc.createdBy,
        status: doc.status,
      })
    }

    res.json({ item: serializePedido(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
