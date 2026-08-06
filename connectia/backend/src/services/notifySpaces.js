/**
 * Notificaciones in-app (+ push) para reservas / coworking.
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

async function notifyUsers({ tenant, userIds, kind, title, body, href, refType, refId }) {
  const ids = [...new Set((userIds || []).map(String))].filter(Boolean)
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
          kind,
          title: String(title || '').slice(0, 160),
          body: String(body || '').slice(0, 500),
          href: String(href || '/espacios').slice(0, 300),
          refType: refType || 'reservation',
          refId: refId || null,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-spaces] in-app:', err?.message || err)
      }

      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href || '/espacios',
            kind,
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-spaces] push:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push }
}

export async function notifyReservationCreated(tenant, reservation, resourceNombre) {
  const pending = reservation.status === 'pending'
  return notifyUsers({
    tenant,
    userIds: [reservation.userId],
    kind: pending ? 'space.pending' : 'space.confirmed',
    title: pending ? 'Reserva pendiente de aprobación' : 'Reserva confirmada',
    body: pending
      ? `Tu reserva de ${resourceNombre || 'espacio'} quedó pendiente de aprobación.`
      : `Tu reserva de ${resourceNombre || 'espacio'} está confirmada.`,
    href: '/espacios?tab=mis',
    refId: reservation._id,
  })
}

export async function notifyReservationDecision(tenant, reservation, resourceNombre, approved) {
  return notifyUsers({
    tenant,
    userIds: [reservation.userId],
    kind: approved ? 'space.approved' : 'space.rejected',
    title: approved ? 'Reserva aprobada' : 'Reserva rechazada',
    body: approved
      ? `Aprobaron tu reserva de ${resourceNombre || 'espacio'}.`
      : `Rechazaron tu reserva de ${resourceNombre || 'espacio'}${
          reservation.rejectReason ? `: ${reservation.rejectReason}` : '.'
        }`,
    href: '/espacios?tab=mis',
    refId: reservation._id,
  })
}

export async function notifyReservationCancelled(tenant, reservation, resourceNombre) {
  return notifyUsers({
    tenant,
    userIds: [reservation.userId],
    kind: 'space.cancelled',
    title: 'Reserva cancelada',
    body: `Se canceló la reserva de ${resourceNombre || 'espacio'}.`,
    href: '/espacios?tab=mis',
    refId: reservation._id,
  })
}

/** Recordatorio ~10 min antes del inicio (uso del activo). */
export async function notifyReservationUpcoming(tenant, reservation, resourceNombre, startAt) {
  const when = startAt instanceof Date ? startAt : new Date(startAt)
  const hora = Number.isNaN(+when)
    ? ''
    : when.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const nombre = resourceNombre || 'tu reserva'
  return notifyUsers({
    tenant,
    userIds: [reservation.userId],
    kind: 'space.reminder',
    title: 'Tu reserva empieza en 10 minutos',
    body: hora
      ? `${nombre} es a las ${hora}. Ya podés prepararte para usarlo.`
      : `${nombre} empieza en breve. Ya podés prepararte para usarlo.`,
    href: '/espacios?tab=mis',
    refId: reservation._id,
  })
}
