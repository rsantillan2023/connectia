import { PointsRule, POINTS_EVENTS, POINTS_EVENT_LABELS } from '../models/PointsRule.js'
import { WalletTransaction } from '../models/Wallet.js'
import { postLedgerEntry, tenantHasWallet } from './walletService.js'

export { POINTS_EVENTS, POINTS_EVENT_LABELS }

/** Defaults sugeridos al sembrar reglas de puntos por uso de app. */
export const DEFAULT_POINTS_RULES = [
  // Comunidad
  { event: 'post_created', points: 20, dailyCap: 5 },
  { event: 'post_reaction_given', points: 2, dailyCap: 30 },
  { event: 'comment_created', points: 5, dailyCap: 20 },
  { event: 'post_saved', points: 1, dailyCap: 15 },
  { event: 'post_shared', points: 5, dailyCap: 10 },
  { event: 'story_viewed', points: 1, dailyCap: 20 },
  // Cultura
  { event: 'recognition_received', points: 15, dailyCap: 20 },
  { event: 'recognition_sent', points: 10, dailyCap: 10 },
  { event: 'pulse_responded', points: 15, dailyCap: 5 },
  { event: 'marketplace_listing_created', points: 10, dailyCap: 5 },
  { event: 'referral_created', points: 25, dailyCap: 5 },
  // Encuestas / onboarding
  { event: 'survey_completed', points: 25, dailyCap: 10 },
  { event: 'onboarding_milestone', points: 20, dailyCap: 10 },
  // Servicios / pedidos / solicitudes
  { event: 'service_request_created', points: 8, dailyCap: 10 },
  { event: 'service_feedback_given', points: 10, dailyCap: 10 },
  { event: 'pedido_created', points: 8, dailyCap: 10 },
  { event: 'request_created', points: 10, dailyCap: 10 },
  // Espacios / asistencia / ausencias
  { event: 'space_reservation_created', points: 5, dailyCap: 10 },
  { event: 'space_checkin', points: 8, dailyCap: 6 },
  { event: 'attendance_punch', points: 5, dailyCap: 6 },
  { event: 'ausencia_requested', points: 5, dailyCap: 5 },
  { event: 'licencia_requested', points: 5, dailyCap: 5 },
  // Agenda / aprobaciones / perfil
  { event: 'event_rsvp_confirmed', points: 10, dailyCap: 10 },
  { event: 'approval_decided', points: 8, dailyCap: 30 },
  { event: 'profile_updated', points: 5, dailyCap: 1 },
  // Campo / docs / políticas / desarrollo
  { event: 'relevamiento_submitted', points: 30, dailyCap: 15 },
  { event: 'document_signed', points: 15, dailyCap: 10 },
  { event: 'policy_acked', points: 10, dailyCap: 10 },
  { event: 'course_completed', points: 40, dailyCap: 5 },
  { event: 'vacancy_applied', points: 15, dailyCap: 5 },
]

export function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function buildPointsIdempotencyKey(event, userId, entityId) {
  return `points:${event}:${String(userId)}:${String(entityId)}`
}

export function serializePointsRule(doc) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  const event = o.event
  return {
    id: String(o._id),
    event,
    eventLabel: POINTS_EVENT_LABELS[event] || event,
    label: o.label || POINTS_EVENT_LABELS[event] || event,
    points: Number(o.points) || 0,
    dailyCap: o.dailyCap == null ? null : Number(o.dailyCap),
    enabled: o.enabled !== false,
    updatedAt: o.updatedAt || null,
  }
}

/**
 * Asegura las reglas base (no pisa puntos/caps ya editados).
 */
export async function ensureDefaultPointsRules(tenantId, { createdBy = null } = {}) {
  let created = 0
  let skipped = 0
  for (const def of DEFAULT_POINTS_RULES) {
    const existing = await PointsRule.findOne({ tenantId, event: def.event })
    if (existing) {
      skipped += 1
      continue
    }
    await PointsRule.create({
      tenantId,
      event: def.event,
      label: POINTS_EVENT_LABELS[def.event] || def.event,
      points: def.points,
      dailyCap: def.dailyCap,
      enabled: true,
      createdBy,
    })
    created += 1
  }
  return { created, skipped }
}

/**
 * Acredita puntos si hay regla activa, billetera y no se superó el tope diario.
 * Idempotente por (event, userId, entityId).
 * @returns {Promise<object|null>} resultado ledger o null si no aplica
 */
export async function awardPointsForEvent({
  tenant,
  userId,
  event,
  entityId,
  meta = {},
}) {
  if (!tenant?._id || !userId || !entityId) return null
  if (!POINTS_EVENTS.includes(event)) return null
  if (!tenantHasWallet(tenant)) return null

  const rule = await PointsRule.findOne({
    tenantId: tenant._id,
    event,
    enabled: true,
  })
  if (!rule || !(Number(rule.points) > 0)) return null

  if (rule.dailyCap != null && Number(rule.dailyCap) >= 0) {
    const since = startOfUtcDay()
    const todayCount = await WalletTransaction.countDocuments({
      tenantId: tenant._id,
      userId,
      type: 'credit',
      status: 'confirmed',
      'meta.event': event,
      createdAt: { $gte: since },
    })
    if (todayCount >= Number(rule.dailyCap)) return null
  }

  const idempotencyKey = buildPointsIdempotencyKey(event, userId, entityId)
  const concept =
    String(rule.label || POINTS_EVENT_LABELS[event] || `Puntos por ${event}`).slice(0, 240)

  try {
    return await postLedgerEntry({
      tenantId: tenant._id,
      userId,
      type: 'credit',
      amount: Number(rule.points),
      concept,
      idempotencyKey,
      meta: {
        event,
        entityId: String(entityId),
        ruleId: String(rule._id),
        source: 'points_rule',
        ...meta,
      },
    })
  } catch (err) {
    // Duplicate key race → re-leer como replay
    if (err?.code === 11000) {
      return null
    }
    throw err
  }
}

/** Fire-and-forget para no bloquear la respuesta HTTP. */
export function scheduleAwardPoints(args) {
  setImmediate(() => {
    awardPointsForEvent(args).catch((err) => {
      console.warn('[points-rules]', err?.message || err)
    })
  })
}
