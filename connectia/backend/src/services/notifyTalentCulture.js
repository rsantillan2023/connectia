/**
 * Notificaciones in-app (+ push) para Ola 27 (talento + cultura).
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

async function notifyUsers({ tenant, userIds, kind, title, body, href, refType, refId, excludeUserId }) {
  const ids = [...new Set((userIds || []).map(String))].filter(
    (id) => id && id !== String(excludeUserId || ''),
  )
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
          href: String(href || '/cultura').slice(0, 300),
          refType: refType || 'culture',
          refId: refId || null,
        })
        inApp += 1
      } catch (err) {
        console.warn('[notify-talent-culture] in-app:', err?.message || err)
      }

      if (u.notifPrefs?.push !== false) {
        try {
          const r = await sendPushToUser(u._id, {
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 100),
            url: href || '/cultura',
            kind,
          })
          if (r?.sent) push += r.sent
        } catch (err) {
          console.warn('[notify-talent-culture] push:', err?.message || err)
        }
      }
    }),
  )

  return { inApp, push }
}

export async function notifyRecognition({ tenant, recognition }) {
  const href = recognition.postId
    ? `/muro/${recognition.postId}`
    : '/cultura'
  return notifyUsers({
    tenant,
    userIds: [recognition.toUserId],
    kind: 'recognition',
    title: '¡Te reconocieron!',
    body: `${recognition.fromName || 'Alguien'}: ${String(recognition.mensaje || '').slice(0, 120)}`,
    href,
    refType: 'recognition',
    refId: recognition._id,
    excludeUserId: recognition.fromUserId,
  })
}

export async function notifyVacancyApplication({ tenant, vacancy, application }) {
  if (!vacancy?.authorId) return { inApp: 0, push: 0 }
  return notifyUsers({
    tenant,
    userIds: [vacancy.authorId],
    kind: 'vacancy_application',
    title: 'Nueva postulación interna',
    body: `${application.userName || 'Alguien'} postuló a ${vacancy.titulo}`,
    href: '/talento',
    refType: 'vacancy',
    refId: vacancy._id,
  })
}

export async function notifyCourseAssigned({ tenant, userId, course }) {
  return notifyUsers({
    tenant,
    userIds: [userId],
    kind: 'lms_assigned',
    title: 'Nuevo curso asignado',
    body: course.titulo,
    href: '/mi-desarrollo',
    refType: 'lms_course',
    refId: course._id,
  })
}

export async function notifyReferralStatus({ tenant, referral }) {
  return notifyUsers({
    tenant,
    userIds: [referral.referrerId],
    kind: 'referral_status',
    title: 'Actualización de tu referido',
    body: `${referral.candidateName}: ${referral.status}`,
    href: '/cultura',
    refType: 'referral',
    refId: referral._id,
  })
}
