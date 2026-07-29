import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { MenuItem } from '../models/MenuItem.js'

await connectDB()
const tenants = await Tenant.find({ empCodigo: { $ne: 'PLATFORM' } }).select('_id nombre empCodigo')
let n = 0
for (const t of tenants) {
  await MenuItem.findOneAndUpdate(
    { tenantId: t._id, key: 'admin.saludos' },
    {
      tenantId: t._id,
      key: 'admin.saludos',
      label: 'Saludos automáticos',
      route: '/saludos',
      icon: 'heart',
      order: 45.7,
      channel: 'a',
      activo: true,
      audience: { roles: [], capabilities: [] },
    },
    { upsert: true, new: true },
  )
  n += 1
  console.log('OK', t.empCodigo || t.nombre)
}
console.log('tenants', n)
process.exit(0)
