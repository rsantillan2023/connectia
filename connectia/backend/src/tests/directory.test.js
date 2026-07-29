import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePhone,
  distanceKm,
  mapsUrl,
  telHref,
  waHref,
  serializeDirectoryEntry,
  applyDirectoryPatch,
  buildSearchFilter,
  isEntryVisibleNow,
} from '../lib/directory.js'
import { defaultDirectoryEntries } from '../lib/directorySeed.js'
import { heuristicDirectoryFromSearch } from '../services/directoryAi.js'

describe('directory helpers', () => {
  it('normalizePhone limpia', () => {
    assert.equal(normalizePhone('+54 11 4555-0100'), '+541145550100')
  })

  it('distanceKm aproxima CABA–Vicente López', () => {
    const km = distanceKm(-34.6037, -58.3816, -34.526, -58.475)
    assert.ok(km > 5 && km < 20)
  })

  it('hrefs accionables', () => {
    assert.equal(telHref('1145550100'), 'tel:1145550100')
    assert.ok(waHref('+5491145550100').includes('wa.me/'))
    assert.ok(mapsUrl({ lat: -34.6, lng: -58.3 }).includes('google.com/maps'))
  })

  it('serialize incluye actions y favorite', () => {
    const s = serializeDirectoryEntry(
      {
        _id: '507f1f77bcf86cd799439011',
        tipo: 'emergencia',
        nombre: 'Seguridad',
        telefono: '100',
        imageUrl: 'https://example.com/logo.png',
        audiencia: { mode: 'all' },
      },
      { favorite: true },
    )
    assert.equal(s.favorite, true)
    assert.equal(s.tipoLabel, 'Emergencias')
    assert.ok(s.actions.call)
    assert.equal(s.imageUrl, 'https://example.com/logo.png')
  })

  it('applyDirectoryPatch exige medio de contacto', () => {
    const doc = { nombre: '' }
    assert.throws(() => applyDirectoryPatch(doc, { nombre: 'X' }))
    applyDirectoryPatch(doc, { nombre: 'Recepción', telefono: '123' })
    assert.equal(doc.nombre, 'Recepción')
  })

  it('buildSearchFilter y vigencia', () => {
    assert.equal(buildSearchFilter('a'), null)
    assert.ok(buildSearchFilter('recep').$or.length > 3)
    assert.equal(isEntryVisibleNow({ activo: true }), true)
    assert.equal(isEntryVisibleNow({ activo: false }), false)
  })
})

describe('directory seed defaults', () => {
  it('al menos 4 entradas con marca e imagen', () => {
    const rows = defaultDirectoryEntries('Acme Demo')
    assert.ok(rows.length >= 4)
    assert.ok(rows.some((r) => r.tipo === 'emergencia'))
    assert.ok(rows.some((r) => /Acme Demo/.test(r.descripcion || '') || /Acme Demo/.test(r.nombre || '')))
    assert.ok(rows.every((r) => r.imageUrl && /^https?:\/\//.test(r.imageUrl)))
  })
})

describe('directoryAi heuristic', () => {
  it('detecta teléfono en prompt/snippets', () => {
    const drafts = heuristicDirectoryFromSearch(
      'teléfono atención 11 4555-9988',
      [{ title: 'Contacto', url: 'https://example.com', snippet: 'Llámanos al 11 4555-9988' }],
      'Acme',
    )
    assert.ok(drafts.length >= 1)
    assert.ok(drafts.some((d) => /4555/.test(d.telefono)))
  })

  it('detecta sedes por título', () => {
    const drafts = heuristicDirectoryFromSearch(
      'sucursales',
      [{ title: 'Sucursal Palermo', url: 'https://ex.com/p', snippet: 'Oficina abierta' }],
      '',
    )
    assert.ok(drafts.some((d) => d.tipo === 'sede'))
  })
})
