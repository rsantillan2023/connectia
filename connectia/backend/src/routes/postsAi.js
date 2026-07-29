import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { generatePostDraft, aiConfigured } from '../services/openaiPosts.js'

const router = Router()

router.get('/status', requireAuth, requireCapability('admin.publicaciones'), (_req, res) => {
  res.json({
    configured: aiConfigured(),
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    preferred: process.env.AI_PROVIDER || 'auto',
  })
})

/**
 * Genera o refina un borrador de publicación (OpenAI y/o Anthropic).
 * Body: { prompt, history?, current?, generateImage?, generateCarousel?, provider? }
 */
router.post('/generate', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await generatePostDraft({
      prompt: body.prompt,
      history: Array.isArray(body.history) ? body.history : [],
      current: body.current && typeof body.current === 'object' ? body.current : null,
      generateImage: body.generateImage !== false,
      generateCarousel: Boolean(body.generateCarousel),
      tenant: req.tenant,
      provider: body.provider || 'auto',
    })
    res.json({
      draft: result.draft,
      model: result.model,
      provider: result.provider,
      assistantMessage: result.assistantMessage,
      imageWarning: result.imageWarning || '',
      holiday: result.holiday || null,
      configured: true,
    })
  } catch (e) {
    next(e)
  }
})

export default router
