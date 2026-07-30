import mongoose from 'mongoose'

const stopSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    radiusM: { type: Number, default: null },
    notes: { type: String, default: '' },
    order: { type: Number, default: 0 },
    defaultFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldForm', default: null },
  },
  { _id: false },
)

const fieldRouteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    activo: { type: Boolean, default: true },
    stops: { type: [stopSchema], default: [] },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

fieldRouteSchema.index({ tenantId: 1, activo: 1, nombre: 1 })

export const FieldRoute = mongoose.model('FieldRoute', fieldRouteSchema)
