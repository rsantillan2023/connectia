import { MenuItem } from '../models/MenuItem.js'

export const OLA43_PRODUCT_CAPS = ['servicios']
export const OLA43_ADMIN_CAPS = ['admin.servicios']
export const OLA43_ALL_CAPS = [...OLA43_PRODUCT_CAPS, ...OLA43_ADMIN_CAPS]

export const OLA43_MENU_ITEMS = [
  {
    key: 'servicios',
    label: 'Servicios',
    route: '/servicios',
    icon: 'grid',
    order: 56,
    channel: 'u',
    capabilities: ['servicios'],
  },
  {
    key: 'admin.servicios',
    label: 'Gestión de servicios',
    route: '/servicios',
    icon: 'grid',
    order: 49,
    channel: 'a',
    capabilities: ['admin.servicios'],
  },
]

export async function ensureOla43MenuItems(tenantId) {
  for (const item of OLA43_MENU_ITEMS) {
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
      audience: { roles: [], capabilities: item.capabilities || [] },
    })
  }
}

export async function activateOla43ForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  for (const c of OLA43_ALL_CAPS) caps.add(c)
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureOla43MenuItems(tenant._id)
  return tenant
}
