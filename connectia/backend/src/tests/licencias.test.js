import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDateInput,
  calendarDaysInclusive,
  validatePeriod,
  periodsOverlap,
  computeSaldo,
  canTransitionLicense,
  buildPeriodValidation,
} from '../lib/licenciasConfig.js'
import {
  vacationDaysBySeniority,
  yearsOfService,
  businessDaysInclusive,
  feriadosSetForYear,
  feriadosExtraDates,
  licenseTypesForPais,
  normalizeLicenciasConfig,
} from '../lib/legislacionLicencias.js'
import { detectAssistantIntent } from '../lib/assistantIntent.js'

describe('licenciasConfig', () => {
  it('parseDateInput ISO and DMY', () => {
    assert.equal(parseDateInput('2026-08-10')?.toISOString().slice(0, 10), '2026-08-10')
    assert.equal(parseDateInput('10/08/2026')?.toISOString().slice(0, 10), '2026-08-10')
    const y = new Date().getUTCFullYear()
    assert.equal(parseDateInput('10/08')?.toISOString().slice(0, 10), `${y}-08-10`)
    assert.equal(parseDateInput('bad'), null)
  })

  it('calendarDaysInclusive', () => {
    assert.equal(calendarDaysInclusive('2026-08-10', '2026-08-10'), 1)
    assert.equal(calendarDaysInclusive('2026-08-10', '2026-08-12'), 3)
  })

  it('validatePeriod rejects inverted', () => {
    const bad = validatePeriod({ desde: '2026-08-20', hasta: '2026-08-10' })
    assert.equal(bad.ok, false)
    const good = validatePeriod({ desde: '10/08/2026', hasta: '12/08/2026' })
    assert.equal(good.ok, true)
    assert.equal(good.dias, 3)
  })

  it('periodsOverlap', () => {
    assert.equal(periodsOverlap('2026-08-01', '2026-08-10', '2026-08-10', '2026-08-15'), true)
    assert.equal(periodsOverlap('2026-08-01', '2026-08-05', '2026-08-06', '2026-08-10'), false)
  })

  it('computeSaldo', () => {
    const s = computeSaldo({
      diasAnualesDefault: 14,
      usadosAprobados: 5,
      pendientes: 2,
    })
    assert.equal(s.disponible, 9)
    assert.equal(s.disponibleNeto, 7)
  })

  it('transitions', () => {
    assert.equal(canTransitionLicense('pendiente', 'aprobada'), true)
    assert.equal(canTransitionLicense('aprobada', 'rechazada'), false)
  })
})

describe('legislacion AR/CL', () => {
  it('AR vacaciones por antigüedad LCT 150', () => {
    assert.equal(vacationDaysBySeniority('AR', 3).dias, 14)
    assert.equal(vacationDaysBySeniority('AR', 7).dias, 21)
    assert.equal(vacationDaysBySeniority('AR', 12).dias, 28)
    assert.equal(vacationDaysBySeniority('AR', 25).dias, 35)
    assert.equal(vacationDaysBySeniority('AR', 3).cuentaDias, 'calendario')
  })

  it('CL vacaciones base + progresivas', () => {
    assert.equal(vacationDaysBySeniority('CL', 5).dias, 15)
    assert.equal(vacationDaysBySeniority('CL', 10).dias, 15)
    assert.equal(vacationDaysBySeniority('CL', 13).dias, 16) // +1 tras 3 años sobre 10
    assert.equal(vacationDaysBySeniority('CL', 16).dias, 17)
    assert.equal(vacationDaysBySeniority('CL', 5).cuentaDias, 'habiles')
  })

  it('yearsOfService', () => {
    assert.equal(yearsOfService('2016-01-01', new Date('2026-06-01')), 10)
    assert.equal(yearsOfService('2020-07-01', new Date('2026-06-01')), 5)
  })

  it('businessDaysInclusive excluye finde y feriados CL', () => {
    // Lun 10 ago 2026 → Vie 14 ago = 5 hábiles
    assert.equal(businessDaysInclusive('2026-08-10', '2026-08-14'), 5)
    // Incluye sábado/domingo → sigue 5
    assert.equal(businessDaysInclusive('2026-08-10', '2026-08-16'), 5)
    const feriados = feriadosSetForYear('CL', 2026)
    // 18 sep 2026 es viernes + feriado CL
    const n = businessDaysInclusive('2026-09-14', '2026-09-18', feriados)
    assert.ok(n <= 4)
  })

  it('packs de tipos AR y CL', () => {
    const ar = licenseTypesForPais('AR')
    const cl = licenseTypesForPais('CL')
    assert.ok(ar.some((t) => t.key === 'vacaciones' && t.cuentaDias === 'calendario'))
    assert.ok(cl.some((t) => t.key === 'vacaciones' && t.cuentaDias === 'habiles'))
    assert.ok(ar.some((t) => t.key === 'maternidad'))
    assert.ok(cl.some((t) => t.key === 'licencia_medica'))
  })

  it('normalizeLicenciasConfig defaults', () => {
    assert.equal(normalizeLicenciasConfig({ pais: 'CL' }).cuentaVacaciones, 'habiles')
    assert.equal(normalizeLicenciasConfig({ pais: 'AR' }).cuentaVacaciones, 'calendario')
  })

  it('buildPeriodValidation CL cuenta hábiles', () => {
    const tipo = { esVacaciones: true, cuentaDias: 'habiles' }
    const r = buildPeriodValidation({
      desde: '2026-08-10',
      hasta: '2026-08-16',
      tipo,
      licenciasConfig: { pais: 'CL' },
    })
    assert.equal(r.ok, true)
    assert.equal(r.dias, 5)
    assert.equal(r.cuentaDias, 'habiles')
  })

  it('feriados de comunidad restan días hábiles', () => {
    const cfg = normalizeLicenciasConfig({
      pais: 'CL',
      feriados: [{ fecha: '2026-08-12', nombre: 'Feriado planta', recurrente: false }],
    })
    assert.deepEqual(feriadosExtraDates(cfg, 2026), ['2026-08-12'])
    const tipo = { esVacaciones: true, cuentaDias: 'habiles' }
    const r = buildPeriodValidation({
      desde: '2026-08-10',
      hasta: '2026-08-14',
      tipo,
      licenciasConfig: cfg,
    })
    assert.equal(r.ok, true)
    // Lun–vie = 5, menos mié 12 = 4
    assert.equal(r.dias, 4)
  })
})

describe('assistant intents vacaciones/ausencias', () => {
  it('detects saldo_vacaciones', () => {
    const r = detectAssistantIntent('cuántas vacaciones tengo?')
    assert.equal(r.intent, 'saldo_vacaciones')
  })

  it('detects solicitar_vacaciones with dates', () => {
    const r = detectAssistantIntent('quiero vacaciones del 10/08 al 20/08')
    assert.equal(r.intent, 'solicitar_vacaciones')
    assert.equal(r.entities.desde, '10/08')
    assert.equal(r.entities.hasta, '20/08')
  })

  it('detects solicitar_ausentismo', () => {
    const r = detectAssistantIntent('registrar ausencia el 15/08')
    assert.equal(r.intent, 'solicitar_ausentismo')
    assert.ok(r.entities.desde)
  })
})
