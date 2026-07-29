/**
 * Notificaciones in-app + push para licencias / ausentismos.
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

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
          href: String(href || '/').slice(0, 300),
          refType: refType || '',
          refId: refId || null,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-tramite] in-app:', err?.message || err)
      }

      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href,
            kind,
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-tramite] push:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push }
}

export async function findUsersWithCapability(tenantId, capability) {
  if (!tenantId || !capability) return []
  return User.find({
    tenantId,
    activo: true,
    $or: [
      { capabilities: capability },
      { capabilities: '*' },
      { roles: 'admin' },
      { roles: 'platform' },
    ],
  })
    .select('_id')
    .lean()
}

/** Nueva licencia → avisá a RRHH / aprobadores. */
export async function notifyLicenseCreated({ tenant, license }) {
  if (!license?._id) return { inApp: 0, push: 0 }
  const approvers = await findUsersWithCapability(tenant._id, 'admin.licencias')
  return notifyUsers({
    tenant,
    userIds: approvers.map((u) => u._id),
    excludeUserId: license.requesterId,
    kind: 'license_pending',
    title: `Licencia pendiente · ${license.codigo}`,
    body: `${license.requesterName || 'Alguien'} pidió ${license.tipoNombre || 'licencia'} (${license.dias || '?'} día/s)`,
    href: '/aprobaciones',
    refType: 'license',
    refId: license._id,
  })
}

/** Decisión sobre licencia → avisá al solicitante. */
export async function notifyLicenseDecided({ tenant, license }) {
  if (!license?.requesterId) return { inApp: 0, push: 0 }
  const estado = license.estado || ''
  const label =
    estado === 'aprobada' ? 'aprobada' : estado === 'rechazada' ? 'rechazada' : estado || 'actualizada'
  return notifyUsers({
    tenant,
    userIds: [license.requesterId],
    kind: 'license_decided',
    title: `Tu licencia fue ${label}`,
    body: `${license.codigo} · ${license.tipoNombre || 'Licencia'}${
      license.decisionComentario ? ` — ${license.decisionComentario}` : ''
    }`.slice(0, 500),
    href: `/licencias/${license._id}`,
    refType: 'license',
    refId: license._id,
  })
}

export async function notifyAbsenceCreated({ tenant, absence }) {
  if (!absence?._id) return { inApp: 0, push: 0 }
  const approvers = await findUsersWithCapability(tenant._id, 'admin.ausentismos')
  return notifyUsers({
    tenant,
    userIds: approvers.map((u) => u._id),
    excludeUserId: absence.requesterId,
    kind: 'absence_pending',
    title: `Ausencia pendiente · ${absence.codigo}`,
    body: `${absence.requesterName || 'Alguien'} registró ${absence.tipoNombre || 'ausencia'} (${absence.dias || '?'} día/s)`,
    href: '/aprobaciones',
    refType: 'absence',
    refId: absence._id,
  })
}

export async function notifyAbsenceDecided({ tenant, absence }) {
  if (!absence?.requesterId) return { inApp: 0, push: 0 }
  const estado = absence.estado || ''
  const label =
    estado === 'aprobada' ? 'aprobada' : estado === 'rechazada' ? 'rechazada' : estado || 'actualizada'
  return notifyUsers({
    tenant,
    userIds: [absence.requesterId],
    kind: 'absence_decided',
    title: `Tu ausencia fue ${label}`,
    body: `${absence.codigo} · ${absence.tipoNombre || 'Ausencia'}${
      absence.decisionComentario ? ` — ${absence.decisionComentario}` : ''
    }`.slice(0, 500),
    href: `/ausencias/${absence._id}`,
    refType: 'absence',
    refId: absence._id,
  })
}
