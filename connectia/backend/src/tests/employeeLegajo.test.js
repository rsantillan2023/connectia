import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePeopleCareConfig } from '../lib/peopleCare.js'
import { maskCbu, applyLegajoPatch, serializeLegajo, seedFromUser } from '../lib/employeeLegajo.js'

describe('peopleCare config (local)', () => {
  it('normalize defaults disabled y sin baseUrl', () => {
    const c = normalizePeopleCareConfig(null)
    assert.equal(c.enabled, false)
    assert.equal(c.baseUrl, '')
    assert.ok(c.label)
  })

  it('ignora baseUrl externo', () => {
    const c = normalizePeopleCareConfig({ enabled: true, baseUrl: 'https://evil.example', label: 'Expediente' })
    assert.equal(c.enabled, true)
    assert.equal(c.baseUrl, '')
    assert.equal(c.label, 'Expediente')
  })
})

describe('employeeLegajo helpers', () => {
  it('maskCbu oculta dígitos intermedios', () => {
    assert.equal(maskCbu('1234567890123456789012'), '1234••••••••9012')
    assert.equal(maskCbu(''), '')
  })

  it('seedFromUser copia campos básicos', () => {
    const s = seedFromUser({
      nombre: 'Ana',
      apellido: 'Perez',
      idExterno: 'L-10',
      cargo: 'Analista',
    })
    assert.equal(s.nombre, 'Ana')
    assert.equal(s.numeroLegajo, 'L-10')
    assert.equal(s.cargo, 'Analista')
  })

  it('applyLegajoPatch + serialize masks CBU para U', () => {
    const doc = {
      _id: '507f1f77bcf86cd799439011',
      tenantId: '507f1f77bcf86cd799439012',
      numeroLegajo: '100',
      estadoLaboral: 'activo',
      activo: true,
      nombre: 'Ana',
      apellido: 'Perez',
      domicilios: [],
      familiares: [],
      datosBancarios: [],
      contratos: [],
      carrera: { capacitaciones: [], skills: [] },
      obraSocial: {},
      fichaMedica: {},
    }
    applyLegajoPatch(doc, {
      datosBancarios: [{ banco: 'Nación', cbu: '1234567890123456789012', principal: true }],
      estadoLaboral: 'activo',
    })
    const masked = serializeLegajo(doc, { maskSensitive: true })
    assert.match(masked.datosBancarios[0].cbu, /••••/)
    const full = serializeLegajo(doc, { maskSensitive: false })
    assert.equal(full.datosBancarios[0].cbu, '1234567890123456789012')
  })

  it('rechaza estadoLaboral inválido', () => {
    const doc = { estadoLaboral: 'activo' }
    assert.throws(() => applyLegajoPatch(doc, { estadoLaboral: 'fantasma' }))
  })
})
