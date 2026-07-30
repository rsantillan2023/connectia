import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  extractLicenseDates,
  mergeLicensePayload,
  buildLicenseDraft,
  CONFIRM_PROMPT,
} from '../lib/assistantLicenseDraft.js'
import { detectAssistantIntent } from '../lib/assistantIntent.js'

describe('assistantLicenseDraft (29.CONV)', () => {
  it('extrae rango de fechas', () => {
    assert.deepEqual(extractLicenseDates('del 10/08 al 20/08'), {
      desde: '10/08',
      hasta: '20/08',
    })
    assert.deepEqual(extractLicenseDates('el 15/08'), { desde: '15/08', hasta: '15/08' })
  })

  it('merge multi-turno conserva fechas y suma motivo', () => {
    const p = mergeLicensePayload(
      { desde: '10/08/2026', hasta: '20/08/2026', motivo: '' },
      {},
      'viaje familiar',
    )
    assert.equal(p.desde, '10/08/2026')
    assert.equal(p.hasta, '20/08/2026')
    assert.match(p.motivo, /viaje/i)
  })

  it('pide fechas si faltan', () => {
    const d = buildLicenseDraft({
      kind: 'license',
      tipo: { nombre: 'Vacaciones', key: 'vacaciones' },
      payload: {},
    })
    assert.equal(d.ready, false)
    assert.equal(d.draftAction.payload.stage, 'need_dates')
    assert.match(d.text, /fecha/i)
  })

  it('pide motivo tras fechas', () => {
    const d = buildLicenseDraft({
      kind: 'license',
      tipo: { nombre: 'Vacaciones', key: 'vacaciones' },
      payload: { desde: '10/08/2026', hasta: '12/08/2026' },
    })
    assert.equal(d.ready, false)
    assert.equal(d.draftAction.payload.stage, 'need_motivo')
    assert.match(d.text, /motivo/i)
  })

  it('queda ready con confirmación hablada', () => {
    const d = buildLicenseDraft({
      kind: 'license',
      tipo: { nombre: 'Vacaciones', key: 'vacaciones' },
      payload: { desde: '10/08/2026', hasta: '12/08/2026', motivo: 'viaje' },
      extras: { disponibleNeto: 14 },
    })
    assert.equal(d.ready, true)
    assert.equal(d.draftAction.payload.stage, 'ready')
    assert.match(d.text, /sí/i)
    assert.doesNotMatch(d.text, /tocá Confirmar/i)
    assert.ok(d.text.includes('sí') || d.text.includes(CONFIRM_PROMPT.slice(0, 20)))
  })

  it('sin motivo acepta atajo', () => {
    const d = buildLicenseDraft({
      kind: 'absence',
      tipo: { nombre: 'Ausencia' },
      payload: { desde: '15/08/2026', hasta: '15/08/2026', motivo: 'sin motivo' },
    })
    assert.equal(d.ready, true)
    assert.equal(d.draftAction.type, 'create_absence')
  })
})

describe('intents 29.CONV', () => {
  it('pedir vacaciones sin fecha dispara solicitar_vacaciones', () => {
    const r = detectAssistantIntent('Quiero pedir vacaciones')
    assert.equal(r.intent, 'solicitar_vacaciones')
  })

  it('trámite vago abre consulta (pregunta tipo)', () => {
    assert.equal(detectAssistantIntent('quiero hacer un trámite').intent, 'abrir_consulta')
    assert.equal(detectAssistantIntent('Quiero hacer un tramite').intent, 'abrir_consulta')
    assert.equal(detectAssistantIntent('nueva solicitud').intent, 'abrir_consulta')
  })

  it('confirmar y cancelar por texto', () => {
    assert.equal(detectAssistantIntent('sí').intent, 'confirmar')
    assert.equal(detectAssistantIntent('cancelar').intent, 'cancelar')
    assert.equal(detectAssistantIntent('no').intent, 'cancelar')
  })
})
