import mongoose from 'mongoose'

const savedPostSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  },
  { timestamps: true },
)

savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true })
savedPostSchema.index({ userId: 1, tenantId: 1, createdAt: -1 })

export const SavedPost = mongoose.model('SavedPost', savedPostSchema)
