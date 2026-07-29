import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'
import { usersFilterForAudience } from '../lib/audience.js'
import { emailService } from './emailService.js'
import { sendPushToUser } from './pushService.js'

function displayName(u) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || 'Usuario'
}

function eventAppUrl(eventId) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/agenda/${eventId}`
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatWhen(event, timezone) {
  try {
    const opts = {
      dateStyle: 'medium',
      timeStyle: event.allDay ? undefined : 'short',
      timeZone: timezone || 'America/Argentina/Buenos_Aires',
    }
    return new Intl.DateTimeFormat('es-AR', opts).format(new Date(event.inicio))
  } catch {
    return new Date(event.inicio).toISOString()
  }
}

/**
 * Notifica a la audiencia al publicar un evento (in-app + email + push).
 * Deep link: /agenda/:id
 */
export async function notifyEventPublished({ event, tenant }) {
  if (!event?._id || event.status !== 'published') {
    return { users: 0, email: 0, push: 0, inApp: 0 }
  }

  const users = await User.find(usersFilterForAudience(event.tenantId, event.audience))
    .select('_id email nombre apellido usuario notifPrefs pushSubscriptions')
    .lean()

  if (!users.length) return { users: 0, email: 0, push: 0, inApp: 0 }

  const titulo = String(event.titulo || 'Nuevo evento').trim()
  const href = `/agenda/${event._id}`
  const url = eventAppUrl(event._id)
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const when = formatWhen(event, tenant?.timezone)
  const bodyText =
    stripHtml(event.descripcion).slice(0, 160) ||
    `${when}${event.lugar ? ` · ${event.lugar}` : ''}`

  let emailOk = 0
  let pushOk = 0
  let inAppOk = 0

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.findOneAndUpdate(
          {
            tenantId: event.tenantId,
            userId: u._id,
            kind: 'event_published',
            refId: event._id,
          },
          {
            $set: {
              title: `Evento: ${titulo}`.slice(0, 160),
              body: bodyText,
              href,
              refType: 'event',
              readAt: null,
            },
            $setOnInsert: {
              tenantId: event.tenantId,
              userId: u._id,
              kind: 'event_published',
              refId: event._id,
            },
          },
          { upsert: true },
        )
        inAppOk += 1
      } catch {
        /* ignore */
      }

      const prefs = u.notifPrefs || {}
      if (u.email && prefs.email !== false) {
        try {
          const r = await emailService.sendGenericEmail?.(u.email, {
            subject: `Nuevo evento — ${titulo}`,
            text: `Hola ${displayName(u)},\n\nHay un nuevo evento en ${brandName}:\n${titulo}\n${when}\n${event.lugar || ''}\n\nVer: ${url}\n`,
            html: `<p>Hola ${displayName(u)},</p><p>Nuevo evento en <strong>${brandName}</strong>:</p><h2>${titulo}</h2><p>${when}${event.lugar ? `<br/>${event.lugar}` : ''}</p><p><a href="${url}">Ver en la agenda</a></p>`,
          })
          if (r?.success) emailOk += 1
          else if (!emailService.sendGenericEmail && emailService.isConfigured) {
            // fallback via transporter if generic helper missing
            const info = await emailService.transporter?.sendMail?.({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: u.email,
              subject: `Nuevo evento — ${titulo}`,
              text: `Hola ${displayName(u)}, nuevo evento: ${titulo} — ${url}`,
              html: `<p>Nuevo evento: <strong>${titulo}</strong></p><p><a href="${url}">Ver agenda</a></p>`,
            })
            if (info?.messageId) emailOk += 1
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const r = await sendPushToUser(u._id, {
          title: `Evento: ${titulo}`.slice(0, 80),
          body: bodyText.slice(0, 120),
          url: href,
          kind: 'event_published',
          eventId: String(event._id),
        })
        if (r?.sent > 0) pushOk += 1
      } catch {
        /* ignore */
      }
    }),
  )

  return { users: users.length, email: emailOk, push: pushOk, inApp: inAppOk }
}

/**
 * Email a confirmados (reporte admin).
 */
export async function emailEventConfirmados({ event, tenant, users, subject, message }) {
  const brandName = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
  const url = eventAppUrl(event._id)
  const subj = subject || `Recordatorio: ${event.titulo}`
  let ok = 0
  let fail = 0
  for (const u of users) {
    if (!u.email) {
      fail += 1
      continue
    }
    try {
      if (!emailService.isConfigured) {
        fail += 1
        continue
      }
      const info = await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: u.email,
        subject: subj,
        text: `${message || ''}\n\nEvento: ${event.titulo}\nVer: ${url}\n— ${brandName}`,
        html: `<p>${message || ''}</p><p><strong>${event.titulo}</strong></p><p><a href="${url}">Ver en la agenda</a></p><p class="muted">${brandName}</p>`,
      })
      if (info?.messageId) ok += 1
      else fail += 1
    } catch {
      fail += 1
    }
  }
  return { ok, fail }
}
