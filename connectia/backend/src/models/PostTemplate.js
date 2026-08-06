import mongoose from 'mongoose'

/**
 * Plantilla reutilizable para crear publicaciones rápido desde el admin (Ola 36-c).
 * No se publica sola: solo prellena el editor de Publicaciones.
 */
const postTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    /** Identificador corto opcional (ej. "cumple", "feriado") para deduplicar en seeds. */
    key: { type: String, default: '', trim: true },
    tipo: {
      type: String,
      enum: ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion'],
      default: 'noticia',
    },
    titulo: { type: String, default: '', trim: true },
    cuerpo: { type: String, default: '' },
    layout: {
      type: String,
      enum: ['vertical', 'horizontal', 'banner'],
      default: 'vertical',
    },
    section: { type: String, default: '', maxlength: 80 },
    imageUrl: { type: String, default: '' },
    pinned: { type: Boolean, default: false },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

postTemplateSchema.index({ tenantId: 1, key: 1 })
postTemplateSchema.index({ tenantId: 1, activo: 1, nombre: 1 })

export const PostTemplate = mongoose.model('PostTemplate', postTemplateSchema)
