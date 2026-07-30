/**
 * CLI: seed Ola 8 (fechas + saludos) para un tenant por empCodigo.
 * Uso: node src/scripts/seedOla8ForTenantCli.js DEMO
 *      node src/scripts/seedOla8ForTenantCli.js ARCOR
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Tenant } from '../models/Tenant.js'
import { seedOla8ForTenant } from './seedOla8ForTenant.js'

const emp = String(process.argv[2] || 'DEMO').trim().toUpperCase()
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectia'

await mongoose.connect(uri)
const tenant = await Tenant.findOne({ empCodigo: emp })
if (!tenant) {
  console.error(`Tenant ${emp} no encontrado`)
  process.exit(1)
}
const result = await seedOla8ForTenant(tenant._id, { brandName: tenant.nombre || emp })
console.log('Ola 8 seed OK', JSON.stringify(result, null, 2))
await mongoose.disconnect()
