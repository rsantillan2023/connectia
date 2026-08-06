import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { Chat } from '../models/Chat.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { ChatBlock } from '../models/ChatBlock.js'
import { ChatReport } from '../models/ChatReport.js'
import { User } from '../models/User.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import {
  normalizeChatConfig,
  participantsKeyForDirect,
  parseAdjuntos,
  sanitizeMessageText,
  extractMentionTokens,
  previewFromMessage,
  validateDirectCreate,
  validateGroupCreate,
  validateSendMessage,
  isParticipant,
  unreadForUser,
} from '../lib/chatValidation.js'
import { notifyChatMessage } from '../services/notifyChat.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function displayName(u) {
  if (!u) return 'Usuario'
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function cfgOf(tenant) {
  return normalizeChatConfig(tenant?.chatConfig)
}

function requireChatCapability(req, res) {
  const caps = req.tenant?.capabilities || []
  if (!caps.includes('chat') && !caps.includes('*')) {
    res.status(403).json({ error: 'Chat no habilitado en esta comunidad' })
    return false
  }
  return true
}

function serializeAdjunto(a) {
  return {
    url: toPublicMediaUrl(a.url),
    nombre: a.nombre || 'Adjunto',
    mimeType: a.mimeType || '',
  }
}

function serializeMessage(m, { meId } = {}) {
  const reactions = {}
  for (const r of m.reactions || []) {
    const e = r.emoji
    if (!reactions[e]) reactions[e] = { emoji: e, count: 0, me: false }
    reactions[e].count += 1
    if (meId && String(r.userId) === String(meId)) reactions[e].me = true
  }
  return {
    id: String(m._id),
    chatId: String(m.chatId),
    authorId: m.authorId ? String(m.authorId) : null,
    authorName: m.authorName || '',
    texto: m.deletedAt ? '' : m.texto || '',
    deleted: Boolean(m.deletedAt),
    adjuntos: m.deletedAt ? [] : (m.adjuntos || []).map(serializeAdjunto),
    mentionUserIds: (m.mentionUserIds || []).map(String),
    reactions: Object.values(reactions),
    pinnedAt: m.pinnedAt || null,
    createdAt: m.createdAt,
  }
}

function serializeUserBrief(u) {
  if (!u) return null
  return {
    id: String(u._id),
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    usuario: u.usuario || '',
    avatarUrl: toPublicMediaUrl(u.avatarUrl || ''),
    displayName: displayName(u),
  }
}

function otherParticipantIds(chat, meId) {
  return (chat.participantIds || []).map(String).filter((id) => id !== String(meId))
}

function serializeChat(chat, { meId, usersById = new Map(), user = null, unreadCount = 0 } = {}) {
  const others = otherParticipantIds(chat, meId).map((id) => usersById.get(id) || { id })
  let title = chat.title || ''
  if (chat.kind === 'direct') {
    title = others.map((u) => u.displayName || u.usuario || 'Usuario').join(', ') || 'Chat'
  }
  const allowReplies = chat.allowReplies !== false
  const peer = others[0] || null
  const unread = unreadForUser(chat, meId)
  return {
    id: String(chat._id),
    kind: chat.kind,
    title,
    avatarUrl: peer?.avatarUrl || '',
    participants: (chat.participantIds || []).map((id) => {
      const u = usersById.get(String(id))
      return u || { id: String(id) }
    }),
    lastMessageAt: chat.lastMessageAt,
    lastMessagePreview: chat.lastMessagePreview || '',
    lastMessageAuthorId: chat.lastMessageAuthorId ? String(chat.lastMessageAuthorId) : null,
    unread,
    unreadCount: unread ? Math.max(1, Number(unreadCount) || 1) : 0,
    pinnedMessageIds: (chat.pinnedMessageIds || []).map(String),
    closedAt: chat.closedAt || null,
    createdByAdmin: Boolean(chat.createdByAdmin),
    allowReplies,
    canReply: canUserReply(chat, meId, user),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }
}

/** Conteos de mensajes no leídos (de otros) por chat, desde el último readAt del usuario. */
async function unreadMessageCountsByChat(tenantId, chats, meId) {
  const me = String(meId)
  const or = []
  for (const c of chats) {
    if (!unreadForUser(c, meId)) continue
    const entry = (c.readBy || []).find((r) => String(r.userId) === me)
    const since = entry?.readAt ? new Date(entry.readAt) : new Date(0)
    or.push({ chatId: c._id, createdAt: { $gt: since } })
  }
  if (!or.length) return new Map()
  const rows = await ChatMessage.aggregate([
    {
      $match: {
        tenantId,
        deletedAt: null,
        authorId: { $ne: meId },
        $or: or,
      },
    },
    { $group: { _id: '$chatId', n: { $sum: 1 } } },
  ])
  return new Map(rows.map((r) => [String(r._id), r.n]))
}

/** ¿Puede este usuario escribir? (allowReplies=false → solo admin del chat / gestoría) */
function canUserReply(chat, userId, user) {
  if (chat.closedAt) return false
  if (chat.allowReplies !== false) return true
  const uid = String(userId)
  const asChatAdmin = (chat.participants || []).some(
    (p) => String(p.userId) === uid && p.role === 'admin' && !p.leftAt,
  )
  if (asChatAdmin) return true
  const roles = user?.roles || []
  if (roles.includes('admin') || roles.includes('platform')) return true
  const caps = user?.capabilities || []
  if (caps.includes('admin.chat')) return true
  return false
}

async function loadUsersMap(tenantId, ids) {
  const unique = [...new Set(ids.map(String))].filter(Boolean)
  if (!unique.length) return new Map()
  const users = await User.find({ tenantId, _id: { $in: unique } })
    .select('nombre apellido usuario avatarUrl')
    .lean()
  const map = new Map()
  for (const u of users) map.set(String(u._id), serializeUserBrief(u))
  return map
}

async function isBlockedEither(tenantId, a, b) {
  const n = await ChatBlock.countDocuments({
    tenantId,
    $or: [
      { blockerId: a, blockedId: b },
      { blockerId: b, blockedId: a },
    ],
  })
  return n > 0
}

async function getChatForMember(req, chatId) {
  if (!mongoose.isValidObjectId(chatId)) return null
  const chat = await Chat.findOne({ _id: chatId, tenantId: req.tenant._id })
  if (!chat) return null
  if (!isParticipant(chat, req.user._id)) return null
  return chat
}

/** GET /api/chats/unread-count */
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chats = await Chat.find({
      tenantId: req.tenant._id,
      participantIds: req.user._id,
      closedAt: null,
    })
      .select('lastMessageAt readBy lastMessageAuthorId')
      .lean()
    let unreadCount = 0
    for (const c of chats) {
      if (String(c.lastMessageAuthorId) === String(req.user._id)) continue
      if (unreadForUser(c, req.user._id)) unreadCount += 1
    }
    res.json({ unreadCount })
  } catch (e) {
    next(e)
  }
})

/** GET /api/chats/directory — usuarios activos del tenant para iniciar chat */
router.get('/directory', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true, _id: { $ne: req.user._id } }
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ nombre: rx }, { apellido: rx }, { usuario: rx }, { email: rx }]
    }
    const users = await User.find(filter)
      .select('nombre apellido usuario avatarUrl')
      .sort({ nombre: 1, usuario: 1 })
      .limit(40)
      .lean()

    const blocked = await ChatBlock.find({
      tenantId: req.tenant._id,
      $or: [{ blockerId: req.user._id }, { blockedId: req.user._id }],
    }).lean()
    const blockedIds = new Set()
    for (const b of blocked) {
      blockedIds.add(String(b.blockerId) === String(req.user._id) ? String(b.blockedId) : String(b.blockerId))
    }

    res.json({
      items: users
        .filter((u) => !blockedIds.has(String(u._id)))
        .map(serializeUserBrief),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/block — bloquear usuario */
router.post('/block', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const blockedId = String(req.body?.userId || '').trim()
    if (!mongoose.isValidObjectId(blockedId)) return res.status(400).json({ error: 'userId inválido' })
    if (blockedId === String(req.user._id)) return res.status(400).json({ error: 'No podés bloquearte' })
    const other = await User.findOne({ _id: blockedId, tenantId: req.tenant._id })
    if (!other) return res.status(404).json({ error: 'Usuario no encontrado' })
    await ChatBlock.findOneAndUpdate(
      { tenantId: req.tenant._id, blockerId: req.user._id, blockedId: other._id },
      { tenantId: req.tenant._id, blockerId: req.user._id, blockedId: other._id },
      { upsert: true, new: true },
    )
    res.status(201).json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** DELETE /api/chats/block/:userId */
router.delete('/block/:userId', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    await ChatBlock.deleteOne({
      tenantId: req.tenant._id,
      blockerId: req.user._id,
      blockedId: req.params.userId,
    })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/upload — adjunto de chat */
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      ensureUploadDir()
      cb(null, UPLOAD_DIR)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const rawExt = path.extname(file.originalname || '').toLowerCase()
    const safe = /^\.(jpe?g|png|webp|gif|pdf|mp4)$/i.test(rawExt) ? rawExt.replace(/jpeg/i, 'jpg') : '.bin'
    const name = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (
      /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype) ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'video/mp4'
    ) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido (jpg, png, webp, gif, pdf, mp4)'))
    }
  },
})

router.post(
  '/upload',
  requireAuth,
  (req, res, next) => {
    if (!requireChatCapability(req, res)) return
    upload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' })
    const url = toPublicMediaUrl(`/uploads/${req.file.filename}`)
    res.status(201).json({
      url,
      nombre: req.file.originalname || req.file.filename,
      mimeType: req.file.mimetype,
    })
  },
)

/** GET /api/chats — mis conversaciones */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const q = String(req.query.q || '').trim().toLowerCase()
    const chats = await Chat.find({
      tenantId: req.tenant._id,
      participantIds: req.user._id,
      closedAt: null,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .lean()

    const allIds = chats.flatMap((c) => (c.participantIds || []).map(String))
    const usersById = await loadUsersMap(req.tenant._id, allIds)
    const unreadMap = await unreadMessageCountsByChat(req.tenant._id, chats, req.user._id)
    let items = chats.map((c) =>
      serializeChat(c, {
        meId: req.user._id,
        usersById,
        user: req.user,
        unreadCount: unreadMap.get(String(c._id)) || 0,
      }),
    )
    if (q) {
      items = items.filter(
        (c) =>
          String(c.title || '').toLowerCase().includes(q) ||
          String(c.lastMessagePreview || '').toLowerCase().includes(q) ||
          (c.participants || []).some((p) => String(p.displayName || p.usuario || '').toLowerCase().includes(q)),
      )
    }
    res.json({ items, config: cfgOf(req.tenant) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats — crear 1:1 o grupo */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const cfg = cfgOf(req.tenant)
    const kind = String(req.body?.kind || 'direct') === 'group' ? 'group' : 'direct'
    const me = req.user._id

    if (kind === 'direct') {
      const err = validateDirectCreate({ participantId: req.body?.participantId, selfId: me })
      if (err) return res.status(400).json({ error: err })
      const otherId = req.body.participantId
      const other = await User.findOne({ _id: otherId, tenantId: req.tenant._id, activo: true })
      if (!other) return res.status(404).json({ error: 'Usuario no encontrado' })
      if (await isBlockedEither(req.tenant._id, me, other._id)) {
        return res.status(403).json({ error: 'No podés iniciar chat con este usuario' })
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
      const usersById = await loadUsersMap(req.tenant._id, chat.participantIds)
      return res.status(201).json({ chat: serializeChat(chat.toObject(), { meId: me, usersById, user: req.user }) })
    }

    // group
    if (!cfg.allowGroups) return res.status(403).json({ error: 'Grupos deshabilitados' })
    const gErr = validateGroupCreate({
      title: req.body?.title,
      memberIds: req.body?.memberIds,
      selfId: me,
      maxMembers: cfg.maxGroupMembers,
    })
    if (gErr) return res.status(400).json({ error: gErr })
    const memberIds = [...new Set((req.body.memberIds || []).map(String))]
    const members = await User.find({
      tenantId: req.tenant._id,
      activo: true,
      _id: { $in: memberIds },
    }).select('_id')
    const ids = [...new Set([String(me), ...members.map((m) => String(m._id))])]
    if (ids.length < 2) return res.status(400).json({ error: 'El grupo necesita al menos otro miembro' })

    for (const oid of ids) {
      if (oid === String(me)) continue
      if (await isBlockedEither(req.tenant._id, me, oid)) {
        return res.status(403).json({ error: 'Hay un bloqueo con uno de los miembros' })
      }
    }

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id))
    const chat = await Chat.create({
      tenantId: req.tenant._id,
      kind: 'group',
      title: String(req.body.title).trim().slice(0, 80),
      participantIds: objectIds,
      participants: objectIds.map((id) => ({
        userId: id,
        role: String(id) === String(me) ? 'admin' : 'member',
      })),
      readBy: [{ userId: me, readAt: new Date() }],
    })
    const usersById = await loadUsersMap(req.tenant._id, chat.participantIds)
    res.status(201).json({ chat: serializeChat(chat.toObject(), { meId: me, usersById, user: req.user }) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/chats/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    const usersById = await loadUsersMap(req.tenant._id, chat.participantIds)
    res.json({ chat: serializeChat(chat.toObject(), { meId: req.user._id, usersById, user: req.user }), config: cfgOf(req.tenant) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/chats/:id/messages */
router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })

    const cfg = cfgOf(req.tenant)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40))
    const before = req.query.before ? new Date(req.query.before) : null
    const filter = { tenantId: req.tenant._id, chatId: chat._id }
    if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before }
    if (cfg.retentionDays > 0) {
      const cutoff = new Date(Date.now() - cfg.retentionDays * 86400000)
      filter.createdAt = filter.createdAt
        ? { ...filter.createdAt, $gte: cutoff }
        : { $gte: cutoff }
    }

    const rows = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean()
    const hasMore = rows.length > limit
    const batch = hasMore ? rows.slice(0, limit) : rows
    batch.reverse()
    res.json({
      items: batch.map((m) => serializeMessage(m, { meId: req.user._id })),
      hasMore,
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/:id/messages */
router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    if (chat.closedAt) return res.status(403).json({ error: 'Chat cerrado' })
    if (!canUserReply(chat, req.user._id, req.user)) {
      return res.status(403).json({ error: 'Este canal no admite respuestas' })
    }

    const cfg = cfgOf(req.tenant)
    const texto = sanitizeMessageText(req.body?.texto)
    const adjuntos = parseAdjuntos(req.body?.adjuntos, {
      allow: cfg.allowAttachments,
      mimeAllowlist: cfg.mimeAllowlist,
    })
    const vErr = validateSendMessage({ texto, adjuntos, allowAttachments: cfg.allowAttachments })
    if (vErr) return res.status(400).json({ error: vErr })

    // Bloqueo en 1:1
    if (chat.kind === 'direct') {
      const other = otherParticipantIds(chat, req.user._id)[0]
      if (other && (await isBlockedEither(req.tenant._id, req.user._id, other))) {
        return res.status(403).json({ error: 'Hay un bloqueo activo' })
      }
    }

    const tokens = extractMentionTokens(texto)
    let mentionUserIds = []
    if (tokens.length) {
      const mentioned = await User.find({
        tenantId: req.tenant._id,
        activo: true,
        usuario: { $in: tokens },
        _id: { $in: chat.participantIds },
      }).select('_id')
      mentionUserIds = mentioned.map((u) => u._id)
    }

    const msg = await ChatMessage.create({
      tenantId: req.tenant._id,
      chatId: chat._id,
      authorId: req.user._id,
      authorName: displayName(req.user),
      texto: texto || (adjuntos.length ? '' : ''),
      adjuntos,
      mentionUserIds,
    })

    const now = new Date()
    chat.lastMessageAt = now
    chat.lastMessagePreview = previewFromMessage(texto, adjuntos)
    chat.lastMessageAuthorId = req.user._id
    const readIdx = (chat.readBy || []).findIndex((r) => String(r.userId) === String(req.user._id))
    if (readIdx >= 0) chat.readBy[readIdx].readAt = now
    else chat.readBy.push({ userId: req.user._id, readAt: now })
    await chat.save()

    const recipientIds = (chat.participantIds || [])
      .map(String)
      .filter((id) => id !== String(req.user._id))

    notifyChatMessage({
      tenant: req.tenant,
      chat,
      message: msg,
      recipientIds,
      author: req.user,
    }).catch((err) => console.warn('[notify-chat]', err?.message || err))

    res.status(201).json({ message: serializeMessage(msg.toObject(), { meId: req.user._id }) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/:id/read */
router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    const now = new Date()
    const idx = (chat.readBy || []).findIndex((r) => String(r.userId) === String(req.user._id))
    if (idx >= 0) chat.readBy[idx].readAt = now
    else chat.readBy.push({ userId: req.user._id, readAt: now })
    await chat.save()
    res.json({ ok: true, readAt: now })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/:id/messages/:messageId/react */
router.post('/:id/messages/:messageId/react', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    const emoji = String(req.body?.emoji || '').trim().slice(0, 16)
    if (!emoji) return res.status(400).json({ error: 'emoji obligatorio' })
    const msg = await ChatMessage.findOne({
      _id: req.params.messageId,
      chatId: chat._id,
      tenantId: req.tenant._id,
      deletedAt: null,
    })
    if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' })

    const uid = String(req.user._id)
    const existing = (msg.reactions || []).findIndex(
      (r) => String(r.userId) === uid && r.emoji === emoji,
    )
    if (existing >= 0) {
      msg.reactions.splice(existing, 1)
    } else {
      msg.reactions = (msg.reactions || []).filter((r) => !(String(r.userId) === uid && r.emoji === emoji))
      msg.reactions.push({ emoji, userId: req.user._id })
    }
    await msg.save()
    res.json({ message: serializeMessage(msg.toObject(), { meId: req.user._id }) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/:id/messages/:messageId/pin */
router.post('/:id/messages/:messageId/pin', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    const msg = await ChatMessage.findOne({
      _id: req.params.messageId,
      chatId: chat._id,
      tenantId: req.tenant._id,
      deletedAt: null,
    })
    if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' })
    const pin = req.body?.pin !== false
    msg.pinnedAt = pin ? new Date() : null
    await msg.save()
    const ids = (chat.pinnedMessageIds || []).map(String)
    const mid = String(msg._id)
    if (pin && !ids.includes(mid)) chat.pinnedMessageIds.push(msg._id)
    if (!pin) chat.pinnedMessageIds = (chat.pinnedMessageIds || []).filter((id) => String(id) !== mid)
    await chat.save()
    res.json({ message: serializeMessage(msg.toObject(), { meId: req.user._id }) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/chats/:id/report */
router.post('/:id/report', requireAuth, async (req, res, next) => {
  try {
    if (!requireChatCapability(req, res)) return
    const chat = await getChatForMember(req, req.params.id)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    const reason = String(req.body?.reason || '').trim().slice(0, 500)
    if (!reason) return res.status(400).json({ error: 'Motivo obligatorio' })
    let messageId = null
    if (req.body?.messageId && mongoose.isValidObjectId(req.body.messageId)) {
      messageId = req.body.messageId
    }
    const report = await ChatReport.create({
      tenantId: req.tenant._id,
      chatId: chat._id,
      messageId,
      reporterId: req.user._id,
      reason,
    })
    res.status(201).json({
      report: {
        id: String(report._id),
        status: report.status,
        createdAt: report.createdAt,
      },
    })
  } catch (e) {
    next(e)
  }
})

export default router
