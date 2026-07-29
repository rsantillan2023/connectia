import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Event, EventRsvp } from '../models/Event.js'
import { User } from '../models/User.js'
import {
  applyEventPatch,
  serializeEvent,
  EVENT_TIPOS,
  EVENT_STATUSES,
  TIPO_META,
  parseDate,
  validateEventDates,
  rsvpRowsToCsv,
} from '../lib/event.js'
import { normalizeAudience } from '../lib/audience.js'
import { notifyEventPublished, emailEventConfirmados } from '../services/notifyEvent.js'
import {
  eventAiConfigured,
  draftEventFromPrompt,
  suggestScheduleSlots,
} from '../services/eventAi.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth, requireCapability('admin.eventos'))

router.get('/meta', async (req, res) => {
  res.json({
    tipos: EVENT_TIPOS.map((t) => ({ id: t, label: TIPO_META[t].label, color: TIPO_META[t].color })),
    statuses: EVENT_STATUSES,
    timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
    aiConfigured: eventAiConfigured(),
  })
})

router.get('/ai-status', async (_req, res) => {
  res.json({ configured: eventAiConfigured() })
})

/**
 * POST /api/admin/events/ai-draft
 * Body: { prompt, extract?: boolean }
 */
router.post('/ai-draft', async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) return res.status(400).json({ error: 'prompt obligatorio' })
    const draft = await draftEventFromPrompt(prompt, {
      brandName: req.tenant.nombre || 'Connectia',
      extract: !!req.body?.extract,
    })
    res.json({ draft, configured: eventAiConfigured() })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/admin/events/ai-suggest-slots
 * Body: { durationHours?, preferHourUTC?, from?, to? }
 * Usa eventos corporativos publicados del tenant como busy.
 */
router.post('/ai-suggest-slots', async (req, res, next) => {
  try {
    const durationHours = Math.min(8, Math.max(0.5, Number(req.body?.durationHours) || 1))
    const preferHourUTC = Number(req.body?.preferHourUTC)
    const from = parseDate(req.body?.from) || new Date()
    const to = parseDate(req.body?.to) || new Date(from.getTime() + 14 * 86400000)

    const busy = await Event.find({
      tenantId: req.tenant._id,
      status: 'published',
      inicio: { $lte: to },
      fin: { $gte: from },
    })
      .select('inicio fin titulo')
      .lean()

    const result = suggestScheduleSlots({
      busyItems: busy.map((e) => ({
        inicio: e.inicio.toISOString(),
        fin: e.fin.toISOString(),
        titulo: e.titulo,
      })),
      durationHours,
      preferHourUTC: Number.isFinite(preferHourUTC) ? preferHourUTC : 15,
    })
    res.json({ ...result, configured: eventAiConfigured() })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/events */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const status = String(req.query.status || '').trim()
    const q = String(req.query.q || '').trim()
    const from = req.query.from ? new Date(req.query.from) : null
    const to = req.query.to ? new Date(req.query.to) : null

    const filter = { tenantId }
    if (status && EVENT_STATUSES.includes(status)) filter.status = status
    if (q) filter.titulo = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    if (from && !Number.isNaN(from.getTime()) && to && !Number.isNaN(to.getTime())) {
      filter.inicio = { $lte: to }
      filter.fin = { $gte: from }
    }

    const items = await Event.find(filter).sort({ inicio: -1 }).limit(400).lean()
    res.json({
      items: items.map((d) => serializeEvent(d)),
      timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Event.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ item: serializeEvent(doc) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/events/:id/rsvps — reporte confirmaciones */
router.get('/:id/rsvps', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const event = await Event.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!event) return res.status(404).json({ error: 'No encontrado' })

    const estado = String(req.query.estado || '').trim()
    const filter = { tenantId: req.tenant._id, eventId: event._id }
    if (estado === 'confirmado' || estado === 'rechazado') filter.estado = estado

    const rsvps = await EventRsvp.find(filter).sort({ confirmedAt: -1 }).lean()
    const userIds = rsvps.map((r) => r.userId)
    const users = await User.find({ _id: { $in: userIds }, tenantId: req.tenant._id })
      .select('_id nombre apellido email usuario')
      .lean()
    const byId = new Map(users.map((u) => [String(u._id), u]))

    const items = rsvps.map((r) => {
      const u = byId.get(String(r.userId))
      return {
        id: String(r._id),
        userId: String(r.userId),
        estado: r.estado,
        confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : null,
        nombre: u ? [u.nombre, u.apellido].filter(Boolean).join(' ') : '',
        email: u?.email || '',
        usuario: u?.usuario || '',
      }
    })

    if (String(req.query.format || '').toLowerCase() === 'csv') {
      const csv = rsvpRowsToCsv(items)
      const slug = String(event.titulo || 'evento')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .slice(0, 40)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="rsvp-${slug}.csv"`)
      return res.send(csv)
    }

    res.json({
      event: serializeEvent(event),
      items,
      totals: {
        confirmados: items.filter((i) => i.estado === 'confirmado').length,
        rechazados: items.filter((i) => i.estado === 'rechazado').length,
        total: items.length,
      },
    })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/admin/events/:id/rsvps/notify
 * Body: { subject?, message?, onlyConfirmados?: true }
 */
router.post('/:id/rsvps/notify', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const event = await Event.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!event) return res.status(404).json({ error: 'No encontrado' })

    const onlyConfirmados = req.body?.onlyConfirmados !== false
    const filter = { tenantId: req.tenant._id, eventId: event._id }
    if (onlyConfirmados) filter.estado = 'confirmado'

    const rsvps = await EventRsvp.find(filter).select('userId').lean()
    const users = await User.find({
      _id: { $in: rsvps.map((r) => r.userId) },
      tenantId: req.tenant._id,
    })
      .select('_id email nombre apellido')
      .lean()

    const result = await emailEventConfirmados({
      event,
      tenant: req.tenant,
      users,
      subject: req.body?.subject,
      message: req.body?.message || `Te recordamos tu asistencia a «${event.titulo}».`,
    })

    res.json({ ok: true, ...result, recipients: users.length })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    if (!titulo) return res.status(400).json({ error: 'titulo obligatorio' })

    const inicio = parseDate(body.inicio)
    const fin = parseDate(body.fin)
    const check = validateEventDates(inicio, fin)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const authorName =
      [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario || ''

    const doc = new Event({
      tenantId: req.tenant._id,
      titulo,
      inicio,
      fin,
      audience: normalizeAudience(body.audience),
      authorId: req.user._id,
      authorName,
      timezone: req.tenant.timezone || '',
    })
    applyEventPatch(doc, body)
    if (!body.status) doc.status = 'draft'
    if (doc.status === 'published') doc.publishedAt = new Date()
    await doc.save()

    if (doc.status === 'published') {
      notifyEventPublished({ event: doc.toObject(), tenant: req.tenant }).catch((err) =>
        console.error('[notifyEvent]', err.message),
      )
    }

    res.status(201).json({ item: serializeEvent(doc.toObject()) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Event.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })

    const prevStatus = doc.status
    applyEventPatch(doc, req.body || {})
    await doc.save()

    if (doc.status === 'published' && prevStatus !== 'published') {
      notifyEventPublished({ event: doc.toObject(), tenant: req.tenant }).catch((err) =>
        console.error('[notifyEvent]', err.message),
      )
    }

    res.json({ item: serializeEvent(doc.toObject()) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Event.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    await EventRsvp.deleteMany({ tenantId: req.tenant._id, eventId: doc._id })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
