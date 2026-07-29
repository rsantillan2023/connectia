import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { PointsRule, POINTS_EVENTS } from '../models/PointsRule.js'
import {
  POINTS_EVENT_LABELS,
  DEFAULT_POINTS_RULES,
  serializePointsRule,
  ensureDefaultPointsRules,
} from '../lib/pointsRules.js'
import { tenantHasWallet } from '../lib/walletService.js'

const router = Router()

router.use(requireAuth, requireCapability('admin.beneficios'))

/** GET /api/admin/points-rules — listado + catálogo de eventos */
router.get('/', async (req, res, next) => {
  try {
    const rows = await PointsRule.find({ tenantId: req.tenant._id }).sort({ event: 1 })
    const byEvent = new Map(rows.map((r) => [r.event, r]))
    const items = POINTS_EVENTS.map((event) => {
      const row = byEvent.get(event)
      if (row) return serializePointsRule(row)
      const def = DEFAULT_POINTS_RULES.find((d) => d.event === event)
      return {
        id: null,
        event,
        eventLabel: POINTS_EVENT_LABELS[event],
        label: POINTS_EVENT_LABELS[event],
        points: def?.points ?? 0,
        dailyCap: def?.dailyCap ?? null,
        enabled: false,
        updatedAt: null,
        missing: true,
      }
    })
    res.json({
      items,
      events: POINTS_EVENTS.map((e) => ({ key: e, label: POINTS_EVENT_LABELS[e] })),
      walletEnabled: tenantHasWallet(req.tenant),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * PUT /api/admin/points-rules/:event — upsert regla
 * Body: { points, dailyCap?, enabled?, label? }
 */
router.put('/:event', async (req, res, next) => {
  try {
    const event = String(req.params.event || '')
    if (!POINTS_EVENTS.includes(event)) {
      return res.status(400).json({ error: 'Evento inválido' })
    }
    const body = req.body || {}
    const points = Number(body.points)
    if (!Number.isFinite(points) || points < 0) {
      return res.status(400).json({ error: 'points debe ser ≥ 0' })
    }
    let dailyCap = null
    if (body.dailyCap !== '' && body.dailyCap != null) {
      dailyCap = Number(body.dailyCap)
      if (!Number.isFinite(dailyCap) || dailyCap < 0) {
        return res.status(400).json({ error: 'dailyCap inválido' })
      }
    }
    const enabled = body.enabled !== false && body.enabled !== 'false'
    const label =
      String(body.label || POINTS_EVENT_LABELS[event] || event).trim().slice(0, 120) ||
      POINTS_EVENT_LABELS[event]

    const row = await PointsRule.findOneAndUpdate(
      { tenantId: req.tenant._id, event },
      {
        $set: {
          points,
          dailyCap,
          enabled,
          label,
        },
        $setOnInsert: {
          tenantId: req.tenant._id,
          event,
          createdBy: req.user._id,
        },
      },
      { upsert: true, new: true },
    )
    res.json({ rule: serializePointsRule(row) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/points-rules/seed — crear defaults faltantes */
router.post('/seed', async (req, res, next) => {
  try {
    const result = await ensureDefaultPointsRules(req.tenant._id, { createdBy: req.user._id })
    const rows = await PointsRule.find({ tenantId: req.tenant._id }).sort({ event: 1 })
    res.json({
      ...result,
      items: rows.map(serializePointsRule),
    })
  } catch (e) {
    next(e)
  }
})

export default router
