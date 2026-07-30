/**
 * Tests postdev Ola 31 — import, permisos, IA.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSupervisionImport, buildImportTemplate } from '../lib/supervisionImport.js'
import { defaultPermisosForRole, mergePermisos, canDo } from '../lib/supervisionPermisos.js'
import { buildSupervisionAiInsights, prioritizeVisits } from '../lib/supervisionAi.js'

describe('supervisionImport', () => {
  it('build + parse plantilla cadenas', () => {
    const buf = buildImportTemplate('cadenas')
    assert.ok(Buffer.isBuffer(buf))
    // plantilla solo headers → 0 items
    const parsed = parseSupervisionImport(buf, 'cadenas')
    assert.equal(parsed.format, 'xlsx')
    assert.equal(parsed.count, 0)
  })
})

describe('supervisionPermisos', () => {
  it('operario puede completar historial, no crear ABM', () => {
    const p = defaultPermisosForRole('operario')
    assert.equal(canDo(p, 'historial_tareas', 'completar'), true)
    assert.equal(canDo(p, 'abm_cadena', 'crear'), false)
  })

  it('merge conserva override', () => {
    const m = mergePermisos('operario', { ecr: { ver: true, crear: false, editar: false, eliminar: false, asignar: false, completar: false, importar: false } })
    assert.equal(m.ecr.ver, true)
    assert.equal(m.historial_tareas.completar, true)
  })
})

describe('supervisionAi', () => {
  it('prioriza vencidas y alta', () => {
    const now = new Date('2026-07-29T12:00:00Z')
    const list = prioritizeVisits(
      [
        { id: '1', titulo: 'A', prioridad: 'baja', fechaLimite: '2026-08-10', status: 'pendiente' },
        { id: '2', titulo: 'B', prioridad: 'alta', fechaLimite: '2026-07-28', status: 'en_progreso' },
      ],
      now,
    )
    assert.equal(list[0].tareaId, '2')
  })

  it('insights exige confirmación humana', () => {
    const ins = buildSupervisionAiInsights([])
    assert.equal(ins.humanConfirmRequired, true)
  })
})
