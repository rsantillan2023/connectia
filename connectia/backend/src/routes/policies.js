import { Router } from 'express'
import { Policy } from '../models/Policy.js'
import { requireAuth } from '../middleware/auth.js'
import {
  audienceFilterForUser,
  userMatchesAudience,
  serializeAudience,
} from '../lib/audience.js'
import {
  ackCoversVersion,
  deepLinkFor,
  helpSearchClause,
  validatePolicyAck,
} from '../lib/helpContent.js'
import { kbPayloadSummary } from '../services/kbIndex.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()

export function serializePolicy(p, userId = null, { includeBody = true } = {}) {
  const acks = Array.isArray(p.acks) ? p.acks : []
  const ackedByMe = userId ? ackCoversVersion(acks, userId, p.version) : false
  const pendingAck = Boolean(p.requiresAck) && p.status === 'published' && !ackedByMe
  return {
    id: String(p._id),
    codigo: p.codigo || '',
    titulo: p.titulo,
    resumen: p.resumen || '',
    cuerpo: includeBody ? p.cuerpo || '' : undefined,
    category: p.category || 'general',
    keywords: p.keywords || [],
    version: p.version || '1',
    status: p.status,
    requiresAck: Boolean(p.requiresAck),
    mandatory: Boolean(p.mandatory),
    audience: serializeAudience(p.audience),
    ackCount: acks.filter((a) => String(a.version) === String(p.version)).length,
    ackedByMe,
    pendingAck,
    authorName: p.authorName || '',
    publishedAt: p.publishedAt,
    href: deepLinkFor('policy', p._id),
    kb: kbPayloadSummary(p),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const pendingOnly = req.query.pending === '1' || req.query.pending === 'true'
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      $and: [audienceFilterForUser(req.user)],
    }
    if (category) filter.category = category
    const search = helpSearchClause(q, ['titulo', 'resumen', 'cuerpo', 'codigo', 'keywords', 'category'])
    if (search) filter.$and.push(search)

    const items = await Policy.find(filter).sort({ publishedAt: -1 }).lean()
    let serialized = items.map((p) => serializePolicy(p, req.user._id, { includeBody: false }))
    if (pendingOnly) {
      serialized = serialized.filter((p) => p.pendingAck)
    }
    const pendingCount = items.filter((p) => {
      const s = serializePolicy(p, req.user._id, { includeBody: false })
      return s.pendingAck
    }).length

    res.json({ items: serialized, pendingCount })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const p = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!p || p.status !== 'published' || !userMatchesAudience(req.user, p.audience)) {
      return res.status(404).json({ error: 'Política no encontrada' })
    }
    res.json({ policy: serializePolicy(p, req.user._id) })
  } catch (e) {
    next(e)
  }
})

/** Registrar que el usuario abrió el contenido (evidencia previa al acuse). */
router.post('/:id/open', requireAuth, async (req, res, next) => {
  try {
    const p = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p || p.status !== 'published' || !userMatchesAudience(req.user, p.audience)) {
      return res.status(404).json({ error: 'Política no encontrada' })
    }
    // No mutamos acks acá; el cliente manda opened=true al aceptar.
    // Devolvemos token de apertura con timestamp para UX.
    res.json({
      ok: true,
      openedAt: new Date().toISOString(),
      version: p.version,
      policy: serializePolicy(p.toObject(), req.user._id),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/ack', requireAuth, async (req, res, next) => {
  try {
    const p = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!p || p.status !== 'published' || !userMatchesAudience(req.user, p.audience)) {
      return res.status(404).json({ error: 'Política no encontrada' })
    }
    if (!p.requiresAck) {
      return res.status(400).json({ error: 'Esta política no requiere acuse' })
    }
    const already = ackCoversVersion(p.acks, req.user._id, p.version)
    const check = validatePolicyAck({
      opened: Boolean(req.body?.opened),
      version: req.body?.version || p.version,
      currentVersion: p.version,
      alreadyAcked: already,
    })
    if (!check.ok) return res.status(check.status).json({ error: check.error })

    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 80)
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 240)
    p.acks = p.acks || []
    p.acks.push({
      userId: req.user._id,
      version: p.version,
      acceptedAt: new Date(),
      openedAt: req.body?.openedAt ? new Date(req.body.openedAt) : new Date(),
      ip,
      userAgent,
    })
    // Cap historial por usuario+versión (conservar auditoría, limitar tamaño)
    if (p.acks.length > 5000) p.acks = p.acks.slice(-4000)
    await p.save()
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'policy_acked',
      entityId: `${p._id}:${p.version}`,
    })
    res.status(201).json({
      ok: true,
      policy: serializePolicy(p.toObject(), req.user._id),
    })
  } catch (e) {
    next(e)
  }
})

export default router
