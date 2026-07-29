import mongoose from 'mongoose'

const kbArticleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    cuerpo: { type: String, required: true, trim: true, maxlength: 20000 },
    tags: { type: [String], default: [] },
    /** faq | guia | politica | general */
    categoria: {
      type: String,
      enum: ['faq', 'guia', 'politica', 'general'],
      default: 'faq',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    audience: {
      mode: { type: String, enum: ['all', 'restricted', 'users', 'none'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    orden: { type: Number, default: 100 },
    /** Origen sincronizado desde §26/§40 (faq | tutorial | policy). Solo setear si hay sourceId. */
    sourceKind: { type: String, trim: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, index: true },
    /** Deep link a la fuente original en la app U */
    href: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

kbArticleSchema.index({ tenantId: 1, status: 1, categoria: 1 })
kbArticleSchema.index(
  { tenantId: 1, sourceKind: 1, sourceId: 1 },
  {
    unique: true,
    name: 'tenant_source_unique',
    partialFilterExpression: { sourceId: { $exists: true, $type: 'objectId' } },
  },
)
kbArticleSchema.index({ tenantId: 1, titulo: 'text', cuerpo: 'text', tags: 'text' })

export const KbArticle = mongoose.model('KbArticle', kbArticleSchema)
