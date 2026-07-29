import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeChatConfig,
  participantsKeyForDirect,
  parseAdjuntos,
  sanitizeMessageText,
  extractMentionTokens,
  previewFromMessage,
  validateDirectCreate,
  validateGroupCreate,
  validateSendMessage,
  isParticipant,
  unreadForUser,
} from '../lib/chatValidation.js'

describe('chatValidation', () => {
  it('participantsKeyForDirect es estable e independiente del orden', () => {
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaa'
    const b = 'bbbbbbbbbbbbbbbbbbbbbbbb'
    assert.equal(participantsKeyForDirect(a, b), participantsKeyForDirect(b, a))
    assert.equal(participantsKeyForDirect(a, a), '')
  })

  it('normalizeChatConfig aplica defaults y clamps', () => {
    const c = normalizeChatConfig({ retentionDays: 9999, maxGroupMembers: 1 })
    assert.equal(c.retentionDays, 3650)
    assert.equal(c.maxGroupMembers, 50)
    assert.equal(c.allowGroups, true)
  })

  it('parseAdjuntos filtra MIME y limita cantidad', () => {
    const out = parseAdjuntos(
      [
        { url: '/uploads/a.jpg', mimeType: 'image/jpeg', nombre: 'foto' },
        { url: 'http://evil.com/x', mimeType: 'image/jpeg' },
        { url: '/uploads/b.pdf', mimeType: 'application/pdf' },
        { url: '/uploads/c.exe', mimeType: 'application/x-msdownload' },
      ],
      { max: 5 },
    )
    assert.equal(out.length, 2)
    assert.equal(out[0].nombre, 'foto')
  })

  it('extractMentionTokens detecta @usuarios', () => {
    assert.deepEqual(extractMentionTokens('Hola @maria y @lucia-it'), ['maria', 'lucia-it'])
  })

  it('validateDirectCreate rechaza autochat', () => {
    const id = '507f1f77bcf86cd799439011'
    assert.equal(validateDirectCreate({ participantId: id, selfId: id }), 'No podés chatear con vos mismo')
    assert.equal(validateDirectCreate({ participantId: '507f1f77bcf86cd799439012', selfId: id }), null)
  })

  it('validateGroupCreate exige título y miembros', () => {
    const self = '507f1f77bcf86cd799439011'
    assert.ok(validateGroupCreate({ title: '', memberIds: [], selfId: self }))
    assert.equal(
      validateGroupCreate({
        title: 'Equipo',
        memberIds: ['507f1f77bcf86cd799439012'],
        selfId: self,
      }),
      null,
    )
  })

  it('validateSendMessage exige texto o adjunto', () => {
    assert.ok(validateSendMessage({ texto: '', adjuntos: [], allowAttachments: true }))
    assert.equal(validateSendMessage({ texto: 'hola', adjuntos: [], allowAttachments: true }), null)
    assert.ok(validateSendMessage({ texto: '', adjuntos: [{ url: '/x' }], allowAttachments: false }))
  })

  it('sanitizeMessageText y preview', () => {
    assert.equal(sanitizeMessageText('  hola  '), 'hola')
    assert.equal(previewFromMessage('', [{ nombre: 'doc.pdf' }]), '📎 doc.pdf')
  })

  it('isParticipant y unreadForUser', () => {
    const chat = {
      participantIds: ['a', 'b'],
      lastMessageAt: new Date('2026-01-02'),
      readBy: [{ userId: 'a', readAt: new Date('2026-01-01') }],
    }
    assert.equal(isParticipant(chat, 'a'), true)
    assert.equal(isParticipant(chat, 'c'), false)
    assert.equal(unreadForUser(chat, 'a'), true)
    assert.equal(unreadForUser({ ...chat, readBy: [{ userId: 'a', readAt: new Date('2026-01-03') }] }, 'a'), false)
  })
})
