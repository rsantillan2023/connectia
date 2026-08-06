import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectDocPreviewKind,
  isPublicHttpUrl,
  officeEmbedUrlFor,
} from '../../../admin/src/utils/docPreview.js'

describe('docPreview kinds', () => {
  it('pdf / image / text / csv / office / other', () => {
    assert.equal(detectDocPreviewKind({ fileName: 'a.pdf', fileType: 'pdf' }), 'pdf')
    assert.equal(detectDocPreviewKind({ fileName: 'foto.png', mimeType: 'image/png' }), 'image')
    assert.equal(detectDocPreviewKind({ fileName: 'nota.txt', fileType: 'text' }), 'text')
    assert.equal(detectDocPreviewKind({ fileName: 'datos.csv', fileType: 'excel' }), 'csv')
    assert.equal(detectDocPreviewKind({ fileName: 'informe.docx', fileType: 'word' }), 'office')
    assert.equal(detectDocPreviewKind({ fileName: 'plan.xlsx', fileType: 'excel' }), 'office')
    assert.equal(detectDocPreviewKind({ fileName: 'deck.pptx', fileType: 'powerpoint' }), 'office')
    assert.equal(detectDocPreviewKind({ fileName: 'x.bin', fileType: 'other' }), 'other')
  })

  it('docx con MIME zip se trata como office (no zip)', () => {
    assert.equal(
      detectDocPreviewKind({
        fileName: 'contrato.docx',
        mimeType: 'application/zip',
        fileType: 'other',
      }),
      'office',
    )
  })

  it('office embed solo con URL pública', () => {
    assert.equal(isPublicHttpUrl('http://localhost:4000/uploads/a.docx'), false)
    assert.equal(isPublicHttpUrl('https://cdn.ejemplo.com/docs/a.docx'), true)
    assert.equal(officeEmbedUrlFor('http://127.0.0.1/uploads/a.docx'), '')
    assert.match(
      officeEmbedUrlFor('https://cdn.ejemplo.com/docs/a.docx'),
      /view\.officeapps\.live\.com/,
    )
  })
})
