import mongoose from 'mongoose'

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { _id: false },
)

const readBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const chatSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** direct | group */
    kind: { type: String, enum: ['direct', 'group'], default: 'direct', index: true },
    title: { type: String, default: '', trim: true, maxlength: 80 },
    participants: { type: [participantSchema], default: [] },
    /** Denormalizado para queries rápidas */
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Solo 1:1 — ids ordenados unidos por ":" */
    participantsKey: { type: String, default: '', index: true },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessagePreview: { type: String, default: '', maxlength: 120 },
    lastMessageAuthorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readBy: { type: [readBySchema], default: [] },
    pinnedMessageIds: [{ type: mongoose.Schema.Types.ObjectId }],
    closedAt: { type: Date, default: null },
    closedReason: { type: String, default: '' },
    /** Canal creado desde admin (avisos / org) */
    createdByAdmin: { type: Boolean, default: false, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /**
     * Si false, solo admins del chat / gestoría pueden escribir (canal unidireccional).
     */
    allowReplies: { type: Boolean, default: true },
    /** Audiencia usada al crear/sincronizar (all / áreas / grupos / users) */
    audience: {
      mode: { type: String, enum: ['all', 'restricted', 'users', 'none'], default: 'users' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId }],
    },
  },
  { timestamps: true },
)

chatSchema.index({ tenantId: 1, createdByAdmin: 1, lastMessageAt: -1 })

chatSchema.index({ tenantId: 1, participantIds: 1, lastMessageAt: -1 })
chatSchema.index(
  { tenantId: 1, participantsKey: 1 },
  {
    unique: true,
    partialFilterExpression: { kind: 'direct', participantsKey: { $type: 'string', $gt: '' } },
  },
)

export const Chat = mongoose.model('Chat', chatSchema)
