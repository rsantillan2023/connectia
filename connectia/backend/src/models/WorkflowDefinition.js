import mongoose from 'mongoose'
import { APPROVER_TYPES, TRIGGER_MODULES } from '../lib/workflowEngine.js'

const stepSchema = new mongoose.Schema(
  {
    orden: { type: Number, required: true },
    nombre: { type: String, required: true, trim: true },
    /** capability | role | area | users */
    approverType: { type: String, enum: APPROVER_TYPES, default: 'capability' },
    /** capability id, role name, o areaId según tipo */
    approverValue: { type: String, default: 'admin.solicitudes' },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    slaHoras: { type: Number, default: 48 },
    /** Condición legible (MVP: informativa; el motor no evalúa expresiones) */
    condition: { type: String, default: '' },
  },
  { _id: false },
)

const workflowDefinitionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    trigger: {
      module: { type: String, enum: TRIGGER_MODULES, default: 'solicitudes' },
      /** Si vacío, aplica a cualquier tipo del módulo */
      tipoKey: { type: String, default: '' },
      label: { type: String, default: '' },
    },
    steps: { type: [stepSchema], default: [] },
    activo: { type: Boolean, default: true, index: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, default: '' },
    /** Prompt / notas de IA al crear */
    aiNotes: { type: String, default: '' },
  },
  { timestamps: true },
)

workflowDefinitionSchema.index({ tenantId: 1, activo: 1, 'trigger.module': 1 })

export const WorkflowDefinition = mongoose.model('WorkflowDefinition', workflowDefinitionSchema)
