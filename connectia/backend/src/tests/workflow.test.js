import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSteps,
  validateWorkflowPayload,
  userMatchesStep,
  applyDecision,
  deepLinkForOrigin,
  isLastStep,
  stepConditionApplies,
  extractDaysRequested,
  findFirstApplicableStepIndex,
} from '../lib/workflowEngine.js'
import { matchExampleDraft, WORKFLOW_USE_CASE_EXAMPLES } from '../services/workflowAi.js'

describe('workflowEngine', () => {
  it('normalizeSteps renumber and defaults', () => {
    const s = normalizeSteps([{ nombre: 'A' }, { nombre: 'B', slaHoras: 24, approverType: 'role', approverValue: 'admin' }])
    assert.equal(s.length, 2)
    assert.equal(s[0].orden, 1)
    assert.equal(s[1].orden, 2)
    assert.equal(s[1].slaHoras, 24)
    assert.equal(s[1].approverType, 'role')
  })

  it('validateWorkflowPayload requires name and steps', () => {
    const bad = validateWorkflowPayload({ name: '', steps: [] })
    assert.equal(bad.ok, false)
    const good = validateWorkflowPayload({
      name: 'Vacaciones',
      steps: [{ nombre: 'Líder', approverType: 'capability', approverValue: 'admin.solicitudes' }],
    })
    assert.equal(good.ok, true)
    assert.equal(good.payload.steps.length, 1)
  })

  it('userMatchesStep by capability and role', () => {
    const user = { roles: ['member'], capabilities: ['admin.solicitudes'], _id: 'u1' }
    assert.equal(
      userMatchesStep(user, { approverType: 'capability', approverValue: 'admin.solicitudes' }),
      true,
    )
    assert.equal(
      userMatchesStep(user, { approverType: 'capability', approverValue: 'admin.documentos' }),
      false,
    )
    assert.equal(userMatchesStep({ roles: ['admin'] }, { approverType: 'capability', approverValue: 'x' }), true)
    assert.equal(
      userMatchesStep(
        { roles: ['member'], _id: 'u1' },
        { approverType: 'users', userIds: ['u1'] },
      ),
      true,
    )
  })

  it('applyDecision advances or closes', () => {
    const steps = [{ orden: 1 }, { orden: 2 }]
    const mid = applyDecision({ status: 'en_curso', stepIndex: 0, steps, decision: 'aprobar' })
    assert.equal(mid.status, 'en_curso')
    assert.equal(mid.stepIndex, 1)
    const done = applyDecision({ status: 'en_curso', stepIndex: 1, steps, decision: 'aprobar' })
    assert.equal(done.status, 'aprobado')
    const rej = applyDecision({ status: 'en_curso', stepIndex: 0, steps, decision: 'rechazar' })
    assert.equal(rej.status, 'rechazado')
    assert.equal(isLastStep(steps, 1), true)
  })

  it('stepConditionApplies days / critico / politica', () => {
    assert.equal(stepConditionApplies('', {}), true)
    assert.equal(
      stepConditionApplies('Solo si la solicitud supera 10 días', {
        campos: [{ key: 'dias', value: 15 }],
      }),
      true,
    )
    assert.equal(
      stepConditionApplies('Solo si la solicitud supera 10 días', {
        campos: [{ key: 'dias', value: 5 }],
      }),
      false,
    )
    assert.equal(
      stepConditionApplies('Solo si supera 10 días', {
        campos: [
          { key: 'desde', value: '2026-01-01' },
          { key: 'hasta', value: '2026-01-20' },
        ],
      }),
      true,
    )
    assert.equal(
      stepConditionApplies('Solo si el sistema es crítico', {
        campos: [{ key: 'prioridad', value: 'Alta' }],
      }),
      true,
    )
    assert.equal(
      stepConditionApplies('Solo si el sistema es crítico', {
        campos: [{ key: 'prioridad', value: 'Baja' }],
      }),
      false,
    )
    assert.equal(
      stepConditionApplies('Solo si el documento es una política', { category: 'políticas' }),
      true,
    )
    assert.equal(
      stepConditionApplies('Solo si el documento es una política', { category: 'general' }),
      false,
    )
    assert.equal(extractDaysRequested({ dias: 12 }), 12)
  })

  it('applyDecision skips conditional steps that do not apply', () => {
    const steps = [
      { orden: 1, nombre: 'Líder', condition: '' },
      { orden: 2, nombre: 'RRHH', condition: 'Solo si supera 10 días' },
      { orden: 3, nombre: 'Cierre', condition: '' },
    ]
    const skip = applyDecision({
      status: 'en_curso',
      stepIndex: 0,
      steps,
      decision: 'aprobar',
      context: { campos: [{ key: 'dias', value: 3 }] },
    })
    assert.equal(skip.stepIndex, 2)
    assert.equal(skip.skipped.length, 1)
    assert.equal(skip.skipped[0].step.nombre, 'RRHH')

    const take = applyDecision({
      status: 'en_curso',
      stepIndex: 0,
      steps,
      decision: 'aprobar',
      context: { campos: [{ key: 'dias', value: 12 }] },
    })
    assert.equal(take.stepIndex, 1)
    assert.equal(take.skipped.length, 0)
  })

  it('findFirstApplicableStepIndex', () => {
    const steps = [{ condition: 'Solo si supera 10 días' }, { condition: '' }]
    assert.equal(findFirstApplicableStepIndex(steps, { campos: { dias: 2 } }), 1)
    assert.equal(findFirstApplicableStepIndex(steps, { campos: { dias: 20 } }), 0)
  })

  it('deepLinkForOrigin', () => {
    assert.equal(deepLinkForOrigin({ module: 'solicitudes', refId: 'abc' }), '/solicitudes/abc')
    assert.equal(deepLinkForOrigin({ module: 'documentos', refId: 'x' }), '/docs')
    assert.equal(deepLinkForOrigin({ module: 'licencias', refId: 'l1' }), '/licencias/l1')
    assert.equal(deepLinkForOrigin({ module: 'ausentismos', refId: 'a1' }), '/ausencias/a1')
  })
})

describe('workflowAi examples', () => {
  it('exposes 3 canonical use cases', () => {
    assert.equal(WORKFLOW_USE_CASE_EXAMPLES.length, 3)
    assert.ok(WORKFLOW_USE_CASE_EXAMPLES.every((e) => e.prompt && e.draft?.steps?.length))
  })

  it('matchExampleDraft for vacaciones prompt', () => {
    const d = matchExampleDraft(WORKFLOW_USE_CASE_EXAMPLES[0].prompt)
    assert.ok(d)
    assert.equal(d.name, 'Vacaciones estándar')
    assert.equal(d.source, 'example')
  })

  it('matchExampleDraft for acceso keywords', () => {
    const d = matchExampleDraft('Necesito un flujo de acceso a VPN y ERP con seguridad')
    assert.ok(d)
    assert.match(d.name, /Acceso/i)
  })
})
