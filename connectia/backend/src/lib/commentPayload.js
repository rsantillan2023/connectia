/** Helpers puros para comentarios / moderación (testeables sin Mongo). */

export const COMMENT_STATUSES = ['visible', 'pending_review', 'hidden', 'deleted']
export const SUGGESTED_ACTIONS = ['approve', 'hide', 'reply', 'escalate', 'review']

export function sanitizeCommentText(raw) {
  return String(raw || '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, 4000)
}

export function validateCommentCreate({ texto, parentId } = {}) {
  const text = sanitizeCommentText(texto)
  if (!text) return { ok: false, error: 'El comentario no puede estar vacío' }
  if (parentId != null && parentId !== '' && !/^[a-f\d]{24}$/i.test(String(parentId))) {
    return { ok: false, error: 'parentId inválido' }
  }
  return { ok: true, texto: text, parentId: parentId || null }
}

export function mapSuggestedActionToStatus(action) {
  const a = String(action || '').toLowerCase()
  if (a === 'approve') return 'visible'
  if (a === 'hide') return 'hidden'
  if (a === 'escalate' || a === 'review' || a === 'reply') return null
  return null
}

export function applySuggestionPatch(commentLike, action, { adminReply = '', reason = '' } = {}) {
  const a = String(action || commentLike?.moderationAi?.suggestedAction || 'review').toLowerCase()
  const out = {
    status: commentLike.status,
    adminReply: commentLike.adminReply || '',
    rejectionReason: commentLike.rejectionReason || '',
    applied: a,
  }
  if (a === 'approve') {
    out.status = 'visible'
    out.rejectionReason = ''
  } else if (a === 'hide') {
    out.status = 'hidden'
    out.rejectionReason = String(reason || commentLike.moderationAi?.summary || 'Ocultado por moderación').slice(0, 500)
  } else if (a === 'reply') {
    const reply = String(adminReply || commentLike.moderationAi?.draftReply || '').trim()
    if (!reply) return { ok: false, error: 'Falta borrador de respuesta para aplicar la sugerencia' }
    out.status = 'visible'
    out.adminReply = reply.slice(0, 2000)
    out.rejectionReason = ''
  } else if (a === 'escalate' || a === 'review') {
    out.status = 'pending_review'
  } else {
    return { ok: false, error: `Acción sugerida no aplicable: ${a}` }
  }
  return { ok: true, ...out }
}

export function commentListFilter({
  status,
  risk,
  q,
  postId,
  from,
  to,
  suggestionPending,
} = {}) {
  const filter = {}
  if (COMMENT_STATUSES.includes(status)) filter.status = status
  else filter.status = { $ne: 'deleted' }

  if (['low', 'medium', 'high'].includes(risk)) filter['moderationAi.risk'] = risk
  if (postId && /^[a-f\d]{24}$/i.test(String(postId))) filter.postId = postId

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
  }

  if (q) {
    const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ texto: re }, { authorName: re }, { adminReply: re }]
  }

  if (suggestionPending === true || suggestionPending === '1' || suggestionPending === 'true') {
    filter.suggestionIgnored = { $ne: true }
    filter['moderationAi.status'] = 'ready'
    filter['moderationAi.suggestedAction'] = { $nin: ['', 'approve'] }
  }

  return filter
}

export function rowsToCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}

export function defaultModerationWindow(days = 15) {
  const to = new Date()
  const from = new Date(to.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000)
  return { from, to }
}
