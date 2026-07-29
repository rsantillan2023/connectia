import mongoose from 'mongoose'

/** Bloqueo mutuo opcional entre usuarios del mismo tenant (§8.05). */
const chatBlockSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

chatBlockSchema.index({ tenantId: 1, blockerId: 1, blockedId: 1 }, { unique: true })

export const ChatBlock = mongoose.model('ChatBlock', chatBlockSchema)
