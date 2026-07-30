import mongoose from 'mongoose'

/**
 * Stories efímeras del muro (Ola 3 · 04.12).
 * Duración default 24 h; solo vigentes y con audiencia autorizada se muestran en U.
 */
const storySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, default: '', trim: true, maxlength: 80 },
    category: { type: String, default: 'general', trim: true, maxlength: 60, index: true },
    mediaUrl: { type: String, required: true, trim: true },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    startsAt: { type: Date, default: Date.now, index: true },
    endsAt: { type: Date, required: true, index: true },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    audience: {
      mode: {
        type: String,
        enum: ['all', 'restricted', 'users', 'none'],
        default: 'all',
      },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AudienceClient' }],
    },
    /** userIds que ya vieron (impresiones) */
    viewers: {
      type: Map,
      of: Date,
      default: {},
    },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

storySchema.index({ tenantId: 1, status: 1, endsAt: 1, startsAt: 1 })
storySchema.index({ tenantId: 1, category: 1, status: 1 })

export const Story = mongoose.model('Story', storySchema)
