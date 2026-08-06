import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { serializeSurvey, isSurveyOpen } from '../routes/surveys.js'
import { resolveSurveyMediaFields, serializeSurveyMedia } from '../lib/mediaUrl.js'

describe('survey media', () => {
  it('serializeSurvey incluye imageUrl / imageUrls / videoUrl', () => {
    const s = serializeSurvey(
      {
        _id: '507f1f77bcf86cd799439011',
        titulo: 'Pulse',
        descripcion: 'Desc',
        imageUrl: 'https://example.com/survey.jpg',
        imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
        videoUrl: 'https://example.com/clip.mp4',
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
    assert.deepEqual(s.imageUrls, ['https://example.com/a.jpg', 'https://example.com/b.jpg'])
    assert.equal(s.videoUrl, 'https://example.com/clip.mp4')
    assert.equal(s.titulo, 'Pulse')
  })

  it('serializeSurvey default media vacío', () => {
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
    assert.deepEqual(s.imageUrls, [])
    assert.equal(s.videoUrl, '')
  })

  it('resolveSurveyMediaFields: carrusel + video', () => {
    const m = resolveSurveyMediaFields({
      imageUrls: [' /a.jpg ', ' /b.jpg '],
      videoUrl: ' /v.mp4 ',
    })
    assert.equal(m.imageUrl, '/a.jpg')
    assert.deepEqual(m.imageUrls, ['/a.jpg', '/b.jpg'])
    assert.equal(m.videoUrl, '/v.mp4')
  })

  it('resolveSurveyMediaFields: una sola imagen no deja imageUrls', () => {
    const m = resolveSurveyMediaFields({ imageUrls: ['/solo.jpg'] })
    assert.equal(m.imageUrl, '/solo.jpg')
    assert.deepEqual(m.imageUrls, [])
    assert.equal(m.videoUrl, '')
  })

  it('serializeSurveyMedia normaliza localhost', () => {
    const m = serializeSurveyMedia({
      imageUrl: 'http://localhost:4000/uploads/a.jpg',
      imageUrls: [
        'http://localhost:4000/uploads/a.jpg',
        'http://localhost:4000/uploads/b.jpg',
      ],
      videoUrl: 'http://localhost:4000/uploads/v.mp4',
    })
    assert.equal(m.imageUrl, '/uploads/a.jpg')
    assert.deepEqual(m.imageUrls, ['/uploads/a.jpg', '/uploads/b.jpg'])
    assert.equal(m.videoUrl, '/uploads/v.mp4')
  })

  it('isSurveyOpen respeta published', () => {
    assert.equal(isSurveyOpen({ status: 'draft' }), false)
    assert.equal(isSurveyOpen({ status: 'published' }), true)
  })

  it('serializeSurvey incluye imageUrl opcional por pregunta', () => {
    const s = serializeSurvey({
      _id: '507f1f77bcf86cd799439013',
      titulo: 'Con imagen',
      status: 'published',
      audience: { mode: 'all' },
      questions: [
        {
          id: 'q1',
          texto: '¿Qué ves?',
          tipo: 'text',
          required: true,
          opciones: [],
          grupo: 'G',
          imageUrl: 'http://localhost:4000/uploads/q.jpg',
        },
        {
          id: 'q2',
          texto: 'Sin foto',
          tipo: 'yesno',
          required: false,
          opciones: [],
          grupo: 'G',
        },
      ],
    })
    assert.equal(s.questions[0].imageUrl, '/uploads/q.jpg')
    assert.equal(s.questions[1].imageUrl, '')
  })

  it('serializeSurvey incluye questionFlow y showProgress', () => {
    const s = serializeSurvey({
      _id: '507f1f77bcf86cd799439014',
      titulo: 'Paso a paso',
      status: 'published',
      audience: { mode: 'all' },
      questions: [],
      questionFlow: 'one_by_one',
      showProgress: false,
      anonymous: false,
    })
    assert.equal(s.questionFlow, 'one_by_one')
    assert.equal(s.showProgress, false)

    const def = serializeSurvey({
      _id: '507f1f77bcf86cd799439015',
      titulo: 'Default',
      status: 'published',
      audience: { mode: 'all' },
      questions: [],
    })
    assert.equal(def.questionFlow, 'all')
    assert.equal(def.showProgress, true)
  })
})
