import mongoose from 'mongoose'

/**
 * Entrada del directorio / datos útiles (§21).
 * Sedes, teléfonos, personas, servicios, emergencias — accionables.
 */
const directoryEntrySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** persona | sede | servicio | emergencia | telefono | otro */
    tipo: {
      type: String,
      enum: ['persona', 'sede', 'servicio', 'emergencia', 'telefono', 'otro'],
      default: 'servicio',
      index: true,
    },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 800 },
    categoria: { type: String, default: 'General', trim: true, maxlength: 80, index: true },
    tags: { type: [String], default: [] },

    telefono: { type: String, default: '', maxlength: 40 },
    interno: { type: String, default: '', maxlength: 20 },
    whatsapp: { type: String, default: '', maxlength: 40 },
    email: { type: String, default: '', maxlength: 200 },

    direccion: { type: String, default: '', maxlength: 240 },
    ciudad: { type: String, default: '', maxlength: 120 },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },

    horario: { type: String, default: '', maxlength: 200 },
    /** Miembro de comunidad opcional (ficha persona) */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    /** Logo / foto de la ficha (URL https) */
    imageUrl: { type: String, default: '', maxlength: 500 },
    icon: { type: String, default: '', maxlength: 40 },
    color: { type: String, default: '', maxlength: 20 },
    orden: { type: Number, default: 100, index: true },
    destacado: { type: Boolean, default: false, index: true },
    activo: { type: Boolean, default: true, index: true },
    vigenciaDesde: { type: Date, default: null },
    vigenciaHasta: { type: Date, default: null },

    audience: {
      mode: { type: String, enum: ['all', 'restricted'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    },

    openCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

directoryEntrySchema.index({ tenantId: 1, activo: 1, orden: 1, nombre: 1 })
directoryEntrySchema.index({ tenantId: 1, categoria: 1, activo: 1 })
directoryEntrySchema.index({ tenantId: 1, tipo: 1, activo: 1 })

export const DirectoryEntry = mongoose.model('DirectoryEntry', directoryEntrySchema)

const directoryFavoriteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectoryEntry', required: true, index: true },
  },
  { timestamps: true },
)

directoryFavoriteSchema.index({ tenantId: 1, userId: 1, entryId: 1 }, { unique: true })

export const DirectoryFavorite = mongoose.model('DirectoryFavorite', directoryFavoriteSchema)
