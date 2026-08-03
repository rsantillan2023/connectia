/** Duración de visualización de una story en la app (segundos). */
export const STORY_DURATION_DEFAULT = 5
export const STORY_DURATION_MIN = 1
export const STORY_DURATION_MAX = 60

/**
 * Normaliza segundos de visualización de story.
 * @param {unknown} raw
 * @param {number} [fallback=STORY_DURATION_DEFAULT]
 * @returns {number}
 */
export function parseStoryDurationSec(raw, fallback = STORY_DURATION_DEFAULT) {
  const fb = (() => {
    const n = Number(fallback)
    return Number.isFinite(n)
      ? Math.min(STORY_DURATION_MAX, Math.max(STORY_DURATION_MIN, Math.round(n)))
      : STORY_DURATION_DEFAULT
  })()
  if (raw === undefined || raw === null || raw === '') return fb
  const n = Number(raw)
  if (!Number.isFinite(n)) return fb
  return Math.min(STORY_DURATION_MAX, Math.max(STORY_DURATION_MIN, Math.round(n)))
}
