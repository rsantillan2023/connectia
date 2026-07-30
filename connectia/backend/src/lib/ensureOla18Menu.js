/**
 * Asegura ítems de menú Ola 18 (asistencia / turnos / marcación).
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA18_MENU_ITEMS = [
  {
    key: 'asistencia',
    label: 'Mi asistencia',
    route: '/mi-asistencia',
    icon: 'pin',
    order: 22,
    channel: 'u',
  },
  {
    key: 'admin.asistencia',
    label: 'Asistencia y turnos',
    route: '/asistencia',
    icon: 'pin',
    order: 46.5,
    channel: 'a',
  },
]

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla18MenuItems(tenantId) {
  for (const item of OLA18_MENU_ITEMS) {
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
