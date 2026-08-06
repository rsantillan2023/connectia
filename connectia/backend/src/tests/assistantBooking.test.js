import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseBookingDate,
  parseBookingTime,
  parseBookingDurationMin,
  extractPlate,
  extractResourceName,
  extractBookingEntities,
  buildSlotFromEntities,
  mergeBookingPayload,
  formatBookingDraftText,
} from '../lib/assistantBookingDraft.js'
import { detectAssistantIntent } from '../lib/assistantIntent.js'

describe('assistantBookingDraft', () => {
  it('parsea mañana y horarios', () => {
    const now = new Date('2026-07-29T15:00:00.000Z')
    assert.equal(parseBookingDate('quiero reservar mañana', now), '2026-07-30')
    assert.equal(parseBookingTime('a las 10'), '10:00')
    assert.equal(parseBookingTime('14:30'), '14:30')
    assert.equal(parseBookingDurationMin('por 2 horas'), 120)
  })

  it('extrae patente y sala', () => {
    assert.equal(extractPlate('patente AB123CD'), 'AB123CD')
    assert.match(extractResourceName('reservar la sala Andes mañana'), /Andes/i)
  })

  it('arma slot', () => {
    const slot = buildSlotFromEntities({ fecha: '2026-08-15', hora: '10:00', duracionMin: 60 })
    assert.equal(slot.ok, true)
    assert.equal(slot.startAt.getHours(), 10)
  })

  it('merge multi-turno', () => {
    const p = mergeBookingPayload({ kind: 'sala', fecha: '2026-08-15' }, {}, 'a las 11')
    assert.equal(p.fecha, '2026-08-15')
    assert.equal(p.hora, '11:00')
  })

  it('formatea borrador con faltantes', () => {
    const t = formatBookingDraftText({ kind: 'sala' }, { missing: ['fecha', 'hora'] })
    assert.match(t, /día|fecha/i)
    assert.match(t, /hora/i)
  })

  it('extractBookingEntities combina', () => {
    const e = extractBookingEntities('sala Patagonia el 20/08 a las 15 por 1 hora')
    assert.equal(e.fecha, '2026-08-20')
    assert.equal(e.hora, '15:00')
    assert.ok(e.recurso)
  })
})

describe('intents ola 12 MVP', () => {
  it('detecta combinado saldo + pedido', () => {
    const r = detectAssistantIntent(
      'quiero saber cuántas vacaciones tengo y tomarme vacaciones del 10/08 al 20/08',
    )
    assert.equal(r.intent, 'saldo_y_solicitar_vacaciones')
    assert.equal(r.entities.desde, '10/08')
    assert.equal(r.entities.hasta, '20/08')
  })

  it('detecta cómo marcar', () => {
    assert.equal(detectAssistantIntent('cómo marcar asistencia').intent, 'como_marcar')
    assert.equal(detectAssistantIntent('cómo marco').intent, 'como_marcar')
  })

  it('reserva sala con entidades', () => {
    const r = detectAssistantIntent('quiero reservar una sala mañana a las 10')
    assert.equal(r.intent, 'reservar_sala')
    assert.ok(r.entities.fecha)
    assert.equal(r.entities.hora, '10:00')
  })

  it('cochera con patente', () => {
    const r = detectAssistantIntent('necesito una cochera mañana patente AB123CD')
    assert.equal(r.intent, 'reservar_cochera')
    assert.equal(r.entities.patente, 'AB123CD')
  })

  it('recibo sin período', () => {
    const r = detectAssistantIntent('quiero mi recibo de sueldo')
    assert.equal(r.intent, 'recibo_sueldo')
    assert.equal(r.entities.periodo, undefined)
  })
})
