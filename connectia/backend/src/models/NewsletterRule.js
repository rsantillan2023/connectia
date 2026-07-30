import mongoose from 'mongoose'

/**
 * Regla de automatización de newsletters (Ola 36-e).
 * El scheduler arma y envía un newsletter cada `intervalHours`,
 * tomando `postCount` publicaciones publicadas según `selectMode`.
 */
const newsletterRuleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    intervalHours: { type: Number, default: 24, min: 1 },
    postCount: { type: Number, default: 5, min: 1 },
    selectMode: {
      type: String,
      enum: ['latest', 'pinned_first'],
      default: 'latest',
    },
    /** Misma forma que Post.audience; sirve para acotar qué publicaciones entran. */
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
    enabled: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

newsletterRuleSchema.index({ tenantId: 1, enabled: 1, nextRunAt: 1 })

export const NewsletterRule = mongoose.model('NewsletterRule', newsletterRuleSchema)
