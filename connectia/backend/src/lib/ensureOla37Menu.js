import { MenuItem } from '../models/MenuItem.js'

export const OLA37_PRODUCT_CAPS = ['relevamientos', 'campo.relevamientos', 'relevamientos.ejecutar']

export const OLA37_MENU_ITEMS = [
  {
    key: 'relevamientos',
    label: 'Relevamientos',
    route: '/relevamientos',
    icon: 'map',
    order: 53,
    channel: 'u',
  },
  {
    key: 'admin.relevamientos',
    label: 'Relevamientos de campo',
    route: '/relevamientos',
    icon: 'map',
    order: 47,
    channel: 'a',
  },
]

export async function ensureOla37MenuItems(tenantId) {
  for (const item of OLA37_MENU_ITEMS) {
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

export async function activateOla37ForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  for (const c of OLA37_PRODUCT_CAPS) caps.add(c)
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureOla37MenuItems(tenant._id)
  return tenant
}
