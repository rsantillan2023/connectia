import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Story } from '../models/Story.js'
import { audienceFilterForUser, resolveClientIdsForUser } from '../lib/audience.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const router = Router()

function serialize(s, userId) {
  const viewed = Boolean(userId && s.viewers?.get?.(String(userId)))
  return {
    id: s._id,
    titulo: s.titulo || '',
    category: s.category || 'general',
    mediaUrl: toPublicMediaUrl(s.mediaUrl),
    mediaType: s.mediaType || 'image',
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    order: s.order || 0,
    authorName: s.authorName || '',
    viewed,
    viewCount: s.viewCount || 0,
  }
}

/** Stories vigentes agrupadas por categoría (cabecera del muro). */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const now = new Date()
    const memberClientIds = await resolveClientIdsForUser(req.tenant._id, req.user)
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      ...audienceFilterForUser(req.user, { clientIds: memberClientIds }),
    }
    const items = await Story.find(filter).sort({ order: 1, startsAt: -1 }).limit(60)
    const byCategory = new Map()
    for (const s of items) {
      const cat = s.category || 'general'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat).push(serialize(s, req.user._id))
    }
    res.json({
      categories: [...byCategory.entries()].map(([category, stories]) => ({
        category,
        stories,
      })),
      items: items.map((s) => serialize(s, req.user._id)),
    })
  } catch (e) {
    next(e)
  }
})

/** Marcar visualización (impresión). */
router.post('/:id/view', requireAuth, async (req, res, next) => {
  try {
    const s = await Story.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!s) return res.status(404).json({ error: 'Story no encontrada' })
    const uid = String(req.user._id)
    const already = s.viewers?.get?.(uid)
    if (!already) {
      if (!s.viewers) s.viewers = new Map()
      s.viewers.set(uid, new Date())
      s.viewCount = (s.viewCount || 0) + 1
      await s.save()
    }
    res.json({ ok: true, viewed: true, viewCount: s.viewCount })
  } catch (e) {
    next(e)
  }
})

export default router
