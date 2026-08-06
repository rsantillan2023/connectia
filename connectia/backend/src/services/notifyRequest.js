/**
 * Notificaciones de solicitud/consulta (§9.08): in-app + push + email selectivo.
 * Regla: notas internas (interno=true) nunca llegan al solicitante.
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { stateLabel } from '../lib/solicitudesConfig.js'
import {
  messageNotifyTarget,
  classifyRequestStateEvents,
  requestEventCopy,
} from '../lib/requestNotifyRules.js'
import { findUsersWithCapability } from './notifyTramite.js'
import { sendPushToUser } from './pushService.js'
import { emailService } from './emailService.js'

function requestHref(requestId) {
  return `/solicitudes/${requestId}`
}

async function managerIds(tenant, excludeUserId) {
  const managers = await findUsersWithCapability(tenant._id, 'admin.solicitudes')
  const exclude = excludeUserId ? String(excludeUserId) : ''
  return managers.map((u) => u._id).filter((id) => String(id) !== exclude)
}

async function notifyUsers({
  tenant,
  userIds,
  kind,
  title,
  body,
  href,
  refType,
  refId,
  excludeUserId,
  channels = { inApp: true, push: true, email: false },
}) {
  const exclude = excludeUserId ? String(excludeUserId) : ''
  const ids = [...new Set((userIds || []).map(String))].filter((id) => id && id !== exclude)
  if (!ids.length || !tenant?._id) return { inApp: 0, push: 0, email: 0 }

  const users = await User.find({
    _id: { $in: ids },
    tenantId: tenant._id,
    activo: true,
  })
    .select('_id email nombre apellido usuario notifPrefs')
    .lean()

  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const absoluteUrl = href?.startsWith('http')
    ? href
    : `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}${href || '/'}`

  let inApp = 0
  let push = 0
  let email = 0

  await Promise.all(
    users.map(async (u) => {
      if (channels.inApp !== false) {
        try {
          await AppNotification.create({
            tenantId: tenant._id,
            userId: u._id,
            kind,
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 500),
            href: String(href || '/').slice(0, 300),
            refType: refType || 'request',
            refId: refId || null,
          })
          inApp += 1
        } catch (err) {
          console.warn('[notify-request] in-app:', err?.message || err)
        }
      }

      if (channels.push !== false && u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href,
            kind,
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-request] push:', err?.message || err)
        }
      }

      if (channels.email && u.email && u.notifPrefs?.email !== false) {
        try {
          const r = await emailService.sendGenericEmail(u.email, {
            subject: String(title || 'Solicitud').slice(0, 160),
            text: `Hola ${[u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || ''},\n\n${body}\n\nVer: ${absoluteUrl}\n`,
            html: `<p>${String(body || '').replace(/</g, '&lt;')}</p><p><a href="${absoluteUrl}">Ver solicitud</a></p>`,
            brandName,
          })
          if (r?.success) email += 1
        } catch (err) {
          console.warn('[notify-request] email:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push, email }
}

function labelFn(cfg) {
  return (key) => stateLabel(cfg, key)
}

/** Alta por miembro → gestores (pendiente / email). */
export async function notifyRequestCreated({ tenant, request, cfg }) {
  if (!request?._id || !tenant?._id) return { inApp: 0, push: 0, email: 0 }
  const copy = requestEventCopy({
    kind: 'request_created',
    request,
    stateLabelFn: labelFn(cfg),
  })
  const ids = await managerIds(tenant, request.requesterId)
  return notifyUsers({
    tenant,
    userIds: ids,
    kind: 'request_created',
    title: copy.title,
    body: copy.body,
    href: requestHref(request._id),
    refType: 'request',
    refId: request._id,
    channels: { inApp: true, push: true, email: true },
  })
}

/** Broadcast / generada por admin → cada destinatario. */
export async function notifyRequestGenerated({ tenant, requests, cfg }) {
  if (!tenant?._id || !Array.isArray(requests) || !requests.length) {
    return { inApp: 0, push: 0, email: 0 }
  }
  let totals = { inApp: 0, push: 0, email: 0 }
  await Promise.all(
    requests.map(async (request) => {
      if (!request?._id || !request.requesterId) return
      const copy = requestEventCopy({
        kind: 'request_generated',
        request,
        stateLabelFn: labelFn(cfg),
      })
      const r = await notifyUsers({
        tenant,
        userIds: [request.requesterId],
        kind: 'request_generated',
        title: copy.title,
        body: copy.body,
        href: requestHref(request._id),
        refType: 'request',
        refId: request._id,
        channels: { inApp: true, push: true, email: false },
      })
      totals.inApp += r.inApp
      totals.push += r.push
      totals.email += r.email
    }),
  )
  return totals
}

/** Mensaje en hilo — respeta notas internas. */
export async function notifyRequestMessage({ tenant, request, message, cfg }) {
  if (!request?._id || !tenant?._id) return { inApp: 0, push: 0, email: 0 }
  const target = messageNotifyTarget(message)
  if (target === 'none') return { inApp: 0, push: 0, email: 0 }

  if (target === 'requester') {
    const copy = requestEventCopy({
      kind: 'request_reply',
      request,
      stateLabelFn: labelFn(cfg),
    })
    return notifyUsers({
      tenant,
      userIds: [request.requesterId],
      kind: 'request_reply',
      title: copy.title,
      body: copy.body,
      href: requestHref(request._id),
      refType: 'request',
      refId: request._id,
      excludeUserId: message?.authorId,
      channels: { inApp: true, push: true, email: false },
    })
  }

  const copy = requestEventCopy({
    kind: 'request_member_message',
    request,
    stateLabelFn: labelFn(cfg),
  })
  const ids = await managerIds(tenant, message?.authorId || request.requesterId)
  if (request.assigneeId) ids.push(request.assigneeId)
  return notifyUsers({
    tenant,
    userIds: ids,
    kind: 'request_member_message',
    title: copy.title,
    body: copy.body,
    href: requestHref(request._id),
    refType: 'request',
    refId: request._id,
    excludeUserId: message?.authorId,
    channels: { inApp: true, push: true, email: false },
  })
}

/** Cambio de estado y/o área. */
export async function notifyRequestStateChanged({
  tenant,
  request,
  fromEstado,
  toEstado,
  fromArea,
  toArea,
  cfg,
  actorId,
}) {
  if (!request?._id || !tenant?._id) return { inApp: 0, push: 0, email: 0 }

  const events = classifyRequestStateEvents({
    fromEstado,
    toEstado,
    fromArea,
    toArea,
    cfg,
  })
  if (!events.length) return { inApp: 0, push: 0, email: 0 }

  let totals = { inApp: 0, push: 0, email: 0 }

  for (const ev of events) {
    const copy = requestEventCopy({
      kind: ev.kind,
      request,
      fromEstado,
      toEstado,
      fromArea,
      toArea,
      stateLabelFn: labelFn(cfg),
    })

    // Destinatario principal: solicitante (salvo que él mismo sea el actor)
    const r = await notifyUsers({
      tenant,
      userIds: [request.requesterId],
      kind: ev.kind,
      title: copy.title,
      body: copy.body,
      href: requestHref(request._id),
      refType: 'request',
      refId: request._id,
      excludeUserId: actorId,
      channels: { inApp: true, push: ev.push !== false, email: Boolean(ev.email) },
    })
    totals.inApp += r.inApp
    totals.push += r.push
    totals.email += r.email

    // Cambio de área también avisa a gestores del área destino
    if (ev.kind === 'request_area_changed') {
      const ids = await managerIds(tenant, actorId || request.requesterId)
      const r2 = await notifyUsers({
        tenant,
        userIds: ids,
        kind: ev.kind,
        title: copy.title,
        body: copy.body,
        href: requestHref(request._id),
        refType: 'request',
        refId: request._id,
        excludeUserId: actorId,
        channels: { inApp: true, push: true, email: true },
      })
      totals.inApp += r2.inApp
      totals.push += r2.push
      totals.email += r2.email
    }
  }

  return totals
}
