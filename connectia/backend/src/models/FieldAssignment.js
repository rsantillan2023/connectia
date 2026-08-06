import mongoose from 'mongoose'

const MODALITIES = ['scheduled', 'spontaneous', 'on_demand', 'on_route', 'off_route']
const STATUSES = ['pending', 'in_progress', 'submitted', 'synced', 'skipped', 'failed']

const fieldAssignmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Día calendario YYYY-MM-DD en timezone del tenant (o UTC si no hay TZ) */
    day: { type: String, required: true, index: true },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldForm', required: true },
    formVersion: { type: Number, required: true },
    /** Snapshot de preguntas al asignar/publicar (versión inmutable) */
    formSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRoute', default: null },
    stopId: { type: String, default: '' },
    stopLabel: { type: String, default: '' },
    modality: { type: String, enum: MODALITIES, default: 'scheduled' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    order: { type: Number, default: 0 },
    windowStart: { type: String, default: '' },
    windowEnd: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

fieldAssignmentSchema.index({ tenantId: 1, day: 1, operatorId: 1, order: 1 })
fieldAssignmentSchema.index({ tenantId: 1, status: 1, day: 1 })

export const FIELD_MODALITIES = MODALITIES
export const FIELD_ASSIGNMENT_STATUSES = STATUSES
export const FieldAssignment = mongoose.model('FieldAssignment', fieldAssignmentSchema)
