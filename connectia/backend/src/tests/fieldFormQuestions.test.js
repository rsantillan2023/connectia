import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateFieldLogic,
  normalizeQuestions,
  normalizeAnswerValue,
  answerMatches,
} from '../lib/fieldFormQuestions.js'

test('normalizeQuestions keeps logic rules', () => {
  const qs = normalizeQuestions([
    { id: 'a', texto: 'A', tipo: 'yesno', logic: [{ when: { questionId: 'a', op: 'eq', value: true }, action: 'hide' }] },
    { texto: 'B', tipo: 'text' },
  ])
  assert.equal(qs.length, 2)
  assert.equal(qs[0].logic[0].action, 'hide')
  assert.equal(qs[1].id, 'q2')
})

test('answerMatches eq/neq/truthy', () => {
  assert.equal(answerMatches({ questionId: 'a', op: 'eq', value: true }, { a: true }), true)
  assert.equal(answerMatches({ questionId: 'a', op: 'neq', value: 'x' }, { a: 'y' }), true)
  assert.equal(answerMatches({ questionId: 'a', op: 'truthy' }, { a: '1' }), true)
  assert.equal(answerMatches({ questionId: 'a', op: 'falsy' }, {}), true)
})

test('evaluateFieldLogic hide branch', () => {
  const questions = [
    { id: 'q1', texto: 'Op?', tipo: 'yesno', required: true, logic: [] },
    {
      id: 'q2',
      texto: 'Detalle',
      tipo: 'text',
      required: true,
      logic: [
        { when: { questionId: 'q1', op: 'eq', value: false }, action: 'show' },
        { when: { questionId: 'q1', op: 'eq', value: true }, action: 'hide' },
      ],
    },
  ]
  const hidden = evaluateFieldLogic(questions, { q1: true })
  assert.ok(hidden.visibleIds.has('q1'))
  assert.equal(hidden.visibleIds.has('q2'), false)

  const shown = evaluateFieldLogic(questions, { q1: false })
  assert.ok(shown.visibleIds.has('q2'))
})

test('normalizeAnswerValue multimedia and geopoint', () => {
  const mm = normalizeAnswerValue({ tipo: 'multimedia', texto: 'foto' }, { url: 'https://x/a.jpg', mime: 'image/jpeg' })
  assert.equal(mm.url, 'https://x/a.jpg')
  const gp = normalizeAnswerValue(
    { tipo: 'facility_checkin', texto: 'in' },
    { lat: -34.6, lng: -58.4, accuracy: 10 },
  )
  assert.equal(gp.kind, 'facility_checkin')
  assert.equal(gp.lat, -34.6)
})
