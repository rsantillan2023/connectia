import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { OLA19_MENU_ITEMS } from '../lib/ensureOla19Menu.js'

describe('ensureOla19Menu', () => {
  it('incluye bienvenida U y onboarding/catálogos A', () => {
    const keys = OLA19_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('bienvenida'))
    assert.ok(keys.includes('mi-legajo'))
    assert.ok(keys.includes('admin.onboarding'))
    assert.ok(keys.includes('admin.hrcatalog'))
    assert.ok(keys.includes('admin.legajos'))
  })
})
