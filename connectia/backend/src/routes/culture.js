import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { audienceFilterForUser, userMatchesAudience } from '../lib/audience.js'
import {
  CultureValue,
  Recognition,
  MarketplaceListing,
  Referral,
  PulseCampaign,
  PulseResponse,
} from '../models/Culture.js'
import { InternalVacancy } from '../models/Talent.js'
import { User } from '../models/User.js'
import {
  tenantHasCultureCap,
  serializeCultureValue,
  serializeRecognition,
  serializeMarketplace,
  serializeReferral,
  serializePulseCampaign,
  validatePulseAnswers,
  MARKETPLACE_CATEGORIES,
} from '../lib/culture.js'
import { displayName } from '../lib/talent.js'
import { notifyRecognition } from '../services/notifyTalentCulture.js'
import { searchTenantPeople } from '../lib/peopleSearch.js'
import {
  publishRecognitionPost,
  awardRecognitionPoints,
  buildRecognitionPostHref,
} from '../lib/recognitionPublish.js'
import { openMarketplaceChat, tenantHasChat } from '../lib/marketplaceChat.js'
import { scheduleAwardPoints } from '../lib/pointsRules.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

function cultureCaps(tenant) {
  return {
    reconocimientos: tenantHasCultureCap(tenant, 'reconocimientos'),
    marketplace: tenantHasCultureCap(tenant, 'marketplace'),
    referidos: tenantHasCultureCap(tenant, 'referidos'),
    pulso: tenantHasCultureCap(tenant, 'pulso'),
  }
}

function requireCultureCap(sub) {
  return (req, res, next) => {
    if (!tenantHasCultureCap(req.tenant, sub)) {
      const label = sub ? `cultura.${sub}` : 'cultura'
      return res.status(403).json({ error: `Capability ${label} no habilitada en esta comunidad` })
    }
    next()
  }
}

/** GET /api/culture/meta */
router.get('/meta', requireAuth, (req, res) => {
  if (!tenantHasCultureCap(req.tenant)) {
    return res.status(403).json({ error: 'Módulo cultura no habilitado en esta comunidad' })
  }
  const caps = req.tenant.capabilities || []
  res.json({
    capabilities: cultureCaps(req.tenant),
    marketplaceCategories: MARKETPLACE_CATEGORIES,
    wallet: caps.includes('beneficios.billetera'),
    chat: caps.includes('chat'),
  })
})

/** GET /api/culture/people?q= — picker de colegas */
router.get('/people', requireAuth, async (req, res, next) => {
  try {
    if (!tenantHasCultureCap(req.tenant)) {
      return res.status(403).json({ error: 'Módulo cultura no habilitado en esta comunidad' })
    }
    const items = await searchTenantPeople({
      tenantId: req.tenant._id,
      excludeUserId: req.user._id,
      q: req.query.q,
      limit: Number(req.query.limit) || 40,
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

/** GET /api/culture/values */
router.get('/values', requireAuth, requireCultureCap('reconocimientos'), async (req, res, next) => {
  try {
    const items = await CultureValue.find({ tenantId: req.tenant._id, activo: true })
      .sort({ orden: 1, nombre: 1 })
      .lean()
    res.json({ items: items.map(serializeCultureValue) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/culture/recognitions */
router.get('/recognitions', requireAuth, requireCultureCap('reconocimientos'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const uid = req.user._id
    const mine = String(req.query.mine || 'all').trim()

    let filter
    if (mine === 'received') {
      filter = { tenantId, toUserId: uid }
    } else if (mine === 'sent') {
      filter = { tenantId, fromUserId: uid }
    } else {
      filter = {
        tenantId,
        $or: [
          { visibility: 'public' },
          { toUserId: uid },
          { fromUserId: uid },
        ],
      }
    }

    const items = await Recognition.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ items: items.map(serializeRecognition) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/culture/recognitions */
router.post('/recognitions', requireAuth, requireCultureCap('reconocimientos'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const toUserIdRaw = String(body.toUserId || '').trim()
    if (!ObjectId.isValid(toUserIdRaw)) {
      return res.status(400).json({ error: 'toUserId inválido' })
    }
    if (String(toUserIdRaw) === String(req.user._id)) {
      return res.status(400).json({ error: 'No podés reconocerte a vos mismo' })
    }

    const toUser = await User.findOne({
      _id: toUserIdRaw,
      tenantId: req.tenant._id,
      activo: true,
    }).lean()
    if (!toUser) return res.status(404).json({ error: 'Destinatario no encontrado' })

    const mensaje = String(body.mensaje || '').trim().slice(0, 2000)
    if (!mensaje) return res.status(400).json({ error: 'mensaje es requerido' })

    let valueId = null
    let valueName = ''
    const valueIdRaw = String(body.valueId || '').trim()
    if (valueIdRaw && ObjectId.isValid(valueIdRaw)) {
      const val = await CultureValue.findOne({
        _id: valueIdRaw,
        tenantId: req.tenant._id,
        activo: true,
      }).lean()
      if (val) {
        valueId = val._id
        valueName = val.nombre
      }
    }

    const visibility = body.visibility === 'private' ? 'private' : 'public'
    const pointsRequested = Math.min(100, Math.max(0, Math.floor(Number(body.points) || 0)))

    const doc = await Recognition.create({
      tenantId: req.tenant._id,
      fromUserId: req.user._id,
      fromName: displayName(req.user),
      toUserId: toUser._id,
      toName: displayName(toUser),
      valueId,
      valueName,
      mensaje,
      points: pointsRequested,
      visibility,
    })

    let postId = null
    let postHref = '/cultura'
    try {
      const post = await publishRecognitionPost({
        tenant: req.tenant,
        recognition: doc.toObject(),
        fromUser: req.user,
      })
      if (post) {
        postId = post._id
        doc.postId = post._id
        await doc.save()
        postHref = buildRecognitionPostHref(post._id)
      }
    } catch (err) {
      console.warn('[culture] recognition post', err?.message || err)
    }

    const pointsResult = await awardRecognitionPoints({
      tenant: req.tenant,
      recognition: doc.toObject(),
      pointsRequested,
    })

    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'recognition_sent',
      entityId: doc._id,
    })

    await notifyRecognition({ tenant: req.tenant, recognition: doc.toObject() })
    res.status(201).json({
      recognition: serializeRecognition(doc.toObject()),
      postId: postId ? String(postId) : null,
      postHref,
      points: pointsResult,
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/culture/marketplace */
router.get('/marketplace', requireAuth, requireCultureCap('marketplace'), async (req, res, next) => {
  try {
    const items = await MarketplaceListing.find({
      tenantId: req.tenant._id,
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ items: items.map(serializeMarketplace), chatEnabled: tenantHasChat(req.tenant) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/culture/marketplace/:id/contact — abre chat 1:1 con el autor */
router.post('/marketplace/:id/contact', requireAuth, requireCultureCap('marketplace'), async (req, res, next) => {
  try {
    if (!tenantHasChat(req.tenant)) {
      return res.status(403).json({ error: 'Chat no habilitado en esta comunidad' })
    }
    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!listing) return res.status(404).json({ error: 'Aviso no encontrado' })
    const result = await openMarketplaceChat({
      tenantId: req.tenant._id,
      meId: req.user._id,
      authorId: listing.authorId,
      listing: listing.toObject(),
    })
    res.status(201).json(result)
  } catch (e) {
    next(e)
  }
})

/** POST /api/culture/marketplace */
router.post('/marketplace', requireAuth, requireCultureCap('marketplace'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 160)
    if (!titulo) return res.status(400).json({ error: 'titulo es requerido' })

    const category = MARKETPLACE_CATEGORIES.includes(body.category) ? body.category : 'venta'
    const doc = await MarketplaceListing.create({
      tenantId: req.tenant._id,
      authorId: req.user._id,
      authorName: displayName(req.user),
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 4000),
      category,
      precio: String(body.precio || '').trim().slice(0, 80),
      imageUrl: String(body.imageUrl || '').trim().slice(0, 500),
      contactNote: String(body.contactNote || '').trim().slice(0, 400),
      status: 'published',
    })
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'marketplace_listing_created',
      entityId: doc._id,
    })
    res.status(201).json({ listing: serializeMarketplace(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/culture/marketplace/:id */
router.patch('/marketplace/:id', requireAuth, requireCultureCap('marketplace'), async (req, res, next) => {
  try {
    const doc = await MarketplaceListing.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      authorId: req.user._id,
    })
    if (!doc) return res.status(404).json({ error: 'Aviso no encontrado o no sos el autor' })

    const body = req.body || {}
    if (body.titulo != null) doc.titulo = String(body.titulo).trim().slice(0, 160)
    if (body.descripcion != null) doc.descripcion = String(body.descripcion).trim().slice(0, 4000)
    if (body.category != null && MARKETPLACE_CATEGORIES.includes(body.category)) {
      doc.category = body.category
    }
    if (body.precio != null) doc.precio = String(body.precio).trim().slice(0, 80)
    if (body.imageUrl != null) doc.imageUrl = String(body.imageUrl).trim().slice(0, 500)
    if (body.contactNote != null) doc.contactNote = String(body.contactNote).trim().slice(0, 400)
    if (body.status === 'sold') doc.status = 'sold'
    if (body.status === 'published' && doc.status !== 'hidden') doc.status = 'published'

    await doc.save()
    res.json({ listing: serializeMarketplace(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/culture/referrals/mine */
router.get('/referrals/mine', requireAuth, requireCultureCap('referidos'), async (req, res, next) => {
  try {
    const items = await Referral.find({
      tenantId: req.tenant._id,
      referrerId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ items: items.map(serializeReferral) })
  } catch (e) {
    next(e)
  }
})

/** POST /api/culture/referrals */
router.post('/referrals', requireAuth, requireCultureCap('referidos'), async (req, res, next) => {
  try {
    const body = req.body || {}
    const candidateName = String(body.candidateName || '').trim().slice(0, 160)
    if (!candidateName) return res.status(400).json({ error: 'candidateName es requerido' })

    let vacancyId = null
    let vacancyTitle = ''
    const vacancyIdRaw = String(body.vacancyId || '').trim()
    if (vacancyIdRaw && ObjectId.isValid(vacancyIdRaw)) {
      const vacancy = await InternalVacancy.findOne({
        _id: vacancyIdRaw,
        tenantId: req.tenant._id,
        status: 'open',
      }).lean()
      if (vacancy) {
        vacancyId = vacancy._id
        vacancyTitle = vacancy.titulo
      }
    }

    const doc = await Referral.create({
      tenantId: req.tenant._id,
      vacancyId,
      vacancyTitle,
      referrerId: req.user._id,
      referrerName: displayName(req.user),
      candidateName,
      candidateEmail: String(body.candidateEmail || '').trim().slice(0, 200),
      candidatePhone: String(body.candidatePhone || '').trim().slice(0, 60),
      notes: String(body.notes || '').trim().slice(0, 2000),
      status: 'submitted',
    })
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'referral_created',
      entityId: doc._id,
    })
    res.status(201).json({ referral: serializeReferral(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

/** GET /api/culture/pulse */
router.get('/pulse', requireAuth, requireCultureCap('pulso'), async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const now = new Date()
    const campaigns = await PulseCampaign.find({
      tenantId,
      status: 'active',
      startsAt: { $lte: now },
      endsAt: { $gte: now },
      $and: [audienceFilterForUser(req.user)],
    })
      .sort({ endsAt: 1 })
      .lean()

    const campaignIds = campaigns.map((c) => c._id)
    const responses = campaignIds.length
      ? await PulseResponse.find({
          tenantId,
          userId: req.user._id,
          campaignId: { $in: campaignIds },
        })
          .select('campaignId')
          .lean()
      : []
    const answeredSet = new Set(responses.map((r) => String(r.campaignId)))

    res.json({
      items: campaigns.map((c) =>
        serializePulseCampaign(c, { answeredByMe: answeredSet.has(String(c._id)) }),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/culture/pulse/:id/respond */
router.post('/pulse/:id/respond', requireAuth, requireCultureCap('pulso'), async (req, res, next) => {
  try {
    const campaign = await PulseCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'active',
    })
    if (!campaign || !userMatchesAudience(req.user, campaign.audience)) {
      return res.status(404).json({ error: 'Campaña no encontrada' })
    }

    const now = new Date()
    if (campaign.startsAt > now || campaign.endsAt < now) {
      return res.status(400).json({ error: 'La campaña no está activa en este momento' })
    }

    const existing = await PulseResponse.findOne({
      tenantId: req.tenant._id,
      campaignId: campaign._id,
      userId: req.user._id,
    })
    if (existing) {
      return res.status(409).json({ error: 'Ya respondiste esta campaña' })
    }

    const answers = req.body?.answers
    const check = validatePulseAnswers(campaign.questions, answers)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const doc = await PulseResponse.create({
      tenantId: req.tenant._id,
      campaignId: campaign._id,
      userId: req.user._id,
      answers: answers.map((a) => ({ value: a?.value })),
    })
    scheduleAwardPoints({
      tenant: req.tenant,
      userId: req.user._id,
      event: 'pulse_responded',
      entityId: campaign._id,
    })
    res.status(201).json({
      ok: true,
      responseId: String(doc._id),
      campaign: serializePulseCampaign(campaign.toObject(), { answeredByMe: true }),
    })
  } catch (e) {
    next(e)
  }
})

export default router
