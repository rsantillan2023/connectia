import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, requireCapability, hasCapability } from '../middleware/auth.js'
import { TvDevice, TvPlaylist } from '../models/Tv.js'
import { Post } from '../models/Post.js'
import { PostCategory } from '../models/PostCategory.js'
import { activateOla26ForTenant, deactivateOla26TvForTenant } from '../lib/ensureOla26Menu.js'
import {
  serializeDevice,
  serializePlaylist,
  tenantHasTvCap,
  normalizeChannelConfig,
  defaultChannelConfig,
  defaultTvPlaylistItems,
  stripHtmlLite,
  normalizeAudience,
  postMedia,
  normalizeTextSlideStyle,
} from '../lib/tvLive.js'
import { resolveTvFeedManifest } from '../lib/tvFeed.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const router = Router()

function ensureTvUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const tvMediaUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      try {
        ensureTvUploadDir()
        cb(null, UPLOAD_DIR)
      } catch (e) {
        cb(e)
      }
    },
    filename(_req, file, cb) {
      const rawExt = path.extname(file.originalname || '').toLowerCase()
      let ext = '.bin'
      if (/^\.(jpe?g|png|webp|gif)$/i.test(rawExt)) ext = rawExt.replace('jpeg', 'jpg')
      else if (/^\.(mp4|webm|mov|m4v)$/i.test(rawExt)) ext = rawExt
      else if (/^image\/jpeg/i.test(file.mimetype)) ext = '.jpg'
      else if (/^image\/png/i.test(file.mimetype)) ext = '.png'
      else if (/^image\/webp/i.test(file.mimetype)) ext = '.webp'
      else if (/^image\/gif/i.test(file.mimetype)) ext = '.gif'
      else if (/^video\/mp4/i.test(file.mimetype)) ext = '.mp4'
      else if (/^video\/webm/i.test(file.mimetype)) ext = '.webm'
      else if (/^video\/quicktime/i.test(file.mimetype)) ext = '.mov'
      const name = `tv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
      cb(null, name)
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (
      /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype) ||
      /^video\/(mp4|webm|quicktime|x-m4v)$/i.test(file.mimetype)
    ) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif) o videos (mp4, webm, mov)'))
    }
  },
})

/** Admin con pantall admin.tv puede entrar aunque tv.mode esté off (para reactivar). */
router.use(requireAuth, requireCapability('admin.tv'))

router.get('/status', async (req, res, next) => {
  try {
    const tvMode = tenantHasTvCap(req.tenant)
    const [devicesActive, devicesTotal, playlists] = await Promise.all([
      TvDevice.countDocuments({ tenantId: req.tenant._id, status: 'active' }),
      TvDevice.countDocuments({ tenantId: req.tenant._id }),
      TvPlaylist.countDocuments({ tenantId: req.tenant._id, activo: true }),
    ])
    res.json({
      tvMode,
      label: tvMode ? 'Activo' : 'Inactivo',
      devicesActive,
      devicesTotal,
      playlists,
      caps: {
        'tv.mode': tvMode,
        'admin.tv': hasCapability(req.user, req.tenant, 'admin.tv'),
      },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/activate', async (req, res, next) => {
  try {
    await activateOla26ForTenant(req.tenant)
    res.json({
      ok: true,
      tvMode: true,
      capabilities: req.tenant.capabilities,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/deactivate', async (req, res, next) => {
  try {
    const { tenant, devicesRevoked } = await deactivateOla26TvForTenant(req.tenant)
    res.json({
      ok: true,
      tvMode: false,
      devicesRevoked: devicesRevoked || 0,
      capabilities: tenant.capabilities,
    })
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
    const name = String(req.body?.name || 'Canal sede').slice(0, 120)
    const items = normalizeItems(req.body?.items)
    const channel = normalizeChannelConfig(
      req.body?.channel || defaultChannelConfig(req.tenant.nombre),
      req.tenant.nombre,
    )
    const doc = await TvPlaylist.create({
      tenantId: req.tenant._id,
      name,
      items: items.length ? items : defaultTvPlaylistItems(req.tenant.nombre),
      channel,
      fallbackText: String(req.body?.fallbackText || 'Contenido no disponible').slice(0, 300),
      audience: normalizeAudience(req.body?.audience || { mode: 'all' }),
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
    if (req.body?.activo != null) {
      const nextActivo = Boolean(req.body.activo)
      if (doc.activo !== nextActivo) {
        doc.activo = nextActivo
        doc.version = (doc.version || 1) + 1
      }
    }
    if (req.body?.audience != null) {
      doc.audience = normalizeAudience(req.body.audience)
      doc.version = (doc.version || 1) + 1
    }
    if (req.body?.channel != null) {
      doc.channel = normalizeChannelConfig(
        { ...(doc.channel?.toObject?.() || doc.channel || {}), ...req.body.channel },
        req.tenant.nombre,
      )
      doc.version = (doc.version || 1) + 1
    }
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

async function buildPlaylistPreview(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Canal inválido' })
    }
    const doc = await TvPlaylist.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'Playlist no encontrada' })

    const baseChannel = doc.channel || {}
    const channel =
      req.body?.channel != null
        ? normalizeChannelConfig({ ...baseChannel, ...req.body.channel }, req.tenant.nombre)
        : normalizeChannelConfig(baseChannel, req.tenant.nombre)

    const playlist = {
      ...doc,
      channel,
      items: Array.isArray(req.body?.items) ? req.body.items : doc.items,
      fallbackText:
        req.body?.fallbackText != null ? String(req.body.fallbackText) : doc.fallbackText,
    }

    const device = {
      _id: 'preview',
      name: 'Vista previa',
      locationLabel: 'Admin',
      mute: true,
      orientation: 'landscape',
    }
    const manifest = await resolveTvFeedManifest(playlist, device, req.tenant)
    res.json({
      playlist: serializePlaylist({ ...doc, channel }),
      manifest: {
        etag: manifest.etag,
        brandName: manifest.brandName,
        logoUrl: manifest.logoUrl,
        fallbackText: manifest.fallbackText,
        channel: manifest.channel,
        presentation: manifest.presentation,
        items: manifest.items || [],
      },
    })
  } catch (e) {
    next(e)
  }
}

/** Preview del manifiesto TV (mismo compose que el kiosk). Body opcional: { channel, items }. */
router.get('/playlists/:id/preview', buildPlaylistPreview)
router.post('/playlists/:id/preview', buildPlaylistPreview)

/** Categorías de pubs del tenant (para filtrar el canal TV). */
router.get('/categories', async (req, res, next) => {
  try {
    const list = await PostCategory.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1, nombre: 1 })
      .limit(100)
      .lean()
    res.json({
      items: list.map((c) => ({
        id: String(c._id),
        key: c.key,
        nombre: c.nombre,
        legacyTipo: c.legacyTipo || '',
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Pubs publicadas visibles en muro público (audiencia all) — picker / lista controlada. */
router.get('/posts', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const includeMember = String(req.query.includeMember || '') === '1'
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      isKnowledge: { $ne: true },
      $or: [{ 'audience.mode': 'all' }, { audience: { $exists: false } }, { audience: null }],
    }
    if (!includeMember) filter.origin = { $ne: 'member' }
    if (q.length >= 2) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$and = [{ $or: [{ titulo: rx }, { cuerpo: rx }] }]
    }
    const list = await Post.find(filter).sort({ publishedAt: -1 }).limit(80).lean()
    res.json({
      items: list.map((p) => {
        const { mediaUrl, mediaKind } = postMedia(p)
        const imageUrls = Array.isArray(p.imageUrls)
          ? p.imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
          : []
        return {
          id: String(p._id),
          titulo: p.titulo,
          tipo: p.tipo,
          categoryId: p.categoryId ? String(p.categoryId) : null,
          origin: p.origin || 'admin',
          imageUrl: p.imageUrl || imageUrls[0] || mediaUrl || '',
          imageUrls,
          mediaUrl,
          mediaKind,
          excerpt: stripHtmlLite(p.cuerpo).slice(0, 120),
          publishedAt: p.publishedAt,
          pinned: Boolean(p.pinned),
          audienceMode: p.audience?.mode || 'all',
        }
      }),
    })
  } catch (e) {
    next(e)
  }
})

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(['image', 'video', 'youtube', 'text', 'post'])
  return raw.slice(0, 100).map((it, idx) => {
    const type = allowed.has(it?.type) ? it.type : 'text'
    const textStyle = type === 'text' ? normalizeTextSlideStyle(it) : null
    return {
      type,
      url: String(it?.url || '').slice(0, 2000),
      text: String(it?.text || '').slice(0, 500),
      postId: it?.postId || null,
      durationSec: Math.min(3600, Math.max(5, Number(it?.durationSec) || 15)),
      textAlign: textStyle?.textAlign || 'center',
      textValign: textStyle?.textValign || 'center',
      textScale: textStyle?.textScale || 'md',
      showBrand: textStyle ? textStyle.showBrand : true,
      showTextLogo: textStyle ? textStyle.showTextLogo : false,
      order: Number.isFinite(Number(it?.order)) ? Number(it.order) : idx,
      startsAt: it?.startsAt ? new Date(it.startsAt) : null,
      endsAt: it?.endsAt ? new Date(it.endsAt) : null,
      activo: it?.activo !== false,
    }
  })
}

/** Subida de media para diapos extras (imagen o video). multipart field: "files" */
router.post('/upload', (req, res, next) => {
  tvMediaUpload.single('files')(req, res, (err) => {
    if (err) {
      err.status = 400
      return next(err)
    }
    next()
  })
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió archivo' })
  }
  const url = toPublicMediaUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({
    url,
    urls: [url],
    count: 1,
    kind: /^video\//i.test(req.file.mimetype || '') ? 'video' : 'image',
  })
})

export default router
