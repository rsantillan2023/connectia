/**
 * Seed Ola 27 para un tenant por empCodigo.
 * Uso: node src/scripts/seedOla27ForTenant.js ARCOR
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedTalentCultureForTenant } from '../lib/talentCultureSeed.js'

const emp = process.argv[2] || 'ARCOR'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: emp })
if (!tenant) {
  console.error(`Tenant ${emp} no encontrado`)
  process.exit(1)
}
const result = await seedTalentCultureForTenant(tenant._id, { brandName: tenant.nombre })
console.log('Ola 27 seed OK', result)
process.exit(0)
