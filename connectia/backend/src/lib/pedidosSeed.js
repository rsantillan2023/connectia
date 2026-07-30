/**
 * Seed Ola 25 — Pedidos de campo + canal alarma (idempotente).
 * Usado por CLI, seed DEMO, ARCOR y alta de comunidad.
 */
import { User } from '../models/User.js'
import { PedidoCategory } from '../models/PedidoCategory.js'
import { PedidoArticle } from '../models/PedidoArticle.js'
import { Pedido } from '../models/Pedido.js'
import { activateOla25ForTenant, OLA25_ALL_CAPS } from './ensureOla25Menu.js'
import { buildHistoryEntry } from './pedidos.js'

export function tenantWantsPedidos(tenant) {
  if (!tenant) return false
  const caps = new Set([
    ...(tenant.capabilities || []),
    ...(tenant.licensedCapabilities || []),
  ])
  if (caps.has('pedidos') || caps.has('pedidos.alarma') || caps.has('admin.pedidos')) {
    return true
  }
  const pack = String(tenant.pack || tenant.modulePack || '').toLowerCase()
  return pack === 'todo'
}

/**
 * @param {import('mongoose').Document} tenant
 * @param {{ force?: boolean, brandName?: string, demoAlarmNote?: string }} [opts]
 */
export async function seedPedidosForTenant(tenant, opts = {}) {
  if (!tenant?._id) return { skipped: true, reason: 'no-tenant' }
  if (!opts.force && !tenantWantsPedidos(tenant)) {
    return { skipped: true, reason: 'pack-sin-pedidos' }
  }

  await activateOla25ForTenant(tenant)

  // Asegurar caps también en licensed (PLATFORM / pack todo)
  const licensed = new Set(tenant.licensedCapabilities || [])
  let licensedChanged = false
  for (const c of OLA25_ALL_CAPS) {
    if (!licensed.has(c) && (opts.force || tenantWantsPedidos(tenant) || licensed.has('pedidos'))) {
      licensed.add(c)
      licensedChanged = true
    }
  }
  // Si forzamos (DEMO/ARCOR), siempre alinear licensed
  if (opts.force) {
    for (const c of OLA25_ALL_CAPS) licensed.add(c)
    licensedChanged = true
  }
  if (licensedChanged) {
    tenant.licensedCapabilities = [...licensed]
    await tenant.save()
  }

  const admin = await User.findOne({
    tenantId: tenant._id,
    roles: { $in: ['admin', 'platform'] },
  }).sort({ createdAt: 1 })

  let panic = await PedidoCategory.findOne({
    tenantId: tenant._id,
    name: 'Pánico / incidente',
  })
  let categoriesCreated = 0
  if (!panic) {
    panic = await PedidoCategory.create({
      tenantId: tenant._id,
      name: 'Pánico / incidente',
      colorMap: '#dc2626',
      receptorUserIds: admin ? [admin._id] : [],
      requireGps: false,
      requirePhoto: false,
      defaultForAlarm: true,
      active: true,
      order: 1,
    })
    categoriesCreated++
  } else if (!panic.defaultForAlarm) {
    panic.defaultForAlarm = true
    if (admin && !(panic.receptorUserIds || []).length) {
      panic.receptorUserIds = [admin._id]
    }
    await panic.save()
  } else if (admin && !(panic.receptorUserIds || []).length) {
    panic.receptorUserIds = [admin._id]
    await panic.save()
  }

  let insumos = await PedidoCategory.findOne({
    tenantId: tenant._id,
    name: 'Insumos',
  })
  if (!insumos) {
    insumos = await PedidoCategory.create({
      tenantId: tenant._id,
      name: 'Insumos',
      colorMap: '#2563eb',
      receptorUserIds: admin ? [admin._id] : [],
      requireGps: false,
      active: true,
      order: 2,
    })
    categoriesCreated++
  }

  let articlesCreated = 0
  let art = await PedidoArticle.findOne({
    tenantId: tenant._id,
    label: 'Toner impresora',
  })
  if (!art) {
    art = await PedidoArticle.create({
      tenantId: tenant._id,
      label: 'Toner impresora',
      description: 'Artículo demo catálogo',
      unit: 'u',
      categoryId: insumos._id,
      active: true,
      order: 1,
    })
    articlesCreated++
  }

  const member =
    (await User.findOne({
      tenantId: tenant._id,
      roles: { $nin: ['platform'] },
    }).sort({ createdAt: 1 })) || admin

  const note =
    opts.demoAlarmNote ||
    `Seed demo Ola 25 — punto con geo (${opts.brandName || tenant.empCodigo || 'tenant'})`

  let alarmCreated = 0
  const existingAlarm = await Pedido.findOne({
    tenantId: tenant._id,
    source: 'alarm',
    idempotencyKey: `seed:ola25:alarm:${tenant.empCodigo}`,
  })
  if (!existingAlarm && member) {
    const last = await Pedido.findOne({ tenantId: tenant._id }).sort({ number: -1 })
    const number = (last?.number || 0) + 1
    await Pedido.create({
      tenantId: tenant._id,
      number,
      source: 'alarm',
      categoryId: panic._id,
      priority: 'urgent',
      status: 'abierta',
      note,
      geo: {
        lat: -34.6037,
        lng: -58.3816,
        accuracy: 12,
        capturedAt: new Date(),
        permission: 'granted',
      },
      items: [{ label: panic.name, qty: 1, unit: 'u' }],
      createdBy: member._id,
      history: [
        buildHistoryEntry({
          actorId: member._id,
          from: '',
          to: 'abierta',
          reason: 'seed',
        }),
      ],
      idempotencyKey: `seed:ola25:alarm:${tenant.empCodigo}`,
      // seed sin foto para no depender de upload; producción exige foto en canal U
      attachments: [],
    })
    alarmCreated = 1
  }

  // Staff con admin.pedidos si tiene otras pantallas admin
  const staff = await User.find({
    tenantId: tenant._id,
    activo: { $ne: false },
    capabilities: { $exists: true, $ne: [] },
  }).limit(20)
  for (const u of staff) {
    const set = new Set(u.capabilities || [])
    if ([...set].some((c) => String(c).startsWith('admin.')) && !set.has('admin.pedidos')) {
      set.add('admin.pedidos')
      u.capabilities = [...set]
      await u.save()
    }
  }

  return {
    skipped: false,
    categoriesCreated,
    articlesCreated,
    alarmCreated,
    caps: OLA25_ALL_CAPS,
  }
}
