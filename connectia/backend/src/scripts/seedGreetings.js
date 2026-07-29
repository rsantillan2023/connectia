import { GreetingRule } from '../models/GreetingRule.js'
import { seedGreetingEventTypesForTenant } from './seedGreetingEventTypes.js'

/**
 * Seed de reglas de saludo automático (§5) — al menos 2 por tenant.
 * Idempotente por (tenantId, name).
 */
export async function seedGreetingsForTenant({ tenantId, brandName = 'Connectia' }) {
  if (!tenantId) throw new Error('tenantId requerido')
  const brand = String(brandName || 'Connectia').trim() || 'Connectia'
  await seedGreetingEventTypesForTenant(tenantId)

  const rules = [
    {
      name: 'Cumpleaños del equipo',
      eventType: 'birthday',
      titulo: '¡Feliz cumpleaños {{nombre}}!',
      cuerpo:
        `Hoy en ${brand} celebramos a {{nombre}} {{apellido}} ({{cargo}}).\n\n` +
        '¡Que tengas un día genial y muchas felicidades de parte de todo el equipo!',
      hours: ['09:00'],
      daysBefore: 0,
      fixedDay: null,
      fixedMonth: null,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      notifyAudience: true,
      activo: true,
    },
    {
      name: 'Aniversario laboral',
      eventType: 'work_anniversary',
      titulo: '¡{{anios}} años con nosotros, {{nombre}}!',
      cuerpo:
        `{{nombre}} {{apellido}} cumple {{anios}} años en ${brand}.\n\n` +
        'Gracias por tu compromiso y por sumar cada día. ¡Felicitaciones!',
      hours: ['10:00'],
      daysBefore: 0,
      fixedDay: null,
      fixedMonth: null,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      notifyAudience: true,
      activo: true,
    },
    {
      name: 'Fin de año — saludo corporativo',
      eventType: 'fixed_date',
      titulo: `¡Feliz fin de año, equipo ${brand}!`,
      cuerpo:
        `Llegamos juntos al cierre del año. Gracias a cada persona de ${brand} ` +
        'por el esfuerzo, la colaboración y las ganas.\n\n¡Que el próximo año sea aún mejor!',
      hours: ['11:00'],
      daysBefore: 0,
      fixedDay: 31,
      fixedMonth: 12,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      notifyAudience: true,
      activo: true,
    },
  ]

  const out = []
  for (const rule of rules) {
    const doc = await GreetingRule.findOneAndUpdate(
      { tenantId, name: rule.name },
      { tenantId, ...rule },
      { upsert: true, new: true },
    )
    out.push(doc)
  }
  return { created: out.length, rules: out.map((r) => ({ id: String(r._id), name: r.name, eventType: r.eventType })) }
}
