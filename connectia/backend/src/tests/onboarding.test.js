import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcProgressPercent,
  unlockMilestones,
  completeMilestoneOnDoc,
  completeSurveyMilestonesOnDoc,
  normalizeMilestoneDefs,
  snapshotMilestonesFromTemplate,
  originKeyFor,
} from '../lib/onboarding.js'
import { defaultHrCatalogRows, serializeCatalogItem } from '../lib/hrCatalog.js'

describe('hrCatalog', () => {
  it('defaultHrCatalogRows incluye tipos clave AR', () => {
    const rows = defaultHrCatalogRows()
    assert.ok(rows.some((r) => r.tipo === 'pais' && r.codigo === 'AR'))
    assert.ok(rows.some((r) => r.tipo === 'parentesco'))
    assert.ok(rows.some((r) => r.tipo === 'banco'))
  })

  it('serializeCatalogItem', () => {
    const s = serializeCatalogItem({
      _id: '507f1f77bcf86cd799439011',
      tipo: 'genero',
      codigo: 'F',
      label: 'Femenino',
      orden: 1,
      activo: true,
    })
    assert.equal(s.codigo, 'F')
    assert.equal(s.label, 'Femenino')
  })
})

describe('onboarding engine', () => {
  it('calcProgressPercent solo cuenta obligatorios', () => {
    assert.equal(
      calcProgressPercent([
        { obligatorio: true, status: 'done' },
        { obligatorio: true, status: 'pending' },
        { obligatorio: false, status: 'pending' },
      ]),
      50,
    )
  })

  it('unlockMilestones bloquea por dependsOn', () => {
    const ms = unlockMilestones([
      { key: 'a', status: 'pending', dependsOn: [] },
      { key: 'b', status: 'pending', dependsOn: ['a'] },
    ])
    assert.equal(ms[0].status, 'pending')
    assert.equal(ms[1].status, 'locked')
  })

  it('normalizeMilestoneDefs exige surveyId en tipo survey', () => {
    assert.throws(
      () => normalizeMilestoneDefs([{ key: 's1', titulo: 'S', tipo: 'survey' }]),
      /surveyId/,
    )
  })

  it('completeMilestoneOnDoc avanza y completa', () => {
    const doc = {
      milestones: snapshotMilestonesFromTemplate({
        milestones: [
          { key: 'a', titulo: 'A', tipo: 'task', orden: 1, obligatorio: true },
          { key: 'b', titulo: 'B', tipo: 'task', orden: 2, dependsOn: ['a'], obligatorio: true },
        ],
      }),
      status: 'in_progress',
      history: [],
    }
    const r1 = completeMilestoneOnDoc(doc, 'a', { actorName: 'Test' })
    assert.equal(r1.already, false)
    assert.equal(doc.milestones.find((m) => m.key === 'b').status, 'pending')
    completeMilestoneOnDoc(doc, 'b', { actorName: 'Test' })
    assert.equal(doc.status, 'completed')
    assert.equal(doc.progressPercent, 100)
  })

  it('completeSurveyMilestonesOnDoc cierra hito survey', () => {
    const surveyId = '507f1f77bcf86cd799439099'
    const doc = {
      milestones: [
        {
          key: 'enc',
          titulo: 'Enc',
          tipo: 'survey',
          surveyId,
          status: 'pending',
          dependsOn: [],
          obligatorio: true,
        },
      ],
      status: 'in_progress',
      history: [],
    }
    const r = completeSurveyMilestonesOnDoc(doc, surveyId, { actorName: 'U' })
    assert.equal(r.changed, true)
    assert.equal(doc.milestones[0].status, 'done')
    assert.equal(doc.status, 'completed')
  })

  it('originKeyFor es estable', () => {
    assert.equal(
      originKeyFor({ userId: 'u1', kind: 'onboarding', templateId: 't1' }),
      'onboarding:t1:u1',
    )
  })
})
