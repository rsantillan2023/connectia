import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMultifoldDocumentsSeed,
  DOC_SEED_FOLDERS,
  DOC_SEED_STATUSES,
  DOC_SEED_TYPES,
} from '../lib/documentsFoldersSeed.js'

describe('documentsFoldersSeed', () => {
  it('genera 2 docs por cada tipo × estado en carpetas anidadas', () => {
    const fakeId = { toString: () => 'tenant' }
    const docs = buildMultifoldDocumentsSeed({ tenantId: fakeId })
    assert.equal(docs.length, DOC_SEED_TYPES.length * DOC_SEED_STATUSES.length * 2)

    for (const type of DOC_SEED_TYPES) {
      for (const status of DOC_SEED_STATUSES) {
        const matches = docs.filter((d) => d.fileType === type && d.status === status)
        assert.equal(matches.length, 2, `${type}/${status}`)
      }
    }

    const folders = new Set(docs.map((d) => d.category))
    for (const f of DOC_SEED_FOLDERS) {
      assert.ok(folders.has(f), `falta carpeta ${f}`)
      assert.ok(f.includes('/'), `carpeta anidada ${f}`)
    }

    const ids = docs.map((d) => d.externalId)
    assert.equal(new Set(ids).size, ids.length)
  })
})
