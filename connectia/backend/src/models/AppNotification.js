import mongoose from 'mongoose'

/**
 * Notificación in-app (centro + banner al abrir).
 * kind: survey_pending | survey_published | post_published | generic
 */
const appNotificationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, default: 'generic', index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 500 },
    href: { type: String, default: '/', maxlength: 300 },
    /** Referencia opcional (ej. surveyId / postId) */
    refType: { type: String, default: '' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

appNotificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })
appNotificationSchema.index({ tenantId: 1, userId: 1, readAt: 1 })
appNotificationSchema.index({ tenantId: 1, refType: 1, refId: 1, readAt: 1 })
// Un solo índice único: evita el warning de Mongoose por dos index() con las mismas keys
appNotificationSchema.index(
  { tenantId: 1, userId: 1, kind: 1, refId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      kind: { $in: ['survey_pending', 'post_published'] },
      refId: { $type: 'objectId' },
    },
  },
)

export const AppNotification = mongoose.model('AppNotification', appNotificationSchema)
