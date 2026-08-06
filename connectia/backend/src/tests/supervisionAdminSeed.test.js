import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SEED_LEGACY_PREFIX, supervisionAdminSeedCatalog } from '../lib/supervisionAdminSeed.js'

describe('supervisionAdminSeedCatalog', () => {
  it('cubre casuística admin supervisión + equipos', () => {
    const c = supervisionAdminSeedCatalog()
    assert.ok(c.areas.length >= 3)
    assert.ok(c.groups.length >= 3)
    assert.ok(c.users.length >= 6)
    assert.ok(c.cadenas.some((x) => x.activo === false), 'cadena inactiva')
    assert.ok(c.clientes.some((x) => x.activo === false), 'cliente inactivo')
    assert.ok(c.salas.some((x) => !x.cadena), 'sala sin cadena')
    assert.ok(c.salas.some((x) => x.activo === false), 'sala inactiva')
    assert.ok(c.templates.length >= 3)
    assert.ok((c.visitaRecurrencias || []).length >= 3, 'visitas programadas en seed')
    assert.ok((c.consultas || []).length >= 3, 'consultas/OK en seed')
    assert.ok(
      (c.consultas || []).some((x) => x.refType === 'policy'),
      'consulta tipo policy',
    )
    assert.ok(c.teamScopes.length >= 6)
    assert.ok(
      c.teamScopes.some((t) => t.source.areaClientIntersect === true),
      'equipo con intersección área∩cliente',
    )
    assert.ok(c.teamScopes.some((t) => t.activo === false), 'equipo inactivo')
    assert.ok(
      c.teamScopes.every((t) => !String(t.nombre || '').startsWith(SEED_LEGACY_PREFIX)),
      'nombres de equipo sin prefijo SEED ·',
    )
    assert.ok(
      c.cadenas.every((x) => !String(x.nombre || '').startsWith(SEED_LEGACY_PREFIX)),
      'nombres de cadena sin prefijo SEED ·',
    )
    assert.ok(
      c.clientes.every((x) => !String(x.nombre || '').startsWith(SEED_LEGACY_PREFIX)),
      'nombres de cliente sin prefijo SEED ·',
    )
    const roles = new Set(c.users.map((u) => u.supervisionRole))
    for (const r of ['operario', 'supervisor', 'plataforma_comercial', 'gestor', 'admin_mod']) {
      assert.ok(roles.has(r), `falta rol ${r}`)
    }
  })
})
