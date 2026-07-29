/**
 * Asegura ítems de menú Ola 19 (legajo + onboarding) en tenants ya existentes.
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA19_MENU_ITEMS = [
  {
    key: 'mi-legajo',
    label: 'Mi legajo',
    route: '/mi-legajo',
    icon: 'file',
    order: 42,
    channel: 'u',
  },
  {
    key: 'bienvenida',
    label: 'Bienvenida',
    route: '/bienvenida',
    icon: 'sparkles',
    order: 43,
    channel: 'u',
  },
  {
    key: 'admin.legajos',
    label: 'Legajos RRHH',
    route: '/legajos',
    icon: 'file',
    order: 15.5,
    channel: 'a',
  },
  {
    key: 'admin.hrcatalog',
    label: 'Catálogos RRHH',
    route: '/catalogos-rrhh',
    icon: 'tag',
    order: 15.6,
    channel: 'a',
  },
  {
    key: 'admin.onboarding',
    label: 'Onboarding y egreso',
    route: '/onboarding',
    icon: 'sparkles',
    order: 15.7,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla19MenuItems(tenantId) {
  for (const item of OLA19_MENU_ITEMS) {
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
