import mongoose from 'mongoose'

const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    from: { type: String, default: '' },
    to: { type: String, required: true },
    reason: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
)

const answerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 80 },
    value: { type: String, default: '', maxlength: 2000 },
  },
  { _id: false },
)

const csatSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '', maxlength: 1000 },
    ratedAt: { type: Date, default: null },
  },
  { _id: false },
)

const jiraSyncSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['', 'skipped', 'pending', 'created', 'error'],
      default: '',
    },
    issueKey: { type: String, default: '', maxlength: 80 },
    issueUrl: { type: String, default: '', maxlength: 500 },
    error: { type: String, default: '', maxlength: 500 },
    at: { type: Date, default: null },
  },
  { _id: false },
)

const serviceRequestSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    number: { type: Number, required: true },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceArea',
      required: true,
      index: true,
    },
    catalogItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalogItem',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['recibido', 'en_curso', 'resuelto', 'cancelado'],
      default: 'recibido',
      index: true,
    },
    formAnswers: { type: [answerSchema], default: [] },
    note: { type: String, default: '', maxlength: 2000 },
    internalNotes: { type: String, default: '', maxlength: 4000 },
    attachments: [{ type: String, maxlength: 500 }],
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slaMinutes: { type: Number, default: 0 },
    slaDueAt: { type: Date, default: null, index: true },
    slaBreached: { type: Boolean, default: false },
    history: { type: [historySchema], default: [] },
    idempotencyKey: { type: String, default: '', maxlength: 180, index: true },
    csat: { type: csatSchema, default: () => ({}) },
    jiraSync: { type: jiraSyncSchema, default: () => ({}) },
    workflowStarted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

serviceRequestSchema.index({ tenantId: 1, number: 1 }, { unique: true })
serviceRequestSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } },
  },
)
serviceRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export const SERVICIO_STATUSES = ['recibido', 'en_curso', 'resuelto', 'cancelado']

export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema)
