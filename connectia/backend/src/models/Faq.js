import mongoose from 'mongoose'

const faqSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    category: { type: String, default: 'general', trim: true, index: true },
    pregunta: { type: String, required: true, trim: true },
    respuesta: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true }],
    orden: { type: Number, default: 100 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
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
    revisadoEn: { type: Date, default: null },
    /** Gancho KB (Ola 12) */
    kbSyncedAt: { type: Date, default: null },
    kbIndexPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

faqSchema.index({ tenantId: 1, status: 1, category: 1, orden: 1 })
faqSchema.index({ tenantId: 1, pregunta: 'text', respuesta: 'text', keywords: 'text' })

export const Faq = mongoose.model('Faq', faqSchema)
