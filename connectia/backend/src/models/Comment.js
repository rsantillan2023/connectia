import mongoose from 'mongoose'

/**
 * Comentarios en publicaciones (§4.10 + §10 moderación).
 * status: visible | pending_review | hidden | deleted
 * suggestedAction IA: approve | hide | reply | escalate | review
 */
const commentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, default: '' },
    texto: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['visible', 'pending_review', 'hidden', 'deleted'],
      default: 'visible',
      index: true,
    },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    adminReply: { type: String, default: '' },
    repliedAt: { type: Date, default: null },
    /** Análisis IA (sugerencia; humano confirma salvo auto-ocultar) */
    moderationAi: {
      status: { type: String, default: '' },
      analyzedAt: { type: Date, default: null },
      provider: { type: String, default: '' },
      model: { type: String, default: '' },
      risk: { type: String, default: '' },
      score: { type: Number, default: 0 },
      suggestedAction: { type: String, default: '' },
      summary: { type: String, default: '' },
      draftReply: { type: String, default: '' },
      reasons: { type: [String], default: [] },
      categories: { type: [String], default: [] },
      policyFlags: { type: [String], default: [] },
      error: { type: String, default: '' },
      autoApplied: { type: Boolean, default: false },
    },
    /** Feedback del moderador sobre la sugerencia */
    suggestionFeedback: {
      type: String,
      enum: ['', 'useful', 'not_useful'],
      default: '',
    },
    suggestionIgnored: { type: Boolean, default: false },
  },
  { timestamps: true },
)

commentSchema.index({ tenantId: 1, status: 1, createdAt: -1 })
commentSchema.index({ tenantId: 1, status: 1, 'moderationAi.score': -1 })
commentSchema.index({ tenantId: 1, postId: 1, status: 1, createdAt: 1 })

export const Comment = mongoose.model('Comment', commentSchema)
