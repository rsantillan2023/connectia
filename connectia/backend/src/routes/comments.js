import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Comment } from '../models/Comment.js'
import { Post } from '../models/Post.js'
import { authorDisplayName } from '../lib/ugc.js'
import { userCanSeePost } from '../lib/audience.js'
import { normalizeCommentsModeration, shouldAutoHide } from '../lib/commentsModeration.js'
import { validateCommentCreate, sanitizeCommentText } from '../lib/commentPayload.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'
import {
  analyzeCommentModeration,
  emptyCommentAnalysis,
  serializeCommentModerationAi,
} from '../services/commentModerationAi.js'

const router = Router()

function tenantCommentsCfg(req) {
  return normalizeCommentsModeration(req.tenant?.commentsModeration)
}

function serializePublic(c, { includeAi = false } = {}) {
  return {
    id: c._id,
    postId: String(c.postId),
    parentId: c.parentId ? String(c.parentId) : null,
    authorId: c.authorId ? String(c.authorId) : null,
    authorName: c.authorName || '',
    texto: c.texto,
    status: c.status,
    adminReply: c.adminReply || '',
    repliedAt: c.repliedAt || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ...(includeAi ? { moderationAi: serializeCommentModerationAi(c.moderationAi) } : {}),
  }
}

async function loadVisiblePost(req, postId) {
  const post = await Post.findOne({
    _id: postId,
    tenantId: req.tenant._id,
    status: 'published',
  })
  if (!post) return null
  if (!userCanSeePost(req.user, post)) return null
  return post
}

async function runAnalysis(comment, req, cfg) {
  if (!cfg.enabled) {
    comment.moderationAi = emptyCommentAnalysis({ status: 'skipped' })
    return comment
  }
  comment.moderationAi = emptyCommentAnalysis({ status: 'pending' })
  const analysis = await analyzeCommentModeration({
    texto: comment.texto,
    authorName: comment.authorName,
    tenantName: req.tenant?.nombre,
    glossary: cfg.glossary,
  })
  comment.moderationAi = analysis
  if (shouldAutoHide(cfg, analysis.score)) {
    comment.status = 'hidden'
    comment.rejectionReason = analysis.summary || 'Auto-ocultado por umbral de riesgo'
    comment.moderatedAt = new Date()
    comment.moderationAi.autoApplied = true
  }
  return comment
}

/** GET /api/comments?postId= — hilos visibles (autor ve los propios pendientes) */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const postId = String(req.query.postId || '')
    if (!/^[a-f\d]{24}$/i.test(postId)) {
      return res.status(400).json({ error: 'postId requerido' })
    }
    const post = await loadVisiblePost(req, postId)
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada' })
    if (post.commentsEnabled === false) {
      return res.json({ comments: [], commentsEnabled: false, count: 0 })
    }

    const uid = String(req.user._id)
    const rows = await Comment.find({
      tenantId: req.tenant._id,
      postId,
      status: { $ne: 'deleted' },
      $or: [{ status: 'visible' }, { authorId: req.user._id, status: { $in: ['pending_review', 'hidden'] } }],
    })
      .sort({ createdAt: 1 })
      .limit(500)

    const comments = rows.map((c) =>
      serializePublic(c, { includeAi: String(c.authorId) === uid && c.status !== 'visible' }),
    )
    res.json({
      comments,
      commentsEnabled: true,
      count: comments.filter((c) => c.status === 'visible').length,
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/comments — crear comentario */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const postId = String(req.body?.postId || '')
    if (!/^[a-f\d]{24}$/i.test(postId)) {
      return res.status(400).json({ error: 'postId requerido' })
    }
    const post = await loadVisiblePost(req, postId)
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada' })
    if (post.commentsEnabled === false) {
      return res.status(403).json({ error: 'Los comentarios están deshabilitados en esta publicación' })
    }

    const validated = validateCommentCreate(req.body)
    if (!validated.ok) return res.status(400).json({ error: validated.error })

    if (validated.parentId) {
      const parent = await Comment.findOne({
        _id: validated.parentId,
        tenantId: req.tenant._id,
        postId,
        status: 'visible',
      })
      if (!parent) return res.status(400).json({ error: 'Comentario padre no encontrado' })
    }

    const cfg = tenantCommentsCfg(req)
    const status = cfg.requireApproval ? 'pending_review' : 'visible'

    let comment = new Comment({
      tenantId: req.tenant._id,
      postId,
      parentId: validated.parentId,
      authorId: req.user._id,
      authorName: authorDisplayName(req.user),
      texto: validated.texto,
      status,
      moderationAi: emptyCommentAnalysis({ status: cfg.enabled ? 'pending' : 'skipped' }),
    })

    comment = await runAnalysis(comment, req, cfg)
    await comment.save()

    if (comment.status === 'visible') {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'comment_created',
        entityId: comment._id,
        meta: { postId: String(postId) },
      })
    }

    res.status(201).json({ comment: serializePublic(comment, { includeAi: true }) })
  } catch (e) {
    next(e)
  }
})

/** DELETE /api/comments/:id — soft-delete propio */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const c = await Comment.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      authorId: req.user._id,
      status: { $ne: 'deleted' },
    })
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })
    c.status = 'deleted'
    await c.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/comments/:id — editar texto propio (re-analiza) */
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const c = await Comment.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      authorId: req.user._id,
      status: { $in: ['visible', 'pending_review', 'hidden'] },
    })
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' })

    const texto = sanitizeCommentText(req.body?.texto)
    if (!texto) {
      return res.status(400).json({ error: 'Texto inválido' })
    }

    const cfg = tenantCommentsCfg(req)
    c.texto = texto
    if (cfg.requireApproval) c.status = 'pending_review'
    await runAnalysis(c, req, cfg)
    await c.save()
    res.json({ comment: serializePublic(c, { includeAi: true }) })
  } catch (e) {
    next(e)
  }
})

export default router
