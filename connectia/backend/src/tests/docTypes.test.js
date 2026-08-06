import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferFileType,
  normalizeDocMime,
  normalizeFileType,
} from '../lib/docTypes.js'

describe('docTypes OOXML vs zip', () => {
  it('normalizeDocMime corrige zip/octet cuando la extensión es Office', () => {
    assert.equal(
      normalizeDocMime({
        mimeType: 'application/zip',
        fileName: 'informe.docx',
      }),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    assert.equal(
      normalizeDocMime({
        mimeType: 'application/x-zip-compressed',
        fileName: 'plan.xlsx',
      }),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    assert.equal(
      normalizeDocMime({
        mimeType: 'application/octet-stream',
        fileUrl: '/uploads/documents/deck.pptx',
      }),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
  })

  it('inferFileType prioriza extensión Office sobre MIME zip', () => {
    assert.equal(
      inferFileType({ mimeType: 'application/zip', fileName: 'a.docx' }),
      'word',
    )
    assert.equal(
      inferFileType({ mimeType: 'application/zip', fileName: 'a.xlsx' }),
      'excel',
    )
    assert.equal(
      inferFileType({ mimeType: 'application/zip', fileName: 'a.pptx' }),
      'powerpoint',
    )
  })

  it('normalizeFileType no deja other/zip si el nombre es .docx', () => {
    assert.equal(
      normalizeFileType('other', { mimeType: 'application/zip', fileName: 'x.docx' }),
      'word',
    )
    assert.equal(
      normalizeFileType('zip', { mimeType: 'application/zip', fileName: 'x.docx' }),
      'word',
    )
  })

  it('deja MIME zip real para .zip', () => {
    assert.equal(
      normalizeDocMime({ mimeType: 'application/zip', fileName: 'paquete.zip' }),
      'application/zip',
    )
  })
})
