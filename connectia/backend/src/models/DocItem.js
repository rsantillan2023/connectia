import mongoose from 'mongoose'
import { DOC_FILE_TYPE_IDS, DOC_REPOSITORY_IDS } from '../lib/docTypes.js'

const docItemSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    category: { type: String, default: 'general', trim: true, index: true },
    /** URL resuelta / pública (o path /uploads/…) para abrir/descargar */
    fileUrl: { type: String, required: true, trim: true },
    mimeType: { type: String, default: '' },
    /** Tipo lógico: pdf | image | word | excel | powerpoint | text | other */
    fileType: {
      type: String,
      enum: DOC_FILE_TYPE_IDS,
      default: 'other',
      index: true,
    },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    /**
     * Repositorio de origen:
     * server | url | s3 | azure_blob | sap | sharepoint | onedrive | gdrive
     */
    repository: {
      type: String,
      enum: DOC_REPOSITORY_IDS,
      default: 'url',
      index: true,
    },
    /** Key/path interno del proveedor (S3 key, blob path, etc.) */
    storageKey: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    /** Quién ve el doc: all | restricted | users | none (+ userIds puntuales) */
    audience: {
      mode: {
        type: String,
        enum: ['all', 'restricted', 'users', 'none'],
        default: 'all',
      },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    downloadCount: { type: Number, default: 0 },
    downloads: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    requiresSignature: { type: Boolean, default: false },
    signatures: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        fullNameTyped: { type: String, required: true },
        signedAt: { type: Date, default: Date.now },
        ip: { type: String, default: '' },
      },
    ],
    /** Origen: admin (gestión) | member (colaborador, suele ir a aprobación) */
    origin: {
      type: String,
      enum: ['admin', 'member'],
      default: 'admin',
      index: true,
    },
    /** Origen legacy / sync: manual | sap | … */
    source: { type: String, default: 'manual', trim: true },
    externalId: { type: String, default: '', trim: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

docItemSchema.index({ tenantId: 1, status: 1, category: 1, publishedAt: -1 })
docItemSchema.index({ tenantId: 1, repository: 1, fileType: 1 })

export const DocItem = mongoose.model('DocItem', docItemSchema)
