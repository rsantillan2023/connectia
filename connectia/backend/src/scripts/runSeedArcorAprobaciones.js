/**
 * Seed de aprobaciones y pedidos (workflows) para ARCOR.
 * Uso: node src/scripts/runSeedArcorAprobaciones.js
 *
 * App U:
 *   - Aprobaciones → Para aprobar  (login rrhh.gestor)
 *   - Aprobaciones → Mis pedidos   (login juan.perez)
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { seedArcorAprobaciones } from './seedArcorAprobaciones.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const users = await User.find({ tenantId: tenant._id, activo: true })
const byUsuario = Object.fromEntries(users.map((u) => [u.usuario, u]))

const result = await seedArcorAprobaciones({
  tenant,
  users: byUsuario,
  force: true,
})

console.log('—— ARCOR aprobaciones / pedidos (seed forzado) ——')
console.log(result)
console.log('Para aprobar: ARCOR / rrhh.gestor / Demo1234!  → Menú → Procesos → Aprobaciones')
console.log('Mis pedidos:  ARCOR / juan.perez / Demo1234!   → Menú → Procesos → Aprobaciones → Mis pedidos')
await mongoose.disconnect()
process.exit(0)
