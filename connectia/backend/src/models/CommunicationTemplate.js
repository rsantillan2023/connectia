import mongoose from 'mongoose'

export const COM_CHANNELS = ['email', 'whatsapp', 'sms']

const communicationTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    communicationType: { type: String, required: true, trim: true, index: true },
    channel: { type: String, enum: COM_CHANNELS, required: true, index: true },
    nombre: { type: String, default: '', maxlength: 160 },
    subject: { type: String, default: '', maxlength: 200 },
    body: { type: String, required: true, default: '' },
    activo: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
)

communicationTemplateSchema.index({ tenantId: 1, communicationType: 1, channel: 1, activo: 1 })

export const CommunicationTemplate = mongoose.model(
  'CommunicationTemplate',
  communicationTemplateSchema,
)
