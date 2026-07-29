import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPayQrPayload,
  parsePayQrPayload,
  normalizeCbu,
  normalizeAlias,
  newPayTokenValue,
} from '../models/WalletPay.js'

describe('wallet pay qr helpers', () => {
  it('payload roundtrip', () => {
    const token = newPayTokenValue()
    assert.equal(token.length, 32)
    const payload = buildPayQrPayload(token)
    assert.equal(parsePayQrPayload(payload), token)
    assert.equal(parsePayQrPayload('basura'), null)
  })

  it('normaliza cbu y alias', () => {
    assert.equal(normalizeCbu('1234-5678-9012-3456-7890-12'), '1234567890123456789012'.slice(0, 22))
    assert.equal(normalizeAlias(' Mi.Alias '), 'mi.alias')
  })
})
