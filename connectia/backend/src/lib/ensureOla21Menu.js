/**
 * Asegura ítems de menú Ola 21 (espacios + coworking) en tenants existentes.
 */

import { MenuItem } from '../models/MenuItem.js'

export const OLA21_MENU_ITEMS = [
  {
    key: 'espacios',
    label: 'Espacios',
    route: '/espacios',
    icon: 'building',
    order: 53,
    channel: 'u',
  },
  {
    key: 'admin.reservas',
    label: 'Reserva de espacios',
    route: '/reservas',
    icon: 'building',
    order: 46.4,
    channel: 'a',
  },
]

/**
 * Upsert de ítems faltantes. No pisa label/order si el tenant ya los personalizó.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla21MenuItems(tenantId) {
  // Oficina queda oculta: mismo motor vía /espacios
  await MenuItem.updateMany(
    { tenantId, $or: [{ key: 'oficina' }, { route: '/oficina' }] },
    { $set: { activo: false } },
  )

  for (const item of OLA21_MENU_ITEMS) {
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
