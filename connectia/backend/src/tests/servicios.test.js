import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionServicio,
  SERVICIO_TRANSITIONS,
  computeSlaDueAt,
  isSlaBreached,
  validateFormAnswers,
  normalizeFields,
} from '../lib/servicios.js'
import { OLA43_MENU_ITEMS, OLA43_ALL_CAPS } from '../lib/ensureOla43Menu.js'
import { tenantWantsServicios } from '../lib/serviciosSeed.js'

describe('Ola 43 servicios — transiciones', () => {
  it('recibido → en_curso / cancelado / resuelto', () => {
    assert.equal(canTransitionServicio('recibido', 'en_curso'), true)
    assert.equal(canTransitionServicio('recibido', 'cancelado'), true)
    assert.equal(canTransitionServicio('recibido', 'resuelto'), true)
    assert.equal(canTransitionServicio('recibido', 'recibido'), false)
  })

  it('terminales sin salida', () => {
    assert.deepEqual(SERVICIO_TRANSITIONS.resuelto, [])
    assert.deepEqual(SERVICIO_TRANSITIONS.cancelado, [])
    assert.equal(canTransitionServicio('resuelto', 'en_curso'), false)
  })
})

describe('Ola 43 servicios — SLA', () => {
  it('computeSlaDueAt suma minutos', () => {
    const from = new Date('2026-07-30T12:00:00.000Z')
    const due = computeSlaDueAt(60, from)
    assert.equal(due.toISOString(), '2026-07-30T13:00:00.000Z')
    assert.equal(computeSlaDueAt(0, from), null)
  })

  it('isSlaBreached solo si abierto y due pasado', () => {
    const due = new Date('2026-07-30T10:00:00.000Z')
    const now = new Date('2026-07-30T11:00:00.000Z')
    assert.equal(
      isSlaBreached({ status: 'recibido', slaDueAt: due }, now),
      true,
    )
    assert.equal(
      isSlaBreached({ status: 'resuelto', slaDueAt: due }, now),
      false,
    )
    assert.equal(isSlaBreached({ status: 'en_curso', slaDueAt: null }, now), false)
  })
})

describe('Ola 43 servicios — formularios', () => {
  it('validateFormAnswers exige required', () => {
    const fields = [
      { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
    ]
    const bad = validateFormAnswers(fields, [])
    assert.equal(bad.ok, false)
    const ok = validateFormAnswers(fields, [{ key: 'sistema', value: 'ERP' }])
    assert.equal(ok.ok, true)
    assert.equal(ok.answers[0].value, 'ERP')
  })

  it('normalizeFields limpia keys', () => {
    const f = normalizeFields([
      { key: ' mi key ', label: 'Mi campo', type: 'select', required: true, options: ['A', 'B'] },
      { key: '', label: 'x' },
    ])
    assert.equal(f.length, 1)
    assert.equal(f[0].key, 'mi_key')
    assert.deepEqual(f[0].options, ['A', 'B'])
  })
})

describe('Ola 43 menú', () => {
  it('items U/A', () => {
    const keys = OLA43_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('servicios'))
    assert.ok(keys.includes('admin.servicios'))
    assert.equal(OLA43_MENU_ITEMS.find((i) => i.key === 'servicios').channel, 'u')
  })

  it('caps', () => {
    assert.ok(OLA43_ALL_CAPS.includes('servicios'))
    assert.ok(OLA43_ALL_CAPS.includes('admin.servicios'))
  })
})

describe('Ola 43 seed gate', () => {
  it('quiere servicios si caps o pack todo', () => {
    assert.equal(tenantWantsServicios({ capabilities: ['servicios'] }), true)
    assert.equal(tenantWantsServicios({ pack: 'todo' }), true)
    assert.equal(tenantWantsServicios({ capabilities: ['muro'], pack: 'basico' }), false)
  })
})
