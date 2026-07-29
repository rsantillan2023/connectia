/**
 * Notifica a un usuario cuando RRHH le asigna onboarding / egreso.
 */
import { AppNotification } from '../models/AppNotification.js'
import { sendPushToUser } from './pushService.js'

export async function notifyOnboardingAssigned({
  tenantId,
  userId,
  instance,
  tenant,
}) {
  if (!tenantId || !userId || !instance?._id) return { inApp: false, push: false }

  const isOff = instance.kind === 'offboarding'
  const title = isOff ? 'Proceso de egreso' : 'Bienvenida — nuevos pasos'
  const body = isOff
    ? `Tenés un checklist de egreso: ${instance.templateName || 'proceso'}.`
    : `Tenés un proceso de bienvenida: ${instance.templateName || 'primeros pasos'}.`
  const href = '/bienvenida'

  let inApp = false
  try {
    await AppNotification.findOneAndUpdate(
      {
        tenantId,
        userId,
        kind: 'onboarding_assigned',
        refId: instance._id,
      },
      {
        $set: {
          title,
          body,
          href,
          refType: 'onboarding',
          readAt: null,
          dismissedAt: null,
        },
        $setOnInsert: {
          tenantId,
          userId,
          kind: 'onboarding_assigned',
          refId: instance._id,
        },
      },
      { upsert: true, new: true },
    )
    inApp = true
  } catch (err) {
    console.warn('[notify-onboarding] in-app:', err?.message || err)
  }

  let push = false
  try {
    const r = await sendPushToUser(userId, {
      title,
      body,
      url: href,
    })
    push = (r?.sent || 0) > 0
  } catch (err) {
    console.warn('[notify-onboarding] push:', err?.message || err)
  }

  void tenant
  return { inApp, push }
}
