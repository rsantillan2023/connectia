import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import { LiveWebrtcSignal } from '../models/LiveWebrtcSignal.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import {
  activateOla26LiveForTenant,
  deactivateOla26LiveForTenant,
} from '../lib/ensureOla26Menu.js'
import {
  isAllowedStreamUrl,
  tenantHasLiveCap,
  resolveLiveEffectiveStatus,
  serializeLive,
  CAMERA_STREAM_URL,
  CAMERA_LIVE_MAX_PEERS,
  defaultIceServers,
  isCameraLive,
  activateExternalLiveFields,
  deactivateExternalLiveFields,
} from '../lib/tvLive.js'

const router = Router()

/** Admin con admin.live puede entrar aunque live.stream esté off (para reactivar). */
router.use(requireAuth, requireCapability('admin.live'))

router.get('/status', async (req, res, next) => {
  try {
    const liveMode = tenantHasLiveCap(req.tenant)
    const [liveNow, scheduled, total, activeExternal, cameraLives] = await Promise.all([
      LiveBroadcast.countDocuments({ tenantId: req.tenant._id, status: 'live' }),
      LiveBroadcast.countDocuments({ tenantId: req.tenant._id, status: 'scheduled' }),
      LiveBroadcast.countDocuments({ tenantId: req.tenant._id }),
      LiveBroadcast.countDocuments({
        tenantId: req.tenant._id,
        source: { $ne: 'camera' },
        activo: true,
      }),
      LiveBroadcast.find({
        tenantId: req.tenant._id,
        status: 'live',
        source: 'camera',
      }).sort({ startsAt: -1 }),
    ])
    const cameraLiveSerialized = cameraLives.map((doc) =>
      serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
    )
    res.json({
      liveMode,
      label: liveMode ? 'Activo' : 'Inactivo',
      liveNow,
      scheduled,
      total,
      activeExternal,
      cameraLiveCount: cameraLiveSerialized.length,
      /** Varias cámaras concurrentes (un admin por sesión). */
      cameraLives: cameraLiveSerialized,
      /** Compat: la más reciente. */
      cameraLive: cameraLiveSerialized[0] || null,
      iceServers: defaultIceServers(),
      maxPeers: CAMERA_LIVE_MAX_PEERS,
      caps: {
        'live.stream': liveMode,
        'admin.live': hasCapability(req.user, req.tenant, 'admin.live'),
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/activate', async (req, res, next) => {
  try {
    await activateOla26LiveForTenant(req.tenant)
    res.json({
      ok: true,
      liveMode: true,
      capabilities: req.tenant.capabilities,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/deactivate', async (req, res, next) => {
  try {
    const { tenant, livesEnded } = await deactivateOla26LiveForTenant(req.tenant)
    res.json({
      ok: true,
      liveMode: false,
      livesEnded: livesEnded || 0,
      capabilities: tenant.capabilities,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Sale al aire con una emisión cámara ya creada (liveId).
 * Solo cierra la sesión anterior del mismo admin (otros admins pueden transmitir a la vez).
 */
router.post('/camera/start', async (req, res, next) => {
  try {
    if (!tenantHasLiveCap(req.tenant)) {
      return res.status(403).json({ error: 'Activá el módulo Live para transmitir' })
    }
    const liveId = String(req.body?.liveId || '').trim()
    if (!liveId) {
      return res.status(400).json({
        error: 'Creá primero una emisión En vivo y después salí al aire desde Emisiones',
      })
    }
    const doc = await LiveBroadcast.findOne({
      _id: liveId,
      tenantId: req.tenant._id,
      source: 'camera',
    })
    if (!doc) return res.status(404).json({ error: 'Emisión En vivo no encontrada' })

    const now = new Date()
    if (doc.status === 'live') {
      // Reconectar estudio a la misma emisión
      if (req.body?.title) {
        const t = String(req.body.title).trim().slice(0, 200)
        if (t) doc.title = t
      }
      doc.createdByUserId = req.user._id
      await doc.save()
      return res.json({
        live: serializeLive(doc, { effectiveStatus: 'live' }),
        iceServers: defaultIceServers(),
        maxPeers: CAMERA_LIVE_MAX_PEERS,
      })
    }

    const previous = await LiveBroadcast.find({
      tenantId: req.tenant._id,
      source: 'camera',
      status: 'live',
      createdByUserId: req.user._id,
      _id: { $ne: doc._id },
    }).select('_id')
    if (previous.length) {
      const ids = previous.map((p) => p._id)
      await LiveBroadcast.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'draft', endsAt: now, peerCount: 0 } },
      )
      await LiveWebrtcSignal.deleteMany({ liveId: { $in: ids } })
    }

    if (req.body?.title) {
      const t = String(req.body.title).trim().slice(0, 200)
      if (t) doc.title = t
    }
    doc.status = 'live'
    doc.streamUrl = CAMERA_STREAM_URL
    doc.startsAt = doc.startsAt || now
    doc.endsAt = null
    doc.peerCount = 0
    doc.createdByUserId = req.user._id
    if (req.body?.audience) doc.audience = normalizeAudience(req.body.audience)
    await doc.save()

    res.json({
      live: serializeLive(doc, { effectiveStatus: 'live' }),
      iceServers: defaultIceServers(),
      maxPeers: CAMERA_LIVE_MAX_PEERS,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/camera/:id/stop', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      source: 'camera',
    })
    if (!doc) return res.status(404).json({ error: 'Emisión cámara no encontrada' })
    /** Vuelve a borrador para poder salir al aire de nuevo desde Emisiones. */
    doc.status = 'draft'
    doc.endsAt = new Date()
    doc.peerCount = 0
    await doc.save()
    await LiveWebrtcSignal.deleteMany({ liveId: doc._id })
    res.json({ live: serializeLive(doc, { effectiveStatus: 'draft' }) })
  } catch (e) {
    next(e)
  }
})

/** Polling host: offers + ICE de viewers pendientes. */
router.get('/camera/:id/signals', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      source: 'camera',
    })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    if (doc.status !== 'live') return res.json({ signals: [], liveEnded: true })

    const rows = await LiveWebrtcSignal.find({
      liveId: doc._id,
      tenantId: req.tenant._id,
      kind: { $in: ['offer', 'ice-viewer'] },
      consumed: false,
    })
      .sort({ createdAt: 1 })
      .limit(80)
    const offerIds = rows.filter((r) => r.kind === 'offer').map((r) => r._id)
    if (offerIds.length) {
      await LiveWebrtcSignal.updateMany({ _id: { $in: offerIds } }, { $set: { consumed: true } })
    }
    const iceIds = rows.filter((r) => r.kind === 'ice-viewer').map((r) => r._id)
    if (iceIds.length) {
      await LiveWebrtcSignal.updateMany({ _id: { $in: iceIds } }, { $set: { consumed: true } })
    }

    res.json({
      signals: rows.map((r) => ({
        id: String(r._id),
        peerId: r.peerId,
        kind: r.kind,
        payload: r.payload,
        createdAt: r.createdAt,
      })),
      peerCount: doc.peerCount || 0,
      serverTime: new Date().toISOString(),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/camera/:id/answer', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      source: 'camera',
      status: 'live',
    })
    if (!doc) return res.status(404).json({ error: 'Emisión no activa' })
    const peerId = String(req.body?.peerId || '').slice(0, 80)
    const sdp = req.body?.sdp
    if (!peerId || !sdp?.type || !sdp?.sdp) {
      return res.status(400).json({ error: 'peerId y sdp requeridos' })
    }
    await LiveWebrtcSignal.create({
      tenantId: req.tenant._id,
      liveId: doc._id,
      peerId,
      kind: 'answer',
      payload: { type: sdp.type, sdp: String(sdp.sdp) },
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.post('/camera/:id/ice', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      source: 'camera',
      status: 'live',
    })
    if (!doc) return res.status(404).json({ error: 'Emisión no activa' })
    const peerId = String(req.body?.peerId || '').slice(0, 80)
    const candidate = req.body?.candidate
    if (!peerId || !candidate) return res.status(400).json({ error: 'peerId y candidate requeridos' })
    await LiveWebrtcSignal.create({
      tenantId: req.tenant._id,
      liveId: doc._id,
      peerId,
      kind: 'ice-host',
      payload: candidate,
    })
    res.json({ ok: true })
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

/** Activa una emisión URL (puede haber varias activas a la vez; se reusa al desactivar). */
router.post('/:id/activate-emission', async (req, res, next) => {
  try {
    if (!tenantHasLiveCap(req.tenant)) {
      return res.status(403).json({ error: 'Activá el módulo Live primero' })
    }
    const doc = await LiveBroadcast.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    if (isCameraLive(doc)) {
      return res.status(400).json({ error: 'La cámara se controla desde la pestaña Cámara' })
    }
    activateExternalLiveFields(doc)
    await doc.save()
    res.json({
      live: serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
    })
  } catch (e) {
    next(e)
  }
})

/** Apaga una emisión URL sin borrarla (queda en biblioteca para reusar). */
router.post('/:id/deactivate-emission', async (req, res, next) => {
  try {
    const doc = await LiveBroadcast.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Emisión no encontrada' })
    if (isCameraLive(doc)) {
      return res.status(400).json({ error: 'La cámara se controla desde la pestaña Cámara' })
    }
    deactivateExternalLiveFields(doc)
    await doc.save()
    res.json({
      live: serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    if (!tenantHasLiveCap(req.tenant)) {
      return res.status(403).json({ error: 'Activá el módulo Live para crear emisiones' })
    }
    const title = String(req.body?.title || '').trim().slice(0, 200)
    if (!title) return res.status(400).json({ error: 'Título requerido' })

    const wantsCamera = String(req.body?.source || '').toLowerCase() === 'camera'
    if (wantsCamera) {
      const doc = await LiveBroadcast.create({
        tenantId: req.tenant._id,
        title,
        source: 'camera',
        streamUrl: CAMERA_STREAM_URL,
        coverUrl: String(req.body?.coverUrl || '').slice(0, 2000),
        replayUrl: '',
        audience: normalizeAudience(req.body?.audience || { mode: 'all' }),
        status: 'draft',
        activo: false,
        startsAt: req.body?.startsAt ? new Date(req.body.startsAt) : new Date(),
        endsAt: null,
        peerCount: 0,
        createdByUserId: req.user._id,
      })
      return res.status(201).json({
        live: {
          ...serializeLive(doc, { effectiveStatus: resolveLiveEffectiveStatus(doc) }),
          audience: serializeAudience(doc.audience),
        },
      })
    }

    const streamUrl = String(req.body?.streamUrl || '').trim()
    if (!isAllowedStreamUrl(streamUrl) || streamUrl.startsWith('webrtc:')) {
      return res.status(400).json({
        error: 'URL de stream no permitida (YouTube, Vimeo o HLS https). Para cámara elegí tipo En vivo.',
      })
    }
    const activateNow = Boolean(req.body?.activo ?? req.body?.activateNow)
    const status = ['draft', 'scheduled', 'live', 'ended'].includes(req.body?.status)
      ? req.body.status
      : activateNow
        ? 'live'
        : 'draft'
    const doc = new LiveBroadcast({
      tenantId: req.tenant._id,
      title,
      source: 'external',
      coverUrl: String(req.body?.coverUrl || '').slice(0, 2000),
      streamUrl,
      replayUrl: String(req.body?.replayUrl || '').slice(0, 2000),
      audience: normalizeAudience(req.body?.audience),
      status,
      activo: false,
      startsAt: req.body?.startsAt ? new Date(req.body.startsAt) : new Date(),
      endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : null,
      createdByUserId: req.user._id,
    })
    if (activateNow) activateExternalLiveFields(doc)
    else {
      doc.activo = false
      if (doc.status === 'live') doc.status = 'draft'
    }
    await doc.save()
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
    if (isCameraLive(doc) && req.body?.streamUrl != null) {
      return res.status(400).json({ error: 'Una emisión con cámara no usa URL externa' })
    }
    const b = req.body || {}
    if (b.title != null) doc.title = String(b.title).trim().slice(0, 200)
    if (b.coverUrl != null) doc.coverUrl = String(b.coverUrl).slice(0, 2000)
    if (b.streamUrl != null) {
      if (!isAllowedStreamUrl(b.streamUrl) || String(b.streamUrl).startsWith('webrtc:')) {
        return res.status(400).json({ error: 'URL de stream no permitida' })
      }
      doc.streamUrl = String(b.streamUrl).trim()
      doc.source = 'external'
    }
    if (b.replayUrl != null) doc.replayUrl = String(b.replayUrl).slice(0, 2000)
    if (b.audience != null) doc.audience = normalizeAudience(b.audience)
    if (b.activo != null && !isCameraLive(doc)) {
      if (b.activo) {
        if (!tenantHasLiveCap(req.tenant)) {
          return res.status(403).json({ error: 'Activá el módulo Live para publicar emisiones' })
        }
        activateExternalLiveFields(doc)
      } else {
        deactivateExternalLiveFields(doc)
      }
    }
    if (['draft', 'scheduled', 'live', 'ended'].includes(b.status)) {
      if ((b.status === 'live' || b.status === 'scheduled') && !tenantHasLiveCap(req.tenant)) {
        return res.status(403).json({ error: 'Activá el módulo Live para publicar emisiones' })
      }
      doc.status = b.status
      if (!isCameraLive(doc)) {
        if (b.status === 'live') doc.activo = true
        if (b.status === 'draft' || b.status === 'ended') doc.activo = false
      }
      if (b.status === 'ended') {
        doc.endsAt = doc.endsAt || new Date()
        doc.peerCount = 0
        doc.activo = false
        await LiveWebrtcSignal.deleteMany({ liveId: doc._id })
      }
    }
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
    await LiveWebrtcSignal.deleteMany({ liveId: doc._id })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
