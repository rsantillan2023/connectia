/**
 * Automatización de newsletters por regla (Ola 36-e).
 * Arma un newsletter con publicaciones recientes, lo aprueba y lo envía
 * reusando el flujo existente de newsletterService (misma auditoría / plantillas).
 */
import { NewsletterRule } from '../models/NewsletterRule.js'
import { Post } from '../models/Post.js'
import { Tenant } from '../models/Tenant.js'
import { selectPostsForRule, computeNextRunAt } from '../lib/newsletterAuto.js'
import {
  createNewsletterDraft,
  sendApprovedNewsletter,
  actorFromUser,
  pushAudit,
  recalcNewsletterTotals,
} from './newsletterService.js'

/** "Usuario" ficticio para auditoría de acciones automáticas. */
const SYSTEM_ACTOR = { nombre: 'Automatización', apellido: 'Newsletter', usuario: 'sistema' }

/**
 * Ejecuta una regla puntual: arma borrador, aprueba y envía si hay destinatarios con email.
 * @returns {Promise<{ ruleId: string, ok: boolean, newsletterId?: string, reason?: string }>}
 */
export async function runNewsletterRule(rule, now = new Date()) {
  const ruleId = String(rule._id)
  const tenant = await Tenant.findById(rule.tenantId)
  if (!tenant) return { ruleId, ok: false, reason: 'Tenant no encontrado' }

  const candidatePosts = await Post.find({ tenantId: rule.tenantId, status: 'published' })
    .sort({ pinned: -1, publishedAt: -1 })
    .limit(200)
    .lean()
  const selected = selectPostsForRule(candidatePosts, rule)
  if (!selected.length) {
    return { ruleId, ok: false, reason: 'No hay publicaciones que cumplan la regla' }
  }

  const subject = `${rule.nombre} · ${now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
  const doc = await createNewsletterDraft({
    tenant,
    posts: selected,
    subject,
    user: SYSTEM_ACTOR,
  })
  pushAudit(doc, SYSTEM_ACTOR, 'auto_created', `Regla "${rule.nombre}" · ${selected.length} pub(s)`)

  recalcNewsletterTotals(doc)
  if (!(doc.totals?.emailable > 0)) {
    pushAudit(doc, SYSTEM_ACTOR, 'auto_pending', 'Sin destinatarios con email; queda en revisión manual')
    await doc.save()
    return { ruleId, ok: false, newsletterId: String(doc._id), reason: 'Sin destinatarios con email' }
  }

  doc.status = 'approved'
  doc.approvedBy = { ...actorFromUser(SYSTEM_ACTOR), note: 'Aprobación automática (regla de newsletter)' }
  doc.reviewedBy = doc.approvedBy
  pushAudit(doc, SYSTEM_ACTOR, 'approved', 'Aprobación automática')
  await doc.save()

  const postsById = new Map(selected.map((p) => [String(p._id), p]))
  try {
    const sendResult = await sendApprovedNewsletter({
      newsletter: doc,
      tenant,
      user: SYSTEM_ACTOR,
      postsById,
    })
    return { ruleId, ok: true, newsletterId: String(doc._id), ...sendResult }
  } catch (e) {
    // Queda aprobado para envío manual (ej. mail no configurado).
    return { ruleId, ok: false, newsletterId: String(doc._id), reason: e.message }
  }
}

/**
 * Busca reglas habilitadas cuya `nextRunAt` ya venció, las ejecuta y reprograma.
 * @returns {Promise<Array>} resultados por regla ejecutada
 */
export async function processDueNewsletterRules(now = new Date()) {
  const due = await NewsletterRule.find({ enabled: true, nextRunAt: { $lte: now } }).limit(50)
  const results = []
  for (const rule of due) {
    let result
    try {
      result = await runNewsletterRule(rule, now)
    } catch (e) {
      result = { ruleId: String(rule._id), ok: false, reason: e.message }
    }
    results.push(result)
    rule.lastRunAt = now
    rule.nextRunAt = computeNextRunAt(rule, now)
    await rule.save()
  }
  return results
}
