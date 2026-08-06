/**
 * Config por comunidad de encuestas: categorías editables + tipos de pregunta habilitados.
 * Persistido en Tenant.surveysConfig (Mixed).
 */
import { SURVEY_CATEGORIES } from './surveyCategories.js'
import { SURVEY_QUESTION_TYPES, SURVEY_QUESTION_TYPE_META } from './surveyQuestions.js'

function slugCategoryId(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return base || 'categoria'
}

export function normalizeSurveyCategoriesInput(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    return SURVEY_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
  }
  const seen = new Set()
  const out = []
  for (const row of raw) {
    if (!row) continue
    let id = String(row.id || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 40)
    const label = String(row.label || '').trim().slice(0, 80)
    if (!label && !id) continue
    if (!id) id = slugCategoryId(label)
    let unique = id
    let n = 2
    while (seen.has(unique)) {
      unique = `${id}_${n++}`.slice(0, 40)
    }
    seen.add(unique)
    out.push({
      id: unique,
      label: label || unique.replace(/_/g, ' '),
    })
    if (out.length >= 40) break
  }
  if (!out.length) {
    return SURVEY_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
  }
  if (!out.some((c) => c.id === 'general')) {
    out.push({ id: 'general', label: 'General' })
  }
  return out
}

export function normalizeEnabledQuestionTypes(raw) {
  const allowed = new Set(SURVEY_QUESTION_TYPES)
  let list = []
  if (Array.isArray(raw)) {
    list = raw.map((t) => String(t || '').trim()).filter((t) => allowed.has(t))
  } else if (raw && typeof raw === 'object') {
    // { text: true, rating: false, ... }
    list = SURVEY_QUESTION_TYPES.filter((t) => raw[t] !== false)
  }
  if (!list.length) list = [...SURVEY_QUESTION_TYPES]
  // unique preserve order of SURVEY_QUESTION_TYPES
  return SURVEY_QUESTION_TYPES.filter((t) => list.includes(t))
}

/**
 * @param {unknown} raw
 * @returns {{ categories: Array<{id:string,label:string}>, enabledQuestionTypes: string[] }}
 */
export function normalizeSurveysConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    categories: normalizeSurveyCategoriesInput(src.categories),
    enabledQuestionTypes: normalizeEnabledQuestionTypes(src.enabledQuestionTypes ?? src.questionTypes),
  }
}

function configFromTenantOrConfig(tenantOrConfig) {
  if (!tenantOrConfig) return normalizeSurveysConfig(null)
  if (tenantOrConfig.surveysConfig != null) {
    return normalizeSurveysConfig(tenantOrConfig.surveysConfig)
  }
  return normalizeSurveysConfig(tenantOrConfig)
}

export function resolveSurveyCategories(tenantOrConfig) {
  return configFromTenantOrConfig(tenantOrConfig).categories.map((c) => ({ ...c }))
}

export function resolveEnabledQuestionTypes(tenantOrConfig) {
  return [...configFromTenantOrConfig(tenantOrConfig).enabledQuestionTypes]
}

export function resolveQuestionTypeMeta(tenantOrConfig, { includeDisabled = false } = {}) {
  const enabled = new Set(resolveEnabledQuestionTypes(tenantOrConfig))
  return SURVEY_QUESTION_TYPE_META.filter((t) => includeDisabled || enabled.has(t.id)).map((t) => ({
    ...t,
    enabled: enabled.has(t.id),
  }))
}

export function surveyCategoryLabel(id, tenantOrConfig) {
  const cats = resolveSurveyCategories(tenantOrConfig)
  const found = cats.find((c) => c.id === id)
  return found?.label || id || 'General'
}

/** Valida/normaliza categoría contra el catálogo del tenant (fallback general). */
export function normalizeSurveyCategoryForTenant(raw, tenantOrConfig) {
  const id = String(raw || '').trim().toLowerCase()
  const cats = resolveSurveyCategories(tenantOrConfig)
  if (cats.some((c) => c.id === id)) return id
  if (cats.some((c) => c.id === 'general')) return 'general'
  return cats[0]?.id || ''
}

export function isQuestionTypeEnabled(tipo, tenantOrConfig) {
  const id = String(tipo || '').trim()
  if (!SURVEY_QUESTION_TYPES.includes(id)) return false
  return resolveEnabledQuestionTypes(tenantOrConfig).includes(id)
}

export function surveysMeta(tenant) {
  const cfg = normalizeSurveysConfig(tenant?.surveysConfig)
  return {
    categories: cfg.categories,
    questionTypes: cfg.enabledQuestionTypes,
    questionTypeMeta: resolveQuestionTypeMeta(tenant),
    questionTypeMetaAll: resolveQuestionTypeMeta(tenant, { includeDisabled: true }),
    surveysConfig: cfg,
  }
}
