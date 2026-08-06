import mongoose from 'mongoose'
import { COM_CHANNELS } from './CommunicationTemplate.js'

const communicationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunicationTemplate', index: true },
    communicationType: { type: String, required: true, index: true },
    channel: { type: String, enum: COM_CHANNELS, required: true, index: true },
    recipient: { type: String, required: true },
    recipientName: { type: String, default: '' },
    renderedSubject: { type: String, default: '' },
    renderedBody: { type: String, default: '' },
    attachmentUrls: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
      index: true,
    },
    providerId: { type: String, default: '' },
    idempotencyKey: { type: String, default: '', index: true },
    errorMessage: { type: String, default: '' },
    sentBy: { type: String, default: '' },
    sentByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date },
    correlationId: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

communicationSchema.index({ tenantId: 1, sentAt: -1 })
communicationSchema.index({ tenantId: 1, channel: 1, status: 1 })
communicationSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } } },
)

export const Communication = mongoose.model('Communication', communicationSchema)
