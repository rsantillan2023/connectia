/**
 * Seed Ola 43 — Portal de servicios.
 * Uso: node src/scripts/seedOla43ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedServiciosForTenant } from '../lib/serviciosSeed.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const r = await seedServiciosForTenant(tenant, { force: true })
console.log('Ola 43 seed:', tenant.empCodigo, r)
process.exit(0)
