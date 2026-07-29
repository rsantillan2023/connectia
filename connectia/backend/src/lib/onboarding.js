/**
 * Motor de onboarding / offboarding (§16).
 * Encuestas: reusa Survey §15 vía surveyId en hitos.
 */

import { MILESTONE_TYPES, TEMPLATE_KINDS } from '../models/OnboardingTemplate.js'
import { INSTANCE_STATUSES, MILESTONE_STATUSES } from '../models/OnboardingInstance.js'

export { MILESTONE_TYPES, TEMPLATE_KINDS, INSTANCE_STATUSES, MILESTONE_STATUSES }

function str(v, max = 200) {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

export function calcProgressPercent(milestones = []) {
  const required = milestones.filter((m) => m.obligatorio !== false)
  const pool = required.length ? required : milestones
  if (!pool.length) return 100
  const done = pool.filter((m) => m.status === 'done' || m.status === 'skipped').length
  return Math.round((done / pool.length) * 100)
}

export function unlockMilestones(milestones = []) {
  const byKey = new Map(milestones.map((m) => [m.key, m]))
  for (const m of milestones) {
    if (m.status === 'done' || m.status === 'skipped') continue
    const deps = Array.isArray(m.dependsOn) ? m.dependsOn : []
    const depsOk = deps.every((k) => {
      const d = byKey.get(k)
      return d && (d.status === 'done' || d.status === 'skipped')
    })
    if (!depsOk) {
      m.status = 'locked'
    } else if (m.status === 'locked') {
      m.status = 'pending'
    }
  }
  return milestones
}

export function serializeMilestone(m) {
  return {
    key: m.key,
    titulo: m.titulo || '',
    descripcion: m.descripcion || '',
    tipo: m.tipo || 'task',
    orden: m.orden ?? 0,
    dependsOn: m.dependsOn || [],
    responsableRole: m.responsableRole || 'colaborador',
    diasLimite: m.diasLimite ?? null,
    surveyId: m.surveyId ? String(m.surveyId) : null,
    contentUrl: m.contentUrl || '',
    contentBody: m.contentBody || '',
    obligatorio: m.obligatorio !== false,
    status: m.status || 'pending',
    completedAt: m.completedAt || null,
    completedBy: m.completedBy ? String(m.completedBy) : null,
    dueAt: m.dueAt || null,
    notes: m.notes || '',
  }
}

export function serializeTemplate(doc) {
  return {
    id: String(doc._id),
    kind: doc.kind || 'onboarding',
    nombre: doc.nombre,
    descripcion: doc.descripcion || '',
    version: doc.version || 1,
    status: doc.status,
    milestones: (doc.milestones || []).map((m) => ({
      key: m.key,
      titulo: m.titulo,
      descripcion: m.descripcion || '',
      tipo: m.tipo || 'task',
      orden: m.orden ?? 0,
      dependsOn: m.dependsOn || [],
      responsableRole: m.responsableRole || 'colaborador',
      diasLimite: m.diasLimite ?? null,
      surveyId: m.surveyId ? String(m.surveyId) : null,
      contentUrl: m.contentUrl || '',
      contentBody: m.contentBody || '',
      obligatorio: m.obligatorio !== false,
    })),
    slaDias: doc.slaDias ?? null,
    authorName: doc.authorName || '',
    publishedAt: doc.publishedAt,
    activo: doc.activo !== false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeInstance(doc, { includeHistory = false } = {}) {
  const milestones = unlockMilestones([...(doc.milestones || []).map((m) => ({ ...m.toObject?.() ?? m }))])
  const progress = calcProgressPercent(milestones)
  return {
    id: String(doc._id),
    kind: doc.kind || 'onboarding',
    templateId: String(doc.templateId),
    templateName: doc.templateName || '',
    templateVersion: doc.templateVersion || 1,
    status: doc.status,
    userId: String(doc.userId),
    userName: doc.userName || '',
    legajoId: doc.legajoId ? String(doc.legajoId) : null,
    progressPercent: progress,
    milestones: milestones.map(serializeMilestone),
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    dueAt: doc.dueAt,
    accessRevokedAt: doc.accessRevokedAt || null,
    history: includeHistory
      ? (doc.history || []).map((h) => ({
          at: h.at,
          actorId: h.actorId ? String(h.actorId) : null,
          actorName: h.actorName || '',
          action: h.action,
          detail: h.detail || '',
        }))
      : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function normalizeMilestoneDefs(raw = []) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  return raw
    .map((m, i) => {
      const key = str(m.key || `m${i + 1}`, 64).replace(/\s+/g, '_') || `m${i + 1}`
      if (seen.has(key)) return null
      seen.add(key)
      const tipo = MILESTONE_TYPES.includes(m.tipo) ? m.tipo : 'task'
      const surveyId = m.surveyId || null
      if (tipo === 'survey' && !surveyId) {
        const err = new Error(`Hito «${key}»: tipo survey requiere surveyId (§15)`)
        err.status = 400
        throw err
      }
      return {
        key,
        titulo: str(m.titulo || key, 200),
        descripcion: str(m.descripcion || '', 2000),
        tipo,
        orden: Number(m.orden) || i + 1,
        dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn.map((d) => str(d, 64)).filter(Boolean) : [],
        responsableRole: str(m.responsableRole || 'colaborador', 40),
        diasLimite: m.diasLimite != null && m.diasLimite !== '' ? Number(m.diasLimite) : null,
        surveyId,
        contentUrl: str(m.contentUrl || '', 500),
        contentBody: str(m.contentBody || '', 8000),
        obligatorio: m.obligatorio !== false,
      }
    })
    .filter(Boolean)
}

export function applyTemplatePatch(doc, body = {}) {
  if (body.nombre != null) doc.nombre = str(body.nombre, 160)
  if (body.descripcion != null) doc.descripcion = str(body.descripcion, 2000)
  if (body.kind != null && TEMPLATE_KINDS.includes(body.kind)) doc.kind = body.kind
  if (body.slaDias != null) doc.slaDias = body.slaDias === '' || body.slaDias == null ? null : Number(body.slaDias)
  if (body.activo != null) doc.activo = Boolean(body.activo)
  if (Array.isArray(body.milestones)) doc.milestones = normalizeMilestoneDefs(body.milestones)
  return doc
}

export function snapshotMilestonesFromTemplate(template, startedAt = new Date()) {
  const list = (template.milestones || []).map((m, i) => {
    const dueAt =
      m.diasLimite != null
        ? new Date(startedAt.getTime() + Number(m.diasLimite) * 86400000)
        : null
    return {
      key: m.key,
      titulo: m.titulo,
      descripcion: m.descripcion || '',
      tipo: m.tipo || 'task',
      orden: m.orden ?? i + 1,
      dependsOn: m.dependsOn || [],
      responsableRole: m.responsableRole || 'colaborador',
      diasLimite: m.diasLimite ?? null,
      surveyId: m.surveyId || null,
      contentUrl: m.contentUrl || '',
      contentBody: m.contentBody || '',
      obligatorio: m.obligatorio !== false,
      status: 'pending',
      completedAt: null,
      completedBy: null,
      dueAt,
      notes: '',
    }
  })
  return unlockMilestones(list)
}

export function originKeyFor({ userId, kind, templateId }) {
  return `${kind}:${String(templateId)}:${String(userId)}`
}

/**
 * Marca hito done si desbloqueado; recalcula progreso y status instancia.
 */
export function completeMilestoneOnDoc(doc, milestoneKey, { actorId, actorName, notes } = {}) {
  const milestones = unlockMilestones([...(doc.milestones || []).map((m) => ({ ...m.toObject?.() ?? m }))])
  const m = milestones.find((x) => x.key === milestoneKey)
  if (!m) {
    const err = new Error('Hito no encontrado')
    err.status = 404
    throw err
  }
  if (m.status === 'locked') {
    const err = new Error('El hito aún está bloqueado por dependencias')
    err.status = 400
    throw err
  }
  if (m.status === 'done' || m.status === 'skipped') {
    return { already: true, progressPercent: calcProgressPercent(milestones) }
  }
  m.status = 'done'
  m.completedAt = new Date()
  m.completedBy = actorId || null
  if (notes) m.notes = str(notes, 1000)
  unlockMilestones(milestones)
  doc.milestones = milestones
  doc.progressPercent = calcProgressPercent(milestones)
  doc.history = doc.history || []
  doc.history.push({
    at: new Date(),
    actorId: actorId || null,
    actorName: actorName || '',
    action: 'milestone_done',
    detail: m.key,
  })
  const allDone = milestones
    .filter((x) => x.obligatorio !== false)
    .every((x) => x.status === 'done' || x.status === 'skipped')
  if (allDone) {
    doc.status = 'completed'
    doc.completedAt = new Date()
    doc.history.push({
      at: new Date(),
      actorId: actorId || null,
      actorName: actorName || '',
      action: 'completed',
      detail: '',
    })
  } else if (doc.status === 'pending') {
    doc.status = 'in_progress'
  }
  return { already: false, progressPercent: doc.progressPercent, completed: doc.status === 'completed' }
}

/**
 * Cierra hitos tipo survey vinculados a surveyId tras responder §15.
 */
export function completeSurveyMilestonesOnDoc(doc, surveyId, { actorId, actorName } = {}) {
  const sid = String(surveyId)
  const milestones = unlockMilestones([...(doc.milestones || []).map((m) => ({ ...m.toObject?.() ?? m }))])
  let changed = false
  for (const m of milestones) {
    if (m.tipo !== 'survey' || !m.surveyId) continue
    if (String(m.surveyId) !== sid) continue
    if (m.status === 'done' || m.status === 'skipped') continue
    if (m.status === 'locked') continue
    m.status = 'done'
    m.completedAt = new Date()
    m.completedBy = actorId || null
    changed = true
    doc.history = doc.history || []
    doc.history.push({
      at: new Date(),
      actorId: actorId || null,
      actorName: actorName || '',
      action: 'survey_milestone_done',
      detail: `${m.key}:${sid}`,
    })
  }
  if (!changed) return { changed: false }
  unlockMilestones(milestones)
  doc.milestones = milestones
  doc.progressPercent = calcProgressPercent(milestones)
  const allDone = milestones
    .filter((x) => x.obligatorio !== false)
    .every((x) => x.status === 'done' || x.status === 'skipped')
  if (allDone) {
    doc.status = 'completed'
    doc.completedAt = new Date()
  }
  return { changed: true, progressPercent: doc.progressPercent, completed: doc.status === 'completed' }
}
