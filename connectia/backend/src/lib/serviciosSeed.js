/**
 * Seed Ola 43 — Portal de servicios (idempotente).
 */
import { User } from '../models/User.js'
import { ServiceArea } from '../models/ServiceArea.js'
import { ServiceCatalogItem } from '../models/ServiceCatalogItem.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { activateOla43ForTenant, OLA43_ALL_CAPS } from './ensureOla43Menu.js'
import { buildHistoryEntry, computeSlaDueAt } from './servicios.js'

export function tenantWantsServicios(tenant) {
  if (!tenant) return false
  const caps = new Set([
    ...(tenant.capabilities || []),
    ...(tenant.licensedCapabilities || []),
  ])
  if (caps.has('servicios') || caps.has('admin.servicios')) return true
  const pack = String(tenant.pack || tenant.modulePack || '').toLowerCase()
  return pack === 'todo'
}

/**
 * @param {import('mongoose').Document} tenant
 * @param {{ force?: boolean }} [opts]
 */
export async function seedServiciosForTenant(tenant, opts = {}) {
  if (!tenant?._id) return { skipped: true, reason: 'no-tenant' }
  if (!opts.force && !tenantWantsServicios(tenant)) {
    return { skipped: true, reason: 'pack-sin-servicios' }
  }

  await activateOla43ForTenant(tenant)

  const licensed = new Set(tenant.licensedCapabilities || [])
  let licensedChanged = false
  if (opts.force) {
    for (const c of OLA43_ALL_CAPS) {
      if (!licensed.has(c)) {
        licensed.add(c)
        licensedChanged = true
      }
    }
  }
  if (licensedChanged) {
    tenant.licensedCapabilities = [...licensed]
    await tenant.save()
  }

  const admin = await User.findOne({
    tenantId: tenant._id,
    roles: { $in: ['admin', 'platform'] },
  }).sort({ createdAt: 1 })

  let areasCreated = 0
  let itemsCreated = 0

  async function ensureArea(name, color, order) {
    let area = await ServiceArea.findOne({ tenantId: tenant._id, name })
    if (!area) {
      area = await ServiceArea.create({
        tenantId: tenant._id,
        name,
        color,
        receptorUserIds: admin ? [admin._id] : [],
        active: true,
        order,
      })
      areasCreated++
    } else if (admin && !(area.receptorUserIds || []).length) {
      area.receptorUserIds = [admin._id]
      await area.save()
    }
    return area
  }

  const rrhh = await ensureArea('RRHH', '#0d9488', 1)
  const ti = await ensureArea('TI', '#2563eb', 2)

  async function ensureItem(area, label, slaMinutes, fields, order) {
    let item = await ServiceCatalogItem.findOne({
      tenantId: tenant._id,
      label,
      areaId: area._id,
    })
    if (!item) {
      item = await ServiceCatalogItem.create({
        tenantId: tenant._id,
        areaId: area._id,
        label,
        description: `Servicio demo: ${label}`,
        active: true,
        order,
        slaMinutes,
        fields,
      })
      itemsCreated++
    }
    return item
  }

  const epp = await ensureItem(
    rrhh,
    'Pedido de EPP',
    48 * 60,
    [
      { key: 'talle', label: 'Talle', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
      { key: 'detalle', label: 'Detalle', type: 'textarea', required: false, options: [] },
    ],
    1,
  )
  await ensureItem(
    ti,
    'Acceso a sistema',
    24 * 60,
    [
      { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
      { key: 'motivo', label: 'Motivo', type: 'textarea', required: true, options: [] },
    ],
    1,
  )

  let requestsCreated = 0
  if (admin) {
    const existing = await ServiceRequest.findOne({
      tenantId: tenant._id,
      catalogItemId: epp._id,
      createdBy: admin._id,
    })
    if (!existing) {
      const last = await ServiceRequest.findOne({ tenantId: tenant._id })
        .sort({ number: -1 })
        .select('number')
        .lean()
      const number = (last?.number || 0) + 1
      const slaMinutes = epp.slaMinutes || 0
      await ServiceRequest.create({
        tenantId: tenant._id,
        number,
        areaId: rrhh._id,
        catalogItemId: epp._id,
        status: 'recibido',
        formAnswers: [
          { key: 'talle', value: 'M' },
          { key: 'detalle', value: 'Demo seed Ola 43' },
        ],
        note: 'Solicitud demo portal de servicios',
        createdBy: admin._id,
        slaMinutes,
        slaDueAt: computeSlaDueAt(slaMinutes),
        history: [
          buildHistoryEntry({
            actorId: admin._id,
            from: '',
            to: 'recibido',
            reason: 'seed',
          }),
        ],
      })
      requestsCreated++
    }
  }

  // Otorgar admin.servicios a staff con otras caps admin.*
  const staff = await User.find({
    tenantId: tenant._id,
    activo: { $ne: false },
    capabilities: { $elemMatch: { $regex: /^admin\./ } },
  }).limit(50)
  for (const u of staff) {
    const caps = new Set(u.capabilities || [])
    if (!caps.has('admin.servicios')) {
      caps.add('admin.servicios')
      u.capabilities = [...caps]
      await u.save()
    }
  }

  return { areasCreated, itemsCreated, requestsCreated }
}
