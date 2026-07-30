import mongoose from 'mongoose'

/**
 * Telemetría de consumo de publicaciones (§29.04 / ranking).
 * kind: detail = abrió detalle; impression = card en feed (opcional).
 */
const postViewSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['detail', 'impression'], default: 'detail', index: true },
    channel: { type: String, enum: ['mobile', 'desktop', 'unknown'], default: 'unknown' },
    /** Día UTC YYYY-MM-DD para dedupe único/día */
    dayKey: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

postViewSchema.index({ tenantId: 1, postId: 1, userId: 1, kind: 1, dayKey: 1 }, { unique: true })
postViewSchema.index({ tenantId: 1, createdAt: -1 })

export const PostView = mongoose.model('PostView', postViewSchema)
