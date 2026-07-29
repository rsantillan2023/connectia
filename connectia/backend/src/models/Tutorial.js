import mongoose from 'mongoose'

const tutorialStepSchema = new mongoose.Schema(
  {
    orden: { type: Number, default: 1 },
    titulo: { type: String, default: '' },
    cuerpo: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
  },
  { _id: false },
)

const tutorialSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    category: { type: String, default: 'general', trim: true, index: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    steps: [tutorialStepSchema],
    keywords: [{ type: String, trim: true }],
    /** Módulo Connectia relacionado (muro, solicitudes, etc.) */
    moduloRelacionado: { type: String, default: '', trim: true },
    orden: { type: Number, default: 100 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    showOnFirstLogin: { type: Boolean, default: false },
    audience: {
      mode: {
        type: String,
        enum: ['all', 'restricted', 'users', 'none'],
        default: 'all',
      },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    kbSyncedAt: { type: Date, default: null },
    kbIndexPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

tutorialSchema.index({ tenantId: 1, status: 1, category: 1, orden: 1 })

export const Tutorial = mongoose.model('Tutorial', tutorialSchema)
