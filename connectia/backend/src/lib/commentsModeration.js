/**
 * Config de moderación de comentarios por tenant (§10.03).
 * enabled: pipeline IA al crear/editar
 * requireApproval: comentarios quedan pending_review hasta aprobar
 * autoHideMinScore: si score ≥ umbral, oculta solo (0 = desactivado)
 * notifyModeratorsMinScore: umbral para avisar (0 = off; push/in-app futuro)
 * glossary: palabras sensibles del tenant (señal extra)
 */
export function normalizeCommentsModeration(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const autoHide = Number(src.autoHideMinScore)
  const notify = Number(src.notifyModeratorsMinScore)
  const glossary = Array.isArray(src.glossary)
    ? src.glossary.map((w) => String(w || '').trim().toLowerCase()).filter(Boolean).slice(0, 100)
    : []
  return {
    enabled: src.enabled !== false,
    requireApproval: Boolean(src.requireApproval),
    autoHideMinScore: Number.isFinite(autoHide) ? Math.max(0, Math.min(100, Math.round(autoHide))) : 0,
    notifyModeratorsMinScore: Number.isFinite(notify)
      ? Math.max(0, Math.min(100, Math.round(notify)))
      : 0,
    glossary,
  }
}

export function shouldAutoHide(cfg, score) {
  const c = normalizeCommentsModeration(cfg)
  if (!c.autoHideMinScore) return false
  return Number(score) >= c.autoHideMinScore
}
