import { MenuItem } from '../models/MenuItem.js'

export const OLA25_PRODUCT_CAPS = ['pedidos', 'pedidos.alarma']
export const OLA25_ADMIN_CAPS = ['admin.pedidos']
export const OLA25_ALL_CAPS = [...OLA25_PRODUCT_CAPS, ...OLA25_ADMIN_CAPS]

export const OLA25_MENU_ITEMS = [
  {
    key: 'pedidos',
    label: 'Pedidos',
    route: '/pedidos',
    icon: 'package',
    order: 54,
    channel: 'u',
    capabilities: ['pedidos'],
  },
  {
    key: 'alarma',
    label: 'Reportar Incidente',
    route: '/alarma',
    icon: 'alert',
    order: 55,
    channel: 'u',
    capabilities: ['pedidos.alarma'],
  },
  {
    key: 'admin.pedidos',
    label: 'Alarmas',
    route: '/pedidos',
    icon: 'package',
    order: 48,
    channel: 'a',
    capabilities: ['admin.pedidos'],
  },
]

export async function ensureOla25MenuItems(tenantId) {
  for (const item of OLA25_MENU_ITEMS) {
    const existing = await MenuItem.findOne({ tenantId, key: item.key })
    if (existing) {
      let dirty = false
      if (existing.activo === false) {
        existing.activo = true
        dirty = true
      }
      if (item.key === 'admin.pedidos' && existing.label !== item.label) {
        existing.label = item.label
        dirty = true
      }
      if (item.key === 'alarma' && existing.label !== item.label) {
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
      audience: { roles: [], capabilities: item.capabilities || [] },
    })
  }
}

export async function activateOla25ForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  for (const c of OLA25_ALL_CAPS) caps.add(c)
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureOla25MenuItems(tenant._id)
  return tenant
}
