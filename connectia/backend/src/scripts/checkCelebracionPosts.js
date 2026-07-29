import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Post } from '../models/Post.js'
import { Tenant } from '../models/Tenant.js'

await connectDB()
const tenants = await Tenant.find({ empCodigo: { $ne: 'PLATFORM' } }).select('_id empCodigo')
for (const t of tenants) {
  const n = await Post.countDocuments({ tenantId: t._id, tipo: 'celebracion' })
  const pubs = await Post.find({ tenantId: t._id, tipo: 'celebracion' })
    .select('titulo status audience publishedAt tipo createdAt')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean()
  console.log(t.empCodigo, 'celebracion=', n)
  for (const p of pubs) {
    console.log(
      ' ',
      p.status,
      '|',
      (p.titulo || '').slice(0, 50),
      '| aud=',
      JSON.stringify(p.audience),
      '| pub=',
      p.publishedAt,
    )
  }
}
process.exit(0)
