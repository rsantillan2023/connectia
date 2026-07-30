import test from 'node:test'
import assert from 'node:assert/strict'
import { serializePersonBrief, displayName } from '../lib/peopleSearch.js'
import { buildRecognitionPostHref } from '../lib/recognitionPublish.js'
import { tenantHasChat } from '../lib/marketplaceChat.js'
import { participantsKeyForDirect } from '../lib/chatValidation.js'

test('peopleSearch displayName y serialize', () => {
  assert.equal(displayName({ nombre: 'Ana', apellido: 'Paz', usuario: 'apaz' }), 'Ana Paz')
  assert.equal(displayName({ usuario: 'solo' }), 'solo')
  const brief = serializePersonBrief({
    _id: 'abc',
    nombre: 'Ana',
    apellido: 'Paz',
    usuario: 'apaz',
    email: 'a@b.c',
  })
  assert.equal(brief.id, 'abc')
  assert.equal(brief.displayName, 'Ana Paz')
  assert.equal(brief.email, 'a@b.c')
})

test('buildRecognitionPostHref', () => {
  assert.equal(buildRecognitionPostHref('xyz'), '/muro/xyz')
  assert.equal(buildRecognitionPostHref(null), '/cultura')
})

test('tenantHasChat', () => {
  assert.equal(tenantHasChat({ capabilities: ['chat'] }), true)
  assert.equal(tenantHasChat({ capabilities: ['muro'] }), false)
})

test('participantsKeyForDirect estable', () => {
  const a = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const b = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  assert.equal(participantsKeyForDirect(a, b), participantsKeyForDirect(b, a))
})
