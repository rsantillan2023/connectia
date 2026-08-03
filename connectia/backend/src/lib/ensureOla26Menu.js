import { MenuItem } from '../models/MenuItem.js'
import { TvDevice } from '../models/Tv.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
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

export const OLA26_LIVE_MENU_KEYS = ['en-vivo', 'admin.live']

async function ensureMenuItemsByKeys(tenantId, keys) {
  const wanted = new Set(keys)
  for (const item of OLA26_MENU_ITEMS) {
    if (!wanted.has(item.key)) continue
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

export async function ensureOla26MenuItems(tenantId) {
  await ensureMenuItemsByKeys(
    tenantId,
    OLA26_MENU_ITEMS.map((i) => i.key),
  )
}

export async function activateOla26ForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  for (const c of OLA26_PRODUCT_CAPS) caps.add(c)
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureOla26MenuItems(tenant._id)
  return tenant
}

/**
 * Enciende solo Live (mantiene TV independiente). Deja admin.live + live.stream y menú En vivo.
 */
export async function activateOla26LiveForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  caps.add('live.stream')
  caps.add('admin.live')
  tenant.capabilities = [...caps]
  await tenant.save()
  await ensureMenuItemsByKeys(tenant._id, OLA26_LIVE_MENU_KEYS)
  return tenant
}

/**
 * Apaga el producto Live en la comunidad (mantiene admin.live para poder reactivarlo).
 * Oculta En vivo en la app y cierra emisiones en estado live.
 */
export async function deactivateOla26LiveForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  caps.delete('live.stream')
  tenant.capabilities = [...caps]
  await tenant.save()
  await MenuItem.updateMany(
    { tenantId: tenant._id, key: { $in: ['en-vivo'] } },
    { $set: { activo: false } },
  )
  const now = new Date()
  const ended = await LiveBroadcast.updateMany(
    { tenantId: tenant._id, status: 'live' },
    { $set: { status: 'ended', endsAt: now, peerCount: 0, activo: false } },
  )
  /** Apaga biblioteca URL sin borrarla (reutilizable al reactivar módulo). */
  await LiveBroadcast.updateMany(
    { tenantId: tenant._id, source: { $ne: 'camera' }, activo: true },
    { $set: { activo: false, status: 'draft' } },
  )
  return { tenant, livesEnded: ended.modifiedCount || 0 }
}

/**
 * Apaga el producto TV en la comunidad (mantiene admin.tv para poder reactivarlo).
 * Desvincula todas las pantallas activas: dejan de recibir feed al instante (credencial inválida).
 */
export async function deactivateOla26TvForTenant(tenant) {
  const caps = new Set(tenant.capabilities || [])
  caps.delete('tv.mode')
  tenant.capabilities = [...caps]
  await tenant.save()
  await MenuItem.updateMany(
    { tenantId: tenant._id, key: { $in: ['tv-emparejar'] } },
    { $set: { activo: false } },
  )
  const active = await TvDevice.find({ tenantId: tenant._id, status: 'active' }).select('_id')
  const now = Date.now()
  if (active.length) {
    await TvDevice.bulkWrite(
      active.map((d) => ({
        updateOne: {
          filter: { _id: d._id },
          update: {
            $set: {
              status: 'revoked',
              credentialHash: `revoked:${d._id}:${now}`,
            },
          },
        },
      })),
    )
  }
  return { tenant, devicesRevoked: active.length }
}
