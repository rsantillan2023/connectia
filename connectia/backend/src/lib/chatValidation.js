/**
 * Helpers puros de Chat §8 (testeables sin Mongo).
 */

export const DEFAULT_CHAT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
]

export const DEFAULT_CHAT_CONFIG = {
  retentionDays: 365,
  allowGroups: true,
  allowAttachments: true,
  maxAttachmentMb: 15,
  mimeAllowlist: [...DEFAULT_CHAT_MIME],
  maxGroupMembers: 50,
}

export function normalizeChatConfig(raw) {
  const base = { ...DEFAULT_CHAT_CONFIG }
  if (!raw || typeof raw !== 'object') return base
  if (typeof raw.retentionDays === 'number' && raw.retentionDays >= 0) {
    base.retentionDays = Math.min(3650, Math.floor(raw.retentionDays))
  }
  if (typeof raw.allowGroups === 'boolean') base.allowGroups = raw.allowGroups
  if (typeof raw.allowAttachments === 'boolean') base.allowAttachments = raw.allowAttachments
  if (typeof raw.maxAttachmentMb === 'number' && raw.maxAttachmentMb > 0) {
    base.maxAttachmentMb = Math.min(50, Math.floor(raw.maxAttachmentMb))
  }
  if (typeof raw.maxGroupMembers === 'number' && raw.maxGroupMembers >= 2) {
    base.maxGroupMembers = Math.min(200, Math.floor(raw.maxGroupMembers))
  }
  if (Array.isArray(raw.mimeAllowlist) && raw.mimeAllowlist.length) {
    base.mimeAllowlist = [...new Set(raw.mimeAllowlist.map((m) => String(m).toLowerCase().trim()).filter(Boolean))]
  }
  return base
}

/** Clave estable para chat 1:1 (ids ordenados). */
export function participantsKeyForDirect(userIdA, userIdB) {
  const a = String(userIdA || '')
  const b = String(userIdB || '')
  if (!a || !b || a === b) return ''
  return [a, b].sort().join(':')
}

export function parseAdjuntos(raw, { allow = true, mimeAllowlist = DEFAULT_CHAT_MIME, max = 5 } = {}) {
  if (!allow) return []
  if (!Array.isArray(raw)) return []
  const allowSet = new Set(mimeAllowlist.map((m) => m.toLowerCase()))
  const out = []
  for (const item of raw) {
    if (out.length >= max) break
    if (!item || typeof item !== 'object') continue
    let url = String(item.url || '').trim()
    if (!url) continue
    // Relativas /uploads o https
    if (!url.startsWith('/uploads/') && !/^https:\/\//i.test(url)) continue
    const mimeType = String(item.mimeType || item.mime || '').trim().toLowerCase() || 'application/octet-stream'
    if (allowSet.size && !allowSet.has(mimeType)) continue
    const nombre = String(item.nombre || item.name || 'Adjunto').trim().slice(0, 120) || 'Adjunto'
    out.push({ url: url.slice(0, 500), nombre, mimeType: mimeType.slice(0, 100) })
  }
  return out
}

export function sanitizeMessageText(raw, max = 4000) {
  return String(raw || '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, max)
}

/** Extrae @menciones tipo @usuario (sin espacios). */
export function extractMentionTokens(texto) {
  const text = String(texto || '')
  const re = /@([a-zA-Z0-9._-]{2,40})/g
  const found = new Set()
  let m
  while ((m = re.exec(text))) found.add(m[1].toLowerCase())
  return [...found]
}

export function previewFromMessage(texto, adjuntos = []) {
  const t = sanitizeMessageText(texto, 100)
  if (t) return t
  if (adjuntos?.length) return `📎 ${adjuntos[0].nombre || 'Adjunto'}`
  return ''
}

export function validateDirectCreate({ participantId, selfId }) {
  const other = String(participantId || '').trim()
  const self = String(selfId || '').trim()
  if (!other) return 'participantId obligatorio'
  if (!/^[a-f0-9]{24}$/i.test(other)) return 'participantId inválido'
  if (other === self) return 'No podés chatear con vos mismo'
  return null
}

export function validateGroupCreate({ title, memberIds, selfId, maxMembers = 50 }) {
  const t = String(title || '').trim()
  if (!t) return 'Título del grupo obligatorio'
  if (t.length > 80) return 'Título demasiado largo'
  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).map((id) => String(id)).filter(Boolean))]
  if (ids.includes(String(selfId))) {
    /* ok, se agrega igual */
  }
  const all = [...new Set([String(selfId), ...ids])]
  if (all.length < 2) return 'El grupo necesita al menos otro miembro'
  if (all.length > maxMembers) return `Máximo ${maxMembers} miembros`
  for (const id of ids) {
    if (!/^[a-f0-9]{24}$/i.test(id)) return 'memberIds inválidos'
  }
  return null
}

export function validateSendMessage({ texto, adjuntos, allowAttachments }) {
  const t = sanitizeMessageText(texto)
  const files = Array.isArray(adjuntos) ? adjuntos : []
  if (!t && !files.length) return 'texto o adjunto obligatorio'
  if (files.length && !allowAttachments) return 'Adjuntos deshabilitados por política'
  return null
}

export function isParticipant(chat, userId) {
  const uid = String(userId)
  const ids = Array.isArray(chat?.participantIds)
    ? chat.participantIds.map(String)
    : (chat?.participants || []).map((p) => String(p.userId))
  return ids.includes(uid)
}

export function unreadForUser(chat, userId) {
  const uid = String(userId)
  const last = chat?.lastMessageAt ? new Date(chat.lastMessageAt).getTime() : 0
  if (!last) return false
  const entry = (chat?.readBy || []).find((r) => String(r.userId) === uid)
  if (!entry?.readAt) return true
  return new Date(entry.readAt).getTime() < last
}
