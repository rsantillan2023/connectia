/**
 * Ola 8 — fechas/hitos de perfil + tipos/reglas de saludo para un tenant.
 * Idempotente. Pensado para DEMO y ARCOR.
 */
import { User } from '../models/User.js'
import { GreetingEventType } from '../models/GreetingEventType.js'
import { GreetingRule } from '../models/GreetingRule.js'
import { seedGreetingsForTenant } from './seedGreetings.js'

function noonUtc(y, m, d) {
  return new Date(Date.UTC(y, m, d, 12, 0, 0))
}

function ymd(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ brandName?: string }} [opts]
 */
export async function seedOla8ForTenant(tenantId, opts = {}) {
  if (!tenantId) throw new Error('tenantId requerido')
  const brandName = String(opts.brandName || 'Connectia').trim() || 'Connectia'

  const greetings = await seedGreetingsForTenant({ tenantId, brandName })

  // Tipo custom: promoción (usa customDates.promocion)
  await GreetingEventType.findOneAndUpdate(
    { tenantId, key: 'promocion' },
    {
      $setOnInsert: {
        tenantId,
        key: 'promocion',
        label: 'Aniversario de promoción',
        description: 'Dispara con user.customDates.promocion (día/mes).',
        dateSource: 'customDate',
        customDateKey: 'promocion',
        minYears: 1,
        sortOrder: 50,
        activo: true,
        isSystem: false,
      },
    },
    { upsert: true, new: true },
  )

  // Tipo: fin de prueba (N días después de ingreso)
  await GreetingEventType.findOneAndUpdate(
    { tenantId, key: 'fin_prueba' },
    {
      $setOnInsert: {
        tenantId,
        key: 'fin_prueba',
        label: 'Fin de período de prueba',
        description: '90 días después de la fecha de ingreso.',
        dateSource: 'daysAfter',
        offsetField: 'fechaIngreso',
        offsetDays: 90,
        minYears: 0,
        sortOrder: 55,
        activo: true,
        isSystem: false,
      },
    },
    { upsert: true, new: true },
  )

  await GreetingRule.findOneAndUpdate(
    { tenantId, name: 'Aniversario de promoción' },
    {
      tenantId,
      name: 'Aniversario de promoción',
      eventType: 'promocion',
      titulo: '¡Felicitaciones por tu promoción, {{nombre}}!',
      cuerpo:
        `{{nombre}} {{apellido}} cumple un nuevo aniversario en su rol en ${brandName}.\n\n` +
        '¡Gracias por seguir creciendo con el equipo!',
      hours: ['09:30'],
      daysBefore: 0,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      notifyAudience: true,
      activo: true,
    },
    { upsert: true, new: true },
  )

  const now = new Date()
  const todayM = now.getUTCMonth()
  const todayD = now.getUTCDate()

  const users = await User.find({ tenantId, activo: true }).sort({ usuario: 1 })
  let updated = 0
  let withBirthdayToday = 0

  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const birthYear = 1984 + (i % 18)
    const hireYear = 2016 + (i % 8)
    // Primer member activo no-admin: cumpleaños hoy (para demo del motor)
    const birthdayToday = withBirthdayToday === 0 && (u.roles || []).includes('member') && !(u.roles || []).includes('admin')

    const birth = birthdayToday
      ? noonUtc(birthYear, todayM, todayD)
      : noonUtc(birthYear, (i * 3) % 12, 5 + ((i * 5) % 20))
    const hire = noonUtc(hireYear, (i * 2) % 12, 8 + (i % 15))
    const promo = noonUtc(hireYear + 1, (i * 4) % 12, 12)
    const cert = noonUtc(hireYear + 2, (i * 5) % 12, 20)

    let dirty = false
    if (!u.fechaNacimiento) {
      u.fechaNacimiento = birth
      dirty = true
    }
    if (!u.fechaIngreso) {
      u.fechaIngreso = hire
      dirty = true
    }
    if (!u.cargo) {
      u.cargo = (u.roles || []).includes('admin') ? 'Administración' : i % 2 === 0 ? 'Analista' : 'Especialista'
      dirty = true
    }

    const map = u.customDates instanceof Map ? new Map(u.customDates) : new Map(Object.entries(u.customDates || {}))
    if (!map.has('promocion')) {
      map.set('promocion', promo)
      dirty = true
    }
    if (!map.has('certificacion')) {
      map.set('certificacion', cert)
      dirty = true
    }
    if (dirty) {
      u.customDates = map
      await u.save()
      updated += 1
    }
    if (birthdayToday) withBirthdayToday += 1
  }

  return {
    brandName,
    greetingRules: greetings.created,
    usersTouched: updated,
    usersTotal: users.length,
    birthdayTodayUsers: withBirthdayToday,
    sample: users.slice(0, 3).map((u) => ({
      usuario: u.usuario,
      fechaNacimiento: u.fechaNacimiento ? ymd(u.fechaNacimiento) : null,
      fechaIngreso: u.fechaIngreso ? ymd(u.fechaIngreso) : null,
      cargo: u.cargo || '',
    })),
  }
}
