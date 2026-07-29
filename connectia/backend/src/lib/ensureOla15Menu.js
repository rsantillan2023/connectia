/**
 * Asegura ítems de menú Ola 15 — Agenda / Eventos.
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA15_MENU_ITEMS = [
  {
    key: 'agenda',
    label: 'Agenda',
    route: '/agenda',
    icon: 'calendar',
    order: 18,
    channel: 'u',
  },
  {
    key: 'admin.eventos',
    label: 'Eventos',
    route: '/eventos',
    icon: 'calendar',
    order: 18.5,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 */
export async function ensureOla15MenuItems(tenantId) {
  for (const item of OLA15_MENU_ITEMS) {
    await MenuItem.findOneAndUpdate(
      { tenantId, key: item.key },
      {
        $setOnInsert: {
          tenantId,
          key: item.key,
          label: item.label,
          route: item.route,
          icon: item.icon,
          order: item.order,
          channel: item.channel,
          activo: true,
          audience: { roles: [], capabilities: [] },
        },
      },
      { upsert: true },
    )
  }
}
