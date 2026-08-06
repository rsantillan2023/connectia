import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { normalizeAudience, serializeAudience } from '../lib/audience.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import {
  CultureValue,
  Recognition,
  MarketplaceListing,
  Referral,
  PulseCampaign,
  PulseResponse,
} from '../models/Culture.js'
import {
  tenantHasCultureCap,
  serializeCultureValue,
  serializeRecognition,
  serializeMarketplace,
  serializeReferral,
  serializePulseCampaign,
  pulseAggregateSafe,
  REFERRAL_STATUSES,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_STATUSES,
  CULTURE_CAPS,
} from '../lib/culture.js'
import { seedTalentCultureForTenant } from '../lib/talentCultureSeed.js'
import { notifyReferralStatus } from '../services/notifyTalentCulture.js'
import { searchTenantPeople } from '../lib/peopleSearch.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const cap = 'admin.cultura'

router.use(requireAuth, requireCapability(cap))

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

function cultureCaps(tenant) {
  return {
    reconocimientos: tenantHasCultureCap(tenant, 'reconocimientos'),
    marketplace: tenantHasCultureCap(tenant, 'marketplace'),
    referidos: tenantHasCultureCap(tenant, 'referidos'),
    pulso: tenantHasCultureCap(tenant, 'pulso'),
  }
}

/** GET /api/admin/culture/meta */
router.get('/meta', async (req, res) => {
  res.json({
    capabilities: cultureCaps(req.tenant),
    productCaps: CULTURE_CAPS,
    referralStatuses: REFERRAL_STATUSES,
    marketplaceCategories: MARKETPLACE_CATEGORIES,
    marketplaceStatuses: MARKETPLACE_STATUSES,
    pulseStatuses: ['draft', 'active', 'closed'],
  })
})

/** GET /api/admin/culture/people?q= */
router.get('/people', async (req, res, next) => {
  try {
    const items = await searchTenantPeople({
      tenantId: req.tenant._id,
      q: req.query.q,
      limit: Number(req.query.limit) || 40,
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/culture/seed-defaults */
router.post('/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedTalentCultureForTenant(req.tenant._id, {
      brandName: req.tenant.nombre || req.tenant.name || 'Connectia',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/** ─── Values ─── */
router.get('/values', async (req, res, next) => {
  try {
    const items = await CultureValue.find({ tenantId: req.tenant._id }).sort({ orden: 1, nombre: 1 }).lean()
    res.json({ items: items.map(serializeCultureValue) })
  } catch (e) {
    next(e)
  }
})

router.post('/values', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim().slice(0, 80)
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const doc = await CultureValue.create({
      tenantId: req.tenant._id,
      nombre,
      descripcion: String(body.descripcion || '').trim().slice(0, 400),
      color: String(body.color || '#0f766e').trim().slice(0, 20),
      orden: Number(body.orden) || 100,
      activo: body.activo !== false,
    })
    res.status(201).json({ value: serializeCultureValue(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/values/:id', async (req, res, next) => {
  try {
    const doc = await CultureValue.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Valor no encontrado' })
    const body = req.body || {}
    if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 80)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 400)
    if (body.color != null) doc.color = String(body.color).trim().slice(0, 20)
    if (body.orden != null) doc.orden = Number(body.orden) || doc.orden
    if (body.activo != null) doc.activo = Boolean(body.activo)
    await doc.save()
    res.json({ value: serializeCultureValue(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/culture/recognitions */
router.get('/recognitions', async (req, res, next) => {
  try {
    const items = await Recognition.find({ tenantId: req.tenant._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    res.json({ items: items.map(serializeRecognition) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/culture/marketplace */
router.get('/marketplace', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const status = String(req.query.status || '').trim()
    if (MARKETPLACE_STATUSES.includes(status)) filter.status = status
    const items = await MarketplaceListing.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ items: items.map(serializeMarketplace) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/culture/marketplace/:id — moderación (hide) */
router.patch('/marketplace/:id', async (req, res, next) => {
  try {
    const doc = await MarketplaceListing.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Aviso no encontrado' })
    const body = req.body || {}
    if (body.status === 'hidden' || body.hide === true) {
      doc.status = 'hidden'
      doc.hiddenReason = String(body.hiddenReason || body.reason || 'Moderado por admin').trim().slice(0, 400)
    } else if (body.status === 'published') {
      doc.status = 'published'
      doc.hiddenReason = ''
    } else if (MARKETPLACE_STATUSES.includes(body.status)) {
      doc.status = body.status
    }
    await doc.save()
    res.json({ listing: serializeMarketplace(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/culture/referrals */
router.get('/referrals', async (req, res, next) => {
  try {
    const filter = { tenantId: req.tenant._id }
    const status = String(req.query.status || '').trim()
    if (REFERRAL_STATUSES.includes(status)) filter.status = status
    const items = await Referral.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ items: items.map(serializeReferral) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/culture/referrals/:id */
router.patch('/referrals/:id', async (req, res, next) => {
  try {
    const doc = await Referral.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Referido no encontrado' })
    const body = req.body || {}
    const prevStatus = doc.status
    if (body.status != null && REFERRAL_STATUSES.includes(body.status)) {
      doc.status = body.status
    }
    if (body.rewardGranted != null) doc.rewardGranted = Boolean(body.rewardGranted)
    if (body.rewardNote != null) doc.rewardNote = String(body.rewardNote).trim().slice(0, 400)
    await doc.save()

    if (body.status != null && body.status !== prevStatus) {
      await notifyReferralStatus({ tenant: req.tenant, referral: doc.toObject() })
    }

    res.json({ referral: serializeReferral(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** ─── Pulse campaigns ─── */
router.get('/pulse', async (req, res, next) => {
  try {
    const items = await PulseCampaign.find({ tenantId: req.tenant._id }).sort({ startsAt: -1 }).lean()
    res.json({
      items: items.map((c) => ({
        ...serializePulseCampaign(c),
        audience: serializeAudience(c.audience),
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.post('/pulse', async (req, res, next) => {
  try {
    const body = req.body || {}
    const nombre = String(body.nombre || '').trim().slice(0, 160)
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const startsAt = body.startsAt ? new Date(body.startsAt) : null
    const endsAt = body.endsAt ? new Date(body.endsAt) : null
    if (!startsAt || !endsAt || Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return res.status(400).json({ error: 'startsAt y endsAt son requeridos' })
    }

    const questions = Array.isArray(body.questions)
      ? body.questions.slice(0, 10).map((q) => ({
          tipo: ['enps', 'scale', 'text'].includes(q?.tipo) ? q.tipo : 'enps',
          texto: String(q?.texto || '').trim().slice(0, 400),
        })).filter((q) => q.texto)
      : [{ tipo: 'enps', texto: '¿Qué tan probable es que recomiendes trabajar acá?' }]

    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    const doc = await PulseCampaign.create({
      tenantId: req.tenant._id,
      nombre,
      descripcion: String(body.descripcion || '').trim().slice(0, 2000),
      questions,
      startsAt,
      endsAt,
      anonymityThreshold: Math.max(1, Number(body.anonymityThreshold) || 5),
      status: ['draft', 'active', 'closed'].includes(body.status) ? body.status : 'draft',
      audience,
    })
    res.status(201).json({
      campaign: {
        ...serializePulseCampaign(doc.toObject()),
        audience: serializeAudience(doc.audience),
      },
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/pulse/:id', async (req, res, next) => {
  try {
    const doc = await PulseCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'Campaña no encontrada' })
    const body = req.body || {}
    if (body.nombre != null) doc.nombre = String(body.nombre).trim().slice(0, 160)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 2000)
    if (body.startsAt != null) doc.startsAt = new Date(body.startsAt)
    if (body.endsAt != null) doc.endsAt = new Date(body.endsAt)
    if (body.anonymityThreshold != null) {
      doc.anonymityThreshold = Math.max(1, Number(body.anonymityThreshold) || 5)
    }
    if (body.status != null && ['draft', 'active', 'closed'].includes(body.status)) {
      doc.status = body.status
    }
    if (body.audience != null) doc.audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (Array.isArray(body.questions)) {
      doc.questions = body.questions.slice(0, 10).map((q) => ({
        tipo: ['enps', 'scale', 'text'].includes(q?.tipo) ? q.tipo : 'enps',
        texto: String(q?.texto || '').trim().slice(0, 400),
      })).filter((q) => q.texto)
    }
    await doc.save()
    res.json({
      campaign: {
        ...serializePulseCampaign(doc.toObject()),
        audience: serializeAudience(doc.audience),
      },
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/culture/pulse/:id/results */
router.get('/pulse/:id/results', async (req, res, next) => {
  try {
    const campaign = await PulseCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    }).lean()
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })

    const responses = await PulseResponse.find({
      tenantId: req.tenant._id,
      campaignId: campaign._id,
    }).lean()

    const aggregate = pulseAggregateSafe(responses, campaign)
    res.json({
      campaign: {
        ...serializePulseCampaign(campaign),
        audience: serializeAudience(campaign.audience),
      },
      results: aggregate,
    })
  } catch (e) {
    next(e)
  }
})

export default router
