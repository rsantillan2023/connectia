import { MenuItem } from '../models/MenuItem.js'

export const OLA32_MENU_ITEMS = [
  {
    key: 'mi-equipo',
    label: 'Mi equipo',
    route: '/mi-equipo',
    icon: 'users',
    order: 51,
    channel: 'u',
  },
  {
    key: 'admin.equipos',
    label: 'Equipos (supervisor)',
    route: '/equipos',
    icon: 'users',
    order: 46.6,
    channel: 'a',
  },
]

export async function ensureOla32MenuItems(tenantId) {
  for (const item of OLA32_MENU_ITEMS) {
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
