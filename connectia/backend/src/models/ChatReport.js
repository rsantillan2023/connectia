import mongoose from 'mongoose'

const chatReportSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
)

chatReportSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export const ChatReport = mongoose.model('ChatReport', chatReportSchema)
