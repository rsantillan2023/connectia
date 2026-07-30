import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAudience,
  usersFilterForAudience,
  serializeAudience,
} from '../lib/audience.js'
import {
  buildCampaignPayload,
  validateCampaignPayload,
  parseIdsCsv,
  rowsToCsv,
  sanitizeCampaignHref,
} from '../lib/pushCampaignPayload.js'
import { serializeCampaign } from '../services/notifyCampaign.js'

describe('audience', () => {
  it('normalizeAudience defaults to all', () => {
    assert.deepEqual(normalizeAudience(null), {
      mode: 'all',
      areaIds: [],
      groupIds: [],
      userIds: [],
      clientIds: [],
    })
  })

  it('normalizeAudience keeps users mode', () => {
    const a = normalizeAudience({ mode: 'users', userIds: ['507f1f77bcf86cd799439011'] })
    assert.equal(a.mode, 'users')
    assert.equal(a.userIds.length, 1)
  })

  it('usersFilterForAudience all returns tenant + activo', () => {
    const f = usersFilterForAudience('t1', { mode: 'all' })
    assert.equal(f.tenantId, 't1')
    assert.equal(f.activo, true)
    assert.equal(f._id, undefined)
  })

  it('usersFilterForAudience users sin ids bloquea', () => {
    const f = usersFilterForAudience('t1', { mode: 'users', userIds: [] })
    assert.deepEqual(f._id, { $exists: false })
  })

  it('serializeAudience mirrors normalize', () => {
    const s = serializeAudience({ mode: 'restricted', areaIds: ['a'], groupIds: [], userIds: [] })
    assert.equal(s.mode, 'restricted')
    assert.deepEqual(s.areaIds, ['a'])
  })
})

describe('pushCampaignPayload', () => {
  it('parseIdsCsv acepta coma y punto y coma', () => {
    assert.deepEqual(parseIdsCsv('a;b, c'), ['a', 'b', 'c'])
  })

  it('buildCampaignPayload mapea titulo/cuerpo y scheduled', () => {
    const future = new Date(Date.now() + 3600_000).toISOString()
    const p = buildCampaignPayload({
      titulo: 'Hola',
      cuerpo: 'Mundo',
      envio: 'programado',
      fechaProgramada: future,
      audiencia: 'all',
    })
    assert.equal(p.title, 'Hola')
    assert.equal(p.body, 'Mundo')
    assert.equal(p.sendType, 'scheduled')
    assert.ok(p.scheduledAt instanceof Date)
    assert.equal(validateCampaignPayload(p), null)
  })

  it('validateCampaignPayload exige título', () => {
    const p = buildCampaignPayload({ title: '' })
    assert.equal(validateCampaignPayload(p), 'Título obligatorio')
  })

  it('validateCampaignPayload rechaza scheduled sin fecha', () => {
    const p = buildCampaignPayload({ title: 'X', sendType: 'scheduled' })
    assert.equal(validateCampaignPayload(p), 'Fecha de programación inválida')
  })

  it('validateCampaignPayload rechaza fecha pasada', () => {
    const p = buildCampaignPayload({
      title: 'X',
      sendType: 'scheduled',
      scheduledAt: new Date(Date.now() - 120_000).toISOString(),
    })
    assert.equal(validateCampaignPayload(p), 'La fecha programada ya pasó')
  })

  it('validateCampaignPayload exige destinatarios en mode users', () => {
    const p = buildCampaignPayload({
      title: 'X',
      audience: { mode: 'users', userIds: [] },
    })
    assert.equal(validateCampaignPayload(p), 'Audiencia por usuarios sin destinatarios')
  })

  it('validateCampaignPayload exige picks en restricted', () => {
    const p = buildCampaignPayload({
      title: 'X',
      audience: { mode: 'restricted', areaIds: [], groupIds: [], userIds: [] },
    })
    assert.equal(validateCampaignPayload(p), 'Audiencia restringida sin áreas, grupos ni usuarios')
  })

  it('sanitizeCampaignHref normaliza rutas', () => {
    assert.equal(sanitizeCampaignHref('muro'), '/muro')
    assert.equal(sanitizeCampaignHref('/avisos'), '/avisos')
    assert.equal(sanitizeCampaignHref('https://x.test'), 'https://x.test')
    assert.equal(sanitizeCampaignHref(''), '/')
  })

  it('rowsToCsv escapa comillas', () => {
    const csv = rowsToCsv(['a'], [{ a: 'hola "mundo"' }])
    assert.match(csv, /"hola ""mundo"""/)
  })
})

describe('serializeCampaign', () => {
  it('serializa campos mínimos', () => {
    const s = serializeCampaign({
      _id: '507f1f77bcf86cd799439011',
      title: 'Aviso',
      body: 'Texto',
      status: 'draft',
      audience: { mode: 'all' },
      channels: { inApp: true, push: false },
      stats: {},
    })
    assert.equal(s.id, '507f1f77bcf86cd799439011')
    assert.equal(s.title, 'Aviso')
    assert.equal(s.channels.push, false)
    assert.equal(s.audience.mode, 'all')
  })

  it('devuelve null si no hay campaña', () => {
    assert.equal(serializeCampaign(null), null)
  })
})
