import { MenuItem } from '../models/MenuItem.js'

export const OLA31_MENU_ITEMS = [
  {
    key: 'supervision',
    label: 'Supervisión',
    route: '/supervision',
    icon: 'clipboard',
    order: 52,
    channel: 'u',
  },
  {
    key: 'supervision.mis-tareas',
    label: 'Mis tareas',
    route: '/supervision/mis-tareas',
    icon: 'list',
    order: 52.1,
    channel: 'u',
  },
  {
    key: 'supervision.ecr',
    label: 'Panel ECR',
    route: '/supervision/ecr',
    icon: 'map',
    order: 52.2,
    channel: 'u',
  },
  {
    key: 'admin.supervision',
    label: 'Supervisión comercial',
    route: '/supervision',
    icon: 'clipboard',
    order: 46.5,
    channel: 'a',
  },
]

export async function ensureOla31MenuItems(tenantId) {
  for (const item of OLA31_MENU_ITEMS) {
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
