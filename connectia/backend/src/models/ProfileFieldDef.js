import mongoose from 'mongoose'

const profileFieldDefSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    /** text | date | list | file */
    tipo: { type: String, enum: ['text', 'date', 'list', 'file'], default: 'text' },
    obligatorio: { type: Boolean, default: false },
    opciones: { type: [String], default: [] },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true },
    descripcion: { type: String, default: '' },
  },
  { timestamps: true },
)

profileFieldDefSchema.index({ tenantId: 1, key: 1 }, { unique: true })
profileFieldDefSchema.index({ tenantId: 1, orden: 1 })

export const ProfileFieldDef = mongoose.model('ProfileFieldDef', profileFieldDefSchema)
