/** Jerarquía opcional de áreas (parentId). Sin padre = raíz. */

export function parseParentId(raw) {
  if (raw == null || raw === '' || raw === false) return null
  const s = String(raw).trim()
  return s || null
}

/**
 * @param {Record<string, string|null|undefined>} parentById id → parentId
 * @param {string} areaId
 * @param {string|null} newParentId
 */
export function wouldCreateCycle(parentById, areaId, newParentId) {
  if (!newParentId) return false
  const self = String(areaId)
  let cur = String(newParentId)
  if (cur === self) return true
  const seen = new Set()
  while (cur) {
    if (cur === self) return true
    if (seen.has(cur)) return true
    seen.add(cur)
    const next = parentById[cur]
    cur = next ? String(next) : ''
  }
  return false
}

/**
 * Árbol para organigrama. Ítems sin padre válido quedan como raíz.
 * @param {Array<{ id: string, parentId?: string|null, orden?: number, nombre?: string }>} areas
 */
export function buildAreaTree(areas) {
  const list = Array.isArray(areas) ? areas : []
  const byId = new Map(
    list.map((a) => [
      String(a.id),
      {
        ...a,
        id: String(a.id),
        parentId: a.parentId ? String(a.parentId) : null,
        children: [],
      },
    ]),
  )
  const roots = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  }
  const byOrden = (a, b) => (a.orden ?? 100) - (b.orden ?? 100) || String(a.nombre || '').localeCompare(String(b.nombre || ''))
  const sortRec = (nodes) => {
    nodes.sort(byOrden)
    for (const n of nodes) sortRec(n.children)
  }
  sortRec(roots)
  return roots
}

/** Ids de descendientes (no incluye al propio areaId). */
export function descendantIds(parentById, areaId) {
  const self = String(areaId)
  const childrenOf = new Map()
  for (const [id, pid] of Object.entries(parentById)) {
    if (!pid) continue
    const p = String(pid)
    if (!childrenOf.has(p)) childrenOf.set(p, [])
    childrenOf.get(p).push(String(id))
  }
  const out = []
  const stack = [...(childrenOf.get(self) || [])]
  while (stack.length) {
    const id = stack.pop()
    out.push(id)
    for (const c of childrenOf.get(id) || []) stack.push(c)
  }
  return out
}
