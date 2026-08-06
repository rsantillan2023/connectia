import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  matchAdminModuleHint,
  remapHrefToAdmin,
  remapAssistantPayloadForAdmin,
  normalizeAssistantChannel,
} from '../lib/assistantAdminHints.js'
import { detectAssistantIntent } from '../lib/assistantIntent.js'
import { ADMIN_MODULE_HINTS } from '../lib/assistantAdminHints.js'

describe('assistantAdminHints', () => {
  it('normalizeAssistantChannel', () => {
    assert.equal(normalizeAssistantChannel('a'), 'a')
    assert.equal(normalizeAssistantChannel('A'), 'a')
    assert.equal(normalizeAssistantChannel('u'), 'u')
    assert.equal(normalizeAssistantChannel(null), 'u')
  })

  it('matchAdminModuleHint encuentra pantallas A', () => {
    assert.equal(matchAdminModuleHint('dónde están los usuarios')?.route, '/usuarios')
    assert.equal(matchAdminModuleHint('dónde está la base de conocimientos')?.route, '/asistente-kb')
    assert.equal(matchAdminModuleHint('dónde abro beneficios')?.route, '/beneficios')
  })

  it('detectAssistantIntent con hints admin', () => {
    const r = detectAssistantIntent('dónde están los usuarios', { moduleHints: ADMIN_MODULE_HINTS })
    assert.equal(r.intent, 'donde_modulo')
    assert.equal(r.entities.route, '/usuarios')
  })

  it('remapHrefToAdmin', () => {
    assert.equal(remapHrefToAdmin('/docs'), '/documentos')
    assert.equal(remapHrefToAdmin('/asistente'), '/asistente-kb')
    assert.equal(remapHrefToAdmin('/ausencias'), '/ausentismos')
    assert.equal(remapHrefToAdmin('/asistente-kb'), '/asistente-kb')
  })

  it('remapAssistantPayloadForAdmin', () => {
    const out = remapAssistantPayloadForAdmin({
      text: 'ok',
      links: [{ label: 'Docs', href: '/docs' }],
      sources: [{ titulo: 'Guía', href: '/asistente' }],
    })
    assert.equal(out.links[0].href, '/documentos')
    assert.equal(out.sources[0].href, '/asistente-kb')
  })
})
