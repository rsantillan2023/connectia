import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { heuristicPlan, HUB_AI_GUIDE } from '../services/hubAi.js'

describe('hubAi', () => {
  const snap = {
    categories: [
      { nombre: 'TI', orden: 10, activo: true, iconSize: 'md' },
      { nombre: 'RRHH', orden: 20, activo: true, iconSize: 'md' },
    ],
    links: [
      {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        titulo: 'Portal',
        category: 'RRHH',
        icon: 'grid',
        color: '',
        order: 10,
        featured: false,
        clickCount: 5,
      },
      {
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        titulo: 'Nómina',
        category: 'RRHH',
        icon: 'file',
        color: '',
        order: 20,
        featured: false,
        clickCount: 9,
      },
      {
        id: 'cccccccccccccccccccccccc',
        titulo: 'VPN',
        category: 'TI',
        icon: 'lock',
        color: '',
        order: 10,
        featured: true,
        clickCount: 2,
      },
    ],
  }

  it('heuristicPlan oculta un grupo solo del muro', () => {
    const plan = heuristicPlan('No muestres el grupo RRHH en el muro', snap)
    const op = plan.ops.find((o) => o.op === 'updateCategory' && o.nombre === 'RRHH')
    assert.ok(op)
    assert.equal(op.patch.showOnMuro, false)
  })

  it('expone guía con campos clave', () => {
    assert.ok(HUB_AI_GUIDE.fields.some((f) => f.id === 'featured'))
    assert.ok(HUB_AI_GUIDE.fields.some((f) => f.id === 'showOnMuro'))
    assert.ok(HUB_AI_GUIDE.examples.length >= 3)
  })

  it('heuristicPlan marca rápidos por clics', () => {
    const plan = heuristicPlan('Dejá los rápidos con más clics', snap)
    const feat = plan.ops.find((o) => o.op === 'setFeatured' && o.category === 'RRHH')
    assert.ok(feat)
    assert.equal(feat.linkIds[0], 'bbbbbbbbbbbbbbbbbbbbbbbb')
  })

  it('heuristicPlan aplica tamaño mediano', () => {
    const plan = heuristicPlan('Poné todos los iconos medianos', snap)
    assert.ok(plan.ops.some((o) => o.op === 'updateCategory' && o.patch.iconSize === 'md'))
    assert.ok(plan.ops.some((o) => o.op === 'updateLink' && o.patch.iconSize === 'md'))
  })
})
