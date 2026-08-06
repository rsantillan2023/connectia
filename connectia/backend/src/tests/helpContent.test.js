import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ackCoversVersion,
  buildKbDocument,
  bumpPolicyVersion,
  complianceStats,
  deepLinkFor,
  helpSearchClause,
  normalizeKeywords,
  normalizeTutorialSteps,
  validatePolicyAck,
} from '../lib/helpContent.js'

describe('helpContent deepLinkFor', () => {
  it('arma rutas de deep link', () => {
    assert.equal(deepLinkFor('faq', 'abc'), '/ayuda/faq/abc')
    assert.equal(deepLinkFor('tutorial', 't1'), '/ayuda/tutorial/t1')
    assert.equal(deepLinkFor('policy', 'p1'), '/politicas/p1')
    assert.equal(deepLinkFor('document', 'd1'), '/docs')
  })
})

describe('helpContent normalize', () => {
  it('normaliza keywords desde string o array', () => {
    assert.deepEqual(normalizeKeywords('Vacaciones, RRHH; permiso'), ['vacaciones', 'rrhh', 'permiso'])
    assert.deepEqual(normalizeKeywords(['A', 'a', 'B']), ['a', 'b'])
  })

  it('normaliza pasos de tutorial', () => {
    const steps = normalizeTutorialSteps([
      { titulo: 'Paso 1', cuerpo: 'Abrí el menú' },
      { titulo: '', cuerpo: '' },
      { texto: 'legacy', mediaUrl: 'https://x/y.png' },
    ])
    assert.equal(steps.length, 2)
    assert.equal(steps[0].titulo, 'Paso 1')
    assert.equal(steps[1].mediaType, 'image')
  })
})

describe('helpContent KB', () => {
  it('marca indexable solo si published', () => {
    const draft = buildKbDocument({
      kind: 'faq',
      doc: { _id: '1', tenantId: 't', pregunta: '¿Cómo?', respuesta: 'Así', status: 'draft' },
    })
    assert.equal(draft.indexable, false)
    assert.equal(draft.href, '/ayuda/faq/1')

    const pub = buildKbDocument({
      kind: 'faq',
      doc: {
        _id: '1',
        tenantId: 't',
        pregunta: '¿Cómo?',
        respuesta: 'Así',
        status: 'published',
        keywords: ['ayuda'],
      },
    })
    assert.equal(pub.indexable, true)
    assert.ok(pub.tags.includes('ayuda'))
  })

  it('arma cuerpo de tutorial y política', () => {
    const tut = buildKbDocument({
      kind: 'tutorial',
      doc: {
        _id: '2',
        titulo: 'Usar el muro',
        descripcion: 'Intro',
        status: 'published',
        steps: [{ titulo: 'Abrí', cuerpo: 'Tocá Publicaciones' }],
        moduloRelacionado: 'muro',
      },
    })
    assert.equal(tut.indexable, true)
    assert.match(tut.body, /Abrí/)
    assert.ok(tut.tags.includes('muro'))

    const pol = buildKbDocument({
      kind: 'policy',
      doc: { _id: '3', titulo: 'Código ética', cuerpo: 'Texto', version: '2', status: 'published', codigo: 'ETH' },
    })
    assert.equal(pol.version, '2')
    assert.equal(pol.href, '/politicas/3')

    const doc = buildKbDocument({
      kind: 'document',
      doc: {
        _id: '4',
        titulo: 'Manual interno',
        descripcion: 'Normas de oficina',
        category: 'rrhh',
        fileName: 'manual.pdf',
        fileUrl: '/uploads/manual.pdf',
        fileType: 'pdf',
        status: 'published',
      },
    })
    assert.equal(doc.indexable, true)
    assert.equal(doc.href, '/docs')
    assert.match(doc.body, /Normas/)
    assert.ok(doc.tags.includes('documento'))
  })
})

describe('helpContent policy ack', () => {
  it('exige opened y versión vigente', () => {
    assert.equal(validatePolicyAck({ opened: false, version: '1', currentVersion: '1' }).ok, false)
    assert.equal(
      validatePolicyAck({ opened: true, version: '1', currentVersion: '2' }).status,
      409,
    )
    assert.equal(
      validatePolicyAck({ opened: true, version: '1', currentVersion: '1', alreadyAcked: true }).status,
      409,
    )
    assert.equal(validatePolicyAck({ opened: true, version: '1', currentVersion: '1' }).ok, true)
  })

  it('ackCoversVersion respeta versión', () => {
    const acks = [
      { userId: 'u1', version: '1' },
      { userId: 'u1', version: '2' },
    ]
    assert.equal(ackCoversVersion(acks, 'u1', '2'), true)
    assert.equal(ackCoversVersion(acks, 'u1', '3'), false)
    assert.equal(ackCoversVersion(acks, 'u2', '2'), false)
  })

  it('bumpPolicyVersion incrementa', () => {
    assert.equal(bumpPolicyVersion('1'), '2')
    assert.equal(bumpPolicyVersion('1.0'), '2.0')
    assert.equal(bumpPolicyVersion('vA'), 'vA.1')
  })

  it('complianceStats calcula rate', () => {
    assert.deepEqual(complianceStats({ invited: 10, acked: 3 }), {
      invited: 10,
      acked: 3,
      pending: 7,
      rate: 30,
    })
  })
})

describe('helpContent search', () => {
  it('arma cláusula regex o null', () => {
    assert.equal(helpSearchClause('', ['titulo']), null)
    const c = helpSearchClause('vacaciones', ['pregunta', 'respuesta'])
    assert.ok(c.$or.length === 2)
  })
})
