import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { defaultStories } from '../lib/storiesSeed.js'

describe('storiesSeed defaultStories', () => {
  it('arcor, demo y default traen audioUrl en cada story', () => {
    for (const variant of ['arcor', 'demo', 'default']) {
      const rows = defaultStories('Acme', { variant })
      assert.ok(rows.length >= 3, variant)
      for (const row of rows) {
        assert.ok(row.mediaUrl, `${variant}:${row.titulo} media`)
        assert.match(String(row.audioUrl || ''), /\.mp3(\?|$)/i, `${variant}:${row.titulo} audio`)
      }
    }
  })

  it('default usa el brand en el título de bienvenida', () => {
    const rows = defaultStories('Nueva Co', { variant: 'default' })
    assert.equal(rows[0].titulo, 'Bienvenida a Nueva Co')
    assert.ok(rows[0].audioUrl)
  })
})
