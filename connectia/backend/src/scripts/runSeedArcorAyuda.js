/**
 * Seed de FAQs y tutoriales (Ayuda) para ARCOR.
 * Uso: node src/scripts/runSeedArcorAyuda.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedArcorAyuda } from './seedArcorAyuda.js'

await connectDB()

const tenant = await Tenant.findOne({ empCodigo: 'ARCOR' })
if (!tenant) {
  console.error('Tenant ARCOR no encontrado. Corré antes: node src/scripts/runSeedArcor.js')
  await mongoose.disconnect()
  process.exit(1)
}

const result = await seedArcorAyuda({ tenant, force: true })

console.log('—— ARCOR ayuda / tutoriales (seed forzado) ——')
console.log(result)
console.log('App U: Menú → Notificaciones → Ayuda  (FAQs y Tutoriales)')
console.log('Login: ARCOR / juan.perez / Demo1234!')
await mongoose.disconnect()
process.exit(0)
