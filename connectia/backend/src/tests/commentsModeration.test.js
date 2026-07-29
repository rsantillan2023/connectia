import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeCommentText,
  validateCommentCreate,
  applySuggestionPatch,
  commentListFilter,
  rowsToCsv,
  mapSuggestedActionToStatus,
} from '../lib/commentPayload.js'
import {
  normalizeCommentsModeration,
  shouldAutoHide,
} from '../lib/commentsModeration.js'
import { heuristicCommentModeration } from '../services/commentModerationAi.js'

test('commentPayload sanitize y validate', () => {
  assert.equal(sanitizeCommentText('  hola  ').length, 4)
  assert.equal(validateCommentCreate({ texto: '' }).ok, false)
  assert.equal(validateCommentCreate({ texto: 'ok' }).ok, true)
  assert.equal(validateCommentCreate({ texto: '👍' }).ok, true)
  assert.equal(validateCommentCreate({ texto: 'hola', parentId: 'nope' }).ok, false)
})

test('applySuggestionPatch approve/hide/reply', () => {
  const base = {
    status: 'pending_review',
    adminReply: '',
    rejectionReason: '',
    moderationAi: { suggestedAction: 'approve', summary: 'ok', draftReply: 'Gracias' },
  }
  const a = applySuggestionPatch(base, 'approve')
  assert.equal(a.ok, true)
  assert.equal(a.status, 'visible')

  const h = applySuggestionPatch(base, 'hide')
  assert.equal(h.status, 'hidden')

  const r = applySuggestionPatch(base, 'reply', { adminReply: 'Te leemos' })
  assert.equal(r.status, 'visible')
  assert.equal(r.adminReply, 'Te leemos')

  // Sin adminReply usa draftReply de la IA
  const fromDraft = applySuggestionPatch(base, 'reply', { adminReply: '' })
  assert.equal(fromDraft.ok, true)
  assert.equal(fromDraft.adminReply, 'Gracias')

  const noDraft = applySuggestionPatch(
    { ...base, moderationAi: { suggestedAction: 'reply', summary: 'ok', draftReply: '' } },
    'reply',
    { adminReply: '' },
  )
  assert.equal(noDraft.ok, false)
})

test('mapSuggestedActionToStatus', () => {
  assert.equal(mapSuggestedActionToStatus('approve'), 'visible')
  assert.equal(mapSuggestedActionToStatus('hide'), 'hidden')
  assert.equal(mapSuggestedActionToStatus('review'), null)
})

test('commentListFilter defaults y riesgo', () => {
  const f = commentListFilter({})
  assert.deepEqual(f.status, { $ne: 'deleted' })
  const f2 = commentListFilter({ status: 'pending_review', risk: 'high', suggestionPending: true })
  assert.equal(f2.status, 'pending_review')
  assert.equal(f2['moderationAi.risk'], 'high')
  assert.equal(f2['moderationAi.status'], 'ready')
})

test('rowsToCsv escapa comillas', () => {
  const csv = rowsToCsv([{ a: 'x', b: 'dice "hola"' }])
  assert.ok(csv.includes('"dice ""hola"""'))
})

test('normalizeCommentsModeration y autoHide', () => {
  const c = normalizeCommentsModeration({ enabled: false, autoHideMinScore: 90, glossary: ['X', ''] })
  assert.equal(c.enabled, false)
  assert.equal(c.autoHideMinScore, 90)
  assert.deepEqual(c.glossary, ['x'])
  assert.equal(shouldAutoHide(c, 90), true)
  assert.equal(shouldAutoHide({ autoHideMinScore: 0 }, 99), false)
})

test('heuristicCommentModeration detecta grosería', () => {
  const bad = heuristicCommentModeration('qué mierda de aviso')
  assert.equal(bad.risk, 'high')
  assert.equal(bad.suggestedAction, 'hide')
  const ok = heuristicCommentModeration('Gracias por la información del evento de mañana')
  assert.equal(ok.risk, 'low')
  assert.equal(ok.suggestedAction, 'approve')
})
