import mongoose from 'mongoose'

/** Log de descargas de documentos (§29.11) — escalable vs array embebido. */
const documentDownloadSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocItem', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    titulo: { type: String, default: '' },
    fileType: { type: String, default: '' },
    result: { type: String, enum: ['ok', 'denied', 'error'], default: 'ok' },
    channel: { type: String, enum: ['mobile', 'desktop', 'unknown'], default: 'unknown' },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

documentDownloadSchema.index({ tenantId: 1, createdAt: -1 })
documentDownloadSchema.index({ tenantId: 1, docId: 1, createdAt: -1 })

export const DocumentDownload = mongoose.model('DocumentDownload', documentDownloadSchema)
