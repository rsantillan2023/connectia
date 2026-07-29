import { WalletAccount, WalletTransaction } from '../models/Wallet.js'
import { applyLedgerEntry, applyAdjust, serializeWalletTx } from './benefits.js'

/**
 * Obtiene o crea la cuenta POINTS del usuario.
 */
export async function getOrCreateWalletAccount(tenantId, userId, session = null) {
  const q = { tenantId, userId, currency: 'POINTS' }
  let acc = await WalletAccount.findOne(q).session(session || null)
  if (!acc) {
    try {
      const created = await WalletAccount.create([{ ...q, balance: 0 }], session ? { session } : undefined)
      acc = created[0]
    } catch (e) {
      if (e?.code === 11000) {
        acc = await WalletAccount.findOne(q).session(session || null)
      } else throw e
    }
  }
  return acc
}

/**
 * Registra un asiento idempotente y actualiza balance de la cuenta.
 * Si la clave ya existe, devuelve el movimiento original (sin duplicar).
 */
export async function postLedgerEntry({
  tenantId,
  userId,
  type,
  amount,
  signedAmount: signedOverride,
  concept = '',
  benefitId = null,
  counterpartyUserId = null,
  idempotencyKey,
  createdBy = null,
  meta,
  status = 'confirmed',
  session = null,
}) {
  const key = String(idempotencyKey || '').trim()
  if (!key) {
    const err = new Error('idempotencyKey obligatorio')
    err.status = 400
    throw err
  }

  const existing = await WalletTransaction.findOne({ tenantId, idempotencyKey: key }).session(session || null)
  if (existing) {
    const acc = await WalletAccount.findById(existing.accountId).session(session || null)
    return {
      replay: true,
      transaction: existing,
      account: acc,
      serialized: serializeWalletTx(existing.toObject ? existing.toObject() : existing),
    }
  }

  const acc = await getOrCreateWalletAccount(tenantId, userId, session)
  let signedAmount
  let balanceAfter
  if (type === 'adjust' && signedOverride != null) {
    ;({ signedAmount, balanceAfter } = applyAdjust(acc.balance, signedOverride))
  } else {
    ;({ signedAmount, balanceAfter } = applyLedgerEntry(acc.balance, type, amount))
  }

  const absAmount = Math.abs(signedAmount)
  const txStatus = ['pending', 'confirmed', 'failed', 'reversed'].includes(status) ? status : 'confirmed'
  const [tx] = await WalletTransaction.create(
    [
      {
        tenantId,
        accountId: acc._id,
        userId,
        type,
        status: txStatus,
        amount: absAmount,
        signedAmount,
        balanceAfter,
        currency: 'POINTS',
        concept: String(concept || '').slice(0, 240),
        benefitId,
        counterpartyUserId,
        idempotencyKey: key,
        createdBy,
        meta,
      },
    ],
    session ? { session } : undefined,
  )

  // Reserva fondos también en pending (retiro)
  acc.balance = balanceAfter
  await acc.save(session ? { session } : undefined)

  return {
    replay: false,
    transaction: tx,
    account: acc,
    serialized: serializeWalletTx(tx.toObject ? tx.toObject() : tx),
  }
}

export function tenantHasWallet(tenant) {
  const caps = tenant?.capabilities || []
  return caps.includes('beneficios.billetera') || caps.includes('beneficios')
}

export function tenantHasPartners(tenant) {
  const caps = tenant?.capabilities || []
  return caps.includes('beneficios.partners')
}

export function tenantHasBenefits(tenant) {
  const caps = tenant?.capabilities || []
  // Si no hay caps explícitas de beneficios, permitir catálogo (menú basta);
  // billetera sí exige flag dedicado.
  return true
}

export function requireWalletCapability(tenant) {
  const caps = tenant?.capabilities || []
  if (!caps.includes('beneficios.billetera')) {
    const err = new Error('Billetera/puntos no habilitada en esta comunidad')
    err.status = 403
    throw err
  }
}
