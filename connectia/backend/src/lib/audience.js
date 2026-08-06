import mongoose from 'mongoose'
import { AudienceClient } from '../models/AudienceClient.js'

const ObjectId = mongoose.Types.ObjectId

function toIdStrings(arr) {
  return Array.isArray(arr) ? [...new Set(arr.map((id) => String(id)).filter(Boolean))] : []
}

function toObjectIds(ids) {
  return toIdStrings(ids)
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id))
}

/**
 * Audiencia de una publicación / encuesta / documento.
 * mode:
 *  - all: toda la comunidad
 *  - restricted: áreas y/o grupos, más opcionales userIds puntuales
 *  - users: solo destinatarios puntuales
 *  - none: nadie (no aparece en el muro de miembros)
 */
export function normalizeAudience(raw) {
  const mode = ['restricted', 'users', 'none'].includes(raw?.mode) ? raw.mode : 'all'
  const areaIds = toIdStrings(raw?.areaIds)
  const groupIds = toIdStrings(raw?.groupIds)
  const userIds = toIdStrings(raw?.userIds)
  const clientIds = toIdStrings(raw?.clientIds)

  if (mode === 'all' || mode === 'none') {
    return { mode, areaIds: [], groupIds: [], userIds: [], clientIds: [] }
  }
  if (mode === 'users') {
    return { mode, areaIds: [], groupIds: [], userIds, clientIds: [] }
  }
  return { mode: 'restricted', areaIds, groupIds, userIds, clientIds }
}

/**
 * Filtro Mongo para posts visibles por el usuario (además de tenant + published).
 * `opts.clientIds` (opcional): AudienceClient._id a los que pertenece el usuario
 * (ver `resolveClientIdsForUser`). Si se omite, el matching por cliente queda inerte
 * (compatibilidad hacia atrás — Ola 36-l).
 */
export function audienceFilterForUser(user, opts = {}) {
  const areaId = user?.areaId || null
  const groupIds = Array.isArray(user?.groupIds) ? user.groupIds.filter(Boolean) : []
  const userId = user?._id || null
  const memberClientIds = toIdStrings(opts?.clientIds)

  const clauses = [
    { 'audience.mode': { $exists: false } },
    { 'audience.mode': 'all' },
    { audience: { $exists: false } },
  ]

  const restrictedOr = []
  if (areaId) {
    restrictedOr.push({ 'audience.areaIds': areaId })
  }
  if (groupIds.length) {
    restrictedOr.push({ 'audience.groupIds': { $in: groupIds } })
  }
  if (userId) {
    restrictedOr.push({ 'audience.userIds': userId })
  }
  if (memberClientIds.length) {
    restrictedOr.push({ 'audience.clientIds': { $in: memberClientIds } })
  }

  if (restrictedOr.length) {
    clauses.push({
      'audience.mode': 'restricted',
      $or: restrictedOr,
    })
  }

  if (userId) {
    clauses.push({
      'audience.mode': 'users',
      'audience.userIds': userId,
    })
  }

  return { $or: clauses }
}

/**
 * ¿El usuario pertenece a alguno de los AudienceClient de un tenant?
 * Devuelve los ids de cliente (string) para usar en `audienceFilterForUser` /
 * `userMatchesAudience`. Nunca lanza — devuelve [] si no hay match o hay error.
 */
export async function resolveClientIdsForUser(tenantId, user) {
  try {
    const email = String(user?.email || '').trim().toLowerCase()
    const userId = user?._id || null
    const or = []
    if (userId) or.push({ userIds: userId })
    if (email) or.push({ emails: email })
    if (!tenantId || !or.length) return []
    const clients = await AudienceClient.find({ tenantId, activo: true, $or: or })
      .select('_id')
      .lean()
    return clients.map((c) => String(c._id))
  } catch (e) {
    console.warn('[audience] resolveClientIdsForUser', e?.message || e)
    return []
  }
}

/**
 * Resuelve userIds + emails únicos de un set de AudienceClient (para armar
 * `usersFilterForAudience` en la dirección inversa: audiencia → usuarios).
 */
export async function resolveAudienceClientMembers(tenantId, clientIds) {
  const ids = toObjectIds(clientIds)
  if (!tenantId || !ids.length) return { userIds: [], emails: [] }
  try {
    const clients = await AudienceClient.find({ tenantId, _id: { $in: ids }, activo: true })
      .select('userIds emails')
      .lean()
    const userIds = new Set()
    const emails = new Set()
    for (const c of clients) {
      for (const u of c.userIds || []) userIds.add(String(u))
      for (const e of c.emails || []) emails.add(String(e).trim().toLowerCase())
    }
    return { userIds: [...userIds], emails: [...emails] }
  } catch (e) {
    console.warn('[audience] resolveAudienceClientMembers', e?.message || e)
    return { userIds: [], emails: [] }
  }
}

/**
 * `opts.clientIds` (opcional): AudienceClient._id a los que pertenece `user`
 * (ver `resolveClientIdsForUser`). Sin ese dato, clientIds de la audiencia
 * simplemente no matchean (compatibilidad hacia atrás — Ola 36-l).
 */
export function userMatchesAudience(user, audience, opts = {}) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all') return true
  if (a.mode === 'none') return false

  const userId = user?._id ? String(user._id) : null
  if (userId && a.userIds.includes(userId)) return true

  if (a.mode === 'users') {
    return Boolean(userId && a.userIds.includes(userId))
  }

  // restricted
  if (!a.areaIds.length && !a.groupIds.length && !a.userIds.length && !a.clientIds.length) return false
  const userArea = user?.areaId ? String(user.areaId) : null
  const userGroups = (user?.groupIds || []).map(String)
  if (userArea && a.areaIds.includes(userArea)) return true
  if (userGroups.some((g) => a.groupIds.includes(g))) return true
  if (a.clientIds.length) {
    const memberClientIds = toIdStrings(opts?.clientIds)
    if (memberClientIds.length && a.clientIds.some((id) => memberClientIds.includes(id))) return true
  }
  return false
}

export function userCanSeePost(user, post, opts) {
  return userMatchesAudience(user, post?.audience, opts)
}

export function serializeAudience(audience) {
  const a = normalizeAudience(audience)
  return {
    mode: a.mode,
    areaIds: a.areaIds,
    groupIds: a.groupIds,
    userIds: a.userIds,
    clientIds: a.clientIds,
  }
}

/**
 * Filtro Mongo de usuarios del tenant que pertenecen a la audiencia.
 * `opts.clientUserIds` / `opts.clientEmails` (opcionales, ver
 * `resolveAudienceClientMembers`): miembros resueltos de `audience.clientIds`.
 * Sin ese dato, clientIds queda inerte (compatibilidad hacia atrás — Ola 36-l).
 */
export function usersFilterForAudience(tenantId, audience, opts = {}) {
  const a = normalizeAudience(audience)
  const filter = { tenantId, activo: true }

  if (a.mode === 'all') return filter

  if (a.mode === 'none') {
    filter._id = { $exists: false }
    return filter
  }

  const userObjectIds = toObjectIds(a.userIds)

  if (a.mode === 'users') {
    if (!userObjectIds.length) {
      filter._id = { $exists: false }
      return filter
    }
    filter._id = { $in: userObjectIds }
    return filter
  }

  // restricted: área OR grupo OR user puntual OR miembro de cliente de audiencia
  const or = []
  if (a.areaIds.length) {
    or.push({ areaId: { $in: toObjectIds(a.areaIds) } })
  }
  if (a.groupIds.length) {
    or.push({ groupIds: { $in: toObjectIds(a.groupIds) } })
  }
  if (userObjectIds.length) {
    or.push({ _id: { $in: userObjectIds } })
  }
  if (a.clientIds.length) {
    const clientUserIds = toObjectIds(opts?.clientUserIds)
    const clientEmails = Array.isArray(opts?.clientEmails)
      ? opts.clientEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : []
    if (clientUserIds.length) or.push({ _id: { $in: clientUserIds } })
    if (clientEmails.length) or.push({ email: { $in: clientEmails } })
  }
  if (!or.length) {
    filter._id = { $exists: false }
    return filter
  }
  filter.$or = or
  return filter
}
