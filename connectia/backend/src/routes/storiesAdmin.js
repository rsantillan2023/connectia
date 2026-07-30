import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Story } from '../models/Story.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const router = Router()

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function serialize(s) {
  return {
    id: s._id,
    titulo: s.titulo || '',
    category: s.category || 'general',
    mediaUrl: toPublicMediaUrl(s.mediaUrl),
    mediaType: s.mediaType || 'image',
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    order: s.order || 0,
    status: s.status,
    authorName: s.authorName || '',
    viewCount: s.viewCount || 0,
    audience: s.audience || { mode: 'all' },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function parseAudience(body) {
  const a = body?.audience || {}
  const mode = ['all', 'restricted', 'users', 'none'].includes(a.mode) ? a.mode : 'all'
  return {
    mode,
    areaIds: Array.isArray(a.areaIds) ? a.areaIds : [],
    groupIds: Array.isArray(a.groupIds) ? a.groupIds : [],
    userIds: Array.isArray(a.userIds) ? a.userIds : [],
    clientIds: Array.isArray(a.clientIds) ? a.clientIds : [],
  }
}

router.get('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const items = await Story.find(filter).sort({ order: 1, createdAt: -1 }).limit(200)
    res.json({ items: items.map(serialize) })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const mediaUrl = String(body.mediaUrl || '').trim()
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl obligatorio' })
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date()
    let endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + DEFAULT_TTL_MS)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return res.status(400).json({ error: 'fechas inválidas' })
    }
    if (endsAt <= startsAt) endsAt = new Date(startsAt.getTime() + DEFAULT_TTL_MS)
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'published'
    const s = await Story.create({
      tenantId: req.tenant._id,
      titulo: String(body.titulo || '').trim().slice(0, 80),
      category: String(body.category || 'general').trim().slice(0, 60) || 'general',
      mediaUrl,
      mediaType: body.mediaType === 'video' ? 'video' : 'image',
      startsAt,
      endsAt,
      order: Number(body.order) || 0,
      status,
      authorId: req.user._id,
      authorName: req.user.nombre || req.user.usuario,
      audience: parseAudience(body),
    })
    res.status(201).json({ story: serialize(s) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const s = await Story.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!s) return res.status(404).json({ error: 'Story no encontrada' })
    const body = req.body || {}
    if (typeof body.titulo === 'string') s.titulo = body.titulo.trim().slice(0, 80)
    if (typeof body.category === 'string') s.category = body.category.trim().slice(0, 60) || 'general'
    if (typeof body.mediaUrl === 'string' && body.mediaUrl.trim()) s.mediaUrl = body.mediaUrl.trim()
    if (body.mediaType === 'image' || body.mediaType === 'video') s.mediaType = body.mediaType
    if (body.startsAt) {
      const d = new Date(body.startsAt)
      if (!Number.isNaN(d.getTime())) s.startsAt = d
    }
    if (body.endsAt) {
      const d = new Date(body.endsAt)
      if (!Number.isNaN(d.getTime())) s.endsAt = d
    }
    if (body.order != null) s.order = Number(body.order) || 0
    if (['draft', 'published', 'archived'].includes(body.status)) s.status = body.status
    if (body.audience) s.audience = parseAudience(body)
    await s.save()
    res.json({ story: serialize(s) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const s = await Story.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id })
    if (!s) return res.status(404).json({ error: 'Story no encontrada' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
