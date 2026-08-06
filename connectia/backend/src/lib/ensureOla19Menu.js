/**
 * Asegura ítems de menú Ola 19 (legajo + onboarding) en tenants ya existentes.
 * Actualiza labels por defecto viejos → copy UX 2026-07-30 (no pisa personalizaciones).
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
    label: 'Tu ingreso',
    route: '/bienvenida',
    icon: 'sparkles',
    order: 43,
    channel: 'u',
  },
  {
    key: 'admin.legajos',
    label: 'Fichas de empleado',
    route: '/legajos',
    icon: 'file',
    order: 15.5,
    channel: 'a',
  },
  {
    key: 'admin.hrcatalog',
    label: 'Listas del legajo',
    route: '/catalogos-rrhh',
    icon: 'tag',
    order: 15.6,
    channel: 'a',
  },
  {
    key: 'admin.onboarding',
    label: 'Ingreso y egreso',
    route: '/onboarding',
    icon: 'sparkles',
    order: 15.7,
    channel: 'a',
  },
]

/** Labels anteriores (seed) → se reemplazan por los nuevos si el tenant no personalizó. */
const LEGACY_LABELS = {
  bienvenida: ['Bienvenida'],
  'admin.legajos': ['Legajos RRHH'],
  'admin.hrcatalog': ['Catálogos RRHH'],
  'admin.onboarding': ['Onboarding y egreso'],
}

/**
 * Upsert de ítems faltantes. Renueva labels legacy; no pisa personalizaciones.
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 */
export async function ensureOla19MenuItems(tenantId) {
  for (const item of OLA19_MENU_ITEMS) {
    const existing = await MenuItem.findOne({ tenantId, key: item.key })
    if (existing) {
      let dirty = false
      if (existing.activo === false) {
        existing.activo = true
        dirty = true
      }
      const legacy = LEGACY_LABELS[item.key]
      if (legacy?.includes(existing.label) && existing.label !== item.label) {
        existing.label = item.label
        dirty = true
      }
      if (dirty) await existing.save()
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
