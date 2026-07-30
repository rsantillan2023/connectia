import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPointsIdempotencyKey,
  startOfUtcDay,
  DEFAULT_POINTS_RULES,
  POINTS_EVENTS,
  POINTS_EVENT_LABELS,
  serializePointsRule,
} from '../lib/pointsRules.js'

describe('pointsRules helpers', () => {
  it('idempotency key estable', () => {
    assert.equal(
      buildPointsIdempotencyKey('post_created', 'u1', 'p1'),
      'points:post_created:u1:p1',
    )
  })

  it('startOfUtcDay a medianoche UTC', () => {
    const d = startOfUtcDay(new Date('2026-07-28T15:30:00Z'))
    assert.equal(d.toISOString(), '2026-07-28T00:00:00.000Z')
  })

  it('defaults cubren eventos de engagement (no external_credit)', () => {
    const engagement = POINTS_EVENTS.filter((e) => e !== 'external_credit')
    assert.equal(DEFAULT_POINTS_RULES.length, engagement.length)
    for (const e of engagement) {
      assert.ok(POINTS_EVENT_LABELS[e])
      assert.ok(DEFAULT_POINTS_RULES.some((r) => r.event === e && r.points > 0))
    }
    assert.ok(POINTS_EVENT_LABELS.external_credit)
  })

  it('serializePointsRule', () => {
    const s = serializePointsRule({
      _id: '507f1f77bcf86cd799439011',
      event: 'comment_created',
      label: '',
      points: 5,
      dailyCap: 20,
      enabled: true,
    })
    assert.equal(s.eventLabel, 'Comentar')
    assert.equal(s.points, 5)
    assert.equal(s.dailyCap, 20)
  })
})
