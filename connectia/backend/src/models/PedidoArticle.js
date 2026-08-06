import mongoose from 'mongoose'

const pedidoArticleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    label: { type: String, required: true, maxlength: 200, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    unit: { type: String, default: 'u', maxlength: 40 },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PedidoCategory',
      default: null,
    },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

pedidoArticleSchema.index({ tenantId: 1, label: 1 })
pedidoArticleSchema.index({ tenantId: 1, active: 1, order: 1 })

export const PedidoArticle = mongoose.model('PedidoArticle', pedidoArticleSchema)
