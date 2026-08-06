import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  shouldSkipInternalNote,
  messageNotifyTarget,
  classifyRequestStateEvents,
  requestEventCopy,
} from '../lib/requestNotifyRules.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'

const cfg = defaultSolicitudesConfig()

describe('requestNotifyRules', () => {
  it('no notifica notas internas', () => {
    assert.equal(shouldSkipInternalNote({ interno: true, isAdmin: true }), true)
    assert.equal(messageNotifyTarget({ interno: true, isAdmin: true }), 'none')
  })

  it('respuesta de gestor → solicitante', () => {
    assert.equal(messageNotifyTarget({ interno: false, isAdmin: true }), 'requester')
  })

  it('mensaje de miembro → gestores', () => {
    assert.equal(messageNotifyTarget({ interno: false, isAdmin: false }), 'managers')
  })

  it('detecta reapertura (terminal/resuelta → inicial)', () => {
    const ev = classifyRequestStateEvents({
      fromEstado: 'cerrada',
      toEstado: 'abierta',
      cfg,
    })
    assert.equal(ev.some((e) => e.kind === 'request_reopened' && e.email), true)
  })

  it('detecta en proceso y resuelta (push, sin email obligatorio)', () => {
    const a = classifyRequestStateEvents({ fromEstado: 'abierta', toEstado: 'en_proceso', cfg })
    assert.equal(a[0].kind, 'request_in_progress')
    assert.equal(a[0].push, true)
    assert.equal(a[0].email, false)

    const b = classifyRequestStateEvents({ fromEstado: 'en_proceso', toEstado: 'resuelta', cfg })
    assert.equal(b[0].kind, 'request_resolved')
  })

  it('detecta cambio de área con email', () => {
    const ev = classifyRequestStateEvents({
      fromEstado: 'en_proceso',
      toEstado: 'en_proceso',
      fromArea: 'RRHH',
      toArea: 'IT',
      cfg,
    })
    assert.equal(ev.length, 1)
    assert.equal(ev[0].kind, 'request_area_changed')
    assert.equal(ev[0].email, true)
  })

  it('arma copy de eventos', () => {
    const c = requestEventCopy({
      kind: 'request_created',
      request: { codigo: 'SOL-1', titulo: 'VPN', requesterName: 'Ana' },
    })
    assert.match(c.title, /SOL-1/)
    assert.match(c.body, /Ana/)
  })
})
