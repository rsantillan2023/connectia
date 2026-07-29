/**
 * Keys de reacción del muro (espejo frontend).
 * Legacy: `like` se trata como `love`.
 */
export const REACTION_KEYS = ['love', 'laugh', 'fire', 'wow', 'clap']

export function normalizeReactionKey(key) {
  const k = String(key || '')
  if (k === 'like') return 'love'
  return REACTION_KEYS.includes(k) ? k : null
}

export function emptyReactions() {
  return { love: 0, laugh: 0, fire: 0, wow: 0, clap: 0 }
}

export function mergeReactionCounts(raw = {}) {
  const out = emptyReactions()
  for (const k of REACTION_KEYS) out[k] = Math.max(0, Number(raw?.[k]) || 0)
  out.love += Math.max(0, Number(raw?.like) || 0)
  return out
}

export function normalizeMyReaction(key) {
  return normalizeReactionKey(key)
}
