/**
 * Asegura ítems de menú Ola 27 (talento + cultura) en tenants existentes.
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA27_MENU_ITEMS = [
  {
    key: 'mi-desarrollo',
    label: 'Mi desarrollo',
    route: '/mi-desarrollo',
    icon: 'sparkles',
    order: 57,
    channel: 'u',
  },
  {
    key: 'cultura',
    label: 'Cultura',
    route: '/cultura',
    icon: 'heart',
    order: 57.5,
    channel: 'u',
  },
  {
    key: 'admin.talento',
    label: 'Talento',
    route: '/talento',
    icon: 'sparkles',
    order: 46.55,
    channel: 'a',
  },
  {
    key: 'admin.cultura',
    label: 'Cultura empresarial',
    route: '/cultura',
    icon: 'heart',
    order: 46.56,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla27MenuItems(tenantId) {
  for (const item of OLA27_MENU_ITEMS) {
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
