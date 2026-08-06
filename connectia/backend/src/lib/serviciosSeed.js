/**
 * Seed Ola 43 — Portal de servicios (idempotente).
 * Variantes: default (comunidad nueva), demo, arcor.
 */
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
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
 * Catálogo demo por variante.
 * @param {string} [brandName]
 * @param {'default'|'demo'|'arcor'} [variant]
 */
export function defaultServiciosCatalog(brandName = 'la empresa', { variant = 'default' } = {}) {
  const brand = String(brandName || 'la empresa').trim() || 'la empresa'

  if (variant === 'arcor') {
    return {
      areas: [
        { name: 'People & Culture', color: '#0d9488', order: 1 },
        { name: 'IT / Sistemas', color: '#2563eb', order: 2 },
        { name: 'Planta / EHS', color: '#ea580c', order: 3 },
      ],
      items: [
        {
          area: 'People & Culture',
          label: 'Pedido de EPP',
          description: 'Casco, guantes, calzado y demás elementos de protección personal.',
          slaMinutes: 48 * 60,
          keywords: ['epp', 'casco', 'guantes', 'calzado'],
          requireApproval: false,
          order: 1,
          fields: [
            { key: 'talle', label: 'Talle', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
            { key: 'detalle', label: 'Detalle', type: 'textarea', required: false, options: [] },
          ],
        },
        {
          area: 'People & Culture',
          label: 'Constancia laboral',
          description: 'Pedido de constancia de empleo para trámites personales.',
          slaMinutes: 72 * 60,
          keywords: ['constancia', 'empleo', 'rrhh'],
          requireApproval: false,
          order: 2,
          fields: [
            { key: 'motivo', label: 'Motivo', type: 'text', required: true, options: [] },
            { key: 'destino', label: 'Para quién / entidad', type: 'text', required: false, options: [] },
          ],
        },
        {
          area: 'IT / Sistemas',
          label: 'Acceso a sistema',
          description: 'VPN, SAP, correo o notebook para el día a día en Arcor.',
          slaMinutes: 24 * 60,
          keywords: ['vpn', 'acceso', 'sistema', 'notebook', 'sap'],
          requireApproval: true,
          order: 1,
          fields: [
            { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
            { key: 'motivo', label: 'Motivo', type: 'textarea', required: true, options: [] },
          ],
        },
        {
          area: 'Planta / EHS',
          label: 'Reporte de condición insegura',
          description: 'Avisá una condición o acto inseguro en planta.',
          slaMinutes: 8 * 60,
          keywords: ['seguridad', 'ehs', 'inseguro', 'planta'],
          requireApproval: false,
          order: 1,
          fields: [
            { key: 'lugar', label: 'Lugar / línea', type: 'text', required: true, options: [] },
            { key: 'detalle', label: 'Qué observaste', type: 'textarea', required: true, options: [] },
          ],
        },
      ],
      demoRequest: {
        itemLabel: 'Pedido de EPP',
        formAnswers: [
          { key: 'talle', value: 'M' },
          { key: 'detalle', value: 'Guantes para línea Rocklets — seed Arcor' },
        ],
        note: `Solicitud demo portal de servicios · ${brand}`,
      },
    }
  }

  if (variant === 'demo') {
    return {
      areas: [
        { name: 'RRHH', color: '#0d9488', order: 1 },
        { name: 'TI', color: '#2563eb', order: 2 },
        { name: 'Facilities', color: '#7c3aed', order: 3 },
      ],
      items: [
        {
          area: 'RRHH',
          label: 'Pedido de EPP',
          description: 'Elementos de protección personal.',
          slaMinutes: 48 * 60,
          keywords: ['epp', 'casco', 'guantes'],
          requireApproval: false,
          order: 1,
          fields: [
            { key: 'talle', label: 'Talle', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
            { key: 'detalle', label: 'Detalle', type: 'textarea', required: false, options: [] },
          ],
        },
        {
          area: 'TI',
          label: 'Acceso a sistema',
          description: 'Altas de acceso a herramientas internas.',
          slaMinutes: 24 * 60,
          keywords: ['vpn', 'acceso', 'sistema', 'notebook'],
          requireApproval: true,
          order: 1,
          fields: [
            { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
            { key: 'motivo', label: 'Motivo', type: 'textarea', required: true, options: [] },
          ],
        },
        {
          area: 'Facilities',
          label: 'Reserva de sala / soporte oficina',
          description: 'Problemas de sala, clima o mobiliario.',
          slaMinutes: 12 * 60,
          keywords: ['sala', 'oficina', 'facilities', 'aire'],
          requireApproval: false,
          order: 1,
          fields: [
            { key: 'ubicacion', label: 'Ubicación', type: 'text', required: true, options: [] },
            { key: 'detalle', label: 'Detalle', type: 'textarea', required: true, options: [] },
          ],
        },
      ],
      demoRequest: {
        itemLabel: 'Pedido de EPP',
        formAnswers: [
          { key: 'talle', value: 'M' },
          { key: 'detalle', value: 'Demo seed Ola 43 · Connectia' },
        ],
        note: 'Solicitud demo portal de servicios',
      },
    }
  }

  return {
    areas: [
      { name: 'RRHH', color: '#0d9488', order: 1 },
      { name: 'TI', color: '#2563eb', order: 2 },
    ],
    items: [
      {
        area: 'RRHH',
        label: 'Pedido de EPP',
        description: `Servicio demo de ${brand}: elementos de protección.`,
        slaMinutes: 48 * 60,
        keywords: ['epp', 'casco', 'guantes'],
        requireApproval: false,
        order: 1,
        fields: [
          { key: 'talle', label: 'Talle', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
          { key: 'detalle', label: 'Detalle', type: 'textarea', required: false, options: [] },
        ],
      },
      {
        area: 'TI',
        label: 'Acceso a sistema',
        description: `Servicio demo de ${brand}: accesos y VPN.`,
        slaMinutes: 24 * 60,
        keywords: ['vpn', 'acceso', 'sistema', 'notebook'],
        requireApproval: true,
        order: 1,
        fields: [
          { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
          { key: 'motivo', label: 'Motivo', type: 'textarea', required: true, options: [] },
        ],
      },
    ],
    demoRequest: {
      itemLabel: 'Pedido de EPP',
      formAnswers: [
        { key: 'talle', value: 'M' },
        { key: 'detalle', value: `Demo seed · ${brand}` },
      ],
      note: `Solicitud demo portal de servicios · ${brand}`,
    },
  }
}

/**
 * @param {import('mongoose').Document} tenant
 * @param {{ force?: boolean, brandName?: string, variant?: 'default'|'demo'|'arcor' }} [opts]
 */
export async function seedServiciosForTenant(tenant, opts = {}) {
  if (!tenant?._id) return { skipped: true, reason: 'no-tenant' }
  if (!opts.force && !tenantWantsServicios(tenant)) {
    return { skipped: true, reason: 'pack-sin-servicios' }
  }

  const brandName = opts.brandName || tenant.nombre || 'la empresa'
  const variant = opts.variant || 'default'
  const catalog = defaultServiciosCatalog(brandName, { variant })

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
    await Tenant.updateOne(
      { _id: tenant._id },
      { $addToSet: { licensedCapabilities: { $each: OLA43_ALL_CAPS } } },
    )
    tenant.licensedCapabilities = [...licensed]
  }

  const admin = await User.findOne({
    tenantId: tenant._id,
    roles: { $in: ['admin', 'platform'] },
  }).sort({ createdAt: 1 })

  let areasCreated = 0
  let itemsCreated = 0
  let itemsUpdated = 0

  const areaByName = new Map()
  for (const a of catalog.areas) {
    let area = await ServiceArea.findOne({ tenantId: tenant._id, name: a.name })
    if (!area) {
      area = await ServiceArea.create({
        tenantId: tenant._id,
        name: a.name,
        color: a.color,
        receptorUserIds: admin ? [admin._id] : [],
        active: true,
        order: a.order,
      })
      areasCreated++
    } else {
      if (admin && !(area.receptorUserIds || []).length) {
        area.receptorUserIds = [admin._id]
      }
      if (opts.force) {
        area.color = a.color
        area.order = a.order
        area.active = true
      }
      await area.save()
    }
    areaByName.set(a.name, area)
  }

  for (const row of catalog.items) {
    const area = areaByName.get(row.area)
    if (!area) continue
    let item = await ServiceCatalogItem.findOne({
      tenantId: tenant._id,
      label: row.label,
      areaId: area._id,
    })
    const payload = {
      description: row.description,
      active: true,
      order: row.order,
      slaMinutes: row.slaMinutes,
      fields: row.fields,
      keywords: row.keywords || [],
      requireApproval: Boolean(row.requireApproval),
    }
    if (!item) {
      item = await ServiceCatalogItem.create({
        tenantId: tenant._id,
        areaId: area._id,
        label: row.label,
        ...payload,
      })
      itemsCreated++
    } else if (opts.force) {
      Object.assign(item, payload)
      await item.save()
      itemsUpdated++
    } else {
      let touched = false
      if (!(item.keywords || []).length && (row.keywords || []).length) {
        item.keywords = row.keywords
        touched = true
      }
      if (!item.description && row.description) {
        item.description = row.description
        touched = true
      }
      if (touched) {
        await item.save()
        itemsUpdated++
      }
    }
  }

  let requestsCreated = 0
  const demo = catalog.demoRequest
  if (admin && demo?.itemLabel) {
    const demoItem = await ServiceCatalogItem.findOne({
      tenantId: tenant._id,
      label: demo.itemLabel,
    })
    if (demoItem) {
      const existing = await ServiceRequest.findOne({
        tenantId: tenant._id,
        catalogItemId: demoItem._id,
        createdBy: admin._id,
        note: demo.note,
      })
      if (!existing) {
        const last = await ServiceRequest.findOne({ tenantId: tenant._id })
          .sort({ number: -1 })
          .select('number')
          .lean()
        const number = (last?.number || 0) + 1
        const slaMinutes = demoItem.slaMinutes || 0
        await ServiceRequest.create({
          tenantId: tenant._id,
          number,
          areaId: demoItem.areaId,
          catalogItemId: demoItem._id,
          status: 'recibido',
          formAnswers: demo.formAnswers || [],
          note: demo.note || 'Solicitud demo portal de servicios',
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
  }

  // Staff con caps admin.* → admin.servicios
  const staff = await User.find({
    tenantId: tenant._id,
    activo: { $ne: false },
    capabilities: { $elemMatch: { $regex: /^admin\./ } },
  }).limit(80)
  for (const u of staff) {
    const caps = new Set(u.capabilities || [])
    if (!caps.has('admin.servicios')) {
      caps.add('admin.servicios')
      u.capabilities = [...caps]
      await u.save()
    }
  }

  // Miembros activos sin cap de producto → servicios (portal U)
  const members = await User.find({
    tenantId: tenant._id,
    activo: { $ne: false },
    roles: { $nin: ['platform'] },
  }).limit(200)
  for (const u of members) {
    const caps = new Set(u.capabilities || [])
    if (!caps.has('servicios')) {
      caps.add('servicios')
      u.capabilities = [...caps]
      await u.save()
    }
  }

  return { areasCreated, itemsCreated, itemsUpdated, requestsCreated, variant }
}
