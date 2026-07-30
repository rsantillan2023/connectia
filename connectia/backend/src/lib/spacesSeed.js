/**
 * Seed demo de sedes / tipos / atributos / recursos / política (Ola 21).
 */
import {
  SpaceSite,
  SpaceResource,
  SpacePolicy,
  SpaceResourceType,
  SpaceAttributeDef,
} from '../models/Space.js'
import { defaultSpacePolicy, attributesFromEquipment } from './spaces.js'
import {
  DEFAULT_ATTRIBUTE_DEFS,
  DEFAULT_RESOURCE_TYPES,
  normalizeTypeCodigo,
  normalizeAttributeKey,
} from './spacesCatalog.js'
import { ensureOla21MenuItems } from './ensureOla21Menu.js'
import { Tenant } from '../models/Tenant.js'

const DEMO_SITES = [
  {
    codigo: 'HQ',
    nombre: 'Sede Central',
    direccion: 'Av. Corrientes 1234, CABA',
    aforoMax: 120,
    amenities: ['wifi', 'cafetería', 'lockers'],
    whoIsHereEnabled: true,
    orden: 10,
  },
  {
    codigo: 'NORTE',
    nombre: 'Oficina Norte',
    direccion: 'Panamericana km 35',
    aforoMax: 40,
    amenities: ['wifi', 'estacionamiento'],
    whoIsHereEnabled: false,
    orden: 20,
  },
]

const CLARO_SITES = [
  {
    codigo: 'HQ',
    nombre: 'Torre Claro — Macrocentro',
    direccion: 'Av. Alicia Moreau de Justo 1150, Puerto Madero, CABA',
    aforoMax: 220,
    amenities: ['wifi', 'cafetería', 'lockers', 'gimnasio'],
    whoIsHereEnabled: true,
    orden: 10,
  },
  {
    codigo: 'NORTE',
    nombre: 'Claro Norte — Martínez',
    direccion: 'Av. del Libertador 2200, Martínez',
    aforoMax: 60,
    amenities: ['wifi', 'estacionamiento', 'cafetería'],
    whoIsHereEnabled: true,
    orden: 20,
  },
]

function demoResources(siteIdByCode, typeIdByCodigo, { brand = 'default' } = {}) {
  const hq = siteIdByCode.HQ
  const norte = siteIdByCode.NORTE
  const isClaro = brand === 'claro'
  const t = (codigo) => typeIdByCodigo[codigo] || null
  return [
    {
      siteId: hq,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Roja' : 'Sala Andes',
      codigo: isClaro ? 'ROJA' : 'ANDES',
      capacity: 8,
      equipment: ['tv', 'videollamada', 'pizarra'],
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'pizarra', value: '' },
        { key: 'hdmi', value: '' },
      ],
      bufferMin: 10,
      floor: '3',
      zone: 'Reuniones',
      orden: 10,
    },
    {
      siteId: hq,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Board Claro' : 'Sala Patagonia',
      codigo: isClaro ? 'BOARD' : 'PATAG',
      capacity: 16,
      equipment: ['tv', 'videollamada', 'proyector'],
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'proyector', value: '' },
        { key: 'hdmi', value: '' },
      ],
      requiresApproval: true,
      floor: '4',
      zone: 'Reuniones',
      orden: 20,
    },
    {
      siteId: hq,
      typeId: t('cochera'),
      kind: 'cochera',
      nombre: isClaro ? 'Plaza Claro S-12' : 'Plaza S-12',
      codigo: 'S12',
      vehicleTypes: ['auto', 'ev'],
      exigePatente: true,
      diaCompleto: true,
      floor: '-1',
      zone: 'Subsuelo A',
      orden: 30,
    },
    {
      siteId: hq,
      typeId: t('cochera'),
      kind: 'cochera',
      nombre: isClaro ? 'Rotativa Puerto Madero' : 'Zona rotativa Norte',
      codigo: 'ZN-ROT',
      cupo: 8,
      vehicleTypes: ['auto', 'moto'],
      exigePatente: true,
      diaCompleto: true,
      floor: '-1',
      zone: 'Rotativas',
      orden: 40,
    },
    {
      siteId: hq,
      typeId: t('puesto'),
      kind: 'puesto',
      nombre: isClaro ? 'Puesto Open C-01' : 'Puesto A-01',
      codigo: isClaro ? 'C01' : 'A01',
      floor: '2',
      zone: 'Open space',
      zoneType: 'open',
      equipment: ['monitor', 'docking'],
      attributes: [{ key: 'monitor', value: '' }],
      orden: 50,
    },
    {
      siteId: hq,
      typeId: t('puesto'),
      kind: 'puesto',
      nombre: isClaro ? 'Puesto Focus C-03' : 'Puesto Focus F-03',
      codigo: isClaro ? 'C03' : 'F03',
      floor: '2',
      zone: 'Focus',
      zoneType: 'focus',
      equipment: ['monitor'],
      attributes: [
        { key: 'monitor', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      orden: 60,
    },
    {
      siteId: hq,
      typeId: t('zona_cupo'),
      kind: 'zona_cupo',
      nombre: isClaro ? 'Hot desk Claro 2º' : 'Hot desk Open 2º',
      codigo: 'HD-2',
      floor: '2',
      zone: 'Open space',
      zoneType: 'open',
      cupo: 12,
      attributes: [{ key: 'wifi', value: '' }],
      orden: 70,
    },
    {
      siteId: hq,
      typeId: t('proyector'),
      kind: 'activo',
      nombre: isClaro ? 'Proyector Epson Claro' : 'Proyector Epson Sala 3',
      codigo: isClaro ? 'PRJ-1' : 'PRJ-E3',
      capacity: 1,
      equipment: ['proyector', 'hdmi'],
      attributes: [
        { key: 'hdmi', value: '' },
        { key: '4k', value: '' },
        { key: 'portatil', value: '' },
        { key: 'marca', value: 'Epson' },
      ],
      orden: 72,
    },
    {
      siteId: hq,
      typeId: t('herramienta'),
      kind: 'activo',
      nombre: isClaro ? 'Taladro depósito Claro' : 'Taladro #12',
      codigo: isClaro ? 'TAL-1' : 'TAL-12',
      capacity: 1,
      attributes: [
        { key: 'marca', value: 'Bosch' },
        { key: 'potencia', value: '750W' },
        { key: 'portatil', value: '' },
      ],
      orden: 73,
    },
    {
      siteId: hq,
      typeId: t('locker'),
      kind: 'activo',
      nombre: isClaro ? 'Locker planta 2' : 'Locker L-204',
      codigo: isClaro ? 'LK-2' : 'L204',
      capacity: 1,
      orden: 74,
    },
    {
      siteId: hq,
      typeId: t('hora_libre'),
      kind: 'hora_libre',
      nombre: isClaro ? 'Franja pausa activa' : 'Franja bienestar 15–16',
      codigo: 'HL-15',
      capacity: 20,
      zone: 'Bienestar',
      orden: 75,
    },
    {
      siteId: hq,
      typeId: t('grupo'),
      kind: 'grupo',
      nombre: isClaro ? 'Squad room Claro' : 'Sala grupal Open',
      codigo: 'GRP-1',
      capacity: 12,
      zone: 'Colab',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'pizarra', value: '' },
      ],
      orden: 76,
    },
    {
      siteId: norte,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Norte Claro' : 'Sala Norte 1',
      codigo: 'N1',
      capacity: 6,
      equipment: ['tv'],
      attributes: [{ key: 'wifi', value: '' }],
      floor: '1',
      orden: 80,
    },
    {
      siteId: norte,
      typeId: t('zona_cupo'),
      kind: 'zona_cupo',
      nombre: isClaro ? 'Hot desk Martínez' : 'Hot desk Norte',
      codigo: 'HD-N',
      floor: '1',
      zone: 'Open',
      zoneType: 'open',
      cupo: 20,
      orden: 90,
    },
  ]
}

function resolvePreset(brandName, empCodigo) {
  const key = `${brandName || ''} ${empCodigo || ''}`.toLowerCase()
  if (/\bclaro\b/.test(key)) return 'claro'
  return 'default'
}

/**
 * Upsert tipos + atributos del catálogo para el tenant.
 */
export async function seedSpaceCatalogForTenant(tenantId) {
  let attrsUpserted = 0
  for (const a of DEFAULT_ATTRIBUTE_DEFS) {
    const key = normalizeAttributeKey(a.key)
    await SpaceAttributeDef.findOneAndUpdate(
      { tenantId, key },
      {
        $set: {
          label: a.label,
          valueType: a.valueType || 'flag',
          options: a.options || [],
          activo: true,
          orden: a.orden ?? 100,
        },
        $setOnInsert: { tenantId, key },
      },
      { upsert: true },
    )
    attrsUpserted += 1
  }

  const typeIdByCodigo = {}
  let typesUpserted = 0
  for (const t of DEFAULT_RESOURCE_TYPES) {
    const codigo = normalizeTypeCodigo(t.codigo)
    const doc = await SpaceResourceType.findOneAndUpdate(
      { tenantId, codigo },
      {
        $set: {
          label: t.label,
          icon: t.icon || 'box',
          descripcion: t.descripcion || '',
          engineKind: t.engineKind,
          attributeKeys: t.attributeKeys || [],
          exigePatenteDefault: !!t.exigePatenteDefault,
          requiresApprovalDefault: !!t.requiresApprovalDefault,
          diaCompletoDefault: !!t.diaCompletoDefault,
          showInUserCatalog: t.showInUserCatalog !== false,
          showInOffice: !!t.showInOffice,
          system: !!t.system,
          activo: true,
          orden: t.orden ?? 100,
        },
        $setOnInsert: { tenantId, codigo },
      },
      { upsert: true, new: true },
    )
    typeIdByCodigo[codigo] = doc._id
    typesUpserted += 1
  }

  return { attrsUpserted, typesUpserted, typeIdByCodigo }
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ brandName?: string, empCodigo?: string }} [opts]
 */
export async function seedSpacesForTenant(tenantId, { brandName, empCodigo } = {}) {
  await ensureOla21MenuItems(tenantId)

  const caps = new Set()
  const tenant = await Tenant.findById(tenantId)
  if (tenant) {
    for (const c of tenant.capabilities || []) caps.add(c)
    caps.add('espacios')
    caps.add('espacios.salas')
    caps.add('espacios.cocheras')
    caps.add('espacios.coworking')
    tenant.capabilities = [...caps]
    tenant.menuVersion = (tenant.menuVersion || 0) + 1
    await tenant.save()
  }

  const catalog = await seedSpaceCatalogForTenant(tenantId)

  const preset = resolvePreset(brandName || tenant?.nombre, empCodigo || tenant?.empCodigo)
  const sitesDef = preset === 'claro' ? CLARO_SITES : DEMO_SITES

  await SpacePolicy.findOneAndUpdate(
    { tenantId },
    { $setOnInsert: { tenantId, ...defaultSpacePolicy() } },
    { upsert: true, new: true },
  )

  const siteIdByCode = {}
  for (const s of sitesDef) {
    let site = await SpaceSite.findOne({ tenantId, codigo: s.codigo })
    if (!site) {
      site = await SpaceSite.create({ tenantId, ...s, activo: true })
    } else {
      Object.assign(site, { ...s, activo: true })
      await site.save()
    }
    siteIdByCode[s.codigo] = site._id
  }

  let created = 0
  let updated = 0
  for (const r of demoResources(siteIdByCode, catalog.typeIdByCodigo, { brand: preset })) {
    const attrs =
      r.attributes?.length > 0
        ? r.attributes
        : attributesFromEquipment(r.equipment, r.accessible)
    const payload = { ...r, attributes: attrs, activo: true }
    const existing = await SpaceResource.findOne({
      tenantId,
      codigo: r.codigo,
      siteId: r.siteId,
    })
    if (existing) {
      Object.assign(existing, payload)
      await existing.save()
      updated += 1
    } else {
      await SpaceResource.create({
        tenantId,
        ...payload,
        audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
        horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      })
      created += 1
    }
  }

  return {
    brandName: brandName || tenant?.nombre || '',
    preset,
    sites: Object.keys(siteIdByCode).length,
    resourcesCreated: created,
    resourcesUpdated: updated,
    typesUpserted: catalog.typesUpserted,
    attrsUpserted: catalog.attrsUpserted,
    capabilities: [...caps],
    siteIdByCode,
  }
}
