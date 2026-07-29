import { Chat } from '../models/Chat.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { participantsKeyForDirect, previewFromMessage } from '../lib/chatValidation.js'

function displayName(u) {
  if (!u) return 'Usuario'
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

/**
 * Seed idempotente de chats demo entre usuarios del tenant.
 */
export async function seedChatForTenant({ tenant, users = [] }) {
  const active = users.filter(Boolean)
  if (active.length < 2) return { chats: 0, messages: 0 }

  const [a, b, c] = active
  let chats = 0
  let messages = 0

  // 1:1 a ↔ b
  const keyAb = participantsKeyForDirect(a._id, b._id)
  let chatAb = await Chat.findOne({ tenantId: tenant._id, kind: 'direct', participantsKey: keyAb })
  if (!chatAb) {
    chatAb = await Chat.create({
      tenantId: tenant._id,
      kind: 'direct',
      participantsKey: keyAb,
      participantIds: [a._id, b._id],
      participants: [
        { userId: a._id, role: 'member' },
        { userId: b._id, role: 'member' },
      ],
      readBy: [
        { userId: a._id, readAt: new Date() },
        { userId: b._id, readAt: new Date(Date.now() - 3600000) },
      ],
    })
    chats += 1
  }

  const existingAb = await ChatMessage.countDocuments({ tenantId: tenant._id, chatId: chatAb._id })
  if (existingAb === 0) {
    const seedMsgs = [
      { author: a, texto: `Hola ${displayName(b).split(' ')[0] || ''}! ¿Cómo va el día?` },
      { author: b, texto: 'Todo bien, gracias. ¿Viste el aviso del muro?' },
      { author: a, texto: 'Sí, lo reviso ahora. Cualquier cosa te escribo acá.' },
    ]
    for (const sm of seedMsgs) {
      const msg = await ChatMessage.create({
        tenantId: tenant._id,
        chatId: chatAb._id,
        authorId: sm.author._id,
        authorName: displayName(sm.author),
        texto: sm.texto,
      })
      chatAb.lastMessageAt = msg.createdAt
      chatAb.lastMessagePreview = previewFromMessage(sm.texto)
      chatAb.lastMessageAuthorId = sm.author._id
      messages += 1
    }
    await chatAb.save()
  }

  // Grupo si hay 3+
  if (c) {
    let group = await Chat.findOne({
      tenantId: tenant._id,
      kind: 'group',
      title: 'Equipo Connectia',
    })
    if (!group) {
      group = await Chat.create({
        tenantId: tenant._id,
        kind: 'group',
        title: 'Equipo Connectia',
        participantIds: [a._id, b._id, c._id],
        participants: [
          { userId: a._id, role: 'admin' },
          { userId: b._id, role: 'member' },
          { userId: c._id, role: 'member' },
        ],
        readBy: [{ userId: a._id, readAt: new Date() }],
      })
      chats += 1
      const msg = await ChatMessage.create({
        tenantId: tenant._id,
        chatId: group._id,
        authorId: a._id,
        authorName: displayName(a),
        texto: 'Bienvenidos al chat de equipo 👋 Acá coordinamos lo operativo.',
      })
      group.lastMessageAt = msg.createdAt
      group.lastMessagePreview = previewFromMessage(msg.texto)
      group.lastMessageAuthorId = a._id
      await group.save()
      messages += 1
    }
  }

  if (!tenant.chatConfig) {
    tenant.chatConfig = {
      retentionDays: 365,
      allowGroups: true,
      allowAttachments: true,
      maxAttachmentMb: 15,
      maxGroupMembers: 50,
    }
    await tenant.save()
  }

  return { chats, messages }
}
