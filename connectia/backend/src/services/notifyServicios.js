/**
 * Notificaciones portal de servicios — in-app + push (mínimo).
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

async function notifyOne({ tenant, userId, title, body, href, requestId }) {
  if (!tenant?._id || !userId) return
  let user = null
  try {
    user = await User.findOne({
      _id: userId,
      tenantId: tenant._id,
      activo: true,
    })
      .select('_id notifPrefs')
      .lean()
  } catch {
    return
  }
  if (!user) return

  try {
    await AppNotification.create({
      tenantId: tenant._id,
      userId: user._id,
      kind: 'servicio',
      title: String(title || 'Servicio').slice(0, 160),
      body: String(body || '').slice(0, 500),
      href: href || '/servicios',
      refType: 'servicio',
      refId: requestId || null,
    })
  } catch {
    /* ignore */
  }

  if (user.notifPrefs?.push !== false) {
    try {
      await sendPushToUser(user._id, {
        title: String(title || 'Servicio').slice(0, 80),
        body: String(body || '').slice(0, 160),
        data: { href: href || '/servicios' },
      })
    } catch {
      /* ignore */
    }
  }
}

export async function notifyServicioRecipients({
  tenant,
  userIds,
  title,
  body,
  href,
  requestId,
}) {
  const seen = new Set()
  for (const id of userIds || []) {
    const sid = String(id || '')
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    await notifyOne({ tenant, userId: sid, title, body, href, requestId })
  }
}

export async function notifyServicioCreated({ tenant, request, area }) {
  const recipients = [...(area?.receptorUserIds || [])]
  await notifyServicioRecipients({
    tenant,
    userIds: recipients,
    title: `Nueva solicitud #${request.number}`,
    body: 'Hay una nueva solicitud en el portal de servicios.',
    href: '/servicios',
    requestId: request._id,
  })
}

export async function notifyServicioStatusChanged({ tenant, request, createdBy }) {
  if (!createdBy) return
  await notifyOne({
    tenant,
    userId: createdBy,
    title: `Servicio #${request.number}: ${request.status}`,
    body: 'Actualizaron el estado de tu solicitud.',
    href: '/servicios',
    requestId: request._id,
  })
}
