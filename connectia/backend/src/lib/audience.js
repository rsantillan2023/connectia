import mongoose from 'mongoose'

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

  if (mode === 'all' || mode === 'none') {
    return { mode, areaIds: [], groupIds: [], userIds: [] }
  }
  if (mode === 'users') {
    return { mode, areaIds: [], groupIds: [], userIds }
  }
  return { mode: 'restricted', areaIds, groupIds, userIds }
}

/** Filtro Mongo para posts visibles por el usuario (además de tenant + published). */
export function audienceFilterForUser(user) {
  const areaId = user?.areaId || null
  const groupIds = Array.isArray(user?.groupIds) ? user.groupIds.filter(Boolean) : []
  const userId = user?._id || null

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

export function userMatchesAudience(user, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all') return true
  if (a.mode === 'none') return false

  const userId = user?._id ? String(user._id) : null
  if (userId && a.userIds.includes(userId)) return true

  if (a.mode === 'users') {
    return Boolean(userId && a.userIds.includes(userId))
  }

  // restricted
  if (!a.areaIds.length && !a.groupIds.length && !a.userIds.length) return false
  const userArea = user?.areaId ? String(user.areaId) : null
  const userGroups = (user?.groupIds || []).map(String)
  if (userArea && a.areaIds.includes(userArea)) return true
  if (userGroups.some((g) => a.groupIds.includes(g))) return true
  return false
}

export function userCanSeePost(user, post) {
  return userMatchesAudience(user, post?.audience)
}

export function serializeAudience(audience) {
  const a = normalizeAudience(audience)
  return {
    mode: a.mode,
    areaIds: a.areaIds,
    groupIds: a.groupIds,
    userIds: a.userIds,
  }
}

/** Filtro Mongo de usuarios del tenant que pertenecen a la audiencia. */
export function usersFilterForAudience(tenantId, audience) {
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

  // restricted: área OR grupo OR user puntual
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
  if (!or.length) {
    filter._id = { $exists: false }
    return filter
  }
  filter.$or = or
  return filter
}
