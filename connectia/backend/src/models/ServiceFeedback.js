import mongoose from 'mongoose'

/**
 * Sugerencias / feedback de servicios (mejoras propuestas por miembros).
 */
const serviceFeedbackSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    catalogItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalogItem',
      default: null,
    },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceArea',
      default: null,
    },
    text: { type: String, required: true, maxlength: 2000, trim: true },
    status: {
      type: String,
      enum: ['pendiente', 'revisado', 'descartado'],
      default: 'pendiente',
      index: true,
    },
    adminNote: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true },
)

serviceFeedbackSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export const ServiceFeedback = mongoose.model('ServiceFeedback', serviceFeedbackSchema)
