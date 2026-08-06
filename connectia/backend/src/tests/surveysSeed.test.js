import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSurveysSeedCatalog } from '../lib/surveysSeed.js'
import { SURVEY_QUESTION_TYPES } from '../lib/surveyQuestions.js'
import { SURVEY_CATEGORIES } from '../lib/surveyCategories.js'

test('buildSurveysSeedCatalog cubre tipologías, categorías y estados', () => {
  const catalog = buildSurveysSeedCatalog()
  assert.ok(catalog.length >= 8)

  const externalIds = new Set(catalog.map((s) => s.externalId))
  assert.equal(externalIds.size, catalog.length, 'externalId únicos')

  const types = new Set()
  const statuses = new Set()
  const categories = new Set()
  const purposes = new Set()
  const flows = new Set()
  let hasAnon = false
  let hasCarousel = false
  let hasQuestionImage = false
  let hasNoProgress = false

  for (const s of catalog) {
    statuses.add(s.status)
    categories.add(s.categoria)
    purposes.add(s.purpose)
    flows.add(s.questionFlow)
    if (s.anonymous) hasAnon = true
    if (s.showProgress === false) hasNoProgress = true
    if ((s.imageUrls || []).length > 1) hasCarousel = true
    for (const q of s.questions || []) {
      types.add(q.tipo)
      if (q.imageUrl) hasQuestionImage = true
    }
  }

  for (const t of SURVEY_QUESTION_TYPES) {
    assert.ok(types.has(t), `falta tipo de pregunta ${t}`)
  }
  assert.ok(statuses.has('draft'))
  assert.ok(statuses.has('published'))
  assert.ok(statuses.has('closed'))
  assert.ok(purposes.has('onboarding'))
  assert.ok(purposes.has('offboarding'))
  assert.ok(flows.has('all'))
  assert.ok(flows.has('one_by_one'))
  assert.ok(hasAnon)
  assert.ok(hasCarousel)
  assert.ok(hasQuestionImage)
  assert.ok(hasNoProgress)

  const catIds = new Set(SURVEY_CATEGORIES.map((c) => c.id))
  for (const c of categories) {
    assert.ok(catIds.has(c), `categoría inválida ${c}`)
  }
})
