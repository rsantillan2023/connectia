import mongoose from 'mongoose'

const serviceAreaSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, maxlength: 120, trim: true },
    color: { type: String, default: '#0d9488', maxlength: 20 },
    receptorUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

serviceAreaSchema.index({ tenantId: 1, name: 1 }, { unique: true })
serviceAreaSchema.index({ tenantId: 1, active: 1, order: 1 })

export const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema)
