import mongoose from 'mongoose'
import { SURVEY_QUESTION_TYPES } from '../lib/surveyQuestions.js'

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    texto: { type: String, required: true, trim: true },
    tipo: { type: String, enum: SURVEY_QUESTION_TYPES, default: 'text' },
    required: { type: Boolean, default: true },
    opciones: [{ type: String }],
    /** Agrupación temática del cuestionario (ej. "Liderazgo", "Beneficios") */
    grupo: { type: String, default: 'General', trim: true },
  },
  { _id: false },
)

const surveySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    questions: { type: [questionSchema], default: [] },
    version: { type: Number, default: 1 },
    audience: {
      mode: { type: String, enum: ['all', 'restricted', 'users', 'none'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    /**
     * Congelado al publicar: cuántas personas “recibieron” esta encuesta.
     * Sirve para medir participación real vs el universo enviado.
     */
    audienceSnapshot: {
      invitedCount: { type: Number, default: null },
      capturedAt: { type: Date, default: null },
      mode: { type: String, default: '' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId }],
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    anonymous: { type: Boolean, default: false },
    /**
     * Etiqueta opcional para filtrar/reportar (§16 onboarding).
     * El CRUD sigue siendo Admin → Encuestas; onboarding solo vincula surveyId.
     */
    purpose: {
      type: String,
      enum: ['general', 'onboarding', 'offboarding'],
      default: 'general',
      index: true,
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

surveySchema.index({ tenantId: 1, status: 1, publishedAt: -1 })

export { SURVEY_QUESTION_TYPES } from '../lib/surveyQuestions.js'
export const Survey = mongoose.model('Survey', surveySchema)
