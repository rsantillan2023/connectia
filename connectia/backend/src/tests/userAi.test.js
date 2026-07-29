import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { heuristicUserDraft } from '../services/userAi.js'

describe('userAi heuristic', () => {
  it('extrae email nombre y admin', () => {
    const d = heuristicUserDraft(
      'Alta de Juan Perez, mail juan.perez@acme.com, legajo 12345, como administrador',
      {
        areas: [{ id: 'a1', nombre: 'RRHH', key: 'rrhh' }],
        groups: [{ id: 'g1', nombre: 'Liderazgo', key: 'liderazgo' }],
      },
    )
    assert.equal(d.email, 'juan.perez@acme.com')
    assert.equal(d.nombre, 'Juan')
    assert.equal(d.apellido, 'Perez')
    assert.equal(d.idExterno, '12345')
    assert.equal(d.roleAdmin, true)
    assert.ok(d.usuario)
  })

  it('matchea área por nombre', () => {
    const d = heuristicUserDraft('Incorporar a Ana Lopez al área de IT', {
      areas: [{ id: 'it1', nombre: 'IT', key: 'it' }],
      groups: [],
    })
    assert.equal(d.areaId, 'it1')
    assert.equal(d.roleAdmin, false)
  })
})
