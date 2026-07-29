import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'
import { usersFilterForAudience } from '../lib/audience.js'
import { emailService } from './emailService.js'
import { sendPushToUser } from './pushService.js'

function displayName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function surveyAppUrl(surveyId) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/encuestas/${surveyId}`
}

/**
 * Notifica a la audiencia al publicar una encuesta:
 * 1) registro in-app (mensaje pendiente al abrir la app)
 * 2) email (si hay correo y prefs lo permiten)
 * 3) push web (si hay suscripción)
 *
 * No bloquea la respuesta HTTP: se llama en fire-and-forget.
 */
export async function notifySurveyPublished({ survey, tenant }) {
  if (!survey?._id) return { users: 0, email: 0, push: 0, inApp: 0 }

  const users = await User.find(usersFilterForAudience(survey.tenantId, survey.audience))
    .select('_id email nombre apellido usuario notifPrefs pushSubscriptions')
    .lean()

  if (!users.length) {
    return { users: 0, email: 0, push: 0, inApp: 0 }
  }

  const titulo = String(survey.titulo || 'Nueva encuesta').trim()
  const href = `/encuestas/${survey._id}`
  const url = surveyAppUrl(survey._id)
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const bodyText = survey.descripcion
    ? String(survey.descripcion).slice(0, 180)
    : 'Tenés una encuesta pendiente de respuesta.'

  let emailOk = 0
  let pushOk = 0
  let inAppOk = 0

  // In-app: upsert por usuario+encuesta (unique parcial)
  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.findOneAndUpdate(
          {
            tenantId: survey.tenantId,
            userId: u._id,
            kind: 'survey_pending',
            refId: survey._id,
          },
          {
            $set: {
              title: `Encuesta pendiente: ${titulo}`,
              body: bodyText,
              href,
              refType: 'survey',
              readAt: null,
              dismissedAt: null,
            },
            $setOnInsert: {
              tenantId: survey.tenantId,
              userId: u._id,
              kind: 'survey_pending',
              refId: survey._id,
            },
          },
          { upsert: true, new: true },
        )
        inAppOk += 1
      } catch (err) {
        console.warn('[notify-survey] in-app:', err?.message || err)
      }
    }),
  )

  // Email + push en paralelo por usuario (limitado en lotes para no saturar)
  const batchSize = 25
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (u) => {
        const nombre = displayName(u)
        if (u.email && u.notifPrefs?.email !== false) {
          try {
            const r = await emailService.sendSurveyPublishedEmail(u.email, {
              nombre,
              titulo,
              descripcion: bodyText,
              surveyUrl: url,
              brandName,
            })
            if (r?.success) emailOk += 1
          } catch (err) {
            console.warn('[notify-survey] email:', err?.message || err)
          }
        }

        if (u.notifPrefs?.push !== false) {
          try {
            const r = await sendPushToUser(u._id, {
              title: `${brandName}: nueva encuesta`,
              body: titulo,
              url: href,
              kind: 'survey_pending',
              surveyId: String(survey._id),
            })
            if (r?.sent) pushOk += r.sent
          } catch (err) {
            console.warn('[notify-survey] push:', err?.message || err)
          }
        }
      }),
    )
  }

  console.log(
    `[notify-survey] survey=${survey._id} users=${users.length} inApp=${inAppOk} email=${emailOk} push=${pushOk}`,
  )
  return { users: users.length, email: emailOk, push: pushOk, inApp: inAppOk }
}

/** Marca notificaciones de encuesta como leídas cuando el usuario responde. */
export async function markSurveyNotificationsRead({ tenantId, userId, surveyId }) {
  await AppNotification.updateMany(
    {
      tenantId,
      userId,
      kind: 'survey_pending',
      refId: surveyId,
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  )
}
