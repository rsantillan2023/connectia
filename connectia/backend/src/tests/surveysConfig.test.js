import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSurveysConfig,
  normalizeSurveyCategoriesInput,
  normalizeEnabledQuestionTypes,
  resolveSurveyCategories,
  resolveEnabledQuestionTypes,
  normalizeSurveyCategoryForTenant,
} from '../lib/surveysConfig.js'
import { SURVEY_QUESTION_TYPES } from '../lib/surveyQuestions.js'

test('normalizeSurveyCategoriesInput asegura general y acepta nuevas', () => {
  const cats = normalizeSurveyCategoriesInput([
    { id: 'clima', label: 'Clima' },
    { label: 'Mi categoría' },
  ])
  assert.ok(cats.some((c) => c.id === 'general'))
  assert.ok(cats.some((c) => c.id === 'clima'))
  assert.ok(cats.some((c) => c.label === 'Mi categoría'))
})

test('normalizeEnabledQuestionTypes filtra inválidos y no deja vacío', () => {
  assert.deepEqual(normalizeEnabledQuestionTypes(['text', 'rating', 'nope']), ['text', 'rating'])
  assert.deepEqual(normalizeEnabledQuestionTypes([]), [...SURVEY_QUESTION_TYPES])
})

test('normalizeSurveysConfig + resolve usan tenant.surveysConfig', () => {
  const tenant = {
    surveysConfig: {
      categories: [{ id: 'nps', label: 'NPS' }],
      enabledQuestionTypes: ['yesno', 'rating'],
    },
  }
  const cfg = normalizeSurveysConfig(tenant.surveysConfig)
  assert.ok(cfg.categories.some((c) => c.id === 'general'))
  assert.deepEqual(resolveEnabledQuestionTypes(tenant), ['yesno', 'rating'])
  assert.equal(normalizeSurveyCategoryForTenant('nps', tenant), 'nps')
  assert.equal(normalizeSurveyCategoryForTenant('desconocida', tenant), 'general')
  assert.ok(resolveSurveyCategories(tenant).length >= 2)
})
