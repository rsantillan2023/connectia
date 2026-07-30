/**
 * Heurísticas IA supervisión (humano confirma) — Ola 31.
 * Sin LLM externo: priorizar visitas, resumir día, outliers.
 */

function daysUntil(date, now = new Date()) {
  if (!date) return 999
  const t = new Date(date).getTime() - now.getTime()
  return Math.ceil(t / (24 * 60 * 60 * 1000))
}

/**
 * @param {Array<{ id: string, titulo?: string, prioridad?: string, fechaLimite?: Date|string, status?: string, salaId?: string }>} tareas
 */
export function prioritizeVisits(tareas = [], now = new Date()) {
  const open = (tareas || []).filter((t) => !['completada', 'cancelada'].includes(String(t.status)))
  const scored = open.map((t) => {
    const prio = { alta: 30, media: 15, baja: 5 }[String(t.prioridad || 'media')] || 10
    const days = daysUntil(t.fechaLimite, now)
    const urgency = days < 0 ? 40 : days === 0 ? 35 : days <= 2 ? 25 : days <= 7 ? 10 : 0
    const score = prio + urgency
    return {
      tareaId: String(t.id || t._id),
      titulo: t.titulo || '',
      salaId: t.salaId ? String(t.salaId) : null,
      score,
      reason:
        days < 0
          ? 'Vencida'
          : days === 0
            ? 'Vence hoy'
            : t.prioridad === 'alta'
              ? 'Alta prioridad'
              : `Vence en ${days} días`,
    }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 20)
}

/**
 * @param {Array<{ status?: string, prioridad?: string, fechaCompletado?: Date|string, fechaLimite?: Date|string }>} tareas
 */
export function summarizeDay(tareas = [], now = new Date()) {
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  let completedToday = 0
  let overdue = 0
  let open = 0
  let highOpen = 0
  for (const t of tareas || []) {
    const st = String(t.status || '')
    if (st === 'completada') {
      const fc = t.fechaCompletado ? new Date(t.fechaCompletado) : null
      if (fc && fc >= dayStart && fc <= dayEnd) completedToday += 1
    } else if (st !== 'cancelada') {
      open += 1
      if (t.prioridad === 'alta') highOpen += 1
      if (t.fechaLimite && new Date(t.fechaLimite) < dayStart) overdue += 1
    }
  }
  return {
    completedToday,
    open,
    overdue,
    highOpen,
    summary: `Hoy: ${completedToday} completadas · ${open} abiertas (${overdue} vencidas, ${highOpen} alta prioridad). Revisá el orden sugerido antes de salir a campo.`,
  }
}

/**
 * Detecta salas con muchas tareas vencidas o alta prioridad acumulada.
 */
export function detectOutliers(tareas = [], now = new Date()) {
  const bySala = new Map()
  for (const t of tareas || []) {
    if (['completada', 'cancelada'].includes(String(t.status))) continue
    const sid = t.salaId ? String(t.salaId) : 'sin_sala'
    if (!bySala.has(sid)) bySala.set(sid, { salaId: sid, overdue: 0, high: 0, total: 0 })
    const b = bySala.get(sid)
    b.total += 1
    if (t.prioridad === 'alta') b.high += 1
    if (t.fechaLimite && new Date(t.fechaLimite) < now) b.overdue += 1
  }
  return [...bySala.values()]
    .filter((b) => b.overdue >= 2 || (b.high >= 2 && b.total >= 3))
    .map((b) => ({
      ...b,
      flag: b.overdue >= 2 ? 'muchas_vencidas' : 'alta_carga',
      message:
        b.overdue >= 2
          ? `Sala con ${b.overdue} tareas vencidas — revisar cobertura`
          : `Sala con ${b.high} tareas de alta prioridad abiertas`,
    }))
}

export function buildSupervisionAiInsights(tareas = [], now = new Date()) {
  return {
    prioritized: prioritizeVisits(tareas, now),
    day: summarizeDay(tareas, now),
    outliers: detectOutliers(tareas, now),
    humanConfirmRequired: true,
  }
}
