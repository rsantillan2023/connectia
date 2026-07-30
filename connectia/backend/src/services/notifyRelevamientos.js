import { AppNotification } from '../models/AppNotification.js'
import { sendPushToUser } from './pushService.js'

export async function notifyRelevamiento({
  tenant,
  userId,
  title,
  body,
  assignmentId,
}) {
  if (!tenant?._id || !userId) return
  try {
    await AppNotification.create({
      tenantId: tenant._id,
      userId,
      kind: 'relevamiento',
      title: String(title || 'Relevamiento').slice(0, 160),
      body: String(body || '').slice(0, 500),
      href: '/relevamientos',
      refType: 'field_assignment',
      refId: assignmentId || null,
    })
  } catch {
    /* ignore */
  }
  try {
    await sendPushToUser(userId, {
      title: String(title || 'Relevamiento').slice(0, 80),
      body: String(body || '').slice(0, 160),
      data: { href: '/relevamientos' },
    })
  } catch {
    /* ignore */
  }
}
