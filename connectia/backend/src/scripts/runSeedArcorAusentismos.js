/**
 * Seed de ausentismos demo para ARCOR (fuerza recreación).
 * Uso: node src/scripts/runSeedArcorAusentismos.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { seedLicenciasForTenant } from './seedLicencias.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const users = await User.find({ tenantId: tenant._id, activo: true })
const byUsuario = Object.fromEntries(users.map((u) => [u.usuario, u]))

const result = await seedLicenciasForTenant({
  tenant,
  users: byUsuario,
  brandName: 'Arcor',
  pais: tenant.licenciasConfig?.pais || 'AR',
  forceAbsences: true,
})

console.log('—— ARCOR ausentismos (seed forzado) ——')
console.log({
  pais: result.pais,
  absences: result.absences,
  licenses: result.licenses,
  tipos: result.tipos,
})
console.log('App U: Menú → Ausencias')
console.log('Admin: Ausentismos')
console.log('Login: ARCOR / juan.perez / Demo1234!')
await mongoose.disconnect()
process.exit(0)
