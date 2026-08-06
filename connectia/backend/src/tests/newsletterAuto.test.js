import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  postMatchesRuleAudience,
  selectPostsForRule,
  computeNextRunAt,
} from '../lib/newsletterAuto.js'

const AREA_A = '507f1f77bcf86cd799439011'
const AREA_B = '507f1f77bcf86cd799439012'

describe('newsletterAuto lib', () => {
  it('postMatchesRuleAudience: all/none siempre resuelven directo', () => {
    assert.equal(postMatchesRuleAudience({ audience: { mode: 'restricted', areaIds: [AREA_B] } }, { mode: 'all' }), true)
    assert.equal(postMatchesRuleAudience({ audience: { mode: 'all' } }, { mode: 'none' }), false)
    assert.equal(postMatchesRuleAudience({ audience: { mode: 'all' } }, { mode: 'restricted', areaIds: [AREA_A] }), true)
  })

  it('postMatchesRuleAudience: restricted matchea por overlap laxo de ids', () => {
    const rule = { mode: 'restricted', areaIds: [AREA_A], groupIds: [], userIds: [] }
    assert.equal(
      postMatchesRuleAudience({ audience: { mode: 'restricted', areaIds: [AREA_A] } }, rule),
      true,
    )
    assert.equal(
      postMatchesRuleAudience({ audience: { mode: 'restricted', areaIds: [AREA_B] } }, rule),
      false,
    )
  })

  it('selectPostsForRule: latest ordena por publishedAt desc y corta a postCount', () => {
    const posts = [
      { _id: '1', pinned: false, publishedAt: new Date('2030-01-01') },
      { _id: '2', pinned: true, publishedAt: new Date('2030-01-03') },
      { _id: '3', pinned: false, publishedAt: new Date('2030-01-02') },
    ]
    const rule = { postCount: 2, selectMode: 'latest', audience: { mode: 'all' } }
    const out = selectPostsForRule(posts, rule)
    assert.deepEqual(out.map((p) => p._id), ['2', '3'])
  })

  it('selectPostsForRule: pinned_first prioriza pinned sobre fecha', () => {
    const posts = [
      { _id: '1', pinned: false, publishedAt: new Date('2030-01-03') },
      { _id: '2', pinned: true, publishedAt: new Date('2030-01-01') },
      { _id: '3', pinned: false, publishedAt: new Date('2030-01-02') },
    ]
    const rule = { postCount: 2, selectMode: 'pinned_first', audience: { mode: 'all' } }
    const out = selectPostsForRule(posts, rule)
    assert.deepEqual(out.map((p) => p._id), ['2', '1'])
  })

  it('selectPostsForRule: filtra por audiencia cuando la regla no es "all"', () => {
    const posts = [
      { _id: '1', publishedAt: new Date('2030-01-01'), audience: { mode: 'restricted', areaIds: [AREA_A] } },
      { _id: '2', publishedAt: new Date('2030-01-02'), audience: { mode: 'restricted', areaIds: [AREA_B] } },
      { _id: '3', publishedAt: new Date('2030-01-03'), audience: { mode: 'all' } },
    ]
    const rule = { postCount: 5, selectMode: 'latest', audience: { mode: 'restricted', areaIds: [AREA_A] } }
    const out = selectPostsForRule(posts, rule)
    assert.deepEqual(out.map((p) => p._id).sort(), ['1', '3'].sort())
  })

  it('computeNextRunAt suma intervalHours a la fecha dada', () => {
    const now = new Date('2030-01-01T00:00:00.000Z')
    const next = computeNextRunAt({ intervalHours: 6 }, now)
    assert.equal(next.toISOString(), '2030-01-01T06:00:00.000Z')
    const fallback = computeNextRunAt({}, now)
    assert.equal(fallback.toISOString(), '2030-01-02T00:00:00.000Z')
  })
})
