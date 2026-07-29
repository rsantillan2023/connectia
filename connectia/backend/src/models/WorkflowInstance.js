import mongoose from 'mongoose'
import { INSTANCE_STATUSES } from '../lib/workflowEngine.js'

const historySchema = new mongoose.Schema(
  {
    pasoOrden: { type: Number, required: true },
    pasoNombre: { type: String, default: '' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    decision: {
      type: String,
      enum: ['aprobar', 'rechazar', 'inicio', 'sistema', 'omitido', 'aprobado'],
      required: true,
    },
    comentario: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const workflowInstanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowDefinition',
      required: true,
      index: true,
    },
    definitionName: { type: String, default: '' },
    /** Snapshot de pasos al iniciar (no cambia si se edita la def) */
    steps: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stepIndex: { type: Number, default: 0 },
    status: { type: String, enum: INSTANCE_STATUSES, default: 'en_curso', index: true },
    origen: {
      module: { type: String, required: true },
      refId: { type: mongoose.Schema.Types.ObjectId, required: true },
      titulo: { type: String, default: '' },
      codigo: { type: String, default: '' },
      tipoKey: { type: String, default: '' },
    },
    solicitanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    solicitanteName: { type: String, default: '' },
    history: { type: [historySchema], default: [] },
    /** Idempotencia: un trámite origen → una instancia activa */
    originKey: { type: String, required: true },
  },
  { timestamps: true },
)

workflowInstanceSchema.index({ tenantId: 1, status: 1, stepIndex: 1 })
workflowInstanceSchema.index({ tenantId: 1, originKey: 1 }, { unique: true })
workflowInstanceSchema.index({ tenantId: 1, solicitanteId: 1, createdAt: -1 })

export const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema)
