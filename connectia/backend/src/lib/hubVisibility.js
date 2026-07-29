/** Default “sin vencimiento práctico” para enlaces del hub. */
export const HUB_DEFAULT_VISIBLE_UNTIL = new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999))

export function defaultVisibleUntil() {
  return new Date(HUB_DEFAULT_VISIBLE_UNTIL.getTime())
}

/** Parsea YYYY-MM-DD o ISO; vacío → default 2099-01-01. */
export function parseVisibleUntil(value) {
  if (value == null || value === '') return defaultVisibleUntil()
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const s = String(value).trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999))
  }
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

export function formatVisibleUntilInput(value) {
  const d = value ? new Date(value) : defaultVisibleUntil()
  if (Number.isNaN(d.getTime())) return '2099-01-01'
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isLinkVisibleNow(link, now = new Date()) {
  const until = link?.visibleUntil ? new Date(link.visibleUntil) : defaultVisibleUntil()
  if (Number.isNaN(until.getTime())) return true
  return until.getTime() >= now.getTime()
}

export function isTemporaryVisibleUntil(value) {
  const d = value ? new Date(value) : defaultVisibleUntil()
  if (Number.isNaN(d.getTime())) return false
  return formatVisibleUntilInput(d) !== '2099-01-01'
}

/**
 * ¿El grupo debe listarse en una superficie de la app?
 * - hub (/accesos): requiere activo
 * - muro (franja del feed): requiere activo y showOnMuro !== false
 */
export function categoryVisibleOnSurface(cat, surface = 'hub') {
  if (!cat || cat.activo === false) return false
  if (surface === 'muro' && cat.showOnMuro === false) return false
  return true
}
