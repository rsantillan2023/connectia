import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'
import { previewFromMessage } from '../lib/chatValidation.js'

function displayName(u) {
  if (!u) return 'Usuario'
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

/**
 * Avisa a destinatarios de un mensaje nuevo (in-app + push).
 * Fire-and-forget desde la ruta.
 */
export async function notifyChatMessage({ tenant, chat, message, recipientIds, author }) {
  const ids = [...new Set((recipientIds || []).map(String))].filter(Boolean)
  if (!ids.length || !chat?._id || !message) return { inApp: 0, push: 0 }

  const title =
    chat.kind === 'group'
      ? `${displayName(author)} · ${chat.title || 'Grupo'}`.slice(0, 160)
      : displayName(author).slice(0, 160)
  const body = previewFromMessage(message.texto, message.adjuntos).slice(0, 100)
  const href = `/chat/${chat._id}`

  let inApp = 0
  let push = 0

  const users = await User.find({
    _id: { $in: ids },
    tenantId: tenant._id,
    activo: true,
  })
    .select('_id notifPrefs')
    .lean()

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.create({
          tenantId: tenant._id,
          userId: u._id,
          kind: 'chat_message',
          title,
          body,
          href,
          refType: 'chat',
          refId: chat._id,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-chat] in-app:', err?.message || err)
      }

      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title,
            body,
            url: href,
            kind: 'chat_message',
            chatId: String(chat._id),
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-chat] push:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push }
}
