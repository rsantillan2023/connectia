import mongoose from 'mongoose'
import { HUB_KIND_IDS } from '../lib/hubKinds.js'

const hubLinkSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    titulo: { type: String, required: true, trim: true },
    subtitulo: { type: String, default: '' },
    /** Destino principal (URL, ruta, id, email, teléfono…) */
    target: { type: String, default: '', trim: true },
    /** @deprecated usar target; se mantiene por compat */
    url: { type: String, default: '', trim: true },
    /** Tipo de enlace */
    kind: {
      type: String,
      enum: HUB_KIND_IDS,
      default: 'url',
      index: true,
    },
    /** Parámetros según kind (query, subject, ids, copyText…) */
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    category: { type: String, default: 'General', trim: true, index: true },
    icon: { type: String, default: 'grid' },
    color: { type: String, default: '' },
    iconSize: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v == null || v === '' || ['sm', 'md', 'lg'].includes(v),
        message: 'iconSize inválido',
      },
    },
    order: { type: Number, default: 100 },
    activo: { type: Boolean, default: true, index: true },
    visibleUntil: {
      type: Date,
      default: () => new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999)),
      index: true,
    },
    /** Compat: external | internal (derivado del kind al guardar) */
    openMode: { type: String, enum: ['external', 'internal'], default: 'external' },
    featured: { type: Boolean, default: false },
    audience: {
      mode: { type: String, enum: ['all', 'restricted'], default: 'all' },
      areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
      groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

hubLinkSchema.index({ tenantId: 1, activo: 1, visibleUntil: 1, order: 1 })

export const HubLink = mongoose.model('HubLink', hubLinkSchema)
