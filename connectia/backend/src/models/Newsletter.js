import mongoose from 'mongoose'

const postSnapshotSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    titulo: { type: String, default: '' },
    tipo: { type: String, default: 'general' },
    cuerpo: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    audienceMode: { type: String, default: 'all' },
  },
  { _id: false },
)

const variantSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true },
    postIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    summary: { type: String, default: '' },
    summaryAi: { type: Boolean, default: false },
    recipientCount: { type: Number, default: 0 },
    emailableCount: { type: Number, default: 0 },
  },
  { _id: false },
)

const recipientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: '' },
    nombre: { type: String, default: '' },
    fingerprint: { type: String, default: '' },
    postIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    canEmail: { type: Boolean, default: false },
    /** Si el admin lo desmarca en moderación, no se envía */
    included: { type: Boolean, default: true },
    /** Destinatario manual (cualquier email, no tiene que ser usuario) */
    isExternal: { type: Boolean, default: false },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea', default: null },
    areaNombre: { type: String, default: '' },
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    groupNombres: { type: [String], default: [] },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'skipped', 'sent', 'failed'],
      default: 'pending',
    },
    sentAt: { type: Date, default: null },
    error: { type: String, default: '' },
  },
  { _id: false },
)

const auditEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, default: '' },
    action: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { _id: false },
)

const actorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
    at: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { _id: false },
)

/**
 * Newsletter moderado: borrador → revisión → aprobación → envío.
 * Conserva snapshots y destinatarios para auditoría.
 */
const newsletterSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'sending', 'sent', 'cancelled'],
      default: 'pending_review',
      index: true,
    },
    posts: { type: [postSnapshotSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    recipients: { type: [recipientSchema], default: [] },
    totals: {
      recipients: { type: Number, default: 0 },
      emailable: { type: Number, default: 0 },
      variants: { type: Number, default: 0 },
      emailed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    createdBy: actorSchema,
    reviewedBy: actorSchema,
    approvedBy: actorSchema,
    rejectedBy: actorSchema,
    sentBy: actorSchema,
    cancelledBy: actorSchema,
    rejectionReason: { type: String, default: '' },
    auditLog: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true },
)

newsletterSchema.index({ tenantId: 1, status: 1, createdAt: -1 })
newsletterSchema.index({ tenantId: 1, updatedAt: -1 })

export const NEWSLETTER_STATUSES = [
  'pending_review',
  'approved',
  'rejected',
  'sending',
  'sent',
  'cancelled',
]

export const Newsletter = mongoose.model('Newsletter', newsletterSchema)
