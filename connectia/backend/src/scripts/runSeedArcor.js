/**
 * Solo seed ARCOR (sin DEMO / THEFORK).
 * Uso: node src/scripts/runSeedArcor.js
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { seedArcorTenant } from './seedArcor.js'

await connectDB()
const passwordHash = await bcrypt.hash('Demo1234!', 12)
await seedArcorTenant(passwordHash)
console.log('—— ARCOR ——')
console.log('Admin:     ARCOR / admin.arcor / Demo1234!  (también ID A1000)')
console.log('Comunic.:  ARCOR / comunicacion / Demo1234!')
console.log('RRHH:      ARCOR / rrhh.gestor / Demo1234!')
console.log('Planta:    ARCOR / juan.perez / Demo1234!  (ID A2002)')
console.log('Ventas:    ARCOR / sofia.garcia / Demo1234!  (ID A2003)')
console.log('Password de todos los users ARCOR: Demo1234!')
await mongoose.disconnect()
process.exit(0)
