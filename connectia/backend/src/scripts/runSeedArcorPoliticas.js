/**
 * Seed de políticas corporativas para ARCOR.
 * Uso: node src/scripts/runSeedArcorPoliticas.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedArcorPoliticas } from './seedArcorPoliticas.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const result = await seedArcorPoliticas({ tenant, force: true })

console.log('—— ARCOR políticas (seed forzado) ——')
console.log(result)
console.log('App U: Menú → RRHH → Políticas')
console.log('Login: ARCOR / juan.perez / Demo1234!')
await mongoose.disconnect()
process.exit(0)
