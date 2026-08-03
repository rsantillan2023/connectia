/**
 * Avisos de vencimiento de beneficios / canjes.
 */
import { AppNotification } from '../models/AppNotification.js'
import { User } from '../models/User.js'
import { sendPushToUser } from './pushService.js'

async function notifyOne({ tenantId, userId, title, body, href, benefitId }) {
  if (!tenantId || !userId) return
  let user = null
  try {
    user = await User.findOne({ _id: userId, tenantId, activo: true }).select('_id notifPrefs').lean()
  } catch {
    return
  }
  if (!user) return

  try {
    await AppNotification.create({
      tenantId,
      userId: user._id,
      kind: 'beneficio',
      title: String(title || 'Beneficio').slice(0, 160),
      body: String(body || '').slice(0, 500),
      href: href || '/beneficios',
      refType: 'beneficio',
      refId: benefitId || null,
    })
  } catch {
    /* ignore */
  }

  if (user.notifPrefs?.push !== false) {
    try {
      await sendPushToUser(user._id, {
        title: String(title || 'Beneficio').slice(0, 80),
        body: String(body || '').slice(0, 160),
        data: { href: href || '/beneficios' },
      })
    } catch {
      /* ignore */
    }
  }
}

/** Avisa a un usuario que un beneficio favorito/canjeado vence pronto. */
export async function notifyBenefitExpiring({ tenantId, userId, benefit }) {
  const titulo = benefit?.titulo || 'Beneficio'
  const hasta = benefit?.vigenciaHasta ? new Date(benefit.vigenciaHasta) : null
  const when = hasta
    ? hasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : 'pronto'
  await notifyOne({
    tenantId,
    userId,
    benefitId: benefit?._id || benefit?.id,
    title: 'Beneficio por vencer',
    body: `«${titulo}» vence el ${when}. Canjealo antes si te interesa.`,
    href: benefit?._id || benefit?.id ? `/beneficios/${benefit._id || benefit.id}` : '/beneficios',
  })
}

export async function notifyWaitlistAvailable({ tenantId, userId, benefit }) {
  const titulo = benefit?.titulo || 'Beneficio'
  await notifyOne({
    tenantId,
    userId,
    benefitId: benefit?._id || benefit?.id,
    title: 'Hay lugar en la lista',
    body: `Ya hay disponibilidad para «${titulo}». Entrá a Beneficios para canjear.`,
    href: benefit?._id || benefit?.id ? `/beneficios/${benefit._id || benefit.id}` : '/beneficios',
  })
}
