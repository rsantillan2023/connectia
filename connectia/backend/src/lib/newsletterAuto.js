import { normalizeAudience } from './audience.js'

/**
 * ¿La publicación entra dentro de la audiencia (laxa) de la regla de newsletter?
 * "Laxo": alcanza con que compartan algún área/grupo/usuario, o que cualquiera
 * de las dos audiencias sea "all".
 */
export function postMatchesRuleAudience(post, ruleAudience) {
  const rule = normalizeAudience(ruleAudience)
  if (rule.mode === 'all') return true
  if (rule.mode === 'none') return false

  const postAudience = normalizeAudience(post?.audience)
  if (postAudience.mode === 'all') return true
  if (postAudience.mode === 'none') return false

  const ruleIds = new Set([...rule.areaIds, ...rule.groupIds, ...rule.userIds])
  if (!ruleIds.size) return false
  const postIds = [...postAudience.areaIds, ...postAudience.groupIds, ...postAudience.userIds]
  return postIds.some((id) => ruleIds.has(id))
}

/**
 * Selecciona hasta `postCount` publicaciones para la regla a partir de una lista
 * de publicaciones ya publicadas. Función pura (sin acceso a Mongo) para testear fácil.
 * @param {Array} posts - publicaciones candidatas (status published)
 * @param {{ postCount?: number, selectMode?: 'latest'|'pinned_first', audience?: object }} rule
 */
export function selectPostsForRule(posts, rule) {
  const list = Array.isArray(posts) ? posts : []
  const count = Math.max(1, Number(rule?.postCount) || 5)
  const ruleAudienceMode = normalizeAudience(rule?.audience).mode
  const filtered =
    ruleAudienceMode === 'all' ? list : list.filter((p) => postMatchesRuleAudience(p, rule?.audience))

  const sorted = [...filtered].sort((a, b) => {
    if (rule?.selectMode === 'pinned_first') {
      const pinDiff = (b?.pinned === true ? 1 : 0) - (a?.pinned === true ? 1 : 0)
      if (pinDiff !== 0) return pinDiff
    }
    const at = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bt = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bt - at
  })

  return sorted.slice(0, count)
}

/** Próxima corrida = ahora + intervalHours (mínimo 1h). */
export function computeNextRunAt(rule, now = new Date()) {
  const hours = Math.max(1, Number(rule?.intervalHours) || 24)
  return new Date(now.getTime() + hours * 3600_000)
}
