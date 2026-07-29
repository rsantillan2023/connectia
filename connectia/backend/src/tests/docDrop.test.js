import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  compileNamePattern,
  matchFileName,
  extractMatchKey,
  applyTemplate,
  normalizeMatchValue,
  userMatchesKey,
} from '../lib/docDropPattern.js'
import {
  normalizeDocsDropConfig,
  validateDocsDropConfig,
  mergeDocsDropConfig,
} from '../lib/docsDropConfig.js'
import { parseManifestPayload } from '../services/docDropSources.js'
import { testDropPattern } from '../services/docDropSync.js'

describe('docDropPattern', () => {
  it('compila tokens y coincide', () => {
    const c = compileNamePattern('{dni}_recibo_{periodo}.pdf')
    assert.equal(c.ok, true)
    assert.deepEqual(c.tokens, ['dni', 'periodo'])
    const m2 = matchFileName('30.111.222_recibo_202603.pdf', '{dni}_recibo_{periodo}.pdf')
    assert.equal(m2.ok, true)
    assert.equal(m2.captures.dni, '30.111.222')
    assert.equal(m2.captures.periodo, '202603')
  })

  it('rechaza no match', () => {
    const m = matchFileName('otro.pdf', '{dni}_recibo_{periodo}.pdf')
    assert.equal(m.ok, false)
  })

  it('extrae matchKey normalizando DNI', () => {
    const key = extractMatchKey(
      { dni: '30.111.222', periodo: '2026' },
      'dni',
      'dni',
      { stripNonDigits: true },
    )
    assert.equal(key, '30111222')
  })

  it('applyTemplate', () => {
    assert.equal(applyTemplate('Recibo {periodo}', { periodo: '202603' }), 'Recibo 202603')
  })

  it('userMatchesKey', () => {
    const u = { dni: '30-111-222' }
    assert.equal(userMatchesKey(u, 'dni', '30111222'), true)
    assert.equal(normalizeMatchValue('20-12345678-9', { stripNonDigits: true }), '20123456789')
  })
})

describe('docsDropConfig', () => {
  it('normalize defaults', () => {
    const c = normalizeDocsDropConfig({})
    assert.equal(c.enabled, false)
    assert.equal(c.source, 'url')
    assert.ok(c.namePattern.includes('{dni}'))
  })

  it('validate exige token en patrón', () => {
    const v = validateDocsDropConfig({
      enabled: false,
      namePattern: '{legajo}_doc.pdf',
      matchToken: 'dni',
      matchField: 'dni',
    })
    assert.equal(v.ok, false)
  })

  it('merge conserva apiKey enmascarada', () => {
    const prev = normalizeDocsDropConfig({
      gdrive: { apiKey: 'secret-key-1234', folderId: 'f1' },
    })
    const next = mergeDocsDropConfig(prev, {
      gdrive: { apiKey: '••••1234', folderId: 'f1' },
      enabled: true,
      source: 'gdrive',
      namePattern: '{dni}.pdf',
      matchToken: 'dni',
      matchField: 'dni',
      listUrl: '',
    })
    assert.equal(next.gdrive.apiKey, 'secret-key-1234')
  })
})

describe('docDropSources manifest', () => {
  it('parseManifestPayload acepta shapes', () => {
    const items = parseManifestPayload({
      items: [{ name: 'a.pdf', url: 'https://x/a.pdf' }],
    })
    assert.equal(items.length, 1)
    assert.equal(items[0].name, 'a.pdf')
  })
})

describe('testDropPattern', () => {
  it('arma titulo y key', () => {
    const r = testDropPattern(
      {
        namePattern: '{cuil}_liq_{mes}.pdf',
        matchToken: 'cuil',
        matchField: 'cuil',
        stripNonDigits: true,
        tituloTemplate: 'Liquidación {mes}',
      },
      '20-12345678-9_liq_marzo.pdf',
    )
    assert.equal(r.ok, true)
    assert.equal(r.matchKey, '20123456789')
    assert.equal(r.titulo, 'Liquidación marzo')
  })
})
