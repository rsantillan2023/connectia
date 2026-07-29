import { Router } from 'express'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Comment } from '../models/Comment.js'
import { Post } from '../models/Post.js'
import { Tenant } from '../models/Tenant.js'
import { normalizeCommentsModeration } from '../lib/commentsModeration.js'
import {
  commentListFilter,
  defaultModerationWindow,
  applySuggestionPatch,
  rowsToCsv,
  sanitizeCommentText,
} from '../lib/commentPayload.js'
import {
  analyzeCommentModeration,
  emptyCommentAnalysis,
  serializeCommentModerationAi,
  COMMENT_COMMUNITY_POLICIES,
  aiConfigured,
} from '../services/commentModerationAi.js'
import { notifyCommentHidden } from '../services/notifyComment.js'
import { serializePostMedia } from '../lib/mediaUrl.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const CAP = 'admin.comentarios'
const router = Router()

function serializeAdmin(c, postMap = {}) {
  const post = postMap[String(c.postId)]
  const media = post ? serializePostMedia(post) : { imageUrl: '', imageUrls: [] }
  return {
    id: c._id,
    postId: String(c.postId),
    postTitulo: post?.titulo || '',
    post: post
      ? {
          id: String(post._id),
          titulo: post.titulo || '',
          cuerpo: post.cuerpo || '',
          tipo: post.tipo || 'noticia',
          imageUrl: media.imageUrl,
          imageUrls: media.imageUrls,
          layout: post.layout || 'vertical',
          authorName: post.authorName || 'Comunidad',
          publishedAt: post.publishedAt || null,
          pinned: Boolean(post.pinned),
          reactions: post.reactions || { like: 0, love: 0, clap: 0 },
          display: post.display || { show: {} },
        }
      : null,
    parentId: c.parentId ? String(c.parentId) : null,
    authorId: c.authorId ? String(c.authorId) : null,
    authorName: c.authorName || '',
    texto: c.texto,
    status: c.status,
    adminReply: c.adminReply || '',
    repliedAt: c.repliedAt || null,
    rejectionReason: c.rejectionReason || '',
    moderatedBy: c.moderatedBy ? String(c.moderatedBy) : null,
    moderatedAt: c.moderatedAt || null,
    moderationAi: serializeCommentModerationAi(c.moderationAi),
    suggestionFeedback: c.suggestionFeedback || '',
    suggestionIgnored: Boolean(c.suggestionIgnored),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

async function postsMap(tenantId, comments) {
  const ids = [...new Set(comments.map((c) => String(c.postId)))]
  if (!ids.length) return {}
  const posts = await Post.find({ _id: { $in: ids }, tenantId })
    .select('_id titulo cuerpo tipo imageUrl imageUrls layout authorName publishedAt pinned reactions display')
    .lean()
  return Object.fromEntries(posts.map((p) => [String(p._id), p]))
}

function markModerated(c, userId) {
  c.moderatedBy = userId
  c.moderatedAt = new Date()
}

/** GET /api/admin/comments/config */
router.get('/config', requireAuth, requireCapability(CAP), async (req, res) => {
  res.json({
    config: normalizeCommentsModeration(req.tenant?.commentsModeration),
    policies: COMMENT_COMMUNITY_POLICIES,
    aiConfigured: aiConfigured(),
  })
})

/** PUT /api/admin/comments/config */
router.put('/config', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const normalized = normalizeCommentsModeration(req.body?.config ?? req.body)
    const t = await Tenant.findById(req.tenant._id)
    if (!t) return res.status(404).json({ error: 'Tenant no encontrado' })
    t.commentsModeration = normalized
    await t.save()
    req.tenant.commentsModeration = normalized
    res.json({ config: normalized })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/comments — bandeja */
router.get('/', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const window = defaultModerationWindow(15)
    const from = req.query.from || window.from.toISOString()
    const to = req.query.to || window.to.toISOString()
    const filter = {
      tenantId: req.tenant._id,
      ...commentListFilter({
        status: req.query.status,
        risk: req.query.risk,
        q: req.query.q,
        postId: req.query.postId,
        from,
        to,
        suggestionPending: req.query.suggestionPending,
      }),
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))
    const skip = (page - 1) * limit

    const sort =
      req.query.status === 'pending_review' || req.query.sort === 'risk'
        ? { 'moderationAi.score': -1, createdAt: -1 }
        : { createdAt: -1 }

    const [rows, total, pendingCount, highRiskPending] = await Promise.all([
      Comment.find(filter).sort(sort).skip(skip).limit(limit),
      Comment.countDocuments(filter),
      Comment.countDocuments({
        tenantId: req.tenant._id,
        status: 'pending_review',
      }),
      Comment.countDocuments({
        tenantId: req.tenant._id,
        status: { $in: ['pending_review', 'visible'] },
        'moderationAi.risk': 'high',
        suggestionIgnored: { $ne: true },
      }),
    ])

    const map = await postsMap(req.tenant._id, rows)
    res.json({
      comments: rows.map((c) => serializeAdmin(c, map)),
      page,
      limit,
      total,
      pendingCount,
      highRiskPending,
      from,
      to,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/comments/export.csv */
router.get('/export.csv', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const window = defaultModerationWindow(15)
    const filter = {
      tenantId: req.tenant._id,
      ...commentListFilter({
        status: req.query.status,
        risk: req.query.risk,
        q: req.query.q,
        from: req.query.from || window.from.toISOString(),
        to: req.query.to || window.to.toISOString(),
      }),
    }
    const rows = await Comment.find(filter).sort({ createdAt: -1 }).limit(2000)
    const map = await postsMap(req.tenant._id, rows)
    const csvRows = rows.map((c) => ({
      id: String(c._id),
      postId: String(c.postId),
      postTitulo: map[String(c.postId)]?.titulo || '',
      authorName: c.authorName,
      texto: c.texto,
      status: c.status,
      risk: c.moderationAi?.risk || '',
      score: c.moderationAi?.score || 0,
      suggestedAction: c.moderationAi?.suggestedAction || '',
      createdAt: c.createdAt?.toISOString?.() || '',
    }))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="comentarios.csv"')
    res.send(rowsToCsv(csvRows))
  } catch (e) {
    next(e)
  }
})

async function loadComment(req) {
  return Comment.findOne({
    _id: req.params.id,
    tenantId: req.tenant._id,
    status: { $ne: 'deleted' },
  })
}

/** PATCH approve */
router.patch('/:id/approve', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    c.status = 'visible'
    c.rejectionReason = ''
    markModerated(c, req.user._id)
    if (req.body?.feedback === 'useful' || req.body?.feedback === 'not_useful') {
      c.suggestionFeedback = req.body.feedback
    }
    await c.save()
    if (c.status === 'visible' && c.authorId) {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: c.authorId,
        event: 'comment_created',
        entityId: c._id,
        meta: { postId: String(c.postId), via: 'moderation_approve' },
      })
    }
    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map) })
  } catch (e) {
    next(e)
  }
})

/** PATCH hide */
router.patch('/:id/hide', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    const reason = String(req.body?.reason || c.moderationAi?.summary || '').trim().slice(0, 500)
    c.status = 'hidden'
    c.rejectionReason = reason || 'Ocultado por moderación'
    markModerated(c, req.user._id)
    if (req.body?.feedback === 'useful' || req.body?.feedback === 'not_useful') {
      c.suggestionFeedback = req.body.feedback
    }
    await c.save()
    const post = await Post.findById(c.postId).select('_id titulo').lean()
    notifyCommentHidden({ comment: c, post, reason: c.rejectionReason }).catch(() => {})
    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map) })
  } catch (e) {
    next(e)
  }
})

/** PATCH reply */
router.patch('/:id/reply', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    const reply = sanitizeCommentText(req.body?.adminReply || req.body?.reply)
    if (!reply) return res.status(400).json({ error: 'Respuesta requerida' })
    c.adminReply = reply.slice(0, 2000)
    c.repliedAt = new Date()
    if (c.status === 'pending_review') c.status = 'visible'
    markModerated(c, req.user._id)
    await c.save()
    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map) })
  } catch (e) {
    next(e)
  }
})

/** POST accept-suggestion — un clic */
router.post('/:id/accept-suggestion', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    const patch = applySuggestionPatch(c, c.moderationAi?.suggestedAction, {
      adminReply: req.body?.adminReply,
      reason: req.body?.reason,
    })
    if (!patch.ok) return res.status(400).json({ error: patch.error })

    c.status = patch.status
    c.adminReply = patch.adminReply
    c.rejectionReason = patch.rejectionReason
    if (patch.adminReply) c.repliedAt = new Date()
    markModerated(c, req.user._id)
    c.suggestionFeedback = req.body?.feedback === 'not_useful' ? 'not_useful' : 'useful'
    c.suggestionIgnored = false
    await c.save()

    if (c.status === 'hidden') {
      const post = await Post.findById(c.postId).select('_id titulo').lean()
      notifyCommentHidden({ comment: c, post, reason: c.rejectionReason }).catch(() => {})
    }

    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map), applied: patch.applied })
  } catch (e) {
    next(e)
  }
})

/** POST ignore-suggestion */
router.post('/:id/ignore-suggestion', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    c.suggestionIgnored = true
    c.suggestionFeedback = req.body?.feedback === 'useful' ? 'useful' : 'not_useful'
    await c.save()
    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map) })
  } catch (e) {
    next(e)
  }
})

/** POST re-analyze */
router.post('/:id/analyze', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    const cfg = normalizeCommentsModeration(req.tenant?.commentsModeration)
    c.moderationAi = emptyCommentAnalysis({ status: 'pending' })
    c.suggestionIgnored = false
    const analysis = await analyzeCommentModeration({
      texto: c.texto,
      authorName: c.authorName,
      tenantName: req.tenant?.nombre,
      glossary: cfg.glossary,
      provider: req.body?.provider,
    })
    c.moderationAi = analysis
    await c.save()
    const map = await postsMap(req.tenant._id, [c])
    res.json({ comment: serializeAdmin(c, map) })
  } catch (e) {
    next(e)
  }
})

/** DELETE soft */
router.delete('/:id', requireAuth, requireCapability(CAP), async (req, res, next) => {
  try {
    const c = await loadComment(req)
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    c.status = 'deleted'
    markModerated(c, req.user._id)
    await c.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
