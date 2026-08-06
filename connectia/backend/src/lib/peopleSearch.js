/**
 * Búsqueda de colegas del tenant (picker U/A).
 */
import { User } from '../models/User.js'

export function displayName(user) {
  if (!user) return ''
  return [user.nombre, user.apellido].filter(Boolean).join(' ') || user.usuario || ''
}

export function serializePersonBrief(u) {
  if (!u) return null
  return {
    id: String(u._id),
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    usuario: u.usuario || '',
    email: u.email || '',
    displayName: displayName(u),
  }
}

/**
 * @param {object} opts
 * @param {import('mongoose').Types.ObjectId|string} opts.tenantId
 * @param {import('mongoose').Types.ObjectId|string} [opts.excludeUserId]
 * @param {string} [opts.q]
 * @param {number} [opts.limit]
 */
export async function searchTenantPeople({ tenantId, excludeUserId = null, q = '', limit = 40 }) {
  const filter = { tenantId, activo: true }
  if (excludeUserId) filter._id = { $ne: excludeUserId }
  const query = String(q || '').trim()
  if (query) {
    const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ nombre: rx }, { apellido: rx }, { usuario: rx }, { email: rx }]
  }
  const users = await User.find(filter)
    .select('nombre apellido usuario email')
    .sort({ nombre: 1, usuario: 1 })
    .limit(Math.min(80, Math.max(1, Number(limit) || 40)))
    .lean()
  return users.map(serializePersonBrief)
}
