/**
 * Asegura ítems de menú nuevos en tenants ya existentes (sin re-seed completo).
 */

import { MenuItem } from '../models/MenuItem.js'

/** Ítems ola 17 — licencias / ausentismos. */
export const OLA17_MENU_ITEMS = [
  {
    key: 'licencias',
    label: 'Vacaciones y permisos',
    route: '/licencias',
    icon: 'clipboard',
    order: 21,
    channel: 'u',
  },
  {
    key: 'ausencias',
    label: 'Ausencias',
    route: '/ausencias',
    icon: 'list',
    order: 21.5,
    channel: 'u',
  },
  {
    key: 'admin.licencias',
    label: 'Licencias',
    route: '/licencias',
    icon: 'clipboard',
    order: 19.6,
    channel: 'a',
  },
  {
    key: 'admin.tipos-licencia',
    label: 'Tipos de licencia',
    route: '/tipos-licencia',
    icon: 'tag',
    order: 19.7,
    channel: 'a',
  },
  {
    key: 'admin.ausentismos',
    label: 'Ausentismos',
    route: '/ausentismos',
    icon: 'list',
    order: 19.8,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla17MenuItems(tenantId) {
  for (const item of OLA17_MENU_ITEMS) {
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
