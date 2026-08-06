/** Helpers puros Ola 43 — Portal de servicios. */
import { normalizeAudience, serializeAudience } from './audience.js'

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

export function normalizeKeywords(raw) {
  if (!Array.isArray(raw)) return []
  return [
    ...new Set(
      raw
        .map((k) => String(k || '').trim().toLowerCase().slice(0, 60))
        .filter(Boolean),
    ),
  ].slice(0, 30)
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
    if (
      f.type === 'select' &&
      val &&
      (f.options || []).length &&
      !(f.options || []).includes(val)
    ) {
      errors.push(`Opción inválida: ${f.label}`)
    }
  }
  const normalized = defs.map((f) => ({
    key: f.key,
    value: String(map[f.key] ?? '').slice(0, 2000),
  }))
  return { ok: errors.length === 0, errors, answers: normalized }
}

export function validateCsat(raw) {
  const score = Number(raw?.score)
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return { ok: false, error: 'Calificación 1–5 requerida' }
  }
  return {
    ok: true,
    csat: {
      score: Math.round(score),
      comment: String(raw?.comment || '').slice(0, 1000),
      ratedAt: new Date(),
    },
  }
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

/**
 * Enrutamiento heurístico: sugiere ítems del catálogo desde texto libre.
 * @returns {{ suggestions: Array<{ itemId, label, areaId, score, reason }> }}
 */
export function heuristicServiceFromText(prompt, catalogItems = [], areas = []) {
  const tokens = tokenize(prompt)
  if (!tokens.length) return { suggestions: [] }
  const areaName = Object.fromEntries(
    (areas || []).map((a) => [String(a.id || a._id), a.name || '']),
  )
  const scored = []
  for (const item of catalogItems || []) {
    if (item.active === false) continue
    const bag = tokenize(
      [
        item.label,
        item.description,
        ...(item.keywords || []),
        areaName[String(item.areaId)] || '',
      ].join(' '),
    )
    if (!bag.length) continue
    let score = 0
    const hits = []
    for (const t of tokens) {
      if (bag.includes(t)) {
        score += t.length >= 5 ? 3 : 2
        hits.push(t)
      } else if (bag.some((b) => b.startsWith(t) || t.startsWith(b))) {
        score += 1
        hits.push(t)
      }
    }
    if (score <= 0) continue
    scored.push({
      itemId: String(item.id || item._id),
      label: item.label,
      areaId: item.areaId ? String(item.areaId) : null,
      score,
      reason: hits.slice(0, 5).join(', '),
    })
  }
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  return { suggestions: scored.slice(0, 5) }
}

export function aggregateServiciosReport(requests = []) {
  const byStatus = {}
  const byArea = {}
  const byCatalog = {}
  let slaBreached = 0
  let csatSum = 0
  let csatCount = 0
  const csatDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  for (const r of requests || []) {
    const st = String(r.status || 'otro')
    byStatus[st] = (byStatus[st] || 0) + 1
    const area = String(r.areaId || 'sin_area')
    byArea[area] = (byArea[area] || 0) + 1
    const cat = String(r.catalogItemId || 'sin_item')
    byCatalog[cat] = (byCatalog[cat] || 0) + 1
    if (isSlaBreached(r)) slaBreached++
    const score = Number(r.csat?.score)
    if (Number.isFinite(score) && score >= 1 && score <= 5) {
      csatSum += score
      csatCount++
      csatDist[Math.round(score)] = (csatDist[Math.round(score)] || 0) + 1
    }
  }

  return {
    total: (requests || []).length,
    byStatus,
    byArea,
    byCatalog,
    slaBreached,
    csat: {
      count: csatCount,
      average: csatCount ? Math.round((csatSum / csatCount) * 100) / 100 : null,
      distribution: csatDist,
    },
  }
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
    keywords: doc.keywords || [],
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
    audience: serializeAudience(doc.audience || { mode: 'all' }),
    requireApproval: !!doc.requireApproval,
    createJiraIssue: !!doc.createJiraIssue,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeRequest(doc, extras = {}) {
  if (!doc) return null
  const breached = isSlaBreached(doc)
  const csat = doc.csat || {}
  const jira = doc.jiraSync || {}
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
    csat: {
      score: csat.score ?? null,
      comment: csat.comment || '',
      ratedAt: csat.ratedAt || null,
    },
    jiraSync: {
      status: jira.status || '',
      issueKey: jira.issueKey || '',
      issueUrl: jira.issueUrl || '',
      error: jira.error || '',
      at: jira.at || null,
    },
    workflowStarted: !!doc.workflowStarted,
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

export function serializeFeedback(doc) {
  if (!doc) return null
  return {
    id: String(doc._id),
    catalogItemId: doc.catalogItemId ? String(doc.catalogItemId) : null,
    areaId: doc.areaId ? String(doc.areaId) : null,
    text: doc.text || '',
    status: doc.status || 'pendiente',
    adminNote: doc.adminNote || '',
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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

export { normalizeAudience }
