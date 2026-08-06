import mongoose from 'mongoose'

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 80 },
    label: { type: String, required: true, maxlength: 160 },
    type: {
      type: String,
      enum: ['text', 'textarea', 'number', 'select'],
      default: 'text',
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, maxlength: 120 }],
  },
  { _id: false },
)

const audienceSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['all', 'restricted', 'users', 'none'],
      default: 'all',
    },
    areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AudienceClient' }],
  },
  { _id: false },
)

const serviceCatalogItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceArea',
      required: true,
      index: true,
    },
    label: { type: String, required: true, maxlength: 200, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    keywords: [{ type: String, maxlength: 60 }],
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    slaMinutes: { type: Number, default: 0, min: 0 },
    fields: { type: [fieldSchema], default: [] },
    audience: { type: audienceSchema, default: () => ({ mode: 'all' }) },
    requireApproval: { type: Boolean, default: false },
    createJiraIssue: { type: Boolean, default: false },
  },
  { timestamps: true },
)

serviceCatalogItemSchema.index({ tenantId: 1, label: 1 })
serviceCatalogItemSchema.index({ tenantId: 1, active: 1, order: 1 })

export const ServiceCatalogItem = mongoose.model(
  'ServiceCatalogItem',
  serviceCatalogItemSchema,
)
