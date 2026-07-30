/** Helpers puros Ola 43 — Portal de servicios. */

export const SERVICIO_TRANSITIONS = {
  recibido: ['en_curso', 'cancelado', 'resuelto'],
  en_curso: ['resuelto', 'cancelado'],
  resuelto: [],
  cancelado: [],
}

export function canTransitionServicio(from, to) {
  const f = String(from || '')
  const t = String(to || '')
  return (SERVICIO_TRANSITIONS[f] || []).includes(t)
}

export function computeSlaDueAt(slaMinutes, fromDate = new Date()) {
  const mins = Number(slaMinutes) || 0
  if (mins <= 0) return null
  const base = fromDate instanceof Date ? fromDate : new Date(fromDate)
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + mins * 60 * 1000)
}

export function isSlaBreached(req, now = new Date()) {
  if (!req) return false
  if (req.slaBreached === true) return true
  const due = req.slaDueAt ? new Date(req.slaDueAt) : null
  if (!due || Number.isNaN(due.getTime())) return false
  const terminal = ['resuelto', 'cancelado'].includes(String(req.status || ''))
  if (terminal) return false
  return due.getTime() < (now instanceof Date ? now : new Date(now)).getTime()
}

export function normalizeFields(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((f) => {
      const key = String(f?.key || '')
        .trim()
        .slice(0, 80)
        .replace(/\s+/g, '_')
      const label = String(f?.label || '').trim().slice(0, 160)
      if (!key || !label) return null
      const type = ['text', 'textarea', 'number', 'select'].includes(f?.type)
        ? f.type
        : 'text'
      const options = Array.isArray(f?.options)
        ? f.options.map((o) => String(o).slice(0, 120)).filter(Boolean).slice(0, 40)
        : []
      return {
        key,
        label,
        type,
        required: !!f?.required,
        options: type === 'select' ? options : [],
      }
    })
    .filter(Boolean)
    .slice(0, 30)
}

export function validateFormAnswers(fields, answers) {
  const defs = Array.isArray(fields) ? fields : []
  const incoming = Array.isArray(answers) ? answers : []
  const map = Object.fromEntries(
    incoming.map((a) => [String(a?.key || ''), String(a?.value ?? '').slice(0, 2000)]),
  )
  const errors = []
  for (const f of defs) {
    const val = (map[f.key] || '').trim()
    if (f.required && !val) {
      errors.push(`Campo obligatorio: ${f.label}`)
      continue
    }
    if (f.type === 'number' && val && Number.isNaN(Number(val))) {
      errors.push(`Número inválido: ${f.label}`)
    }
    if (f.type === 'select' && val && (f.options || []).length && !(f.options || []).includes(val)) {
      errors.push(`Opción inválida: ${f.label}`)
    }
  }
  const normalized = defs.map((f) => ({
    key: f.key,
    value: String(map[f.key] ?? '').slice(0, 2000),
  }))
  return { ok: errors.length === 0, errors, answers: normalized }
}

export function serializeArea(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    name: doc.name,
    color: doc.color || '#0d9488',
    receptorUserIds: (doc.receptorUserIds || []).map(String),
    active: doc.active !== false,
    order: doc.order ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeCatalogItem(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    areaId: doc.areaId ? String(doc.areaId) : null,
    label: doc.label,
    description: doc.description || '',
    active: doc.active !== false,
    order: doc.order ?? 0,
    slaMinutes: doc.slaMinutes ?? 0,
    fields: (doc.fields || []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type || 'text',
      required: !!f.required,
      options: f.options || [],
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeRequest(doc, extras = {}) {
  if (!doc) return null
  const breached = isSlaBreached(doc)
  return {
    id: String(doc._id),
    number: doc.number,
    areaId: doc.areaId ? String(doc.areaId) : null,
    catalogItemId: doc.catalogItemId ? String(doc.catalogItemId) : null,
    status: doc.status,
    formAnswers: (doc.formAnswers || []).map((a) => ({
      key: a.key,
      value: a.value || '',
    })),
    note: doc.note || '',
    internalNotes: doc.internalNotes || '',
    attachments: doc.attachments || [],
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : null,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    slaMinutes: doc.slaMinutes ?? 0,
    slaDueAt: doc.slaDueAt || null,
    slaBreached: breached,
    history: (doc.history || []).map((h) => ({
      at: h.at,
      actorId: h.actorId ? String(h.actorId) : null,
      from: h.from || '',
      to: h.to,
      reason: h.reason || '',
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...extras,
  }
}

export function buildHistoryEntry({ actorId, from, to, reason }) {
  return {
    at: new Date(),
    actorId: actorId || null,
    from: from || '',
    to,
    reason: String(reason || '').slice(0, 500),
  }
}
