import { MenuItem } from '../models/MenuItem.js'
import { OLA26_PRODUCT_CAPS } from './tvLive.js'

export const OLA26_MENU_ITEMS = [
  {
    key: 'tv-emparejar',
    label: 'Emparejar TV',
    route: '/tv/emparejar',
    icon: 'tv',
    order: 58,
    channel: 'u',
  },
  {
    key: 'en-vivo',
    label: 'En vivo',
    route: '/en-vivo',
    icon: 'radio',
    order: 58.5,
    channel: 'u',
  },
  {
    key: 'admin.tv',
    label: 'Modo TV',
    route: '/modo-tv',
    icon: 'tv',
    order: 48,
    channel: 'a',
  },
  {
    key: 'admin.live',
    label: 'Live streaming',
    route: '/live',
    icon: 'radio',
    order: 48.5,
    channel: 'a',
  },
]

export async function ensureOla26MenuItems(tenantId) {
  for (const item of OLA26_MENU_ITEMS) {
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

export async function activateOla26ForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  for (const c of OLA26_PRODUCT_CAPS) caps.add(c)
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureOla26MenuItems(tenant._id)
  return tenant
}
