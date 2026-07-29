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

const absenceRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    codigo: { type: String, required: true },
    tipoKey: { type: String, default: 'injustificada', index: true },
    tipoNombre: { type: String, default: 'Ausencia' },
    desde: { type: Date, required: true },
    hasta: { type: Date, required: true },
    dias: { type: Number, required: true, min: 1 },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    motivo: { type: String, default: '' },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterName: { type: String, default: '' },
    decisionById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decisionByName: { type: String, default: '' },
    decisionAt: { type: Date, default: null },
    decisionComentario: { type: String, default: '' },
    adjuntos: { type: [adjuntoSchema], default: [] },
    historial: { type: [historialSchema], default: [] },
    /** Integración ECR diferible (12.04). */
    ecrSync: {
      status: {
        type: String,
        enum: ['none', 'pending', 'synced', 'error', 'deferred'],
        default: 'none',
      },
      note: { type: String, default: '' },
      externalId: { type: String, default: '' },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
)

absenceRequestSchema.index({ tenantId: 1, codigo: 1 }, { unique: true })
absenceRequestSchema.index({ tenantId: 1, requesterId: 1, createdAt: -1 })
absenceRequestSchema.index({ tenantId: 1, estado: 1, desde: 1 })

export const AbsenceRequest = mongoose.model('AbsenceRequest', absenceRequestSchema)
