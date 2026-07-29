/**
 * Limpia eventos ARCOR sin seedKey y vuelve a sembrar el catálogo Ola 15.
 * Uso: node src/scripts/seedEventsArcorRefresh.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { Event, EventRsvp } from '../models/Event.js'
import { AppNotification } from '../models/AppNotification.js'
import { seedEventsForTenant } from './seedEvents.js'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado')
  process.exit(1)
}

const orphaned = await Event.find({
  tenantId: tenant._id,
  $or: [{ seedKey: '' }, { seedKey: { $exists: false } }, { seedKey: null }],
}).select('_id titulo')

console.log(`Huérfanos sin seedKey: ${orphaned.length}`)
const ids = orphaned.map((e) => e._id)
if (ids.length) {
  await EventRsvp.deleteMany({ tenantId: tenant._id, eventId: { $in: ids } })
  await AppNotification.deleteMany({ tenantId: tenant._id, refType: 'event', refId: { $in: ids } })
  await Event.deleteMany({ _id: { $in: ids } })
  console.log('Huérfanos eliminados')
}

const users = await User.find({ tenantId: tenant._id, activo: true }).limit(40)
const author =
  users.find((u) => u.usuario === 'comunicacion') ||
  users.find((u) => (u.roles || []).includes('admin')) ||
  users[0]

const result = await seedEventsForTenant({
  tenant,
  users,
  brandName: 'Arcor',
  author,
  force: true,
  notifyDemo: true,
})

const total = await Event.countDocuments({ tenantId: tenant._id })
console.log(
  `Refresh OK: ${result.created} nuevos · ${result.updated} actualizados · total ${total} · ${result.rsvps} RSVPs · ${result.notifs} avisos`,
)
await mongoose.disconnect()
