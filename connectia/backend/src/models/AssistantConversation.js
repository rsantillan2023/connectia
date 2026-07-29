import mongoose from 'mongoose'

const sourceSchema = new mongoose.Schema(
  {
    kind: { type: String, default: 'kb' },
    id: { type: String, default: '' },
    titulo: { type: String, default: '' },
    href: { type: String, default: '' },
    excerpt: { type: String, default: '' },
  },
  { _id: false },
)

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    text: { type: String, required: true },
    intent: { type: String, default: '' },
    sources: { type: [sourceSchema], default: [] },
    links: {
      type: [
        {
          label: { type: String, default: '' },
          href: { type: String, default: '' },
        },
      ],
      default: [],
    },
    draftAction: { type: mongoose.Schema.Types.Mixed, default: null },
    confirmationToken: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const pendingActionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    confirmationToken: { type: String, required: true },
    summary: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
)

const assistantConversationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Asistente' },
    messages: { type: [messageSchema], default: [] },
    pendingAction: { type: pendingActionSchema, default: null },
    lastIntent: { type: String, default: '' },
  },
  { timestamps: true },
)

assistantConversationSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 })

export const AssistantConversation = mongoose.model('AssistantConversation', assistantConversationSchema)
