/** Jerarquía persona → manager (reporta-a). Sin manager = raíz. */

export function parseManagerId(raw) {
  if (raw == null || raw === '' || raw === false) return null
  const s = String(raw).trim()
  return s || null
}

/**
 * Detecta ciclo si `userId` pasara a reportar a `newManagerId`.
 * @param {Record<string, string|null|undefined>} managerById id → managerId
 * @param {string} userId
 * @param {string|null} newManagerId
 */
export function wouldCreateManagerCycle(managerById, userId, newManagerId) {
  if (!newManagerId) return false
  const self = String(userId)
  let cur = String(newManagerId)
  if (cur === self) return true
  const seen = new Set()
  while (cur) {
    if (cur === self) return true
    if (seen.has(cur)) return true
    seen.add(cur)
    const next = managerById[cur]
    cur = next ? String(next) : ''
  }
  return false
}

/**
 * Árbol de personas por managerId. Huérfanos / manager inválido → raíz.
 * @param {Array<{ id: string, managerId?: string|null, nombre?: string, apellido?: string }>} people
 */
export function buildPeopleTree(people) {
  const list = Array.isArray(people) ? people : []
  const byId = new Map(
    list.map((p) => [
      String(p.id),
      {
        ...p,
        id: String(p.id),
        managerId: p.managerId ? String(p.managerId) : null,
        reports: [],
      },
    ]),
  )
  const roots = []
  for (const node of byId.values()) {
    if (node.managerId && byId.has(node.managerId)) {
      byId.get(node.managerId).reports.push(node)
    } else {
      roots.push(node)
    }
  }
  const byName = (a, b) =>
    String(a.apellido || '').localeCompare(String(b.apellido || '')) ||
    String(a.nombre || '').localeCompare(String(b.nombre || ''))
  const sortRec = (nodes) => {
    nodes.sort(byName)
    for (const n of nodes) sortRec(n.reports)
  }
  sortRec(roots)
  return roots
}

/**
 * Filtra nodos cuyo nombre/cargo/área matchean `q` (case-insensitive).
 * Conserva ancestros necesarios para mostrar el match.
 */
export function filterPeopleTree(roots, q) {
  const needle = String(q || '')
    .trim()
    .toLowerCase()
  if (!needle) return roots

  function matchNode(n) {
    const hay = [n.nombre, n.apellido, n.cargo, n.areaNombre, n.usuario]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  }

  function walk(nodes) {
    const out = []
    for (const n of nodes) {
      const kids = walk(n.reports || [])
      if (matchNode(n) || kids.length) {
        out.push({ ...n, reports: kids })
      }
    }
    return out
  }
  return walk(roots)
}
