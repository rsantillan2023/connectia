import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  handleAssistantMessage,
  confirmAssistantAction,
  listAssistantConversations,
  getAssistantConversation,
} from '../services/assistantRuntime.js'
import { assistantAiConfigured } from '../services/assistantAi.js'
import { toolSearchKb } from '../lib/assistantTools.js'
import { normalizeAssistantChannel } from '../lib/assistantAdminHints.js'

const router = Router()

router.get('/status', requireAuth, (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: assistantAiConfigured(),
    module: 'assistant',
  })
})

router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const channel = normalizeAssistantChannel(req.query.channel)
    const items = await listAssistantConversations({
      tenantId: req.tenant._id,
      userId: req.user._id,
      channel,
    })
    res.json({ items, aiConfigured: assistantAiConfigured(), channel })
  } catch (e) {
    next(e)
  }
})

router.get('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const channel = normalizeAssistantChannel(req.query.channel)
    const conv = await getAssistantConversation({
      tenantId: req.tenant._id,
      userId: req.user._id,
      conversationId: req.params.id,
      channel,
    })
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })
    res.json({ conversation: conv })
  } catch (e) {
    next(e)
  }
})

router.post('/messages', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body?.text || req.body?.message || '').trim()
    const conversationId = req.body?.conversationId || null
    const channel = normalizeAssistantChannel(req.body?.channel)
    const conversation = await handleAssistantMessage({
      tenant: req.tenant,
      user: req.user,
      text,
      conversationId,
      channel,
    })
    res.json({ conversation })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.post('/confirm', requireAuth, async (req, res, next) => {
  try {
    const conversationId = req.body?.conversationId
    const confirmationToken = String(req.body?.confirmationToken || '').trim()
    if (!conversationId || !confirmationToken) {
      return res.status(400).json({ error: 'conversationId y confirmationToken requeridos' })
    }
    const conversation = await confirmAssistantAction({
      tenant: req.tenant,
      user: req.user,
      conversationId,
      confirmationToken,
    })
    res.json({ conversation })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** Búsqueda directa de KB (opcional para UI). */
router.get('/kb/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const items = await toolSearchKb({
      tenantId: req.tenant._id,
      user: req.user,
      q,
      limit: Math.min(20, Number(req.query.limit) || 10),
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

export default router
