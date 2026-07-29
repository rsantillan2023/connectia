import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeReactionKey,
  mergeReactionCounts,
  normalizeMyReaction,
} from '../lib/reactions.js'

describe('reactions', () => {
  it('like legacy → love', () => {
    assert.equal(normalizeReactionKey('like'), 'love')
    assert.equal(normalizeMyReaction('like'), 'love')
  })

  it('merge suma like dentro de love', () => {
    const m = mergeReactionCounts({ like: 2, love: 3, clap: 1 })
    assert.equal(m.love, 5)
    assert.equal(m.clap, 1)
    assert.equal(m.laugh, 0)
  })

  it('rechaza keys inválidas', () => {
    assert.equal(normalizeReactionKey('nope'), null)
  })
})
