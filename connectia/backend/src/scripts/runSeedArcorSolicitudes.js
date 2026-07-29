/**
 * Seed de solicitudes demo para ARCOR (fuerza recreación de SOL-ARCOR-*).
 * Uso: node src/scripts/runSeedArcorSolicitudes.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { seedArcorSolicitudes } from './seedArcorSolicitudes.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const users = await User.find({ tenantId: tenant._id, activo: true })
const byUsuario = Object.fromEntries(users.map((u) => [u.usuario, u]))

const result = await seedArcorSolicitudes({
  tenant,
  users: byUsuario,
  force: true,
})

console.log('—— ARCOR solicitudes (seed forzado) ——')
console.log({
  tipos: result.types,
  creadas: result.created,
  omitidas: result.skipped,
})
console.log('App U: Menú → Procesos → Mis solicitudes  (login juan.perez)')
console.log('Admin: Solicitudes / Bandeja')
console.log('Login: ARCOR / juan.perez / Demo1234!')
await mongoose.disconnect()
process.exit(0)
