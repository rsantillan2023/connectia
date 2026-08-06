/**
 * TeamScope — alcance «Mi equipo» (Ola 32).
 */
import mongoose from 'mongoose'

const sourceSchema = new mongoose.Schema(
  {
    areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea' }],
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Clientes del dominio supervisión comercial (Ola 31) */
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupCliente' }],
    /**
     * Si true y hay areaIds + clientIds: intersección (área Y cliente).
     * Si false: unión de todas las fuentes.
     */
    areaClientIntersect: { type: Boolean, default: false },
  },
  { _id: false },
)

const teamScopeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nombre: { type: String, required: true, maxlength: 160 },
    source: { type: sourceSchema, default: () => ({}) },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 0 },
    resolvedAt: { type: Date, default: null },
    allowedModules: {
      type: [String],
      default: ['muro', 'eventos', 'notif'],
      enum: ['muro', 'eventos', 'notif', 'encuestas', 'docs', 'chat', 'beneficios', 'reconocimientos'],
    },
    activo: { type: Boolean, default: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

teamScopeSchema.index({ tenantId: 1, supervisorId: 1, nombre: 1 })

export const TeamScope = mongoose.model('TeamScope', teamScopeSchema)

export function serializeTeamScope(d, extras = {}) {
  if (!d) return null
  return {
    id: String(d._id),
    supervisorId: d.supervisorId ? String(d.supervisorId) : null,
    nombre: d.nombre,
    source: {
      areaIds: (d.source?.areaIds || []).map(String),
      groupIds: (d.source?.groupIds || []).map(String),
      userIds: (d.source?.userIds || []).map(String),
      clientIds: (d.source?.clientIds || []).map(String),
      areaClientIntersect: Boolean(d.source?.areaClientIntersect),
    },
    memberIds: (d.memberIds || []).map(String),
    memberCount: d.memberCount || (d.memberIds || []).length,
    resolvedAt: d.resolvedAt,
    allowedModules: d.allowedModules || [],
    activo: d.activo !== false,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ...extras,
  }
}
