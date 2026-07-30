import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_STATUS,
  defaultStatusOnCreate,
  statusAfterAssign,
  canOpenDetailOffline,
  canCreateOffline,
  validateComplete,
  snapshotMediciones,
  mapLegacyRolId,
  SUP_ROLE,
  isFieldManagerRole,
  validateBulkPayload,
  canApplyBulkAction,
} from '../lib/supervisionTasks.js'

describe('supervisionTasks', () => {
  it('defaultStatusOnCreate: pendiente sin asignado', () => {
    assert.equal(defaultStatusOnCreate({}), TASK_STATUS.PENDING)
  })

  it('defaultStatusOnCreate: asignacion con asignado', () => {
    assert.equal(defaultStatusOnCreate({ usuarioAsignadoId: 'u1' }), TASK_STATUS.ASSIGNED)
  })

  it('statusAfterAssign: pendiente → asignacion al primer assign', () => {
    assert.equal(
      statusAfterAssign({
        prevStatus: TASK_STATUS.PENDING,
        prevAssignee: null,
        nextAssignee: 'u1',
      }),
      TASK_STATUS.ASSIGNED,
    )
  })

  it('statusAfterAssign: no cambia si ya tenía asignado', () => {
    assert.equal(
      statusAfterAssign({
        prevStatus: TASK_STATUS.IN_PROGRESS,
        prevAssignee: 'u1',
        nextAssignee: 'u2',
      }),
      TASK_STATUS.IN_PROGRESS,
    )
  })

  it('canOpenDetailOffline solo en progreso con asignado', () => {
    assert.equal(canOpenDetailOffline({ status: TASK_STATUS.IN_PROGRESS, usuarioAsignadoId: 'u1' }), true)
    assert.equal(canOpenDetailOffline({ status: TASK_STATUS.PENDING, usuarioAsignadoId: 'u1' }), false)
    assert.equal(canOpenDetailOffline({ status: TASK_STATUS.IN_PROGRESS, usuarioAsignadoId: null }), false)
  })

  it('canCreateOffline siempre false', () => {
    assert.equal(canCreateOffline(), false)
  })

  it('validateComplete exige foto y observación', () => {
    assert.equal(validateComplete({ requiereFoto: true, hasPhoto: false, observacion: 'ok' }).ok, false)
    assert.equal(validateComplete({ requiereFoto: false, hasPhoto: false, observacion: '' }).ok, false)
    assert.equal(validateComplete({ requiereFoto: true, hasPhoto: true, observacion: 'listo' }).ok, true)
  })

  it('snapshotMediciones copia sin mutar origen', () => {
    const src = [{ nombre: 'A', tipo: 'check', obligatorio: true }]
    const snap = snapshotMediciones(src)
    assert.equal(snap.length, 1)
    assert.equal(snap[0].nombre, 'A')
    assert.equal(snap[0].key, 'm1')
  })

  it('mapLegacyRolId: 4 y 1 → operario; 5 → admin_mod', () => {
    assert.equal(mapLegacyRolId(4), SUP_ROLE.OPERARIO)
    assert.equal(mapLegacyRolId(1), SUP_ROLE.OPERARIO)
    assert.equal(mapLegacyRolId(5), SUP_ROLE.ADMIN_MOD)
    assert.equal(mapLegacyRolId(2), SUP_ROLE.SUPERVISOR)
  })

  it('isFieldManagerRole', () => {
    assert.equal(isFieldManagerRole(SUP_ROLE.SUPERVISOR), true)
    assert.equal(isFieldManagerRole(SUP_ROLE.OPERARIO), false)
  })

  it('validateBulkPayload exige ids y acción válida', () => {
    assert.equal(validateBulkPayload({}).ok, false)
    assert.equal(validateBulkPayload({ action: 'assign', ids: ['a'] }).ok, false)
    assert.equal(
      validateBulkPayload({ action: 'assign', ids: ['a'], asignadoId: 'u1' }).ok,
      true,
    )
    assert.equal(
      validateBulkPayload({ action: 'complete', ids: ['a'], observacion: 'ok' }).ok,
      true,
    )
  })

  it('canApplyBulkAction omite completadas/canceladas', () => {
    assert.equal(canApplyBulkAction('cancel', { status: 'completada' }), false)
    assert.equal(canApplyBulkAction('prioritize', { status: 'pendiente' }), true)
    assert.equal(canApplyBulkAction('complete', { status: 'en_progreso', requiereFoto: true, fotoUrl: '' }), false)
  })
})
