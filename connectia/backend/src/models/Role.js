import mongoose from 'mongoose'

/**
 * Rol nombrado del tenant: plantilla de capabilities de pantallas admin.
 * Los roles de sistema (member/admin) siguen en User.roles; esto es RBAC de pantallas.
 */
const roleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    capabilities: { type: [String], default: [] },
    /** Si true, no se puede borrar (plantillas seed) */
    sistema: { type: Boolean, default: false },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 100 },
  },
  { timestamps: true },
)

roleSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const Role = mongoose.model('Role', roleSchema)

export const DEFAULT_ROLES = [
  {
    key: 'editor_contenido',
    nombre: 'Editor de contenido',
    descripcion: 'Publicaciones, encuestas y documentos',
    capabilities: ['admin.publicaciones', 'admin.encuestas', 'admin.documentos'],
    sistema: true,
    orden: 10,
  },
  {
    key: 'gestor_solicitudes',
    nombre: 'Gestor de solicitudes',
    descripcion: 'Bandeja, plantillas y estados',
    capabilities: ['admin.solicitudes', 'admin.tipos-solicitud'],
    sistema: true,
    orden: 20,
  },
  {
    key: 'rrhh',
    nombre: 'RRHH',
    descripcion: 'Usuarios, organización y legajos',
    capabilities: ['admin.usuarios', 'admin.organizacion', 'admin.legajos', 'admin.roles'],
    sistema: true,
    orden: 30,
  },
]
