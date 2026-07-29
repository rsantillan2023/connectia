import mongoose from 'mongoose'

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
)

const surveyResponseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
    surveyVersion: { type: Number, default: 1 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: [answerSchema], default: [] },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

surveyResponseSchema.index({ surveyId: 1, userId: 1 }, { unique: true })

export const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema)
