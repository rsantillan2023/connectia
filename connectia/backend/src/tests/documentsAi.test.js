import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  heuristicDocumentDraft,
  documentsAiConfigured,
} from '../services/documentsAi.js'

describe('documentsAi heuristic', () => {
  it('arma título y carpeta desde nombre de recibo', () => {
    const d = heuristicDocumentDraft({
      fileName: '30111222_recibo_sueldo_202603.pdf',
      mimeType: 'application/pdf',
    })
    assert.equal(d.status, 'draft')
    assert.equal(d.fileType, 'pdf')
    assert.match(d.titulo, /Recibo/i)
    assert.equal(d.category, 'RRHH/Recibos')
    assert.equal(d.requiresSignature, true)
    assert.equal(d.source, 'heuristic')
  })

  it('detecta políticas y usa hint de carpeta actual', () => {
    const d = heuristicDocumentDraft({
      fileName: 'codigo_de_etica.docx',
      categoryHint: 'Políticas/Internas',
    })
    assert.equal(d.category, 'Políticas/Internas')
    assert.equal(d.fileType, 'word')
    assert.equal(d.requiresSignature, true)
  })

  it('sin señales → general y sin firma', () => {
    const d = heuristicDocumentDraft({ fileName: 'nota_interna.txt' })
    assert.equal(d.category, 'general')
    assert.equal(d.requiresSignature, false)
    assert.ok(d.titulo.includes('Nota'))
  })

  it('documentsAiConfigured es boolean', () => {
    assert.equal(typeof documentsAiConfigured(), 'boolean')
  })
})
