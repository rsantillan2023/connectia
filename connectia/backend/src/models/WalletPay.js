import crypto from 'crypto'
import mongoose from 'mongoose'

/**
 * Token de cobro QR de corta vida (no expone userId crudo como el legado).
 */
const walletPayTokenSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

walletPayTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
walletPayTokenSchema.index({ tenantId: 1, userId: 1 })

export const WalletPayToken = mongoose.model('WalletPayToken', walletPayTokenSchema)

/**
 * Cuentas propias para retiro (alias / CBU-CVU) — legado WithdrawCash.
 */
const walletWithdrawAccountSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: '', maxlength: 80 },
    alias: { type: String, default: '', maxlength: 80 },
    cbu: { type: String, default: '', maxlength: 32 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

walletWithdrawAccountSchema.index({ tenantId: 1, userId: 1, activo: 1 })

export const WalletWithdrawAccount = mongoose.model('WalletWithdrawAccount', walletWithdrawAccountSchema)

export function newPayTokenValue() {
  return crypto.randomBytes(16).toString('hex')
}

export function buildPayQrPayload(token) {
  return `connectia:pay:${token}`
}

export function parsePayQrPayload(raw) {
  const s = String(raw || '').trim()
  const m = /^connectia:pay:([a-f0-9]{32})$/i.exec(s)
  return m ? m[1].toLowerCase() : null
}

export function normalizeCbu(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 22)
}

export function normalizeAlias(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .slice(0, 80)
}
