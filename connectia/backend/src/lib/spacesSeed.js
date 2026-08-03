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
import { normalizeOccupancyFields } from './spacesOccupancy.js'
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
  /** Fotos demo (Unsplash) — se muestran en admin y en /espacios. */
  const img = {
    sala: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80',
    salaBoard: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80',
    cochera: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=900&q=80',
    cocheraZona: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=900&q=80',
    puesto: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80',
    puestoFocus: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&q=80',
    hotdesk: 'https://images.unsplash.com/photo-1497366412874-3415097a27b7?w=900&q=80',
    proyector: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=900&q=80',
    herramienta: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&q=80',
    locker: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
    horaLibre: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80',
    grupo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80',
    auditorio: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=900&q=80',
    cafeteria: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&q=80',
    salaNorte: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=900&q=80',
    hotdeskNorte: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80',
  }
  return [
    // ─── Demo ocupación: 1 de cada clase (filtrable en admin) ───
    {
      siteId: hq,
      typeId: t('proyector'),
      kind: 'activo',
      nombre: isClaro ? 'Proyector demo (unitario)' : 'Proyector demo (unitario)',
      codigo: 'OCC-UNIT',
      descripcion:
        'Ejemplo de ocupación UNITARIA: un activo = una reserva a la vez. Si se solapa, choca. Ideal para proyector, sala chica o plaza fija.',
      occupancyClass: 'unitario',
      unitCount: 1,
      unitLabel: 'Activo',
      capacity: 1,
      attributes: [
        { key: 'hdmi', value: '' },
        { key: '4k', value: '' },
        { key: 'portatil', value: '' },
        { key: 'marca', value: 'Epson' },
      ],
      bufferMin: 15,
      floor: 'PB',
      zone: 'Demo ocupación',
      imageUrl: img.proyector,
      orden: 1,
    },
    {
      siteId: hq,
      typeId: t('locker'),
      kind: 'activo',
      nombre: isClaro ? 'Cajonera demo (numerada)' : 'Cajonera demo (numerada)',
      codigo: 'OCC-NUM',
      descripcion:
        'Ejemplo de UNIDADES NUMERADAS: un solo activo padre con 24 cajones (L-001…L-024). Al reservar elegís el número libre. No hace falta dar de alta 24 activos.',
      occupancyClass: 'unidades_numeradas',
      unitCount: 24,
      unitLabel: 'Cajón',
      unitPrefix: 'L-',
      unitPad: 3,
      cupo: 24,
      attributes: [{ key: 'accesible', value: '' }],
      accessible: true,
      floor: '2',
      zone: 'Demo ocupación',
      imageUrl: img.locker,
      diaCompleto: true,
      orden: 2,
    },
    {
      siteId: hq,
      typeId: t('zona_cupo'),
      kind: 'zona_cupo',
      nombre: isClaro ? 'Hot desk demo (pool)' : 'Hot desk demo (pool)',
      codigo: 'OCC-POOL',
      descripcion:
        'Ejemplo de CUPO COMPARTIDO (pool / FIFO): 12 lugares sin número fijo. Al reservar solo importa que quede cupo; no elegís asiento.',
      occupancyClass: 'pool',
      unitCount: 12,
      unitLabel: 'Puesto',
      cupo: 12,
      floor: '2',
      zone: 'Demo ocupación',
      zoneType: 'open',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.hotdesk,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 3,
    },
    {
      siteId: hq,
      typeId: t('hora_libre'),
      kind: 'hora_libre',
      nombre: isClaro ? 'Aforo demo (multi)' : 'Aforo demo (multi-reserva)',
      codigo: 'OCC-AFORO',
      descripcion:
        'Ejemplo de AFORO / multi-reserva: el mismo activo admite hasta 30 reservas concurrentes en la misma franja. UX de espacio compartido, no de cajón.',
      occupancyClass: 'aforo',
      unitCount: 30,
      unitLabel: 'Lugar',
      cupo: 30,
      capacity: 30,
      floor: '1',
      zone: 'Demo ocupación',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.horaLibre,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 4,
    },

    // ─── Catálogo habitual (ocupación explícita) ───
    {
      siteId: hq,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Roja' : 'Sala Andes',
      codigo: isClaro ? 'ROJA' : 'ANDES',
      descripcion: isClaro
        ? 'Sala de reuniones mediana con TV y pizarra. Ocupación unitaria: una reserva a la vez.'
        : 'Sala de reuniones para hasta 8 personas, con videollamada, HDMI y pizarra. Ocupación unitaria (una reserva a la vez).',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 8,
      equipment: ['tv', 'videollamada', 'pizarra'],
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'pizarra', value: '' },
        { key: 'hdmi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      bufferMin: 10,
      floor: '3',
      zone: 'Reuniones',
      imageUrl: img.sala,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 10,
    },
    {
      siteId: hq,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Board Claro' : 'Sala Patagonia',
      codigo: isClaro ? 'BOARD' : 'PATAG',
      descripcion: isClaro
        ? 'Sala de directorio con proyector y videollamada. Requiere aprobación. Ocupación unitaria.'
        : 'Sala de directorio para 16 personas. Proyector 4K, videollamada y HDMI. Requiere aprobación. Ocupación unitaria.',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 16,
      equipment: ['tv', 'videollamada', 'proyector'],
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'proyector', value: '' },
        { key: 'hdmi', value: '' },
        { key: '4k', value: '' },
        { key: 'pizarra', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      requiresApproval: true,
      bufferMin: 15,
      floor: '4',
      zone: 'Reuniones',
      imageUrl: img.salaBoard,
      horario: { days: [1, 2, 3, 4, 5], open: '09:00', close: '19:00' },
      orden: 20,
    },
    {
      siteId: hq,
      typeId: t('cochera'),
      kind: 'cochera',
      nombre: isClaro ? 'Plaza Claro S-12' : 'Plaza S-12',
      codigo: 'S12',
      descripcion:
        'Plaza fija nominada (ocupación unitaria). Apta auto y EV. Exige patente. Una reserva a la vez.',
      occupancyClass: 'unitario',
      unitCount: 1,
      vehicleTypes: ['auto', 'ev'],
      exigePatente: true,
      diaCompleto: true,
      floor: '-1',
      zone: 'Subsuelo A',
      attributes: [{ key: 'accesible', value: '' }],
      accessible: true,
      imageUrl: img.cochera,
      orden: 30,
    },
    {
      siteId: hq,
      typeId: t('cochera'),
      kind: 'cochera',
      nombre: isClaro ? 'Rotativa Puerto Madero' : 'Zona rotativa Norte',
      codigo: 'ZN-ROT',
      descripcion:
        'Cocheras rotativas con cupo compartido (pool): 8 plazas sin número fijo. Autos y motos; se pide patente.',
      occupancyClass: 'pool',
      unitCount: 8,
      unitLabel: 'Plaza',
      cupo: 8,
      vehicleTypes: ['auto', 'moto'],
      exigePatente: true,
      diaCompleto: true,
      floor: '-1',
      zone: 'Rotativas',
      imageUrl: img.cocheraZona,
      orden: 40,
    },
    {
      siteId: hq,
      typeId: t('puesto'),
      kind: 'puesto',
      nombre: isClaro ? 'Puesto Open C-01' : 'Puesto A-01',
      codigo: isClaro ? 'C01' : 'A01',
      descripcion:
        'Puesto nominado en open space (ocupación unitaria) con monitor y docking.',
      occupancyClass: 'unitario',
      unitCount: 1,
      floor: '2',
      zone: 'Open space',
      zoneType: 'open',
      equipment: ['monitor', 'docking'],
      attributes: [
        { key: 'monitor', value: '' },
        { key: 'wifi', value: '' },
        { key: 'hdmi', value: '' },
      ],
      imageUrl: img.puesto,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '19:00' },
      orden: 50,
    },
    {
      siteId: hq,
      typeId: t('puesto'),
      kind: 'puesto',
      nombre: isClaro ? 'Puesto Focus C-03' : 'Puesto Focus F-03',
      codigo: isClaro ? 'C03' : 'F03',
      descripcion:
        'Puesto en zona focus (ocupación unitaria). Accesible, con monitor.',
      occupancyClass: 'unitario',
      unitCount: 1,
      floor: '2',
      zone: 'Focus',
      zoneType: 'focus',
      equipment: ['monitor'],
      attributes: [
        { key: 'monitor', value: '' },
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.puestoFocus,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '19:00' },
      orden: 60,
    },
    {
      siteId: hq,
      typeId: t('zona_cupo'),
      kind: 'zona_cupo',
      nombre: isClaro ? 'Hot desk Claro 2º' : 'Hot desk Open 2º',
      codigo: 'HD-2',
      descripcion:
        'Hot desk compartido (pool): cupo 12 sin número de puesto. Elegí franja y asegurá tu lugar.',
      occupancyClass: 'pool',
      unitCount: 12,
      unitLabel: 'Puesto',
      cupo: 12,
      floor: '2',
      zone: 'Open space',
      zoneType: 'open',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.hotdesk,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 70,
    },
    {
      siteId: hq,
      typeId: t('proyector'),
      kind: 'activo',
      nombre: isClaro ? 'Proyector Epson Claro' : 'Proyector Epson Sala 3',
      codigo: isClaro ? 'PRJ-1' : 'PRJ-E3',
      descripcion:
        'Proyector portátil Epson 4K (ocupación unitaria). Se retira en recepción y se devuelve al finalizar.',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 1,
      equipment: ['proyector', 'hdmi'],
      attributes: [
        { key: 'hdmi', value: '' },
        { key: '4k', value: '' },
        { key: 'portatil', value: '' },
        { key: 'marca', value: 'Epson' },
        { key: 'wifi', value: '' },
      ],
      bufferMin: 15,
      floor: 'PB',
      zone: 'Recepción / audiovisuales',
      imageUrl: img.proyector,
      orden: 72,
    },
    {
      siteId: hq,
      typeId: t('herramienta'),
      kind: 'activo',
      nombre: isClaro ? 'Taladro depósito Claro' : 'Taladro #12',
      codigo: isClaro ? 'TAL-1' : 'TAL-12',
      descripcion:
        'Taladro Bosch 750W (ocupación unitaria). Retiro en depósito; devolver con cargador.',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 1,
      attributes: [
        { key: 'marca', value: 'Bosch' },
        { key: 'potencia', value: '750W' },
        { key: 'portatil', value: '' },
      ],
      floor: '-1',
      zone: 'Depósito mantenimiento',
      imageUrl: img.herramienta,
      orden: 73,
    },
    {
      siteId: hq,
      typeId: t('locker'),
      kind: 'activo',
      nombre: isClaro ? 'Locker planta 2' : 'Cajonera planta 2',
      codigo: isClaro ? 'LK-2' : 'LK-P2',
      descripcion: isClaro
        ? 'Cajonera planta 2 con 48 cajones numerados (L-001…). Un activo padre; al reservar elegís el número libre.'
        : 'Cajonera con 48 unidades numeradas (L-001…). Un activo padre; al reservar elegís un número libre.',
      occupancyClass: 'unidades_numeradas',
      unitCount: 48,
      unitLabel: 'Cajón',
      unitPrefix: 'L-',
      unitPad: 3,
      cupo: 48,
      attributes: [{ key: 'accesible', value: '' }],
      accessible: true,
      floor: '2',
      zone: 'Lockers',
      imageUrl: img.locker,
      diaCompleto: true,
      orden: 74,
    },
    {
      siteId: hq,
      typeId: t('grupo'),
      kind: 'grupo',
      nombre: isClaro ? 'Auditorio butacas' : 'Auditorio butacas',
      codigo: 'AUD-1',
      descripcion:
        'Auditorio con butacas numeradas (B-001…B-060). Un solo activo; al reservar elegís la butaca libre. Ideal para charlas internas.',
      occupancyClass: 'unidades_numeradas',
      unitCount: 60,
      unitLabel: 'Butaca',
      unitPrefix: 'B-',
      unitPad: 3,
      cupo: 60,
      capacity: 60,
      zone: 'Eventos',
      floor: 'PB',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'proyector', value: '' },
        { key: 'hdmi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      bufferMin: 10,
      imageUrl: img.auditorio,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 78,
    },
    {
      siteId: hq,
      typeId: t('hora_libre'),
      kind: 'hora_libre',
      nombre: isClaro ? 'Franja pausa activa' : 'Franja bienestar 15–16',
      codigo: 'HL-15',
      descripcion:
        'Aforo multi-reserva (20 lugares) para pausa activa 15–16 hs. Varias personas en el mismo horario hasta el aforo.',
      occupancyClass: 'aforo',
      unitCount: 20,
      unitLabel: 'Lugar',
      cupo: 20,
      capacity: 20,
      zone: 'Bienestar',
      floor: '1',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.horaLibre,
      horario: { days: [1, 2, 3, 4, 5], open: '15:00', close: '16:00' },
      orden: 75,
    },
    {
      siteId: hq,
      typeId: t('hora_libre'),
      kind: 'hora_libre',
      nombre: isClaro ? 'Cafetería aforo' : 'Cafetería / comedor',
      codigo: 'CAF-1',
      descripcion:
        'Comedor con aforo 40 (multi-reserva). El mismo espacio se reserva por muchas personas a la vez hasta el tope.',
      occupancyClass: 'aforo',
      unitCount: 40,
      unitLabel: 'Lugar',
      cupo: 40,
      capacity: 40,
      zone: 'Cafetería',
      floor: 'PB',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.cafeteria,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '18:00' },
      orden: 77,
    },
    {
      siteId: hq,
      typeId: t('grupo'),
      kind: 'grupo',
      nombre: isClaro ? 'Squad room Claro' : 'Sala grupal Open',
      codigo: 'GRP-1',
      descripcion:
        'Espacio grupal exclusivo (ocupación unitaria) para workshops. Capacidad informativa 12 personas.',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 12,
      zone: 'Colab',
      floor: '3',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'videollamada', value: '' },
        { key: 'pizarra', value: '' },
        { key: 'hdmi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      bufferMin: 10,
      imageUrl: img.grupo,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
      orden: 76,
    },
    {
      siteId: norte,
      typeId: t('sala'),
      kind: 'sala',
      nombre: isClaro ? 'Sala Norte Claro' : 'Sala Norte 1',
      codigo: 'N1',
      descripcion:
        'Sala chica en sucursal Norte (ocupación unitaria). Ideal para 1:1 o reuniones cortas.',
      occupancyClass: 'unitario',
      unitCount: 1,
      capacity: 6,
      equipment: ['tv'],
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'hdmi', value: '' },
        { key: 'videollamada', value: '' },
      ],
      floor: '1',
      zone: 'Reuniones',
      bufferMin: 10,
      imageUrl: img.salaNorte,
      horario: { days: [1, 2, 3, 4, 5], open: '08:30', close: '18:30' },
      orden: 80,
    },
    {
      siteId: norte,
      typeId: t('zona_cupo'),
      kind: 'zona_cupo',
      nombre: isClaro ? 'Hot desk Martínez' : 'Hot desk Norte',
      codigo: 'HD-N',
      descripcion:
        'Hot desk Norte con cupo compartido (pool) de 20 puestos sin número fijo.',
      occupancyClass: 'pool',
      unitCount: 20,
      unitLabel: 'Puesto',
      cupo: 20,
      floor: '1',
      zone: 'Open',
      zoneType: 'open',
      attributes: [
        { key: 'wifi', value: '' },
        { key: 'accesible', value: '' },
      ],
      accessible: true,
      imageUrl: img.hotdeskNorte,
      horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '19:00' },
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
    const occ = normalizeOccupancyFields(r, { kind: r.kind })
    const payload = { ...r, ...occ, attributes: attrs, activo: true }
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
        horario: { days: [1, 2, 3, 4, 5], open: '08:00', close: '20:00' },
        ...payload,
        audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
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
