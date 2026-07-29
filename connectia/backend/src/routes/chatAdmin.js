import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Chat } from '../models/Chat.js'
import { ChatReport } from '../models/ChatReport.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import {
  normalizeChatConfig,
  DEFAULT_CHAT_CONFIG,
  previewFromMessage,
  sanitizeMessageText,
} from '../lib/chatValidation.js'
import { normalizeAudience, serializeAudience, usersFilterForAudience } from '../lib/audience.js'
import { notifyChatMessage } from '../services/notifyChat.js'

const router = Router()
const MAX_CHANNEL_MEMBERS = 800

function displayName(u) {
  if (!u) return 'Usuario'
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

async function resolveAudienceMembers(tenantId, audience, { alwaysIncludeIds = [] } = {}) {
  const filter = usersFilterForAudience(tenantId, audience)
  const users = await User.find(filter).select('_id').limit(MAX_CHANNEL_MEMBERS + 1).lean()
  if (users.length > MAX_CHANNEL_MEMBERS) {
    const err = new Error(`La audiencia supera ${MAX_CHANNEL_MEMBERS} personas; acotala`)
    err.status = 400
    throw err
  }
  const ids = new Set(users.map((u) => String(u._id)))
  for (const id of alwaysIncludeIds) {
    if (id && mongoose.isValidObjectId(id)) ids.add(String(id))
  }
  return [...ids].map((id) => new mongoose.Types.ObjectId(id))
}

function serializeChannel(chat) {
  return {
    id: String(chat._id),
    title: chat.title || '',
    kind: chat.kind,
    createdByAdmin: Boolean(chat.createdByAdmin),
    allowReplies: chat.allowReplies !== false,
    audience: serializeAudience(chat.audience),
    memberCount: (chat.participantIds || []).length,
    lastMessageAt: chat.lastMessageAt,
    lastMessagePreview: chat.lastMessagePreview || '',
    closedAt: chat.closedAt || null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }
}

/** GET /api/admin/chat/config */
router.get('/config', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    res.json({ config: normalizeChatConfig(req.tenant.chatConfig) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/chat/config */
router.patch('/config', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const nextCfg = normalizeChatConfig({
      ...normalizeChatConfig(req.tenant.chatConfig),
      ...(req.body || {}),
    })
    const tenant = await Tenant.findById(req.tenant._id)
    tenant.chatConfig = nextCfg
    await tenant.save()
    res.json({ config: nextCfg })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/chat/channels — grupos/canales creados por admin */
router.get('/channels', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const items = await Chat.find({
      tenantId: req.tenant._id,
      createdByAdmin: true,
      kind: 'group',
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()
    res.json({ items: items.map((c) => serializeChannel(c)) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/chat/channels — crear canal con audiencia */
router.post('/channels', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 80)
    if (!title) return res.status(400).json({ error: 'Título obligatorio' })
    const audience = normalizeAudience(req.body?.audience)
    if (audience.mode === 'none') return res.status(400).json({ error: 'Audiencia inválida' })
    if (audience.mode === 'users' && !audience.userIds.length) {
      return res.status(400).json({ error: 'Elegí al menos una persona' })
    }
    if (
      audience.mode === 'restricted' &&
      !audience.areaIds.length &&
      !audience.groupIds.length &&
      !audience.userIds.length
    ) {
      return res.status(400).json({ error: 'Elegí áreas, grupos o personas' })
    }

    const allowReplies = req.body?.allowReplies !== false
    const memberIds = await resolveAudienceMembers(req.tenant._id, audience, {
      alwaysIncludeIds: [req.user._id],
    })
    if (memberIds.length < 1) {
      return res.status(400).json({ error: 'La audiencia no tiene usuarios activos' })
    }

    const chat = await Chat.create({
      tenantId: req.tenant._id,
      kind: 'group',
      title,
      createdByAdmin: true,
      createdByUserId: req.user._id,
      allowReplies,
      audience: {
        mode: audience.mode,
        areaIds: audience.areaIds,
        groupIds: audience.groupIds,
        userIds: audience.userIds,
      },
      participantIds: memberIds,
      participants: memberIds.map((id) => ({
        userId: id,
        role: String(id) === String(req.user._id) ? 'admin' : 'member',
      })),
      readBy: [{ userId: req.user._id, readAt: new Date() }],
    })

    const firstText = sanitizeMessageText(req.body?.message || '')
    if (firstText) {
      const msg = await ChatMessage.create({
        tenantId: req.tenant._id,
        chatId: chat._id,
        authorId: req.user._id,
        authorName: displayName(req.user),
        texto: firstText,
      })
      chat.lastMessageAt = msg.createdAt
      chat.lastMessagePreview = previewFromMessage(firstText)
      chat.lastMessageAuthorId = req.user._id
      await chat.save()

      const recipientIds = memberIds.map(String).filter((id) => id !== String(req.user._id))
      notifyChatMessage({
        tenant: req.tenant,
        chat,
        message: msg,
        recipientIds,
        author: req.user,
      }).catch((err) => console.warn('[notify-chat-channel]', err?.message || err))
    }

    res.status(201).json({ channel: serializeChannel(chat) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/chat/channels/:id — título / allowReplies */
router.patch('/channels/:id', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const chat = await Chat.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdByAdmin: true,
    })
    if (!chat) return res.status(404).json({ error: 'Canal no encontrado' })
    if (typeof req.body?.title === 'string') {
      const t = req.body.title.trim().slice(0, 80)
      if (t) chat.title = t
    }
    if (typeof req.body?.allowReplies === 'boolean') chat.allowReplies = req.body.allowReplies
    await chat.save()
    res.json({ channel: serializeChannel(chat) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/chat/channels/:id/sync — rearmar miembros según audiencia */
router.post('/channels/:id/sync', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const chat = await Chat.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      createdByAdmin: true,
    })
    if (!chat) return res.status(404).json({ error: 'Canal no encontrado' })
    const audience = normalizeAudience(chat.audience)
    const memberIds = await resolveAudienceMembers(req.tenant._id, audience, {
      alwaysIncludeIds: [chat.createdByUserId || req.user._id, req.user._id],
    })
    const prevAdmins = new Set(
      (chat.participants || []).filter((p) => p.role === 'admin').map((p) => String(p.userId)),
    )
    prevAdmins.add(String(req.user._id))
    if (chat.createdByUserId) prevAdmins.add(String(chat.createdByUserId))

    chat.participantIds = memberIds
    chat.participants = memberIds.map((id) => ({
      userId: id,
      role: prevAdmins.has(String(id)) ? 'admin' : 'member',
    }))
    await chat.save()
    res.json({ channel: serializeChannel(chat), synced: memberIds.length })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/chat/channels/:id/messages — mensaje desde admin */
router.post(
  '/channels/:id/messages',
  requireAuth,
  requireCapability('admin.chat'),
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'id inválido' })
      const chat = await Chat.findOne({
        _id: req.params.id,
        tenantId: req.tenant._id,
        createdByAdmin: true,
      })
      if (!chat) return res.status(404).json({ error: 'Canal no encontrado' })
      if (chat.closedAt) return res.status(403).json({ error: 'Chat cerrado' })

      const texto = sanitizeMessageText(req.body?.texto || req.body?.message || '')
      if (!texto) return res.status(400).json({ error: 'Mensaje obligatorio' })

      if (!(chat.participantIds || []).some((id) => String(id) === String(req.user._id))) {
        chat.participantIds.push(req.user._id)
        chat.participants.push({ userId: req.user._id, role: 'admin' })
      }

      const msg = await ChatMessage.create({
        tenantId: req.tenant._id,
        chatId: chat._id,
        authorId: req.user._id,
        authorName: displayName(req.user),
        texto,
      })
      const now = new Date()
      chat.lastMessageAt = now
      chat.lastMessagePreview = previewFromMessage(texto)
      chat.lastMessageAuthorId = req.user._id
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
      }).catch((err) => console.warn('[notify-chat-channel]', err?.message || err))

      res.status(201).json({
        message: {
          id: String(msg._id),
          texto: msg.texto,
          authorName: msg.authorName,
          createdAt: msg.createdAt,
        },
        channel: serializeChannel(chat),
      })
    } catch (e) {
      next(e)
    }
  },
)

/** GET /api/admin/chat/reports */
router.get('/reports', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const status = String(req.query.status || 'open')
    const filter = { tenantId: req.tenant._id }
    if (['open', 'resolved', 'dismissed'].includes(status)) filter.status = status
    const items = await ChatReport.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    const userIds = [
      ...new Set(items.flatMap((r) => [String(r.reporterId), String(r.resolvedBy || '')].filter(Boolean))),
    ]
    const users = await User.find({ tenantId: req.tenant._id, _id: { $in: userIds } })
      .select('nombre apellido usuario')
      .lean()
    const byId = new Map(users.map((u) => [String(u._id), displayName(u)]))
    res.json({
      items: items.map((r) => ({
        id: String(r._id),
        chatId: String(r.chatId),
        messageId: r.messageId ? String(r.messageId) : null,
        reporterId: String(r.reporterId),
        reporterName: byId.get(String(r.reporterId)) || 'Usuario',
        reason: r.reason,
        status: r.status,
        notes: r.notes || '',
        resolvedAt: r.resolvedAt,
        resolvedBy: r.resolvedBy ? String(r.resolvedBy) : null,
        createdAt: r.createdAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/chat/reports/:id/resolve */
router.post('/reports/:id/resolve', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const report = await ChatReport.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!report) return res.status(404).json({ error: 'Denuncia no encontrada' })
    const status = String(req.body?.status || 'resolved')
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'status inválido' })
    }
    report.status = status
    report.notes = String(req.body?.notes || '').trim().slice(0, 1000)
    report.resolvedAt = new Date()
    report.resolvedBy = req.user._id
    await report.save()

    if (req.body?.closeChat && report.chatId) {
      await Chat.updateOne(
        { _id: report.chatId, tenantId: req.tenant._id },
        { $set: { closedAt: new Date(), closedReason: 'Moderación' } },
      )
    }

    res.json({
      report: {
        id: String(report._id),
        status: report.status,
        notes: report.notes,
        resolvedAt: report.resolvedAt,
      },
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/chat/stats */
router.get('/stats', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [chats, messages, openReports, groups, adminChannels] = await Promise.all([
      Chat.countDocuments({ tenantId, closedAt: null }),
      ChatMessage.countDocuments({ tenantId, deletedAt: null }),
      ChatReport.countDocuments({ tenantId, status: 'open' }),
      Chat.countDocuments({ tenantId, kind: 'group', closedAt: null }),
      Chat.countDocuments({ tenantId, createdByAdmin: true, kind: 'group', closedAt: null }),
    ])
    res.json({
      chats,
      messages,
      openReports,
      groups,
      adminChannels,
      config: normalizeChatConfig(req.tenant.chatConfig) || DEFAULT_CHAT_CONFIG,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/chat/chats/:id — hilo para moderación */
router.get('/chats/:id', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const chat = await Chat.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })

    const users = await User.find({ tenantId: req.tenant._id, _id: { $in: chat.participantIds || [] } })
      .select('nombre apellido usuario avatarUrl activo')
      .lean()
    const byId = new Map(
      users.map((u) => [
        String(u._id),
        {
          id: String(u._id),
          displayName: displayName(u),
          usuario: u.usuario || '',
          activo: u.activo !== false,
        },
      ]),
    )

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
    const messages = await ChatMessage.find({ tenantId: req.tenant._id, chatId: chat._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    messages.reverse()

    let title = chat.title || ''
    if (chat.kind === 'direct') {
      title =
        (chat.participantIds || [])
          .map((id) => byId.get(String(id))?.displayName || 'Usuario')
          .join(' · ') || 'Chat 1:1'
    }

    const highlightMessageId = req.query.messageId ? String(req.query.messageId) : null

    res.json({
      chat: {
        id: String(chat._id),
        kind: chat.kind,
        title,
        closedAt: chat.closedAt || null,
        closedReason: chat.closedReason || '',
        lastMessageAt: chat.lastMessageAt,
        createdAt: chat.createdAt,
        allowReplies: chat.allowReplies !== false,
        createdByAdmin: Boolean(chat.createdByAdmin),
        participants: (chat.participantIds || []).map((id) => byId.get(String(id)) || { id: String(id) }),
      },
      messages: messages.map((m) => ({
        id: String(m._id),
        authorId: m.authorId ? String(m.authorId) : null,
        authorName: m.authorName || '',
        texto: m.deletedAt ? '' : m.texto || '',
        deleted: Boolean(m.deletedAt),
        adjuntos: m.deletedAt
          ? []
          : (m.adjuntos || []).map((a) => ({
              url: a.url,
              nombre: a.nombre || 'Adjunto',
              mimeType: a.mimeType || '',
            })),
        createdAt: m.createdAt,
        highlighted: highlightMessageId ? String(m._id) === highlightMessageId : false,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/chat/chats/:id/close */
router.post('/chats/:id/close', requireAuth, requireCapability('admin.chat'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'id inválido' })
    const chat = await Chat.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
    chat.closedAt = new Date()
    chat.closedReason = String(req.body?.reason || 'Moderación').slice(0, 200)
    await chat.save()
    res.json({ ok: true, closedAt: chat.closedAt })
  } catch (e) {
    next(e)
  }
})

export default router
