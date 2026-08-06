import mongoose from 'mongoose'

/**
 * Cliente de audiencia (Ola 36-l) — agrupa destinatarios externos/puntuales
 * de una publicación por email y/o usuario, sin depender de áreas/grupos.
 */
const audienceClientSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    nombre: { type: String, required: true, trim: true, maxlength: 160 },
    emails: { type: [String], default: [] },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

audienceClientSchema.index({ tenantId: 1, activo: 1, nombre: 1 })

export const AudienceClient = mongoose.model('AudienceClient', audienceClientSchema)
