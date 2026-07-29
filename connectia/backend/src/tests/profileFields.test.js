import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeFieldKey,
  coerceFieldValue,
  validateExtraFieldsPayload,
  platformFromUa,
} from '../lib/profileFields.js'
import { normalizePeopleCareConfig } from '../lib/peopleCare.js'

describe('profileFields', () => {
  it('normalizeFieldKey limpia', () => {
    assert.equal(normalizeFieldKey(' Fecha Ingreso! '), 'fecha_ingreso')
  })

  it('coerceFieldValue text/date/list', () => {
    assert.equal(coerceFieldValue({ tipo: 'text', nombre: 'X' }, ' hola ').value, 'hola')
    assert.equal(coerceFieldValue({ tipo: 'date', nombre: 'F' }, '2020-01-02').value, '2020-01-02')
    assert.equal(coerceFieldValue({ tipo: 'date', nombre: 'F' }, 'bad').ok, false)
    assert.equal(
      coerceFieldValue({ tipo: 'list', nombre: 'L', opciones: ['a', 'b'] }, 'a').value,
      'a',
    )
    assert.equal(
      coerceFieldValue({ tipo: 'list', nombre: 'L', opciones: ['a'] }, 'z').ok,
      false,
    )
  })

  it('validateExtraFieldsPayload exige obligatorios', () => {
    const defs = [
      { key: 'nick', nombre: 'Nick', tipo: 'text', obligatorio: true, activo: true },
      { key: 'color', nombre: 'Color', tipo: 'list', opciones: ['rojo'], activo: true },
    ]
    const bad = validateExtraFieldsPayload(defs, {})
    assert.equal(bad.ok, false)
    const ok = validateExtraFieldsPayload(defs, { nick: 'x', color: 'rojo' })
    assert.equal(ok.ok, true)
    assert.equal(ok.values.nick, 'x')
  })

  it('platformFromUa', () => {
    assert.equal(platformFromUa('Mozilla/5.0 (iPhone)'), 'iOS')
    assert.equal(platformFromUa('Windows NT'), 'Windows')
  })
})

describe('peopleCare config', () => {
  it('normalize defaults disabled', () => {
    const c = normalizePeopleCareConfig(null)
    assert.equal(c.enabled, false)
    assert.ok(c.label)
    assert.equal(c.baseUrl, '')
    assert.match(c.label.toLowerCase(), /legajo|expediente/)
  })
})
