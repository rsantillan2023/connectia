/**
 * Helpers TeamScope — Ola 32 (resolución de miembros + audiencia).
 */
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { SupClienteSala } from '../models/Supervision.js'
import { TeamScope } from '../models/TeamScope.js'

const ObjectId = mongoose.Types.ObjectId

export const TEAM_MODULES = Object.freeze([
  'muro',
  'eventos',
  'notif',
  'encuestas',
  'docs',
  'chat',
  'beneficios',
  'reconocimientos',
])

export function normalizeTeamSource(raw = {}) {
  const toIds = (arr) =>
    [...new Set((Array.isArray(arr) ? arr : []).map(String).filter((id) => ObjectId.isValid(id)))]
  return {
    areaIds: toIds(raw.areaIds),
    groupIds: toIds(raw.groupIds),
    userIds: toIds(raw.userIds),
    clientIds: toIds(raw.clientIds),
    areaClientIntersect: Boolean(raw.areaClientIntersect),
  }
}

export function audienceFromMemberIds(memberIds = []) {
  const userIds = [...new Set((memberIds || []).map(String).filter((id) => ObjectId.isValid(id)))]
  return {
    mode: 'users',
    areaIds: [],
    groupIds: [],
    userIds,
  }
}

/** Fuerza audience de equipo; ignora mode all del cliente. */
export function forceTeamAudience(memberIds) {
  const a = audienceFromMemberIds(memberIds)
  if (!a.userIds.length) {
    return { ok: false, error: 'El equipo no tiene miembros resueltos' }
  }
  return { ok: true, audience: a }
}

export function assertMemberInScope(scope, userId) {
  const id = String(userId || '')
  return (scope?.memberIds || []).map(String).includes(id)
}

/**
 * Subcaps opcionales: si existen en el tenant se respetan;
 * si no, con `supervision.equipo` valen los allowedModules del scope.
 */
export function moduleAllowed(scope, moduleKey, tenantCaps = []) {
  const mods = scope?.allowedModules?.length ? scope.allowedModules : ['muro', 'eventos', 'notif']
  if (!mods.includes(moduleKey)) return false
  if (!tenantCaps.includes('supervision.equipo') && !tenantCaps.some((c) => String(c).startsWith('supervision.equipo'))) {
    return false
  }
  const need = `supervision.equipo.${moduleKey === 'notif' ? 'notif' : moduleKey}`
  const subcaps = tenantCaps.filter((c) => String(c).startsWith('supervision.equipo.'))
  if (!subcaps.length) return true
  return tenantCaps.includes(need) || tenantCaps.includes('supervision.equipo')
}

async function userIdsByArea(tenantId, areaIds) {
  if (!areaIds.length) return new Set()
  const users = await User.find({ tenantId, activo: true, areaId: { $in: areaIds } })
    .select('_id')
    .lean()
  return new Set(users.map((u) => String(u._id)))
}

async function userIdsByGroup(tenantId, groupIds) {
  if (!groupIds.length) return new Set()
  const users = await User.find({ tenantId, activo: true, groupIds: { $in: groupIds } })
    .select('_id')
    .lean()
  return new Set(users.map((u) => String(u._id)))
}

async function userIdsByExplicit(tenantId, userIds) {
  if (!userIds.length) return new Set()
  const users = await User.find({ tenantId, activo: true, _id: { $in: userIds } })
    .select('_id')
    .lean()
  return new Set(users.map((u) => String(u._id)))
}

async function userIdsByClients(tenantId, clientIds) {
  if (!clientIds.length) return new Set()
  const links = await SupClienteSala.find({
    tenantId,
    clienteId: { $in: clientIds },
    activo: true,
  })
    .select('colaboradores')
    .lean()
  const ids = new Set()
  for (const link of links) {
    for (const c of link.colaboradores || []) {
      if (c.userId) ids.add(String(c.userId))
    }
  }
  return ids
}

/**
 * Resuelve memberIds a partir de source.
 * Default: unión de todas las fuentes.
 * Con areaClientIntersect + áreas + clientes: (área ∩ cliente) ∪ grupos ∪ personas.
 */
export async function resolveTeamScopeMembers(tenantId, sourceInput) {
  const source = normalizeTeamSource(sourceInput)
  const areaSet = await userIdsByArea(tenantId, source.areaIds)
  const groupSet = await userIdsByGroup(tenantId, source.groupIds)
  const userSet = await userIdsByExplicit(tenantId, source.userIds)
  const clientSet = await userIdsByClients(tenantId, source.clientIds)

  const memberSet = new Set()

  if (source.areaClientIntersect && source.areaIds.length && source.clientIds.length) {
    for (const id of areaSet) {
      if (clientSet.has(id)) memberSet.add(id)
    }
    for (const id of groupSet) memberSet.add(id)
    for (const id of userSet) memberSet.add(id)
  } else {
    for (const id of areaSet) memberSet.add(id)
    for (const id of groupSet) memberSet.add(id)
    for (const id of userSet) memberSet.add(id)
    for (const id of clientSet) memberSet.add(id)
  }

  const memberIds = [...memberSet].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  return { memberIds, memberCount: memberIds.length, source }
}

export async function refreshTeamScope(doc) {
  const { memberIds, memberCount, source } = await resolveTeamScopeMembers(doc.tenantId, doc.source)
  doc.source = {
    areaIds: source.areaIds,
    groupIds: source.groupIds,
    userIds: source.userIds,
    clientIds: source.clientIds,
    areaClientIntersect: source.areaClientIntersect,
  }
  doc.memberIds = memberIds
  doc.memberCount = memberCount
  doc.resolvedAt = new Date()
  await doc.save()
  return doc
}

/** Equipos donde el usuario es miembro (vista supervisado). */
export async function teamsContainingMember(tenantId, userId) {
  return TeamScope.find({
    tenantId,
    activo: true,
    memberIds: userId,
  })
    .select('nombre supervisorId memberCount')
    .lean()
}

export async function loadScopeForSupervisor(tenantId, scopeId, supervisorId, { admin = false } = {}) {
  const q = { _id: scopeId, tenantId, activo: true }
  if (!admin) q.supervisorId = supervisorId
  return TeamScope.findOne(q)
}
