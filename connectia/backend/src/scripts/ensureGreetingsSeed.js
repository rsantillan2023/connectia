import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedGreetingsForTenant } from './seedGreetings.js'

await connectDB()
const tenants = await Tenant.find({ empCodigo: { $ne: 'PLATFORM' } }).select('_id nombre empCodigo')
for (const t of tenants) {
  const r = await seedGreetingsForTenant({ tenantId: t._id, brandName: t.nombre || t.empCodigo })
  console.log(t.empCodigo, '→', r.created, 'reglas:', r.rules.map((x) => x.name).join(' · '))
}
process.exit(0)
