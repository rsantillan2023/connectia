import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'
import { emailService } from './emailService.js'
import { sendPushToUser } from './pushService.js'

function displayName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function mineUrl() {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/muro/mias`
}

/**
 * Avisa al autor UGC que su publicación fue rechazada (in-app + email + push).
 * Fire-and-forget desde el endpoint de reject.
 */
export async function notifyUgcRejected({ post, tenant, reason }) {
  if (!post?.authorId) return { email: 0, push: 0, inApp: 0, skipped: true }

  const user = await User.findOne({
    _id: post.authorId,
    tenantId: post.tenantId,
    activo: true,
  })
    .select('_id email nombre apellido usuario notifPrefs')
    .lean()

  if (!user) return { email: 0, push: 0, inApp: 0, skipped: true }

  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const titulo = String(post.titulo || 'Tu publicación').trim()
  const motivo = String(reason || '').trim() || 'No cumple las políticas del muro corporativo.'
  const href = '/muro/mias'
  const url = mineUrl()
  const bodyText = `«${titulo}» no fue publicada. Motivo: ${motivo}`.slice(0, 500)

  let inApp = 0
  let email = 0
  let push = 0

  try {
    await AppNotification.create({
      tenantId: post.tenantId,
      userId: user._id,
      kind: 'ugc_rejected',
      title: 'Publicación no aprobada',
      body: bodyText,
      href,
      refType: 'post',
      refId: post._id,
    })
    inApp = 1
  } catch (err) {
    console.warn('[notify-ugc-reject] in-app:', err?.message || err)
  }

  const nombre = displayName(user)
  if (user.email && user.notifPrefs?.email !== false) {
    try {
      const r = await emailService.sendUgcRejectedEmail(user.email, {
        nombre,
        titulo,
        reason: motivo,
        mineUrl: url,
        brandName,
      })
      if (r?.success) email = 1
    } catch (err) {
      console.warn('[notify-ugc-reject] email:', err?.message || err)
    }
  }

  if (user.notifPrefs?.push !== false) {
    try {
      const r = await sendPushToUser(user._id, {
        title: `${brandName}: publicación no aprobada`,
        body: bodyText.slice(0, 120),
        url: href,
        kind: 'ugc_rejected',
        postId: String(post._id),
      })
      if (r?.sent) push = r.sent
    } catch (err) {
      console.warn('[notify-ugc-reject] push:', err?.message || err)
    }
  }

  console.log(
    `[notify-ugc-reject] post=${post._id} user=${user._id} inApp=${inApp} email=${email} push=${push}`,
  )
  return { email, push, inApp }
}
