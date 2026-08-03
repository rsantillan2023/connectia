import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Benefit, BenefitPartnerLink, BenefitCode, BenefitWaitlist } from '../models/Benefit.js'
import { BenefitRedemption, WalletAccount } from '../models/Wallet.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { User } from '../models/User.js'
import { normalizeAudience } from '../lib/audience.js'
import {
  serializeBenefit,
  serializePartnerLink,
  benefitsMeta,
  buildBenefitSearchFilter,
  applyBenefitPatch,
  inferOfferType,
  simulateBenefitEligibility,
  normalizeBenefitsConfig,
  resolveOfferTypes,
  normalizeCategory,
  resolveCategories,
  normalizeCategoriesInput,
  DAY_LABELS,
} from '../lib/benefits.js'
import { seedBenefitsForTenant, seedPartnersForTenant } from '../lib/benefitsSeed.js'
import { postLedgerEntry } from '../lib/walletService.js'
import { MenuItem } from '../models/MenuItem.js'
import { Tenant } from '../models/Tenant.js'
import { draftBenefitCopy, benefitsAiConfigured } from '../services/benefitsAi.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId

router.use(requireAuth, requireCapability('admin.beneficios'))

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
    userIds.length
      ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id')
      : [],
  ])

  return {
    mode: a.mode,
    areaIds: a.mode === 'restricted' ? areas.map((x) => x._id) : [],
    groupIds: a.mode === 'restricted' ? groups.map((x) => x._id) : [],
    userIds: users.map((x) => x._id),
  }
}

function mapAudienceCandidate(u) {
  return {
    id: String(u._id),
    usuario: u.usuario || '',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    areaId: u.areaId ? String(u.areaId) : null,
    label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
  }
}

router.get('/meta', async (req, res) => {
  res.json(benefitsMeta(req.tenant))
})

/** Nombres visibles de tipología (por comunidad) */
router.get('/offer-types', async (req, res) => {
  res.json({
    items: resolveOfferTypes(req.tenant),
    benefitsConfig: normalizeBenefitsConfig(req.tenant?.benefitsConfig),
  })
})

router.put('/offer-types', async (req, res, next) => {
  try {
    const prev = req.tenant.benefitsConfig || {}
    const normalized = normalizeBenefitsConfig({
      ...prev,
      offerTypes: req.body?.offerTypes ?? req.body,
    })
    req.tenant.benefitsConfig = normalized
    await Tenant.updateOne(
      { _id: req.tenant._id },
      { $set: { benefitsConfig: normalized } },
    )
    res.json({
      items: resolveOfferTypes(req.tenant),
      benefitsConfig: normalized,
    })
  } catch (e) {
    next(e)
  }
})

/** Categorías del catálogo (CRUD por comunidad) */
router.get('/categories', async (req, res) => {
  res.json({
    items: resolveCategories(req.tenant),
    benefitsConfig: normalizeBenefitsConfig(req.tenant?.benefitsConfig),
  })
})

router.put('/categories', async (req, res, next) => {
  try {
    const prev = req.tenant.benefitsConfig || {}
    const list = req.body?.categories ?? req.body?.items ?? req.body
    const normalized = normalizeBenefitsConfig({
      ...prev,
      categories: normalizeCategoriesInput(list),
    })
    req.tenant.benefitsConfig = normalized
    await Tenant.updateOne(
      { _id: req.tenant._id },
      { $set: { benefitsConfig: normalized } },
    )
    res.json({
      items: resolveCategories(req.tenant),
      benefitsConfig: normalized,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/audience-candidates', async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .slice(0, 100)
      .map((id) => new ObjectId(id))

    if (ids.length) {
      const items = await User.find({ tenantId: req.tenant._id, _id: { $in: ids } })
        .select('_id usuario nombre apellido email areaId')
        .lean()
      return res.json({ items: items.map(mapAudienceCandidate) })
    }

    const q = String(req.query.q || '').trim()
    const filter = { tenantId: req.tenant._id, activo: true }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ usuario: rx }, { nombre: rx }, { apellido: rx }, { email: rx }]
    }
    const items = await User.find(filter)
      .select('_id usuario nombre apellido email areaId')
      .sort({ nombre: 1, apellido: 1, usuario: 1 })
      .limit(40)
      .lean()
    res.json({ items: items.map(mapAudienceCandidate) })
  } catch (e) {
    next(e)
  }
})

router.post('/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedBenefitsForTenant(req.tenant._id, {
      brandName: req.tenant.nombre || 'la empresa',
    })

    let menuUpserted = false
    let capabilities = [...(req.tenant.capabilities || [])]
    try {
      const menuDefs = [
        { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 59, channel: 'u' },
        {
          key: 'beneficios.earn',
          label: 'Cómo sumar puntos',
          route: '/beneficios?tab=earn',
          icon: 'sparkles',
          order: 59.1,
          channel: 'u',
        },
        {
          key: 'admin.beneficios',
          label: 'Beneficios',
          route: '/beneficios',
          icon: 'gift',
          order: 46,
          channel: 'a',
        },
      ]
      for (const item of menuDefs) {
        await MenuItem.findOneAndUpdate(
          { tenantId: req.tenant._id, key: item.key },
          {
            $set: {
              ...item,
              tenantId: req.tenant._id,
              activo: true,
              audience: { roles: [], capabilities: [] },
            },
          },
          { upsert: true },
        )
      }
      menuUpserted = true
      const caps = new Set(capabilities)
      caps.add('beneficios')
      caps.add('beneficios.billetera')
      capabilities = [...caps]
      await Tenant.updateOne(
        { _id: req.tenant._id },
        { $set: { capabilities }, $inc: { menuVersion: 1 } },
      )
      req.tenant.capabilities = capabilities
    } catch (menuErr) {
      console.warn('[benefits] seed-defaults menu/caps:', menuErr?.message || menuErr)
    }

    res.json({ ...result, menuUpserted, capabilities })
  } catch (e) {
    next(e)
  }
})

/** GET / — listado admin */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const q = String(req.query.q || '').trim()
    const kind = String(req.query.kind || '').trim()
    const status = String(req.query.status || '').trim()
    const offerType = String(req.query.offerType || '').trim()
    const categoria = String(req.query.categoria || '').trim()
    const destacado = String(req.query.destacado || '').trim().toLowerCase()
    const filter = { tenantId }
    if (kind === 'benefit' || kind === 'reward') filter.kind = kind
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    if (categoria) {
      const allowed = resolveCategories(req.tenant)
      if (allowed.some((c) => c.id === categoria)) filter.categoria = categoria
    }
    if (destacado === '1' || destacado === 'true') filter.destacado = true
    else if (destacado === '0' || destacado === 'false') filter.destacado = false
    const search = buildBenefitSearchFilter(q)
    if (search) Object.assign(filter, search)

    const [items, areas, groups] = await Promise.all([
      Benefit.find(filter).sort({ orden: 1, titulo: 1 }).limit(400).lean(),
      OrgArea.find({ tenantId, activo: true }).select('_id nombre').lean(),
      UserGroup.find({ tenantId, activo: true }).select('_id nombre').lean(),
    ])

    const list = ['informativo', 'canjeable', 'premio', 'geo', 'partner'].includes(offerType)
      ? items.filter((d) => inferOfferType(d) === offerType)
      : items

    const caps = req.tenant.capabilities || []
    res.json({
      items: list.map((d) => serializeBenefit(d, { tenant: req.tenant })),
      ...benefitsMeta(req.tenant),
      walletEnabled: caps.includes('beneficios.billetera'),
      partnersEnabled: caps.includes('beneficios.partners'),
      org: {
        areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre })),
        groups: groups.map((g) => ({ id: String(g._id), nombre: g.nombre })),
      },
    })
  } catch (e) {
    next(e)
  }
})

/** Reporte de canjes */
router.get('/report', async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 30 * 864e5)
    const locationName = String(req.query.location || '').trim().toLowerCase()
    const day = String(req.query.day || '').trim() // YYYY-MM-DD
    const filter = {
      tenantId: req.tenant._id,
      createdAt: { $gte: since },
    }
    if (day) {
      const start = new Date(`${day}T00:00:00`)
      const end = new Date(`${day}T23:59:59.999`)
      if (!Number.isNaN(start.getTime())) {
        filter.createdAt = { $gte: start, $lte: end }
      }
    }
    if (locationName) {
      filter.locationName = new RegExp(escapeRegex(locationName), 'i')
    }
    const redemptions = await BenefitRedemption.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    const benefitIds = [...new Set(redemptions.map((r) => String(r.benefitId)))]
    const userIds = [
      ...new Set(redemptions.map((r) => String(r.userId)).filter((id) => ObjectId.isValid(id))),
    ]
    const [benefits, users] = await Promise.all([
      Benefit.find({
        tenantId: req.tenant._id,
        _id: { $in: benefitIds.filter((id) => ObjectId.isValid(id)) },
      })
        .select('titulo kind')
        .lean(),
      User.find({
        tenantId: req.tenant._id,
        _id: { $in: userIds.map((id) => new ObjectId(id)) },
      })
        .select('_id usuario nombre apellido')
        .lean(),
    ])
    const byId = Object.fromEntries(benefits.map((b) => [String(b._id), b]))
    const userById = Object.fromEntries(users.map((u) => [String(u._id), u]))

    const byLocation = {}
    const byDow = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const r of redemptions) {
      const loc = r.locationName || 'Sin sucursal'
      byLocation[loc] = (byLocation[loc] || 0) + 1
      const d = new Date(r.createdAt).getDay()
      byDow[d] = (byDow[d] || 0) + 1
    }

    res.json({
      since,
      total: redemptions.length,
      byLocation: Object.entries(byLocation).map(([name, count]) => ({ name, count })),
      byDayOfWeek: Object.entries(byDow).map(([d, count]) => ({
        day: Number(d),
        label: DAY_LABELS[Number(d)],
        count,
      })),
      items: redemptions.map((r) => {
        const u = userById[String(r.userId)]
        const nombre = [u?.nombre, u?.apellido].filter(Boolean).join(' ')
        return {
          id: String(r._id),
          code: r.code,
          status: r.status,
          pointsSpent: r.pointsSpent,
          userId: String(r.userId),
          usuario: u?.usuario || '',
          userLabel: nombre || u?.usuario || String(r.userId),
          benefitId: String(r.benefitId),
          benefitTitulo: byId[String(r.benefitId)]?.titulo || '',
          locationId: r.locationId || '',
          locationName: r.locationName || '',
          createdAt: r.createdAt,
        }
      }),
    })
  } catch (e) {
    next(e)
  }
})

/** Acciones pendientes: canjes a aprobar + lista de espera */
router.get('/attention', async (req, res, next) => {
  try {
    const tenantId = req.tenant._id
    const [pendingRaws, waitRaws] = await Promise.all([
      BenefitRedemption.find({ tenantId, status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      BenefitWaitlist.find({ tenantId, status: { $in: ['waiting', 'notified'] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ])

    const benefitIds = [
      ...new Set(
        [...pendingRaws, ...waitRaws]
          .map((r) => String(r.benefitId))
          .filter((id) => ObjectId.isValid(id)),
      ),
    ]
    const userIds = [
      ...new Set(
        [...pendingRaws, ...waitRaws]
          .map((r) => String(r.userId))
          .filter((id) => ObjectId.isValid(id)),
      ),
    ]
    const [benefits, users] = await Promise.all([
      benefitIds.length
        ? Benefit.find({ tenantId, _id: { $in: benefitIds } })
            .select('titulo')
            .lean()
        : [],
      userIds.length
        ? User.find({ tenantId, _id: { $in: userIds.map((id) => new ObjectId(id)) } })
            .select('_id usuario nombre apellido')
            .lean()
        : [],
    ])
    const benefitById = Object.fromEntries(benefits.map((b) => [String(b._id), b]))
    const userById = Object.fromEntries(users.map((u) => [String(u._id), u]))
    const mapUser = (id) => {
      const u = userById[String(id)]
      const nombre = [u?.nombre, u?.apellido].filter(Boolean).join(' ')
      return {
        userId: String(id),
        usuario: u?.usuario || '',
        userLabel: nombre || u?.usuario || String(id),
      }
    }

    const pendingRedemptions = pendingRaws.map((r) => ({
      id: String(r._id),
      kind: 'redemption',
      code: r.code,
      status: r.status,
      pointsSpent: r.pointsSpent,
      benefitId: String(r.benefitId),
      benefitTitulo: benefitById[String(r.benefitId)]?.titulo || '',
      locationName: r.locationName || '',
      createdAt: r.createdAt,
      ...mapUser(r.userId),
    }))
    const waitlist = waitRaws.map((w) => ({
      id: String(w._id),
      kind: 'waitlist',
      status: w.status,
      benefitId: String(w.benefitId),
      benefitTitulo: benefitById[String(w.benefitId)]?.titulo || '',
      note: w.note || '',
      createdAt: w.createdAt,
      ...mapUser(w.userId),
    }))

    res.json({
      pendingRedemptions,
      waitlist,
      attentionCount: pendingRedemptions.length + waitlist.length,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/redemptions/:id/approve', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await BenefitRedemption.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: 'pending',
    })
    if (!doc) return res.status(404).json({ error: 'Canje pendiente no encontrado' })
    doc.status = 'confirmed'
    await doc.save()
    res.json({ ok: true, id: String(doc._id), status: doc.status })
  } catch (e) {
    next(e)
  }
})

router.post('/redemptions/:id/cancel', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await BenefitRedemption.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: { $in: ['pending', 'confirmed'] },
    })
    if (!doc) return res.status(404).json({ error: 'Canje no encontrado' })
    doc.status = 'cancelled'
    await doc.save()
    res.json({ ok: true, id: String(doc._id), status: doc.status })
  } catch (e) {
    next(e)
  }
})

router.post('/waitlist/:id/fulfill', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await BenefitWaitlist.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: { $in: ['waiting', 'notified'] },
    })
    if (!doc) return res.status(404).json({ error: 'Entrada no encontrada' })
    doc.status = 'fulfilled'
    await doc.save()
    res.json({ ok: true, id: String(doc._id), status: doc.status })
  } catch (e) {
    next(e)
  }
})

router.post('/waitlist/:id/cancel', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await BenefitWaitlist.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
      status: { $in: ['waiting', 'notified'] },
    })
    if (!doc) return res.status(404).json({ error: 'Entrada no encontrada' })
    doc.status = 'cancelled'
    await doc.save()
    res.json({ ok: true, id: String(doc._id), status: doc.status })
  } catch (e) {
    next(e)
  }
})

/** Export CSV de canjes */
router.get('/export', async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 90 * 864e5)
    const redemptions = await BenefitRedemption.find({
      tenantId: req.tenant._id,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()
    const benefitIds = [...new Set(redemptions.map((r) => String(r.benefitId)))]
    const benefits = await Benefit.find({
      tenantId: req.tenant._id,
      _id: { $in: benefitIds.filter((id) => ObjectId.isValid(id)) },
    })
      .select('titulo')
      .lean()
    const byId = Object.fromEntries(benefits.map((b) => [String(b._id), b.titulo || '']))
    const rows = [
      ['id', 'code', 'status', 'points', 'benefit', 'location', 'userId', 'createdAt'].join(','),
      ...redemptions.map((r) =>
        [
          r._id,
          r.code,
          r.status,
          r.pointsSpent,
          JSON.stringify(byId[String(r.benefitId)] || ''),
          JSON.stringify(r.locationName || ''),
          r.userId,
          r.createdAt?.toISOString?.() || '',
        ].join(','),
      ),
    ]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="beneficios-canjes.csv"')
    res.send(rows.join('\n'))
  } catch (e) {
    next(e)
  }
})

router.get('/ai-status', async (_req, res) => {
  res.json({ configured: benefitsAiConfigured() })
})

router.post('/ai-draft', async (req, res, next) => {
  try {
    const body = req.body || {}
    const draft = await draftBenefitCopy({
      prompt: body.prompt || body.text || '',
      offerType: body.offerType || '',
      brand: req.tenant.nombre || 'la comunidad',
      tenant: req.tenant,
      findImage: body.findImage !== false,
    })
    res.json({ draft })
  } catch (e) {
    next(e)
  }
})

/** Simulador de elegibilidad */
router.post('/simulate', async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.benefitId || !ObjectId.isValid(body.benefitId)) {
      return res.status(400).json({ error: 'benefitId obligatorio' })
    }
    const benefit = await Benefit.findOne({ _id: body.benefitId, tenantId: req.tenant._id }).lean()
    if (!benefit) return res.status(404).json({ error: 'No encontrado' })
    let user = { sede: String(body.sede || '').trim() }
    if (body.userId && ObjectId.isValid(body.userId)) {
      const u = await User.findOne({ _id: body.userId, tenantId: req.tenant._id }).lean()
      if (u) user = u
    }
    const now = body.now ? new Date(body.now) : new Date()
    const result = simulateBenefitEligibility(benefit, {
      user,
      userRedeemCount: Number(body.userRedeemCount) || 0,
      userRedeemCountDay: Number(body.userRedeemCountDay) || 0,
      userRedeemCountWeek: Number(body.userRedeemCountWeek) || 0,
      userRedeemCountMonth: Number(body.userRedeemCountMonth) || 0,
      locationId: String(body.locationId || ''),
      now,
    })
    res.json({ result, benefit: serializeBenefit(benefit, { tenant: req.tenant }) })
  } catch (e) {
    next(e)
  }
})

/** Publicar programados vencidos */
router.post('/publish-scheduled', async (req, res, next) => {
  try {
    const now = new Date()
    const r = await Benefit.updateMany(
      {
        tenantId: req.tenant._id,
        status: 'draft',
        scheduledPublishAt: { $ne: null, $lte: now },
      },
      { $set: { status: 'published' } },
    )
    res.json({ published: r.modifiedCount || 0 })
  } catch (e) {
    next(e)
  }
})

/** Partners CRUD */
router.get('/partners', async (req, res, next) => {
  try {
    const items = await BenefitPartnerLink.find({ tenantId: req.tenant._id })
      .sort({ orden: 1, titulo: 1 })
      .lean()
    res.json({ items: items.map(serializePartnerLink) })
  } catch (e) {
    next(e)
  }
})

router.post('/partners/seed-defaults', async (req, res, next) => {
  try {
    const result = await seedPartnersForTenant(req.tenant._id, {
      brandName: req.tenant.nombre || 'la empresa',
    })
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/partners', async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    const url = String(body.url || '').trim()
    if (!titulo || !url) return res.status(400).json({ error: 'titulo y url obligatorios' })
    const doc = await BenefitPartnerLink.create({
      tenantId: req.tenant._id,
      titulo: titulo.slice(0, 120),
      descripcion: String(body.descripcion || '').slice(0, 400),
      url: url.slice(0, 500),
      imageUrl: String(body.imageUrl || '').slice(0, 500),
      orden: Number(body.orden) || 100,
      activo: body.activo !== false,
    })
    res.status(201).json({ item: serializePartnerLink(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.patch('/partners/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await BenefitPartnerLink.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    if (body.titulo !== undefined) doc.titulo = String(body.titulo || '').trim().slice(0, 120)
    if (body.descripcion !== undefined) doc.descripcion = String(body.descripcion || '').slice(0, 400)
    if (body.url !== undefined) doc.url = String(body.url || '').trim().slice(0, 500)
    if (body.imageUrl !== undefined) doc.imageUrl = String(body.imageUrl || '').slice(0, 500)
    if (body.orden !== undefined) doc.orden = Number(body.orden) || 100
    if (body.activo !== undefined) doc.activo = Boolean(body.activo)
    await doc.save()
    res.json({ item: serializePartnerLink(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

router.delete('/partners/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const r = await BenefitPartnerLink.deleteOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!r.deletedCount) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /credit — acreditar / ajustar puntos a un usuario
 * Body: { userId, amount, concept?, idempotencyKey } — amount >0 crédito, <0 débito admin
 */
router.post('/credit', async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.userId || !ObjectId.isValid(body.userId)) {
      return res.status(400).json({ error: 'userId obligatorio' })
    }
    const user = await User.findOne({ _id: body.userId, tenantId: req.tenant._id, activo: true })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'amount inválido' })
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim()
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey obligatorio' })

    const concept = String(body.concept || '').trim().slice(0, 240)
    if (concept.length < 3) {
      return res.status(400).json({ error: 'Motivo obligatorio (mín. 3 caracteres)' })
    }
    const posted = await postLedgerEntry({
      tenantId: req.tenant._id,
      userId: user._id,
      type: amount > 0 ? 'credit' : 'adjust',
      amount: Math.abs(amount),
      signedAmount: amount < 0 ? amount : undefined,
      concept,
      idempotencyKey,
      createdBy: req.user._id,
    })

    res.json({
      replay: posted.replay,
      balance: posted.account.balance,
      transaction: posted.serialized,
      user: {
        id: String(user._id),
        usuario: user.usuario,
        nombre: [user.nombre, user.apellido].filter(Boolean).join(' '),
      },
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) return res.status(409).json({ error: 'Operación duplicada' })
    next(e)
  }
})

/** Saldos de billetera (resumen) */
router.get('/wallets', async (req, res, next) => {
  try {
    const limitRaw = Number(req.query?.limit)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 2000) : 500
    const accounts = await WalletAccount.find({ tenantId: req.tenant._id, currency: 'POINTS' })
      .sort({ balance: -1 })
      .limit(limit)
      .lean()
    const userIds = accounts.map((a) => a.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id usuario nombre apellido')
      .lean()
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]))
    res.json({
      items: accounts.map((a) => {
        const u = byId[String(a.userId)]
        return {
          userId: String(a.userId),
          usuario: u?.usuario || '',
          nombre: [u?.nombre, u?.apellido].filter(Boolean).join(' ') || '',
          balance: a.balance,
        }
      }),
      total: accounts.length,
      limit,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    res.json({ item: serializeBenefit(doc, { tenant: req.tenant }) })
  } catch (e) {
    next(e)
  }
})

/** Duplicar beneficio */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const src = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean()
    if (!src) return res.status(404).json({ error: 'No encontrado' })
    const { _id, createdAt, updatedAt, redeemCount, ...rest } = src
    const doc = await Benefit.create({
      ...rest,
      titulo: `${src.titulo} (copia)`.slice(0, 160),
      status: 'draft',
      redeemCount: 0,
      scheduledPublishAt: null,
      authorId: req.user._id,
      authorName: [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario,
      locations: (src.locations || []).map((l, i) => ({
        ...l,
        id: `loc-${i}-${Date.now()}`,
        redeemCount: 0,
      })),
    })
    res.status(201).json({ item: serializeBenefit(doc.toObject(), { tenant: req.tenant }) })
  } catch (e) {
    next(e)
  }
})

/** Cargar lote de códigos */
router.post('/:id/codes', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const benefit = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!benefit) return res.status(404).json({ error: 'No encontrado' })
    const raw = Array.isArray(req.body?.codes)
      ? req.body.codes
      : String(req.body?.text || '')
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
    const codes = [...new Set(raw.map((c) => String(c).trim().slice(0, 64)).filter(Boolean))].slice(0, 2000)
    if (!codes.length) return res.status(400).json({ error: 'Sin códigos' })
    let created = 0
    let skipped = 0
    for (const code of codes) {
      try {
        await BenefitCode.create({
          tenantId: req.tenant._id,
          benefitId: benefit._id,
          code,
          status: 'available',
        })
        created += 1
      } catch {
        skipped += 1
      }
    }
    res.status(201).json({ created, skipped, total: codes.length })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/codes', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const items = await BenefitCode.find({ tenantId: req.tenant._id, benefitId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
    res.json({
      items: items.map((c) => ({
        id: String(c._id),
        code: c.code,
        status: c.status,
        assignedTo: c.assignedTo ? String(c.assignedTo) : null,
      })),
      available: items.filter((c) => c.status === 'available').length,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim()
    if (!titulo) return res.status(400).json({ error: 'titulo obligatorio' })

    const audience = await resolveAudienceIds(req.tenant._id, body.audience)
    if (audience.mode === 'users' && !audience.userIds.length) {
      return res.status(400).json({ error: 'Elegí al menos un destinatario puntual' })
    }

    const doc = new Benefit({
      tenantId: req.tenant._id,
      titulo,
      status: 'draft',
      audience,
      authorId: req.user._id,
      authorName: [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario,
    })
    applyBenefitPatch(doc, body, { tenant: req.tenant })
    if (body.status) doc.status = ['draft', 'published', 'archived'].includes(body.status)
      ? body.status
      : 'draft'
    doc.audience = audience
    await doc.save()
    res.status(201).json({ item: serializeBenefit(doc.toObject(), { tenant: req.tenant }) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    const body = req.body || {}
    applyBenefitPatch(doc, body, { tenant: req.tenant })
    if (body.audience !== undefined) {
      const audience = await resolveAudienceIds(req.tenant._id, body.audience)
      if (audience.mode === 'users' && !audience.userIds.length) {
        return res.status(400).json({ error: 'Elegí al menos un destinatario puntual' })
      }
      doc.audience = audience
    }
    await doc.save()
    res.json({ item: serializeBenefit(doc.toObject(), { tenant: req.tenant }) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'No encontrado' })
    const doc = await Benefit.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc) return res.status(404).json({ error: 'No encontrado' })
    doc.status = 'archived'
    await doc.save()
    res.json({ item: serializeBenefit(doc.toObject(), { tenant: req.tenant }) })
  } catch (e) {
    next(e)
  }
})

export default router
