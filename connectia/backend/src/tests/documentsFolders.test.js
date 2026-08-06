import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeFolderPath,
  buildChildFolders,
  sanitizeFolderSegment,
  joinFolderPath,
  isFolderMarker,
  folderMarkerExternalId,
  FOLDER_MARKER_SOURCE,
  FOLDER_MARKER_URL,
} from '../lib/documentsFolders.js'

describe('documentsFolders', () => {
  it('normalizeFolderPath limpia segmentos', () => {
    assert.equal(normalizeFolderPath(' RRHH / Recibos '), 'RRHH/Recibos')
    assert.equal(normalizeFolderPath('general'), 'general')
    assert.equal(normalizeFolderPath(''), '')
  })

  it('sanitizeFolderSegment y joinFolderPath', () => {
    assert.equal(sanitizeFolderSegment('  Recibos  '), 'Recibos')
    assert.equal(sanitizeFolderSegment('a/b'), 'a b')
    assert.equal(sanitizeFolderSegment('..'), '')
    assert.equal(joinFolderPath('RRHH', 'Recibos'), 'RRHH/Recibos')
    assert.equal(joinFolderPath('', 'TI'), 'TI')
    assert.equal(joinFolderPath('RRHH', '..'), null)
  })

  it('isFolderMarker reconoce marcadores', () => {
    assert.equal(isFolderMarker({ source: FOLDER_MARKER_SOURCE }), true)
    assert.equal(isFolderMarker({ fileUrl: FOLDER_MARKER_URL }), true)
    assert.equal(isFolderMarker({ source: 'manual', fileUrl: '/x.pdf' }), false)
    assert.equal(folderMarkerExternalId('RRHH/Recibos'), 'folder:RRHH/Recibos')
  })

  it('buildChildFolders en raíz agrupa primer nivel', () => {
    const docs = [
      { category: 'RRHH' },
      { category: 'RRHH/Recibos' },
      { category: 'RRHH/Contratos' },
      { category: 'TI' },
      { category: 'TI/VPN' },
    ]
    const folders = buildChildFolders(docs, '')
    assert.deepEqual(
      folders.map((f) => ({ id: f.id, count: f.count, subCount: f.subCount })),
      [
        { id: 'RRHH', count: 3, subCount: 2 },
        { id: 'TI', count: 2, subCount: 1 },
      ],
    )
  })

  it('buildChildFolders dentro de carpeta lista subcarpetas', () => {
    const docs = [
      { category: 'RRHH' },
      { category: 'RRHH/Recibos' },
      { category: 'RRHH/Recibos/2026' },
      { category: 'RRHH/Contratos' },
      { category: 'TI' },
    ]
    const folders = buildChildFolders(docs, 'RRHH')
    assert.deepEqual(
      folders.map((f) => ({ id: f.id, name: f.name, count: f.count, subCount: f.subCount })),
      [
        { id: 'RRHH/Contratos', name: 'Contratos', count: 1, subCount: 0 },
        { id: 'RRHH/Recibos', name: 'Recibos', count: 2, subCount: 1 },
      ],
    )
  })

  it('buildChildFolders incluye carpetas vacías (marcador) sin sumar archivos', () => {
    const docs = [
      { category: 'RRHH', source: 'manual' },
      { category: 'RRHH/Vacía', source: FOLDER_MARKER_SOURCE, fileUrl: FOLDER_MARKER_URL },
    ]
    const folders = buildChildFolders(docs, 'RRHH')
    assert.deepEqual(
      folders.map((f) => ({ id: f.id, name: f.name, count: f.count })),
      [{ id: 'RRHH/Vacía', name: 'Vacía', count: 0 }],
    )
  })
})
