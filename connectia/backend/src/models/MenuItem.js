import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    route: { type: String, required: true },
    icon: { type: String, default: 'circle' },
    order: { type: Number, default: 100 },
    audience: {
      roles: { type: [String], default: [] },
      capabilities: { type: [String], default: [] },
    },
    channel: { type: String, enum: ['u', 'a', 'both'], default: 'u' },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

menuItemSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const MenuItem = mongoose.model('MenuItem', menuItemSchema)
