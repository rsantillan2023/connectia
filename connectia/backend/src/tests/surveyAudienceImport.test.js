import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAudienceImportCsv,
  matchAudienceRow,
  buildAudienceUserIndexes,
  resolveAudienceImportRows,
  digitsOnly,
} from '../lib/surveyAudienceImport.js'

describe('surveyAudienceImport', () => {
  it('parsea CSV con aliases de legajo/dni', () => {
    const csv = 'Legajo,DNI,Nombre,Apellido\n1001,30111222,Juan,Pérez\n'
    const parsed = parseAudienceImportCsv(csv)
    assert.deepEqual(parsed.headers.sort(), ['apellido', 'dni', 'legajo', 'nombre'].sort())
    assert.equal(parsed.rows.length, 1)
    assert.equal(parsed.rows[0].legajo, '1001')
    assert.equal(parsed.rows[0].dni, '30111222')
  })

  it('matchea por legajo, dni y nombre', () => {
    const users = [
      {
        _id: 'u1',
        idExterno: '1001',
        dni: '30.111.222',
        usuario: 'jperez',
        email: 'a@b.com',
        nombre: 'Juan',
        apellido: 'Pérez',
      },
      {
        _id: 'u2',
        idExterno: '',
        dni: '40111222',
        usuario: 'mlopez',
        email: 'm@b.com',
        nombre: 'María',
        apellido: 'López',
      },
    ]
    const idx = buildAudienceUserIndexes(users)
    assert.equal(matchAudienceRow({ legajo: '1001' }, idx).matchedBy, 'legajo')
    assert.equal(matchAudienceRow({ dni: '30-111-222' }, idx).user._id, 'u1')
    assert.equal(digitsOnly('30.111.222'), '30111222')
    assert.equal(matchAudienceRow({ nombre: 'María', apellido: 'López' }, idx).matchedBy, 'nombre')
  })

  it('resolveAudienceImportRows resume matched/unmatched', () => {
    const users = [
      { _id: 'u1', idExterno: '1001', dni: '111', usuario: 'a', email: 'a@a.com', nombre: 'A', apellido: 'A' },
    ]
    const result = resolveAudienceImportRows(
      [
        { __line: 2, legajo: '1001' },
        { __line: 3, legajo: '9999' },
        { __line: 4, legajo: '1001' },
      ],
      users,
    )
    assert.equal(result.summary.matched, 1)
    assert.equal(result.summary.unmatched, 2)
    assert.deepEqual(result.matchedIds, ['u1'])
  })
})
