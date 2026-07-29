import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Benefit, BenefitPartnerLink } from '../models/Benefit.js'
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
} from '../lib/benefits.js'
import { seedBenefitsForTenant } from '../lib/benefitsSeed.js'
import { postLedgerEntry } from '../lib/walletService.js'
import { MenuItem } from '../models/MenuItem.js'
import { Tenant } from '../models/Tenant.js'

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

router.get('/meta', async (_req, res) => {
  res.json(benefitsMeta())
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

    // Asegura ítems de menú U/A y caps mínimas en tenants ya existentes
    const menuDefs = [
      { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 59, channel: 'u' },
      {
        key: 'admin.beneficios',
        label: 'Beneficios y billetera',
        route: '/beneficios',
        icon: 'gift',
        order: 46.3,
        channel: 'a',
      },
    ]
    for (const item of menuDefs) {
      await MenuItem.findOneAndUpdate(
        { tenantId: req.tenant._id, key: item.key },
        { ...item, tenantId: req.tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
        { upsert: true },
      )
    }
    const caps = new Set(req.tenant.capabilities || [])
    caps.add('beneficios')
    caps.add('beneficios.billetera')
    await Tenant.updateOne({ _id: req.tenant._id }, { $set: { capabilities: [...caps] }, $inc: { menuVersion: 1 } })

    res.json({ ...result, menuUpserted: true, capabilities: [...caps] })
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
    const filter = { tenantId }
    if (kind === 'benefit' || kind === 'reward') filter.kind = kind
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status
    const search = buildBenefitSearchFilter(q)
    if (search) Object.assign(filter, search)

    const [items, areas, groups] = await Promise.all([
      Benefit.find(filter).sort({ orden: 1, titulo: 1 }).limit(400).lean(),
      OrgArea.find({ tenantId, activo: true }).select('_id nombre').lean(),
      UserGroup.find({ tenantId, activo: true }).select('_id nombre').lean(),
    ])

    const caps = req.tenant.capabilities || []
    res.json({
      items: items.map((d) => serializeBenefit(d)),
      ...benefitsMeta(),
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
    const redemptions = await BenefitRedemption.find({
      tenantId: req.tenant._id,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    const benefitIds = [...new Set(redemptions.map((r) => String(r.benefitId)))]
    const benefits = await Benefit.find({
      tenantId: req.tenant._id,
      _id: { $in: benefitIds.filter((id) => ObjectId.isValid(id)) },
    })
      .select('titulo kind')
      .lean()
    const byId = Object.fromEntries(benefits.map((b) => [String(b._id), b]))

    res.json({
      since,
      total: redemptions.length,
      items: redemptions.map((r) => ({
        id: String(r._id),
        code: r.code,
        status: r.status,
        pointsSpent: r.pointsSpent,
        userId: String(r.userId),
        benefitId: String(r.benefitId),
        benefitTitulo: byId[String(r.benefitId)]?.titulo || '',
        createdAt: r.createdAt,
      })),
    })
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

    const concept = String(body.concept || (amount > 0 ? 'Acreditación admin' : 'Ajuste admin')).slice(0, 240)
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
    const accounts = await WalletAccount.find({ tenantId: req.tenant._id, currency: 'POINTS' })
      .sort({ balance: -1 })
      .limit(100)
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
    res.json({ item: serializeBenefit(doc) })
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
    applyBenefitPatch(doc, body)
    if (body.status) doc.status = ['draft', 'published', 'archived'].includes(body.status)
      ? body.status
      : 'draft'
    doc.audience = audience
    await doc.save()
    res.status(201).json({ item: serializeBenefit(doc.toObject()) })
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
    applyBenefitPatch(doc, body)
    if (body.audience !== undefined) {
      const audience = await resolveAudienceIds(req.tenant._id, body.audience)
      if (audience.mode === 'users' && !audience.userIds.length) {
        return res.status(400).json({ error: 'Elegí al menos un destinatario puntual' })
      }
      doc.audience = audience
    }
    await doc.save()
    res.json({ item: serializeBenefit(doc.toObject()) })
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
    res.json({ item: serializeBenefit(doc.toObject()) })
  } catch (e) {
    next(e)
  }
})

export default router
