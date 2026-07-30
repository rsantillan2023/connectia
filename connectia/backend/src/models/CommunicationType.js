import mongoose from 'mongoose'

const communicationTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true, trim: true, maxlength: 64 },
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: '', maxlength: 500 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

communicationTypeSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })

export const CommunicationType = mongoose.model('CommunicationType', communicationTypeSchema)
