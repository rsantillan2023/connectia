import mongoose from 'mongoose'

const orgAreaSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    /** Área padre opcional — solo para organigrama; null = raíz / sin jerarquía */
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea', default: null, index: true },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

orgAreaSchema.index({ tenantId: 1, key: 1 }, { unique: true })
orgAreaSchema.index({ tenantId: 1, parentId: 1 })

export const OrgArea = mongoose.model('OrgArea', orgAreaSchema)
