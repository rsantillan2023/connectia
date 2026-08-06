/**
 * Seed Ola 25 — Pedidos de campo + canal alarma.
 * Uso: node src/scripts/seedOla25ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedPedidosForTenant } from '../lib/pedidosSeed.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const r = await seedPedidosForTenant(tenant, {
  force: true,
  brandName: tenant.nombre || tenant.empCodigo,
})
console.log('Ola 25 seed:', tenant.empCodigo, r)
process.exit(0)
