import { Router } from 'express'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import { LiveWebrtcSignal } from '../models/LiveWebrtcSignal.js'
import {
  audienceFilterForUser,
  resolveClientIdsForUser,
  userMatchesAudience,
} from '../lib/audience.js'
import {
  tenantHasLiveCap,
  resolveLiveEffectiveStatus,
  serializeLive,
  isCameraLive,
  isLiveVisibleToMembers,
  defaultIceServers,
  newLivePeerId,
  CAMERA_LIVE_MAX_PEERS,
} from '../lib/tvLive.js'

const router = Router()

function requireLiveCap(req, res, next) {
  if (!tenantHasLiveCap(req.tenant) && !hasCapability(req.user, req.tenant, 'admin.live')) {
    return res.status(403).json({ error: 'Live streaming no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireLiveCap)

async function loadLiveForUser(req, liveId) {
  const doc = await LiveBroadcast.findOne({ _id: liveId, tenantId: req.tenant._id })
  if (!doc) return { error: { status: 404, message: 'Emisión no encontrada' } }
  const clientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
  if (!userMatchesAudience(req.user, doc.audience, { clientIds })) {
    return { error: { status: 403, message: 'No tenés acceso a esta emisión' } }
  }
  return { doc, clientIds }
}

router.get('/active', async (req, res, next) => {
  try {
    if (!tenantHasLiveCap(req.tenant)) {
      return res.json({ liveNow: null, items: [], liveMode: false })
    }
    const clientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
    const aud = audienceFilterForUser(req.user, { clientIds })
    /** Cámara en live + URL activas (activo) + legado scheduled/live sin campo activo */
    const list = await LiveBroadcast.find({
      tenantId: req.tenant._id,
      $and: [
        aud,
        {
          $or: [
            { source: 'camera', status: 'live' },
            { source: { $ne: 'camera' }, activo: true },
            {
              source: { $ne: 'camera' },
              activo: { $exists: false },
              status: { $in: ['live', 'scheduled'] },
            },
          ],
        },
      ],
    })
      .sort({ startsAt: -1 })
      .limit(40)

    const now = new Date()
    const items = []
    for (const doc of list) {
      if (!isLiveVisibleToMembers(doc)) continue
      if (!userMatchesAudience(req.user, doc.audience, { clientIds })) continue
      const eff = resolveLiveEffectiveStatus(doc, now)
      items.push(serializeLive(doc, { effectiveStatus: eff }))
    }
    const liveNow =
      items.find((i) => i.source === 'camera' && i.effectiveStatus === 'live') ||
      items.find((i) => i.activo || i.effectiveStatus === 'live') ||
      items[0] ||
      null
    res.json({ liveNow, items, iceServers: defaultIceServers() })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/webrtc/join', async (req, res, next) => {
  try {
    if (!tenantHasLiveCap(req.tenant)) {
      return res.status(403).json({ error: 'Live streaming no activo' })
    }
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    if (!isCameraLive(doc) || doc.status !== 'live') {
      return res.status(400).json({ error: 'Esta emisión no es una cámara en vivo' })
    }
    if ((doc.peerCount || 0) >= CAMERA_LIVE_MAX_PEERS) {
      return res.status(503).json({ error: 'Sala llena. Intentá en unos segundos.' })
    }
    const peerId = newLivePeerId()
    doc.peerCount = (doc.peerCount || 0) + 1
    await doc.save()
    res.json({
      peerId,
      iceServers: defaultIceServers(),
      live: serializeLive(doc, { effectiveStatus: 'live' }),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/webrtc/offer', async (req, res, next) => {
  try {
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    if (!isCameraLive(doc) || doc.status !== 'live') {
      return res.status(400).json({ error: 'Emisión cámara no activa' })
    }
    const peerId = String(req.body?.peerId || '').slice(0, 80)
    const sdp = req.body?.sdp
    if (!peerId || !sdp?.type || !sdp?.sdp) {
      return res.status(400).json({ error: 'peerId y sdp requeridos' })
    }
    await LiveWebrtcSignal.create({
      tenantId: req.tenant._id,
      liveId: doc._id,
      peerId,
      kind: 'offer',
      payload: { type: sdp.type, sdp: String(sdp.sdp) },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/webrtc/ice', async (req, res, next) => {
  try {
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    if (!isCameraLive(doc) || doc.status !== 'live') {
      return res.status(400).json({ error: 'Emisión cámara no activa' })
    }
    const peerId = String(req.body?.peerId || '').slice(0, 80)
    const candidate = req.body?.candidate
    if (!peerId || !candidate) return res.status(400).json({ error: 'peerId y candidate requeridos' })
    await LiveWebrtcSignal.create({
      tenantId: req.tenant._id,
      liveId: doc._id,
      peerId,
      kind: 'ice-viewer',
      payload: candidate,
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Polling viewer: answer + ICE del host. */
router.get('/:id/webrtc/signals/:peerId', async (req, res, next) => {
  try {
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    if (!isCameraLive(doc)) {
      return res.status(400).json({ error: 'No es emisión cámara' })
    }
    if (doc.status !== 'live') {
      return res.json({ signals: [], liveEnded: true })
    }
    const peerId = String(req.params.peerId || '').slice(0, 80)
    const rows = await LiveWebrtcSignal.find({
      liveId: doc._id,
      tenantId: req.tenant._id,
      peerId,
      kind: { $in: ['answer', 'ice-host'] },
      consumed: false,
    })
      .sort({ createdAt: 1 })
      .limit(40)
    const ids = rows.map((r) => r._id)
    if (ids.length) {
      await LiveWebrtcSignal.updateMany({ _id: { $in: ids } }, { $set: { consumed: true } })
    }
    res.json({
      signals: rows.map((r) => ({
        id: String(r._id),
        kind: r.kind,
        payload: r.payload,
        createdAt: r.createdAt,
      })),
      liveEnded: false,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    const eff = resolveLiveEffectiveStatus(doc)
    res.json({ live: serializeLive(doc, { effectiveStatus: eff }), iceServers: defaultIceServers() })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/view', async (req, res, next) => {
  try {
    const { doc, error } = await loadLiveForUser(req, req.params.id)
    if (error) return res.status(error.status).json({ error: error.message })
    doc.viewCount = (doc.viewCount || 0) + 1
    await doc.save()
    res.json({ viewCount: doc.viewCount })
  } catch (e) {
    next(e)
  }
})

export default router
