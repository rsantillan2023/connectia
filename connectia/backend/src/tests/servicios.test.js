import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionServicio,
  SERVICIO_TRANSITIONS,
  computeSlaDueAt,
  isSlaBreached,
  validateFormAnswers,
  normalizeFields,
  validateCsat,
  heuristicServiceFromText,
  aggregateServiciosReport,
} from '../lib/servicios.js'
import { OLA43_MENU_ITEMS, OLA43_ALL_CAPS } from '../lib/ensureOla43Menu.js'
import { tenantWantsServicios, defaultServiciosCatalog } from '../lib/serviciosSeed.js'
import { jiraConfigured, createJiraIssueFromServicio } from '../lib/jiraServiciosAdapter.js'

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
    assert.equal(isSlaBreached({ status: 'recibido', slaDueAt: due }, now), true)
    assert.equal(isSlaBreached({ status: 'resuelto', slaDueAt: due }, now), false)
  })
})

describe('Ola 43 servicios — formularios / CSAT', () => {
  it('validateFormAnswers exige required', () => {
    const fields = [
      { key: 'sistema', label: 'Sistema', type: 'text', required: true, options: [] },
    ]
    assert.equal(validateFormAnswers(fields, []).ok, false)
    assert.equal(validateFormAnswers(fields, [{ key: 'sistema', value: 'ERP' }]).ok, true)
  })

  it('normalizeFields limpia keys', () => {
    const f = normalizeFields([
      { key: ' mi key ', label: 'Mi campo', type: 'select', required: true, options: ['A', 'B'] },
    ])
    assert.equal(f[0].key, 'mi_key')
  })

  it('validateCsat 1-5', () => {
    assert.equal(validateCsat({ score: 0 }).ok, false)
    assert.equal(validateCsat({ score: 5, comment: 'ok' }).ok, true)
    assert.equal(validateCsat({ score: 5 }).csat.score, 5)
  })
})

describe('Ola 43 enrutamiento heurístico', () => {
  it('sugiere por tokens de label/keywords', () => {
    const { suggestions } = heuristicServiceFromText('necesito notebook y acceso vpn', [
      {
        id: '1',
        label: 'Acceso a sistema',
        description: 'VPN y sistemas',
        keywords: ['vpn', 'acceso'],
        areaId: 'a1',
        active: true,
      },
      {
        id: '2',
        label: 'Pedido de EPP',
        description: 'casco',
        keywords: ['epp'],
        areaId: 'a2',
        active: true,
      },
    ])
    assert.ok(suggestions.length >= 1)
    assert.equal(suggestions[0].itemId, '1')
  })
})

describe('Ola 43 reportes', () => {
  it('aggregateServiciosReport cuenta status y CSAT', () => {
    const agg = aggregateServiciosReport([
      { status: 'recibido', areaId: 'a', catalogItemId: 'c', csat: {} },
      { status: 'resuelto', areaId: 'a', catalogItemId: 'c', csat: { score: 4 } },
      { status: 'resuelto', areaId: 'b', catalogItemId: 'd', csat: { score: 5 } },
    ])
    assert.equal(agg.total, 3)
    assert.equal(agg.byStatus.resuelto, 2)
    assert.equal(agg.csat.count, 2)
    assert.equal(agg.csat.average, 4.5)
  })
})

describe('Ola 43 Jira adapter', () => {
  it('skipped sin config', async () => {
    assert.equal(jiraConfigured({}), false)
    const r = await createJiraIssueFromServicio({
      tenant: {},
      request: { number: 1, note: '', formAnswers: [] },
      catalog: { label: 'X' },
      area: { name: 'TI' },
    })
    assert.equal(r.status, 'skipped')
  })

  it('created con fetch mock', async () => {
    const tenant = {
      jiraConfig: {
        baseUrl: 'https://jira.example',
        email: 'a@b.c',
        apiToken: 'tok',
        projectKey: 'SVC',
      },
    }
    assert.equal(jiraConfigured(tenant), true)
    const r = await createJiraIssueFromServicio({
      tenant,
      request: { number: 9, note: 'n', formAnswers: [] },
      catalog: { label: 'Acceso' },
      area: { name: 'TI' },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ key: 'SVC-9' }),
      }),
    })
    assert.equal(r.status, 'created')
    assert.equal(r.issueKey, 'SVC-9')
  })
})

describe('Ola 43 menú', () => {
  it('items U/A', () => {
    const keys = OLA43_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('servicios'))
    assert.ok(keys.includes('admin.servicios'))
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

describe('Ola 43 seed catalog', () => {
  it('arcor, demo y default traen áreas e ítems', () => {
    for (const variant of ['arcor', 'demo', 'default']) {
      const cat = defaultServiciosCatalog('Acme', { variant })
      assert.ok(cat.areas.length >= 2, variant)
      assert.ok(cat.items.length >= 2, variant)
      assert.ok(cat.demoRequest?.itemLabel, variant)
      for (const item of cat.items) {
        assert.ok(item.label)
        assert.ok(item.area)
        assert.ok(Array.isArray(item.fields))
      }
    }
  })

  it('arcor incluye planta / EHS', () => {
    const cat = defaultServiciosCatalog('Arcor', { variant: 'arcor' })
    assert.ok(cat.areas.some((a) => /planta|ehs/i.test(a.name)))
    assert.ok(cat.items.some((i) => /insegura|epp/i.test(i.label)))
  })
})
