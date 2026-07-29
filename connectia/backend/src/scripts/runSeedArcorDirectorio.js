/**
 * Seed de directorio / datos útiles para ARCOR — tipos variados + sedes con mapa.
 * Uso: node src/scripts/runSeedArcorDirectorio.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { MenuItem } from '../models/MenuItem.js'
import { DirectoryEntry } from '../models/DirectoryEntry.js'
import { DIRECTORY_STOCK_IMAGES } from '../lib/directorySeed.js'

const EMP = 'ARCOR'

/** Coordenadas reales / aproximadas de sedes Arcor en Argentina */
const ARCOR_DIRECTORY = [
  // —— Emergencias ——
  {
    tipo: 'emergencia',
    nombre: 'Emergencias médicas planta',
    categoria: 'Urgencias',
    descripcion: 'Línea interna de emergencias médicas en planta (demo).',
    telefono: '911',
    interno: '911',
    destacado: true,
    orden: 1,
    color: '#b91c1c',
    imageUrl: DIRECTORY_STOCK_IMAGES.emergencia,
    tags: ['urgencia', 'salud'],
  },
  {
    tipo: 'emergencia',
    nombre: 'Bomberos / evacuación',
    categoria: 'Urgencias',
    descripcion: 'Brigada de emergencia y evacuación — Arcor.',
    telefono: '100',
    interno: '100',
    orden: 2,
    color: '#b91c1c',
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=240&h=240&fit=crop&q=80',
    tags: ['seguridad'],
  },
  {
    tipo: 'emergencia',
    nombre: 'Seguridad corporativa',
    categoria: 'Urgencias',
    descripcion: 'Control de accesos y vigilancia 24 hs.',
    telefono: '3515550199',
    interno: '199',
    whatsapp: '5493515550199',
    orden: 3,
    color: '#991b1b',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=240&h=240&fit=crop&q=80',
  },

  // —— Sedes (con mapa) ——
  {
    tipo: 'sede',
    nombre: 'Casa central Arcor — Córdoba',
    categoria: 'Sedes',
    descripcion: 'Oficinas centrales del Grupo Arcor.',
    direccion: 'Chacabuco 1160',
    ciudad: 'Córdoba',
    lat: -31.4201,
    lng: -64.1888,
    telefono: '3514208211',
    email: 'info@arcor.com',
    horario: 'Lun–Vie 8:30 a 17:30',
    orden: 10,
    destacado: true,
    imageUrl: DIRECTORY_STOCK_IMAGES.sede,
    tags: ['casa central', 'córdoba'],
  },
  {
    tipo: 'sede',
    nombre: 'Planta Arroyito',
    categoria: 'Plantas',
    descripcion: 'Complejo industrial Arroyito — producción y logística.',
    direccion: 'Ruta Nacional 19 km 147',
    ciudad: 'Arroyito, Córdoba',
    lat: -31.4205,
    lng: -63.0502,
    telefono: '3576442000',
    horario: 'Operación continua',
    orden: 11,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112c4e5190?w=240&h=240&fit=crop&q=80',
    tags: ['planta', 'producción'],
  },
  {
    tipo: 'sede',
    nombre: 'Planta Colonia Caroya',
    categoria: 'Plantas',
    descripcion: 'Planta industrial — Colonia Caroya.',
    direccion: 'Av. San Martín s/n',
    ciudad: 'Colonia Caroya, Córdoba',
    lat: -31.0205,
    lng: -64.0668,
    telefono: '3525470000',
    orden: 12,
    imageUrl: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=240&h=240&fit=crop&q=80',
    tags: ['planta'],
  },
  {
    tipo: 'sede',
    nombre: 'Oficinas Buenos Aires',
    categoria: 'Sedes',
    descripcion: 'Oficinas comerciales CABA.',
    direccion: 'Maipú 1210',
    ciudad: 'CABA',
    lat: -34.5956,
    lng: -58.3774,
    telefono: '1143247000',
    email: 'ba@arcor.com',
    horario: 'Lun–Vie 9 a 18',
    orden: 13,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=240&h=240&fit=crop&q=80',
    tags: ['caba', 'comercial'],
  },
  {
    tipo: 'sede',
    nombre: 'Centro de distribución Villa María',
    categoria: 'Logística',
    descripcion: 'CD regional — despachos al interior.',
    direccion: 'Parque Industrial',
    ciudad: 'Villa María, Córdoba',
    lat: -32.4075,
    lng: -63.2402,
    telefono: '3534530000',
    horario: 'Lun–Sáb 6 a 22',
    orden: 14,
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=240&h=240&fit=crop&q=80',
    tags: ['logística', 'cd'],
  },
  {
    tipo: 'sede',
    nombre: 'Planta Tucumán',
    categoria: 'Plantas',
    descripcion: 'Operaciones norte — Tucumán.',
    direccion: 'Ruta 9 Norte',
    ciudad: 'San Miguel de Tucumán',
    lat: -26.8083,
    lng: -65.2176,
    telefono: '3814500000',
    orden: 15,
    imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=240&h=240&fit=crop&q=80',
    tags: ['planta', 'norte'],
  },

  // —— Servicios ——
  {
    tipo: 'servicio',
    nombre: 'Mesa de ayuda IT',
    categoria: 'Sistemas',
    descripcion: 'Notebook, VPN, accesos, impresoras y apps internas.',
    telefono: '3515550300',
    interno: '300',
    email: 'mesa.ayuda@arcor.com',
    whatsapp: '5493515550300',
    horario: 'Lun–Vie 8 a 20',
    orden: 20,
    imageUrl: DIRECTORY_STOCK_IMAGES.telefono,
    tags: ['it', 'soporte'],
  },
  {
    tipo: 'servicio',
    nombre: 'RRHH — consultas generales',
    categoria: 'Personas',
    descripcion: 'Legajo, vacaciones, ausencias, beneficios y onboarding.',
    interno: '450',
    email: 'rrhh@arcor.com',
    telefono: '3515550450',
    horario: 'Lun–Vie 9 a 17',
    orden: 21,
    destacado: true,
    imageUrl: DIRECTORY_STOCK_IMAGES.persona,
    tags: ['rrhh', 'personas'],
  },
  {
    tipo: 'servicio',
    nombre: 'Recepción casa central',
    categoria: 'Planta baja',
    descripcion: 'Visitas, mensajería y paquetería.',
    interno: '200',
    telefono: '3515550200',
    horario: 'Lun–Vie 8:30 a 17:30',
    orden: 22,
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'Comedor / catering',
    categoria: 'Servicios internos',
    descripcion: 'Menú diario y reservas de sala comedor.',
    interno: '280',
    horario: 'Lun–Vie 11:30 a 14:30',
    orden: 23,
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'Mantenimiento de instalaciones',
    categoria: 'Facilities',
    descripcion: 'Clima, electricidad, mobiliario y tickets de obra.',
    interno: '350',
    telefono: '3515550350',
    horario: 'Lun–Vie 7 a 19',
    orden: 24,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=240&h=240&fit=crop&q=80',
  },

  // —— Personas ——
  {
    tipo: 'persona',
    nombre: 'Ana Torres — Comunicación interna',
    categoria: 'Personas',
    descripcion: 'Referente de comunicación y muro corporativo.',
    email: 'ana.torres@arcor.com',
    interno: '510',
    telefono: '3515550510',
    orden: 30,
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&h=240&fit=crop&q=80',
    tags: ['comunicación'],
  },
  {
    tipo: 'persona',
    nombre: 'Carlos Ruiz — Líder de planta',
    categoria: 'Personas',
    descripcion: 'Supervisión operativa planta Arroyito.',
    email: 'carlos.ruiz@arcor.com',
    interno: '620',
    telefono: '3576442620',
    orden: 31,
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=240&h=240&fit=crop&q=80',
    tags: ['planta', 'líder'],
  },
  {
    tipo: 'persona',
    nombre: 'Laura Martínez — People Partner',
    categoria: 'Personas',
    descripcion: 'Partner de RRHH para áreas comerciales.',
    email: 'laura.martinez@arcor.com',
    interno: '455',
    telefono: '3515550455',
    orden: 32,
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&h=240&fit=crop&q=80',
    tags: ['rrhh'],
  },

  // —— Teléfonos ——
  {
    tipo: 'telefono',
    nombre: 'Central telefónica Arcor',
    categoria: 'Teléfonos',
    descripcion: 'Conmutador general — pedí interno.',
    telefono: '08002222767',
    orden: 40,
    imageUrl: DIRECTORY_STOCK_IMAGES.telefono,
    tags: ['central'],
  },
  {
    tipo: 'telefono',
    nombre: 'Línea ética / compliance',
    categoria: 'Compliance',
    descripcion: 'Canal confidencial de denuncias (demo).',
    telefono: '08001233456',
    email: 'etica@arcor.com',
    orden: 41,
    color: '#0f766e',
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=240&h=240&fit=crop&q=80',
    tags: ['ética'],
  },
  {
    tipo: 'telefono',
    nombre: 'Atención a proveedores',
    categoria: 'Compras',
    descripcion: 'Turnos y consultas de proveedores.',
    telefono: '3515550700',
    email: 'proveedores@arcor.com',
    horario: 'Lun–Vie 9 a 16',
    orden: 42,
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=240&h=240&fit=crop&q=80',
  },

  // —— Otro ——
  {
    tipo: 'otro',
    nombre: 'Sala de enfermería',
    categoria: 'Salud',
    descripcion: 'Atención de primeros auxilios en casa central.',
    direccion: 'Chacabuco 1160 — PB',
    ciudad: 'Córdoba',
    lat: -31.4203,
    lng: -64.1885,
    interno: '911',
    horario: 'Lun–Vie 8 a 17',
    orden: 50,
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=240&h=240&fit=crop&q=80',
    tags: ['salud'],
  },
  {
    tipo: 'otro',
    nombre: 'Estacionamiento colaboradores',
    categoria: 'Accesos',
    descripcion: 'Ingreso por calle lateral — credencial obligatoria.',
    direccion: 'Chacabuco 1200',
    ciudad: 'Córdoba',
    lat: -31.4198,
    lng: -64.1892,
    orden: 51,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=240&h=240&fit=crop&q=80',
    tags: ['parking'],
  },
]

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: EMP })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const caps = new Set([...(tenant.capabilities || []), 'directorio'])
tenant.capabilities = [...caps]
await tenant.save()

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
    { upsert: true },
  )
}

let upserted = 0
const byTipo = {}
for (const row of ARCOR_DIRECTORY) {
  await DirectoryEntry.findOneAndUpdate(
    { tenantId: tenant._id, nombre: row.nombre },
    {
      ...row,
      tenantId: tenant._id,
      activo: true,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
    },
    { upsert: true, new: true },
  )
  upserted += 1
  byTipo[row.tipo] = (byTipo[row.tipo] || 0) + 1
}

const withMap = await DirectoryEntry.countDocuments({
  tenantId: tenant._id,
  activo: true,
  lat: { $ne: null },
  lng: { $ne: null },
})
const total = await DirectoryEntry.countDocuments({ tenantId: tenant._id, activo: true })

console.log('—— ARCOR directorio (seed) ——')
console.log({ upserted, total, withMap, byTipo })
console.log('App U: Menú → Directorio → lista o Mapa')
console.log('Admin: Datos útiles')
console.log('Login: ARCOR / juan.perez / Demo1234!')
await mongoose.disconnect()
process.exit(0)
