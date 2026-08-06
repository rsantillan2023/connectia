import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_COBERTURA_ROLES } from '../lib/supervisionCoberturaRoles.js'

test('default cobertura roles are module-specific catalog entries', () => {
  assert.ok(DEFAULT_COBERTURA_ROLES.length >= 4)
  const codes = new Set(DEFAULT_COBERTURA_ROLES.map((r) => r.codigo))
  assert.ok(codes.has('operario'))
  assert.ok(codes.has('supervisor'))
  assert.equal(DEFAULT_COBERTURA_ROLES.find((r) => r.codigo === 'operario').nombre, 'Operario')
  assert.equal(DEFAULT_COBERTURA_ROLES.find((r) => r.codigo === 'supervisor').nombre, 'Supervisor')
  for (const r of DEFAULT_COBERTURA_ROLES) {
    assert.ok(r.codigo)
    assert.ok(r.nombre)
  }
})
