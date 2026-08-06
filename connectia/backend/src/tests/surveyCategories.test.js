import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SURVEY_CATEGORIES,
  normalizeSurveyCategory,
  surveyCategoryLabel,
} from '../lib/surveyCategories.js'

test('normalizeSurveyCategory acepta ids del catálogo', () => {
  assert.equal(normalizeSurveyCategory('clima'), 'clima')
  assert.equal(normalizeSurveyCategory(' NPS '), 'nps')
  assert.equal(normalizeSurveyCategory('desconocida'), '')
  assert.equal(normalizeSurveyCategory(''), '')
})

test('surveyCategoryLabel resuelve etiqueta', () => {
  assert.equal(surveyCategoryLabel('liderazgo'), 'Liderazgo')
  assert.equal(surveyCategoryLabel(''), '')
  assert.ok(SURVEY_CATEGORIES.some((c) => c.id === 'general'))
})
