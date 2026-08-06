import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { categoryVisibleOnSurface, quickLinksForSurface } from '../lib/hubVisibility.js'

describe('categoryVisibleOnSurface', () => {
  it('oculta grupos inactivos en hub y muro', () => {
    assert.equal(categoryVisibleOnSurface({ activo: false, showOnMuro: true }, 'hub'), false)
    assert.equal(categoryVisibleOnSurface({ activo: false, showOnMuro: true }, 'muro'), false)
  })

  it('en hub muestra grupos activos aunque no vayan al muro', () => {
    assert.equal(categoryVisibleOnSurface({ activo: true, showOnMuro: false }, 'hub'), true)
  })

  it('en muro respeta showOnMuro', () => {
    assert.equal(categoryVisibleOnSurface({ activo: true, showOnMuro: false }, 'muro'), false)
    assert.equal(categoryVisibleOnSurface({ activo: true, showOnMuro: true }, 'muro'), true)
    assert.equal(categoryVisibleOnSurface({ activo: true }, 'muro'), true)
  })
})

describe('quickLinksForSurface', () => {
  const list = [
    { id: '1', titulo: 'A', featured: false },
    { id: '2', titulo: 'B', featured: true },
    { id: '3', titulo: 'C', featured: false },
    { id: '4', titulo: 'D', featured: true },
  ]

  it('en muro solo featured (sin fallback)', () => {
    const quick = quickLinksForSurface(list, 'muro', 3)
    assert.deepEqual(
      quick.map((l) => l.id),
      ['2', '4'],
    )
  })

  it('en muro sin featured → vacío', () => {
    const none = list.map((l) => ({ ...l, featured: false }))
    assert.deepEqual(quickLinksForSurface(none, 'muro', 3), [])
  })

  it('en hub sin featured → primeros del grupo', () => {
    const none = list.map((l) => ({ ...l, featured: false }))
    assert.deepEqual(
      quickLinksForSurface(none, 'hub', 3).map((l) => l.id),
      ['1', '2', '3'],
    )
  })

  it('en hub con featured → solo esos', () => {
    assert.deepEqual(
      quickLinksForSurface(list, 'hub', 3).map((l) => l.id),
      ['2', '4'],
    )
  })

  it('respeta order configurado (no el orden del array)', () => {
    const shuffled = [
      { id: 'z', titulo: 'Z', featured: true, order: 30 },
      { id: 'a', titulo: 'A', featured: true, order: 10 },
      { id: 'm', titulo: 'M', featured: true, order: 20 },
    ]
    assert.deepEqual(
      quickLinksForSurface(shuffled, 'muro', 10).map((l) => l.id),
      ['a', 'm', 'z'],
    )
  })
})
