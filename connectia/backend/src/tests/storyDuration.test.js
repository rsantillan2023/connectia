import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_DURATION_DEFAULT,
  STORY_DURATION_MAX,
  STORY_DURATION_MIN,
  parseStoryDurationSec,
} from '../lib/storyDuration.js'

test('parseStoryDurationSec default y clamp', () => {
  assert.equal(parseStoryDurationSec(undefined), STORY_DURATION_DEFAULT)
  assert.equal(parseStoryDurationSec(null), STORY_DURATION_DEFAULT)
  assert.equal(parseStoryDurationSec(''), STORY_DURATION_DEFAULT)
  assert.equal(parseStoryDurationSec(7), 7)
  assert.equal(parseStoryDurationSec('12'), 12)
  assert.equal(parseStoryDurationSec(0), STORY_DURATION_MIN)
  assert.equal(parseStoryDurationSec(-3), STORY_DURATION_MIN)
  assert.equal(parseStoryDurationSec(999), STORY_DURATION_MAX)
  assert.equal(parseStoryDurationSec(4.6), 5)
})

test('parseStoryDurationSec respeta fallback válido', () => {
  assert.equal(parseStoryDurationSec(undefined, 8), 8)
  assert.equal(parseStoryDurationSec('x', 3), 3)
})
