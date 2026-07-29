import { Router } from 'express'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { Benefit, BenefitFavorite, BenefitPartnerLink } from '../models/Benefit.js'
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
  normalizeCartItems,
  computeCartTotals,
} from '../lib/benefits.js'
import {
  getOrCreateWalletAccount,
  postLedgerEntry,
  requireWalletCapability,
  tenantHasPartners,
} from '../lib/walletService.js'

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

/** GET /api/benefits/meta */
router.get('/meta', requireAuth, async (req, res) => {
  const caps = req.tenant?.capabilities || []
  res.json({
    ...benefitsMeta(),
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
      lat: { $ne: null, $type: 'number' },
      lng: { $ne: null, $type: 'number' },
    })
      .sort({ orden: 1, titulo: 1 })
      .limit(300)
      .lean()
    items = items.filter((e) => isBenefitActiveNow(e))
    if (nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
      items = items
        .map((e) => ({ e, d: distanceKm(nearLat, nearLng, e.lat, e.lng) }))
        .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9))
        .map(({ e, d }) => ({ ...e, _dist: d }))
    }
    res.json({
      items: items.map((e) =>
        serializeBenefit(e, {
          favorite: favSet.has(String(e._id)),
          distanceKm: e._dist ?? null,
        }),
      ),
    })
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
    const favoritos = String(req.query.favoritos || '') === '1'
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
          categories: [],
          ...benefitsMeta(),
          walletEnabled: (req.tenant.capabilities || []).includes('beneficios.billetera'),
        })
      }
      filter._id = { $in: [...favSet].map((id) => new ObjectId(id)) }
    }

    let items = await Benefit.find(filter).sort({ destacado: -1, orden: 1, titulo: 1 }).limit(500).lean()
    items = items.filter((e) => isBenefitActiveNow(e))

    if (nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
      items = items
        .map((e) => ({ e, d: distanceKm(nearLat, nearLng, e.lat, e.lng) }))
        .sort((a, b) => {
          if (a.d == null && b.d == null) return 0
          if (a.d == null) return 1
          if (b.d == null) return -1
          return a.d - b.d
        })
        .map(({ e, d }) => ({ ...e, _dist: d }))
    }

    const total = items.length
    const slice = items.slice((page - 1) * pageSize, page * pageSize)
    const serialized = slice.map((e) =>
      serializeBenefit(e, {
        favorite: favSet.has(String(e._id)),
        distanceKm: e._dist ?? null,
      }),
    )

    const cats = await Benefit.distinct('categoria', { tenantId, status: 'published' })

    res.json({
      items: serialized,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      categories: cats.filter(Boolean).sort(),
      ...benefitsMeta(),
      walletEnabled: (req.tenant.capabilities || []).includes('beneficios.billetera'),
      partnersEnabled: tenantHasPartners(req.tenant),
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
 * Body: { idempotencyKey? }
 * Canje con puntos (si costoPuntos>0) o solo código si es informativo.
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

    const userRedeemCount = await BenefitRedemption.countDocuments({
      tenantId: req.tenant._id,
      userId: req.user._id,
      benefitId: benefit._id,
      status: { $in: ['confirmed', 'used', 'pending'] },
    })
    const check = canRedeemBenefit(benefit.toObject(), { userRedeemCount })
    if (!check.ok) return res.status(400).json({ error: check.reason })

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

    const code = `CNX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const redemption = await BenefitRedemption.create({
      tenantId: req.tenant._id,
      benefitId: benefit._id,
      userId: req.user._id,
      code,
      status: 'confirmed',
      pointsSpent: costo,
      transactionId: txId,
      idempotencyKey,
    })

    benefit.redeemCount = Number(benefit.redeemCount || 0) + 1
    if (benefit.stock != null && Number.isFinite(benefit.stock)) {
      benefit.stock = Math.max(0, Number(benefit.stock) - 1)
    }
    await benefit.save()

    res.status(201).json({
      replay: false,
      redemption: {
        id: String(redemption._id),
        code: redemption.code,
        status: redemption.status,
        pointsSpent: redemption.pointsSpent,
        benefitId: String(benefit._id),
        /** Código presentable / QR local (sin proveedor externo) */
        qrPayload: `connectia:redeem:${redemption.code}`,
      },
      benefit: serializeBenefit(benefit.toObject()),
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
      item: serializeBenefit(doc, { favorite: Boolean(fav) }),
      walletEnabled,
      balance,
    })
  } catch (e) {
    next(e)
  }
})

export default router
