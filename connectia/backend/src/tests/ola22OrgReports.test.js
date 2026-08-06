import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { OLA22_MENU_ITEMS } from '../lib/ensureOla22Menu.js'
import {
  wouldCreateManagerCycle,
  buildPeopleTree,
  filterPeopleTree,
} from '../lib/orgPeopleHierarchy.js'
import {
  computeAdoption,
  postEngagement,
  rankPostsByEngagement,
  resolveReportWindow,
  toExportPayload,
  aggregateEventRsvps,
} from '../lib/reportsMetrics.js'

describe('ensureOla22Menu', () => {
  it('incluye organigrama U y reportes A', () => {
    const keys = OLA22_MENU_ITEMS.map((i) => i.key)
    assert.ok(keys.includes('organigrama'))
    assert.ok(keys.includes('admin.reportes'))
    const u = OLA22_MENU_ITEMS.find((i) => i.key === 'organigrama')
    const a = OLA22_MENU_ITEMS.find((i) => i.key === 'admin.reportes')
    assert.equal(u.route, '/organigrama')
    assert.equal(u.channel, 'u')
    assert.equal(a.route, '/reportes')
    assert.equal(a.channel, 'a')
  })
})

describe('orgPeopleHierarchy', () => {
  it('detecta ciclos de manager', () => {
    const map = { a: null, b: 'a', c: 'b' }
    assert.equal(wouldCreateManagerCycle(map, 'a', 'c'), true)
    assert.equal(wouldCreateManagerCycle(map, 'a', 'b'), true)
    assert.equal(wouldCreateManagerCycle(map, 'c', null), false)
    assert.equal(wouldCreateManagerCycle(map, 'c', 'a'), false)
  })

  it('arma árbol de reportes y filtra por búsqueda', () => {
    const people = [
      { id: '1', nombre: 'Ana', apellido: 'Boss', managerId: null, cargo: 'CEO' },
      { id: '2', nombre: 'Bob', apellido: 'Dev', managerId: '1', cargo: 'Dev' },
      { id: '3', nombre: 'Cara', apellido: 'HR', managerId: '1', cargo: 'RRHH' },
    ]
    const tree = buildPeopleTree(people)
    assert.equal(tree.length, 1)
    assert.equal(tree[0].id, '1')
    assert.equal(tree[0].reports.length, 2)

    const filtered = filterPeopleTree(tree, 'dev')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].reports.length, 1)
    assert.equal(filtered[0].reports[0].id, '2')
  })
})

describe('reportsMetrics', () => {
  it('calcula adopción en ventana', () => {
    const from = new Date('2026-07-01T00:00:00.000Z')
    const to = new Date('2026-07-31T23:59:59.999Z')
    const result = computeAdoption(
      [
        { id: '1', lastLoginAt: new Date('2026-07-15'), activo: true },
        { id: '2', lastLoginAt: new Date('2026-06-01'), activo: true },
        { id: '3', lastLoginAt: null, activo: true },
        { id: '4', lastLoginAt: new Date('2026-07-10'), activo: false },
      ],
      { from, to },
    )
    assert.equal(result.active, 1)
    assert.equal(result.inactive, 1)
    assert.equal(result.never, 1)
    assert.equal(result.considered, 3)
    assert.equal(result.pctAdopcion, 33.3)
  })

  it('rankea posts por engagement', () => {
    const ranked = rankPostsByEngagement([
      {
        id: 'a',
        titulo: 'A',
        reactions: { love: 1 },
        commentCount: 0,
        saveCount: 0,
        publishedAt: '2026-07-01',
      },
      {
        id: 'b',
        titulo: 'B',
        reactions: { love: 2, clap: 1 },
        commentCount: 2,
        saveCount: 1,
        publishedAt: '2026-07-02',
      },
    ])
    assert.equal(ranked[0].id, 'b')
    assert.equal(ranked[0].engagement, 6)
    assert.equal(postEngagement({ reactions: { like: 1, love: 1 }, commentCount: 1, saveCount: 1 }).engagement, 4)
    assert.equal(
      postEngagement({ reactions: {}, commentCount: 0, saveCount: 0, uniqueViews: 3 }).engagement,
      3,
    )
  })

  it('export xlsx sanitiza fórmulas', async () => {
    const { rowsToXlsxBuffer, sanitizeCell, channelFromUa } = await import('../lib/xlsxExport.js')
    assert.equal(sanitizeCell('=1+1'), "'=1+1")
    assert.equal(channelFromUa('Mozilla/5.0 (iPhone)'), 'mobile')
    assert.equal(channelFromUa('Mozilla/5.0 (Windows NT 10.0)'), 'desktop')
    const buf = rowsToXlsxBuffer(['a', 'b'], [{ a: 1, b: '=cmd' }], 'Test')
    assert.ok(Buffer.isBuffer(buf))
    assert.ok(buf.length > 100)
  })

  it('resuelve ventana y export', () => {
    const w = resolveReportWindow({ from: '2026-07-01', to: '2026-07-10' })
    assert.equal(w.from.toISOString().startsWith('2026-07-01'), true)
    assert.equal(w.to.toISOString().startsWith('2026-07-10'), true)
    const exp = toExportPayload(['a', 'b'], [{ a: 1, b: 2, c: 3 }])
    assert.deepEqual(exp.rows[0], { a: 1, b: 2 })
  })

  it('agrega RSVP por evento (29.03)', () => {
    const agg = aggregateEventRsvps(
      [
        { id: 'e1', titulo: 'Townhall', status: 'published', cupo: 10 },
        { id: 'e2', titulo: 'Café', status: 'published', cupo: null },
      ],
      [
        { eventId: 'e1', estado: 'confirmado' },
        { eventId: 'e1', estado: 'confirmado' },
        { eventId: 'e1', estado: 'rechazado' },
        { eventId: 'e2', estado: 'confirmado' },
      ],
    )
    assert.equal(agg.totals.events, 2)
    assert.equal(agg.totals.confirmados, 3)
    assert.equal(agg.totals.rechazados, 1)
    assert.equal(agg.totals.totalRsvps, 4)
    assert.equal(agg.totals.pctConfirmados, 75)
    assert.equal(agg.items[0].id, 'e1')
    assert.equal(agg.items[0].confirmados, 2)
    assert.equal(agg.items[0].pctConfirmados, 66.7)
  })
})
