import webpush from 'web-push'
import { User } from '../models/User.js'

let vapidPublic = process.env.VAPID_PUBLIC_KEY || ''
let vapidPrivate = process.env.VAPID_PRIVATE_KEY || ''
let configured = false

function ensureVapid() {
  if (configured) return Boolean(vapidPublic && vapidPrivate)
  if (!vapidPublic || !vapidPrivate) {
    const keys = webpush.generateVAPIDKeys()
    vapidPublic = keys.publicKey
    vapidPrivate = keys.privateKey
    console.warn(
      '[push] VAPID no configurado en .env — claves efímeras de desarrollo generadas. Definí VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY para producción.',
    )
    console.warn(`[push] VAPID_PUBLIC_KEY=${vapidPublic}`)
    console.warn(`[push] VAPID_PRIVATE_KEY=${vapidPrivate}`)
  }
  const subject = process.env.VAPID_SUBJECT || process.env.EMAIL_FROM || 'mailto:noreply@connectia.local'
  webpush.setVapidDetails(subject.startsWith('mailto:') ? subject : `mailto:${subject}`, vapidPublic, vapidPrivate)
  configured = true
  return true
}

export function getVapidPublicKey() {
  ensureVapid()
  return vapidPublic
}

export function isPushConfigured() {
  return ensureVapid()
}

/**
 * Envía push a un usuario (todas sus suscripciones).
 * Limpia endpoints muertos (410/404).
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) return { sent: 0, failed: 0 }
  const user = await User.findById(userId).select('pushSubscriptions notifPrefs')
  if (!user) return { sent: 0, failed: 0 }
  if (user.notifPrefs?.push === false) return { sent: 0, failed: 0, skipped: true }

  const subs = Array.isArray(user.pushSubscriptions) ? [...user.pushSubscriptions] : []
  if (!subs.length) return { sent: 0, failed: 0 }

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  let sent = 0
  let failed = 0
  const dead = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
          },
          body,
          { TTL: 60 * 60 * 12 },
        )
        sent += 1
      } catch (err) {
        failed += 1
        const code = err?.statusCode || err?.status
        if (code === 404 || code === 410) dead.push(sub.endpoint)
        else console.warn('[push] send error:', err?.message || err)
      }
    }),
  )

  if (dead.length) {
    user.pushSubscriptions = user.pushSubscriptions.filter((s) => !dead.includes(s.endpoint))
    await user.save()
  }

  return { sent, failed }
}

export async function sendPushToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))]
  let sent = 0
  let failed = 0
  for (const id of ids) {
    const r = await sendPushToUser(id, payload)
    sent += r.sent || 0
    failed += r.failed || 0
  }
  return { sent, failed, users: ids.length }
}
