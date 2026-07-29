import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'
import { usersFilterForAudience } from '../lib/audience.js'
import { emailService } from './emailService.js'
import { sendPushToUser } from './pushService.js'

const TIPO_LABEL = {
  noticia: 'Noticia',
  aviso: 'Aviso',
  beneficio: 'Beneficio',
  evento: 'Evento',
  general: 'Publicación',
  celebracion: 'Celebración',
}

function displayName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function postAppUrl(postId) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/muro/${postId}`
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Notifica a la audiencia al publicar una pieza del muro:
 * 1) registro in-app
 * 2) email (si hay correo y prefs lo permiten)
 * 3) push web (si hay suscripción)
 *
 * No bloquea la respuesta HTTP: se llama en fire-and-forget.
 */
export async function notifyPostPublished({ post, tenant }) {
  if (!post?._id) return { users: 0, email: 0, push: 0, inApp: 0 }

  const users = await User.find(usersFilterForAudience(post.tenantId, post.audience))
    .select('_id email nombre apellido usuario notifPrefs pushSubscriptions')
    .lean()

  if (!users.length) {
    return { users: 0, email: 0, push: 0, inApp: 0 }
  }

  const titulo = String(post.titulo || 'Nueva publicación').trim()
  const tipoLabel = TIPO_LABEL[post.tipo] || 'Publicación'
  const href = `/muro/${post._id}`
  const url = postAppUrl(post._id)
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const bodyText =
    stripHtml(post.cuerpo).slice(0, 180) || `Nueva ${tipoLabel.toLowerCase()} en el muro.`

  let emailOk = 0
  let pushOk = 0
  let inAppOk = 0

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.findOneAndUpdate(
          {
            tenantId: post.tenantId,
            userId: u._id,
            kind: 'post_published',
            refId: post._id,
          },
          {
            $set: {
              title: `${tipoLabel}: ${titulo}`.slice(0, 160),
              body: bodyText,
              href,
              refType: 'post',
              readAt: null,
              dismissedAt: null,
            },
            $setOnInsert: {
              tenantId: post.tenantId,
              userId: u._id,
              kind: 'post_published',
              refId: post._id,
            },
          },
          { upsert: true, new: true },
        )
        inAppOk += 1
      } catch (err) {
        console.warn('[notify-post] in-app:', err?.message || err)
      }
    }),
  )

  const batchSize = 25
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (u) => {
        const nombre = displayName(u)
        if (u.email && u.notifPrefs?.email !== false) {
          try {
            const r = await emailService.sendPostPublishedEmail(u.email, {
              nombre,
              titulo,
              cuerpo: bodyText,
              postUrl: url,
              tipoLabel,
              brandName,
            })
            if (r?.success) emailOk += 1
          } catch (err) {
            console.warn('[notify-post] email:', err?.message || err)
          }
        }

        if (u.notifPrefs?.push !== false) {
          try {
            const r = await sendPushToUser(u._id, {
              title: `${brandName}: ${tipoLabel.toLowerCase()}`,
              body: titulo,
              url: href,
              kind: 'post_published',
              postId: String(post._id),
            })
            if (r?.sent) pushOk += r.sent
          } catch (err) {
            console.warn('[notify-post] push:', err?.message || err)
          }
        }
      }),
    )
  }

  console.log(
    `[notify-post] post=${post._id} users=${users.length} inApp=${inAppOk} email=${emailOk} push=${pushOk}`,
  )
  return { users: users.length, email: emailOk, push: pushOk, inApp: inAppOk }
}
