import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Post } from '../models/Post.js'
import { Newsletter } from '../models/Newsletter.js'
import { emailService } from '../services/emailService.js'
import { aiConfigured as postsAiConfigured } from '../services/openaiPosts.js'
import {
  createNewsletterDraft,
  sendApprovedNewsletter,
  serializeNewsletter,
  buildNewsletterPdfBuffer,
  actorFromUser,
  pushAudit,
  buildNewsletterHtml,
  brandColors,
  absoluteUrl,
  feedUrl,
  recalcNewsletterTotals,
  addExternalRecipients,
  normalizeEmail,
} from '../services/newsletterService.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function parsePostIds(body) {
  const raw = Array.isArray(body?.postIds) ? body.postIds : Array.isArray(body?.ids) ? body.ids : []
  return [...new Set(raw.map((id) => String(id)).filter((id) => ObjectId.isValid(id)))]
}

async function loadPosts(tenantId, ids) {
  if (!ids.length) return []
  const objectIds = ids.map((id) => new ObjectId(id))
  const posts = await Post.find({
    tenantId,
    _id: { $in: objectIds },
    status: { $nin: ['archived', 'rejected'] },
  }).lean()
  const byId = new Map(posts.map((p) => [String(p._id), p]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

async function findNewsletter(req, id) {
  if (!ObjectId.isValid(id)) return null
  return Newsletter.findOne({ _id: id, tenantId: req.tenant._id })
}

/** Listado / auditoría de newsletters del tenant */
router.get('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (status) filter.status = status
    const items = await Newsletter.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 80, 200))
      .lean()
    res.json({
      newsletters: items.map((n) => serializeNewsletter(n)),
      mailConfigured: emailService.isConfigured,
      aiConfigured: postsAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/** Contadores rápidos para badge en UI */
router.get('/stats', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [pending_review, approved, sent, rejected] = await Promise.all([
      Newsletter.countDocuments({ tenantId, status: 'pending_review' }),
      Newsletter.countDocuments({ tenantId, status: 'approved' }),
      Newsletter.countDocuments({ tenantId, status: 'sent' }),
      Newsletter.countDocuments({ tenantId, status: 'rejected' }),
    ])
    res.json({ pending_review, approved, sent, rejected })
  } catch (e) {
    next(e)
  }
})

/**
 * Crea borrador en pending_review (NO envía).
 * Body: { postIds, subject? }
 */
router.post('/', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const ids = parsePostIds(req.body)
    if (!ids.length) {
      return res.status(400).json({ error: 'Seleccioná al menos una publicación' })
    }
    const posts = await loadPosts(req.tenant._id, ids)
    if (!posts.length) {
      return res.status(404).json({ error: 'No se encontraron publicaciones válidas' })
    }
    const doc = await createNewsletterDraft({
      tenant: req.tenant,
      posts,
      subject: req.body?.subject,
      user: req.user,
    })
    res.status(201).json({
      newsletter: serializeNewsletter(doc, { includeRecipients: true }),
      mailConfigured: emailService.isConfigured,
      aiConfigured: postsAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    res.json({
      newsletter: serializeNewsletter(doc, { includeRecipients: true }),
      mailConfigured: emailService.isConfigured,
      aiConfigured: postsAiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Editar asunto / resúmenes de variantes (solo pending_review o approved sin enviar).
 */
router.patch('/:id', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    if (!['pending_review', 'approved'].includes(doc.status)) {
      return res.status(400).json({ error: 'Solo se puede editar en revisión o aprobado (antes de enviar)' })
    }
    const body = req.body || {}
    const notes = []
    if (typeof body.subject === 'string' && body.subject.trim()) {
      doc.subject = body.subject.trim().slice(0, 200)
      notes.push('asunto')
    }
    if (Array.isArray(body.variants)) {
      for (const incoming of body.variants) {
        const fp = String(incoming?.fingerprint || '')
        if (!fp) continue
        const v = doc.variants.find((x) => x.fingerprint === fp)
        if (!v) continue
        if (typeof incoming.summary === 'string') {
          v.summary = incoming.summary.trim().slice(0, 2000)
          v.summaryAi = false
        }
      }
      notes.push('resúmenes')
    }
    if (Array.isArray(body.recipients)) {
      let changed = 0
      for (const incoming of body.recipients) {
        const uid = incoming?.userId != null && incoming.userId !== '' ? String(incoming.userId) : null
        const email = incoming?.email ? normalizeEmail(incoming.email) : ''
        const fp = incoming?.fingerprint != null ? String(incoming.fingerprint) : null
        if (!uid && !email) continue
        const matches = doc.recipients.filter((r) => {
          if (uid && String(r.userId || '') === uid) {
            if (fp != null && r.fingerprint !== fp) return false
            return true
          }
          if (email && normalizeEmail(r.email) === email) {
            if (fp != null && r.fingerprint !== fp) return false
            return true
          }
          return false
        })
        for (const r of matches) {
          if (typeof incoming.included === 'boolean' && r.included !== incoming.included) {
            r.included = incoming.included
            if (!incoming.included && r.deliveryStatus === 'pending') {
              r.deliveryStatus = 'skipped'
              r.error = 'Excluido por moderación'
            } else if (incoming.included && r.canEmail && r.deliveryStatus === 'skipped') {
              r.deliveryStatus = 'pending'
              r.error = ''
            }
            changed += 1
          }
        }
      }
      if (changed) {
        recalcNewsletterTotals(doc)
        notes.push(`destinatarios (${changed})`)
      }
    }
    if (Array.isArray(body.addEmails) && body.addEmails.length) {
      const { added, skipped } = await addExternalRecipients(doc, {
        emails: body.addEmails,
        tenant: req.tenant,
      })
      if (added) notes.push(`agregados ${added} externos`)
      if (skipped.length && !added) {
        // nada útil agregado
      }
      void skipped
    }
    if (Array.isArray(body.removeEmails) && body.removeEmails.length) {
      const toRemove = new Set(body.removeEmails.map(normalizeEmail).filter(Boolean))
      const before = doc.recipients.length
      doc.recipients = doc.recipients.filter((r) => {
        if (!r.isExternal) return true
        return !toRemove.has(normalizeEmail(r.email))
      })
      const removed = before - doc.recipients.length
      if (removed) {
        recalcNewsletterTotals(doc)
        notes.push(`quitados ${removed} externos`)
      }
    }
    // Si editan un aprobado, vuelve a revisión
    if (doc.status === 'approved' && notes.length) {
      doc.status = 'pending_review'
      doc.approvedBy = undefined
      notes.push('vuelve a revisión')
    }
    if (!notes.length) {
      return res.json({ newsletter: serializeNewsletter(doc, { includeRecipients: true }) })
    }
    pushAudit(doc, req.user, 'edited', notes.join(', '))
    await doc.save()
    res.json({ newsletter: serializeNewsletter(doc, { includeRecipients: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/approve', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    if (doc.status !== 'pending_review') {
      return res.status(400).json({ error: 'Solo se aprueban newsletters en revisión' })
    }
    recalcNewsletterTotals(doc)
    if (!(doc.totals?.emailable > 0)) {
      return res.status(400).json({ error: 'No hay destinatarios con email incluidos para enviar' })
    }
    const note = String(req.body?.note || '').trim().slice(0, 500)
    doc.status = 'approved'
    doc.approvedBy = { ...actorFromUser(req.user), note }
    doc.reviewedBy = { ...actorFromUser(req.user), note }
    doc.rejectionReason = ''
    pushAudit(doc, req.user, 'approved', note || 'Aprobado para envío')
    await doc.save()
    res.json({ newsletter: serializeNewsletter(doc, { includeRecipients: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/reject', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    if (!['pending_review', 'approved'].includes(doc.status)) {
      return res.status(400).json({ error: 'No se puede rechazar en este estado' })
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 500)
    if (!reason) return res.status(400).json({ error: 'Indicá el motivo del rechazo' })
    doc.status = 'rejected'
    doc.rejectionReason = reason
    doc.rejectedBy = { ...actorFromUser(req.user), note: reason }
    doc.reviewedBy = { ...actorFromUser(req.user), note: reason }
    pushAudit(doc, req.user, 'rejected', reason)
    await doc.save()
    res.json({ newsletter: serializeNewsletter(doc, { includeRecipients: true }) })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/cancel', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    if (!['pending_review', 'approved'].includes(doc.status)) {
      return res.status(400).json({ error: 'No se puede cancelar en este estado' })
    }
    const note = String(req.body?.note || 'Cancelado').trim().slice(0, 500)
    doc.status = 'cancelled'
    doc.cancelledBy = { ...actorFromUser(req.user), note }
    pushAudit(doc, req.user, 'cancelled', note)
    await doc.save()
    res.json({ newsletter: serializeNewsletter(doc, { includeRecipients: true }) })
  } catch (e) {
    next(e)
  }
})

/**
 * Envío real: SOLO si está aprobado.
 */
router.post('/:id/send', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    if (doc.status !== 'approved') {
      return res.status(400).json({
        error: 'El newsletter debe estar aprobado antes de enviarse',
        status: doc.status,
      })
    }

    const postIds = (doc.posts || []).map((p) => String(p.postId)).filter((id) => ObjectId.isValid(id))
    const livePosts = await loadPosts(req.tenant._id, postIds)
    const postsById = new Map(livePosts.map((p) => [String(p._id), p]))

    const result = await sendApprovedNewsletter({
      newsletter: doc,
      tenant: req.tenant,
      user: req.user,
      postsById,
    })
    const fresh = await Newsletter.findById(doc._id)
    res.json({
      ...result,
      newsletter: serializeNewsletter(fresh, { includeRecipients: true }),
    })
  } catch (e) {
    next(e)
  }
})

/** PDF de revisión / auditoría / enviados */
router.get('/:id/pdf', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    const brandName = req.tenant?.nombre || 'Connectia'
    const primary = req.tenant?.branding?.primary || '#0f766e'
    const posts = (doc.posts || []).map((p) => ({
      titulo: p.titulo,
      tipo: p.tipo,
      cuerpo: p.cuerpo,
    }))
    const summary =
      String(doc.variants?.[0]?.summary || '').trim() ||
      posts
        .map((p) => p.titulo)
        .filter(Boolean)
        .slice(0, 8)
        .join(' · ') ||
      'Newsletter interno'
    const pdfBuffer = await buildNewsletterPdfBuffer({
      brandName,
      subject: doc.subject || 'Newsletter',
      summary,
      posts,
      nombre:
        doc.status === 'sent'
          ? `Envío · ${(doc.totals?.emailed || 0).toLocaleString('es-AR')} destinatarios`
          : 'Revisión admin',
      primary,
    })
    const safeName = String(doc.subject || 'newsletter')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .toLowerCase() || 'newsletter'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-${doc._id}.pdf"`)
    res.send(pdfBuffer)
  } catch (e) {
    next(e)
  }
})

/** HTML de muestra de una variante (para preview en moderación) */
router.get('/:id/preview-html', requireAuth, requireCapability('admin.publicaciones'), async (req, res, next) => {
  try {
    const doc = await findNewsletter(req, req.params.id)
    if (!doc) return res.status(404).json({ error: 'Newsletter no encontrado' })
    const fp = String(req.query.fingerprint || doc.variants?.[0]?.fingerprint || '')
    const variant = (doc.variants || []).find((v) => v.fingerprint === fp) || doc.variants?.[0]
    if (!variant) return res.status(404).json({ error: 'Sin variantes' })
    const postIds = (variant.postIds || []).map(String)
    const posts = (doc.posts || [])
      .filter((p) => postIds.includes(String(p.postId)))
      .map((p) => ({
        titulo: p.titulo,
        tipo: p.tipo,
        cuerpo: p.cuerpo,
        imageUrl: p.imageUrl,
      }))
    const sample =
      (doc.recipients || []).find((r) => r.fingerprint === variant.fingerprint && r.canEmail) ||
      (doc.recipients || []).find((r) => r.fingerprint === variant.fingerprint)
    const { primary, secondary } = brandColors(req.tenant)
    const html = buildNewsletterHtml({
      nombre: sample?.nombre || 'Miembro',
      brandName: req.tenant?.nombre || 'Connectia',
      logoUrl: absoluteUrl(toPublicMediaUrl(req.tenant?.branding?.logoUrl || '')),
      primary,
      secondary,
      subject: doc.subject,
      summary: variant.summary,
      posts,
      appUrl: feedUrl(),
    })
    res.json({ html, fingerprint: variant.fingerprint, summary: variant.summary })
  } catch (e) {
    next(e)
  }
})

export default router
