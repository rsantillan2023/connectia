import mongoose from 'mongoose'

export const MILESTONE_TYPES = ['task', 'content', 'survey', 'checklist']
export const TEMPLATE_KINDS = ['onboarding', 'offboarding']

const milestoneDefSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    tipo: { type: String, enum: MILESTONE_TYPES, default: 'task' },
    /** Orden 1..n; dependencias por key */
    orden: { type: Number, default: 0 },
    dependsOn: [{ type: String }],
    responsableRole: { type: String, default: 'colaborador', maxlength: 40 },
    diasLimite: { type: Number, default: null },
    /** §15 — hito tipo survey */
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', default: null },
    /** URL / doc / texto de ayuda */
    contentUrl: { type: String, default: '', maxlength: 500 },
    contentBody: { type: String, default: '', maxlength: 8000 },
    obligatorio: { type: Boolean, default: true },
  },
  { _id: false },
)

const onboardingTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: { type: String, enum: TEMPLATE_KINDS, default: 'onboarding', index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    milestones: { type: [milestoneDefSchema], default: [] },
    /** Días desde inicio para vencimiento global (opcional) */
    slaDias: { type: Number, default: null },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

onboardingTemplateSchema.index({ tenantId: 1, kind: 1, status: 1 })

export const OnboardingTemplate = mongoose.model('OnboardingTemplate', onboardingTemplateSchema)
