import { Router } from 'express'
import mongoose from 'mongoose'
import { Policy } from '../models/Policy.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, usersFilterForAudience } from '../lib/audience.js'
import {
  bumpPolicyVersion,
  complianceStats,
  normalizeHelpStatus,
  normalizeKeywords,
} from '../lib/helpContent.js'
import { syncKbSource } from '../services/kbIndex.js'
import { aiConfigured, generateHelpDraft } from '../services/helpAi.js'
import { serializePolicy } from './policies.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const cap = 'admin.politicas'

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, groups, users] = await Promise.all([
    a.mode === 'restricted' && areaIds.length
      ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id')
      : [],
    a.mode === 'restricted' && groupIds.length
      ? UserGroup.find({ tenantId, _id: { $in: groupIds }, activo: true }).select('_id')
      : [],
    userIds.length ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id') : [],
  ])
  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

function authorName(user) {
  return [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario
}

function currentVersionAcks(p) {
  const ver = String(p.version || '1')
  return (p.acks || []).filter((a) => String(a.version) === ver)
}

router.get('/meta', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').sort({ orden: 1, nombre: 1 }).lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').sort({ nombre: 1 }).lean(),
    ])
    res.json({
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
      groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
      statuses: ['draft', 'published', 'archived'],
      aiConfigured: aiConfigured(),
    })
  } catch (e) {
    next(e)
  }
})

/**
 * Genera borrador de política desde un brief.
 * Body: { prompt, provider? }
 */
router.post('/generate', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const body = req.body || {}
    const result = await generateHelpDraft({
      kind: 'policy',
      prompt: body.prompt,
      tenant: req.tenant,
      provider: body.provider || 'auto',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = { tenantId: req.tenant._id }
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const items = await Policy.find(filter).sort({ updatedAt: -1 }).lean()
    const [areas, groups] = await Promise.all([
      OrgArea.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
      UserGroup.find({ tenantId: req.tenant._id, activo: true }).select('_id nombre').lean(),
    ])

    const withCompliance = await Promise.all(
      items.map(async (p) => {
        const invited = await User.countDocuments(usersFilterForAudience(req.tenant._id, p.audience))
        const acked = currentVersionAcks(p).length
        return {
          ...serializePolicy(p, null),
          compliance: complianceStats({ invited, acked }),
        }
      }),
    )

    res.json({
      items: withCompliance,
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
      groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    const cuerpo = String(body.cuerpo || '').trim().slice(0, 100000)
    if (!titulo || !cuerpo) {
      return res.status(400).json({ error: 'Título y cuerpo son requeridos' })
    }
    const status = normalizeHelpStatus(body.status, 'draft')
    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const doc = new Policy({
      tenantId: req.tenant._id,
      codigo: String(body.codigo || '').trim().slice(0, 40),
      titulo,
      resumen: String(body.resumen || '').trim().slice(0, 1000),
      cuerpo,
      category: String(body.category || 'general').trim().slice(0, 80) || 'general',
      keywords: normalizeKeywords(body.keywords),
      version: String(body.version || '1').trim().slice(0, 40) || '1',
      status,
      requiresAck: body.requiresAck !== false,
      mandatory: Boolean(body.mandatory),
      audience,
      acks: [],
      authorId: req.user._id,
      authorName: authorName(req.user),
      publishedAt: status === 'published' ? new Date() : null,
    })
    await syncKbSource('policy', doc)
    await doc.save()
    res.status(201).json({ policy: serializePolicy(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Política no encontrada' })
    const body = req.body || {}
    const bumpVersion = body.bumpVersion === true || body.newVersion === true
    const cuerpoChanged = body.cuerpo != null && String(body.cuerpo).trim() !== String(doc.cuerpo || '')

    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 200)
    if (body.cuerpo != null) doc.cuerpo = String(body.cuerpo).trim().slice(0, 100000)
    if (!doc.titulo || !doc.cuerpo) {
      return res.status(400).json({ error: 'Título y cuerpo son requeridos' })
    }
    if (body.codigo != null) doc.codigo = String(body.codigo).trim().slice(0, 40)
    if (body.resumen != null) doc.resumen = String(body.resumen).trim().slice(0, 1000)
    if (body.category != null) {
      doc.category = String(body.category).trim().slice(0, 80) || 'general'
    }
    if (body.keywords != null) doc.keywords = normalizeKeywords(body.keywords)
    if (body.requiresAck != null) doc.requiresAck = Boolean(body.requiresAck)
    if (body.mandatory != null) doc.mandatory = Boolean(body.mandatory)
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)

    // Nueva versión invalida acuses previos (se conservan en historial pero no cubren la vigente)
    if (bumpVersion || (cuerpoChanged && doc.status === 'published' && body.bumpVersion !== false)) {
      if (bumpVersion || cuerpoChanged) {
        doc.version = body.version ? String(body.version).trim().slice(0, 40) : bumpPolicyVersion(doc.version)
      }
    } else if (body.version != null && String(body.version).trim()) {
      doc.version = String(body.version).trim().slice(0, 40)
    }

    if (body.status != null) {
      const nextStatus = normalizeHelpStatus(body.status, doc.status)
      if (nextStatus === 'published' && doc.status !== 'published') {
        doc.publishedAt = new Date()
      }
      doc.status = nextStatus
    }

    doc.authorName = authorName(req.user)
    await syncKbSource('policy', doc)
    await doc.save()
    res.json({ policy: serializePolicy(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const doc = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Política no encontrada' })
    doc.status = 'archived'
    await syncKbSource('policy', doc)
    await doc.save()
    res.json({ ok: true, policy: serializePolicy(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** Reporte de cumplimiento: quién firmó / quién falta (versión vigente). */
router.get('/:id/compliance', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const p = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!p) return res.status(404).json({ error: 'Política no encontrada' })

    const audienceUsers = await User.find(usersFilterForAudience(req.tenant._id, p.audience))
      .select('_id usuario nombre apellido email')
      .lean()
    const ver = String(p.version || '1')
    const ackByUser = new Map()
    for (const a of p.acks || []) {
      if (String(a.version) !== ver) continue
      const uid = String(a.userId)
      const prev = ackByUser.get(uid)
      if (!prev || new Date(a.acceptedAt) > new Date(prev.acceptedAt)) {
        ackByUser.set(uid, a)
      }
    }

    const signed = []
    const pending = []
    for (const u of audienceUsers) {
      const row = {
        id: String(u._id),
        usuario: u.usuario || '',
        nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
        email: u.email || '',
      }
      const ack = ackByUser.get(String(u._id))
      if (ack) {
        signed.push({ ...row, acceptedAt: ack.acceptedAt, version: ack.version })
      } else {
        pending.push(row)
      }
    }

    const stats = complianceStats({ invited: audienceUsers.length, acked: signed.length })
    res.json({
      policy: serializePolicy(p),
      compliance: stats,
      signed,
      pending,
    })
  } catch (e) {
    next(e)
  }
})

/** Export CSV de pendientes / firmados. */
router.get('/:id/compliance.csv', requireAuth, requireCapability(cap), async (req, res, next) => {
  try {
    const p = await Policy.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!p) return res.status(404).json({ error: 'Política no encontrada' })
    const audienceUsers = await User.find(usersFilterForAudience(req.tenant._id, p.audience))
      .select('_id usuario nombre apellido email')
      .lean()
    const ver = String(p.version || '1')
    const ackByUser = new Map(
      (p.acks || [])
        .filter((a) => String(a.version) === ver)
        .map((a) => [String(a.userId), a]),
    )
    const lines = ['usuario,nombre,email,estado,version,acceptedAt']
    for (const u of audienceUsers) {
      const ack = ackByUser.get(String(u._id))
      const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario
      const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`
      lines.push(
        [
          esc(u.usuario),
          esc(nombre),
          esc(u.email),
          ack ? 'aceptado' : 'pendiente',
          esc(ver),
          esc(ack?.acceptedAt ? new Date(ack.acceptedAt).toISOString() : ''),
        ].join(','),
      )
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="politica-${p._id}-cumplimiento.csv"`,
    )
    res.send(lines.join('\n'))
  } catch (e) {
    next(e)
  }
})

export default router
