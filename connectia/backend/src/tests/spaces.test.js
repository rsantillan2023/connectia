import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  rangesOverlap,
  effectiveCupo,
  hasFreeSlot,
  validateReservationRange,
  normalizePlate,
  isValidPlate,
  evaluateCreateReservation,
  canCancelReservation,
  kindLabel,
  serializeResource,
  weekDateKeys,
  toDateKey,
  withinHorario,
} from '../lib/spaces.js'
import {
  normalizeAttributes,
  resourceHasAttributes,
  serializeResourceType,
  serializeAttributeDef,
} from '../lib/spacesCatalog.js'
import { detectAssistantIntent } from '../lib/assistantIntent.js'

describe('spaces overlap & cupo', () => {
  it('detecta solape con buffer', () => {
    const a0 = '2026-08-01T10:00:00.000Z'
    const a1 = '2026-08-01T11:00:00.000Z'
    const b0 = '2026-08-01T11:00:00.000Z'
    const b1 = '2026-08-01T12:00:00.000Z'
    assert.equal(rangesOverlap(a0, a1, b0, b1, 0), false)
    assert.equal(rangesOverlap(a0, a1, b0, b1, 15), true)
  })

  it('cupo zona vs plaza nominada', () => {
    assert.equal(effectiveCupo({ kind: 'sala' }), 1)
    assert.equal(effectiveCupo({ kind: 'zona_cupo', cupo: 12 }), 12)
    assert.equal(effectiveCupo({ kind: 'cochera', cupo: 8 }), 8)
    assert.equal(hasFreeSlot({ resource: { kind: 'zona_cupo', cupo: 2 }, overlappingCount: 1 }), true)
    assert.equal(hasFreeSlot({ resource: { kind: 'zona_cupo', cupo: 2 }, overlappingCount: 2 }), false)
  })
})

describe('spaces validation', () => {
  it('rango y patente', () => {
    const now = new Date('2026-07-28T12:00:00Z')
    assert.equal(
      validateReservationRange({
        startAt: '2026-07-29T10:00:00Z',
        endAt: '2026-07-29T11:00:00Z',
        now,
      }).ok,
      true,
    )
    assert.equal(
      validateReservationRange({
        startAt: '2026-07-29T11:00:00Z',
        endAt: '2026-07-29T10:00:00Z',
        now,
      }).ok,
      false,
    )
    assert.equal(normalizePlate('ab 123 cd'), 'AB123CD')
    assert.equal(isValidPlate('AB123CD'), true)
    assert.equal(isValidPlate('AB'), false)
  })

  it('evalúa crear reserva sala / cochera', () => {
    const now = new Date('2026-07-28T12:00:00Z')
    const startAt = '2026-07-29T14:00:00.000Z'
    const endAt = '2026-07-29T15:00:00.000Z'
    const sala = {
      kind: 'sala',
      activo: true,
      requiresApproval: true,
      horario: { days: [1, 2, 3, 4, 5, 6, 0], open: '00:00', close: '23:59' },
    }
    const ok = evaluateCreateReservation({
      resource: sala,
      policy: {},
      startAt,
      endAt,
      overlappingCount: 0,
      now,
    })
    assert.equal(ok.ok, true)
    assert.equal(ok.status, 'pending')

    const cochera = {
      kind: 'cochera',
      activo: true,
      exigePatente: true,
      horario: { days: [1, 2, 3, 4, 5, 6, 0], open: '00:00', close: '23:59' },
    }
    const badPlate = evaluateCreateReservation({
      resource: cochera,
      policy: {},
      startAt,
      endAt,
      plate: 'XX',
      overlappingCount: 0,
      userActiveParkingCount: 0,
      now,
    })
    assert.equal(badPlate.ok, false)

    const noPlateNeeded = evaluateCreateReservation({
      resource: { ...cochera, exigePatente: false },
      policy: {},
      startAt,
      endAt,
      plate: '',
      overlappingCount: 0,
      userActiveParkingCount: 0,
      now,
    })
    assert.equal(noPlateNeeded.ok, true)

    const good = evaluateCreateReservation({
      resource: cochera,
      policy: {},
      startAt,
      endAt,
      plate: 'AB123CD',
      overlappingCount: 0,
      userActiveParkingCount: 0,
      now,
    })
    assert.equal(good.ok, true)
    assert.equal(good.status, 'confirmed')
  })

  it('cancela con ventana', () => {
    const now = new Date('2026-07-28T12:00:00Z')
    const soon = canCancelReservation({
      reservation: { status: 'confirmed', startAt: '2026-07-28T12:10:00Z' },
      policy: { cancelMinutesBefore: 30 },
      now,
    })
    assert.equal(soon.ok, false)

    const pending = canCancelReservation({
      reservation: { status: 'pending', startAt: '2026-07-28T12:10:00Z' },
      policy: { cancelMinutesBefore: 30 },
      now,
    })
    assert.equal(pending.ok, true)
  })
})

describe('spaces serialize / week', () => {
  it('labels y week keys', () => {
    assert.equal(kindLabel('cochera'), 'Cochera')
    const s = serializeResource({
      _id: '507f1f77bcf86cd799439011',
      siteId: '507f1f77bcf86cd799439012',
      kind: 'zona_cupo',
      nombre: 'Hot desk',
      cupo: 10,
      activo: true,
    })
    assert.equal(s.effectiveCupo, 10)
    assert.equal(toDateKey('2026-07-28T15:00:00Z'), '2026-07-28')
    assert.equal(weekDateKeys('2026-07-28').length, 7)
  })

  it('horario', () => {
    // Usa Date local: forzamos un recurso 24/7 para no depender del TZ del runner
    const r = { horario: { days: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '23:59' } }
    assert.equal(
      withinHorario(r, '2026-07-28T10:00:00', '2026-07-28T11:00:00'),
      true,
    )
  })
})

describe('spaces assistant intents', () => {
  it('detecta sala / cochera / puesto', () => {
    assert.equal(detectAssistantIntent('quiero reservar una sala').intent, 'reservar_sala')
    assert.equal(detectAssistantIntent('necesito una cochera mañana').intent, 'reservar_cochera')
    assert.equal(detectAssistantIntent('voy a la oficina el jueves').intent, 'reservar_puesto')
  })
})

describe('spaces catalog (tipos + atributos)', () => {
  it('normaliza attributes y filtra por keys', () => {
    assert.deepEqual(normalizeAttributes(['HDMI', { key: 'Marca', value: 'Epson' }]), [
      { key: 'hdmi', value: '' },
      { key: 'marca', value: 'Epson' },
    ])
    const resource = {
      attributes: [{ key: 'hdmi', value: '' }, { key: '4k', value: '' }],
      equipment: ['pizarra'],
    }
    assert.equal(resourceHasAttributes(resource, ['hdmi', '4k']), true)
    assert.equal(resourceHasAttributes(resource, ['hdmi', 'wifi']), false)
    assert.equal(resourceHasAttributes(resource, ['pizarra']), true)
  })

  it('serializa tipo y atributo', () => {
    const t = serializeResourceType({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      codigo: 'proyector',
      label: 'Proyector',
      icon: 'projector',
      engineKind: 'activo',
      attributeKeys: ['hdmi'],
      showInUserCatalog: true,
      system: false,
      activo: true,
      orden: 60,
    })
    assert.equal(t.codigo, 'proyector')
    assert.equal(t.engineKind, 'activo')
    const a = serializeAttributeDef({
      _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      key: 'hdmi',
      label: 'HDMI',
      valueType: 'flag',
      activo: true,
      orden: 20,
    })
    assert.equal(a.label, 'HDMI')
  })
})
