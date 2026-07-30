import { MenuItem } from '../models/MenuItem.js'

/**
 * Defaults históricos del chrome Admin (antes hardcodeados en AdminShell):
 * - Header: Usuarios, Publicaciones, Bandeja
 * - Sidebar: Reportes
 * Solo aplica si el campo aún no existe en el documento (primera vez).
 */
export async function ensureAdminChromePins(tenantId) {
  if (!tenantId) return
  await MenuItem.updateMany(
    {
      tenantId,
      channel: { $in: ['a', 'both'] },
      route: { $in: ['/usuarios', '/publicaciones', '/solicitudes'] },
      showInAdminHeader: { $exists: false },
    },
    { $set: { showInAdminHeader: true } },
  )
  await MenuItem.updateMany(
    {
      tenantId,
      channel: { $in: ['a', 'both'] },
      route: '/reportes',
      showInAdminSidebar: { $exists: false },
    },
    { $set: { showInAdminSidebar: true } },
  )
}
