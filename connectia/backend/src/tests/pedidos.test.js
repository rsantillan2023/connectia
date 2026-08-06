import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canTransitionPedido,
  normalizeGeo,
  pedidoHasGeo,
  geoMapFilter,
  PEDIDO_TRANSITIONS,
} from '../lib/pedidos.js'
import { OLA25_MENU_ITEMS, OLA25_ALL_CAPS } from '../lib/ensureOla25Menu.js'
import { tenantWantsPedidos } from '../lib/pedidosSeed.js'

describe('Ola 25 pedidos — transiciones', () => {
  it('abierta → en_curso / cancelada / cerrada', () => {
    assert.equal(canTransitionPedido('abierta', 'en_curso'), true)
    assert.equal(canTransitionPedido('abierta', 'cancelada'), true)
    assert.equal(canTransitionPedido('abierta', 'cerrada'), true)
    assert.equal(canTransitionPedido('abierta', 'abierta'), false)
  })

  it('terminales sin salida', () => {
    assert.deepEqual(PEDIDO_TRANSITIONS.cerrada, [])
    assert.deepEqual(PEDIDO_TRANSITIONS.cancelada, [])
    assert.equal(canTransitionPedido('cerrada', 'abierta'), false)
  })

  it('en_curso → cerrada | cancelada', () => {
    assert.equal(canTransitionPedido('en_curso', 'cerrada'), true)
    assert.equal(canTransitionPedido('en_curso', 'cancelada'), true)
    assert.equal(canTransitionPedido('en_curso', 'abierta'), false)
  })
})

describe('Ola 25 pedidos — geo', () => {
  it('normaliza coords válidas', () => {
    const g = normalizeGeo({ lat: -34.6, lng: -58.4, accuracy: 10, permission: 'granted' })
    assert.equal(g.lat, -34.6)
    assert.equal(g.lng, -58.4)
    assert.equal(g.accuracy, 10)
  })

  it('rechaza coords inválidas (no inventa)', () => {
    assert.equal(normalizeGeo(null), null)
    assert.equal(normalizeGeo({ lat: 999, lng: 0 }), null)
    assert.equal(normalizeGeo({ lat: 'x', lng: 'y' }), null)
  })

  it('pedidoHasGeo y filtro mapa', () => {
    assert.equal(pedidoHasGeo({ geo: { lat: 1, lng: 2 } }), true)
    assert.equal(pedidoHasGeo({ geo: null }), false)
    assert.equal(pedidoHasGeo({}), false)
    const f = geoMapFilter({ tenantId: 't1', status: 'abierta' })
    assert.equal(f.tenantId, 't1')
    assert.equal(f.status, 'abierta')
    assert.ok(f['geo.lat'])
    assert.ok(f['geo.lng'])
  })
})

describe('Ola 25 menú', () => {
  it('items U/A con keys esperadas', () => {
    const keys = OLA25_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('pedidos'))
    assert.ok(keys.includes('alarma'))
    assert.ok(keys.includes('admin.pedidos'))
    assert.equal(OLA25_MENU_ITEMS.find((i) => i.key === 'alarma').route, '/alarma')
    assert.equal(OLA25_MENU_ITEMS.find((i) => i.key === 'admin.pedidos').channel, 'a')
  })

  it('caps de producto + admin', () => {
    assert.ok(OLA25_ALL_CAPS.includes('pedidos'))
    assert.ok(OLA25_ALL_CAPS.includes('pedidos.alarma'))
    assert.ok(OLA25_ALL_CAPS.includes('admin.pedidos'))
  })
})

describe('Ola 25 seed gate', () => {
  it('quiere pedidos si está en caps o pack todo', () => {
    assert.equal(tenantWantsPedidos({ capabilities: ['pedidos'] }), true)
    assert.equal(tenantWantsPedidos({ licensedCapabilities: ['pedidos'] }), true)
    assert.equal(tenantWantsPedidos({ pack: 'todo' }), true)
    assert.equal(tenantWantsPedidos({ capabilities: ['muro'], pack: 'basico' }), false)
  })
})
