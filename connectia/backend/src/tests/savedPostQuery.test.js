import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSavedListQuery,
  savedPostFilterClauses,
  SAVED_TIPOS,
} from '../lib/savedPostQuery.js'

describe('parseSavedListQuery', () => {
  it('ignora texto corto y valores inválidos', () => {
    const parsed = parseSavedListQuery({ q: 'a', tipo: 'xyz', origin: 'bot' })
    assert.equal(parsed.q, '')
    assert.equal(parsed.tipo, '')
    assert.equal(parsed.origin, '')
    assert.equal(parsed.hasFilters, false)
  })

  it('acepta q (>=2), tipo y origin válidos', () => {
    const parsed = parseSavedListQuery({
      q: '  bono  ',
      tipo: 'Beneficio',
      origin: 'member',
    })
    assert.equal(parsed.q, 'bono')
    assert.equal(parsed.tipo, 'beneficio')
    assert.equal(parsed.origin, 'member')
    assert.equal(parsed.hasFilters, true)
  })
  it('acepta section y knowledge para deep links', () => {
    const parsed = parseSavedListQuery({
      section: 'Deporte',
      knowledge: '1',
    })
    assert.equal(parsed.section, 'Deporte')
    assert.equal(parsed.knowledge, true)
    assert.equal(parsed.hasFilters, true)
  })
})

describe('savedPostFilterClauses', () => {
  it('arma cláusulas de tipo, origin y texto', () => {
    const clauses = savedPostFilterClauses({
      q: 'vacaciones',
      tipo: 'aviso',
      origin: 'admin',
    })
    assert.equal(clauses.length, 3)
    assert.deepEqual(clauses[0], { tipo: 'aviso' })
    assert.deepEqual(clauses[1], { origin: 'admin' })
    assert.equal(clauses[2].$or.length, 2)
    assert.match(clauses[2].$or[0].titulo.$regex, /vacaciones/)
  })

  it('agrega section e isKnowledge', () => {
    const clauses = savedPostFilterClauses({ section: 'moda', knowledge: true })
    assert.equal(clauses.length, 2)
    assert.equal(clauses[0].section.$options, 'i')
    assert.deepEqual(clauses[1], { isKnowledge: true })
  })

  it('cubre todos los tipos conocidos', () => {
    for (const tipo of SAVED_TIPOS) {
      const [clause] = savedPostFilterClauses({ tipo })
      assert.deepEqual(clause, { tipo })
    }
  })
})
