/**
 * Notificaciones pedidos / alarma — in-app + push + email (ambos canales).
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'
import { emailService } from './emailService.js'

async function notifyOne({ tenant, userId, title, body, href, pedidoId }) {
  if (!tenant?._id || !userId) return
  let user = null
  try {
    user = await User.findOne({
      _id: userId,
      tenantId: tenant._id,
      activo: true,
    })
      .select('_id email nombre apellido notifPrefs')
      .lean()
  } catch {
    return
  }
  if (!user) return

  try {
    await AppNotification.create({
      tenantId: tenant._id,
      userId: user._id,
      kind: 'pedido',
      title: String(title || 'Pedido').slice(0, 160),
      body: String(body || '').slice(0, 500),
      href: href || '/pedidos',
      refType: 'pedido',
      refId: pedidoId || null,
    })
  } catch {
    /* ignore */
  }

  if (user.notifPrefs?.push !== false) {
    try {
      await sendPushToUser(user._id, {
        title: String(title || 'Pedido').slice(0, 80),
        body: String(body || '').slice(0, 160),
        data: { href: href || '/pedidos' },
      })
    } catch {
      /* ignore */
    }
  }

  // Email además de push (no solo fallback)
  if (user.email && user.notifPrefs?.email !== false && emailService.isConfigured) {
    try {
      const nombre = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Hola'
      const adminUrl = `${(process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '')}/pedidos`
      await emailService.sendGenericEmail(user.email, {
        subject: String(title || 'Pedido').slice(0, 160),
        text: [
          `${nombre},`,
          '',
          String(body || ''),
          '',
          `Abrí la bandeja: ${adminUrl}`,
          '',
          `Comunidad: ${tenant.empNombre || tenant.empCodigo || ''}`,
        ].join('\n'),
        brandName: tenant.branding?.name || tenant.empNombre || 'Connectia',
      })
    } catch {
      /* ignore */
    }
  }
}

export async function notifyPedidoRecipients({
  tenant,
  userIds,
  title,
  body,
  href,
  pedidoId,
}) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))]
  for (const userId of ids) {
    await notifyOne({ tenant, userId, title, body, href, pedidoId })
  }
}

export async function notifyPedidoCreated({
  tenant,
  pedido,
  receptorUserIds,
  creatorId,
}) {
  const num = pedido?.number
  const title =
    pedido?.source === 'alarm'
      ? `Alarma / reporte #${num}`
      : `Pedido #${num}`
  const body =
    pedido?.source === 'alarm'
      ? 'Nuevo reporte de campo con ubicación y foto.'
      : 'Nuevo pedido de catálogo.'
  void creatorId
  await notifyPedidoRecipients({
    tenant,
    userIds: receptorUserIds || [],
    title,
    body,
    href: '/pedidos',
    pedidoId: pedido?._id,
  })
}

export async function notifyPedidoStatusChanged({
  tenant,
  pedido,
  receptorUserIds,
  creatorId,
  status,
}) {
  const num = pedido?.number
  const title = `Pedido #${num}: ${status}`
  const body = `El pedido cambió a «${status}».`
  const ids = [...new Set([...(receptorUserIds || []), creatorId].filter(Boolean))]
  await notifyPedidoRecipients({
    tenant,
    userIds: ids,
    title,
    body,
    href: '/pedidos',
    pedidoId: pedido?._id,
  })
}
