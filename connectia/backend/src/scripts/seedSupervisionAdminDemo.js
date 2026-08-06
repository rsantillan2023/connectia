/**
 * Seed rico de casuística para admin /supervision + /equipos (Olas 31·32).
 *
 * Uso:
 *   node src/scripts/seedSupervisionAdminDemo.js [tenantCode]
 *   node src/scripts/seedSupervisionAdminDemo.js DEMO --force
 *
 * npm:
 *   npm run seed:supervision-admin
 *   npm run seed:supervision-admin -- DEMO --force
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedSupervisionAdminDemo } from '../lib/supervisionAdminSeed.js'

const args = process.argv.slice(2).filter((a) => a !== '--force')
const force = process.argv.includes('--force')
const code = args[0] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const result = await seedSupervisionAdminDemo(tenant, { force })
console.log(JSON.stringify(result, null, 2))
await mongoose.disconnect()
