import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { Role } from '../models/Role.js'
import { ADMIN_SCREEN_IDS, isAdminScreenCapability } from '../constants/adminCapabilities.js'

export function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TTL || '15m',
  })
}

export function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TTL || '30d',
  })
}

export async function resolveRoleCapabilities(user) {
  const ids = user?.roleIds || []
  if (!ids.length) return []
  const roles = await Role.find({
    tenantId: user.tenantId,
    _id: { $in: ids },
    activo: { $ne: false },
  })
    .select('capabilities')
    .lean()
  return roles.flatMap((r) => r.capabilities || [])
}

export function userCapabilities(user, tenant) {
  const roleCaps = user?.__roleCaps || []
  return [...new Set([...(tenant?.capabilities || []), ...(user?.capabilities || []), ...roleCaps])]
}

export function isFullAdmin(user) {
  const roles = user?.roles || []
  return roles.includes('admin') || roles.includes('platform')
}

export function hasAdminScreenAccess(user) {
  if (isFullAdmin(user)) return true
  const caps = [...(user?.capabilities || []), ...(user?.__roleCaps || [])]
  return caps.some(isAdminScreenCapability)
}

export function hasCapability(user, tenant, ...needed) {
  if (isFullAdmin(user)) return true
  if (!needed.length) return hasAdminScreenAccess(user)
  const caps = new Set(userCapabilities(user, tenant))
  return needed.some((c) => caps.has(c))
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    const user = await User.findById(decoded.sub)
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }
    const tenant = await Tenant.findById(user.tenantId)
    if (!tenant || !tenant.activo) {
      return res.status(401).json({ error: 'Tenant inactivo' })
    }
    user.__roleCaps = await resolveRoleCapabilities(user)
    req.user = user
    req.tenant = tenant
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

/** Acceso al panel admin: admin completo o staff con al menos un permiso de pantalla. */
export function requireAdmin(req, res, next) {
  if (hasAdminScreenAccess(req.user)) return next()
  return res.status(403).json({ error: 'Se requiere acceso al admin' })
}

/** Solo administradores del tenant (pueden otorgar permisos). */
export function requireFullAdmin(req, res, next) {
  if (isFullAdmin(req.user)) return next()
  return res.status(403).json({ error: 'Se requiere rol admin del tenant' })
}

/** Admin completo o alguna de las capabilities indicadas. */
export function requireCapability(...caps) {
  const needed = caps.length ? caps : ADMIN_SCREEN_IDS
  return (req, res, next) => {
    if (hasCapability(req.user, req.tenant, ...needed)) return next()
    return res.status(403).json({ error: `Se requiere permiso: ${needed.join(' o ')}` })
  }
}

/** Superadmin de plataforma: rol platform o capability platform.admin */
export function requirePlatformAdmin(req, res, next) {
  const roles = req.user?.roles || []
  const caps = new Set(userCapabilities(req.user, req.tenant))
  if (roles.includes('platform') || caps.has('platform.admin')) {
    return next()
  }
  return res.status(403).json({ error: 'Se requiere admin de plataforma' })
}

export function isPlatformUser(user, tenant) {
  const roles = user?.roles || []
  const caps = new Set(userCapabilities(user, tenant))
  return roles.includes('platform') || caps.has('platform.admin')
}
