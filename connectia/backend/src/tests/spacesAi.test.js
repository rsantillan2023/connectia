import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  spacesAiConfigured,
  heuristicSpaceResourceDraft,
  draftSpaceResourceFromPrompt,
} from '../services/spacesAi.js'

describe('spacesAi heuristic', () => {
  it('incluye foto, icono, zona y horario', () => {
    const d = heuristicSpaceResourceDraft(
      'Sala de reuniones "Norte A" para 12 personas en Torre Centro piso 8 con HDMI y videollamada',
      {
        brandName: 'Demo',
        existingSites: [],
        existingTypes: [{ id: '1', codigo: 'sala', label: 'Sala', engineKind: 'sala' }],
        existingAttributes: [],
      },
    )
    assert.match(d.resource.imageUrl, /^https:\/\//)
    assert.ok(d.resource.descripcion.length > 20)
    assert.equal(d.resource.zone, 'Reuniones')
    assert.ok(d.resource.horario?.open)
    assert.equal(d.type, null)
  })

  it('proyector trae icono projector y foto', () => {
    const d = heuristicSpaceResourceDraft('Proyector Epson 4K portátil HDMI', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ', codigo: 'hq' }],
      existingTypes: [],
      existingAttributes: [],
    })
    assert.equal(d.resource.kind, 'activo')
    assert.match(d.resource.imageUrl, /^https:\/\//)
    assert.equal(d.type?.icon, 'projector')
    assert.ok(d.resource.attributes.some((a) => a.key === '4k'))
    assert.ok(d.resource.attributes.some((a) => a.key === 'marca' && /epson/i.test(a.value)))
  })

  it('arma un recurso de sala con sede nueva y atributos', () => {
    const d = heuristicSpaceResourceDraft(
      'Sala de reuniones "Norte A" para 12 personas en Torre Centro piso 8 con HDMI y videollamada',
      {
        brandName: 'Demo',
        existingSites: [],
        existingTypes: [{ id: '1', codigo: 'sala', label: 'Sala', engineKind: 'sala' }],
        existingAttributes: [{ key: 'wifi', label: 'WiFi' }],
      },
    )
    assert.equal(d.resource.kind, 'sala')
    assert.match(d.resource.nombre, /Norte A|Sala/i)
    assert.equal(d.resource.capacity, 12)
    assert.equal(d.resource.floor, '8')
    assert.ok(d.site, 'debe proponer sede')
    assert.equal(d.type, null, 'reutiliza tipo sala existente')
    assert.ok(d.resource.attributes.some((a) => a.key === 'hdmi'))
    assert.ok(d.resource.attributes.some((a) => a.key === 'videollamada'))
    assert.ok(d.attributes.some((a) => a.key === 'hdmi'), 'hdmi no existía → atributo nuevo')
  })

  it('detecta cochera y pide patente', () => {
    const d = heuristicSpaceResourceDraft('Cochera techada en planta baja, máximo 2 simultáneas', {
      brandName: 'Arcor',
      existingSites: [{ id: 's1', nombre: 'Planta Arroyito', codigo: 'arroyito' }],
      existingTypes: [],
      existingAttributes: [],
    })
    assert.equal(d.resource.kind, 'cochera')
    assert.equal(d.resource.exigePatente, true)
    assert.ok(d.type, 'crea tipo cochera')
    assert.equal(d.type.engineKind, 'cochera')
    assert.equal(d.policyPatch?.maxSimultaneousParking, 2)
  })

  it('detecta ocupación numerada / pool / aforo / unitario', () => {
    const numbered = heuristicSpaceResourceDraft('Cajonera con 24 cajones numerados L-001', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ' }],
      existingTypes: [{ id: '1', codigo: 'locker', label: 'Locker', engineKind: 'activo' }],
      existingAttributes: [],
    })
    assert.equal(numbered.resource.occupancyClass, 'unidades_numeradas')
    assert.equal(numbered.resource.unitCount, 24)
    assert.equal(numbered.resource.unitPrefix, 'L-')
    assert.match(numbered.notas, /ocupaci/i)

    const pool = heuristicSpaceResourceDraft('Hot desk open space con cupo 12 sin número', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ' }],
      existingTypes: [{ id: '1', codigo: 'zona_cupo', label: 'Zona', engineKind: 'zona_cupo' }],
      existingAttributes: [],
    })
    assert.equal(pool.resource.occupancyClass, 'pool')
    assert.equal(pool.resource.unitCount, 12)

    const aforo = heuristicSpaceResourceDraft('Cafetería aforo 40 multi-reserva', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ' }],
      existingTypes: [],
      existingAttributes: [],
    })
    assert.equal(aforo.resource.occupancyClass, 'aforo')
    assert.equal(aforo.resource.unitCount, 40)

    const unit = heuristicSpaceResourceDraft('Proyector Epson 4K portátil HDMI unitario', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ' }],
      existingTypes: [],
      existingAttributes: [],
    })
    assert.equal(unit.resource.occupancyClass, 'unitario')
    assert.equal(unit.resource.unitCount, 1)
  })

  it('draftSpaceResourceFromPrompt funciona sin API keys (heurística)', async () => {
    const draft = await draftSpaceResourceFromPrompt('Proyector portátil 4K para eventos', {
      brandName: 'Demo',
      existingSites: [{ id: 's1', nombre: 'HQ', codigo: 'hq' }],
      existingTypes: [],
      existingAttributes: [],
    })
    assert.ok(draft.resource.nombre)
    assert.equal(typeof spacesAiConfigured(), 'boolean')
    assert.ok(['heuristic', 'llm'].includes(draft.source))
  })
})
