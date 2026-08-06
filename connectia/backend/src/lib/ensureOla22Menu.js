/**
 * Asegura ítems de menú Ola 22 (organigrama U + reportes A).
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA22_MENU_ITEMS = [
  {
    key: 'organigrama',
    label: 'Organigrama',
    route: '/organigrama',
    icon: 'sitemap',
    order: 28,
    channel: 'u',
  },
  {
    key: 'admin.reportes',
    label: 'Reportes e informes',
    route: '/reportes',
    icon: 'chart',
    order: 12,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla22MenuItems(tenantId) {
  for (const item of OLA22_MENU_ITEMS) {
    const existing = await MenuItem.findOne({ tenantId, key: item.key })
    if (existing) {
      if (existing.activo === false) {
        existing.activo = true
        await existing.save()
      }
      continue
    }
    await MenuItem.create({
      tenantId,
      key: item.key,
      label: item.label,
      route: item.route,
      icon: item.icon,
      order: item.order,
      channel: item.channel,
      activo: true,
      audience: { roles: [], capabilities: [] },
    })
  }
}
