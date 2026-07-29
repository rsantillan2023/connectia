import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseParentId,
  wouldCreateCycle,
  buildAreaTree,
  descendantIds,
} from '../lib/orgAreaHierarchy.js'

describe('orgAreaHierarchy', () => {
  it('parseParentId trata vacío como null', () => {
    assert.equal(parseParentId(null), null)
    assert.equal(parseParentId(''), null)
    assert.equal(parseParentId('  '), null)
    assert.equal(parseParentId('abc'), 'abc')
  })

  it('wouldCreateCycle detecta self y ancestros', () => {
    const map = { a: null, b: 'a', c: 'b' }
    assert.equal(wouldCreateCycle(map, 'a', 'a'), true)
    assert.equal(wouldCreateCycle(map, 'a', 'c'), true)
    assert.equal(wouldCreateCycle(map, 'c', 'a'), false)
    assert.equal(wouldCreateCycle(map, 'b', null), false)
  })

  it('buildAreaTree arma raíces y ordena', () => {
    const tree = buildAreaTree([
      { id: '2', nombre: 'B', parentId: '1', orden: 2 },
      { id: '1', nombre: 'A', parentId: null, orden: 1 },
      { id: '3', nombre: 'C', parentId: '1', orden: 1 },
      { id: 'orphan', nombre: 'X', parentId: 'missing', orden: 1 },
    ])
    assert.equal(tree.length, 2)
    assert.equal(tree[0].id, '1')
    assert.equal(tree[0].children.map((c) => c.id).join(','), '3,2')
    assert.equal(tree[1].id, 'orphan')
  })

  it('descendantIds lista subárbol', () => {
    const map = { a: null, b: 'a', c: 'b', d: 'a' }
    const ids = descendantIds(map, 'a').sort()
    assert.deepEqual(ids, ['b', 'c', 'd'])
  })
})
