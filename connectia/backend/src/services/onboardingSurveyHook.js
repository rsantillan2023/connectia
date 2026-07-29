import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { completeSurveyMilestonesOnDoc } from '../lib/onboarding.js'

export async function closeOnboardingMilestonesForSurvey({
  tenantId,
  userId,
  surveyId,
  actorId,
  actorName,
}) {
  const sid = String(surveyId)
  const instances = await OnboardingInstance.find({
    tenantId,
    userId,
    status: { $in: ['pending', 'in_progress'] },
  })
  let updated = 0
  for (const inst of instances) {
    const has = (inst.milestones || []).some(
      (m) => m.tipo === 'survey' && m.surveyId && String(m.surveyId) === sid,
    )
    if (!has) continue
    const result = completeSurveyMilestonesOnDoc(inst, sid, { actorId, actorName })
    if (result.changed) {
      await inst.save()
      updated += 1
    }
  }
  return { updated }
}

/** Si el usuario ya respondió la encuesta, cierra hitos pendientes (idempotente). */
export async function syncSurveyMilestonesForUser({ tenantId, userId }) {
  const instances = await OnboardingInstance.find({
    tenantId,
    userId,
    status: { $in: ['pending', 'in_progress'] },
  })
  let updated = 0
  for (const inst of instances) {
    const surveyIds = [
      ...new Set(
        (inst.milestones || [])
          .filter((m) => m.tipo === 'survey' && m.surveyId && m.status !== 'done' && m.status !== 'skipped')
          .map((m) => String(m.surveyId)),
      ),
    ]
    if (!surveyIds.length) continue
    const answered = await SurveyResponse.find({
      tenantId,
      userId,
      surveyId: { $in: surveyIds },
    })
      .select('surveyId')
      .lean()
    let changed = false
    for (const r of answered) {
      const result = completeSurveyMilestonesOnDoc(inst, r.surveyId, {
        actorId: userId,
        actorName: '',
      })
      if (result.changed) changed = true
    }
    if (changed) {
      await inst.save()
      updated += 1
    }
  }
  return { updated }
}
