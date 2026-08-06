/**
 * Roles de cobertura (cliente↔sala): catálogo del módulo, independiente de User.supervisionRole.
 */
import { SupCoberturaRol } from '../models/Supervision.js'

export const DEFAULT_COBERTURA_ROLES = Object.freeze([
  {
    codigo: 'operario',
    nombre: 'Operario',
    descripcion: 'Ejecuta visitas y chequeos en el local.',
    orden: 10,
  },
  {
    codigo: 'supervisor',
    nombre: 'Supervisor',
    descripcion: 'Revisa y da seguimiento a la cobertura en el local.',
    orden: 20,
  },
  {
    codigo: 'encargado',
    nombre: 'Encargado',
    descripcion: 'Responsable de la cuenta en esa sala.',
    orden: 30,
  },
  {
    codigo: 'apoyo',
    nombre: 'Apoyo',
    descripcion: 'Colabora de forma puntual en la cobertura.',
    orden: 40,
  },
  {
    codigo: 'plataforma_comercial',
    nombre: 'Plataforma comercial',
    descripcion: 'Soporte comercial sobre la cobertura (rol de módulo, no del usuario).',
    orden: 50,
  },
  {
    codigo: 'gestor',
    nombre: 'Gestor',
    descripcion: 'Gestiona la cuenta/sala en supervisión comercial.',
    orden: 60,
  },
  {
    codigo: 'admin_mod',
    nombre: 'Admin módulo',
    descripcion: 'Administra coberturas; no equivale al rol general del usuario.',
    orden: 70,
  },
])

export async function ensureDefaultCoberturaRoles(tenantId) {
  let created = 0
  let updated = 0
  for (const r of DEFAULT_COBERTURA_ROLES) {
    const existing = await SupCoberturaRol.findOne({ tenantId, codigo: r.codigo })
    if (!existing) {
      await SupCoberturaRol.create({
        tenantId,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        orden: r.orden,
        activo: true,
      })
      created += 1
      continue
    }
    // Alinear nombres cortos de defaults (sin tocar roles custom).
    if (existing.nombre !== r.nombre || existing.orden !== r.orden) {
      existing.nombre = r.nombre
      existing.descripcion = r.descripcion
      existing.orden = r.orden
      await existing.save()
      updated += 1
    }
  }
  return created + updated
}
