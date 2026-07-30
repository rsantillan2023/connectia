import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  loadAdminProductKnowledge,
  searchAdminProductKnowledge,
  formatAdminProductKbAnswer,
  matchAdminEquivalencia,
  buildAdminProductContextForAi,
  getAdminProductKnowledgeMeta,
} from '../lib/connectiaAdminKnowledge.js'

describe('connectiaAdminKnowledge (JSON product KB)', () => {
  it('carga JSON con meta y articles', () => {
    const kb = loadAdminProductKnowledge()
    assert.ok(kb.meta?.version)
    assert.ok(Array.isArray(kb.articles) && kb.articles.length >= 5)
    const meta = getAdminProductKnowledgeMeta()
    assert.equal(meta.product, 'Connectyx Admin')
  })

  it('search encuentra usuarios y kb', () => {
    const users = searchAdminProductKnowledge('dónde gestiono usuarios', { limit: 3 })
    assert.ok(users.length)
    assert.match(users[0].titulo, /usuario/i)
    assert.equal(users[0].ruta, '/usuarios')

    const kb = searchAdminProductKnowledge('cómo edito la base de conocimientos', { limit: 3 })
    assert.ok(kb.length)
    assert.equal(kb[0].ruta, '/asistente-kb')
  })

  it('formatAdminProductKbAnswer cita fuente', () => {
    const hits = searchAdminProductKnowledge('publicaciones del muro')
    const ans = formatAdminProductKbAnswer(hits)
    assert.match(ans.text, /base de conocimientos del Admin/i)
    assert.ok(ans.sources.some((s) => s.kind === 'product_kb'))
    assert.ok(ans.links.some((l) => l.href === '/publicaciones'))
  })

  it('matchAdminEquivalencia', () => {
    const eq = matchAdminEquivalencia('quiero ir al dashboard')
    assert.equal(eq?.ruta, '/')
  })

  it('buildAdminProductContextForAi', () => {
    const ctx = buildAdminProductContextForAi('dónde está la bandeja de solicitudes')
    assert.ok(ctx.meta)
    assert.ok(ctx.hits.length)
    assert.ok(ctx.hits[0].cuerpo)
  })
})
