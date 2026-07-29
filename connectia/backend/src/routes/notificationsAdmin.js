import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { PushCampaign } from '../models/PushCampaign.js'
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import {
  buildCampaignPayload,
  validateCampaignPayload,
  parseIdsCsv,
  rowsToCsv,
} from '../lib/pushCampaignPayload.js'
import {
  campaignNotifFilter,
  computeReadSummary,
  serializeReadRow,
  readsExportRows,
  READS_EXPORT_HEADERS,
} from '../lib/campaignReads.js'
import {
  serializeCampaign,
  previewCampaignAudience,
  dispatchPushCampaign,
  ensureCampaignInAppRecords,
} from '../services/notifyCampaign.js'
import { improvePushCopy, draftPushFromPrompt, pushAiConfigured } from '../services/pushCopyAi.js'
import { analyzeCampaignReadsWithAi } from '../services/campaignInsightsAi.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'

const router = Router()
const CAP = 'admin.notificaciones'
const ObjectId = mongoose.Types.ObjectId

async function findCampaignOr404(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'id inválido' })
    return null
  }
  const c = await PushCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
  if (!c) {
    res.status(404).json({ error: 'No encontrada' })
    return null
  }
  return c
}

async function hydrateReadRows(tenantId, notifs) {
  const userIds = [...new Set(notifs.map((n) => String(n.userId)).filter(Boolean))]
  const users = userIds.length
    ? await User.find({ tenantId, _id: { $in: userIds } })
        .select('usuario nombre apellido email areaId')
        .lean()
    : []
  const userMap = new Map(users.map((u) => [String(u._id), u]))
  const areaIds = [...new Set(users.map((u) => (u.areaId ? String(u.areaId) : '')).filter(Boolean))]
  const areas = areaIds.length
    ? await OrgArea.find({ tenantId, _id: { $in: areaIds } })
        .select('nombre')
        .lean()
    : []
  const areaMap = new Map(areas.map((a) => [String(a._id), a.nombre || '']))
  return notifs.map((n) => {
    const user = userMap.get(String(n.userId)) || null
    const areaNombre = user?.areaId ? areaMap.get(String(user.areaId)) || '' : ''
    return serializeReadRow(n, user, areaNombre)
  })
}

async function buildCampaignReadSummary(tenantId, campaign) {
  const base = campaignNotifFilter(tenantId, campaign._id, { status: 'all' })
  const [inAppTotal, readCount, byAreaAgg] = await Promise.all([
    AppNotification.countDocuments(base),
    AppNotification.countDocuments({ ...base, readAt: { $ne: null } }),
    AppNotification.aggregate([
      { $match: base },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$user.areaId',
          total: { $sum: 1 },
          read: { $sum: { $cond: [{ $ne: ['$readAt', null] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]),
  ])
  const areaIds = byAreaAgg.map((r) => r._id).filter(Boolean)
  const areas = areaIds.length
    ? await OrgArea.find({ tenantId, _id: { $in: areaIds } })
        .select('nombre')
        .lean()
    : []
  const areaMap = new Map(areas.map((a) => [String(a._id), a.nombre || '']))
  const byArea = byAreaAgg.map((r) => ({
    areaId: r._id ? String(r._id) : null,
    nombre: r._id ? areaMap.get(String(r._id)) || 'Área' : 'Sin área',
    total: r.total || 0,
    read: r.read || 0,
  }))
  return computeReadSummary({
    inAppTotal,
    readCount,
    campaignStats: {
      ...(campaign.stats || {}),
      // Fuente de verdad: avisos in-app reales de esta campaña
      targeted: inAppTotal || Number(campaign.stats?.targeted) || 0,
      inApp: inAppTotal || Number(campaign.stats?.inApp) || 0,
    },
    byArea,
  })
}

function buildPayload(body = {}) {
  return buildCampaignPayload(body)
}

function validatePayload(p) {
  return validateCampaignPayload(p)
}

router.get('/ai-status', requireAuth, requireCapability(CAP), (_req, res) => {
  res.json({ configured: pushAiConfigured() })
})

router.post('/ai-copy', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const result = await improvePushCopy({
      title: req.body?.title,
      body: req.body?.body,
      href: req.body?.href,
      brandName: req.tenant?.nombre,
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/** Borrador completo desde prompt (no envía). */
router.post('/ai-draft', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('key nombre').lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('key nombre').lean(),
    ])
    const draft = await draftPushFromPrompt({
      prompt,
      brandName: req.tenant?.nombre,
      areas,
      groups,
    })
    res.json({ draft, configured: true })
  } catch (e) {
    next(e)
  }
})

/** Candidatos de audiencia (personas) para el selector del admin. */
router.get('/audience-candidates', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const ids = parseIdsCsv(req.query.ids)
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }

    if (ids.length) {
      filter._id = { $in: ids.filter((id) => id.length === 24) }
    } else if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    }

    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(ids.length ? Math.min(ids.length, 100) : 40)
      .lean()

    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        usuario: u.usuario || '',
        email: u.email || '',
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        areaId: u.areaId ? String(u.areaId) : null,
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/preview', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const payload = buildPayload(req.body || {})
    const err = validatePayload({ ...payload, sendType: 'now', scheduledAt: null })
    if (err && err !== 'Título obligatorio') {
      /* preview puede ir sin título */
    }
    const preview = await previewCampaignAudience(req.tenant._id, payload)
    res.json({ ...preview, audience: serializeAudience(payload.audience) })
  } catch (e) {
    next(e)
  }
})

router.get('/template.csv', requireAuth, requireCapability(CAP), (_req, res) => {
  const headers = [
    'nombre',
    'titulo',
    'cuerpo',
    'href',
    'audiencia',
    'areaIds',
    'groupIds',
    'userIds',
    'segmento',
    'inactiveDays',
    'envio',
    'fechaProgramada',
    'inApp',
    'push',
  ]
  const sample = {
    nombre: 'Recordatorio muro',
    titulo: '¿Ya viste lo nuevo?',
    cuerpo: 'Hay publicaciones nuevas en Connectia. Entrá y enterate.',
    href: '/muro',
    audiencia: 'all',
    areaIds: '',
    groupIds: '',
    userIds: '',
    segmento: 'inactive',
    inactiveDays: '30',
    envio: 'now',
    fechaProgramada: '',
    inApp: '1',
    push: '1',
  }
  const csv = rowsToCsv(headers, [sample])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-notificaciones.csv"')
  res.send(csv)
})

router.get('/export', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(String(req.query.from))
      if (req.query.to) filter.createdAt.$lte = new Date(String(req.query.to))
    }
    const items = await PushCampaign.find(filter).sort({ createdAt: -1 }).limit(2000).lean()
    const headers = [
      'id',
      'nombre',
      'titulo',
      'cuerpo',
      'href',
      'audiencia',
      'segmento',
      'envio',
      'fechaProgramada',
      'estado',
      'destinatarios',
      'inApp',
      'pushEnviados',
      'pushFallidos',
      'enviadoAt',
      'creadoAt',
    ]
    const rows = items.map((c) => ({
      id: String(c._id),
      nombre: c.name || '',
      titulo: c.title,
      cuerpo: c.body || '',
      href: c.href || '/',
      audiencia: c.audience?.mode || 'all',
      segmento: c.segment || 'audience',
      envio: c.sendType || 'now',
      fechaProgramada: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : '',
      estado: c.status,
      destinatarios: c.stats?.targeted || 0,
      inApp: c.stats?.inApp || 0,
      pushEnviados: c.stats?.pushSent || 0,
      pushFallidos: c.stats?.pushFailed || 0,
      enviadoAt: c.sentAt ? new Date(c.sentAt).toISOString() : '',
      creadoAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
    }))
    const csv = rowsToCsv(headers, rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="notificaciones-export.csv"')
    res.send(csv)
  } catch (e) {
    next(e)
  }
})

/**
 * Importa filas (JSON). Crea borradores o programa.
 * body.rows: array
 * body.sendImported: si true, envía las de envio=now
 */
router.post('/import', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
    if (!rows.length) return res.status(400).json({ error: 'Sin filas para importar' })
    if (rows.length > 200) return res.status(400).json({ error: 'Máximo 200 filas por importación' })

    const sendImported = Boolean(req.body?.sendImported)
    const created = []
    const errors = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {}
      const payload = buildPayload(row)
      const err = validatePayload(payload)
      if (err) {
        errors.push({ row: i + 1, error: err })
        continue
      }

      let status = 'draft'
      if (payload.sendType === 'scheduled') status = 'scheduled'
      else if (sendImported && payload.sendType === 'now') status = 'draft'

      try {
        const doc = await PushCampaign.create({
          tenantId: req.tenant._id,
          ...payload,
          audience: serializeAudience(payload.audience),
          status,
          createdBy: req.user._id,
        })

        if (sendImported && payload.sendType === 'now') {
          const result = await dispatchPushCampaign(doc._id, { tenant: req.tenant })
          const fresh = await PushCampaign.findById(doc._id).lean()
          created.push({ ...serializeCampaign(fresh), dispatch: result })
        } else {
          created.push(serializeCampaign(doc))
        }
      } catch (e) {
        errors.push({ row: i + 1, error: e.message || 'Error al crear' })
      }
    }

    res.status(201).json({
      created: created.length,
      failed: errors.length,
      items: created,
      errors,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
    const skip = (page - 1) * limit
    const filter = { tenantId: req.tenant._id }
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.q) {
      const q = String(req.query.q).trim()
      filter.$or = [
        { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { body: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ]
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(String(req.query.from))
      if (req.query.to) filter.createdAt.$lte = new Date(String(req.query.to))
    }

    const [items, total] = await Promise.all([
      PushCampaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PushCampaign.countDocuments(filter),
    ])

    res.json({
      items: items.map(serializeCampaign),
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await findCampaignOr404(req, res)
    if (!c) return
    res.json({ campaign: serializeCampaign(c) })
  } catch (e) {
    next(e)
  }
})

/** Resumen de lecturas (stats + por área). */
router.get('/:id/reads/summary', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await findCampaignOr404(req, res)
    if (!c) return
    await ensureCampaignInAppRecords(c)
    const summary = await buildCampaignReadSummary(req.tenant._id, c)
    res.json({ campaignId: String(c._id), summary })
  } catch (e) {
    next(e)
  }
})

/** Lista quién leyó / no leyó (paginado). */
router.get('/:id/reads', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await findCampaignOr404(req, res)
    if (!c) return
    await ensureCampaignInAppRecords(c)
    const statusQ = String(req.query.status || 'all').toLowerCase()
    const status = ['read', 'unread'].includes(statusQ) ? statusQ : 'all'
    const q = String(req.query.q || '').trim()
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const skip = (page - 1) * limit

    const filter = campaignNotifFilter(req.tenant._id, c._id, { status })
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const matched = await User.find({
        tenantId: req.tenant._id,
        $or: [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }],
      })
        .select('_id')
        .limit(500)
        .lean()
      filter.userId = { $in: matched.map((u) => u._id) }
    }

    const [items, total, summary] = await Promise.all([
      AppNotification.find(filter).sort({ readAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      AppNotification.countDocuments(filter),
      buildCampaignReadSummary(req.tenant._id, c),
    ])
    const rows = await hydrateReadRows(req.tenant._id, items)
    res.json({
      items: rows,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
      summary,
      status,
      q,
    })
  } catch (e) {
    next(e)
  }
})

/** Export CSV de lecturas. */
router.get('/:id/reads/export', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await findCampaignOr404(req, res)
    if (!c) return
    await ensureCampaignInAppRecords(c)
    const statusQ = String(req.query.status || 'all').toLowerCase()
    const status = ['read', 'unread'].includes(statusQ) ? statusQ : 'all'
    const filter = campaignNotifFilter(req.tenant._id, c._id, { status })
    const items = await AppNotification.find(filter).sort({ readAt: -1, createdAt: -1 }).limit(5000).lean()
    const rows = await hydrateReadRows(req.tenant._id, items)
    const csv = rowsToCsv(READS_EXPORT_HEADERS, readsExportRows(rows))
    const safeName = String(c.name || c.title || 'campana')
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 40)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="lecturas-${safeName}.csv"`)
    res.send(`\uFEFF${csv}`)
  } catch (e) {
    next(e)
  }
})

/** Resumen IA del rendimiento de lectura. */
router.post('/:id/ai-insight', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await findCampaignOr404(req, res)
    if (!c) return
    await ensureCampaignInAppRecords(c)
    const summary = await buildCampaignReadSummary(req.tenant._id, c)
    const result = await analyzeCampaignReadsWithAi({
      campaign: serializeCampaign(c),
      summary,
      tenant: req.tenant,
      provider: req.body?.provider || 'auto',
    })
    res.json({ ...result, summary })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const payload = buildPayload(req.body || {})
    const err = validatePayload(payload)
    if (err) return res.status(400).json({ error: err })

    const saveAsDraft = Boolean(req.body?.draft) || req.body?.status === 'draft'
    let status = 'draft'
    if (!saveAsDraft) {
      status = payload.sendType === 'scheduled' ? 'scheduled' : 'draft'
    }

    if (payload.idempotencyKey) {
      const existing = await PushCampaign.findOne({
        tenantId: req.tenant._id,
        idempotencyKey: payload.idempotencyKey,
      }).lean()
      if (existing) {
        return res.json({ campaign: serializeCampaign(existing), deduped: true })
      }
    }

    const doc = await PushCampaign.create({
      tenantId: req.tenant._id,
      ...payload,
      audience: serializeAudience(payload.audience),
      status,
      createdBy: req.user._id,
    })

    const sendNow = !saveAsDraft && payload.sendType === 'now' && req.body?.send !== false
    if (sendNow) {
      await dispatchPushCampaign(doc._id, { tenant: req.tenant })
      const fresh = await PushCampaign.findById(doc._id).lean()
      return res.status(201).json({ campaign: serializeCampaign(fresh) })
    }

    res.status(201).json({ campaign: serializeCampaign(doc) })
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Clave de idempotencia duplicada' })
    }
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const doc = await PushCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrada' })
    if (!['draft', 'scheduled'].includes(doc.status)) {
      return res.status(400).json({ error: 'Solo se pueden editar borradores o programadas' })
    }

    const payload = buildPayload({ ...serializeCampaign(doc), ...req.body })
    const err = validatePayload(payload)
    if (err) return res.status(400).json({ error: err })

    doc.name = payload.name
    doc.title = payload.title
    doc.body = payload.body
    doc.href = payload.href
    doc.audience = serializeAudience(payload.audience)
    doc.segment = payload.segment
    doc.inactiveDays = payload.inactiveDays
    doc.sendType = payload.sendType
    doc.scheduledAt = payload.scheduledAt
    doc.channels = payload.channels
    if (payload.sendType === 'scheduled') doc.status = 'scheduled'
    else if (doc.status === 'scheduled' && payload.sendType === 'now') doc.status = 'draft'
    await doc.save()

    res.json({ campaign: serializeCampaign(doc) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/send', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const doc = await PushCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrada' })
    if (!['draft', 'scheduled', 'failed'].includes(doc.status)) {
      return res.status(400).json({ error: `No se puede enviar en estado ${doc.status}` })
    }
    const result = await dispatchPushCampaign(doc._id, { tenant: req.tenant })
    const fresh = await PushCampaign.findById(doc._id).lean()
    if (!result.ok && !result.alreadySent) {
      return res.status(400).json({ error: result.error || 'Falló el envío', campaign: serializeCampaign(fresh) })
    }
    res.json({ campaign: serializeCampaign(fresh), result })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/cancel', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const doc = await PushCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrada' })
    if (!['draft', 'scheduled'].includes(doc.status)) {
      return res.status(400).json({ error: 'Solo se pueden cancelar borradores o programadas' })
    }
    doc.status = 'cancelled'
    doc.cancelledAt = new Date()
    doc.cancelledBy = req.user._id
    await doc.save()
    res.json({ campaign: serializeCampaign(doc) })
  } catch (e) {
    next(e)
  }
})

export default router
