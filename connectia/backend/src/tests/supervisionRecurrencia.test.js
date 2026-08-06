import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeNextRunAt,
  computeFechaLimiteFromPlazo,
  parseHoraLocal,
  validateRecurrenciaPayload,
  labelFrecuencia,
  weekOfMonth,
  normalizeDiasSemana,
  normalizeSemanasMes,
} from '../lib/supervisionRecurrencia.js'

describe('supervisionRecurrencia', () => {
  it('parseHoraLocal', () => {
    assert.deepEqual(parseHoraLocal('09:30'), { h: 9, m: 30 })
    assert.deepEqual(parseHoraLocal('bad'), { h: 9, m: 0 })
  })

  it('computeNextRunAt diaria avanza si ya pasó la hora', () => {
    const now = new Date(2026, 7, 5, 15, 0, 0) // 5 ago 2026 15:00
    const next = computeNextRunAt({ frecuencia: 'diaria', horaLocal: '09:00' }, now)
    assert.equal(next.getDate(), 6)
    assert.equal(next.getHours(), 9)
  })

  it('computeNextRunAt semanal apunta al día pedido', () => {
    const now = new Date(2026, 7, 5, 10, 0, 0) // miércoles
    const next = computeNextRunAt({ frecuencia: 'semanal', diaSemana: 1, horaLocal: '09:00' }, now) // lunes
    assert.equal(next.getDay(), 1)
    assert.ok(next.getTime() > now.getTime())
  })

  it('computeNextRunAt semanal_custom elige el próximo día marcado', () => {
    const now = new Date(2026, 7, 5, 10, 0, 0) // miércoles 5 ago
    const next = computeNextRunAt(
      { frecuencia: 'semanal_custom', diasSemana: [1, 5], horaLocal: '09:00' }, // lun y vie
      now,
    )
    assert.equal(next.getDay(), 5) // viernes 7 ago
    assert.equal(next.getDate(), 7)
  })

  it('computeNextRunAt mensual', () => {
    const now = new Date(2026, 7, 20, 10, 0, 0)
    const next = computeNextRunAt({ frecuencia: 'mensual', diaMes: 5, horaLocal: '08:00' }, now)
    assert.equal(next.getDate(), 5)
    assert.equal(next.getMonth(), 8) // septiembre
    assert.equal(next.getHours(), 8)
  })

  it('weekOfMonth y mensual_custom', () => {
    assert.equal(weekOfMonth(new Date(2026, 7, 3)), 1)
    assert.equal(weekOfMonth(new Date(2026, 7, 10)), 2)
    assert.equal(weekOfMonth(new Date(2026, 7, 20)), 3)
    assert.equal(weekOfMonth(new Date(2026, 7, 28)), 4)
    // 5 ago 2026 = miércoles semana 1; pedimos lun en sem 1 y 3 → próximo lun sem 3 = 17 ago
    const now = new Date(2026, 7, 5, 10, 0, 0)
    const next = computeNextRunAt(
      {
        frecuencia: 'mensual_custom',
        semanasMes: [1, 3],
        diaSemana: 1,
        horaLocal: '09:00',
      },
      now,
    )
    assert.equal(next.getDay(), 1)
    assert.ok([1, 3].includes(weekOfMonth(next)))
    assert.ok(next.getTime() > now.getTime())
  })

  it('normalize helpers', () => {
    assert.deepEqual(normalizeDiasSemana([5, 1, 1, 9]), [1, 5])
    assert.deepEqual(normalizeSemanasMes([4, 1, 1, 9]), [1, 4])
  })

  it('computeFechaLimiteFromPlazo', () => {
    const now = new Date('2026-08-05T12:00:00.000Z')
    const lim = computeFechaLimiteFromPlazo(24, now)
    assert.equal(lim.toISOString(), '2026-08-06T12:00:00.000Z')
  })

  it('validateRecurrenciaPayload', () => {
    assert.equal(validateRecurrenciaPayload({}).ok, false)
    assert.equal(
      validateRecurrenciaPayload({ titulo: 'X', salaId: '1', frecuencia: 'diaria' }).ok,
      true,
    )
    assert.equal(
      validateRecurrenciaPayload({
        titulo: 'X',
        salaId: '1',
        frecuencia: 'semanal_custom',
        diasSemana: [],
      }).ok,
      false,
    )
    assert.equal(
      validateRecurrenciaPayload({
        titulo: 'X',
        salaId: '1',
        frecuencia: 'semanal_custom',
        diasSemana: [1, 3],
      }).ok,
      true,
    )
    assert.equal(
      validateRecurrenciaPayload({
        titulo: 'X',
        salaId: '1',
        frecuencia: 'mensual_custom',
        semanasMes: [1, 4],
      }).ok,
      true,
    )
  })

  it('labelFrecuencia', () => {
    assert.match(labelFrecuencia({ frecuencia: 'diaria', horaLocal: '10:00' }), /Todos los días/)
    assert.match(labelFrecuencia({ frecuencia: 'semanal', diaSemana: 1, horaLocal: '09:00' }), /lunes/)
    assert.match(
      labelFrecuencia({ frecuencia: 'semanal_custom', diasSemana: [1, 5], horaLocal: '09:00' }),
      /lunes.*viernes|custom/i,
    )
    assert.match(
      labelFrecuencia({
        frecuencia: 'mensual_custom',
        semanasMes: [1, 3],
        diaSemana: 1,
        horaLocal: '09:00',
      }),
      /sem\. 1 y 3/,
    )
  })
})
