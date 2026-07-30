import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Post } from '../models/Post.js'
import { Tenant } from '../models/Tenant.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { SavedPost } from '../models/SavedPost.js'
import {
  analyzeEngagementWithAi,
  aiConfigured as engagementAiConfigured,
  ENGAGEMENT_AI_MAX_POSTS,
} from '../services/engagementAi.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import {
  normalizeSection,
  notExpiredFilter,
  parseOptionalDate,
  pinnedUntilFromDuration,
} from '../lib/postLifecycle.js'
import { toPublicMediaUrl, resolvePostMediaFields, serializePostMedia } from '../lib/mediaUrl.js'
import {
  normalizePostsConfig,
  normalizePostDisplay,
  resolvePostPresentation,
  POST_SHOW_KEYS,
  POST_TIPOS,
  POST_LAYOUTS,
} from '../lib/postsConfig.js'
import { normalizeUgc } from '../lib/ugc.js'
import {
  analyzeUgcModeration,
  emptyAnalysis,
  serializeModerationAi,
  aiConfigured,
} from '../services/ugcModerationAi.js'
import { notifyUgcRejected } from '../services/notifyUgc.js'
import { notifyPostPublished } from '../services/notifyPost.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'
import { parseScheduledAt, validatePostSchedule, scheduleConflictWindow, classifyScheduleConflict } from '../lib/postSchedule.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

const POST_STATUSES = ['draft', 'pending_review', 'scheduled', 'published', 'rejected', 'archived']

function serialize(p, postsConfig) {
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
    layout: p.layout || presentation.layout,
    pinned: p.pinned,
    pinnedUntil: p.pinnedUntil || null,
    expiresAt: p.expiresAt || null,
    section: p.section || '',
    isKnowledge: Boolean(p.isKnowledge),
    priority: p.priority,
    notifyAudience: Boolean(p.notifyAudience),
    status: p.status,
    scheduledAt: p.scheduledAt || null,
    publishedAt: p.publishedAt,
    authorId: p.authorId ? String(p.authorId) : null,
    authorName: p.authorName,
    origin: p.origin || 'admin',
    moderatedBy: p.moderatedBy ? String(p.moderatedBy) : null,
    moderatedAt: p.moderatedAt || null,
    rejectionReason: p.rejectionReason || '',
    // Solo UGC (miembros de la app): pubs del admin CMS no se analizan
    moderationAi: p.origin === 'member' ? serializeModerationAi(p.moderationAi) : null,
    reactions: p.reactions,
    audience: serializeAudience(p.audience),
    display: normalizePostDisplay(p.display),
    resolvedDisplay: { show: presentation.show },
    linkedSurveyId: p.linkedSurveyId ? String(p.linkedSurveyId) : null,
    commentsEnabled: p.commentsEnabled !== false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function cfg(req) {
  return normalizePostsConfig(req.tenant?.postsConfig)
}

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }

  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))

  const [areas, groups, users] = await Promise.all([
    a.mode === 'restricted' && areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id')
      : [],
    a.mode === 'restricted' && groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id')
      : [],
    userIds.length
      ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id')
      : [],
  ])

  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

const SORTABLE = new Set([
  'titulo',
  'tipo',
  'status',
  'priority',
  'pinned',
  'publishedAt',
  'scheduledAt',
  'updatedAt',
  'createdAt',
  'authorName',
  'layout',
  'origin',
])

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Candidatos para destinatarios puntuales (capability de publicaciones). */
router.get('/audience-candidates', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    }
    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(40)
      .lean()
    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        usuario: u.usuario || '',
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        email: u.email || '',
        areaId: u.areaId ? String(u.areaId) : null,
        label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
      })),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Otras publicaciones programadas cerca de una fecha/hora (evitar colapso en el muro).
 * GET ?at=ISO&excludeId=&windowMinutes=120
 */
router.get('/schedule-conflicts', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const at = parseScheduledAt(req.query.at)
    if (!at) return res.status(400).json({ error: 'Parámetro at (fecha/hora) inválido' })

    const windowMinutes = Math.max(15, Math.min(24 * 60, Number(req.query.windowMinutes) || 120))
    const win = scheduleConflictWindow(at, { windowMinutes })
    const excludeId =
      req.query.excludeId && ObjectId.isValid(String(req.query.excludeId))
        ? new ObjectId(String(req.query.excludeId))
        : null

    const filter = {
      tenantId: req.tenant._id,
      status: 'scheduled',
      scheduledAt: { $gte: win.dayFrom, $lte: win.dayTo },
    }
    if (excludeId) filter._id = { $ne: excludeId }

    const rows = await Post.find(filter)
      .select('titulo status scheduledAt tipo authorName pinned priority')
      .sort({ scheduledAt: 1 })
      .limit(40)
      .lean()

    const items = rows.map((p) => {
      const severity = classifyScheduleConflict(p.scheduledAt, at, windowMinutes)
      const deltaMin = Math.round((new Date(p.scheduledAt).getTime() - at.getTime()) / 60_000)
      return {
        id: String(p._id),
        titulo: p.titulo || '(Sin título)',
        status: p.status,
        scheduledAt: p.scheduledAt,
        tipo: p.tipo || '',
        authorName: p.authorName || '',
        pinned: Boolean(p.pinned),
        priority: p.priority ?? 0,
        severity,
        deltaMinutes: deltaMin,
      }
    })

    const near = items.filter((x) => x.severity === 'near')
    const sameDay = items.filter((x) => x.severity === 'sameDay')

    res.json({
      at: at.toISOString(),
      windowMinutes,
      count: items.length,
      nearCount: near.length,
      sameDayCount: sameDay.length,
      items,
      near,
      sameDay,
    })
  } catch (e) {
    next(e)
  }
})

/** Config de formato/elementos por tipo de publicación */
router.get('/config', requireAuth, requireCapability('admin.publicaciones'), async (req, res) => {
  res.json({
    config: cfg(req),
    ugc: normalizeUgc(req.tenant?.ugc),
    meta: {
      tipos: POST_TIPOS,
      layouts: POST_LAYOUTS,
      showKeys: POST_SHOW_KEYS,
    },
  })
})

router.put('/config', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const normalized = normalizePostsConfig(req.body?.config ?? req.body)
    const t = await Tenant.findById(req.tenant._id)
    if (!t) return res.status(404).json({ error: 'Tenant no encontrado' })
    t.postsConfig = normalized
    if (req.body?.ugc != null) {
      t.ugc = normalizeUgc(req.body.ugc)
    }
    await t.save()
    req.tenant.postsConfig = normalized
    req.tenant.ugc = t.ugc
    res.json({ config: normalized, ugc: normalizeUgc(t.ugc) })
  } catch (e) {
    next(e)
  }
})

/**
 * Estadísticas de reacciones + guardados del muro.
 * Los guardados cuentan como señal de “me encanta / quiero volver a verla”.
 */
router.get('/engagement', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const publishedFilter = { tenantId, status: 'published' }

    const [totalsAgg, savesTotal, uniqueSavers, posts, savesByPost] = await Promise.all([
      Post.aggregate([
        { $match: publishedFilter },
        {
          $group: {
            _id: null,
            like: { $sum: { $ifNull: ['$reactions.like', 0] } },
            love: { $sum: { $ifNull: ['$reactions.love', 0] } },
            clap: { $sum: { $ifNull: ['$reactions.clap', 0] } },
            postsPublished: { $sum: 1 },
            postsWithReactions: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      {
                        $add: [
                          { $ifNull: ['$reactions.like', 0] },
                          { $ifNull: ['$reactions.love', 0] },
                          { $ifNull: ['$reactions.clap', 0] },
                        ],
                      },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      SavedPost.countDocuments({ tenantId }),
      SavedPost.distinct('userId', { tenantId }).then((ids) => ids.length),
      Post.find(publishedFilter)
        .select('titulo tipo publishedAt reactions authorName origin pinned')
        .sort({ publishedAt: -1 })
        .limit(500)
        .lean(),
      SavedPost.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$postId', saves: { $sum: 1 } } },
      ]),
    ])

    const t = totalsAgg[0] || {
      like: 0,
      love: 0,
      clap: 0,
      postsPublished: 0,
      postsWithReactions: 0,
    }
    const saveMap = new Map(savesByPost.map((r) => [String(r._id), r.saves]))

    const items = posts
      .map((p) => {
        const like = p.reactions?.like || 0
        const love = p.reactions?.love || 0
        const clap = p.reactions?.clap || 0
        const saves = saveMap.get(String(p._id)) || 0
        const reactionsTotal = like + love + clap
        return {
          id: String(p._id),
          titulo: p.titulo,
          tipo: p.tipo,
          authorName: p.authorName || '',
          origin: p.origin || 'admin',
          pinned: Boolean(p.pinned),
          publishedAt: p.publishedAt,
          reactions: { like, love, clap },
          reactionsTotal,
          saves,
          /** Señal de afinidad: me encanta + guardados (ambos indican “me gusta mucho”) */
          loveSignal: love + saves,
          engagement: reactionsTotal + saves,
        }
      })
      .sort((a, b) => b.engagement - a.engagement || b.loveSignal - a.loveSignal)

    res.json({
      totals: {
        like: t.like || 0,
        love: t.love || 0,
        clap: t.clap || 0,
        reactions: (t.like || 0) + (t.love || 0) + (t.clap || 0),
        saves: savesTotal,
        uniqueSavers,
        postsPublished: t.postsPublished || 0,
        postsWithReactions: t.postsWithReactions || 0,
        postsWithSaves: savesByPost.length,
        engagement: (t.like || 0) + (t.love || 0) + (t.clap || 0) + savesTotal,
        loveSignal: (t.love || 0) + savesTotal,
      },
      items,
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Análisis marketing con IA de una o varias publicaciones seleccionadas.
 * Body: { postIds: string[], focus?: string, provider?: auto|openai|anthropic }
 */
router.post('/engagement/analyze', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    if (!engagementAiConfigured()) {
      return res.status(503).json({
        error: 'Configurá OPENAI_API_KEY o ANTHROPIC_API_KEY para analizar con IA',
        configured: false,
      })
    }

    const rawIds = Array.isArray(req.body?.postIds) ? req.body.postIds : []
    const ids = [...new Set(rawIds.map((id) => String(id || '').trim()).filter(Boolean))]
    if (!ids.length) {
      return res.status(400).json({ error: 'Elegí al menos una publicación' })
    }
    if (ids.length > ENGAGEMENT_AI_MAX_POSTS) {
      return res.status(400).json({
        error: `Podés analizar hasta ${ENGAGEMENT_AI_MAX_POSTS} publicaciones por vez`,
      })
    }

    const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
    if (objectIds.length !== ids.length) {
      return res.status(400).json({ error: 'Hay IDs de publicación inválidos' })
    }

    const tenantId = req.tenant._id
    const [posts, savesByPost] = await Promise.all([
      Post.find({
        tenantId,
        _id: { $in: objectIds },
        status: 'published',
      })
        .select('titulo cuerpo tipo publishedAt reactions authorName origin pinned imageUrl imageUrls audioUrl')
        .lean(),
      SavedPost.aggregate([
        { $match: { tenantId, postId: { $in: objectIds } } },
        { $group: { _id: '$postId', saves: { $sum: 1 } } },
      ]),
    ])

    if (!posts.length) {
      return res.status(404).json({ error: 'No se encontraron publicaciones publicadas con esos IDs' })
    }

    const saveMap = new Map(savesByPost.map((r) => [String(r._id), r.saves]))
    const byId = new Map(posts.map((p) => [String(p._id), p]))

    // Mantener el orden de selección del admin
    const ordered = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => {
        const like = p.reactions?.like || 0
        const love = p.reactions?.love || 0
        const clap = p.reactions?.clap || 0
        const saves = saveMap.get(String(p._id)) || 0
        const reactionsTotal = like + love + clap
        const hasMedia = Boolean(
          p.imageUrl ||
            (Array.isArray(p.imageUrls) && p.imageUrls.length) ||
            p.audioUrl,
        )
        return {
          id: String(p._id),
          titulo: p.titulo,
          cuerpo: p.cuerpo || '',
          tipo: p.tipo,
          authorName: p.authorName || '',
          origin: p.origin || 'admin',
          pinned: Boolean(p.pinned),
          publishedAt: p.publishedAt,
          hasMedia,
          reactions: { like, love, clap },
          saves,
          loveSignal: love + saves,
          engagement: reactionsTotal + saves,
        }
      })

    const result = await analyzeEngagementWithAi({
      posts: ordered,
      tenant: req.tenant,
      provider: req.body?.provider || 'auto',
      focus: String(req.body?.focus || '').trim(),
    })

    res.json({
      ...result,
      configured: true,
      posts: ordered.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        engagement: p.engagement,
        saves: p.saves,
        reactions: p.reactions,
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const status = req.query.status
    const tipo = String(req.query.tipo || '').trim()
    const pinned = req.query.pinned
    const origin = String(req.query.origin || '').trim()
    const risk = String(req.query.risk || '').trim()
    const q = String(req.query.q || '').trim()
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(500, Math.max(1, Number(req.query.size) || 20))
    const fromDay = String(req.query.from || '').trim()
    const toDay = String(req.query.to || '').trim()
    const fromIso = /^\d{4}-\d{2}-\d{2}$/.test(fromDay) ? null : (req.query.from ? new Date(String(req.query.from)) : null)
    const toIso = /^\d{4}-\d{2}-\d{2}$/.test(toDay) ? null : (req.query.to ? new Date(String(req.query.to)) : null)
    const from = fromIso && !Number.isNaN(fromIso.getTime()) ? fromIso : null
    const to = toIso && !Number.isNaN(toIso.getTime()) ? toIso : null
    const sortBy = SORTABLE.has(String(req.query.sortBy || '')) ? String(req.query.sortBy) : 'updatedAt'
    const sortDir = String(req.query.sortDir || '').toLowerCase() === 'asc' ? 1 : -1

    const filter = { tenantId: req.tenant._id }
    if (status && POST_STATUSES.includes(status)) {
      filter.status = status
    } else {
      // Por defecto no ensuciar con rechazadas ni archivadas
      filter.status = { $nin: ['rejected', 'archived'] }
    }
    if (tipo && ['noticia', 'aviso', 'beneficio', 'evento', 'general'].includes(tipo)) filter.tipo = tipo
    if (origin === 'member' || origin === 'admin') filter.origin = origin
    if (['low', 'medium', 'high'].includes(risk)) filter['moderationAi.risk'] = risk
    if (pinned === 'true') filter.pinned = true
    if (pinned === 'false') filter.pinned = false
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ titulo: rx }, { cuerpo: rx }, { authorName: rx }]
    }
    // Rango por fecha de calendario (scheduledAt || publishedAt || createdAt || updatedAt)
    // Preferir YYYY-MM-DD en zona AR para coincidir con lo que ve el admin.
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDay) || /^\d{4}-\d{2}-\d{2}$/.test(toDay)) {
      const calDate = {
        $ifNull: [
          '$scheduledAt',
          { $ifNull: ['$publishedAt', { $ifNull: ['$createdAt', '$updatedAt'] }] },
        ],
      }
      const dayStr = {
        $dateToString: {
          format: '%Y-%m-%d',
          date: calDate,
          timezone: 'America/Argentina/Buenos_Aires',
        },
      }
      const parts = []
      if (/^\d{4}-\d{2}-\d{2}$/.test(fromDay)) parts.push({ $gte: [dayStr, fromDay] })
      if (/^\d{4}-\d{2}-\d{2}$/.test(toDay)) parts.push({ $lte: [dayStr, toDay] })
      filter.$expr = parts.length === 1 ? parts[0] : { $and: parts }
    } else if (from || to) {
      const calDate = {
        $ifNull: [
          '$scheduledAt',
          { $ifNull: ['$publishedAt', { $ifNull: ['$createdAt', '$updatedAt'] }] },
        ],
      }
      const parts = []
      if (from) parts.push({ $gte: [calDate, from] })
      if (to) parts.push({ $lte: [calDate, to] })
      filter.$expr = parts.length === 1 ? parts[0] : { $and: parts }
    }

    let sort = { [sortBy]: sortDir }
    // En pendientes, priorizar alto riesgo primero salvo que pidan otro sort
    if (status === 'pending_review' && !req.query.sortBy) {
      sort = { 'moderationAi.score': -1, createdAt: -1 }
    }

    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort(sort)
        .skip((page - 1) * size)
        .limit(size),
      Post.countDocuments(filter),
    ])
    const postsConfig = cfg(req)
    const pendingCount = await Post.countDocuments({
      tenantId: req.tenant._id,
      status: 'pending_review',
      origin: 'member',
    })
    const highRiskPending = await Post.countDocuments({
      tenantId: req.tenant._id,
      status: 'pending_review',
      origin: 'member',
      'moderationAi.risk': 'high',
    })
    res.json({
      items: items.map((p) => serialize(p, postsConfig)),
      total,
      page,
      size,
      pendingCount,
      highRiskPending,
      aiModerationConfigured: aiConfigured(),
      postsConfig,
      ugc: normalizeUgc(req.tenant?.ugc),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.titulo?.trim()) return res.status(400).json({ error: 'titulo obligatorio' })
    const postsConfig = cfg(req)
    const tipo = POST_TIPOS.includes(body.tipo) ? body.tipo : 'noticia'
    let status = 'draft'
    if (body.status === 'published') status = 'published'
    else if (body.status === 'scheduled') status = 'scheduled'
    else if (POST_STATUSES.includes(body.status) && body.status !== 'pending_review') {
      status = body.status === 'archived' || body.status === 'rejected' ? body.status : 'draft'
    }
    const scheduledAt = status === 'scheduled' ? parseScheduledAt(body.scheduledAt) : null
    if (status === 'scheduled') {
      const err = validatePostSchedule({ status, scheduledAt })
      if (err) return res.status(400).json({ error: err })
    }
    const defaultLayout = postsConfig.byTipo[tipo]?.defaultLayout || 'vertical'
    const layout = POST_LAYOUTS.includes(body.layout) ? body.layout : defaultLayout
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const display = normalizePostDisplay(body.display)
    const media = resolvePostMediaFields(body)
    const pinned = Boolean(body.pinned)
    let pinnedUntil = null
    if (pinned) {
      pinnedUntil =
        parseOptionalDate(body.pinnedUntil) ||
        pinnedUntilFromDuration({
          hours: body.pinnedHours,
          days: body.pinnedDays,
          preset: body.pinnedPreset,
        })
    }
    const expiresAt = parseOptionalDate(body.expiresAt)
    const p = await Post.create({
      tenantId: req.tenant._id,
      titulo: body.titulo.trim(),
      cuerpo: body.cuerpo || '',
      tipo,
      imageUrl: media.imageUrl,
      imageUrls: media.imageUrls,
      audioUrl: body.audioUrl || '',
      layout,
      pinned,
      pinnedUntil,
      expiresAt,
      section: normalizeSection(body.section),
      isKnowledge: Boolean(body.isKnowledge),
      priority: Number(body.priority) || 0,
      notifyAudience: Boolean(body.notifyAudience),
      status,
      scheduledAt: status === 'scheduled' ? scheduledAt : null,
      publishedAt: status === 'published' ? new Date() : null,
      authorId: req.user._id,
      authorName: req.user.nombre || req.user.usuario,
      origin: 'admin',
      moderationAi: undefined,
      audience,
      display,
      linkedSurveyId: body.linkedSurveyId || null,
      commentsEnabled: body.commentsEnabled !== false,
    })
    if (status === 'published' && p.notifyAudience) {
      notifyPostPublished({ post: p.toObject ? p.toObject() : p, tenant: req.tenant }).catch((err) =>
        console.warn('[posts] notify on create:', err?.message || err),
      )
    }
    res.status(201).json({ post: serialize(p, postsConfig) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id/approve', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'pending_review',
    })
    if (!p) return res.status(404).json({ error: 'No encontrada o ya moderada' })
    p.status = 'published'
    p.publishedAt = p.publishedAt || new Date()
    p.moderatedBy = req.user._id
    p.moderatedAt = new Date()
    p.rejectionReason = ''
    await p.save()
    if (p.origin === 'member' && p.authorId) {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: p.authorId,
        event: 'post_created',
        entityId: p._id,
        meta: { via: 'moderation_approve' },
      })
    }
    res.json({ post: serialize(p, cfg(req)) })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id/reject', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const p = await Post.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'pending_review',
    })
    if (!p) return res.status(404).json({ error: 'No encontrada o ya moderada' })
    const reason = String(req.body?.reason || '').trim().slice(0, 500)
    if (!reason) {
      return res.status(400).json({ error: 'Indicá el motivo del rechazo (se enviará al autor)' })
    }
    p.status = 'rejected'
    p.rejectionReason = reason
    p.moderatedBy = req.user._id
    p.moderatedAt = new Date()
    await p.save()

    // Aviso al creador: mail + push + in-app (no bloquea la respuesta)
    setImmediate(() => {
      notifyUgcRejected({ post: p, tenant: req.tenant, reason }).catch((err) => {
        console.warn('[ugc-reject] notify:', err?.message || err)
      })
    })

    res.json({ post: serialize(p, cfg(req)) })
  } catch (e) {
    next(e)
  }
})

/** Re-ejecutar análisis IA de moderación — SOLO publicaciones UGC (origin=member) */
router.post('/:id/analyze', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const p = await Post.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p) return res.status(404).json({ error: 'No encontrada' })
    if (p.origin !== 'member') {
      return res.status(400).json({
        error: 'El análisis IA solo aplica a publicaciones enviadas desde la app por miembros',
      })
    }
    p.moderationAi = emptyAnalysis({ status: 'pending' })
    await p.save()
    const analysis = await analyzeUgcModeration({
      titulo: p.titulo,
      cuerpo: p.cuerpo,
      imageUrl: p.imageUrl,
      imageUrls: p.imageUrls,
      audioUrl: p.audioUrl,
      authorName: p.authorName,
      tenantName: req.tenant.nombre,
      provider: req.body?.provider,
    })
    p.moderationAi = analysis
    await p.save()
    res.json({ post: serialize(p, cfg(req)), aiConfigured: aiConfigured() })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const p = await Post.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p) return res.status(404).json({ error: 'No encontrada' })
    const body = req.body || {}
    const wasPublished = p.status === 'published'
    if (typeof body.titulo === 'string') p.titulo = body.titulo.trim()
    if (typeof body.cuerpo === 'string') p.cuerpo = body.cuerpo
    if (body.tipo) p.tipo = body.tipo
    if (body.imageUrl !== undefined || body.imageUrls !== undefined) {
      const media = resolvePostMediaFields({
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : p.imageUrl,
        imageUrls: Array.isArray(body.imageUrls)
          ? body.imageUrls
          : body.imageUrl !== undefined
            ? []
            : p.imageUrls,
      })
      p.imageUrl = media.imageUrl
      p.imageUrls = media.imageUrls
    }
    if (typeof body.audioUrl === 'string') p.audioUrl = body.audioUrl
    if (['vertical', 'horizontal', 'banner'].includes(body.layout)) p.layout = body.layout
    if (typeof body.pinned === 'boolean') {
      p.pinned = body.pinned
      if (!body.pinned) p.pinnedUntil = null
    }
    if (body.pinnedUntil !== undefined || body.pinnedPreset || body.pinnedHours != null || body.pinnedDays != null) {
      if (p.pinned) {
        p.pinnedUntil =
          parseOptionalDate(body.pinnedUntil) ||
          pinnedUntilFromDuration({
            hours: body.pinnedHours,
            days: body.pinnedDays,
            preset: body.pinnedPreset,
          }) ||
          (body.pinnedUntil === null ? null : p.pinnedUntil)
      } else {
        p.pinnedUntil = null
      }
    }
    if (body.expiresAt !== undefined) p.expiresAt = parseOptionalDate(body.expiresAt)
    if (body.section !== undefined) p.section = normalizeSection(body.section)
    if (typeof body.isKnowledge === 'boolean') p.isKnowledge = body.isKnowledge
    if (body.priority != null) p.priority = Number(body.priority) || 0
    if (typeof body.notifyAudience === 'boolean') p.notifyAudience = body.notifyAudience
    if (body.audience != null) p.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (body.display != null) p.display = normalizePostDisplay(body.display)
    if (body.linkedSurveyId !== undefined) {
      p.linkedSurveyId = body.linkedSurveyId || null
    }
    if (typeof body.commentsEnabled === 'boolean') p.commentsEnabled = body.commentsEnabled
    if (typeof body.rejectionReason === 'string') {
      p.rejectionReason = body.rejectionReason.trim().slice(0, 500)
    }
    let newlyPublished = false
    if (body.status && POST_STATUSES.includes(body.status)) {
      const prev = p.status
      if (body.status === 'published' && prev !== 'published') {
        p.publishedAt = p.publishedAt || new Date()
        p.scheduledAt = null
        newlyPublished = true
        if (prev === 'pending_review') {
          p.moderatedBy = req.user._id
          p.moderatedAt = new Date()
          p.rejectionReason = ''
        }
      }
      if (body.status === 'scheduled') {
        const nextAt =
          body.scheduledAt !== undefined
            ? parseScheduledAt(body.scheduledAt)
            : p.scheduledAt
              ? new Date(p.scheduledAt)
              : null
        const err = validatePostSchedule({ status: 'scheduled', scheduledAt: nextAt })
        if (err) return res.status(400).json({ error: err })
        p.scheduledAt = nextAt
        p.publishedAt = null
      }
      // Desaprobar: publicada → pendiente (sale del muro, vuelve a cola)
      if (body.status === 'pending_review' && prev === 'published') {
        p.moderatedBy = req.user._id
        p.moderatedAt = new Date()
        p.rejectionReason = ''
      }
      if (body.status === 'rejected' && prev === 'pending_review') {
        p.moderatedBy = req.user._id
        p.moderatedAt = new Date()
      }
      if (body.status !== 'scheduled' && body.status !== 'published' && prev === 'scheduled') {
        p.scheduledAt = null
      }
      p.status = body.status
    } else if (body.scheduledAt !== undefined && p.status === 'scheduled') {
      const nextAt = parseScheduledAt(body.scheduledAt)
      const err = validatePostSchedule({ status: 'scheduled', scheduledAt: nextAt })
      if (err) return res.status(400).json({ error: err })
      p.scheduledAt = nextAt
    }
    await p.save()

    if (newlyPublished && p.origin === 'member' && p.authorId) {
      scheduleAwardPoints({
        tenant: req.tenant,
        userId: p.authorId,
        event: 'post_created',
        entityId: p._id,
        meta: { via: 'admin_publish' },
      })
    }

    const shouldNotify =
      (newlyPublished && p.notifyAudience) ||
      (Boolean(body.renotifyAudience) && wasPublished && p.status === 'published')
    if (shouldNotify) {
      notifyPostPublished({ post: p.toObject(), tenant: req.tenant }).catch((err) =>
        console.warn('[posts] notify on publish:', err?.message || err),
      )
    }

    res.json({ post: serialize(p, cfg(req)) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const p = await Post.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p) return res.status(404).json({ error: 'No encontrada' })
    p.status = 'archived'
    await p.save()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
