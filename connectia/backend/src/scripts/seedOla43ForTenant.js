/**
 * Seed Ola 43 — Portal de servicios.
 * Uso: node src/scripts/seedOla43ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedServiciosForTenant } from '../lib/serviciosSeed.js'

const code = process.argv[2] || 'DEMO'

function variantForCode(empCodigo) {
  const c = String(empCodigo || '').toUpperCase()
  if (c === 'ARCOR') return 'arcor'
  if (c === 'DEMO') return 'demo'
  return 'default'
}

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const variant = variantForCode(tenant.empCodigo)
const r = await seedServiciosForTenant(tenant, {
  force: true,
  brandName: tenant.nombre || tenant.empCodigo,
  variant,
})
console.log('Ola 43 seed:', tenant.empCodigo, { variant, ...r })
process.exit(0)
