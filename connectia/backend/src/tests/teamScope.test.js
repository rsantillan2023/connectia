/**
 * Tests Ola 32 — TeamScope helpers.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTeamSource,
  audienceFromMemberIds,
  forceTeamAudience,
  assertMemberInScope,
  moduleAllowed,
} from '../lib/teamScope.js'

describe('teamScope helpers', () => {
  it('normalizeTeamSource dedupe ids', () => {
    const s = normalizeTeamSource({
      areaIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'],
      userIds: ['bad', '507f1f77bcf86cd799439012'],
    })
    assert.equal(s.areaIds.length, 1)
    assert.equal(s.userIds.length, 1)
  })

  it('forceTeamAudience rechaza vacío', () => {
    assert.equal(forceTeamAudience([]).ok, false)
    const ok = forceTeamAudience(['507f1f77bcf86cd799439011'])
    assert.equal(ok.ok, true)
    assert.equal(ok.audience.mode, 'users')
  })

  it('audienceFromMemberIds mode users', () => {
    const a = audienceFromMemberIds(['507f1f77bcf86cd799439011'])
    assert.equal(a.mode, 'users')
    assert.equal(a.userIds.length, 1)
  })

  it('assertMemberInScope', () => {
    assert.equal(
      assertMemberInScope({ memberIds: ['507f1f77bcf86cd799439011'] }, '507f1f77bcf86cd799439011'),
      true,
    )
    assert.equal(assertMemberInScope({ memberIds: [] }, '507f1f77bcf86cd799439011'), false)
  })

  it('moduleAllowed con solo cap base', () => {
    const scope = { allowedModules: ['muro', 'eventos', 'notif'] }
    assert.equal(moduleAllowed(scope, 'muro', ['supervision.equipo']), true)
    assert.equal(moduleAllowed(scope, 'chat', ['supervision.equipo']), false)
  })

  it('forceTeamAudience nunca mode all', () => {
    const r = forceTeamAudience(['507f1f77bcf86cd799439011'])
    assert.notEqual(r.audience.mode, 'all')
  })
})
