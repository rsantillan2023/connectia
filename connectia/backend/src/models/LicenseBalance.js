import mongoose from 'mongoose'

/** Saldo anual por usuario y tipo de licencia. */
const licenseBalanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tipoKey: { type: String, required: true, trim: true, lowercase: true },
    anio: { type: Number, required: true },
    /** Si null, se usa diasAnualesDefault del tipo. */
    devengados: { type: Number, default: null },
    ajuste: { type: Number, default: 0 },
    notas: { type: String, default: '' },
  },
  { timestamps: true },
)

licenseBalanceSchema.index({ tenantId: 1, userId: 1, tipoKey: 1, anio: 1 }, { unique: true })

export const LicenseBalance = mongoose.model('LicenseBalance', licenseBalanceSchema)
