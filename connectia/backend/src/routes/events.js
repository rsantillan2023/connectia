import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { Event, EventRsvp } from '../models/Event.js'
import { audienceFilterForUser } from '../lib/audience.js'
import {
  serializeEvent,
  EVENT_TIPOS,
  TIPO_META,
  canConfirmRsvp,
  RSVP_ESTADOS,
} from '../lib/event.js'
import {
  pushEventToPersonalCalendars,
  removeEventFromPersonalCalendars,
} from '../services/calendarPush.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function publishedFilter(tenantId, user) {
  return {
    tenantId,
    status: 'published',
    $and: [audienceFilterForUser(user)],
  }
}

async function rsvpMapFor(tenantId, userId, eventIds) {
  if (!eventIds.length) return new Map()
  const rows = await EventRsvp.find({
    tenantId,
    userId,
    eventId: { $in: eventIds },
  }).lean()
  return new Map(rows.map((r) => [String(r.eventId), r]))
}

/** GET /api/events — calendario corporativo (rango) */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const from = req.query.from ? new Date(req.query.from) : null
    const to = req.query.to ? new Date(req.query.to) : null
    const tipo = String(req.query.tipo || '').trim()

    const filter = publishedFilter(tenantId, req.user)
    if (from && !Number.isNaN(from.getTime()) && to && !Number.isNaN(to.getTime())) {
      filter.inicio = { $lte: to }
      filter.fin = { $gte: from }
    } else if (from && !Number.isNaN(from.getTime())) {
      filter.fin = { $gte: from }
    } else if (to && !Number.isNaN(to.getTime())) {
      filter.inicio = { $lte: to }
    }
    if (tipo && EVENT_TIPOS.includes(tipo)) filter.tipo = tipo

    const items = await Event.find(filter).sort({ inicio: 1 }).limit(300).lean()
    const rsvpMap = await rsvpMapFor(
      tenantId,
      req.user._id,
      items.map((e) => e._id),
    )

    res.json({
      items: items.map((e) =>
        serializeEvent(e, { rsvp: rsvpMap.get(String(e._id)) || null }),
      ),
      timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
      tipos: EVENT_TIPOS.map((t) => ({ id: t, label: TIPO_META[t].label, color: TIPO_META[t].color })),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/events/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Event.findOne({
      _id: req.params.id,
      ...publishedFilter(req.tenant._id, req.user),
    }).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const rsvp = await EventRsvp.findOne({
      tenantId: req.tenant._id,
      eventId: doc._id,
      userId: req.user._id,
    }).lean()
    res.json({
      item: serializeEvent(doc, { rsvp: rsvp || null }),
      timezone: req.tenant.timezone || 'America/Argentina/Buenos_Aires',
    })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/events/:id/rsvp
 * Body: { estado: 'confirmado'|'rechazado', syncPersonal?: true }
 */
router.post('/:id/rsvp', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const estado = String(req.body?.estado || '').trim()
    if (!RSVP_ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'estado debe ser confirmado o rechazado' })
    }
    const syncPersonal = req.body?.syncPersonal !== false

    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!event) return res.status(404).json({ error: 'No encontrado' })

    const existing = await EventRsvp.findOne({
      tenantId: req.tenant._id,
      eventId: event._id,
      userId: req.user._id,
    })

    const confirmados = await EventRsvp.countDocuments({
      tenantId: req.tenant._id,
      eventId: event._id,
      estado: 'confirmado',
    })

    if (estado === 'confirmado') {
      const check = canConfirmRsvp(event, confirmados, existing?.estado)
      if (!check.ok) return res.status(409).json({ error: check.error })
    }

    const prevEstado = existing?.estado || null
    let external = existing?.external || { outlookEventId: '', googleEventId: '' }

    if (estado === 'confirmado' && syncPersonal) {
      const pushed = await pushEventToPersonalCalendars({
        tenantId: req.tenant._id,
        userId: req.user._id,
        event,
        existingExternal: external,
      })
      external = {
        outlookEventId: pushed.outlookEventId || '',
        googleEventId: pushed.googleEventId || '',
      }
    }

    if (estado === 'rechazado' && existing?.estado === 'confirmado') {
      await removeEventFromPersonalCalendars({
        tenantId: req.tenant._id,
        userId: req.user._id,
        external,
      })
      external = { outlookEventId: '', googleEventId: '' }
    }

    const rsvp = await EventRsvp.findOneAndUpdate(
      { tenantId: req.tenant._id, eventId: event._id, userId: req.user._id },
      {
        $set: {
          estado,
          confirmedAt: new Date(),
          external,
        },
        $setOnInsert: {
          tenantId: req.tenant._id,
          eventId: event._id,
          userId: req.user._id,
        },
      },
      { upsert: true, new: true },
    )

    // actualizar contadores
    if (prevEstado !== estado) {
      const inc = {}
      if (prevEstado === 'confirmado') inc.rsvpConfirmados = -1
      if (prevEstado === 'rechazado') inc.rsvpRechazados = -1
      if (estado === 'confirmado') inc.rsvpConfirmados = (inc.rsvpConfirmados || 0) + 1
      if (estado === 'rechazado') inc.rsvpRechazados = (inc.rsvpRechazados || 0) + 1
      if (Object.keys(inc).length) {
        await Event.updateOne({ _id: event._id }, { $inc: inc })
      }
    }

    const fresh = await Event.findById(event._id).lean()
    if (estado === 'confirmado' && prevEstado !== 'confirmado') {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'event_rsvp_confirmed',
        entityId: event._id,
      })
    }
    res.json({
      ok: true,
      item: serializeEvent(fresh, { rsvp: rsvp.toObject() }),
    })
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Conflicto de concurrencia; reintentá' })
    }
    next(e)
  }
})

/** DELETE /api/events/:id/rsvp — eliminar asistencia (idempotente) */
router.delete('/:id/rsvp', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.json({ ok: true, rsvp: null })
    const existing = await EventRsvp.findOne({
      tenantId: req.tenant._id,
      eventId: req.params.id,
      userId: req.user._id,
    })
    if (!existing) return res.json({ ok: true, rsvp: null })

    await removeEventFromPersonalCalendars({
      tenantId: req.tenant._id,
      userId: req.user._id,
      external: existing.external,
    })

    const prev = existing.estado
    await EventRsvp.deleteOne({ _id: existing._id })
    const inc = {}
    if (prev === 'confirmado') inc.rsvpConfirmados = -1
    if (prev === 'rechazado') inc.rsvpRechazados = -1
    if (Object.keys(inc).length) {
      await Event.updateOne(
        { _id: req.params.id, tenantId: req.tenant._id },
        { $inc: inc },
      )
    }

    const fresh = await Event.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    }).lean()
    res.json({
      ok: true,
      rsvp: null,
      item: fresh ? serializeEvent(fresh, { rsvp: null }) : null,
    })
  } catch (e) {
    next(e)
  }
})

export default router
