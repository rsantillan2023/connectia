import test from 'node:test'
import assert from 'node:assert/strict'
import { OLA27_MENU_ITEMS } from '../lib/ensureOla27Menu.js'

test('ensureOla27Menu incluye Mi desarrollo / Cultura U y Talento / Cultura A', () => {
  const keys = OLA27_MENU_ITEMS.map((i) => i.key)
  assert.ok(keys.includes('mi-desarrollo'))
  assert.ok(keys.includes('cultura'))
  assert.ok(keys.includes('admin.talento'))
  assert.ok(keys.includes('admin.cultura'))
  const uDev = OLA27_MENU_ITEMS.find((i) => i.key === 'mi-desarrollo')
  assert.equal(uDev.route, '/mi-desarrollo')
  assert.equal(uDev.channel, 'u')
  const aTal = OLA27_MENU_ITEMS.find((i) => i.key === 'admin.talento')
  assert.equal(aTal.route, '/talento')
  assert.equal(aTal.channel, 'a')
})
