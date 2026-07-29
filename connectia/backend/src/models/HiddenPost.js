import mongoose from 'mongoose'

/** Publicaciones que el usuario marcó como “ya la vi” (ocultas solo para él). */
const hiddenPostSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  },
  { timestamps: true },
)

hiddenPostSchema.index({ userId: 1, postId: 1 }, { unique: true })
hiddenPostSchema.index({ userId: 1, tenantId: 1, createdAt: -1 })

export const HiddenPost = mongoose.model('HiddenPost', hiddenPostSchema)
