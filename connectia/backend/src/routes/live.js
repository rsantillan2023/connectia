import { Router } from 'express'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import {
  audienceFilterForUser,
  resolveClientIdsForUser,
  userMatchesAudience,
} from '../lib/audience.js'
import {
  tenantHasLiveCap,
  resolveLiveEffectiveStatus,
  serializeLive,
} from '../lib/tvLive.js'

const router = Router()

function requireLiveCap(req, res, next) {
  if (!tenantHasLiveCap(req.tenant) && !hasCapability(req.user, req.tenant, 'admin.live')) {
    return res.status(403).json({ error: 'Live streaming no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireLiveCap)

router.get('/active', async (req, res, next) => {
  try {
    const clientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
    const aud = audienceFilterForUser(req.user, { clientIds })
    const list = await LiveBroadcast.find({
      tenantId: req.tenant._id,
      status: { $in: ['scheduled', 'live'] },
      $and: [aud],
    })
      .sort({ startsAt: -1 })
      .limit(20)

    const now = new Date()
    const items = []
    for (const doc of list) {
      const eff = resolveLiveEffectiveStatus(doc, now)
      if (eff !== 'live' && eff !== 'scheduled') continue
      if (!userMatchesAudience(req.user, doc.audience, { clientIds })) continue
      items.push(serializeLive(doc, { effectiveStatus: eff }))
    }
    const liveNow = items.find((i) => i.effectiveStatus === 'live') || null
    res.json({ liveNow, items })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    const clientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
    if (!userMatchesAudience(req.user, doc.audience, { clientIds })) {
      return res.status(403).json({ error: 'No tenés acceso a esta emisión' })
    }
    const eff = resolveLiveEffectiveStatus(doc)
    res.json({ live: serializeLive(doc, { effectiveStatus: eff }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/view', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    const clientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
    if (!userMatchesAudience(req.user, doc.audience, { clientIds })) {
      return res.status(403).json({ error: 'No tenés acceso a esta emisión' })
    }
    doc.viewCount = (doc.viewCount || 0) + 1
    await doc.save()
    res.json({ viewCount: doc.viewCount })
  } catch (e) {
    next(e)
  }
})

export default router
