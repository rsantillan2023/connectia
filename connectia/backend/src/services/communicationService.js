import crypto from 'crypto'
import { Communication } from '../models/Communication.js'
import { CommunicationTemplate } from '../models/CommunicationTemplate.js'
import { User } from '../models/User.js'
import { emailService } from './emailService.js'
import { smsService } from './smsService.js'
import { whatsappService } from './whatsappService.js'
import {
  renderTemplate,
  buildPlaceholderData,
  buildIdempotencyKey,
  sanitizeErrorMessage,
  normalizePhoneE164,
} from '../lib/communicationTemplates.js'

function brandName(tenant) {
  return String(tenant?.branding?.nombre || tenant?.nombre || process.env.BRAND_NAME || 'Connectia').trim()
}

function textToHtml(text) {
  const esc = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${esc.replace(/\n/g, '<br/>')}</p>`
}

/**
 * Preview render sin enviar.
 */
export function previewCommunication({ template, user, tenant }) {
  const data = buildPlaceholderData(user, { brandName: brandName(tenant) })
  return {
    subject: renderTemplate(template.subject || '', data),
    body: renderTemplate(template.body || '', data),
    placeholders: data,
  }
}

async function deliverChannel({ channel, recipient, subject, body, brand, attachmentUrls }) {
  if (channel === 'email') {
    if (!emailService.isConfigured) {
      if (process.env.COM_EMAIL_DEV_LOG === '1' || process.env.NODE_ENV !== 'production') {
        console.log(`[com-email] DEV fallback to=${recipient} subject=${subject}`)
        return { success: true, devFallback: true, providerId: `dev-mail-${Date.now()}` }
      }
      return { success: false, reason: 'Mail not configured' }
    }
    const r = await emailService.sendGenericEmail(recipient, {
      subject,
      text: body,
      html: textToHtml(body),
      brandName: brand,
    })
    if (attachmentUrls?.length) {
      r.note = 'Adjuntos referenciados en cuerpo/meta; SMTP attachments pendientes de firma'
    }
    return {
      success: Boolean(r.success),
      providerId: r.messageId || '',
      error: r.error || r.reason,
      devFallback: r.devFallback,
    }
  }

  if (channel === 'sms') {
    const r = await smsService.sendSms(recipient, body.slice(0, 480))
    return {
      success: Boolean(r.success),
      providerId: r.sid || '',
      error: r.error || r.reason,
      devFallback: r.devFallback,
    }
  }

  if (channel === 'whatsapp') {
    const r = await whatsappService.sendMessage(recipient, { body })
    return {
      success: Boolean(r.success),
      providerId: r.providerId || '',
      error: r.error || r.reason,
      devFallback: r.devFallback,
    }
  }

  return { success: false, reason: `Canal ${channel} no soportado` }
}

function resolveRecipient(user, channel) {
  if (channel === 'email') return String(user.email || '').trim().toLowerCase()
  const phone = normalizePhoneE164(user.telefono)
  return phone
}

/**
 * Envío masivo a usuarios del tenant.
 * @returns {{ batchId: string, results: object[], summary: object }}
 */
export async function sendBulkCommunications({
  tenant,
  actor,
  communicationType,
  channel,
  templateId,
  userIds,
  attachmentUrls = [],
  extraVariables = {},
}) {
  if (!['email', 'whatsapp', 'sms'].includes(channel)) {
    throw Object.assign(new Error('Canal inválido'), { status: 400 })
  }
  const template = await CommunicationTemplate.findOne({
    _id: templateId,
    tenantId: tenant._id,
    activo: { $ne: false },
  })
  if (!template) {
    throw Object.assign(new Error('Plantilla no encontrada'), { status: 404 })
  }
  if (template.channel !== channel) {
    throw Object.assign(new Error('La plantilla no coincide con el canal'), { status: 400 })
  }
  if (template.communicationType !== communicationType) {
    throw Object.assign(new Error('La plantilla no coincide con el tipo'), { status: 400 })
  }

  const ids = [...new Set((userIds || []).map(String))].filter(Boolean).slice(0, 500)
  if (!ids.length) {
    throw Object.assign(new Error('Seleccioná al menos un destinatario'), { status: 400 })
  }

  const users = await User.find({
    tenantId: tenant._id,
    _id: { $in: ids },
    activo: { $ne: false },
  }).lean()

  const batchId = crypto.randomUUID()
  const brand = brandName(tenant)
  const correlationId = `com-${batchId}`
  const results = []
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const user of users) {
    const recipient = resolveRecipient(user, channel)
    if (!recipient) {
      skipped += 1
      results.push({
        userId: String(user._id),
        status: 'failed',
        error: channel === 'email' ? 'Sin email' : 'Sin teléfono',
      })
      continue
    }

    const data = {
      ...buildPlaceholderData(user, { brandName: brand }),
      ...extraVariables,
    }
    const renderedSubject = renderTemplate(template.subject || '', data)
    const renderedBody = renderTemplate(template.body || '', data)
    const idempotencyKey = buildIdempotencyKey({
      tenantId: String(tenant._id),
      channel,
      recipient,
      templateId: String(template._id),
      batchId,
      userId: String(user._id),
    })

    const existing = await Communication.findOne({ tenantId: tenant._id, idempotencyKey }).lean()
    if (existing) {
      skipped += 1
      results.push({
        userId: String(user._id),
        status: existing.status,
        communicationId: String(existing._id),
        deduped: true,
      })
      continue
    }

    let doc
    try {
      doc = await Communication.create({
        tenantId: tenant._id,
        userId: user._id,
        templateId: template._id,
        communicationType,
        channel,
        recipient,
        recipientName: data.nombreCompleto,
        renderedSubject,
        renderedBody,
        attachmentUrls: (attachmentUrls || []).slice(0, 10),
        status: 'pending',
        idempotencyKey,
        sentBy: actor?.email || actor?.usuario || '',
        sentByUserId: actor?._id,
        correlationId,
      })
    } catch (e) {
      if (e?.code === 11000) {
        skipped += 1
        results.push({ userId: String(user._id), status: 'pending', deduped: true })
        continue
      }
      throw e
    }

    const delivery = await deliverChannel({
      channel,
      recipient,
      subject: renderedSubject || brand,
      body: renderedBody,
      brand,
      attachmentUrls,
    })

    if (delivery.success) {
      sent += 1
      doc.status = 'sent'
      doc.providerId = delivery.providerId || ''
      doc.sentAt = new Date()
      doc.errorMessage = ''
      if (delivery.devFallback) doc.meta = { ...(doc.meta || {}), devFallback: true }
      await doc.save()
      results.push({
        userId: String(user._id),
        status: 'sent',
        communicationId: String(doc._id),
        devFallback: Boolean(delivery.devFallback),
      })
    } else {
      failed += 1
      doc.status = 'failed'
      doc.errorMessage = sanitizeErrorMessage(delivery.error || delivery.reason || 'Error de envío')
      await doc.save()
      results.push({
        userId: String(user._id),
        status: 'failed',
        communicationId: String(doc._id),
        error: doc.errorMessage,
      })
    }
  }

  return {
    batchId,
    summary: { sent, failed, skipped, total: users.length },
    results,
    channels: {
      email: emailService.isConfigured,
      sms: smsService.isConfigured,
      whatsapp: whatsappService.isConfigured,
    },
  }
}

export function serializeCommunication(doc) {
  const d = doc?.toObject ? doc.toObject() : doc
  return {
    id: String(d._id),
    communicationType: d.communicationType,
    channel: d.channel,
    recipient: d.recipient,
    recipientName: d.recipientName,
    subject: d.renderedSubject,
    body: d.renderedBody,
    status: d.status,
    errorMessage: d.errorMessage || '',
    providerId: d.providerId || '',
    attachmentUrls: d.attachmentUrls || [],
    sentBy: d.sentBy || '',
    sentAt: d.sentAt,
    createdAt: d.createdAt,
    correlationId: d.correlationId || '',
    userId: d.userId ? String(d.userId) : null,
    templateId: d.templateId ? String(d.templateId) : null,
  }
}

export function channelHealth() {
  return {
    email: {
      configured: emailService.isConfigured,
      provider: 'nodemailer/gmail',
    },
    whatsapp: {
      configured: whatsappService.isConfigured,
      provider: 'meta-cloud-api',
    },
    sms: {
      configured: smsService.isConfigured,
      provider: 'twilio',
    },
  }
}
