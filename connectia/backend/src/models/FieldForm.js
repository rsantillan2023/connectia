import mongoose from 'mongoose'
import { FIELD_QUESTION_TYPES } from '../lib/fieldFormQuestions.js'

const logicRuleSchema = new mongoose.Schema(
  {
    when: {
      questionId: { type: String, required: true },
      op: { type: String, enum: ['eq', 'neq', 'in', 'truthy', 'falsy'], default: 'eq' },
      value: { type: mongoose.Schema.Types.Mixed },
    },
    action: { type: String, enum: ['show', 'hide', 'skip_to', 'require_if'], required: true },
    targetQuestionId: { type: String, default: '' },
  },
  { _id: false },
)

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    texto: { type: String, required: true, trim: true },
    tipo: { type: String, enum: FIELD_QUESTION_TYPES, default: 'text' },
    required: { type: Boolean, default: true },
    opciones: [{ type: String }],
    grupo: { type: String, default: 'General', trim: true },
    logic: { type: [logicRuleSchema], default: [] },
    buttonAction: { type: String, default: '' },
    apiUrl: { type: String, default: '' },
    geofenceRadiusM: { type: Number, default: null },
  },
  { _id: false },
)

const fieldFormSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    questions: { type: [questionSchema], default: [] },
    /** Versión publicada inmutable referenciada por asignaciones */
    version: { type: Number, default: 1 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

fieldFormSchema.index({ tenantId: 1, status: 1, updatedAt: -1 })

export const FieldForm = mongoose.model('FieldForm', fieldFormSchema)
