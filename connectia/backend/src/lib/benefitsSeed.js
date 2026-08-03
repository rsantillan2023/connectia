import { Benefit, BenefitPartnerLink } from '../models/Benefit.js'
import { defaultBenefitSeed, defaultPartnerSeed } from './benefits.js'

/**
 * Upsert de empresas asociadas (partners). No pisa títulos ya existentes.
 */
export async function seedPartnersForTenant(tenantId, { brandName = 'la empresa' } = {}) {
  const rows = defaultPartnerSeed(brandName)
  let created = 0
  let skipped = 0
  for (const row of rows) {
    const exists = await BenefitPartnerLink.findOne({ tenantId, titulo: row.titulo }).select('_id').lean()
    if (exists) {
      skipped += 1
      continue
    }
    await BenefitPartnerLink.create({
      ...row,
      tenantId,
    })
    created += 1
  }
  return { created, skipped, total: rows.length }
}

/**
 * Upsert de catálogo base §18. No pisa títulos ya existentes.
 * También carga empresas asociadas de demo.
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
  const partners = await seedPartnersForTenant(tenantId, { brandName })
  return {
    created,
    skipped,
    total: rows.length,
    partnersCreated: partners.created,
    partnersSkipped: partners.skipped,
    partnersTotal: partners.total,
  }
}
