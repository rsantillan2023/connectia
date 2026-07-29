import mongoose from 'mongoose'
import { MILESTONE_TYPES, TEMPLATE_KINDS } from './OnboardingTemplate.js'

export const INSTANCE_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled', 'revoked']
export const MILESTONE_STATUSES = ['locked', 'pending', 'done', 'skipped']

const milestoneInstSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    titulo: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    tipo: { type: String, enum: MILESTONE_TYPES, default: 'task' },
    orden: { type: Number, default: 0 },
    dependsOn: [{ type: String }],
    responsableRole: { type: String, default: 'colaborador' },
    diasLimite: { type: Number, default: null },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', default: null },
    contentUrl: { type: String, default: '' },
    contentBody: { type: String, default: '' },
    obligatorio: { type: Boolean, default: true },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'pending' },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { _id: false },
)

const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    action: { type: String, required: true },
    detail: { type: String, default: '' },
  },
  { _id: false },
)

const onboardingInstanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: { type: String, enum: TEMPLATE_KINDS, default: 'onboarding', index: true },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OnboardingTemplate',
      required: true,
      index: true,
    },
    templateName: { type: String, default: '' },
    templateVersion: { type: Number, default: 1 },
    /** Snapshot de hitos al iniciar */
    milestones: { type: [milestoneInstSchema], default: [] },
    status: { type: String, enum: INSTANCE_STATUSES, default: 'in_progress', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '' },
    legajoId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeLegajo', default: null },
    progressPercent: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    history: { type: [historySchema], default: [] },
    /** Idempotencia: un proceso activo por usuario+kind+template */
    originKey: { type: String, required: true },
    /** Offboarding: accesos revocados */
    accessRevokedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

onboardingInstanceSchema.index({ tenantId: 1, originKey: 1 }, { unique: true })
onboardingInstanceSchema.index({ tenantId: 1, userId: 1, status: 1 })
onboardingInstanceSchema.index({ tenantId: 1, kind: 1, status: 1 })

export const OnboardingInstance = mongoose.model('OnboardingInstance', onboardingInstanceSchema)
