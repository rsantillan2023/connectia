import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { Post } from '../models/Post.js'
import { SavedPost } from '../models/SavedPost.js'
import { HiddenPost } from '../models/HiddenPost.js'
import { Chat } from '../models/Chat.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { ChatBlock } from '../models/ChatBlock.js'
import { User } from '../models/User.js'
import { audienceFilterForUser, userCanSeePost } from '../lib/audience.js'
import { toPublicMediaUrl, serializePostMedia, resolvePostMediaFields } from '../lib/mediaUrl.js'
import {
  POST_TIPOS,
  POST_LAYOUTS,
  normalizePostsConfig,
  resolvePostPresentation,
  defaultTipoConfig,
} from '../lib/postsConfig.js'
import { normalizeUgc, authorDisplayName } from '../lib/ugc.js'
import {
  analyzeUgcModeration,
  emptyAnalysis,
  serializeModerationAi,
} from '../services/ugcModerationAi.js'
import { Comment } from '../models/Comment.js'
import {
  normalizeReactionKey,
  mergeReactionCounts,
  normalizeMyReaction,
  emptyReactions,
} from '../lib/reactions.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'
import {
  participantsKeyForDirect,
  sanitizeMessageText,
  previewFromMessage,
  validateDirectCreate,
} from '../lib/chatValidation.js'
import { notifyChatMessage } from '../services/notifyChat.js'
import { parseSavedListQuery, savedPostFilterClauses } from '../lib/savedPostQuery.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const router = Router()

function serialize(p, userId, saved = false, postsConfig, extras = {}) {
  const my = userId && p.reactors?.get ? p.reactors.get(String(userId)) : null
  const presentation = resolvePostPresentation(p, postsConfig)
  const media = serializePostMedia(p)
  return {
    id: p._id,
    titulo: p.titulo,
    cuerpo: p.cuerpo,
    tipo: p.tipo,
    imageUrl: media.imageUrl,
    imageUrls: media.imageUrls,
    audioUrl: toPublicMediaUrl(p.audioUrl),
    layout: presentation.layout,
    pinned: p.pinned,
    priority: p.priority,
    status: p.status,
    publishedAt: p.publishedAt,
    authorId: p.authorId ? String(p.authorId) : null,
    authorName: p.authorName,
    origin: p.origin || 'admin',
    rejectionReason: p.rejectionReason || '',
    moderationAi: serializeModerationAi(p.moderationAi),
    reactions: mergeReactionCounts(p.reactions),
    myReaction: normalizeMyReaction(my) || null,
    saved: Boolean(saved),
    display: { show: presentation.show },
    linkedSurveyId: p.linkedSurveyId ? String(p.linkedSurveyId) : null,
    commentsEnabled: p.commentsEnabled !== false,
    commentsCount: Math.max(0, Number(extras.commentsCount) || 0),
    createdAt: p.createdAt,
  }
}

function tenantPostsConfig(req) {
  return normalizePostsConfig(req.tenant?.postsConfig)
}

function tenantUgc(req) {
  return normalizeUgc(req.tenant?.ugc)
}

function ser(req, p, saved = false, extras = {}) {
  return serialize(p, req.user._id, saved, tenantPostsConfig(req), extras)
}

/** Conteos de comentarios visibles por post (incluye respuestas). */
async function commentCountMap(tenantId, postIds) {
  const ids = (postIds || []).filter(Boolean)
  if (!ids.length) return new Map()
  const rows = await Comment.aggregate([
    {
      $match: {
        tenantId,
        postId: { $in: ids },
        status: 'visible',
      },
    },
    { $group: { _id: '$postId', n: { $sum: 1 } } },
  ])
  return new Map(rows.map((r) => [String(r._id), r.n]))
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const IMAGE_MIME = /^image\/(jpeg|pjpeg|png|webp|gif)$/i
const VIDEO_MIME = /^video\/(mp4|webm|quicktime|x-m4v)$/i
const AUDIO_MIME = /^audio\/(mpeg|mp4|aac|ogg|wav|x-m4a|x-wav|webm)$/i

function ugcExtForFile(file) {
  const rawExt = path.extname(file.originalname || '').toLowerCase()
  if (IMAGE_MIME.test(file.mimetype)) {
    if (/^\.(jpe?g|png|webp|gif)$/i.test(rawExt)) return rawExt.replace(/\.jpeg$/i, '.jpg')
    if (/png/i.test(file.mimetype)) return '.png'
    if (/webp/i.test(file.mimetype)) return '.webp'
    if (/gif/i.test(file.mimetype)) return '.gif'
    return '.jpg'
  }
  if (VIDEO_MIME.test(file.mimetype)) {
    if (/^\.(mp4|webm|mov|m4v)$/i.test(rawExt)) return rawExt === '.mov' ? '.mov' : rawExt
    if (/webm/i.test(file.mimetype)) return '.webm'
    if (/quicktime/i.test(file.mimetype)) return '.mov'
    return '.mp4'
  }
  if (/^\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(rawExt)) return rawExt
  if (/ogg/i.test(file.mimetype)) return '.ogg'
  if (/wav/i.test(file.mimetype)) return '.wav'
  if (/aac|mp4|m4a/i.test(file.mimetype)) return '.m4a'
  return '.mp3'
}

const ugcUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      try {
        ensureUploadDir()
        cb(null, UPLOAD_DIR)
      } catch (e) {
        cb(e)
      }
    },
    filename(_req, file, cb) {
      const ext = ugcExtForFile(file)
      const name = `ugc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
      cb(null, name)
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024, files: 8 },
  fileFilter(_req, file, cb) {
    if (IMAGE_MIME.test(file.mimetype) || VIDEO_MIME.test(file.mimetype) || AUDIO_MIME.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Formato no permitido. Usá imagen (jpg/png/webp/gif), video (mp4/webm/mov) o audio (mp3/m4a/ogg/wav)'))
    }
  },
})

function sanitizeAudioUrl(raw) {
  const u = typeof raw === 'string' ? raw.trim() : ''
  if (!u) return ''
  if (/^https?:\/\//i.test(u) || u.startsWith('/uploads/')) return u
  return ''
}

async function savedIdSet(userId, postIds) {
  if (!postIds?.length) return new Set()
  const rows = await SavedPost.find({
    userId,
    postId: { $in: postIds },
  }).select('postId')
  return new Set(rows.map((r) => String(r.postId)))
}

/** Guardados del usuario (orden: más recientes primero). Soporta q, tipo, origin. */
router.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(30, Math.max(1, Number(req.query.size) || 10))
    const parsed = parseSavedListQuery(req.query)
    const savedFilter = { tenantId: req.tenant._id, userId: req.user._id }

    let rows
    let total

    if (!parsed.hasFilters) {
      ;[rows, total] = await Promise.all([
        SavedPost.find(savedFilter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * size)
          .limit(size),
        SavedPost.countDocuments(savedFilter),
      ])
    } else {
      const allRows = await SavedPost.find(savedFilter).sort({ createdAt: -1, _id: -1 })
      const postIds = allRows.map((r) => r.postId)
      if (!postIds.length) {
        return res.json({ page, size, total: 0, items: [] })
      }
      const postMatch = {
        $and: [
          { _id: { $in: postIds } },
          { tenantId: req.tenant._id },
          { status: 'published' },
          audienceFilterForUser(req.user),
          ...savedPostFilterClauses(parsed),
        ],
      }
      const matched = await Post.find(postMatch).select('_id')
      const matchedIds = new Set(matched.map((p) => String(p._id)))
      const filteredRows = allRows.filter((r) => matchedIds.has(String(r.postId)))
      total = filteredRows.length
      rows = filteredRows.slice((page - 1) * size, page * size)
    }

    const postIds = rows.map((r) => r.postId)
    const posts = await Post.find({
      _id: { $in: postIds },
      tenantId: req.tenant._id,
      status: 'published',
      ...audienceFilterForUser(req.user),
    })
    const byId = new Map(posts.map((p) => [String(p._id), p]))
    const counts = await commentCountMap(
      req.tenant._id,
      posts.map((p) => p._id),
    )
    const items = rows
      .map((r) => {
        const p = byId.get(String(r.postId))
        if (!p) return null
        return ser(req, p, true, { commentsCount: counts.get(String(p._id)) || 0 })
      })
      .filter(Boolean)
    res.json({ page, size, total, items })
  } catch (e) {
    next(e)
  }
})

/** Feed muro (solo published del tenant) — fijadas arriba, luego más nuevas → más viejas */
router.get('/feed', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(30, Math.max(1, Number(req.query.size) || 6))
    const parsed = parseSavedListQuery(req.query)
    const and = [audienceFilterForUser(req.user), ...savedPostFilterClauses(parsed)]

    const hiddenIds = await HiddenPost.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
    }).distinct('postId')
    if (hiddenIds.length) {
      and.push({ _id: { $nin: hiddenIds } })
    }

    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      $and: and,
    }
    const [items, total] = await Promise.all([
      Post.aggregate([
        { $match: filter },
        {
          $addFields: {
            _sortDate: { $ifNull: ['$publishedAt', '$createdAt'] },
          },
        },
        { $sort: { pinned: -1, _sortDate: -1, _id: -1 } },
        { $skip: (page - 1) * size },
        { $limit: size },
      ]),
      Post.countDocuments(filter),
    ])
    const docs = await Post.find({ _id: { $in: items.map((p) => p._id) } })
    const byId = new Map(docs.map((d) => [String(d._id), d]))
    const ordered = items.map((p) => byId.get(String(p._id))).filter(Boolean)
    const saved = await savedIdSet(
      req.user._id,
      ordered.map((p) => p._id),
    )
    const counts = await commentCountMap(
      req.tenant._id,
      ordered.map((p) => p._id),
    )
    res.json({
      page,
      size,
      total,
      ugc: tenantUgc(req),
      items: ordered.map((p) =>
        ser(req, p, saved.has(String(p._id)), {
          commentsCount: counts.get(String(p._id)) || 0,
        }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** Mis publicaciones UGC (cualquier estado salvo archived) */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const ugc = tenantUgc(req)
    if (!ugc.enabled) {
      return res.status(403).json({ error: 'Las publicaciones de miembros están deshabilitadas' })
    }
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(30, Math.max(1, Number(req.query.size) || 20))
    const filter = {
      tenantId: req.tenant._id,
      authorId: req.user._id,
      origin: 'member',
      status: { $ne: 'archived' },
    }
    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * size)
        .limit(size),
      Post.countDocuments(filter),
    ])
    res.json({
      page,
      size,
      total,
      ugc,
      items: items.map((p) => ser(req, p, false)),
    })
  } catch (e) {
    next(e)
  }
})

/** Subir media UGC: 1..8 archivos (imagen / video / audio). Campos: files[] o file */
router.post(
  '/upload',
  requireAuth,
  (req, res, next) => {
    if (!tenantUgc(req).enabled) {
      return res.status(403).json({ error: 'Las publicaciones de miembros están deshabilitadas' })
    }
    ugcUpload.fields([
      { name: 'files', maxCount: 8 },
      { name: 'file', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    const fromFiles = Array.isArray(req.files?.files) ? req.files.files : []
    const fromFile = Array.isArray(req.files?.file) ? req.files.file : []
    const files = [...fromFiles, ...fromFile]
    if (!files.length) return res.status(400).json({ error: 'No se recibieron archivos' })
    const urls = files.map((f) => toPublicMediaUrl(`/uploads/${f.filename}`))
    res.status(201).json({ urls, url: urls[0] || '', count: urls.length })
  },
)

/** Crear publicación de colaborador (UGC) */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const ugc = tenantUgc(req)
    if (!ugc.enabled) {
      return res.status(403).json({ error: 'Las publicaciones de miembros están deshabilitadas' })
    }
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    const cuerpo = String(body.cuerpo || '').trim()
    if (!titulo && !cuerpo) {
      return res.status(400).json({ error: 'Escribí un título o un mensaje' })
    }
    const media = resolvePostMediaFields(body)
    const audioUrl = sanitizeAudioUrl(body.audioUrl)
    const tipo = POST_TIPOS.includes(body.tipo) ? body.tipo : 'general'
    const defaultLayout = defaultTipoConfig(tipo).defaultLayout
    const layout = POST_LAYOUTS.includes(body.layout) ? body.layout : defaultLayout
    const needsApproval = ugc.requireApproval
    const status = needsApproval ? 'pending_review' : 'published'
    const p = await Post.create({
      tenantId: req.tenant._id,
      titulo: titulo || (cuerpo.length > 80 ? `${cuerpo.slice(0, 77)}…` : cuerpo),
      cuerpo,
      tipo,
      imageUrl: media.imageUrl,
      imageUrls: media.imageUrls,
      audioUrl,
      layout,
      pinned: false,
      priority: 0,
      status,
      publishedAt: needsApproval ? null : new Date(),
      authorId: req.user._id,
      authorName: authorDisplayName(req.user),
      origin: 'member',
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      moderationAi: emptyAnalysis({ status: 'pending' }),
    })

    if (status === 'published' && p.origin === 'member') {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'post_created',
        entityId: p._id,
      })
    }

    // Análisis previo async — solo UGC (origin=member); pubs del admin CMS no se analizan.
    if (p.origin === 'member') {
      setImmediate(async () => {
        try {
          const analysis = await analyzeUgcModeration({
            titulo: p.titulo,
            cuerpo: p.cuerpo,
            imageUrl: p.imageUrl,
            imageUrls: p.imageUrls,
            audioUrl: p.audioUrl,
            authorName: p.authorName,
            tenantName: req.tenant.nombre,
          })
          await Post.updateOne(
            { _id: p._id, origin: 'member' },
            { $set: { moderationAi: analysis } },
          )
        } catch (err) {
          await Post.updateOne(
            { _id: p._id, origin: 'member' },
            {
              $set: {
                moderationAi: emptyAnalysis({
                  status: 'error',
                  error: err.message || 'No se pudo analizar',
                  suggestedAction: 'review',
                  risk: 'medium',
                  summary: 'No se pudo completar el análisis IA. Revisá manualmente.',
                }),
              },
            },
          ).catch(() => {})
        }
      })
    }

    res.status(201).json({ post: ser(req, p), ugc })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!p || !userCanSeePost(req.user, p)) {
      return res.status(404).json({ error: 'Publicación no encontrada' })
    }
    const isSaved = await SavedPost.exists({
      userId: req.user._id,
      postId: p._id,
    })
    const counts = await commentCountMap(req.tenant._id, [p._id])
    res.json({
      post: ser(req, p, Boolean(isSaved), {
        commentsCount: counts.get(String(p._id)) || 0,
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** Toggle guardar / quitar (estilo Instagram) */
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!p || !userCanSeePost(req.user, p)) {
      return res.status(404).json({ error: 'Publicación no encontrada' })
    }

    const existing = await SavedPost.findOne({
      userId: req.user._id,
      postId: p._id,
    })
    let saved
    if (existing) {
      await existing.deleteOne()
      saved = false
    } else {
      await SavedPost.create({
        tenantId: req.tenant._id,
        userId: req.user._id,
        postId: p._id,
      })
      saved = true
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'post_saved',
        entityId: p._id,
      })
    }
    res.json({ post: ser(req, p, saved), saved })
  } catch (e) {
    if (e?.code === 11000) {
      return res.json({
        post: ser(req, await Post.findById(req.params.id), true),
        saved: true,
      })
    }
    next(e)
  }
})

/** Marcar “ya la vi”: oculta la publicación solo para este usuario */
router.post('/:id/hide', requireAuth, async (req, res, next) => {
  try {
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!p || !userCanSeePost(req.user, p)) {
      return res.status(404).json({ error: 'Publicación no encontrada' })
    }

    await HiddenPost.updateOne(
      { userId: req.user._id, postId: p._id },
      {
        $setOnInsert: {
          tenantId: req.tenant._id,
          userId: req.user._id,
          postId: p._id,
        },
      },
      { upsert: true },
    )

    res.json({ ok: true, hidden: true, postId: String(p._id) })
  } catch (e) {
    next(e)
  }
})

/** Volver a mostrar una publicación ocultada (por si el usuario se arrepiente) */
router.delete('/:id/hide', requireAuth, async (req, res, next) => {
  try {
    await HiddenPost.deleteOne({
      userId: req.user._id,
      postId: req.params.id,
      tenantId: req.tenant._id,
    })
    res.json({ ok: true, hidden: false, postId: String(req.params.id) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/reactions', requireAuth, async (req, res, next) => {
  try {
    const key = normalizeReactionKey(req.body?.reaction || 'love')
    if (!key) {
      return res.status(400).json({ error: 'Reacción inválida' })
    }
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!p || !userCanSeePost(req.user, p)) {
      return res.status(404).json({ error: 'Publicación no encontrada' })
    }
    const uid = String(req.user._id)
    if (!p.reactors) p.reactors = new Map()
    if (!p.reactions || typeof p.reactions !== 'object') p.reactions = emptyReactions()

    const prevRaw = p.reactors.get(uid)
    const prev = normalizeMyReaction(prevRaw) || prevRaw

    // Asegurar campos numéricos
    for (const k of Object.keys(emptyReactions())) {
      if (p.reactions[k] == null) p.reactions[k] = 0
    }

    if (prev === key) {
      p.reactors.delete(uid)
      if (prev === 'love') {
        // Descontar love; si había like legacy, limpiar también el bucket like
        const loveOnly = Math.max(0, (p.reactions.love || 0) - 1)
        p.reactions.love = loveOnly
      } else if (prev) {
        p.reactions[prev] = Math.max(0, (p.reactions[prev] || 0) - 1)
      }
    } else {
      if (prev) {
        if (prev === 'love' || prevRaw === 'like') {
          if (prevRaw === 'like') p.reactions.like = Math.max(0, (p.reactions.like || 0) - 1)
          else p.reactions.love = Math.max(0, (p.reactions.love || 0) - 1)
        } else {
          p.reactions[prev] = Math.max(0, (p.reactions[prev] || 0) - 1)
        }
      }
      p.reactors.set(uid, key)
      p.reactions[key] = (p.reactions[key] || 0) + 1
      // Primera reacción a este post (idempotente por post+user aunque cambie el emoji)
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: req.user._id,
        event: 'post_reaction_given',
        entityId: p._id,
      })
    }
    p.markModified('reactions')
    p.markModified('reactors')
    await p.save()
    const isSaved = await SavedPost.exists({ userId: req.user._id, postId: p._id })
    const counts = await commentCountMap(req.tenant._id, [p._id])
    res.json({
      post: ser(req, p, Boolean(isSaved), {
        commentsCount: counts.get(String(p._id)) || 0,
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/posts/:id/share — deriva la pub por chat interno a otro usuario */
router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const caps = req.tenant?.capabilities || []
    if (!caps.includes('chat') && !caps.includes('*')) {
      return res.status(403).json({ error: 'Chat no habilitado en esta comunidad' })
    }

    const me = req.user._id
    const participantId = req.body?.userId
    const directErr = validateDirectCreate({ participantId, selfId: me })
    if (directErr) {
      const friendly = String(directErr).replace(/participantId/gi, 'usuario')
      return res.status(400).json({ error: friendly })
    }
    if (!mongoose.isValidObjectId(participantId)) {
      return res.status(400).json({ error: 'Usuario inválido' })
    }

    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!p || !userCanSeePost(req.user, p)) {
      return res.status(404).json({ error: 'Publicación no encontrada' })
    }

    const other = await User.findOne({
      _id: participantId,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!other) return res.status(404).json({ error: 'Usuario no encontrado' })

    const blocked = await ChatBlock.countDocuments({
      tenantId: req.tenant._id,
      $or: [
        { blockerId: me, blockedId: other._id },
        { blockerId: other._id, blockedId: me },
      ],
    })
    if (blocked) {
      return res.status(403).json({ error: 'No podés enviar mensajes a este usuario' })
    }

    if (!userCanSeePost(other, p)) {
      return res.status(403).json({
        error: 'Esa persona no puede ver esta publicación (audiencia distinta)',
      })
    }

    const key = participantsKeyForDirect(me, other._id)
    let chat = await Chat.findOne({ tenantId: req.tenant._id, kind: 'direct', participantsKey: key })
    if (!chat) {
      chat = await Chat.create({
        tenantId: req.tenant._id,
        kind: 'direct',
        participantsKey: key,
        participantIds: [me, other._id],
        participants: [
          { userId: me, role: 'member' },
          { userId: other._id, role: 'member' },
        ],
        readBy: [{ userId: me, readAt: new Date() }],
      })
    }
    if (chat.closedAt) {
      return res.status(403).json({ error: 'El chat con este usuario está cerrado' })
    }

    const title = String(p.titulo || 'Publicación').trim().slice(0, 120) || 'Publicación'
    const note = sanitizeMessageText(req.body?.note || '', 280)
    const link = `/muro/${p._id}`
    const parts = [
      'Te compartí una publicación:',
      '',
      `«${title}»`,
      '',
      `Abrila acá: ${link}`,
    ]
    if (note) parts.push('', note)
    const texto = sanitizeMessageText(parts.join('\n'))

    const authorName =
      [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') ||
      req.user.usuario ||
      'Usuario'

    const msg = await ChatMessage.create({
      tenantId: req.tenant._id,
      chatId: chat._id,
      authorId: me,
      authorName,
      texto,
      adjuntos: [],
      mentionUserIds: [],
    })

    const now = new Date()
    chat.lastMessageAt = now
    chat.lastMessagePreview = previewFromMessage(texto, [])
    chat.lastMessageAuthorId = me
    const readIdx = (chat.readBy || []).findIndex((r) => String(r.userId) === String(me))
    if (readIdx >= 0) chat.readBy[readIdx].readAt = now
    else chat.readBy.push({ userId: me, readAt: now })
    await chat.save()

    notifyChatMessage({
      tenant: req.tenant,
      chat,
      message: msg,
      recipientIds: [String(other._id)],
      author: req.user,
    }).catch((err) => console.warn('[notify-chat]', err?.message || err))

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: me,
      event: 'post_shared',
      entityId: `${p._id}:${msg._id}`,
      meta: { postId: String(p._id), chatId: String(chat._id) },
    })

    res.status(201).json({
      ok: true,
      chatId: String(chat._id),
      messageId: String(msg._id),
    })
  } catch (e) {
    next(e)
  }
})

export default router
