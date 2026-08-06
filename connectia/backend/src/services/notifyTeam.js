/**
 * Notificaciones Ola 32 — aviso a miembros del equipo.
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

export async function notifyUsersTeam({
  tenant,
  userIds,
  kind,
  title,
  body,
  href,
  refType,
  refId,
  excludeUserId,
}) {
  const exclude = excludeUserId ? String(excludeUserId) : ''
  const ids = [...new Set((userIds || []).map(String))].filter((id) => id && id !== exclude)
  if (!ids.length || !tenant?._id) return { inApp: 0, push: 0 }

  const users = await User.find({
    _id: { $in: ids },
    tenantId: tenant._id,
    activo: true,
  })
    .select('_id notifPrefs')
    .lean()

  let inApp = 0
  let push = 0

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.create({
          tenantId: tenant._id,
          userId: u._id,
          kind: kind || 'team_notice',
          title: String(title || '').slice(0, 160),
          body: String(body || '').slice(0, 500),
          href: String(href || '/avisos').slice(0, 300),
          refType: refType || 'team',
          refId: refId || null,
        })
        inApp += 1
      } catch {
        /* ignore dup */
      }
      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 80),
            body: String(body || '').slice(0, 120),
            url: String(href || '/avisos'),
          })
          if (r?.sent) push += 1
        } catch {
          /* ignore */
        }
      }
    }),
  )

  return { inApp, push }
}
