/**
 * Seed encuestas demo (tipos, categorías, estados, audiencias, flujos).
 * Uso: node src/scripts/seedSurveysForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { seedSurveysForTenant } from '../lib/surveysSeed.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const result = await seedSurveysForTenant(tenant._id, {
  authorName: `Admin ${tenant.nombre || tenant.empCodigo}`,
})

console.log(
  `Encuestas seed OK (${tenant.empCodigo}): ${result.total} · nuevas ${result.created} · actualizadas ${result.updated}` +
    (result.responsesUpserted ? ` · respuestas ${result.responsesUpserted}` : ''),
)
console.log('Tipos cubiertos:', result.questionTypesCovered.join(', '))
if (result.questionTypesMissing.length) {
  console.warn('Tipos faltantes:', result.questionTypesMissing.join(', '))
}
process.exit(0)
