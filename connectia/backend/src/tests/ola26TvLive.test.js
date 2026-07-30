import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generatePairingCode,
  generateDeviceCredential,
  hashDeviceCredential,
  isAllowedStreamUrl,
  resolveLiveEffectiveStatus,
  filterActivePlaylistItems,
  buildFeedManifest,
  tenantHasTvCap,
  tenantHasLiveCap,
  PAIRING_TTL_MS,
  PAIRING_MAX_ATTEMPTS,
} from '../lib/tvLive.js'
import { OLA26_MENU_ITEMS } from '../lib/ensureOla26Menu.js'

describe('tvLive helpers', () => {
  it('pairing code es 6 dígitos', () => {
    for (let i = 0; i < 20; i++) {
      const c = generatePairingCode()
      assert.match(c, /^\d{6}$/)
    }
  })

  it('credential hash es estable y distinto del token', () => {
    const token = generateDeviceCredential()
    const h1 = hashDeviceCredential(token)
    const h2 = hashDeviceCredential(token)
    assert.equal(h1, h2)
    assert.notEqual(h1, token)
    assert.equal(h1.length, 64)
  })

  it('TTL y intentos de pairing según ADR', () => {
    assert.equal(PAIRING_TTL_MS, 5 * 60 * 1000)
    assert.equal(PAIRING_MAX_ATTEMPTS, 5)
  })

  it('allowlist stream URL', () => {
    assert.equal(isAllowedStreamUrl('https://www.youtube.com/watch?v=abc123'), true)
    assert.equal(isAllowedStreamUrl('https://youtu.be/abc123'), true)
    assert.equal(isAllowedStreamUrl('https://vimeo.com/123'), true)
    assert.equal(isAllowedStreamUrl('https://cdn.example.com/live.m3u8'), true)
    assert.equal(isAllowedStreamUrl('https://evil.example/stream'), false)
    assert.equal(isAllowedStreamUrl('javascript:alert(1)'), false)
  })

  it('resolveLiveEffectiveStatus respeta horarios', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    assert.equal(
      resolveLiveEffectiveStatus(
        {
          status: 'scheduled',
          startsAt: new Date('2026-07-30T11:00:00Z'),
          endsAt: new Date('2026-07-30T13:00:00Z'),
        },
        now,
      ),
      'live',
    )
    assert.equal(
      resolveLiveEffectiveStatus(
        {
          status: 'live',
          endsAt: new Date('2026-07-30T11:00:00Z'),
        },
        now,
      ),
      'ended',
    )
    assert.equal(resolveLiveEffectiveStatus({ status: 'draft' }, now), 'draft')
  })

  it('filterActivePlaylistItems ordena y filtra vigencia', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const items = filterActivePlaylistItems(
      [
        { type: 'text', text: 'b', order: 2, activo: true },
        { type: 'text', text: 'a', order: 1, activo: true },
        { type: 'text', text: 'off', order: 0, activo: false },
        {
          type: 'text',
          text: 'future',
          order: 0,
          activo: true,
          startsAt: new Date('2026-07-31T00:00:00Z'),
        },
      ],
      now,
    )
    assert.deepEqual(
      items.map((i) => i.text),
      ['a', 'b'],
    )
  })

  it('buildFeedManifest incluye etag y salta ítems vacíos de playlist', () => {
    const manifest = buildFeedManifest(
      {
        _id: 'pl1',
        version: 3,
        items: [{ _id: 'i1', type: 'text', text: 'Hola', durationSec: 10, order: 0, activo: true }],
        fallbackText: 'Safe',
      },
      { _id: 'd1', mute: true, orientation: 'landscape' },
      { nombre: 'Demo' },
    )
    assert.equal(manifest.playlistVersion, 3)
    assert.equal(manifest.etag, '"tv-pl1-v3"')
    assert.equal(manifest.items.length, 1)
    assert.equal(manifest.brandName, 'Demo')
  })

  it('tenant caps', () => {
    assert.equal(tenantHasTvCap({ capabilities: ['tv.mode'] }), true)
    assert.equal(tenantHasTvCap({ capabilities: [] }), false)
    assert.equal(tenantHasLiveCap({ capabilities: ['live.stream'] }), true)
  })
})

describe('ensureOla26Menu', () => {
  it('incluye U emparejar/en-vivo y A modo-tv/live', () => {
    const keys = OLA26_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('tv-emparejar'))
    assert.ok(keys.includes('en-vivo'))
    assert.ok(keys.includes('admin.tv'))
    assert.ok(keys.includes('admin.live'))
  })
})
