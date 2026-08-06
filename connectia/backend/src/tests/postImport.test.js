import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePostImportFile,
  validatePostImportRow,
  buildPostImportTemplateCsv,
} from '../lib/postImport.js'

describe('postImport', () => {
  it('plantilla CSV incluye columnas clave', () => {
    const csv = buildPostImportTemplateCsv()
    assert.match(csv, /titulo/)
    assert.match(csv, /isKnowledge/)
  })

  it('valida fila mínima ok', () => {
    const v = validatePostImportRow({
      titulo: 'Hola',
      cuerpo: 'Mundo',
      tipo: 'noticia',
      status: 'draft',
    })
    assert.equal(v.ok, true)
    assert.equal(v.data.titulo, 'Hola')
    assert.equal(v.data.isKnowledge, false)
  })

  it('rechaza sin título', () => {
    const v = validatePostImportRow({ tipo: 'aviso' })
    assert.equal(v.ok, false)
    assert.ok(v.errors.some((e) => /titulo/i.test(e)))
  })

  it('parsea CSV simple', () => {
    const csv = 'titulo,cuerpo,tipo,status\n"Nota","Texto","beneficio","published"\n'
    const parsed = parsePostImportFile(csv, 't.csv')
    assert.equal(parsed.items.length, 1)
    const v = validatePostImportRow(parsed.items[0])
    assert.equal(v.ok, true)
    assert.equal(v.data.tipo, 'beneficio')
    assert.equal(v.data.status, 'published')
  })
})
