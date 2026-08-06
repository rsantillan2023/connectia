/**
 * Abrir / reutilizar chat 1:1 por un aviso de marketplace.
 */
import mongoose from 'mongoose'
import { Chat } from '../models/Chat.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { participantsKeyForDirect } from './chatValidation.js'

/**
 * @returns {Promise<{ chatId: string, created: boolean, href: string }>}
 */
export async function openMarketplaceChat({
  tenantId,
  meId,
  authorId,
  listing,
}) {
  if (!mongoose.isValidObjectId(String(authorId))) {
    const err = new Error('Autor inválido')
    err.status = 400
    throw err
  }
  if (String(authorId) === String(meId)) {
    const err = new Error('Este aviso es tuyo')
    err.status = 400
    throw err
  }

  const key = participantsKeyForDirect(meId, authorId)
  let chat = await Chat.findOne({ tenantId, kind: 'direct', participantsKey: key })
  let created = false
  if (!chat) {
    chat = await Chat.create({
      tenantId,
      kind: 'direct',
      participantsKey: key,
      participantIds: [meId, authorId],
      participants: [
        { userId: meId, role: 'member' },
        { userId: authorId, role: 'member' },
      ],
      readBy: [{ userId: meId, readAt: new Date() }],
    })
    created = true
  }

  const title = String(listing?.titulo || 'tu aviso').slice(0, 120)
  const texto = `Hola, te escribo por el aviso del marketplace: «${title}».`
  try {
    const msg = await ChatMessage.create({
      tenantId,
      chatId: chat._id,
      authorId: meId,
      texto,
    })
    chat.lastMessageAt = msg.createdAt || new Date()
    chat.lastMessagePreview = texto.slice(0, 120)
    chat.lastMessageAuthorId = meId
    await chat.save()
  } catch (err) {
    console.warn('[marketplace-chat] msg', err?.message || err)
  }

  return {
    chatId: String(chat._id),
    created,
    href: `/chat/${chat._id}`,
  }
}

export function tenantHasChat(tenant) {
  const caps = tenant?.capabilities || []
  return caps.includes('chat')
}
