import mongoose from 'mongoose'

const hubCategorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true, index: true },
    /**
     * Si false, el grupo sigue en /accesos (Enlaces) pero no aparece
     * en la franja de accesos rápidos del muro de la app.
     */
    showOnMuro: { type: Boolean, default: true },
    /** Tamaño de icono por defecto del grupo (los links pueden override) */
    iconSize: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
  },
  { timestamps: true },
)

hubCategorySchema.index({ tenantId: 1, nombre: 1 }, { unique: true })
hubCategorySchema.index({ tenantId: 1, orden: 1 })

export const HubCategory = mongoose.model('HubCategory', hubCategorySchema)
