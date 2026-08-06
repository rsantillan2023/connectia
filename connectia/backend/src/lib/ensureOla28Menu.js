/**
 * Asegura ítem de menú Ola 28 — Centro de comunicaciones (admin).
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA28_MENU_ITEMS = [
  {
    key: 'admin.comunicaciones',
    label: 'Comunicaciones',
    route: '/comunicaciones',
    icon: 'mail',
    order: 46.4,
    channel: 'a',
  },
]

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla28MenuItems(tenantId) {
  for (const item of OLA28_MENU_ITEMS) {
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
