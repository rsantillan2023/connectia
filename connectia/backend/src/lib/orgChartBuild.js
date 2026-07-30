/**
 * Arma payload de organigrama (áreas + personas) para U/A.
 */

import { OrgArea } from '../models/OrgArea.js'
import { User } from '../models/User.js'
import { buildAreaTree } from './orgAreaHierarchy.js'
import { buildPeopleTree, filterPeopleTree } from './orgPeopleHierarchy.js'
import { toPublicMediaUrl } from './mediaUrl.js'

function displayName(u) {
  const n = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
  return n || u.usuario || 'Sin nombre'
}

/**
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {{ q?: string, includeInactive?: boolean }} [opts]
 */
export async function buildOrgChart(tenantId, opts = {}) {
  const includeInactive = opts.includeInactive === true
  const areaFilter = { tenantId }
  if (!includeInactive) areaFilter.activo = true

  const userFilter = { tenantId }
  if (!includeInactive) userFilter.activo = true

  const [areas, users] = await Promise.all([
    OrgArea.find(areaFilter).sort({ orden: 1, nombre: 1 }).lean(),
    User.find(userFilter)
      .select('nombre apellido usuario cargo avatarUrl areaId managerId activo')
      .lean(),
  ])

  const areaById = Object.fromEntries(areas.map((a) => [String(a._id), a]))

  const areaNodes = areas.map((a) => ({
    id: String(a._id),
    key: a.key,
    nombre: a.nombre,
    descripcion: a.descripcion || '',
    parentId: a.parentId ? String(a.parentId) : null,
    orden: a.orden ?? 100,
    activo: a.activo !== false,
    memberCount: users.filter((u) => u.areaId && String(u.areaId) === String(a._id)).length,
  }))

  const people = users.map((u) => {
    const area = u.areaId ? areaById[String(u.areaId)] : null
    return {
      id: String(u._id),
      usuario: u.usuario || '',
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      displayName: displayName(u),
      cargo: u.cargo || '',
      avatarUrl: toPublicMediaUrl(u.avatarUrl || ''),
      areaId: u.areaId ? String(u.areaId) : null,
      areaNombre: area?.nombre || '',
      managerId: u.managerId ? String(u.managerId) : null,
      activo: u.activo !== false,
    }
  })

  let peopleTree = buildPeopleTree(people)
  const q = String(opts.q || '').trim()
  if (q) peopleTree = filterPeopleTree(peopleTree, q)

  const areasTree = buildAreaTree(areaNodes)

  return {
    areas: {
      items: areaNodes,
      tree: areasTree,
      hasHierarchy: areaNodes.some((a) => a.parentId),
    },
    people: {
      items: people,
      tree: peopleTree,
      hasHierarchy: people.some((p) => p.managerId),
      total: people.length,
    },
    meta: {
      q: q || null,
      includeInactive,
    },
  }
}
