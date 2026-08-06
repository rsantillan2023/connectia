import mongoose from 'mongoose'

const pedidoCategorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, maxlength: 120, trim: true },
    colorMap: { type: String, default: '#dc2626', maxlength: 20 },
    receptorUserIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    requireGps: { type: Boolean, default: false },
    requirePhoto: { type: Boolean, default: false },
    defaultForAlarm: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

pedidoCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true })
pedidoCategorySchema.index({ tenantId: 1, active: 1, order: 1 })

export const PedidoCategory = mongoose.model('PedidoCategory', pedidoCategorySchema)
