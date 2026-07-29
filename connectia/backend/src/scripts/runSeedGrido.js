/**
 * Solo seed GRIDO (Grido Helados).
 * Uso: node src/scripts/runSeedGrido.js
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { seedGridoTenant } from './seedGrido.js'
import { DEFAULT_SEED_PASSWORD } from '../lib/genericTenantDefaults.js'

await connectDB()
const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 12)
const result = await seedGridoTenant(passwordHash)
console.log('—— GRIDO HELADOS ——')
console.log(`Admin:     GRIDO / ${result.credentials.adminUsuario} / ${DEFAULT_SEED_PASSWORD}`)
console.log('Comunic.:  GRIDO / comunicacion / Demo1234!')
console.log('People:    GRIDO / rrhh.gestor / Demo1234!')
console.log('Campo:     GRIDO / juan.perez / Demo1234!  (también ID)')
console.log('Comercial: GRIDO / sofia.garcia / Demo1234!')
console.log(`Directorio: ${result.directoryCount} contactos/locales`)
console.log('App U: empCodigo GRIDO · Admin: /directorio (Datos útiles)')
await mongoose.disconnect()
process.exit(0)
