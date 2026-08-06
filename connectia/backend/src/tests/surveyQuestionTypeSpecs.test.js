import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeQuestionTypeSpecs,
  buildSmartQuestionTypePlan,
  interleaveQuestionTypes,
} from '../lib/surveyQuestions.js'

describe('normalizeQuestionTypeSpecs', () => {
  it('arma plan válido y suma total', () => {
    const r = normalizeQuestionTypeSpecs([
      { tipo: 'rating', count: 3, caracteristicas: 'clima laboral' },
      { tipo: 'textarea', count: 1 },
      { tipo: 'bogus', count: 5 },
      { tipo: 'yesno', count: 0 },
    ])
    assert.equal(r.error, undefined)
    assert.equal(r.total, 4)
    assert.equal(r.specs.length, 2)
    assert.equal(r.specs[0].tipo, 'rating')
    assert.equal(r.specs[0].caracteristicas, 'clima laboral')
  })

  it('exige al menos un tipo con cantidad', () => {
    const r = normalizeQuestionTypeSpecs([])
    assert.match(r.error || '', /al menos/i)
  })

  it('limita total a 40', () => {
    const r = normalizeQuestionTypeSpecs([
      { tipo: 'text', count: 20 },
      { tipo: 'rating', count: 20 },
      { tipo: 'yesno', count: 1 },
    ])
    assert.equal(r.total, 41)
    assert.match(r.error || '', /40/)
  })
})

describe('buildSmartQuestionTypePlan', () => {
  it('mezcla varias tipologías y respeta el total', () => {
    const r = buildSmartQuestionTypePlan({
      enabledTypes: ['rating', 'yesno', 'single', 'multiple', 'textarea', 'text'],
      total: 8,
      context: { categoria: 'clima', purpose: 'general', titulo: 'Clima Q3' },
    })
    assert.equal(r.mode, 'smart')
    assert.equal(r.total, 8)
    assert.ok(r.specs.length >= 3)
    const types = new Set(r.specs.map((s) => s.tipo))
    assert.ok(types.size >= 3)
    assert.equal(r.sequence.length, 8)
    assert.ok(new Set(r.sequence).size >= 3)
  })

  it('prioriza NPS cuando la categoría es nps', () => {
    const r = buildSmartQuestionTypePlan({
      enabledTypes: ['rating', 'textarea', 'single', 'yesno', 'geopoint'],
      total: 6,
      context: { categoria: 'nps' },
    })
    assert.equal(r.specs[0].tipo, 'rating')
    assert.ok(r.specs.some((s) => s.tipo === 'textarea'))
  })

  it('intercala tipologías sin agrupar todo junto', () => {
    const seq = interleaveQuestionTypes([
      { tipo: 'rating', count: 3 },
      { tipo: 'yesno', count: 2 },
      { tipo: 'textarea', count: 1 },
    ])
    assert.equal(seq.length, 6)
    // No deberían ser las 3 rating al inicio consecutivas como único bloque
    assert.notDeepEqual(seq.slice(0, 3), ['rating', 'rating', 'rating'])
  })

  it('adapta la mezcla a capacitación', () => {
    const r = buildSmartQuestionTypePlan({
      enabledTypes: ['multiple', 'single', 'rating', 'number', 'textarea', 'yesno'],
      total: 10,
      context: { categoria: 'capacitacion', titulo: 'Post curso seguridad' },
    })
    assert.ok(r.specs.some((s) => s.tipo === 'multiple' || s.tipo === 'single'))
    assert.ok(new Set(r.sequence).size >= 4)
  })
})
