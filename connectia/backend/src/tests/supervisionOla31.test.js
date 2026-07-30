/**
 * Smoke helpers ECR BFF (sin red).
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapLegacyRolId, SUP_ROLE, defaultStatusOnCreate, TASK_STATUS } from '../lib/supervisionTasks.js'

describe('ola31 parity smoke', () => {
  it('operario canónico desde legado 4', () => {
    assert.equal(mapLegacyRolId(4), SUP_ROLE.OPERARIO)
  })

  it('crear con asignado → asignacion', () => {
    assert.equal(defaultStatusOnCreate({ usuarioAsignadoId: 'x' }), TASK_STATUS.ASSIGNED)
  })
})
