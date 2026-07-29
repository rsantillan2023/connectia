/** Normaliza config UGC del tenant. */
export function normalizeUgc(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: Boolean(src.enabled),
    requireApproval: src.requireApproval !== false,
  }
}

export function authorDisplayName(user) {
  if (!user) return 'Miembro'
  const full = [user.nombre, user.apellido].filter(Boolean).join(' ').trim()
  return full || user.usuario || 'Miembro'
}
