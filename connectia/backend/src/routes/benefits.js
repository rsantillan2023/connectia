import { Router } from 'express'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { Benefit, BenefitFavorite, BenefitPartnerLink, BenefitCode, BenefitWaitlist } from '../models/Benefit.js'
import { BenefitRedemption } from '../models/Wallet.js'
import { audienceFilterForUser, userMatchesAudience } from '../lib/audience.js'
import {
  serializeBenefit,
  serializePartnerLink,
  benefitsMeta,
  buildBenefitSearchFilter,
  canRedeemBenefit,
  distanceKm,
  isBenefitActiveNow,
  isBenefitAvailableNow,
  isBenefitInSchedule,
  normalizeCartItems,
  computeCartTotals,
  resolveBenefitLocations,
  findNearestLocation,
  periodStart,
  userSedeMatchesBenefit,
  inferOfferType,
  normalizeOfferType,
  resolveCategories,
  categoryLabel,
  defaultCategoryEmoji,
} from '../lib/benefits.js'
import {
  getOrCreateWalletAccount,
  postLedgerEntry,
  requireWalletCapability,
  tenantHasPartners,
} from '../lib/walletService.js'
import { explainRedeemCopy } from '../services/benefitsAi.js'
import { notifyBenefitExpiring, notifyWaitlistAvailable } from '../services/notifyBenefits.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

async function favoriteIdsFor(tenantId, userId) {
  const favs = await BenefitFavorite.find({ tenantId, userId }).select('benefitId').lean()
  return new Set(favs.map((f) => String(f.benefitId)))
}

function baseVisibleFilter(tenantId, user) {
  return {
    tenantId,
    status: 'published',
    $and: [audienceFilterForUser(user)],
  }
}

async function userPeriodRedeemCounts(tenantId, userId, benefitId, now = new Date()) {
  const day = periodStart('day', now)
  const week = periodStart('week', now)
  const month = periodStart('month', now)
  const base = {
    tenantId,
    userId,
    benefitId,
    status: { $in: ['confirmed', 'used', 'pending'] },
  }
  const [userRedeemCount, userRedeemCountDay, userRedeemCountWeek, userRedeemCountMonth] = await Promise.all([
    BenefitRedemption.countDocuments(base),
    BenefitRedemption.countDocuments({ ...base, createdAt: { $gte: day } }),
    BenefitRedemption.countDocuments({ ...base, createdAt: { $gte: week } }),
    BenefitRedemption.countDocuments({ ...base, createdAt: { $gte: month } }),
  ])
  return { userRedeemCount, userRedeemCountDay, userRedeemCountWeek, userRedeemCountMonth }
}

function enrichDistance(items, nearLat, nearLng) {
  if (nearLat == null || nearLng == null || !Number.isFinite(nearLat) || !Number.isFinite(nearLng)) {
    return items.map((e) => ({ ...e, _dist: null, _lat: e.lat, _lng: e.lng }))
  }
  return items
    .map((e) => {
      const nearest = findNearestLocation(e, nearLat, nearLng)
      const d =
        nearest?.distanceKm ??
        (e.lat != null && e.lng != null ? distanceKm(nearLat, nearLng, e.lat, e.lng) : null)
      return {
        ...e,
        _dist: d,
        _lat: nearest?.lat ?? e.lat,
        _lng: nearest?.lng ?? e.lng,
        _locName: nearest?.name || e.sucursal,
      }
    })
    .sort((a, b) => {
      if (a._dist == null && b._dist == null) return 0
      if (a._dist == null) return 1
      if (b._dist == null) return -1
      return a._dist - b._dist
    })
}

async function assignCodeIfAny(tenantId, benefitId, userId, redemptionId) {
  const codeDoc = await BenefitCode.findOneAndUpdate(
    { tenantId, benefitId, status: 'available' },
    {
      $set: {
        status: 'assigned',
        assignedTo: userId,
        redemptionId,
      },
    },
    { sort: { createdAt: 1 }, new: true },
  )
  return codeDoc?.code || null
}

async function bumpLocationStock(benefit, locationId) {
  if (!locationId || !Array.isArray(benefit.locations)) return
  const loc = benefit.locations.find((l) => l.id === locationId)
  if (!loc) return
  loc.redeemCount = Number(loc.redeemCount || 0) + 1
  if (loc.stock != null && Number.isFinite(loc.stock)) {
    loc.stock = Math.max(0, Number(loc.stock) - 1)
  }
}

/** GET /api/benefits/meta */
router.get('/meta', requireAuth, async (req, res) => {
  const caps = req.tenant?.capabilities || []
  res.json({
    ...benefitsMeta(req.tenant),
    walletEnabled: caps.includes('beneficios.billetera'),
    partnersEnabled: tenantHasPartners(req.tenant),
  })
})

/** GET /api/benefits/redemptions/mine */
router.get('/redemptions/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await BenefitRedemption.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({
      items: items.map((r) => ({
        id: String(r._id),
        benefitId: String(r.benefitId),
        code: r.code,
        status: r.status,
        pointsSpent: r.pointsSpent,
        createdAt: r.createdAt,
        qrPayload: `connectia:redeem:${r.code}`,
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/benefits/partners — links partner (capability) */
router.get('/partners', requireAuth, async (req, res, next) => {
  try {
    if (!tenantHasPartners(req.tenant)) {
      return res.json({ items: [], enabled: false })
    }
    const items = await BenefitPartnerLink.find({
      tenantId: req.tenant._id,
      activo: true,
    })
      .sort({ orden: 1, titulo: 1 })
      .lean()
    res.json({ items: items.map(serializePartnerLink), enabled: true })
  } catch (e) {
    next(e)
  }
})

/** GET /api/benefits/map — solo con coordenadas (legado Geolocation) */
router.get('/map', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const favSet = await favoriteIdsFor(tenantId, req.user._id)
    const nearLat = req.query.lat != null ? Number(req.query.lat) : null
    const nearLng = req.query.lng != null ? Number(req.query.lng) : null
    let items = await Benefit.find({
      ...baseVisibleFilter(tenantId, req.user),
      $or: [
        { lat: { $ne: null, $type: 'number' }, lng: { $ne: null, $type: 'number' } },
        { 'locations.0': { $exists: true } },
      ],
    })
      .sort({ orden: 1, titulo: 1 })
      .limit(300)
      .lean()
    items = items.filter((e) => isBenefitActiveNow(e) && resolveBenefitLocations(e).some((l) => l.lat != null && l.lng != null))
    items = enrichDistance(items, nearLat, nearLng)
    res.json({
      items: items.map((e) =>
        serializeBenefit(
          { ...e, lat: e._lat ?? e.lat, lng: e._lng ?? e.lng, sucursal: e._locName || e.sucursal },
          {
            favorite: favSet.has(String(e._id)),
            distanceKm: e._dist ?? null,
            tenant: req.tenant,
          },
        ),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** GET /api/benefits/recommend — ranking simple + razón */
router.get('/recommend', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const favSet = await favoriteIdsFor(tenantId, req.user._id)
    const nearLat = req.query.lat != null ? Number(req.query.lat) : null
    const nearLng = req.query.lng != null ? Number(req.query.lng) : null
    let items = await Benefit.find(baseVisibleFilter(tenantId, req.user))
      .sort({ destacado: -1, orden: 1 })
      .limit(200)
      .lean()
    items = items.filter((e) => isBenefitActiveNow(e) && userSedeMatchesBenefit(e, req.user))
    items = enrichDistance(items, nearLat, nearLng)

    const scored = items
      .map((e) => {
        let score = 0
        const reasons = []
        if (e.destacado) {
          score += 30
          reasons.push('destacado')
        }
        if (isBenefitAvailableNow(e)) {
          score += 20
          reasons.push('disponible ahora')
        }
        if (favSet.has(String(e._id))) {
          score += 25
          reasons.push('favorito')
        }
        if (e._dist != null && e._dist < 5) {
          score += 15
          reasons.push('cerca tuyo')
        } else if (e._dist != null && e._dist < 15) {
          score += 8
          reasons.push('en tu zona')
        }
        if (Number(e.costoPuntos || 0) === 0) {
          score += 5
          reasons.push('sin puntos')
        }
        return { e, score, reason: reasons.slice(0, 2).join(' · ') || 'para vos' }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    res.json({
      items: scored.map(({ e, score, reason }) =>
        serializeBenefit(
          { ...e, lat: e._lat ?? e.lat, lng: e._lng ?? e.lng },
          {
            favorite: favSet.has(String(e._id)),
            distanceKm: e._dist ?? null,
            recommendScore: score,
            recommendReason: reason,
            tenant: req.tenant,
          },
        ),
      ),
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/benefits/expiry-nudge — avisa vencimientos (favoritos / canjes activos) */
router.post('/expiry-nudge', requireAuth, async (req, res, next) => {
  try {
    const now = new Date()
    const horizon = new Date(now.getTime() + 7 * 864e5)
    const favIds = [...(await favoriteIdsFor(req.tenant._id, req.user._id))]
    const recent = await BenefitRedemption.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: { $in: ['confirmed', 'pending'] },
    })
      .select('benefitId')
      .limit(50)
      .lean()
    const ids = [...new Set([...favIds, ...recent.map((r) => String(r.benefitId))])].filter((id) =>
      ObjectId.isValid(id),
    )
    if (!ids.length) return res.json({ notified: 0 })
    const benefits = await Benefit.find({
      tenantId: req.tenant._id,
      _id: { $in: ids.map((id) => new ObjectId(id)) },
      status: 'published',
      vigenciaHasta: { $gte: now, $lte: horizon },
    }).lean()
    for (const b of benefits) {
      await notifyBenefitExpiring({ tenantId: req.tenant._id, userId: req.user._id, benefit: b })
    }
    res.json({ notified: benefits.length })
  } catch (e) {
    next(e)
  }
})

/** POST /api/benefits/:id/waitlist */
router.post('/:id/waitlist', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const benefit = await Benefit.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    })
    if (!benefit || !userMatchesAudience(req.user, benefit.audience)) {
      return res.status(404).json({ error: 'No encontrado' })
    }
    if (!benefit.allowWaitlist) return res.status(400).json({ error: 'Lista de espera no habilitada' })
    const doc = await BenefitWaitlist.findOneAndUpdate(
      { tenantId: req.tenant._id, benefitId: benefit._id, userId: req.user._id },
      {
        tenantId: req.tenant._id,
        benefitId: benefit._id,
        userId: req.user._id,
        status: 'waiting',
        note: String(req.body?.note || '').slice(0, 240),
      },
      { upsert: true, new: true },
    )
    res.json({ ok: true, status: doc.status })
  } catch (e) {
    next(e)
  }
})

/** POST /api/benefits/:id/explain — texto IA/heurística del canje */
router.post('/:id/explain', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const benefit = await Benefit.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    }).lean()
    if (!benefit || !userMatchesAudience(req.user, benefit.audience)) {
      return res.status(404).json({ error: 'No encontrado' })
    }
    const counts = await userPeriodRedeemCounts(req.tenant._id, req.user._id, benefit._id)
    const check = canRedeemBenefit(benefit, { ...counts, user: req.user })
    let balance = null
    if ((req.tenant.capabilities || []).includes('beneficios.billetera')) {
      const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
      balance = acc.balance
    }
    const explained = await explainRedeemCopy({
      benefit,
      reason: check.ok ? '' : check.reason,
      balance,
    })
    res.json({ ...explained, canRedeem: check.ok, reason: check.reason || null })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/benefits/merchant/validate — comercio marca canje usado con PIN
 * Body: { code, pin }
 */
router.post('/merchant/validate', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim()
    const pin = String(req.body?.pin || '').trim()
    if (!code || !pin) return res.status(400).json({ error: 'code y pin obligatorios' })
    const redemption = await BenefitRedemption.findOne({ tenantId: req.tenant._id, code })
    if (!redemption) return res.status(404).json({ error: 'Canje no encontrado' })
    const benefit = await Benefit.findOne({ _id: redemption.benefitId, tenantId: req.tenant._id })
    if (!benefit || !String(benefit.merchantPin || '').trim()) {
      return res.status(400).json({ error: 'Validación comercio no configurada' })
    }
    if (String(benefit.merchantPin) !== pin) return res.status(403).json({ error: 'PIN incorrecto' })
    if (redemption.status === 'used') return res.json({ ok: true, replay: true, status: 'used' })
    redemption.status = 'used'
    redemption.usedAt = new Date()
    redemption.usedByMerchant = true
    await redemption.save()
    res.json({ ok: true, status: 'used', code: redemption.code })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/benefits/cart/checkout — carrito multi-ítem (legado Cart.vue)
 * Body: { items: [{ benefitId, cantidad }], idempotencyKey }
 */
router.post('/cart/checkout', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    const cartItems = normalizeCartItems(body.items)
    const idempotencyKey =
      String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim() ||
      `cart:${req.user._id}:${Date.now()}`

    const existingBatch = await BenefitRedemption.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      idempotencyKey: new RegExp(`^${idempotencyKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    })
      .limit(50)
      .lean()
    if (existingBatch.length) {
      const acc = (req.tenant.capabilities || []).includes('beneficios.billetera')
        ? await getOrCreateWalletAccount(req.tenant._id, req.user._id)
        : null
      return res.json({
        replay: true,
        redemptions: existingBatch.map((r) => ({
          id: String(r._id),
          code: r.code,
          benefitId: String(r.benefitId),
          pointsSpent: r.pointsSpent,
          qrPayload: `connectia:redeem:${r.code}`,
        })),
        balance: acc?.balance ?? null,
      })
    }

    const ids = cartItems.map((i) => i.benefitId).filter((id) => ObjectId.isValid(id))
    const docs = await Benefit.find({
      _id: { $in: ids },
      tenantId: req.tenant._id,
      status: 'published',
    })
    const byId = new Map(docs.map((d) => [String(d._id), d]))

    // Validar elegibilidad línea a línea
    for (const it of cartItems) {
      const doc = byId.get(it.benefitId)
      if (!doc || !userMatchesAudience(req.user, doc.audience)) {
        return res.status(404).json({ error: `Beneficio no disponible` })
      }
      const userRedeemCount = await BenefitRedemption.countDocuments({
        tenantId: req.tenant._id,
        userId: req.user._id,
        benefitId: doc._id,
        status: { $in: ['confirmed', 'used', 'pending'] },
      })
      for (let n = 0; n < it.cantidad; n += 1) {
        const check = canRedeemBenefit(doc.toObject(), {
          userRedeemCount: userRedeemCount + n,
        })
        if (!check.ok) return res.status(400).json({ error: `${doc.titulo}: ${check.reason}` })
      }
      const stock = doc.stock
      if (stock != null && Number.isFinite(stock) && stock < it.cantidad) {
        return res.status(400).json({ error: `${doc.titulo}: stock insuficiente` })
      }
    }

    const { totalPuntos, lines } = computeCartTotals(
      cartItems,
      new Map([...byId.entries()].map(([k, v]) => [k, v.toObject()])),
    )

    if (totalPuntos > 0) requireWalletCapability(req.tenant)

    let ledgerTxId = null
    if (totalPuntos > 0) {
      const posted = await postLedgerEntry({
        tenantId: req.tenant._id,
        userId: req.user._id,
        type: 'redeem',
        amount: totalPuntos,
        concept: `Canje carrito (${lines.length} ítems)`,
        idempotencyKey: `wallet:${idempotencyKey}`,
        createdBy: req.user._id,
        meta: { cart: lines },
      })
      ledgerTxId = posted.transaction._id
    }

    const redemptions = []
    for (const it of cartItems) {
      const doc = byId.get(it.benefitId)
      const unit = Number(doc.costoPuntos || 0)
      for (let n = 0; n < it.cantidad; n += 1) {
        const code = `CNX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        const lineKey = `${idempotencyKey}:${it.benefitId}:${n}`
        const redemption = await BenefitRedemption.create({
          tenantId: req.tenant._id,
          benefitId: doc._id,
          userId: req.user._id,
          code,
          status: 'confirmed',
          pointsSpent: unit,
          transactionId: ledgerTxId,
          idempotencyKey: lineKey,
        })
        redemptions.push({
          id: String(redemption._id),
          code: redemption.code,
          benefitId: String(doc._id),
          pointsSpent: unit,
          qrPayload: `connectia:redeem:${redemption.code}`,
        })
      }
      doc.redeemCount = Number(doc.redeemCount || 0) + it.cantidad
      if (doc.stock != null && Number.isFinite(doc.stock)) {
        doc.stock = Math.max(0, Number(doc.stock) - it.cantidad)
      }
      await doc.save()
    }

    const acc = (req.tenant.capabilities || []).includes('beneficios.billetera')
      ? await getOrCreateWalletAccount(req.tenant._id, req.user._id)
      : null

    res.status(201).json({
      replay: false,
      redemptions,
      lines,
      totalPuntos,
      balance: acc?.balance ?? null,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) return res.status(409).json({ error: 'Operación duplicada' })
    next(e)
  }
})

/** GET /api/benefits — catálogo */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const q = String(req.query.q || '').trim()
    const kind = String(req.query.kind || '').trim()
    const categoria = String(req.query.categoria || '').trim()
    const offerType = normalizeOfferType(req.query.offerType)
    const favoritos = String(req.query.favoritos || '') === '1'
    const disponibleHoy = String(req.query.disponibleHoy || '') === '1'
    const sedeOnly = String(req.query.sede || '') === '1'
    const nearLat = req.query.lat != null ? Number(req.query.lat) : null
    const nearLng = req.query.lng != null ? Number(req.query.lng) : null
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 40))

    const filter = baseVisibleFilter(tenantId, req.user)
    if (kind === 'benefit' || kind === 'reward') filter.kind = kind
    if (categoria) filter.categoria = categoria
    const search = buildBenefitSearchFilter(q)
    if (search) Object.assign(filter, search)

    const favSet = await favoriteIdsFor(tenantId, req.user._id)
    if (favoritos) {
      if (!favSet.size) {
        return res.json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          ...benefitsMeta(req.tenant),
          categories: [],
          walletEnabled: (req.tenant.capabilities || []).includes('beneficios.billetera'),
        })
      }
      filter._id = { $in: [...favSet].map((id) => new ObjectId(id)) }
    }

    let items = await Benefit.find(filter).sort({ destacado: -1, orden: 1, titulo: 1 }).limit(500).lean()
    items = items.filter((e) => isBenefitActiveNow(e))
    if (offerType) items = items.filter((e) => inferOfferType(e) === offerType)
    if (disponibleHoy) items = items.filter((e) => isBenefitInSchedule(e))
    if (sedeOnly) items = items.filter((e) => userSedeMatchesBenefit(e, req.user))

    items = enrichDistance(items, nearLat, nearLng)

    const total = items.length
    const slice = items.slice((page - 1) * pageSize, page * pageSize)
    const serialized = slice.map((e) =>
      serializeBenefit(
        { ...e, lat: e._lat ?? e.lat, lng: e._lng ?? e.lng, sucursal: e._locName || e.sucursal },
        {
          favorite: favSet.has(String(e._id)),
          distanceKm: e._dist ?? null,
          tenant: req.tenant,
        },
      ),
    )

    const catsUsed = await Benefit.distinct('categoria', { tenantId, status: 'published' })
    const used = new Set(catsUsed.filter(Boolean).map(String))
    const configured = resolveCategories(req.tenant)
    const categories = configured.filter((c) => used.has(c.id))
    for (const id of used) {
      if (!categories.some((c) => c.id === id)) {
        categories.push({
          id,
          label: categoryLabel(id, req.tenant),
          emoji: defaultCategoryEmoji(id),
        })
      }
    }

    res.json({
      items: serialized,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      ...benefitsMeta(req.tenant),
      categories,
      walletEnabled: (req.tenant.capabilities || []).includes('beneficios.billetera'),
      partnersEnabled: tenantHasPartners(req.tenant),
      userSede: req.user.sede || '',
    })
  } catch (e) {
    next(e)
  }
})

/** POST /api/benefits/:id/favorite */
router.post('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const benefit = await Benefit.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    }).lean()
    if (!benefit || !userMatchesAudience(req.user, benefit.audience)) {
      return res.status(404).json({ error: 'No encontrado' })
    }
    await BenefitFavorite.findOneAndUpdate(
      { tenantId: req.tenant._id, userId: req.user._id, benefitId: benefit._id },
      { tenantId: req.tenant._id, userId: req.user._id, benefitId: benefit._id },
      { upsert: true, new: true },
    )
    res.json({ favorite: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    await BenefitFavorite.deleteOne({
      tenantId: req.tenant._id,
      userId: req.user._id,
      benefitId: req.params.id,
    })
    res.json({ favorite: false })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/benefits/:id/redeem
 * Body: { idempotencyKey?, locationId?, offlineAt?, clientLat?, clientLng? }
 * Canje con puntos (si costoPuntos>0) o solo código si es informativo.
 * offlineAt: ISO date — canje diferido (cola offline del cliente).
 */
router.post('/:id/redeem', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const benefit = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!benefit || benefit.status !== 'published' || !userMatchesAudience(req.user, benefit.audience)) {
      return res.status(404).json({ error: 'No encontrado' })
    }

    const costo = Number(benefit.costoPuntos || 0)
    if (costo > 0) requireWalletCapability(req.tenant)

    const now = req.body?.offlineAt ? new Date(req.body.offlineAt) : new Date()
    if (Number.isNaN(now.getTime())) return res.status(400).json({ error: 'offlineAt inválido' })

    const counts = await userPeriodRedeemCounts(req.tenant._id, req.user._id, benefit._id, now)
    const locationId = String(req.body?.locationId || '').trim()
    const check = canRedeemBenefit(benefit.toObject(), {
      ...counts,
      user: req.user,
      locationId,
      now,
    })
    if (!check.ok) {
      if (check.waitlist) {
        return res.status(400).json({ error: check.reason, waitlist: true })
      }
      return res.status(400).json({ error: check.reason })
    }

    // Geocerca opcional
    const radius = benefit.redeemRadiusKm
    const cLat = req.body?.clientLat != null ? Number(req.body.clientLat) : null
    const cLng = req.body?.clientLng != null ? Number(req.body.clientLng) : null
    if (radius != null && Number.isFinite(radius) && radius > 0) {
      const nearest = findNearestLocation(benefit.toObject(), cLat, cLng)
      if (!nearest || nearest.distanceKm == null || nearest.distanceKm > radius) {
        return res.status(400).json({ error: `Debés estar a menos de ${radius} km de una sucursal` })
      }
    }

    const idempotencyKey =
      String(req.body?.idempotencyKey || req.headers['idempotency-key'] || '').trim() ||
      `redeem:${req.user._id}:${benefit._id}:${Date.now()}`

    const existing = await BenefitRedemption.findOne({
      tenantId: req.tenant._id,
      idempotencyKey,
    }).lean()
    if (existing) {
      return res.json({
        replay: true,
        redemption: {
          id: String(existing._id),
          code: existing.code,
          status: existing.status,
          pointsSpent: existing.pointsSpent,
          benefitId: String(existing.benefitId),
          qrPayload: `connectia:redeem:${existing.code}`,
        },
      })
    }

    let txId = null
    if (costo > 0) {
      const posted = await postLedgerEntry({
        tenantId: req.tenant._id,
        userId: req.user._id,
        type: 'redeem',
        amount: costo,
        concept: `Canje: ${benefit.titulo}`,
        benefitId: benefit._id,
        idempotencyKey: `wallet:${idempotencyKey}`,
        createdBy: req.user._id,
      })
      txId = posted.transaction._id
    }

    let code = `CNX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const locs = resolveBenefitLocations(benefit.toObject())
    let locName = ''
    let resolvedLocId = locationId
    if (!resolvedLocId && req.user.sede) {
      const match = locs.find((l) => String(l.name || '').toLowerCase() === String(req.user.sede).toLowerCase())
      if (match) resolvedLocId = match.id
    }
    if (resolvedLocId) {
      locName = locs.find((l) => l.id === resolvedLocId)?.name || ''
    }

    const redemption = await BenefitRedemption.create({
      tenantId: req.tenant._id,
      benefitId: benefit._id,
      userId: req.user._id,
      code,
      status: 'confirmed',
      pointsSpent: costo,
      transactionId: txId,
      idempotencyKey,
      locationId: resolvedLocId || '',
      locationName: locName,
    })

    const poolCode = await assignCodeIfAny(req.tenant._id, benefit._id, req.user._id, redemption._id)
    if (poolCode) {
      redemption.code = poolCode
      code = poolCode
      await redemption.save()
    }

    benefit.redeemCount = Number(benefit.redeemCount || 0) + 1
    if (benefit.stock != null && Number.isFinite(benefit.stock)) {
      benefit.stock = Math.max(0, Number(benefit.stock) - 1)
    }
    await bumpLocationStock(benefit, resolvedLocId)
    await benefit.save()

    // Liberar waitlist si vuelve stock (best-effort)
    if (benefit.allowWaitlist && (benefit.stock == null || benefit.stock > 0)) {
      const waiting = await BenefitWaitlist.find({
        tenantId: req.tenant._id,
        benefitId: benefit._id,
        status: 'waiting',
      })
        .limit(3)
        .lean()
      for (const w of waiting) {
        await BenefitWaitlist.updateOne({ _id: w._id }, { $set: { status: 'notified' } })
        await notifyWaitlistAvailable({
          tenantId: req.tenant._id,
          userId: w.userId,
          benefit,
        })
      }
    }

    res.status(201).json({
      replay: false,
      offline: Boolean(req.body?.offlineAt),
      redemption: {
        id: String(redemption._id),
        code: redemption.code,
        status: redemption.status,
        pointsSpent: redemption.pointsSpent,
        benefitId: String(benefit._id),
        locationId: redemption.locationId || '',
        locationName: redemption.locationName || '',
        qrPayload: `connectia:redeem:${redemption.code}`,
      },
      benefit: serializeBenefit(benefit.toObject(), { tenant: req.tenant }),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Operación duplicada; reintentá con la misma clave' })
    }
    next(e)
  }
})

/** GET /api/benefits/:id */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Benefit.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'published',
    }).lean()
    if (!doc || !userMatchesAudience(req.user, doc.audience) || !isBenefitActiveNow(doc)) {
      return res.status(404).json({ error: 'No encontrado' })
    }
    const fav = await BenefitFavorite.exists({
      tenantId: req.tenant._id,
      userId: req.user._id,
      benefitId: doc._id,
    })
    const walletEnabled = (req.tenant.capabilities || []).includes('beneficios.billetera')
    let balance = null
    if (walletEnabled) {
      const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
      balance = acc.balance
    }
    res.json({
      item: serializeBenefit(doc, { favorite: Boolean(fav), tenant: req.tenant }),
      walletEnabled,
      balance,
    })
  } catch (e) {
    next(e)
  }
})

export default router
