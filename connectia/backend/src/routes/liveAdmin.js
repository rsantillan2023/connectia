import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import { activateOla26ForTenant } from '../lib/ensureOla26Menu.js'
import {
  isAllowedStreamUrl,
  tenantHasLiveCap,
  resolveLiveEffectiveStatus,
  serializeLive,
} from '../lib/tvLive.js'

const router = Router()

function requireProductCap(req, res, next) {
  if (!tenantHasLiveCap(req.tenant) && !hasCapability(req.user, req.tenant, 'admin.live')) {
    return res.status(403).json({ error: 'Live streaming no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireCapability('admin.live'), requireProductCap)

router.post('/activate', async (req, res, next) => {
  try {
    await activateOla26ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const list = await LiveBroadcast.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).limit(100)
    res.json({
      items: list.map((d) =>
        serializeLive(d, { effectiveStatus: resolveLiveEffectiveStatus(d) }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 200)
    const streamUrl = String(req.body?.streamUrl || '').trim()
    if (!title) return res.status(400).json({ error: 'Título requerido' })
    if (!isAllowedStreamUrl(streamUrl)) {
      return res.status(400).json({
        error: 'URL de stream no permitida (YouTube, Vimeo o HLS https)',
      })
    }
    const status = ['draft', 'scheduled', 'live', 'ended'].includes(req.body?.status)
      ? req.body.status
      : 'scheduled'
    const doc = await LiveBroadcast.create({
      tenantId: req.tenant._id,
      title,
      coverUrl: String(req.body?.coverUrl || '').slice(0, 2000),
      streamUrl,
      replayUrl: String(req.body?.replayUrl || '').slice(0, 2000),
      audience: normalizeAudience(req.body?.audience),
      status,
      startsAt: req.body?.startsAt ? new Date(req.body.startsAt) : new Date(),
      endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : null,
      createdByUserId: req.user._id,
    })
    res.status(201).json({
      live: {
        ...serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
        audience: serializeAudience(doc.audience),
      },
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    const b = req.body || {}
    if (b.title != null) doc.title = String(b.title).trim().slice(0, 200)
    if (b.coverUrl != null) doc.coverUrl = String(b.coverUrl).slice(0, 2000)
    if (b.streamUrl != null) {
      if (!isAllowedStreamUrl(b.streamUrl)) {
        return res.status(400).json({ error: 'URL de stream no permitida' })
      }
      doc.streamUrl = String(b.streamUrl).trim()
    }
    if (b.replayUrl != null) doc.replayUrl = String(b.replayUrl).slice(0, 2000)
    if (b.audience != null) doc.audience = normalizeAudience(b.audience)
    if (['draft', 'scheduled', 'live', 'ended'].includes(b.status)) doc.status = b.status
    if (b.startsAt !== undefined) doc.startsAt = b.startsAt ? new Date(b.startsAt) : null
    if (b.endsAt !== undefined) doc.endsAt = b.endsAt ? new Date(b.endsAt) : null
    await doc.save()
    res.json({
      live: {
        ...serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
        audience: serializeAudience(doc.audience),
      },
    })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant._id,
    })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
