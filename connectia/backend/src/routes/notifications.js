import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { AppNotification } from '../models/AppNotification.js'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { audienceFilterForUser } from '../lib/audience.js'
import { getVapidPublicKey, isPushConfigured } from '../services/pushService.js'
import { User } from '../models/User.js'

const router = Router()

function serializeNotif(n) {
  return {
    id: String(n._id),
    kind: n.kind,
    title: n.title,
    body: n.body || '',
    href: n.href || '/',
    refType: n.refType || '',
    refId: n.refId ? String(n.refId) : null,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }
}

/** Clave pública VAPID para suscribir push en el cliente. */
router.get('/push/vapid-public-key', requireAuth, (_req, res) => {
  res.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  })
})

/** Registra / actualiza suscripción Web Push del dispositivo actual. */
router.post('/push/subscribe', requireAuth, async (req, res, next) => {
  try {
    const sub = req.body?.subscription || req.body
    const endpoint = String(sub?.endpoint || '').trim()
    const p256dh = String(sub?.keys?.p256dh || '').trim()
    const auth = String(sub?.keys?.auth || '').trim()
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Suscripción inválida' })
    }
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const rest = (user.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint)
    rest.push({
      endpoint,
      keys: { p256dh, auth },
      userAgent: String(req.headers['user-agent'] || '').slice(0, 240),
      createdAt: new Date(),
      lastSeen: new Date(),
    })
    // Máximo 8 dispositivos
    user.pushSubscriptions = rest.slice(-8)
    await user.save()
    res.json({ ok: true, count: user.pushSubscriptions.length })
  } catch (e) {
    next(e)
  }
})

router.delete('/push/subscribe', requireAuth, async (req, res, next) => {
  try {
    const endpoint = String(req.body?.endpoint || '').trim()
    if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' })
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { pushSubscriptions: { endpoint } } },
    )
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/**
 * Pendientes al abrir la app: encuestas sin responder + notificaciones no leídas.
 */
router.get('/pending', requireAuth, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    const now = new Date()
    const surveys = await Survey.find({
      tenantId: req.tenant._id,
      status: 'published',
      $and: [
        audienceFilterForUser(req.user),
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .select('_id titulo descripcion publishedAt')
      .sort({ publishedAt: -1 })
      .lean()

    const ids = surveys.map((s) => s._id)
    const answered = await SurveyResponse.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      surveyId: { $in: ids },
    })
      .select('surveyId')
      .lean()
    const answeredSet = new Set(answered.map((r) => String(r.surveyId)))
    const pendingSurveys = surveys
      .filter((s) => !answeredSet.has(String(s._id)))
      .map((s) => ({
        id: String(s._id),
        titulo: s.titulo,
        descripcion: s.descripcion || '',
        href: `/encuestas/${s._id}`,
        publishedAt: s.publishedAt,
      }))

    const notifFilter = {
      tenantId: req.tenant._id,
      userId: req.user._id,
      dismissedAt: null,
      readAt: null,
    }
    const [notifs, unreadCount] = await Promise.all([
      AppNotification.find(notifFilter).sort({ createdAt: -1 }).limit(20).lean(),
      AppNotification.countDocuments(notifFilter),
    ])

    res.json({
      pendingSurveys,
      pendingSurveyCount: pendingSurveys.length,
      notifications: notifs.map(serializeNotif),
      unreadCount,
      showOnLaunch: pendingSurveys.length > 0 || unreadCount > 0,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    // Evitar 304/ETag: la bandeja cambia al marcar leída y la caché del browser mentía.
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    res.removeHeader('ETag')

    const unreadQ = String(req.query.unread || '')
    const readQ = String(req.query.read || '')
    const statusQ = String(req.query.status || '').toLowerCase()
    /** all | unread | read */
    let status = 'all'
    if (statusQ === 'unread' || unreadQ === '1') status = 'unread'
    else if (statusQ === 'read' || readQ === '1') status = 'read'

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
    const skip = (page - 1) * limit
    const filter = {
      tenantId: req.tenant._id,
      userId: req.user._id,
      dismissedAt: null,
    }
    if (status === 'unread') filter.readAt = null
    else if (status === 'read') filter.readAt = { $ne: null }

    const [items, total, unreadCount] = await Promise.all([
      AppNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AppNotification.countDocuments(filter),
      AppNotification.countDocuments({
        tenantId: req.tenant._id,
        userId: req.user._id,
        dismissedAt: null,
        readAt: null,
      }),
    ])

    res.json({
      items: items.map(serializeNotif),
      total,
      unreadCount,
      page,
      limit,
      hasMore: skip + items.length < total,
    })
  } catch (e) {
    next(e)
  }
})

/** Solo contador (badge). */
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    res.removeHeader('ETag')
    const unreadCount = await AppNotification.countDocuments({
      tenantId: req.tenant._id,
      userId: req.user._id,
      dismissedAt: null,
      readAt: null,
    })
    res.json({ unreadCount })
  } catch (e) {
    next(e)
  }
})

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await AppNotification.updateMany(
      { tenantId: req.tenant._id, userId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
    )
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const n = await AppNotification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id, userId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    )
    if (!n) return res.status(404).json({ error: 'No encontrada' })
    res.json({ notification: serializeNotif(n) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const n = await AppNotification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id, userId: req.user._id },
      { $set: { dismissedAt: new Date(), readAt: new Date() } },
      { new: true },
    )
    if (!n) return res.status(404).json({ error: 'No encontrada' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
