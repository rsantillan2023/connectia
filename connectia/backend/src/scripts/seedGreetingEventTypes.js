import { GreetingEventType } from '../models/GreetingEventType.js'
import { DEFAULT_GREETING_EVENT_TYPES } from '../lib/greetingHelpers.js'

/**
 * Asegura los tipos base por tenant. Idempotente (no pisa label/desc editados).
 */
export async function seedGreetingEventTypesForTenant(tenantId) {
  if (!tenantId) throw new Error('tenantId requerido')
  const out = []
  for (const t of DEFAULT_GREETING_EVENT_TYPES) {
    const doc = await GreetingEventType.findOneAndUpdate(
      { tenantId, key: t.key },
      {
        $setOnInsert: {
          tenantId,
          key: t.key,
          label: t.label,
          description: t.description,
          dateSource: t.dateSource,
          minYears: t.minYears,
          sortOrder: t.sortOrder,
          activo: true,
          isSystem: true,
        },
      },
      { upsert: true, new: true },
    )
    out.push(doc)
  }
  return { count: out.length, keys: out.map((d) => d.key) }
}
