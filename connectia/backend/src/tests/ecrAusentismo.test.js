import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  ecrAusentismoConfigured,
  tenantWantsEcrAusentismo,
  ecrAusentismoStatus,
  buildEcrAbsencePayload,
  applyEcrSyncToAbsence,
  syncAbsenceToEcr,
} from '../services/ecrAusentismoAdapter.js'

describe('ecrAusentismoAdapter', () => {
  const prev = {}

  beforeEach(() => {
    for (const k of [
      'ECR_AUSENTISMO_API',
      'ECR_AUSENTISMO_API_KEY',
      'ECR_AUSENTISMO_BEARER',
      'ECR_AUSENTISMO_CREATE_PATH',
    ]) {
      prev[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('tenantWantsEcrAusentismo by pack caps', () => {
    assert.equal(tenantWantsEcrAusentismo({ capabilities: [] }), false)
    assert.equal(tenantWantsEcrAusentismo({ capabilities: ['ausentismos'] }), false)
    assert.equal(tenantWantsEcrAusentismo({ capabilities: ['pack.ecr'] }), true)
    assert.equal(tenantWantsEcrAusentismo({ capabilities: ['asistencia.ecr'] }), true)
    assert.equal(tenantWantsEcrAusentismo({ capabilities: ['integracion.ausentismo.ecr'] }), true)
  })

  it('ecrAusentismoConfigured requires API + key', () => {
    assert.equal(ecrAusentismoConfigured(), false)
    process.env.ECR_AUSENTISMO_API = 'https://ausentismo.ecrgroup.cl'
    assert.equal(ecrAusentismoConfigured(), false)
    process.env.ECR_AUSENTISMO_API_KEY = 'secret'
    assert.equal(ecrAusentismoConfigured(), true)
  })

  it('ecrAusentismoStatus modes', () => {
    const local = ecrAusentismoStatus({ capabilities: ['ausentismos'] })
    assert.equal(local.mode, 'local_only')
    assert.equal(local.enabled, false)

    const mock = ecrAusentismoStatus({ capabilities: ['pack.ecr'] })
    assert.equal(mock.mode, 'mock')
    assert.equal(mock.enabled, true)
    assert.equal(mock.mock, true)

    process.env.ECR_AUSENTISMO_API = 'https://ausentismo.ecrgroup.cl'
    process.env.ECR_AUSENTISMO_API_KEY = 'k'
    const live = ecrAusentismoStatus({ capabilities: ['asistencia.ecr'] })
    assert.equal(live.mode, 'live')
    assert.equal(live.configured, true)
  })

  it('buildEcrAbsencePayload includes idempotency and dates', () => {
    const p = buildEcrAbsencePayload(
      {
        codigo: 'AUS-0001',
        tipoKey: 'enfermedad',
        tipoNombre: 'Enfermedad',
        desde: new Date('2026-08-10T12:00:00Z'),
        hasta: new Date('2026-08-11T12:00:00Z'),
        dias: 2,
        estado: 'pendiente',
        motivo: 'Gripe',
        requesterId: 'u1',
        requesterName: 'Ana',
        adjuntos: [{ nombre: 'cert.pdf', url: '/uploads/x.pdf' }],
      },
      { dni: '12345678', idExterno: 'LEG-9' },
      { event: 'create' },
    )
    assert.equal(p.idempotencyKey, 'aus-AUS-0001-create')
    assert.equal(p.desde, '2026-08-10')
    assert.equal(p.hasta, '2026-08-11')
    assert.equal(p.solicitante.dni, '12345678')
    assert.equal(p.adjuntos.length, 1)
  })

  it('applyEcrSyncToAbsence mutates ecrSync', () => {
    const abs = { ecrSync: { status: 'none' } }
    applyEcrSyncToAbsence(abs, {
      status: 'synced',
      note: 'ok',
      externalId: 'mock-1',
      at: new Date('2026-07-30'),
    })
    assert.equal(abs.ecrSync.status, 'synced')
    assert.equal(abs.ecrSync.externalId, 'mock-1')
  })

  it('syncAbsenceToEcr returns none without pack', async () => {
    const r = await syncAbsenceToEcr({
      tenant: { capabilities: [] },
      absence: { codigo: 'AUS-1' },
      event: 'create',
    })
    assert.equal(r.status, 'none')
    assert.equal(r.ok, true)
  })

  it('syncAbsenceToEcr mocks when pack without credentials', async () => {
    const r = await syncAbsenceToEcr({
      tenant: { capabilities: ['pack.ecr'] },
      absence: { codigo: 'AUS-42', ecrSync: {} },
      event: 'create',
    })
    assert.equal(r.ok, true)
    assert.equal(r.mock, true)
    assert.equal(r.status, 'synced')
    assert.equal(r.externalId, 'mock-aus-AUS-42')
  })
})
