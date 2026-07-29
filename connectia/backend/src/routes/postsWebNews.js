import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { searchWebNews, webSearchProvidersConfigured } from '../services/webNewsSearch.js'
import { composePostFromWebSources, aiConfigured } from '../services/openaiPosts.js'

const router = Router()

/** Estado del flujo "noticia desde la web" (independiente del wizard IA). */
router.get('/status', requireAuth, requireAdmin, (_req, res) => {
  res.json({
    aiConfigured: aiConfigured(),
    search: webSearchProvidersConfigured(),
  })
})

/**
 * Busca en la web resultados tipo listado (Google-like).
 * Body: { query, limit? }
 */
router.post('/search', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await searchWebNews(req.body?.query, { limit: req.body?.limit })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/**
 * Con fuentes elegidas (máx 3) arma un borrador de muro con IA + estándares del tenant.
 * Body: { query, sources: [{title,url,snippet,source?}], notes?, generateImage? }
 * No publica: siempre deja status draft para revisión humana.
 */
router.post('/compose', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {}
    const sources = Array.isArray(body.sources) ? body.sources.slice(0, 3) : []
    if (!sources.length) {
      return res.status(400).json({ error: 'Elegí entre 1 y 3 resultados' })
    }
    if (sources.length > 3) {
      return res.status(400).json({ error: 'Máximo 3 fuentes' })
    }
    const result = await composePostFromWebSources({
      query: body.query,
      sources,
      notes: body.notes || '',
      generateImage: body.generateImage !== false,
      tenant: req.tenant,
    })
    res.json({
      draft: result.draft,
      model: result.model,
      provider: result.provider,
      articlesFetched: result.articlesFetched,
      imageWarning: result.imageWarning || '',
    })
  } catch (e) {
    next(e)
  }
})

export default router
