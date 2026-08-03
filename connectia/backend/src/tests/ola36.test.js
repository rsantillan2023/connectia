import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSection,
  notExpiredFilter,
  parseOptionalDate,
  pinnedUntilFromDuration,
} from '../lib/postLifecycle.js'
import { applyTemplates, buildTemplateContext } from '../lib/hubKinds.js'

test('pinnedUntilFromDuration presets', () => {
  const now = new Date('2026-07-30T12:00:00.000Z')
  const h1 = pinnedUntilFromDuration({ preset: '1h' }, now)
  assert.equal(h1.toISOString(), '2026-07-30T13:00:00.000Z')
  const d3 = pinnedUntilFromDuration({ preset: '3d' }, now)
  assert.equal(d3.toISOString(), '2026-08-02T12:00:00.000Z')
})

test('parseOptionalDate and normalizeSection', () => {
  assert.equal(parseOptionalDate(''), null)
  assert.ok(parseOptionalDate('2026-08-01T10:00:00.000Z') instanceof Date)
  assert.equal(normalizeSection('  Deporte  '), 'Deporte')
})

test('notExpiredFilter shape', () => {
  const f = notExpiredFilter(new Date('2026-07-30T00:00:00.000Z'))
  assert.ok(Array.isArray(f.$or))
  assert.equal(f.$or.length, 3)
})

test('hub templates puntos + conditional', () => {
  const ctx = buildTemplateContext({ nombre: 'Ana', email: 'a@x.com' }, { empCodigo: 'DEMO' }, { puntos: 12 })
  assert.equal(ctx.puntos, '12')
  assert.match(ctx.puntos_saludo, /12/)
  const title = applyTemplates('BENEFICIOS · {{puntos_saludo}} {{si_puntos_gt:10:Tenés muchos}}', ctx)
  assert.match(title, /12/)
  assert.match(title, /Tenés muchos/)
  const low = applyTemplates('{{si_puntos_gt:20:alto}}', buildTemplateContext({}, {}, { puntos: 5 }))
  assert.equal(low, '')
})

test('hub templates profile fields', () => {
  const ctx = buildTemplateContext(
    {
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '1155555555',
      dni: '30111222',
      cuil: '20-30111222-3',
      cargo: 'Analista',
      sede: 'CABA',
      fechaIngreso: new Date('2020-03-15T12:00:00.000Z'),
    },
    { empCodigo: 'DEMO', timezone: 'UTC' },
  )
  assert.equal(ctx.primer_nombre, 'Juan')
  assert.equal(ctx.apellido, 'Pérez')
  assert.equal(ctx.iniciales, 'JP')
  assert.equal(ctx.telefono, '1155555555')
  assert.equal(ctx.dni, '30111222')
  assert.equal(ctx.cuil, '20-30111222-3')
  assert.equal(ctx.cargo, 'Analista')
  assert.equal(ctx.sede, 'CABA')
  assert.equal(ctx.fecha_ingreso, '15/03/2020')
  assert.match(ctx.fecha_hoy, /^\d{2}\/\d{2}\/\d{4}$/)
  const copy = applyTemplates('Hola {{primer_nombre}} ({{iniciales}}) · {{cargo}} · {{sede}}', ctx)
  assert.equal(copy, 'Hola Juan (JP) · Analista · CABA')
})
