import mongoose from 'mongoose'

const userGroupSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

userGroupSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const UserGroup = mongoose.model('UserGroup', userGroupSchema)
