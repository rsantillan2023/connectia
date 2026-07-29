import mongoose from 'mongoose'

const policyAckSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: String, required: true },
    acceptedAt: { type: Date, default: Date.now },
    openedAt: { type: Date, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { _id: false },
)

const policySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, default: '', trim: true, index: true },
    titulo: { type: String, required: true, trim: true },
    resumen: { type: String, default: '' },
    cuerpo: { type: String, required: true },
    category: { type: String, default: 'general', trim: true, index: true },
    keywords: [{ type: String, trim: true }],
    version: { type: String, default: '1', trim: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    requiresAck: { type: Boolean, default: true },
    /** Si true, bloquear módulos hasta aceptar (MVP: flag + lista pendientes en U). */
    mandatory: { type: Boolean, default: false },
    audience: {
      mode: {
        type: String,
        enum: ['all', 'restricted', 'users', 'none'],
        default: 'all',
      },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    acks: [policyAckSchema],
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    kbSyncedAt: { type: Date, default: null },
    kbIndexPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

policySchema.index({ tenantId: 1, status: 1, publishedAt: -1 })
policySchema.index({ tenantId: 1, codigo: 1, version: 1 })

export const Policy = mongoose.model('Policy', policySchema)
