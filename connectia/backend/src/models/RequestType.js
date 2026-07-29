import mongoose from 'mongoose'

const campoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: ['text', 'textarea', 'number', 'date', 'check', 'select', 'email', 'url'],
      default: 'text',
    },
    required: { type: Boolean, default: false },
    opciones: { type: [String], default: [] },
    placeholder: { type: String, default: '' },
    orden: { type: Number, default: 100 },
  },
  { _id: false },
)

const requestTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    area: { type: String, default: 'General', trim: true },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 100 },
    /** Quién puede usar este tipo al crear una solicitud propia (self-service) */
    audience: {
      mode: { type: String, enum: ['all', 'restricted'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    },
    /** Definición de formulario dinámico */
    campos: { type: [campoSchema], default: [] },
  },
  { timestamps: true },
)

requestTypeSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const RequestType = mongoose.model('RequestType', requestTypeSchema)
