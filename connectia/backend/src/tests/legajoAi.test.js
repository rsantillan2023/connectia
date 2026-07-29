import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { heuristicLegajoDraft, legajoAiConfigured } from '../services/legajoAi.js'

describe('legajoAi heuristic', () => {
  it('extrae datos de un prompt típico de alta', () => {
    const d = heuristicLegajoDraft(
      'Alta de María López, DNI 30111222, CUIL 27-30111222-3, legajo 4521, cargo Analista, domicilio Av Corrientes 1234, CBU 0110599520000001234567 Banco Nación, obra social OSDE',
    )
    assert.equal(d.dni, '30111222')
    assert.ok(d.cuil.includes('30111222'))
    assert.equal(d.numeroLegajo, '4521')
    assert.ok(d.cargo.toLowerCase().includes('analista'))
    assert.equal(d.datosBancarios[0]?.cbu, '0110599520000001234567')
    assert.ok(d.obraSocial.nombre.toLowerCase().includes('osde'))
  })

  it('parte de un userSeed', () => {
    const d = heuristicLegajoDraft('', {
      userSeed: {
        id: 'u1',
        nombre: 'Ana',
        apellido: 'Perez',
        idExterno: 'L-9',
        email: 'ana@empresa.com',
      },
    })
    assert.equal(d.nombre, 'Ana')
    assert.equal(d.numeroLegajo, 'L-9')
    assert.equal(d.userId, 'u1')
  })

  it('legajoAiConfigured es boolean', () => {
    assert.equal(typeof legajoAiConfigured(), 'boolean')
  })
})
