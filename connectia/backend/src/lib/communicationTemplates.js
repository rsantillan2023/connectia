/**
 * Motor de plantillas de comunicaciones — puro, testeable sin DB.
 * Placeholders: {{nombre}}, {{apellido}}, {{email}}, {{nombreEmpresa}}, etc.
 */

export const DEFAULT_PLACEHOLDERS = [
  'nombre',
  'apellido',
  'nombreCompleto',
  'email',
  'telefono',
  'cargo',
  'nombreEmpresa',
  'fecha',
]

/**
 * @param {string} template
 * @param {Record<string, string|number|null|undefined>} data
 */
export function renderTemplate(template, data = {}) {
  const src = String(template ?? '')
  return src.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const v = data[key]
    if (v === null || v === undefined) return ''
    return String(v)
  })
}

/**
 * @param {object} user
 * @param {{ brandName?: string, fecha?: string }} extras
 */
export function buildPlaceholderData(user = {}, extras = {}) {
  const nombre = String(user.nombre || '').trim()
  const apellido = String(user.apellido || '').trim()
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ') || String(user.usuario || '')
  const fecha =
    extras.fecha ||
    new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  return {
    nombre,
    apellido,
    nombreCompleto,
    email: String(user.email || '').trim(),
    telefono: String(user.telefono || '').trim(),
    cargo: String(user.cargo || '').trim(),
    nombreEmpresa: String(extras.brandName || 'Connectia').trim(),
    fecha,
    usuario: String(user.usuario || '').trim(),
  }
}

/**
 * Clave de idempotencia: evento + destinatario + plantilla (+ canal).
 * @param {{ tenantId: string, channel: string, recipient: string, templateId?: string, batchId?: string, userId?: string }} p
 */
export function buildIdempotencyKey(p) {
  const parts = [
    String(p.tenantId || ''),
    String(p.channel || ''),
    String(p.recipient || '').toLowerCase(),
    String(p.templateId || ''),
    String(p.batchId || ''),
    String(p.userId || ''),
  ]
  return parts.join('|').slice(0, 240)
}

export function sanitizeErrorMessage(msg) {
  const s = String(msg || '').slice(0, 400)
  return s
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/token[=:]\s*\S+/gi, 'token=[redacted]')
    .replace(/password[=:]\s*\S+/gi, 'password=[redacted]')
}

export function normalizePhoneE164(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  return digits
}
