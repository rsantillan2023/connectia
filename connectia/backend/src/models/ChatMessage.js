import mongoose from 'mongoose'

const adjuntoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    nombre: { type: String, default: 'Adjunto' },
    mimeType: { type: String, default: '' },
  },
  { _id: false },
)

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true, maxlength: 16 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false },
)

const chatMessageSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: '' },
    texto: { type: String, default: '', maxlength: 4000 },
    adjuntos: { type: [adjuntoSchema], default: [] },
    mentionUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [reactionSchema], default: [] },
    pinnedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

chatMessageSchema.index({ tenantId: 1, chatId: 1, createdAt: -1 })
chatMessageSchema.index({ tenantId: 1, chatId: 1, texto: 'text' })

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
