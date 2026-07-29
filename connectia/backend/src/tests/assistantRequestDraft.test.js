import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  matchRequestType,
  extractCamposFromText,
  buildRequestDraft,
  isSolicitudCreateIntent,
} from '../lib/assistantRequestDraft.js'

const TYPES = [
  {
    _id: 't1',
    key: 'rrhh',
    nombre: 'Consulta RRHH',
    area: 'RRHH',
    campos: [
      { key: 'motivo', label: 'Motivo', tipo: 'select', required: true, opciones: ['Vacaciones', 'Legajo', 'Recibo', 'Otro'] },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true },
    ],
  },
  {
    _id: 't2',
    key: 'sistemas',
    nombre: 'Soporte sistemas',
    area: 'IT',
    campos: [
      { key: 'sistema', label: 'Sistema / app', tipo: 'text', required: true },
      { key: 'prioridad', label: 'Prioridad', tipo: 'select', required: true, opciones: ['Baja', 'Media', 'Alta'] },
      { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', required: false },
    ],
  },
]

describe('assistantRequestDraft', () => {
  it('detecta intención de cargar solicitud', () => {
    assert.equal(isSolicitudCreateIntent('quiero cargar una solicitud'), true)
    assert.equal(isSolicitudCreateIntent('hola'), false)
  })

  it('matchea tipo por nombre/keywords', () => {
    const t = matchRequestType(TYPES, 'no me anda la VPN necesito sistemas')
    assert.equal(t.key, 'sistemas')
  })

  it('elige tipo por número', () => {
    assert.equal(matchRequestType(TYPES, '2').key, 'sistemas')
  })

  it('extrae campos de sistemas', () => {
    const campos = extractCamposFromText(TYPES[1].campos, 'La VPN no funciona, prioridad alta, me bloquea el trabajo')
    assert.equal(campos.sistema, 'VPN')
    assert.equal(campos.prioridad, 'Alta')
    assert.equal(campos.urgente, true)
  })

  it('arma draft listo cuando hay todos los campos', () => {
    const draft = buildRequestDraft({
      types: TYPES,
      text: 'Soporte sistemas: VPN caída, prioridad Alta, bloquea mi trabajo',
    })
    assert.equal(draft.ready, true)
    assert.equal(draft.payload.tipoKey, 'sistemas')
    assert.equal(draft.payload.campos.prioridad, 'Alta')
  })

  it('pide tipo si no matchea', () => {
    const draft = buildRequestDraft({ types: TYPES, text: 'quiero cargar una solicitud' })
    assert.equal(draft.ready, false)
    assert.equal(draft.stage, 'pick_type')
  })
})
