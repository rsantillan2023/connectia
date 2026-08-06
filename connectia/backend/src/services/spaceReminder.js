/**
 * Recordatorio in-app (+ push) ~10 min antes del inicio de una reserva.
 */
import { Reservation, SpaceResource } from '../models/Space.js'
import { Tenant } from '../models/Tenant.js'
import { notifyReservationUpcoming } from './notifySpaces.js'

export const SPACE_REMINDER_MINUTES = 10

/**
 * Reservas confirmadas cuyo inicio está dentro de los próximos `minutes` minutos
 * y aún no recibieron el recordatorio.
 */
export function reminderDueFilter(now = new Date(), minutes = SPACE_REMINDER_MINUTES) {
  const ms = Math.max(1, Number(minutes) || SPACE_REMINDER_MINUTES) * 60_000
  return {
    status: { $in: ['confirmed', 'checked_in'] },
    reminderSentAt: null,
    startAt: { $gt: now, $lte: new Date(now.getTime() + ms) },
  }
}

/**
 * @returns {{ scanned: number, sent: number, errors: number }}
 */
export async function processDueSpaceReminders(now = new Date()) {
  const filter = reminderDueFilter(now)
  const due = await Reservation.find(filter).limit(200).lean()
  if (!due.length) return { scanned: 0, sent: 0, errors: 0 }

  const tenantIds = [...new Set(due.map((r) => String(r.tenantId)))]
  const resourceIds = [...new Set(due.map((r) => String(r.resourceId)))]
  const [tenants, resources] = await Promise.all([
    Tenant.find({ _id: { $in: tenantIds } })
      .select('_id')
      .lean(),
    SpaceResource.find({ _id: { $in: resourceIds } })
      .select('_id nombre')
      .lean(),
  ])
  const tenantById = new Map(tenants.map((t) => [String(t._id), t]))
  const resourceById = new Map(resources.map((r) => [String(r._id), r]))

  let sent = 0
  let errors = 0

  for (const row of due) {
    const claimed = await Reservation.findOneAndUpdate(
      { _id: row._id, reminderSentAt: null, status: { $in: ['confirmed', 'checked_in'] } },
      { $set: { reminderSentAt: now } },
      { new: true },
    )
    if (!claimed) continue

    const tenant = tenantById.get(String(row.tenantId))
    if (!tenant) {
      errors += 1
      continue
    }

    try {
      const resource = resourceById.get(String(row.resourceId))
      await notifyReservationUpcoming(
        tenant,
        claimed,
        resource?.nombre || claimed.title || '',
        claimed.startAt,
      )
      sent += 1
    } catch (err) {
      errors += 1
      console.warn('[space-reminder]', err?.message || err)
    }
  }

  return { scanned: due.length, sent, errors }
}
