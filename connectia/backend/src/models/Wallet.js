import mongoose from 'mongoose'

/**
 * Cuenta de billetera por usuario+tenant.
 * El saldo mostrado deriva de WalletTransaction (balanceAfter del último confirmed);
 * se cachea en `balance` solo como proyección — toda mutación crea asiento.
 */
const walletAccountSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currency: { type: String, default: 'POINTS', maxlength: 16 },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

walletAccountSchema.index({ tenantId: 1, userId: 1, currency: 1 }, { unique: true })

export const WalletAccount = mongoose.model('WalletAccount', walletAccountSchema)

/**
 * Ledger inmutable de movimientos.
 */
const walletTransactionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletAccount', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['credit', 'debit', 'redeem', 'transfer_out', 'transfer_in', 'adjust', 'withdraw'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'reversed'],
      default: 'confirmed',
      index: true,
    },
    /** Magnitud absoluta */
    amount: { type: Number, required: true, min: 0 },
    signedAmount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    currency: { type: String, default: 'POINTS' },
    concept: { type: String, default: '', maxlength: 240 },
    benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit', default: null },
    counterpartyUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Clave de idempotencia — única por tenant */
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 120 },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

walletTransactionSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true })
walletTransactionSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })

export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema)

/**
 * Canje de beneficio (código / QR local — sin proveedor externo).
 */
const benefitRedemptionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true, trim: true, maxlength: 32 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'used', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    pointsSpent: { type: Number, default: 0 },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletTransaction', default: null },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true },
)

benefitRedemptionSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true })
benefitRedemptionSchema.index({ tenantId: 1, userId: 1, benefitId: 1, createdAt: -1 })
benefitRedemptionSchema.index({ tenantId: 1, code: 1 }, { unique: true })

export const BenefitRedemption = mongoose.model('BenefitRedemption', benefitRedemptionSchema)
