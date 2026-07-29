/**
 * Solo seed de licencias/ausencias para ARCOR.
 * Uso: node src/scripts/runSeedArcorLicencias.js
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
  pais: 'AR',
})

console.log('—— ARCOR licencias / ausencias (legislación AR · LCT) ——')
console.log(result)
console.log('App U: Menú → Vacaciones y permisos · Ausencias')
console.log('Login: ARCOR / juan.perez / Demo1234!')
console.log('Admin puede cambiar a CL: PUT /api/admin/licencias/legislacion { "pais": "CL" }')
await mongoose.disconnect()
process.exit(0)
