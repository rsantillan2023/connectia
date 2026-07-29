import mongoose from 'mongoose'

/** Términos / privacidad versionados (ADR-GAPS §C) */
const legalDocSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    tipo: { type: String, enum: ['terms', 'privacy'], required: true },
    version: { type: String, required: true },
    titulo: { type: String, required: true },
    cuerpo: { type: String, required: true },
    vigente: { type: Boolean, default: true },
  },
  { timestamps: true },
)

legalDocSchema.index({ tenantId: 1, tipo: 1, version: 1 }, { unique: true })

export const LegalDoc = mongoose.model('LegalDoc', legalDocSchema)
