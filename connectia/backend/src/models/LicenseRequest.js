import mongoose from 'mongoose'

const adjuntoSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    url: { type: String, required: true },
  },
  { _id: false },
)

const historialSchema = new mongoose.Schema(
  {
    estado: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    comentario: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const licenseRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true },
    tipoId: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseType', default: null },
    tipoKey: { type: String, default: '', index: true },
    tipoNombre: { type: String, default: '' },
    desde: { type: Date, required: true },
    hasta: { type: Date, required: true },
    dias: { type: Number, required: true, min: 1 },
    cuentaDias: { type: String, enum: ['calendario', 'habiles'], default: 'calendario' },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    motivo: { type: String, default: '' },
    saldoAntes: { type: Number, default: null },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterName: { type: String, default: '' },
    decisionById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decisionByName: { type: String, default: '' },
    decisionAt: { type: Date, default: null },
    decisionComentario: { type: String, default: '' },
    adjuntos: { type: [adjuntoSchema], default: [] },
    historial: { type: [historialSchema], default: [] },
  },
  { timestamps: true },
)

licenseRequestSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })
licenseRequestSchema.index({ tenantId: 1, requesterId: 1, createdAt: -1 })
licenseRequestSchema.index({ tenantId: 1, estado: 1, desde: 1 })
licenseRequestSchema.index({ tenantId: 1, requesterId: 1, tipoKey: 1, estado: 1 })

export const LicenseRequest = mongoose.model('LicenseRequest', licenseRequestSchema)
