/** Reacciones del muro: una por usuario, elegidas con emoji. */
export const REACTION_KEYS = [
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'laugh', emoji: '😂', label: 'Me divierte' },
  { key: 'fire', emoji: '🔥', label: 'Me prende' },
  { key: 'wow', emoji: '😮', label: 'Me sorprende' },
  { key: 'clap', emoji: '👏', label: 'Aplausos' },
]

export const REACTION_KEY_IDS = REACTION_KEYS.map((r) => r.key)

/** Alias legacy: "me gusta" → me encanta */
export function normalizeReactionKey(key) {
  const k = String(key || '')
  if (k === 'like') return 'love'
  return REACTION_KEY_IDS.includes(k) ? k : null
}

export function emptyReactions() {
  return { love: 0, laugh: 0, fire: 0, wow: 0, clap: 0 }
}

/** Une contadores nuevos + legacy `like` dentro de `love`. */
export function mergeReactionCounts(raw = {}) {
  const out = emptyReactions()
  for (const k of REACTION_KEY_IDS) out[k] = Math.max(0, Number(raw[k]) || 0)
  out.love += Math.max(0, Number(raw.like) || 0)
  return out
}
