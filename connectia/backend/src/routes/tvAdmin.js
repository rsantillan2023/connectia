import { Router } from 'express'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { TvDevice, TvPlaylist } from '../models/Tv.js'
import { activateOla26ForTenant } from '../lib/ensureOla26Menu.js'
import {
  serializeDevice,
  serializePlaylist,
  tenantHasTvCap,
} from '../lib/tvLive.js'

const router = Router()

function requireProductCap(req, res, next) {
  if (!tenantHasTvCap(req.tenant) && !hasCapability(req.user, req.tenant, 'admin.tv')) {
    return res.status(403).json({ error: 'Modo TV no activo en esta comunidad' })
  }
  next()
}

router.use(requireAuth, requireCapability('admin.tv'), requireProductCap)

router.post('/activate', async (req, res, next) => {
  try {
    await activateOla26ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

router.post('/ensure-menu', async (req, res, next) => {
  try {
    await activateOla26ForTenant(req.tenant)
    res.json({ ok: true, capabilities: req.tenant.capabilities })
  } catch (e) {
    next(e)
  }
})

router.get('/devices', async (req, res, next) => {
  try {
    const list = await TvDevice.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).limit(200)
    res.json({ items: list.map(serializeDevice) })
  } catch (e) {
    next(e)
  }
})

router.patch('/devices/:id', async (req, res, next) => {
  try {
    const device = await TvDevice.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' })
    const b = req.body || {}
    if (b.name != null) device.name = String(b.name).slice(0, 120)
    if (b.locationLabel != null) device.locationLabel = String(b.locationLabel).slice(0, 200)
    if (b.mute != null) device.mute = Boolean(b.mute)
    if (b.orientation === 'landscape' || b.orientation === 'portrait') {
      device.orientation = b.orientation
    }
    if (b.playlistId !== undefined) {
      if (!b.playlistId) device.playlistId = null
      else {
        const pl = await TvPlaylist.findOne({ _id: b.playlistId, tenantId: req.tenant._id })
        if (!pl) return res.status(400).json({ error: 'Playlist inválida' })
        device.playlistId = pl._id
      }
    }
    device.configVersion = (device.configVersion || 1) + 1
    await device.save()
    res.json({ device: serializeDevice(device) })
  } catch (e) {
    next(e)
  }
})

router.post('/devices/:id/revoke', async (req, res, next) => {
  try {
    const device = await TvDevice.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' })
    device.status = 'revoked'
    device.credentialHash = `revoked:${device._id}:${Date.now()}`
    await device.save()
    res.json({ device: serializeDevice(device) })
  } catch (e) {
    next(e)
  }
})

router.get('/playlists', async (req, res, next) => {
  try {
    const list = await TvPlaylist.find({ tenantId: req.tenant._id }).sort({ updatedAt: -1 }).limit(100)
    res.json({ items: list.map(serializePlaylist) })
  } catch (e) {
    next(e)
  }
})

router.post('/playlists', async (req, res, next) => {
  try {
    const name = String(req.body?.name || 'Playlist').slice(0, 120)
    const items = normalizeItems(req.body?.items)
    const doc = await TvPlaylist.create({
      tenantId: req.tenant._id,
      name,
      items,
      fallbackText: String(req.body?.fallbackText || 'Contenido no disponible').slice(0, 300),
    })
    res.status(201).json({ playlist: serializePlaylist(doc) })
  } catch (e) {
    next(e)
  }
})

router.patch('/playlists/:id', async (req, res, next) => {
  try {
    const doc = await TvPlaylist.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Playlist no encontrada' })
    if (req.body?.name != null) doc.name = String(req.body.name).slice(0, 120)
    if (req.body?.fallbackText != null) {
      doc.fallbackText = String(req.body.fallbackText).slice(0, 300)
    }
    if (req.body?.activo != null) doc.activo = Boolean(req.body.activo)
    if (Array.isArray(req.body?.items)) {
      doc.items = normalizeItems(req.body.items)
      doc.version = (doc.version || 1) + 1
    }
    await doc.save()
    res.json({ playlist: serializePlaylist(doc) })
  } catch (e) {
    next(e)
  }
})

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(['image', 'video', 'youtube', 'text', 'post'])
  return raw.slice(0, 100).map((it, idx) => ({
    type: allowed.has(it?.type) ? it.type : 'text',
    url: String(it?.url || '').slice(0, 2000),
    text: String(it?.text || '').slice(0, 500),
    postId: it?.postId || null,
    durationSec: Math.min(3600, Math.max(5, Number(it?.durationSec) || 15)),
    order: Number.isFinite(Number(it?.order)) ? Number(it.order) : idx,
    startsAt: it?.startsAt ? new Date(it.startsAt) : null,
    endsAt: it?.endsAt ? new Date(it.endsAt) : null,
    activo: it?.activo !== false,
  }))
}

export default router
