import mongoose from 'mongoose'

const postCategorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    slug: { type: String, default: '', trim: true },
    descripcion: { type: String, default: '' },
    icono: { type: String, default: '' },
    color: { type: String, default: '' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PostCategory', default: null },
    /** Mapeo al enum legacy Post.tipo cuando aplica */
    legacyTipo: {
      type: String,
      enum: ['noticia', 'aviso', 'beneficio', 'evento', 'general', 'celebracion', ''],
      default: '',
    },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true, index: true },
    sistema: { type: Boolean, default: false },
  },
  { timestamps: true },
)

postCategorySchema.index({ tenantId: 1, key: 1 }, { unique: true })
postCategorySchema.index({ tenantId: 1, orden: 1 })

export const PostCategory = mongoose.model('PostCategory', postCategorySchema)

export const DEFAULT_POST_CATEGORIES = [
  { key: 'noticia', nombre: 'Noticia', legacyTipo: 'noticia', orden: 10, sistema: true },
  { key: 'aviso', nombre: 'Aviso', legacyTipo: 'aviso', orden: 20, sistema: true },
  { key: 'beneficio', nombre: 'Beneficio', legacyTipo: 'beneficio', orden: 30, sistema: true },
  { key: 'evento', nombre: 'Evento', legacyTipo: 'evento', orden: 40, sistema: true },
  { key: 'general', nombre: 'General', legacyTipo: 'general', orden: 50, sistema: true },
  { key: 'celebracion', nombre: 'Celebración', legacyTipo: 'celebracion', orden: 60, sistema: true },
]
