import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeOkrProgress, scoreQuiz, tenantHasTalentCap } from '../lib/talent.js'
import {
  computeEnps,
  pulseAggregateSafe,
  validatePulseAnswers,
  tenantHasCultureCap,
} from '../lib/culture.js'

describe('computeOkrProgress', () => {
  it('promedia avance de key results', () => {
    const progress = computeOkrProgress([
      { target: 100, current: 50 },
      { target: 20, current: 10 },
    ])
    assert.equal(progress, 50)
  })

  it('devuelve 0 sin key results', () => {
    assert.equal(computeOkrProgress([]), 0)
  })

  it('limita cada KR a 100%', () => {
    const progress = computeOkrProgress([{ target: 10, current: 20 }])
    assert.equal(progress, 100)
  })
})

describe('scoreQuiz', () => {
  it('calcula puntaje por respuestas correctas', () => {
    const quiz = [
      { pregunta: 'A', opciones: ['x', 'y'], correcta: 0 },
      { pregunta: 'B', opciones: ['x', 'y'], correcta: 1 },
    ]
    const result = scoreQuiz(quiz, [0, 1])
    assert.equal(result.correct, 2)
    assert.equal(result.total, 2)
    assert.equal(result.score, 100)
  })

  it('devuelve 100 si no hay preguntas', () => {
    const result = scoreQuiz([], [])
    assert.equal(result.score, 100)
    assert.equal(result.total, 0)
  })
})

describe('computeEnps', () => {
  it('calcula eNPS clásico', () => {
    const { enps, promoters, detractors, n } = computeEnps([10, 9, 7, 6, 0])
    assert.equal(n, 5)
    assert.equal(promoters, 2)
    assert.equal(detractors, 2)
    assert.equal(enps, 0)
  })

  it('devuelve null sin respuestas', () => {
    const { enps, n } = computeEnps([])
    assert.equal(n, 0)
    assert.equal(enps, null)
  })
})

describe('pulseAggregateSafe', () => {
  const campaign = {
    anonymityThreshold: 3,
    questions: [
      { tipo: 'enps', texto: 'Recomendación' },
      { tipo: 'text', texto: 'Mejora' },
    ],
  }

  it('oculta agregados bajo el umbral', () => {
    const responses = [
      { answers: [{ value: 9 }, { value: 'ok' }] },
      { answers: [{ value: 8 }, { value: 'bien' }] },
    ]
    const agg = pulseAggregateSafe(responses, campaign)
    assert.equal(agg.visible, false)
    assert.equal(agg.n, 2)
    assert.equal(agg.threshold, 3)
    assert.equal(agg.enps, null)
  })

  it('muestra agregados al alcanzar umbral', () => {
    const responses = [
      { answers: [{ value: 10 }, { value: 'a' }] },
      { answers: [{ value: 9 }, { value: 'b' }] },
      { answers: [{ value: 6 }, { value: 'c' }] },
    ]
    const agg = pulseAggregateSafe(responses, campaign)
    assert.equal(agg.visible, true)
    assert.equal(agg.n, 3)
    assert.equal(typeof agg.enps, 'number')
    assert.ok(Array.isArray(agg.openThemes))
  })
})

describe('validatePulseAnswers', () => {
  const questions = [
    { tipo: 'enps', texto: 'eNPS' },
    { tipo: 'scale', texto: 'Escala' },
    { tipo: 'text', texto: 'Texto' },
  ]

  it('acepta respuestas válidas', () => {
    const check = validatePulseAnswers(questions, [
      { value: 8 },
      { value: 4 },
      { value: 'todo bien' },
    ])
    assert.equal(check.ok, true)
  })

  it('rechaza cantidad incorrecta', () => {
    const check = validatePulseAnswers(questions, [{ value: 5 }])
    assert.equal(check.ok, false)
  })

  it('rechaza eNPS fuera de rango', () => {
    const check = validatePulseAnswers(questions, [{ value: 11 }, { value: 3 }, { value: 'x' }])
    assert.equal(check.ok, false)
  })
})

describe('tenantHasTalentCap', () => {
  it('requiere cap base talento', () => {
    assert.equal(tenantHasTalentCap({ capabilities: ['talento.okr'] }), false)
    assert.equal(tenantHasTalentCap({ capabilities: ['talento'] }), true)
  })

  it('valida subcap', () => {
    const tenant = { capabilities: ['talento', 'talento.lms'] }
    assert.equal(tenantHasTalentCap(tenant, 'lms'), true)
    assert.equal(tenantHasTalentCap(tenant, 'okr'), false)
  })
})

describe('tenantHasCultureCap', () => {
  it('requiere cap base cultura', () => {
    assert.equal(tenantHasCultureCap({ capabilities: ['cultura.pulso'] }), false)
    assert.equal(tenantHasCultureCap({ capabilities: ['cultura'] }), true)
  })

  it('valida subcap', () => {
    const tenant = { capabilities: ['cultura', 'cultura.reconocimientos'] }
    assert.equal(tenantHasCultureCap(tenant, 'reconocimientos'), true)
    assert.equal(tenantHasCultureCap(tenant, 'marketplace'), false)
  })
})
