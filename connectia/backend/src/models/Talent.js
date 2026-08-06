import mongoose from 'mongoose'

const audienceSchema = {
  mode: {
    type: String,
    enum: ['all', 'restricted', 'users', 'none'],
    default: 'all',
  },
  areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}

/** Ciclo OKR (período). */
const okrCycleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true },
)
okrCycleSchema.index({ tenantId: 1, status: 1, startsAt: -1 })
export const OkrCycle = mongoose.model('OkrCycle', okrCycleSchema)

const keyResultSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    target: { type: Number, default: 100 },
    current: { type: Number, default: 0 },
    unit: { type: String, default: '%', maxlength: 40 },
  },
  { _id: true },
)

/** Objetivo OKR asignado a un colaborador (o equipo vía owner). */
const okrSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'OkrCycle', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerName: { type: String, default: '', maxlength: 160 },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 4000 },
    keyResults: [keyResultSchema],
    /** 0–100 derivado o override manual */
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    progressLog: [
      {
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        progress: Number,
        note: { type: String, default: '', maxlength: 500 },
      },
    ],
  },
  { timestamps: true },
)
okrSchema.index({ tenantId: 1, ownerId: 1, cycleId: 1 })
export const Okr = mongoose.model('Okr', okrSchema)

/** Ciclo formal de evaluación de desempeño. */
const performanceCycleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    descripcion: { type: String, default: '', maxlength: 2000 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    allowSelf: { type: Boolean, default: true },
    allowLeader: { type: Boolean, default: true },
    allowPeer: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    audience: audienceSchema,
  },
  { timestamps: true },
)
performanceCycleSchema.index({ tenantId: 1, status: 1 })
export const PerformanceCycle = mongoose.model('PerformanceCycle', performanceCycleSchema)

/** Evaluación o feedback continuo. */
const performanceReviewSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCycle', default: null, index: true },
    /** formal | continuous */
    kind: { type: String, enum: ['formal', 'continuous'], default: 'formal', index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectName: { type: String, default: '', maxlength: 160 },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerName: { type: String, default: '', maxlength: 160 },
    /** self | leader | peer */
    reviewType: {
      type: String,
      enum: ['self', 'leader', 'peer'],
      default: 'self',
      index: true,
    },
    rating: { type: Number, default: null, min: 1, max: 5 },
    strengths: { type: String, default: '', maxlength: 4000 },
    improvements: { type: String, default: '', maxlength: 4000 },
    comments: { type: String, default: '', maxlength: 4000 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'closed'],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
)
performanceReviewSchema.index({ tenantId: 1, subjectId: 1, cycleId: 1 })
export const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema)

/** Plan de carrera del colaborador. */
const careerPlanSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '', maxlength: 160 },
    currentRole: { type: String, default: '', maxlength: 160 },
    targetRole: { type: String, default: '', maxlength: 160 },
    skillGaps: [{ type: String, maxlength: 120 }],
    milestones: [
      {
        titulo: { type: String, required: true, maxlength: 200 },
        dueAt: { type: Date, default: null },
        done: { type: Boolean, default: false },
        proposedByLeader: { type: Boolean, default: false },
      },
    ],
    notes: { type: String, default: '', maxlength: 4000 },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true },
)
careerPlanSchema.index({ tenantId: 1, userId: 1 }, { unique: true })
export const CareerPlan = mongoose.model('CareerPlan', careerPlanSchema)

/** Curso LMS. */
const lmsCourseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 8000 },
    category: { type: String, default: 'general', maxlength: 80, index: true },
    durationMinutes: { type: Number, default: 30, min: 1 },
    contentUrl: { type: String, default: '', maxlength: 500 },
    contentHtml: { type: String, default: '', maxlength: 100000 },
    quiz: [
      {
        pregunta: { type: String, maxlength: 500 },
        opciones: [{ type: String, maxlength: 200 }],
        correcta: { type: Number, default: 0 },
      },
    ],
    mandatory: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    audience: audienceSchema,
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)
lmsCourseSchema.index({ tenantId: 1, status: 1, category: 1 })
export const LmsCourse = mongoose.model('LmsCourse', lmsCourseSchema)

/** Inscripción / progreso LMS. */
const lmsEnrollmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '', maxlength: 160 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    quizScore: { type: Number, default: null },
    certificateCode: { type: String, default: '', maxlength: 80 },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mandatory: { type: Boolean, default: false },
  },
  { timestamps: true },
)
lmsEnrollmentSchema.index({ tenantId: 1, userId: 1, courseId: 1 }, { unique: true })
export const LmsEnrollment = mongoose.model('LmsEnrollment', lmsEnrollmentSchema)

/** Vacante interna. */
const vacancySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 8000 },
    area: { type: String, default: '', maxlength: 120 },
    ubicacion: { type: String, default: '', maxlength: 160 },
    requirements: { type: String, default: '', maxlength: 4000 },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'filled'],
      default: 'draft',
      index: true,
    },
    audience: audienceSchema,
    closesAt: { type: Date, default: null },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)
vacancySchema.index({ tenantId: 1, status: 1 })
export const InternalVacancy = mongoose.model('InternalVacancy', vacancySchema)

const vacancyApplicationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vacancyId: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalVacancy', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '', maxlength: 160 },
    coverLetter: { type: String, default: '', maxlength: 4000 },
    status: {
      type: String,
      enum: ['submitted', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn'],
      default: 'submitted',
      index: true,
    },
  },
  { timestamps: true },
)
vacancyApplicationSchema.index({ tenantId: 1, vacancyId: 1, userId: 1 }, { unique: true })
export const VacancyApplication = mongoose.model('VacancyApplication', vacancyApplicationSchema)
