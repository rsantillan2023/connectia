/**
 * Seed del tenant GRIDO (Grido Helados) — para demo de directorio / branding.
 * Uso: node src/scripts/runSeedGrido.js
 *      o desde seed.js vía seedGridoTenant(passwordHash)
 */
import { Tenant } from '../models/Tenant.js'
import { DirectoryEntry } from '../models/DirectoryEntry.js'
import { MenuItem } from '../models/MenuItem.js'
import { seedGenericTenant } from './seedGenericTenant.js'
import { DEFAULT_SEED_PASSWORD } from '../lib/genericTenantDefaults.js'
import { User } from '../models/User.js'
import { seedOla19ForTenant } from './seedOla19ForTenant.js'

const EMP = 'GRIDO'

/** Logo oficial (Wikimedia) */
const GRIDO_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/6/63/Grido_logo.svg'
/** Fondo login — helado / verano */
const GRIDO_LOGIN_BG =
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1600&q=80'

/** Paleta reciente Grido: rojo + blanco */
const GRIDO_BRANDING = {
  primary: '#E30613',
  secondary: '#9B0000',
  logoUrl: GRIDO_LOGO,
  loginBgUrl: GRIDO_LOGIN_BG,
  splashTitle: 'Grido Helados',
  splashSubtitle: 'Comunidad interna',
  splashDurationSec: 2,
  splash: {
    enabledPreLogin: true,
    enabledPostLogin: true,
    durationSec: 2,
    title: 'Grido Helados',
    subtitle: 'Red, locales y equipo en un solo lugar.',
    logoUrl: GRIDO_LOGO,
    bgColor: '#FFFFFF',
    bgImageUrl: '',
    textColor: '#E30613',
    showLogo: true,
    showTitle: true,
    showSubtitle: true,
  },
}

const GRIDO_PROFILE = {
  knownCompany: true,
  industry: 'retail_franquicias_helados',
  description:
    'Grido Helados (Helacor) — red de heladerías y congelados con sede en Córdoba, Argentina.',
  brandName: 'Grido Helados',
  primary: GRIDO_BRANDING.primary,
  secondary: GRIDO_BRANDING.secondary,
  logoUrl: GRIDO_LOGO,
  loginBgUrl: GRIDO_LOGIN_BG,
  splashSubtitle: 'Comunidad interna de la red',
  timezone: 'America/Argentina/Cordoba',
  areas: [
    { key: 'rrhh', nombre: 'People', descripcion: 'Personas y cultura de la red', orden: 10 },
    { key: 'operaciones', nombre: 'Operaciones', descripcion: 'Locales y franquicias', orden: 20 },
    { key: 'comercial', nombre: 'Comercial', descripcion: 'Franquicias y desarrollo', orden: 30 },
    { key: 'it', nombre: 'IT', descripcion: 'Sistemas de la red', orden: 40 },
    { key: 'marketing', nombre: 'Marketing', descripcion: 'Marca, campañas y sabores', orden: 50 },
    { key: 'logistica', nombre: 'Logística', descripcion: 'Distribución y planta', orden: 60 },
  ],
  groups: [
    { key: 'liderazgo', nombre: 'Liderazgo', descripcion: 'Gerencias y coordinación', orden: 10 },
    { key: 'corporativo', nombre: 'Casa central', descripcion: 'Córdoba HQ', orden: 20 },
    { key: 'campo', nombre: 'Locales / franquicias', descripcion: 'Encargados y equipos de local', orden: 30 },
  ],
  welcomeTitle: 'Bienvenida a la comunidad Grido',
  welcomeBody:
    'Acá están los comunicados de la red, lanzamientos de sabor, campañas y avisos operativos.\n' +
    'Usá Solicitudes para trámites, Directorio para contactos/locales y Enlaces para herramientas del día a día.',
  sources: [{ title: 'Grido Helado', url: 'https://www.argentina.gridohelado.com/' }],
}

/** Directorio rico con imágenes — para ver logos/fotos en /directorio */
const GRIDO_DIRECTORY = [
  {
    tipo: 'emergencia',
    nombre: 'Emergencias médicas',
    categoria: 'Urgencias',
    descripcion: 'Línea de emergencias de planta / casa central',
    telefono: '911',
    destacado: true,
    orden: 1,
    color: '#b91c1c',
    imageUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'emergencia',
    nombre: 'Seguridad casa central',
    categoria: 'Urgencias',
    descripcion: 'Control de accesos Helacor / Grido Córdoba',
    telefono: '3515550100',
    interno: '100',
    orden: 2,
    color: '#b91c1c',
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'sede',
    nombre: 'Casa central Córdoba',
    categoria: 'Sedes',
    descripcion: 'Sede Helacor / Grido Helados — oficinas centrales',
    direccion: 'Av. Circunvalación Agustín Tosco 4850',
    ciudad: 'Córdoba',
    lat: -31.4167,
    lng: -64.1833,
    telefono: '3515550000',
    email: 'info@gridohelado.com',
    horario: 'Lun–Vie 9 a 18',
    orden: 10,
    destacado: true,
    imageUrl: GRIDO_LOGO,
  },
  {
    tipo: 'sede',
    nombre: 'Local Nueva Córdoba',
    categoria: 'Locales',
    descripcion: 'Heladería de referencia — zona universitaria',
    direccion: 'Av. Hipólito Yrigoyen 200',
    ciudad: 'Córdoba',
    lat: -31.425,
    lng: -64.188,
    telefono: '3515550201',
    horario: 'Todos los días 11 a 23',
    orden: 20,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'sede',
    nombre: 'Local Centro',
    categoria: 'Locales',
    descripcion: 'Atención al público — peatonales',
    direccion: 'San Martín 150',
    ciudad: 'Córdoba',
    lat: -31.4165,
    lng: -64.1835,
    telefono: '3515550202',
    horario: 'Todos los días 11 a 23',
    orden: 21,
    imageUrl: 'https://images.unsplash.com/photo-1501443761614-9a7e404f9c0a?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'sede',
    nombre: 'Local Buenos Aires — Palermo',
    categoria: 'Locales',
    descripcion: 'Franquicia CABA',
    direccion: 'Av. Santa Fe 3200',
    ciudad: 'CABA',
    lat: -34.588,
    lng: -58.411,
    telefono: '1145550301',
    horario: 'Todos los días 12 a 00',
    orden: 22,
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'Mesa de ayuda franquicias',
    categoria: 'Operaciones',
    descripcion: 'Soporte a locales: POS, stock, turnos y reclamos operativos',
    telefono: '3515550400',
    interno: '400',
    email: 'franquicias@gridohelado.com',
    whatsapp: '5493515550400',
    horario: 'Lun–Sáb 9 a 20',
    orden: 30,
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'IT — mesa de ayuda',
    categoria: 'Sistemas',
    descripcion: 'VPN, notebook, accesos y apps de la red',
    interno: '300',
    telefono: '3515550300',
    email: 'it@gridohelado.com',
    horario: 'Lun–Vie 9 a 18',
    orden: 31,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'People — consultas',
    categoria: 'Personas',
    descripcion: 'Legajo, vacaciones, beneficios y onboarding',
    interno: '450',
    email: 'people@gridohelado.com',
    horario: 'Lun–Vie 10 a 16',
    orden: 40,
    imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f47?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'telefono',
    nombre: 'Atención al consumidor',
    categoria: 'Clientes',
    descripcion: 'Línea de atención Grido (demo)',
    telefono: '08005554743',
    email: 'contacto@gridohelado.com',
    orden: 50,
    imageUrl: GRIDO_LOGO,
  },
  {
    tipo: 'servicio',
    nombre: 'Logística / planta',
    categoria: 'Planta',
    descripcion: 'Despachos a locales y consultas de abastecimiento',
    interno: '600',
    telefono: '3515550600',
    horario: 'Lun–Vie 6 a 18',
    orden: 60,
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=240&h=240&fit=crop&q=80',
  },
]

async function seedGridoDirectory(tenantId) {
  let n = 0
  for (const row of GRIDO_DIRECTORY) {
    await DirectoryEntry.findOneAndUpdate(
      { tenantId, nombre: row.nombre },
      {
        ...row,
        tenantId,
        activo: true,
        audience: { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true, new: true },
    )
    n += 1
  }
  return n
}

/**
 * @param {string} passwordHash
 */
export async function seedGridoTenant(passwordHash) {
  if (!passwordHash) throw new Error('passwordHash requerido')

  let tenant = await Tenant.findOne({ empCodigo: EMP })
  if (!tenant) {
    tenant = await Tenant.create({
      empCodigo: EMP,
      nombre: 'Grido Helados',
      allowDesktop: true,
      branding: { ...GRIDO_BRANDING, splash: { ...GRIDO_BRANDING.splash } },
      loginMethods: ['password', 'id'],
      capabilities: ['muro', 'solicitudes', 'encuestas', 'docs', 'hub', 'chat', 'menu.dynamic'],
      timezone: 'America/Argentina/Cordoba',
      uxShell: 'connectia',
      ugc: { enabled: true, requireApproval: true },
    })
    console.log('Tenant GRIDO creado')
  } else {
    tenant.nombre = 'Grido Helados'
    tenant.branding = {
      ...(tenant.branding?.toObject?.() ?? tenant.branding ?? {}),
      ...GRIDO_BRANDING,
      splash: { ...GRIDO_BRANDING.splash },
    }
    tenant.loginMethods = ['password', 'id']
    tenant.capabilities = ['muro', 'solicitudes', 'encuestas', 'docs', 'hub', 'chat', 'menu.dynamic']
    tenant.timezone = 'America/Argentina/Cordoba'
    tenant.ugc = { enabled: true, requireApproval: true }
    await tenant.save()
    console.log('Tenant GRIDO ya existe — branding actualizado')
  }

  const seed = await seedGenericTenant({
    tenant,
    passwordHash,
    profile: GRIDO_PROFILE,
  })

  // Menú directorio (por si el genérico no lo tenía en tenants viejos)
  for (const item of [
    { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid', order: 58, channel: 'u' },
    {
      key: 'admin.directorio',
      label: 'Datos útiles',
      route: '/directorio',
      icon: 'grid',
      order: 46.2,
      channel: 'a',
    },
  ]) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }

  const dirCount = await seedGridoDirectory(tenant._id)
  console.log(`[seedGrido] Directorio: ${dirCount} fichas con imagen`)

  const rrhh = await User.findOne({ tenantId: tenant._id, usuario: 'rrhh.gestor' })
  const ola19 = await seedOla19ForTenant({
    tenant,
    brandName: 'Grido Helados',
    author: rrhh,
    onboardUsuarios: ['juan.perez', 'sofia.garcia'],
    offboardUsuarios: [],
  })
  console.log(
    `[seedGrido] Ola 19: catálogos+${ola19.catalogsCreated} · legajos+${ola19.legajosCreated} · onboard ${ola19.onboardStarted}`,
  )

  return {
    ...seed,
    empCodigo: EMP,
    brandName: 'Grido Helados',
    directoryCount: dirCount,
    ola19,
    credentials: {
      empCodigo: EMP,
      adminUsuario: 'admin.grido',
      password: DEFAULT_SEED_PASSWORD,
      sampleUsers: ['comunicacion', 'rrhh.gestor', 'juan.perez', 'sofia.garcia'],
    },
  }
}
