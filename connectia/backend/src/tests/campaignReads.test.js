import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  campaignNotifFilter,
  computeReadSummary,
  serializeReadRow,
  readsExportRows,
  displayName,
  READS_EXPORT_HEADERS,
} from '../lib/campaignReads.js'

describe('campaignReads', () => {
  it('campaignNotifFilter arma filtro por campaña y estado', () => {
    const all = campaignNotifFilter('t1', 'c1')
    assert.equal(all.refType, 'push_campaign')
    assert.equal(all.refId, 'c1')
    assert.equal(all.readAt, undefined)

    const read = campaignNotifFilter('t1', 'c1', { status: 'read' })
    assert.deepEqual(read.readAt, { $ne: null })

    const unread = campaignNotifFilter('t1', 'c1', { status: 'unread' })
    assert.equal(unread.readAt, null)
  })

  it('computeReadSummary prioriza inAppTotal como destinatarios', () => {
    const s = computeReadSummary({
      inAppTotal: 10,
      readCount: 4,
      campaignStats: { targeted: 6, pushSent: 8, pushFailed: 1 },
    })
    assert.equal(s.targeted, 10)
    assert.equal(s.inAppTotal, 10)
    assert.equal(s.readCount, 4)
    assert.equal(s.unreadCount, 6)
  })

  it('computeReadSummary calcula tasa y no leídas', () => {
    const s = computeReadSummary({
      inAppTotal: 10,
      readCount: 4,
      campaignStats: { targeted: 12, pushSent: 8, pushFailed: 1 },
      byArea: [{ nombre: 'Planta', total: 5, read: 2 }],
    })
    assert.equal(s.readCount, 4)
    assert.equal(s.unreadCount, 6)
    assert.equal(s.readRate, 40)
    assert.equal(s.targeted, 10)
    assert.equal(s.byArea.length, 1)
  })

  it('computeReadSummary con total 0 da tasa 0', () => {
    const s = computeReadSummary({ inAppTotal: 0, readCount: 0 })
    assert.equal(s.readRate, 0)
    assert.equal(s.unreadCount, 0)
  })

  it('serializeReadRow marca status según readAt', () => {
    const unread = serializeReadRow(
      { _id: 'n1', userId: 'u1', readAt: null },
      { usuario: 'jperez', nombre: 'Juan', apellido: 'Perez', email: 'a@b.c', areaId: 'ar1' },
      'Planta',
    )
    assert.equal(unread.status, 'unread')
    assert.equal(unread.areaNombre, 'Planta')
    assert.equal(unread.usuario, 'jperez')

    const read = serializeReadRow({ _id: 'n2', userId: 'u1', readAt: new Date('2026-01-01') }, null, '')
    assert.equal(read.status, 'read')
  })

  it('readsExportRows y headers', () => {
    assert.ok(READS_EXPORT_HEADERS.includes('estado'))
    const rows = readsExportRows([
      {
        usuario: 'u',
        nombre: 'N',
        apellido: 'A',
        email: 'e',
        areaNombre: 'X',
        status: 'read',
        readAt: '2026-01-02T10:00:00.000Z',
        dismissedAt: null,
      },
    ])
    assert.equal(rows[0].estado, 'leida')
    assert.ok(rows[0].leidoAt.includes('2026'))
  })

  it('displayName prioriza nombre completo', () => {
    assert.equal(displayName({ nombre: 'Ana', apellido: 'Diaz', usuario: 'adiaz' }), 'Ana Diaz')
    assert.equal(displayName({ usuario: 'adiaz' }), 'adiaz')
  })
})
