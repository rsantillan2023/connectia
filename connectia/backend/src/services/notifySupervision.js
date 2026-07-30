/**
 * Notificaciones supervisión comercial — in-app + push; email si falla push (ADR-D31-2).
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'
import { emailService } from './emailService.js'

async function notifyUsers({ tenant, userIds, kind, title, body, href, refType, refId, excludeUserId }) {
  const exclude = excludeUserId ? String(excludeUserId) : ''
  const ids = [...new Set((userIds || []).map(String))].filter((id) => id && id !== exclude)
  if (!ids.length || !tenant?._id) return { inApp: 0, push: 0, email: 0 }

  const users = await User.find({
    _id: { $in: ids },
    tenantId: tenant._id,
    activo: true,
  })
    .select('_id email nombre notifPrefs')
    .lean()

  let inApp = 0
  let push = 0
  let email = 0

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.create({
          tenantId: tenant._id,
          userId: u._id,
          kind,
          title: String(title || '').slice(0, 160),
          body: String(body || '').slice(0, 500),
          href: String(href || '/supervision').slice(0, 300),
          refType: refType || 'sup_tarea',
          refId: refId || null,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-sup] in-app:', err?.message || err)
      }

      let pushOk = false
      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href || '/supervision',
            kind,
          })
          if (r?.sent) {
            push += r.sent
            pushOk = true
          }
        } catch (err) {
          console.warn('[notify-sup] push:', err?.message || err)
        }
      }

      if (!pushOk && u.email && u.notifPrefs?.email !== false && emailService.isConfigured) {
        try {
          const info = await emailService.transporter?.sendMail?.({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: u.email,
            subject: String(title || 'Supervisión').slice(0, 160),
            text: `${body || ''}\n\nAbrí: ${href || '/supervision'}`,
          })
          if (info?.messageId) email += 1
        } catch (err) {
          console.warn('[notify-sup] email:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push, email }
}

export async function notifyTaskAssigned({ tenant, tarea, assigneeId }) {
  if (!assigneeId) return { inApp: 0, push: 0, email: 0 }
  return notifyUsers({
    tenant,
    userIds: [assigneeId],
    kind: 'sup_tarea_asignada',
    title: 'Tarea asignada',
    body: tarea?.titulo || 'Tenés una nueva tarea de supervisión',
    href: `/supervision/tareas/${tarea?._id || tarea?.id}`,
    refId: tarea?._id || null,
  })
}

export async function notifyTaskCreatedManagers({ tenant, tarea, managerIds, excludeUserId }) {
  return notifyUsers({
    tenant,
    userIds: managerIds || [],
    kind: 'sup_tarea_creada',
    title: 'Nueva tarea de supervisión',
    body: tarea?.titulo || 'Se creó una tarea',
    href: `/supervision/tareas/${tarea?._id || tarea?.id}`,
    refId: tarea?._id || null,
    excludeUserId,
  })
}

export async function notifyEcrAction({ tenant, userId, title, body }) {
  if (!userId) return { inApp: 0, push: 0, email: 0 }
  return notifyUsers({
    tenant,
    userIds: [userId],
    kind: 'sup_ecr',
    title: title || 'Novedad de marca',
    body: body || 'Tu supervisor actualizó una marca fuera de rango',
    href: '/avisos',
  })
}
