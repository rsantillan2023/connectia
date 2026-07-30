/** Helpers puros §26 FAQs/Tutoriales + §40 Políticas (sin DB). */

export const HELP_STATUSES = ['draft', 'published', 'archived']

export function normalizeHelpStatus(raw, fallback = 'draft') {
  return HELP_STATUSES.includes(raw) ? raw : fallback
}

export function normalizeKeywords(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean))].slice(0, 40)
  }
  if (typeof raw === 'string') {
    return [
      ...new Set(
        raw
          .split(/[,;|]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 40)
  }
  return []
}

export function normalizeTutorialSteps(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((s, i) => ({
      orden: Number.isFinite(Number(s?.orden)) ? Number(s.orden) : i + 1,
      titulo: String(s?.titulo || '').trim().slice(0, 160),
      cuerpo: String(s?.cuerpo || s?.texto || '').trim().slice(0, 8000),
      mediaUrl: String(s?.mediaUrl || '').trim().slice(0, 800),
      mediaType: ['image', 'video', 'none'].includes(s?.mediaType) ? s.mediaType : s?.mediaUrl ? 'image' : 'none',
    }))
    .filter((s) => s.titulo || s.cuerpo || s.mediaUrl)
    .slice(0, 40)
}

/** Deep link relativo para push / chatbot / hub. */
export function deepLinkFor(kind, id) {
  const sid = String(id || '').trim()
  if (!sid) return '/'
  if (kind === 'faq') return `/ayuda/faq/${sid}`
  if (kind === 'tutorial') return `/ayuda/tutorial/${sid}`
  if (kind === 'policy') return `/politicas/${sid}`
  if (kind === 'document') return `/docs`
  return '/'
}

/**
 * Documento listo para indexar en la KB del bot (Ola 12).
 * Solo contenido published debe indexarse.
 */
export function buildKbDocument({ kind, doc }) {
  const id = doc?._id ? String(doc._id) : String(doc?.id || '')
  const status = normalizeHelpStatus(doc?.status, 'draft')
  let title = ''
  let body = ''
  let tags = []

  if (kind === 'faq') {
    title = String(doc?.pregunta || '').trim()
    body = String(doc?.respuesta || '').trim()
    tags = normalizeKeywords(doc?.keywords)
  } else if (kind === 'tutorial') {
    title = String(doc?.titulo || '').trim()
    const steps = normalizeTutorialSteps(doc?.steps || doc?.pasos)
    body = [String(doc?.descripcion || '').trim(), ...steps.map((s, i) => `${i + 1}. ${s.titulo}: ${s.cuerpo}`)]
      .filter(Boolean)
      .join('\n')
    tags = normalizeKeywords(doc?.keywords)
    if (doc?.moduloRelacionado) tags = [...new Set([...tags, String(doc.moduloRelacionado).toLowerCase()])]
  } else if (kind === 'policy') {
    title = String(doc?.titulo || '').trim()
    body = String(doc?.cuerpo || '').trim()
    tags = normalizeKeywords(doc?.keywords)
    if (doc?.codigo) tags = [...new Set([...tags, String(doc.codigo).toLowerCase()])]
  } else if (kind === 'document') {
    title = String(doc?.titulo || '').trim()
    body = [
      String(doc?.descripcion || '').trim(),
      doc?.category ? `Categoría: ${doc.category}` : '',
      doc?.fileName ? `Archivo: ${doc.fileName}` : '',
      doc?.fileUrl ? `Descarga: ${doc.fileUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    tags = normalizeKeywords([doc?.category, doc?.fileType, 'documento', 'docs'].filter(Boolean))
  }

  return {
    sourceKind: kind,
    sourceId: id,
    tenantId: doc?.tenantId ? String(doc.tenantId) : '',
    title,
    body,
    tags,
    category: String(doc?.category || '').trim(),
    version: kind === 'policy' ? String(doc?.version || '1') : undefined,
    href: deepLinkFor(kind, id),
    status,
    indexable: status === 'published',
  }
}

/** ¿El acuse cubre la versión vigente? */
export function ackCoversVersion(acks, userId, version) {
  const uid = String(userId || '')
  const ver = String(version || '')
  if (!uid || !ver) return false
  const list = Array.isArray(acks) ? acks : []
  return list.some((a) => String(a.userId) === uid && String(a.version) === ver)
}

/**
 * Valida acuse de política.
 * Regla §40: no aceptar sin haber abierto el contenido (opened === true).
 */
export function validatePolicyAck({ opened, version, currentVersion, alreadyAcked }) {
  if (alreadyAcked) return { ok: false, status: 409, error: 'Ya aceptaste esta versión' }
  if (!opened) return { ok: false, status: 400, error: 'Debés abrir la política antes de aceptar' }
  if (String(version || '') !== String(currentVersion || '')) {
    return { ok: false, status: 409, error: 'La versión cambió; volvé a leer la política vigente' }
  }
  return { ok: true }
}

export function bumpPolicyVersion(current) {
  const raw = String(current || '1').trim()
  const n = Number(raw)
  if (Number.isFinite(n) && String(n) === raw) return String(n + 1)
  const m = raw.match(/^(\d+)(.*)$/)
  if (m) return `${Number(m[1]) + 1}${m[2] || ''}`
  return `${raw}.1`
}

export function helpSearchClause(q, fields) {
  const term = String(q || '').trim()
  if (!term) return null
  const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  return { $or: fields.map((f) => ({ [f]: rx })) }
}

export function complianceStats({ invited, acked }) {
  const invitedN = Math.max(0, Number(invited) || 0)
  const ackedN = Math.max(0, Number(acked) || 0)
  const pending = Math.max(0, invitedN - ackedN)
  const rate = invitedN ? Math.round((ackedN / invitedN) * 1000) / 10 : null
  return { invited: invitedN, acked: ackedN, pending, rate }
}
