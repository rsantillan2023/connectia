import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, hasCapability } from '../middleware/auth.js'
import { TvDevice, TvPairingSession, TvPlaylist } from '../models/Tv.js'
import { Tenant } from '../models/Tenant.js'
import {
  PAIRING_TTL_MS,
  PAIRING_MAX_ATTEMPTS,
  generatePairingCode,
  generateDeviceCredential,
  hashDeviceCredential,
  tenantHasTvCap,
  serializeDevice,
  defaultChannelConfig,
  normalizeChannelConfig,
  scrubRickrollPlaylistItems,
} from '../lib/tvLive.js'
import { userMatchesAudience } from '../lib/audience.js'
import { resolveTvFeedManifest } from '../lib/tvFeed.js'

const router = Router()

async function requireTvDevice(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Dispositivo no autenticado' })
    const hash = hashDeviceCredential(token)
    const device = await TvDevice.findOne({ credentialHash: hash, status: 'active' })
    if (!device) return res.status(401).json({ error: 'Credencial TV inválida o revocada' })
    const tenant = await Tenant.findById(device.tenantId)
    if (!tenant || !tenant.activo) return res.status(401).json({ error: 'Tenant inactivo' })
    if (!tenantHasTvCap(tenant)) return res.status(403).json({ error: 'Modo TV no activo' })
    req.tvDevice = device
    req.tenant = tenant
    next()
  } catch (e) {
    next(e)
  }
}

function requireUserTvCap(req, res, next) {
  if (!tenantHasTvCap(req.tenant) && !hasCapability(req.user, req.tenant, 'admin.tv')) {
    return res.status(403).json({ error: 'Modo TV no activo en esta comunidad' })
  }
  next()
}

/** TV: inicia sesión de emparejamiento (sin login de usuario). */
router.post('/pairing/start', async (req, res, next) => {
  try {
    const fingerprint = String(req.body?.fingerprint || '').slice(0, 200)
    const deviceName = String(req.body?.deviceName || 'Pantalla TV').slice(0, 120)
    let code
    for (let i = 0; i < 8; i++) {
      code = generatePairingCode()
      const clash = await TvPairingSession.findOne({
        code,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      if (!clash) break
    }
    const session = await TvPairingSession.create({
      code,
      fingerprint,
      deviceName,
      expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
      status: 'pending',
    })
    res.status(201).json({
      sessionId: String(session._id),
      code: session.code,
      expiresAt: session.expiresAt,
      ttlSec: Math.floor(PAIRING_TTL_MS / 1000),
    })
  } catch (e) {
    next(e)
  }
})

/** TV: consulta estado (poll). Entrega credencial una sola vez. */
router.get('/pairing/:sessionId/status', async (req, res, next) => {
  try {
    const session = await TvPairingSession.findById(req.params.sessionId)
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
    if (session.status === 'pending' && session.expiresAt < new Date()) {
      session.status = 'expired'
      await session.save()
    }
    if (session.status === 'confirmed' && session.pendingCredential) {
      const deviceToken = session.pendingCredential
      session.pendingCredential = ''
      session.status = 'consumed'
      await session.save()
      return res.json({
        status: 'confirmed',
        deviceToken,
        deviceId: session.deviceId ? String(session.deviceId) : null,
      })
    }
    res.json({
      status: session.status === 'consumed' ? 'confirmed' : session.status,
      deviceId: session.deviceId ? String(session.deviceId) : null,
      deviceToken: null,
    })
  } catch (e) {
    next(e)
  }
})

/** U: canales activos visibles para este usuario (para elegir al emparejar). */
router.get('/playlists', requireAuth, requireUserTvCap, async (req, res, next) => {
  try {
    const list = await TvPlaylist.find({ tenantId: req.tenant._id, activo: true })
      .sort({ name: 1 })
      .limit(100)
      .lean()
    const items = list
      .filter((p) => userMatchesAudience(req.user, p.audience || { mode: 'all' }))
      .map((p) => ({
        id: String(p._id),
        name: p.name,
        fallbackText: p.fallbackText || '',
      }))
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

/** U: confirma código y vincula dispositivo al tenant. */
router.post('/pairing/confirm', requireAuth, requireUserTvCap, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').replace(/\D/g, '').padStart(6, '0').slice(-6)
    const locationLabel = String(req.body?.locationLabel || '').trim().slice(0, 200)
    const name = String(req.body?.name || '').trim().slice(0, 120)
    const playlistId = String(req.body?.playlistId || '').trim()
    if (!name) return res.status(400).json({ error: 'Indicá un nombre para la pantalla' })
    if (!locationLabel) return res.status(400).json({ error: 'Indicá la ubicación de la pantalla' })
    if (!playlistId || !mongoose.isValidObjectId(playlistId)) {
      return res.status(400).json({ error: 'Elegí un canal para esta pantalla' })
    }

    const session = await TvPairingSession.findOne({ code, status: 'pending' })
    if (!session) return res.status(404).json({ error: 'Código inválido o ya usado' })
    if (session.expiresAt < new Date()) {
      session.status = 'expired'
      await session.save()
      return res.status(410).json({ error: 'Código expirado' })
    }
    if (session.attempts >= PAIRING_MAX_ATTEMPTS) {
      session.status = 'expired'
      await session.save()
      return res.status(429).json({ error: 'Demasiados intentos' })
    }
    session.attempts += 1

    let playlist = await TvPlaylist.findOne({
      _id: playlistId,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!playlist) {
      return res.status(400).json({ error: 'Canal no disponible o inactivo' })
    }
    if (!userMatchesAudience(req.user, playlist.audience || { mode: 'all' })) {
      return res.status(403).json({ error: 'No tenés permiso para asignar este canal' })
    }

    const credential = generateDeviceCredential()
    const scrubbed = scrubRickrollPlaylistItems(playlist.items)
    const needsChannel = !playlist.channel || playlist.channel.wallEnabled == null
    if (scrubbed.dirty || needsChannel) {
      playlist.channel = normalizeChannelConfig(
        { ...defaultChannelConfig(req.tenant.nombre), ...(playlist.channel?.toObject?.() || playlist.channel || {}) },
        req.tenant.nombre,
      )
      if (scrubbed.dirty) {
        playlist.items = scrubbed.items
        if (playlist.name === 'Playlist sede' || playlist.name === 'Playlist demo sede') {
          playlist.name = 'Canal sede'
        }
      }
      playlist.version = (playlist.version || 1) + 1
      playlist.fallbackText =
        playlist.fallbackText || `${req.tenant.nombre || 'Connectia'} · pantalla en espera`
      await playlist.save()
    }

    const device = await TvDevice.create({
      tenantId: req.tenant._id,
      name,
      locationLabel,
      fingerprint: session.fingerprint || '',
      credentialHash: hashDeviceCredential(credential),
      playlistId: playlist._id,
      pairedByUserId: req.user._id,
      pairedAt: new Date(),
      status: 'active',
    })

    session.tenantId = req.tenant._id
    session.status = 'confirmed'
    session.confirmedByUserId = req.user._id
    session.deviceId = device._id
    session.pendingCredential = credential
    await session.save()

    res.json({
      ok: true,
      device: serializeDevice(device),
      playlist: { id: String(playlist._id), name: playlist.name },
      tenantName: req.tenant.nombre,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/feed', requireTvDevice, async (req, res, next) => {
  try {
    let playlist = req.tvDevice.playlistId
      ? await TvPlaylist.findOne({
          _id: req.tvDevice.playlistId,
          tenantId: req.tenant._id,
          activo: true,
        })
      : null
    if (playlist) {
      let dirty = false
      const scrubbed = scrubRickrollPlaylistItems(playlist.items)
      if (scrubbed.dirty) {
        playlist.items = scrubbed.items
        playlist.version = (playlist.version || 1) + 1
        dirty = true
      }
      if (!playlist.channel || playlist.channel.welcomeText == null || playlist.channel.wallEnabled == null) {
        playlist.channel = normalizeChannelConfig(
          { ...defaultChannelConfig(req.tenant.nombre), ...(playlist.channel?.toObject?.() || playlist.channel || {}) },
          req.tenant.nombre,
        )
        dirty = true
      }
      if (dirty) await playlist.save()
    }
    const manifest = await resolveTvFeedManifest(playlist, req.tvDevice, req.tenant)
    const ifNone = req.headers['if-none-match']
    if (ifNone && ifNone === manifest.etag) {
      return res.status(304).end()
    }
    res.setHeader('ETag', manifest.etag)
    res.json(manifest)
  } catch (e) {
    next(e)
  }
})

router.post('/heartbeat', requireTvDevice, async (req, res, next) => {
  try {
    const err = String(req.body?.error || '').slice(0, 500)
    req.tvDevice.lastHeartbeatAt = new Date()
    if (err) req.tvDevice.lastError = err
    else if (req.body?.clearError) req.tvDevice.lastError = ''
    await req.tvDevice.save()
    res.json({ ok: true, at: req.tvDevice.lastHeartbeatAt })
  } catch (e) {
    next(e)
  }
})

router.get('/me', requireTvDevice, (req, res) => {
  res.json({ device: serializeDevice(req.tvDevice), tenantName: req.tenant.nombre })
})

/** TV: la propia pantalla se da de baja (sin login de usuario). */
router.post('/me/unlink', requireTvDevice, async (req, res, next) => {
  try {
    const device = req.tvDevice
    device.status = 'revoked'
    device.credentialHash = `revoked:${device._id}:${Date.now()}`
    await device.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** U: pantallas vinculadas a la comunidad. */
router.get('/devices', requireAuth, requireUserTvCap, async (req, res, next) => {
  try {
    const list = await TvDevice.find({ tenantId: req.tenant._id, status: 'active' })
      .sort({ updatedAt: -1 })
      .limit(100)
    res.json({ items: list.map(serializeDevice) })
  } catch (e) {
    next(e)
  }
})

/** U: desvincula una TV (invalida credencial; la pantalla vuelve a pedir código). */
router.post('/devices/:id/unlink', requireAuth, requireUserTvCap, async (req, res, next) => {
  try {
    const device = await TvDevice.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'active',
    })
    if (!device) return res.status(404).json({ error: 'Pantalla no encontrada' })
    device.status = 'revoked'
    device.credentialHash = `revoked:${device._id}:${Date.now()}`
    await device.save()
    res.json({ ok: true, device: serializeDevice(device) })
  } catch (e) {
    next(e)
  }
})

export default router
