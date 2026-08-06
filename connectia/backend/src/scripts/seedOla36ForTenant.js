/**
 * Seed / refresh Ola 36 para un tenant por empCodigo.
 * Uso: node src/scripts/seedOla36ForTenant.js DEMO
 *      node src/scripts/seedOla36ForTenant.js ARCOR
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedOla36ForTenant } from '../lib/ola36Seed.js'

const emp = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: emp })
if (!tenant) {
  console.error(`Tenant ${emp} no encontrado`)
  process.exit(1)
}
const result = await seedOla36ForTenant(tenant._id, {
  brandName: tenant.nombre,
  ensureSpaces: true,
})
console.log('Ola 36 seed OK', emp, result)
process.exit(0)
