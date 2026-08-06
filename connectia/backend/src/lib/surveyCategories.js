export const SURVEY_CATEGORIES = [
  { id: 'clima', label: 'Clima laboral' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'liderazgo', label: 'Liderazgo' },
  { id: 'comunicacion', label: 'Comunicación' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'capacitacion', label: 'Capacitación' },
  { id: 'nps', label: 'NPS / recomendación' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'general', label: 'General' },
  { id: 'otros', label: 'Otros' },
]

const IDS = new Set(SURVEY_CATEGORIES.map((c) => c.id))

export function normalizeSurveyCategory(raw) {
  const id = String(raw || '').trim().toLowerCase()
  return IDS.has(id) ? id : ''
}

export function surveyCategoryLabel(raw) {
  const id = normalizeSurveyCategory(raw)
  if (!id) return ''
  return SURVEY_CATEGORIES.find((c) => c.id === id)?.label || id
}
