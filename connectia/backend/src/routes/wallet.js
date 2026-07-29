import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { WalletTransaction } from '../models/Wallet.js'
import {
  WalletPayToken,
  WalletWithdrawAccount,
  newPayTokenValue,
  buildPayQrPayload,
  parsePayQrPayload,
  normalizeCbu,
  normalizeAlias,
} from '../models/WalletPay.js'
import { serializeWalletTx } from '../lib/benefits.js'
import {
  getOrCreateWalletAccount,
  postLedgerEntry,
  requireWalletCapability,
} from '../lib/walletService.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const PAY_TTL_MS = 5 * 60 * 1000

router.use(requireAuth)

/** GET /api/wallet — saldo + últimos movimientos */
router.get('/', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 20))
    const filter = {
      tenantId: req.tenant._id,
      userId: req.user._id,
      status: { $in: ['confirmed', 'pending'] },
    }
    const [total, txs] = await Promise.all([
      WalletTransaction.countDocuments(filter),
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ])
    res.json({
      balance: acc.balance,
      currency: 'POINTS',
      items: txs.map(serializeWalletTx),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/** GET /api/wallet/points */
router.get('/points', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
    res.json({ balance: acc.balance, currency: 'POINTS' })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * POST /api/wallet/transfer
 * Body: { toUserId | toUsuario, amount, concept?, idempotencyKey }
 */
router.post('/transfer', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const body = req.body || {}
    const amount = Math.floor(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' })
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim()
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey obligatorio' })

    let toUser = null
    if (body.toUserId && ObjectId.isValid(body.toUserId)) {
      toUser = await User.findOne({ _id: body.toUserId, tenantId: req.tenant._id, activo: true })
    } else if (body.toUsuario) {
      toUser = await User.findOne({
        tenantId: req.tenant._id,
        usuario: String(body.toUsuario).trim().toLowerCase(),
        activo: true,
      })
    }
    if (!toUser) return res.status(404).json({ error: 'Destinatario no encontrado' })
    if (String(toUser._id) === String(req.user._id)) {
      return res.status(400).json({ error: 'No podés transferirte a vos mismo' })
    }

    const concept = String(body.concept || `Transferencia a ${toUser.nombre || toUser.usuario}`).slice(0, 240)

    const out = await postLedgerEntry({
      tenantId: req.tenant._id,
      userId: req.user._id,
      type: 'transfer_out',
      amount,
      concept,
      counterpartyUserId: toUser._id,
      idempotencyKey: `${idempotencyKey}:out`,
      createdBy: req.user._id,
    })

    if (!out.replay) {
      await postLedgerEntry({
        tenantId: req.tenant._id,
        userId: toUser._id,
        type: 'transfer_in',
        amount,
        concept: String(body.concept || `Transferencia de ${req.user.nombre || req.user.usuario}`).slice(
          0,
          240,
        ),
        counterpartyUserId: req.user._id,
        idempotencyKey: `${idempotencyKey}:in`,
        createdBy: req.user._id,
      })
    }

    const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
    res.json({
      replay: out.replay,
      balance: acc.balance,
      transaction: out.serialized,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) return res.status(409).json({ error: 'Operación duplicada' })
    next(e)
  }
})

/** GET /api/wallet/qr/mine — cobro: generar QR temporal (legado RecievePaymentQR) */
router.get('/qr/mine', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const token = newPayTokenValue()
    const expiresAt = new Date(Date.now() + PAY_TTL_MS)
    await WalletPayToken.create({
      tenantId: req.tenant._id,
      userId: req.user._id,
      token,
      expiresAt,
    })
    res.json({
      payload: buildPayQrPayload(token),
      expiresAt,
      ttlSec: Math.floor(PAY_TTL_MS / 1000),
      displayName: [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario,
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * POST /api/wallet/qr/pay — pagar escaneando QR (legado PaymentQR)
 * Body: { payload, amount, idempotencyKey }
 */
router.post('/qr/pay', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const body = req.body || {}
    const token = parsePayQrPayload(body.payload)
    if (!token) return res.status(400).json({ error: 'QR inválido' })
    const amount = Math.floor(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' })
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim()
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey obligatorio' })

    const payTok = await WalletPayToken.findOne({
      tenantId: req.tenant._id,
      token,
      expiresAt: { $gt: new Date() },
    })
    if (!payTok) return res.status(410).json({ error: 'QR vencido o inexistente' })
    if (String(payTok.userId) === String(req.user._id)) {
      return res.status(400).json({ error: 'No podés pagarte a vos mismo' })
    }

    const toUser = await User.findOne({
      _id: payTok.userId,
      tenantId: req.tenant._id,
      activo: true,
    })
    if (!toUser) return res.status(404).json({ error: 'Destinatario no encontrado' })

    const out = await postLedgerEntry({
      tenantId: req.tenant._id,
      userId: req.user._id,
      type: 'transfer_out',
      amount,
      concept: `Pago QR a ${toUser.nombre || toUser.usuario}`,
      counterpartyUserId: toUser._id,
      idempotencyKey: `${idempotencyKey}:out`,
      createdBy: req.user._id,
      meta: { via: 'qr' },
    })

    if (!out.replay) {
      await postLedgerEntry({
        tenantId: req.tenant._id,
        userId: toUser._id,
        type: 'transfer_in',
        amount,
        concept: `Cobro QR de ${req.user.nombre || req.user.usuario}`,
        counterpartyUserId: req.user._id,
        idempotencyKey: `${idempotencyKey}:in`,
        createdBy: req.user._id,
        meta: { via: 'qr' },
      })
      // un solo uso del token
      await WalletPayToken.deleteOne({ _id: payTok._id })
    }

    const acc = await getOrCreateWalletAccount(req.tenant._id, req.user._id)
    res.json({
      replay: out.replay,
      balance: acc.balance,
      transaction: out.serialized,
      toUser: {
        id: String(toUser._id),
        nombre: [toUser.nombre, toUser.apellido].filter(Boolean).join(' ') || toUser.usuario,
      },
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) return res.status(409).json({ error: 'Operación duplicada' })
    next(e)
  }
})

/** Cuentas de retiro */
router.get('/withdraw-accounts', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const items = await WalletWithdrawAccount.find({
      tenantId: req.tenant._id,
      userId: req.user._id,
      activo: true,
    })
      .sort({ createdAt: -1 })
      .lean()
    res.json({
      items: items.map((a) => ({
        id: String(a._id),
        label: a.label || '',
        alias: a.alias || '',
        cbu: a.cbu || '',
      })),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

router.post('/withdraw-accounts', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const body = req.body || {}
    const alias = normalizeAlias(body.alias)
    const cbu = normalizeCbu(body.cbu)
    if (!alias && cbu.length < 22) {
      return res.status(400).json({ error: 'Indicá alias o CBU/CVU (22 dígitos)' })
    }
    const doc = await WalletWithdrawAccount.create({
      tenantId: req.tenant._id,
      userId: req.user._id,
      label: String(body.label || alias || `CBU …${cbu.slice(-4)}`).slice(0, 80),
      alias,
      cbu,
      activo: true,
    })
    res.status(201).json({
      item: {
        id: String(doc._id),
        label: doc.label,
        alias: doc.alias,
        cbu: doc.cbu,
      },
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    next(e)
  }
})

/**
 * POST /api/wallet/withdraw — solicitud de retiro (legado WithdrawCash)
 * Débito inmediato en estado pending (reserva fondos; conciliación externa diferida).
 */
router.post('/withdraw', async (req, res, next) => {
  try {
    requireWalletCapability(req.tenant)
    const body = req.body || {}
    const amount = Math.floor(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' })
    }
    const idempotencyKey = String(body.idempotencyKey || req.headers['idempotency-key'] || '').trim()
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey obligatorio' })

    let account = null
    if (body.accountId && ObjectId.isValid(body.accountId)) {
      account = await WalletWithdrawAccount.findOne({
        _id: body.accountId,
        tenantId: req.tenant._id,
        userId: req.user._id,
        activo: true,
      })
    }
    const alias = normalizeAlias(body.alias || account?.alias)
    const cbu = normalizeCbu(body.cbu || account?.cbu)
    if (!alias && cbu.length < 22) {
      return res.status(400).json({ error: 'Indicá cuenta, alias o CBU/CVU' })
    }

    const dest = alias || `CBU …${cbu.slice(-4)}`
    const posted = await postLedgerEntry({
      tenantId: req.tenant._id,
      userId: req.user._id,
      type: 'withdraw',
      amount,
      concept: `Retiro a ${dest}`,
      idempotencyKey,
      createdBy: req.user._id,
      status: 'pending',
      meta: { alias, cbu, accountId: account ? String(account._id) : null },
    })

    res.status(202).json({
      replay: posted.replay,
      status: 'pending',
      balance: posted.account.balance,
      transaction: posted.serialized,
      note: 'Retiro registrado. La acreditación bancaria queda sujeta a conciliación del tenant.',
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    if (e?.code === 11000) return res.status(409).json({ error: 'Operación duplicada' })
    next(e)
  }
})

export default router
