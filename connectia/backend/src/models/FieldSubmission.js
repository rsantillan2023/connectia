import mongoose from 'mongoose'

const fieldSubmissionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldAssignment',
      required: true,
      index: true,
    },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldForm', required: true },
    formVersion: { type: Number, required: true },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    evidences: [
      {
        questionId: String,
        url: String,
        mime: String,
        name: String,
      },
    ],
    facility: {
      checkin: { type: mongoose.Schema.Types.Mixed, default: null },
      checkout: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    clientMutationId: { type: String, default: '', index: true },
    offline: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

fieldSubmissionSchema.index(
  { tenantId: 1, clientMutationId: 1 },
  { unique: true, partialFilterExpression: { clientMutationId: { $gt: '' } } },
)

export const FieldSubmission = mongoose.model('FieldSubmission', fieldSubmissionSchema)
