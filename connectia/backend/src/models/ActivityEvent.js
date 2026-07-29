import mongoose from 'mongoose'

const activityEventSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

activityEventSchema.index({ tenantId: 1, createdAt: -1 })
activityEventSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema)
