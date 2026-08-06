import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderTemplate,
  buildPlaceholderData,
  buildIdempotencyKey,
  sanitizeErrorMessage,
  normalizePhoneE164,
} from '../lib/communicationTemplates.js'
import { OLA28_MENU_ITEMS } from '../lib/ensureOla28Menu.js'

describe('communicationTemplates', () => {
  it('reemplaza placeholders {{…}}', () => {
    const out = renderTemplate('Hola {{ nombre }}, de {{nombreEmpresa}}', {
      nombre: 'María',
      nombreEmpresa: 'Demo',
    })
    assert.equal(out, 'Hola María, de Demo')
  })

  it('placeholder faltante → vacío', () => {
    assert.equal(renderTemplate('X={{missing}}', {}), 'X=')
  })

  it('buildPlaceholderData arma nombreCompleto', () => {
    const d = buildPlaceholderData(
      { nombre: 'Juan', apellido: 'Pérez', email: 'j@x.com', telefono: '11' },
      { brandName: 'Acme' },
    )
    assert.equal(d.nombreCompleto, 'Juan Pérez')
    assert.equal(d.nombreEmpresa, 'Acme')
    assert.equal(d.email, 'j@x.com')
  })

  it('idempotencyKey es estable', () => {
    const a = buildIdempotencyKey({
      tenantId: 't1',
      channel: 'email',
      recipient: 'A@X.COM',
      templateId: 'tpl',
      batchId: 'b',
      userId: 'u',
    })
    const b = buildIdempotencyKey({
      tenantId: 't1',
      channel: 'email',
      recipient: 'a@x.com',
      templateId: 'tpl',
      batchId: 'b',
      userId: 'u',
    })
    assert.equal(a, b)
  })

  it('sanitizeErrorMessage redacta bearer/token', () => {
    const s = sanitizeErrorMessage('fail Bearer abc.def.ghi token=secret123')
    assert.match(s, /\[redacted\]/)
    assert.doesNotMatch(s, /secret123/)
  })

  it('normalizePhoneE164', () => {
    assert.equal(normalizePhoneE164('+54 9 11 1234'), '+549111234')
    assert.equal(normalizePhoneE164('0054911'), '+54911')
  })
})

describe('ensureOla28Menu', () => {
  it('expone ítem admin.comunicaciones', () => {
    assert.equal(OLA28_MENU_ITEMS.length, 1)
    assert.equal(OLA28_MENU_ITEMS[0].key, 'admin.comunicaciones')
    assert.equal(OLA28_MENU_ITEMS[0].route, '/comunicaciones')
    assert.equal(OLA28_MENU_ITEMS[0].channel, 'a')
  })
})
