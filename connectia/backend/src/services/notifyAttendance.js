/**
 * Notificaciones in-app + push para marcación de asistencia (Ola 18).
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { TeamScope } from '../models/TeamScope.js'
import { sendPushToUser } from './pushService.js'
import { findUsersWithCapability } from './notifyTramite.js'
import { geoResultLabel } from '../lib/attendance.js'

async function notifyUsers({ tenant, userIds, kind, title, body, href, refType, refId, excludeUserId }) {
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
          kind,
          title: String(title || '').slice(0, 160),
          body: String(body || '').slice(0, 500),
          href: String(href || '/asistencia').slice(0, 300),
          refType: refType || '',
          refId: refId || null,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-attendance] in-app:', err?.message || err)
      }

      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href || '/asistencia',
            kind,
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-attendance] push:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push }
}

/** Supervisores: manager directo + dueños de TeamScope donde el user es miembro. */
export async function findAttendanceSupervisors(tenantId, userId) {
  const ids = new Set()
  const user = await User.findOne({ _id: userId, tenantId }).select('managerId').lean()
  if (user?.managerId) ids.add(String(user.managerId))

  const scopes = await TeamScope.find({
    tenantId,
    activo: true,
    memberIds: userId,
  })
    .select('supervisorId')
    .lean()
  for (const s of scopes) {
    if (s.supervisorId) ids.add(String(s.supervisorId))
  }
  return [...ids]
}

/**
 * Tras marcar: avisa a supervisores si fuera de rango / tarde; a admins asistencia si fuera de rango.
 */
export async function notifyAttendancePunch({ tenant, punch, userName, placeName }) {
  if (!punch?._id || !tenant?._id) return { inApp: 0, push: 0 }

  const name = userName || 'Colaborador'
  const place = placeName || 'lugar'
  const geo = geoResultLabel(punch.geoResult)
  const isOut = punch.geoResult === 'out_of_range'
  const isLate = Number(punch.lateMinutes) > 0 && punch.kind === 'entrada'

  if (!isOut && !isLate) return { inApp: 0, push: 0 }

  const supervisorIds = await findAttendanceSupervisors(tenant._id, punch.userId)
  const admins = isOut ? await findUsersWithCapability(tenant._id, 'admin.asistencia') : []
  const targets = [...supervisorIds, ...admins.map((a) => String(a._id))]

  const title = isOut ? 'Marca fuera de rango' : 'Entrada con demora'
  const bodyParts = [
    `${name} · ${punch.kind}`,
    geo,
    place,
    isLate ? `+${punch.lateMinutes} min` : null,
    punch.justification ? `Justif.: ${punch.justification}` : null,
  ].filter(Boolean)

  return notifyUsers({
    tenant,
    userIds: targets,
    kind: 'attendance.punch',
    title,
    body: bodyParts.join(' · '),
    href: '/asistencia',
    refType: 'AttendancePunch',
    refId: punch._id,
    excludeUserId: punch.userId,
  })
}
