import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { serializeSurvey, isSurveyOpen } from '../routes/surveys.js'

describe('survey imageUrl', () => {
  it('serializeSurvey incluye imageUrl', () => {
    const s = serializeSurvey(
      {
        _id: '507f1f77bcf86cd799439011',
        titulo: 'Pulse',
        descripcion: 'Desc',
        imageUrl: 'https://example.com/survey.jpg',
        status: 'published',
        version: 1,
        audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
        questions: [{ id: 'q1', texto: '¿Ok?', tipo: 'yesno', required: true, opciones: [], grupo: 'G' }],
        anonymous: false,
        purpose: 'general',
      },
      { includeQuestions: false },
    )
    assert.equal(s.imageUrl, 'https://example.com/survey.jpg')
    assert.equal(s.titulo, 'Pulse')
  })

  it('serializeSurvey default imageUrl vacío', () => {
    const s = serializeSurvey(
      {
        _id: '507f1f77bcf86cd799439012',
        titulo: 'Sin portada',
        status: 'published',
        questions: [],
        audience: { mode: 'all' },
      },
      { includeQuestions: false },
    )
    assert.equal(s.imageUrl, '')
  })

  it('isSurveyOpen respeta published', () => {
    assert.equal(isSurveyOpen({ status: 'draft' }), false)
    assert.equal(isSurveyOpen({ status: 'published' }), true)
  })
})
