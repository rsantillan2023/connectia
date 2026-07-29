import mongoose from 'mongoose'

/**
 * Campaña / envío admin de notificaciones (in-app + push).
 * status: draft | scheduled | sending | sent | cancelled | failed
 * sendType: now | scheduled
 * segment: audience | inactive
 */
const pushCampaignSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Nombre interno en listado admin */
    name: { type: String, default: '', maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: '', maxlength: 500 },
    href: { type: String, default: '/', maxlength: 300 },
    audience: {
      mode: { type: String, default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    /** audience = filtro normal; inactive = dentro de audiencia sin login reciente */
    segment: { type: String, enum: ['audience', 'inactive'], default: 'audience' },
    inactiveDays: { type: Number, default: 30, min: 1, max: 365 },
    sendType: { type: String, enum: ['now', 'scheduled'], default: 'now' },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },
    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    stats: {
      targeted: { type: Number, default: 0 },
      inApp: { type: Number, default: 0 },
      pushSent: { type: Number, default: 0 },
      pushFailed: { type: Number, default: 0 },
    },
    errorMessage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sentAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Evita doble envío por reintento */
    idempotencyKey: { type: String, default: '', maxlength: 80 },
  },
  { timestamps: true },
)

pushCampaignSchema.index({ tenantId: 1, createdAt: -1 })
pushCampaignSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 })
pushCampaignSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $gt: '' } } },
)

export const PushCampaign = mongoose.model('PushCampaign', pushCampaignSchema)
