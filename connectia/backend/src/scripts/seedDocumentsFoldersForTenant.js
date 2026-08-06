/**
 * Seed documentos multicarpeta (tipos × estados × 2).
 * Uso: node src/scripts/seedDocumentsFoldersForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { DocItem } from '../models/DocItem.js'
import { seedMultifoldDocuments } from '../lib/documentsFoldersSeed.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const result = await seedMultifoldDocuments(DocItem, {
  tenantId: tenant._id,
  authorName: `Admin ${tenant.nombre || tenant.empCodigo}`,
})

console.log(
  `Documentos multicarpeta OK (${tenant.empCodigo}): ${result.total} docs · upsert creados≈${result.created} actualizados≈${result.updated}`,
)
process.exit(0)
