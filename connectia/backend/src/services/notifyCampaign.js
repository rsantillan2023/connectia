import { sanitizeCampaignHref } from '../lib/pushCampaignPayload.js'
import { User } from '../models/User.js'
import { AppNotification } from '../models/AppNotification.js'
import { PushCampaign } from '../models/PushCampaign.js'
import { normalizeAudience, usersFilterForAudience } from '../lib/audience.js'
import { sendPushToUser } from './pushService.js'

function sanitizeHref(raw) {
  return sanitizeCampaignHref(raw)
}

export function serializeCampaign(c) {
  if (!c) return null
  const a = normalizeAudience(c.audience)
  return {
    id: String(c._id),
    name: c.name || '',
    title: c.title,
    body: c.body || '',
    href: c.href || '/',
    audience: a,
    segment: c.segment || 'audience',
    inactiveDays: c.inactiveDays ?? 30,
    sendType: c.sendType || 'now',
    scheduledAt: c.scheduledAt,
    status: c.status,
    channels: {
      inApp: c.channels?.inApp !== false,
      push: c.channels?.push !== false,
    },
    stats: {
      targeted: c.stats?.targeted || 0,
      inApp: c.stats?.inApp || 0,
      pushSent: c.stats?.pushSent || 0,
      pushFailed: c.stats?.pushFailed || 0,
    },
    errorMessage: c.errorMessage || '',
    createdBy: c.createdBy ? String(c.createdBy) : null,
    sentAt: c.sentAt,
    cancelledAt: c.cancelledAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

/** Usuarios destino de una campaña (audiencia + opcional inactivos). */
export async function resolveCampaignRecipients(tenantId, campaign) {
  const audience = normalizeAudience(campaign.audience)
  const filter = usersFilterForAudience(tenantId, audience)

  if (campaign.segment === 'inactive') {
    const days = Math.min(365, Math.max(1, Number(campaign.inactiveDays) || 30))
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { lastLoginAt: { $lt: cutoff } },
          { lastLoginAt: null, createdAt: { $lt: cutoff } },
        ],
      },
    ]
  }

  return User.find(filter)
    .select('_id email nombre apellido usuario notifPrefs pushSubscriptions lastLoginAt')
    .lean()
}

export async function previewCampaignAudience(tenantId, campaign) {
  const users = await resolveCampaignRecipients(tenantId, campaign)
  const withPush = users.filter((u) => Array.isArray(u.pushSubscriptions) && u.pushSubscriptions.length).length
  return {
    total: users.length,
    withPush,
    sample: users.slice(0, 5).map((u) => ({
      id: String(u._id),
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
    })),
  }
}

/**
 * Ejecuta una campaña: crea in-app + push.
 * Idempotente si ya está `sent`.
 */
export async function dispatchPushCampaign(campaignId, { tenant } = {}) {
  const campaign = await PushCampaign.findById(campaignId)
  if (!campaign) return { ok: false, error: 'Campañas no encontrada' }
  if (campaign.status === 'sent') {
    return { ok: true, alreadySent: true, stats: campaign.stats }
  }
  if (campaign.status === 'cancelled') {
    return { ok: false, error: 'Campañas cancelada' }
  }
  if (campaign.status === 'sending') {
    return { ok: false, error: 'Envío en curso' }
  }

  campaign.status = 'sending'
  campaign.errorMessage = ''
  await campaign.save()

  try {
    const users = await resolveCampaignRecipients(campaign.tenantId, campaign)
    const title = String(campaign.title || '').trim().slice(0, 120)
    const body = String(campaign.body || '').trim().slice(0, 500)
    const href = sanitizeHref(campaign.href)
    const wantInApp = campaign.channels?.inApp !== false
    const wantPush = campaign.channels?.push !== false

    let inAppOk = 0
    let pushSent = 0
    let pushFailed = 0

    if (wantInApp) {
      await Promise.all(
        users.map(async (u) => {
          try {
            await AppNotification.create({
              tenantId: campaign.tenantId,
              userId: u._id,
              kind: 'generic',
              title,
              body,
              href,
              refType: 'push_campaign',
              refId: campaign._id,
            })
            inAppOk += 1
          } catch (err) {
            console.warn('[push-campaign] in-app:', err?.message || err)
          }
        }),
      )
    }

    if (wantPush) {
      const batchSize = 25
      const brand = tenant?.nombre || process.env.BRAND_NAME || 'Connectia'
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (u) => {
            if (u.notifPrefs?.push === false) return
            try {
              const r = await sendPushToUser(u._id, {
                title,
                body: body.slice(0, 100),
                url: href,
                data: { href, campaignId: String(campaign._id), brand },
              })
              pushSent += r.sent || 0
              pushFailed += r.failed || 0
            } catch (err) {
              pushFailed += 1
              console.warn('[push-campaign] push:', err?.message || err)
            }
          }),
        )
      }
    }

    campaign.stats = {
      targeted: users.length,
      inApp: inAppOk,
      pushSent,
      pushFailed,
    }
    campaign.status = 'sent'
    campaign.sentAt = new Date()
    await campaign.save()

    return { ok: true, stats: campaign.stats }
  } catch (err) {
    campaign.status = 'failed'
    campaign.errorMessage = String(err?.message || err).slice(0, 400)
    await campaign.save()
    return { ok: false, error: campaign.errorMessage }
  }
}

/**
 * Asegura registros in-app de una campaña enviada.
 * - Si ya hay avisos vinculados: NO agrega destinatarios nuevos (la audiencia actual pudo crecer).
 * - Si no hay ninguno (seed viejo / envío incompleto): crea 1 por destinatario de la audiencia
 *   del momento, limitado a stats.targeted/inApp si estánían y son menores.
 */
export async function ensureCampaignInAppRecords(campaign) {
  if (!campaign?._id || !campaign.tenantId) return { created: 0, total: 0 }
  if (campaign.channels?.inApp === false) return { created: 0, total: 0 }
  if (!['sent', 'sending', 'failed'].includes(campaign.status)) {
    return { created: 0, total: 0 }
  }

  const existing = await AppNotification.find({
    tenantId: campaign.tenantId,
    refType: 'push_campaign',
    refId: campaign._id,
  })
    .select('_id userId createdAt')
    .sort({ createdAt: 1, _id: 1 })
    .lean()

  if (existing.length > 0) {
    const declared = Math.max(
      Number(campaign.stats?.targeted) || 0,
      Number(campaign.stats?.inApp) || 0,
    )
    // Si el backfill infló destinatarios respecto del envío declarado, recortar.
    if (declared > 0 && existing.length > declared) {
      const keep = new Set(existing.slice(0, declared).map((n) => String(n._id)))
      const removeIds = existing.filter((n) => !keep.has(String(n._id))).map((n) => n._id)
      if (removeIds.length) {
        await AppNotification.deleteMany({ _id: { $in: removeIds } })
      }
      await syncCampaignDeliveryStats(campaign._id, declared)
      return { created: 0, total: declared, trimmed: removeIds.length }
    }
    await syncCampaignDeliveryStats(campaign._id, existing.length)
    return { created: 0, total: existing.length }
  }

  let users = await resolveCampaignRecipients(campaign.tenantId, campaign)
  if (!users.length) return { created: 0, total: 0 }

  const intended = Math.max(
    Number(campaign.stats?.inApp) || 0,
    Number(campaign.stats?.targeted) || 0,
  )
  // Snapshot histórico: no inventar más destinatarios que los que la campaña declaró.
  if (intended > 0 && users.length > intended) {
    users = [...users]
      .sort((a, b) => String(a._id).localeCompare(String(b._id)))
      .slice(0, intended)
  }

  const title = String(campaign.title || '').trim().slice(0, 120) || 'Aviso'
  const body = String(campaign.body || '').trim().slice(0, 500)
  const href = sanitizeHref(campaign.href)
  const when = campaign.sentAt || campaign.createdAt || new Date()
  let created = 0

  await Promise.all(
    users.map(async (u) => {
      try {
        await AppNotification.create({
          tenantId: campaign.tenantId,
          userId: u._id,
          kind: 'generic',
          title,
          body,
          href,
          refType: 'push_campaign',
          refId: campaign._id,
          readAt: null,
          dismissedAt: null,
          createdAt: when,
          updatedAt: when,
        })
        created += 1
      } catch (err) {
        console.warn('[push-campaign] ensure in-app:', err?.message || err)
      }
    }),
  )

  await syncCampaignDeliveryStats(campaign._id, created)
  return { created, total: created }
}

async function syncCampaignDeliveryStats(campaignId, inAppTotal) {
  const n = Math.max(0, Number(inAppTotal) || 0)
  await PushCampaign.updateOne(
    { _id: campaignId },
    {
      $set: {
        'stats.targeted': n,
        'stats.inApp': n,
      },
    },
  )
}

/** Procesa campañas programadas vencidas (todos los tenants). */
export async function processDuePushCampaigns() {
  const now = new Date()
  const due = await PushCampaign.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  })
    .limit(20)
    .lean()

  const results = []
  for (const c of due) {
    results.push({ id: String(c._id), ...(await dispatchPushCampaign(c._id)) })
  }
  return results
}
