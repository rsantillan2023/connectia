import { Benefit } from '../models/Benefit.js'
import { defaultBenefitSeed } from './benefits.js'

/**
 * Upsert de catálogo base §18. No pisa títulos ya existentes.
 */
export async function seedBenefitsForTenant(tenantId, { brandName = 'la empresa' } = {}) {
  const rows = defaultBenefitSeed(brandName)
  let created = 0
  let skipped = 0
  for (const row of rows) {
    const exists = await Benefit.findOne({ tenantId, titulo: row.titulo }).select('_id').lean()
    if (exists) {
      skipped += 1
      continue
    }
    await Benefit.create({
      ...row,
      tenantId,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'seed',
    })
    created += 1
  }
  return { created, skipped, total: rows.length }
}
