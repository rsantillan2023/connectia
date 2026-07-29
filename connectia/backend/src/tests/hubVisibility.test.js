import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { categoryVisibleOnSurface } from '../lib/hubVisibility.js'

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
