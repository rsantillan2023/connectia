import { AppNotification } from '../models/AppNotification.js'
import { PushCampaign } from '../models/PushCampaign.js'

/**
 * Semilla de avisos in-app + campañas admin (§7) para un tenant.
 */
export async function seedNotificationsForTenant({
  tenant,
  members = [],
  adminUser = null,
  survey = null,
  post = null,
  brand = 'Connectia',
}) {
  if (!tenant?._id) return { inApp: 0, campaigns: 0 }

  const recipients = members.filter(Boolean)
  let inApp = 0

  if (survey?._id) {
    for (const u of recipients) {
      await AppNotification.findOneAndUpdate(
        { tenantId: tenant._id, userId: u._id, kind: 'survey_pending', refId: survey._id },
        {
          tenantId: tenant._id,
          userId: u._id,
          kind: 'survey_pending',
          title: `Encuesta pendiente: ${String(survey.titulo || 'Encuesta').slice(0, 80)}`,
          body: 'Todavía no respondiste. Tocá para completar.',
          href: `/encuestas/${survey._id}`,
          refType: 'survey',
          refId: survey._id,
          readAt: null,
          dismissedAt: null,
        },
        { upsert: true },
      )
      inApp += 1
    }
  }

  if (post?._id) {
    for (const u of recipients.slice(0, 3)) {
      await AppNotification.findOneAndUpdate(
        { tenantId: tenant._id, userId: u._id, kind: 'post_published', refId: post._id },
        {
          tenantId: tenant._id,
          userId: u._id,
          kind: 'post_published',
          title: `Novedad: ${String(post.titulo || 'Publicación').slice(0, 100)}`,
          body: 'Hay una publicación nueva en el muro.',
          href: `/muro/${post._id}`,
          refType: 'post',
          refId: post._id,
          readAt: null,
          dismissedAt: null,
        },
        { upsert: true },
      )
      inApp += 1
    }
  }

  const genericSeeds = [
    {
      key: 'bienvenida',
      title: `Bienvenida a ${brand}`,
      body: 'Activá las notificaciones para no perderte avisos, encuestas y novedades.',
      href: '/avisos',
    },
    {
      key: 'perfil',
      title: 'Completá tu perfil',
      body: 'Sumá foto y teléfono para que tu equipo te reconozca.',
      href: '/perfil',
    },
    {
      key: 'adopcion',
      title: '¿Hace tiempo que no entrás?',
      body: 'Mirales el muro: hay novedades de la comunidad esperándote.',
      href: '/muro',
    },
  ]

  for (const u of recipients) {
    for (const g of genericSeeds) {
      await AppNotification.findOneAndUpdate(
        { tenantId: tenant._id, userId: u._id, kind: 'generic', title: g.title },
        {
          tenantId: tenant._id,
          userId: u._id,
          kind: 'generic',
          title: g.title,
          body: g.body,
          href: g.href,
          refType: 'seed',
          refId: null,
          // Una leída de ejemplo en el primer usuario
          readAt: u === recipients[0] && g.key === 'bienvenida' ? new Date(Date.now() - 86400000) : null,
          dismissedAt: null,
        },
        { upsert: true },
      )
      inApp += 1
    }
  }

  const campaigns = [
    {
      name: 'Seed · bienvenida enviada',
      title: `Hola, somos ${brand}`,
      body: 'Este es un aviso de ejemplo ya enviado. Revisá el muro.',
      href: '/muro',
      status: 'sent',
      sendType: 'now',
      segment: 'audience',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      stats: {
        targeted: recipients.length || 1,
        inApp: recipients.length || 1,
        pushSent: 0,
        pushFailed: 0,
      },
      sentAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      name: 'Seed · inactivos programada',
      title: 'Te extrañamos en la app',
      body: 'Hay novedades y encuestas pendientes. Entrá cuando puedas.',
      href: '/avisos',
      status: 'scheduled',
      sendType: 'scheduled',
      scheduledAt: new Date(Date.now() + 3 * 86400000),
      segment: 'inactive',
      inactiveDays: 30,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    },
    {
      name: 'Seed · borrador RRHH',
      title: 'Recordatorio de documentación',
      body: 'Revisá Mis documentos y cargá lo pendiente.',
      href: '/docs',
      status: 'draft',
      sendType: 'now',
      segment: 'audience',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
    },
  ]

  let campaignsN = 0
  for (const c of campaigns) {
    const doc = await PushCampaign.findOneAndUpdate(
      { tenantId: tenant._id, name: c.name },
      {
        tenantId: tenant._id,
        name: c.name,
        title: c.title,
        body: c.body,
        href: c.href,
        audience: c.audience,
        segment: c.segment || 'audience',
        inactiveDays: c.inactiveDays ?? 30,
        sendType: c.sendType,
        scheduledAt: c.scheduledAt || null,
        status: c.status,
        channels: { inApp: true, push: true },
        stats: c.stats || { targeted: 0, inApp: 0, pushSent: 0, pushFailed: 0 },
        createdBy: adminUser?._id || null,
        sentAt: c.sentAt || null,
        errorMessage: '',
      },
      { upsert: true, new: true },
    )
    campaignsN += 1

    // Campaña "enviada" de ejemplo: 1 aviso in-app por destinatario (para reporte de lecturas).
    if (c.status === 'sent' && doc?._id) {
      const when = c.sentAt || new Date()
      for (let i = 0; i < recipients.length; i += 1) {
        const u = recipients[i]
        await AppNotification.findOneAndUpdate(
          {
            tenantId: tenant._id,
            userId: u._id,
            refType: 'push_campaign',
            refId: doc._id,
          },
          {
            tenantId: tenant._id,
            userId: u._id,
            kind: 'generic',
            title: c.title,
            body: c.body,
            href: c.href || '/muro',
            refType: 'push_campaign',
            refId: doc._id,
            // Primer destinatario ya leído (demo del reporte)
            readAt: i === 0 ? new Date(when.getTime() + 3600_000) : null,
            dismissedAt: null,
            createdAt: when,
            updatedAt: when,
          },
          { upsert: true },
        )
        inApp += 1
      }
    }
  }

  return { inApp, campaigns: campaignsN }
}
