import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { Pedido } from '../models/Pedido.js'
import { PedidoCategory } from '../models/PedidoCategory.js'
import { PedidoArticle } from '../models/PedidoArticle.js'
import {
  canTransitionPedido,
  normalizeGeo,
  serializePedido,
  serializeCategory,
  serializeArticle,
  buildHistoryEntry,
} from '../lib/pedidos.js'
import {
  notifyPedidoCreated,
  notifyPedidoStatusChanged,
} from '../services/notifyPedidos.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/pedidos')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const rawExt = path.extname(file.originalname || '').toLowerCase()
      const safe = /^\.(jpe?g|png|webp|gif)$/i.test(rawExt)
        ? rawExt.replace(/jpeg/i, 'jpg')
        : '.jpg'
      cb(null, `ped-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`)
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo imágenes (jpg, png, webp, gif)'))
  },
})

const router = Router()

function requirePedidos(req, res, next) {
  if (!hasCapability(req.user, req.tenant, 'pedidos')) {
    return res.status(403).json({ error: 'Módulo Pedidos no disponible' })
  }
  next()
}

function requireAlarm(req, res, next) {
  if (!hasCapability(req.user, req.tenant, 'pedidos.alarma', 'pedidos')) {
    return res.status(403).json({ error: 'Canal alarma / reportes no disponible' })
  }
  next()
}

router.use(requireAuth, requirePedidos)

/** POST /api/pedidos/upload — foto evidencia */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      err.status = 400
      return next(err)
    }
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' })
    const url = toPublicMediaUrl(`/uploads/pedidos/${req.file.filename}`)
    res.status(201).json({ url, nombre: req.file.originalname || req.file.filename })
  })
})

async function nextNumber(tenantId) {
  const last = await Pedido.findOne({ tenantId }).sort({ number: -1 }).select('number').lean()
  return (last?.number || 0) + 1
}

async function resolveCategory(tenantId, categoryId, { forAlarm } = {}) {
  if (categoryId) {
    const cat = await PedidoCategory.findOne({
      _id: categoryId,
      tenantId,
      active: true,
    })
    if (cat) return cat
  }
  if (forAlarm) {
    const def = await PedidoCategory.findOne({
      tenantId,
      active: true,
      defaultForAlarm: true,
    }).sort({ order: 1 })
    if (def) return def
    return PedidoCategory.findOne({ tenantId, active: true }).sort({ order: 1 })
  }
  return null
}

/** GET /api/pedidos/meta */
router.get('/meta', async (req, res, next) => {
  try {
    const [categories, articles] = await Promise.all([
      PedidoCategory.find({ tenantId: req.tenant._id, active: true }).sort({ order: 1, name: 1 }),
      PedidoArticle.find({ tenantId: req.tenant._id, active: true }).sort({ order: 1, label: 1 }),
    ])
    res.json({
      categories: categories.map(serializeCategory),
      articles: articles.map(serializeArticle),
      canAlarm: hasCapability(req.user, req.tenant, 'pedidos.alarma', 'pedidos'),
      statuses: ['abierta', 'en_curso', 'cerrada', 'cancelada'],
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/pedidos — mis pedidos */
router.get('/', async (req, res, next) => {
  try {
    const source = String(req.query.source || '').trim()
    const status = String(req.query.status || '').trim()
    const q = {
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    }
    if (['alarm', 'catalog', 'api'].includes(source)) q.source = source
    if (['abierta', 'en_curso', 'cerrada', 'cancelada'].includes(status)) q.status = status
    const list = await Pedido.find(q).sort({ createdAt: -1 }).limit(100)
    const cats = await PedidoCategory.find({
      tenantId: req.tenant._id,
      _id: { $in: [...new Set(list.map((p) => String(p.categoryId)))] },
    })
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

/** GET /api/pedidos/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Pedido.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Pedido no encontrado' })
    const cat = await PedidoCategory.findOne({ _id: doc.categoryId, tenantId: req.tenant._id })
    res.json({
      item: serializePedido(doc, {
        categoryName: cat?.name || '',
        categoryColor: cat?.colorMap || '#dc2626',
      }),
    })
  } catch (e) {
    next(e)
  }
})

async function createPedido(req, res, next, { source, forceUrgent }) {
  try {
    const body = req.body || {}
    const idem =
      String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim().slice(0, 180)
    if (idem) {
      const existing = await Pedido.findOne({
        tenantId: req.tenant._id,
        idempotencyKey: idem,
      })
      if (existing) {
        return res.status(200).json({
          item: serializePedido(existing),
          idempotent: true,
        })
      }
    }

    const forAlarm = source === 'alarm'
    const cat = await resolveCategory(req.tenant._id, body.categoryId, { forAlarm })
    if (!cat) return res.status(400).json({ error: 'Categoría requerida o inexistente' })

    const geo = normalizeGeo(body.geo)
    if (cat.requireGps && !geo) {
      return res.status(400).json({ error: 'Esta categoría exige GPS' })
    }
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.map((a) => String(a).slice(0, 500)).slice(0, 10)
      : []
    if (cat.requirePhoto && attachments.length === 0 && !String(body.note || '').trim()) {
      /* photo preferred; allow note as soft fallback only if not requirePhoto strict — keep strict */
      if (cat.requirePhoto && attachments.length === 0) {
        return res.status(400).json({ error: 'Esta categoría exige foto / adjunto' })
      }
    }

    let items = []
    if (source === 'catalog' && Array.isArray(body.items) && body.items.length) {
      const articleIds = body.items.map((i) => i.articleId).filter(Boolean)
      const articles = await PedidoArticle.find({
        tenantId: req.tenant._id,
        _id: { $in: articleIds },
        active: true,
      })
      const amap = Object.fromEntries(articles.map((a) => [String(a._id), a]))
      items = body.items
        .map((i) => {
          const art = amap[String(i.articleId)]
          if (!art && !i.label) return null
          return {
            articleId: art?._id || null,
            label: art?.label || String(i.label || '').slice(0, 200),
            qty: Math.max(0, Number(i.qty) || 1),
            unit: art?.unit || String(i.unit || 'u').slice(0, 40),
          }
        })
        .filter(Boolean)
      if (!items.length) return res.status(400).json({ error: 'Indicá al menos un artículo' })
    } else if (source === 'alarm') {
      if (!attachments.length) {
        return res.status(400).json({ error: 'La alarma / reporte requiere una foto' })
      }
      items = [
        {
          articleId: null,
          label: cat.name || 'Reporte',
          qty: 1,
          unit: 'u',
        },
      ]
    }

    const number = await nextNumber(req.tenant._id)
    const priority = forceUrgent || body.priority === 'urgent' ? 'urgent' : 'normal'
    const doc = await Pedido.create({
      tenantId: req.tenant._id,
      number,
      source,
      categoryId: cat._id,
      priority,
      status: 'abierta',
      note: String(body.note || '').slice(0, 2000),
      attachments,
      geo,
      items,
      createdBy: req.user._id,
      history: [
        buildHistoryEntry({
          actorId: req.user._id,
          from: '',
          to: 'abierta',
          reason: source === 'alarm' ? 'canal alarma' : 'catálogo',
        }),
      ],
      idempotencyKey: idem || undefined,
    })

    await notifyPedidoCreated({
      tenant: req.tenant,
      pedido: doc,
      receptorUserIds: cat.receptorUserIds || [],
      creatorId: req.user._id,
    })

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'pedido_created',
      entityId: doc._id,
      meta: { source },
    })

    res.status(201).json({
      item: serializePedido(doc, {
        categoryName: cat.name,
        categoryColor: cat.colorMap,
      }),
    })
  } catch (e) {
    if (e?.code === 11000 && (req.body?.idempotencyKey || req.headers['idempotency-key'])) {
      const idem = String(
        req.body?.idempotencyKey || req.headers['idempotency-key'] || '',
      )
        .trim()
        .slice(0, 180)
      const existing = await Pedido.findOne({
        tenantId: req.tenant._id,
        idempotencyKey: idem,
      })
      if (existing) return res.status(200).json({ item: serializePedido(existing), idempotent: true })
    }
    next(e)
  }
}

/** POST /api/pedidos — desde catálogo */
router.post('/', (req, res, next) => createPedido(req, res, next, { source: 'catalog', forceUrgent: false }))

/** POST /api/pedidos/alarm — canal pánico */
router.post('/alarm', requireAlarm, (req, res, next) =>
  createPedido(req, res, next, { source: 'alarm', forceUrgent: true }),
)

/** PATCH /api/pedidos/:id — cancelar / actualizar nota propia (solo abierta) */
router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await Pedido.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdBy: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Pedido no encontrado' })
    const body = req.body || {}
    let changed = false

    if (body.status === 'cancelada') {
      if (!canTransitionPedido(doc.status, 'cancelada')) {
        return res.status(409).json({ error: `No se puede cancelar desde «${doc.status}»` })
      }
      const from = doc.status
      doc.status = 'cancelada'
      doc.closeReason = 'otro'
      doc.history.push(
        buildHistoryEntry({
          actorId: req.user._id,
          from,
          to: 'cancelada',
          reason: body.reason || 'cancelado por el miembro',
        }),
      )
      changed = true
    } else if (body.note != null && doc.status === 'abierta') {
      doc.note = String(body.note).slice(0, 2000)
      changed = true
    }

    if (!changed) return res.status(400).json({ error: 'Sin cambios válidos' })
    await doc.save()

    if (body.status === 'cancelada') {
      const cat = await PedidoCategory.findOne({ _id: doc.categoryId, tenantId: req.tenant._id })
      await notifyPedidoStatusChanged({
        tenant: req.tenant,
        pedido: doc,
        receptorUserIds: cat?.receptorUserIds || [],
        creatorId: doc.createdBy,
        status: 'cancelada',
      })
    }

    res.json({ item: serializePedido(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
