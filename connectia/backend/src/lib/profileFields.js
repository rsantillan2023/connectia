/** Campos adicionales de perfil (§3.04) — definición por tenant. */

export const PROFILE_FIELD_TYPES = ['text', 'date', 'list', 'file']

export function normalizeFieldKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64)
}

export function serializeFieldDef(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    key: doc.key,
    nombre: doc.nombre || '',
    tipo: PROFILE_FIELD_TYPES.includes(doc.tipo) ? doc.tipo : 'text',
    obligatorio: Boolean(doc.obligatorio),
    opciones: Array.isArray(doc.opciones) ? doc.opciones.map(String) : [],
    orden: Number(doc.orden) || 100,
    activo: doc.activo !== false,
    descripcion: doc.descripcion || '',
  }
}

/**
 * Valida y normaliza un valor según la definición.
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
export function coerceFieldValue(def, raw) {
  const tipo = def?.tipo || 'text'
  if (raw == null || raw === '') {
    if (def?.obligatorio) return { ok: false, error: `«${def.nombre || def.key}» es obligatorio` }
    return { ok: true, value: null }
  }

  if (tipo === 'text') {
    const v = String(raw).trim().slice(0, 2000)
    if (def.obligatorio && !v) return { ok: false, error: `«${def.nombre}» es obligatorio` }
    return { ok: true, value: v }
  }

  if (tipo === 'date') {
    const s = String(raw).trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: `Fecha inválida en «${def.nombre}»` }
    return { ok: true, value: s }
  }

  if (tipo === 'list') {
    const v = String(raw).trim()
    const opts = Array.isArray(def.opciones) ? def.opciones.map(String) : []
    if (opts.length && !opts.includes(v)) {
      return { ok: false, error: `Opción inválida en «${def.nombre}»` }
    }
    return { ok: true, value: v }
  }

  if (tipo === 'file') {
    const v = String(raw).trim().slice(0, 500)
    if (v && !/^https?:\/\//i.test(v) && !v.startsWith('/uploads/')) {
      return { ok: false, error: `URL de archivo inválida en «${def.nombre}»` }
    }
    return { ok: true, value: v || null }
  }

  return { ok: true, value: String(raw).trim().slice(0, 2000) }
}

/** Aplica mapa de valores contra defs activas. */
export function validateExtraFieldsPayload(defs, payload) {
  const src = payload && typeof payload === 'object' ? payload : {}
  const out = {}
  const errors = []
  for (const def of defs) {
    if (def.activo === false) continue
    const raw = src[def.key]
    const r = coerceFieldValue(def, raw)
    if (!r.ok) errors.push(r.error)
    else if (r.value != null) out[def.key] = r.value
  }
  return { ok: !errors.length, values: out, errors }
}

export function extraFieldsToObject(mapLike) {
  if (!mapLike) return {}
  if (typeof mapLike.entries === 'function') {
    return Object.fromEntries([...mapLike.entries()])
  }
  return { ...mapLike }
}

/** Plataforma heurística desde userAgent. */
export function platformFromUa(ua) {
  const s = String(ua || '').toLowerCase()
  if (!s) return 'desconocido'
  if (s.includes('android')) return 'Android'
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'iOS'
  if (s.includes('windows')) return 'Windows'
  if (s.includes('mac os') || s.includes('macintosh')) return 'macOS'
  if (s.includes('linux')) return 'Linux'
  return 'Web'
}

export function serializeDevice(sub, index = 0) {
  return {
    id: String(index),
    endpoint: sub.endpoint || '',
    endpointHint: String(sub.endpoint || '').slice(-24),
    platform: platformFromUa(sub.userAgent),
    userAgent: sub.userAgent || '',
    createdAt: sub.createdAt || null,
    lastSeen: sub.lastSeen || sub.createdAt || null,
  }
}
