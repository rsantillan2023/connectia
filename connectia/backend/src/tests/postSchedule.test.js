import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseScheduledAt,
  validatePostSchedule,
  resolvePublishTiming,
  scheduleConflictWindow,
  classifyScheduleConflict,
} from '../lib/postSchedule.js'

describe('postSchedule', () => {
  it('parseScheduledAt acepta ISO y Date', () => {
    const d = parseScheduledAt('2030-01-15T12:00:00.000Z')
    assert.ok(d instanceof Date)
    assert.equal(d.toISOString(), '2030-01-15T12:00:00.000Z')
    assert.ok(parseScheduledAt(new Date('2030-06-01')) instanceof Date)
    assert.equal(parseScheduledAt('no-es-fecha'), null)
    assert.equal(parseScheduledAt(null), null)
  })

  it('validatePostSchedule exige fecha futura si scheduled', () => {
    assert.equal(validatePostSchedule({ status: 'draft', scheduledAt: null }), null)
    assert.equal(
      validatePostSchedule({ status: 'scheduled', scheduledAt: null }),
      'Fecha de programación inválida',
    )
    assert.equal(
      validatePostSchedule({
        status: 'scheduled',
        scheduledAt: new Date(Date.now() - 120_000),
      }),
      'La fecha programada ya pasó',
    )
    assert.equal(
      validatePostSchedule({
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 3600_000),
      }),
      null,
    )
  })

  it('resolvePublishTiming programa y limpia al publicar ahora', () => {
    const when = new Date(Date.now() + 86400_000)
    const scheduled = resolvePublishTiming({
      status: 'scheduled',
      scheduledAtRaw: when.toISOString(),
    })
    assert.equal(scheduled.error, null)
    assert.equal(scheduled.status, 'scheduled')
    assert.ok(scheduled.scheduledAt instanceof Date)
    assert.equal(scheduled.publishedAt, null)

    const now = new Date('2030-01-01T10:00:00.000Z')
    const published = resolvePublishTiming({
      status: 'published',
      scheduledAtRaw: when.toISOString(),
      prevStatus: 'scheduled',
      prevScheduledAt: when,
      now,
    })
    assert.equal(published.status, 'published')
    assert.equal(published.scheduledAt, null)
    assert.equal(published.publishedAt.toISOString(), now.toISOString())
  })

  it('resolvePublishTiming rechaza fecha pasada', () => {
    const bad = resolvePublishTiming({
      status: 'scheduled',
      scheduledAtRaw: new Date(Date.now() - 120_000).toISOString(),
    })
    assert.equal(bad.error, 'La fecha programada ya pasó')
  })

  it('scheduleConflictWindow y classifyScheduleConflict', () => {
    const center = new Date('2030-06-15T12:00:00.000Z')
    const win = scheduleConflictWindow(center, { windowMinutes: 60 })
    assert.ok(win)
    assert.equal(win.windowMinutes, 60)
    assert.equal(classifyScheduleConflict(new Date('2030-06-15T12:30:00.000Z'), center, 60), 'near')
    assert.equal(classifyScheduleConflict(new Date('2030-06-15T18:00:00.000Z'), center, 60), 'sameDay')
  })
})
