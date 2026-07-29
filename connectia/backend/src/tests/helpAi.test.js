import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  heuristicFaqDraft,
  heuristicTutorialDraft,
  heuristicPolicyDraft,
} from '../services/helpAi.js'

describe('helpAi heuristic', () => {
  it('arma FAQ desde brief', () => {
    const d = heuristicFaqDraft('quiero una FAQ sobre pedir vacaciones', 'Grido')
    assert.match(d.pregunta, /vacaciones/i)
    assert.ok(d.respuesta.length > 20)
    assert.equal(d.status, 'draft')
  })

  it('arma tutorial con pasos', () => {
    const d = heuristicTutorialDraft('tutorial de marcar asistencia en el local', 'Grido')
    assert.ok(d.titulo)
    assert.ok(d.steps.length >= 2)
  })

  it('arma política con cuerpo', () => {
    const d = heuristicPolicyDraft('política de higiene en el salón', 'Grido Helados')
    assert.match(d.titulo, /higiene|salón/i)
    assert.ok(d.cuerpo.includes('Alcance') || d.cuerpo.includes('1.'))
    assert.equal(d.requiresAck, true)
  })
})
