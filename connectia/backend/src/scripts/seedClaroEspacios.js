/**
 * Seed Ola 21 — reservas / coworking para comunidad CLARO.
 * Uso: node src/scripts/seedClaroEspacios.js
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { SpaceResource, Reservation, OfficeDay } from '../models/Space.js'
import { seedSpacesForTenant } from '../lib/spacesSeed.js'
import { toDateKey } from '../lib/spaces.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'CLARO' })
if (!tenant) {
  console.error('Tenant CLARO no encontrado. Creá la comunidad primero.')
  process.exit(1)
}

const spaces = await seedSpacesForTenant(tenant._id, {
  brandName: tenant.nombre || 'Claro',
  empCodigo: tenant.empCodigo,
})

const users = await User.find({ tenantId: tenant._id, activo: true }).lean()
const byUsuario = Object.fromEntries(users.map((u) => [u.usuario, u]))
const maria = byUsuario['maria.lopez']
const juan = byUsuario['juan.perez']
const sofia = byUsuario['sofia.garcia']
const admin = byUsuario['admin.claro']

// Cap admin.reservas en admin + rrhh (staff)
for (const u of users) {
  if (!(u.roles || []).includes('admin') && u.usuario !== 'rrhh.gestor') continue
  const caps = new Set(u.capabilities || [])
  caps.add('admin.reservas')
  await User.updateOne({ _id: u._id }, { $set: { capabilities: [...caps] } })
}

const hqId = spaces.siteIdByCode?.HQ
const resources = await SpaceResource.find({ tenantId: tenant._id, activo: true }).lean()
const sala = resources.find((r) => r.kind === 'sala' && !r.requiresApproval)
const salaBoard = resources.find((r) => r.kind === 'sala' && r.requiresApproval)
const cochera = resources.find((r) => r.kind === 'cochera' && r.codigo === 'S12')
const puesto = resources.find((r) => r.kind === 'puesto')
const hotdesk = resources.find((r) => r.kind === 'zona_cupo' && r.codigo === 'HD-2')

function at(daysFromNow, hour, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Evita duplicar seed demo al re-ejecutar */
await Reservation.deleteMany({
  tenantId: tenant._id,
  title: { $regex: /^\[demo Claro\]/ },
})
await OfficeDay.deleteMany({
  tenantId: tenant._id,
  dateKey: {
    $in: [0, 1, 2].map((n) => {
      const d = new Date()
      d.setDate(d.getDate() + n)
      return toDateKey(d)
    }),
  },
})

const demo = []

if (sala && maria) {
  demo.push({
    tenantId: tenant._id,
    userId: maria._id,
    resourceId: sala._id,
    siteId: sala.siteId,
    kind: 'sala',
    title: '[demo Claro] Sync squad móvil',
    motivo: 'Revisión sprint',
    startAt: at(1, 10, 0),
    endAt: at(1, 11, 0),
    status: 'confirmed',
  })
}

if (salaBoard && juan) {
  demo.push({
    tenantId: tenant._id,
    userId: juan._id,
    resourceId: salaBoard._id,
    siteId: salaBoard.siteId,
    kind: 'sala',
    title: '[demo Claro] Comité comercial',
    motivo: 'Pendiente de aprobación facilities',
    startAt: at(2, 14, 0),
    endAt: at(2, 16, 0),
    status: 'pending',
  })
}

if (cochera && sofia) {
  demo.push({
    tenantId: tenant._id,
    userId: sofia._id,
    resourceId: cochera._id,
    siteId: cochera.siteId,
    kind: 'cochera',
    title: '[demo Claro] Cochera día completo',
    startAt: at(1, 8, 0),
    endAt: at(1, 20, 0),
    status: 'confirmed',
    plate: 'AB123CD',
    vehicleType: 'auto',
  })
}

if (puesto && maria) {
  demo.push({
    tenantId: tenant._id,
    userId: maria._id,
    resourceId: puesto._id,
    siteId: puesto.siteId,
    kind: 'puesto',
    title: '[demo Claro] Hot desk María',
    startAt: at(0, 9, 0),
    endAt: at(0, 18, 0),
    status: 'confirmed',
  })
}

if (hotdesk && juan) {
  demo.push({
    tenantId: tenant._id,
    userId: juan._id,
    resourceId: hotdesk._id,
    siteId: hotdesk.siteId,
    kind: 'zona_cupo',
    title: '[demo Claro] Open space Juan',
    startAt: at(0, 9, 0),
    endAt: at(0, 18, 0),
    status: 'checked_in',
    checkedInAt: at(0, 9, 15),
  })
}

let reservationsCreated = 0
if (demo.length) {
  await Reservation.insertMany(demo)
  reservationsCreated = demo.length
}

const officeDays = []
if (hqId && maria) {
  officeDays.push({
    tenantId: tenant._id,
    userId: maria._id,
    siteId: hqId,
    dateKey: toDateKey(at(0, 12)),
    status: 'checked_in',
    checkedInAt: at(0, 9, 10),
  })
}
if (hqId && juan) {
  officeDays.push({
    tenantId: tenant._id,
    userId: juan._id,
    siteId: hqId,
    dateKey: toDateKey(at(0, 12)),
    status: 'planned',
  })
}
if (hqId && sofia) {
  officeDays.push({
    tenantId: tenant._id,
    userId: sofia._id,
    siteId: hqId,
    dateKey: toDateKey(at(1, 12)),
    status: 'planned',
  })
}
if (officeDays.length) {
  for (const od of officeDays) {
    await OfficeDay.findOneAndUpdate(
      { tenantId: od.tenantId, userId: od.userId, dateKey: od.dateKey },
      { $set: od },
      { upsert: true },
    )
  }
}

console.log(
  JSON.stringify(
    {
      tenant: tenant.empCodigo,
      nombre: tenant.nombre,
      preset: spaces.preset,
      sites: spaces.sites,
      resourcesCreated: spaces.resourcesCreated,
      resourcesUpdated: spaces.resourcesUpdated,
      reservationsCreated,
      officeDays: officeDays.length,
      menu: ['Espacios', 'Oficina', 'Reserva de espacios (admin)'],
      loginU: 'maria.lopez / Demo1234!  →  /espacios  /oficina',
      loginA: 'admin.claro / Demo1234!  →  /reservas',
      note: 'Recargá la app (o re-login) para ver el menú actualizado.',
    },
    null,
    2,
  ),
)

// silencio lint unused
void admin
process.exit(0)
