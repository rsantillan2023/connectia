import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { searchMediaOnWeb, mediaSearchProvidersConfigured } from '../services/mediaWebSearch.js'

const router = Router()

router.get('/status', requireAuth, requireAdmin, (_req, res) => {
  res.json({ search: mediaSearchProvidersConfigured() })
})

/**
 * Busca media en la red para pegar URL en el editor / Live.
 * Body: { kind: 'youtube'|'vimeo'|'hls'|'audio', query, limit? }
 */
router.post('/search', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = new Set(['youtube', 'vimeo', 'hls', 'audio'])
    const kind = allowed.has(req.body?.kind) ? req.body.kind : 'youtube'
    const result = await searchMediaOnWeb(kind, req.body?.query, { limit: req.body?.limit })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

export default router
