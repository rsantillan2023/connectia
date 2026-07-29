import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectAssistantIntent } from '../lib/assistantIntent.js'
import { formatRequestsAnswer, formatDocumentsAnswer, formatKbAnswer } from '../lib/assistantTools.js'

describe('detectAssistantIntent', () => {
  it('detecta solicitudes en curso', () => {
    const r = detectAssistantIntent('qué solicitudes tengo en curso')
    assert.equal(r.intent, 'mis_solicitudes')
  })

  it('detecta documentos visibles', () => {
    const r = detectAssistantIntent('qué documentos puedo ver')
    assert.equal(r.intent, 'mis_documentos')
  })

  it('detecta ayuda KB', () => {
    const r = detectAssistantIntent('cómo creo una solicitud')
    assert.equal(r.intent, 'ayuda_kb')
  })

  it('detecta vacaciones saldo', () => {
    const r = detectAssistantIntent('¿cuántas vacaciones tengo?')
    assert.equal(r.intent, 'saldo_vacaciones')
  })

  it('detecta confirmar', () => {
    assert.equal(detectAssistantIntent('sí').intent, 'confirmar')
    assert.equal(detectAssistantIntent('confirmo').intent, 'confirmar')
  })

  it('detecta cancelar', () => {
    assert.equal(detectAssistantIntent('cancelar').intent, 'cancelar')
  })

  it('detecta recibo', () => {
    const r = detectAssistantIntent('quiero mi recibo de sueldo de marzo')
    assert.equal(r.intent, 'recibo_sueldo')
  })

  it('detecta módulo documentos', () => {
    const r = detectAssistantIntent('dónde está el módulo de documentos')
    assert.equal(r.intent, 'donde_modulo')
    assert.equal(r.entities.route, '/docs')
  })
})

describe('format helpers', () => {
  it('formatea solicitudes vacías', () => {
    const r = formatRequestsAnswer([])
    assert.match(r.text, /No tenés solicitudes/)
  })

  it('formatea documentos', () => {
    const r = formatDocumentsAnswer([{ id: '1', titulo: 'Manual', category: 'RRHH', descripcion: 'x' }])
    assert.match(r.text, /Manual/)
    assert.equal(r.sources.length, 1)
  })

  it('formatea KB sin fuentes', () => {
    const r = formatKbAnswer([])
    assert.match(r.text, /No encontré/)
  })
})
