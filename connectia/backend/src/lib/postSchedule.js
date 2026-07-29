/**
 * Helpers puros para programar publicaciones (sin DB).
 */

/** @returns {Date|null} */
export function parseScheduledAt(raw) {
  if (!raw) return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Valida programación cuando el status es `scheduled`.
 * @returns {string|null} mensaje de error o null si OK
 */
export function validatePostSchedule({ status, scheduledAt }) {
  if (status !== 'scheduled') return null
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return 'Fecha de programación inválida'
  }
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return 'La fecha programada ya pasó'
  }
  return null
}

/**
 * Ventana de conflicto alrededor de una fecha programada.
 * @returns {{ from: Date, to: Date, dayFrom: Date, dayTo: Date, center: Date, windowMinutes: number } | null}
 */
export function scheduleConflictWindow(at, { windowMinutes = 120 } = {}) {
  const center = parseScheduledAt(at)
  if (!center) return null
  const mins = Math.max(15, Math.min(24 * 60, Number(windowMinutes) || 120))
  const half = mins * 60_000
  const from = new Date(center.getTime() - half)
  const to = new Date(center.getTime() + half)
  const dayFrom = new Date(center)
  dayFrom.setHours(0, 0, 0, 0)
  const dayTo = new Date(center)
  dayTo.setHours(23, 59, 59, 999)
  return { from, to, dayFrom, dayTo, center, windowMinutes: mins }
}

/**
 * Clasifica solapamiento: near (±window) o sameDay.
 */
export function classifyScheduleConflict(scheduledAt, center, windowMinutes = 120) {
  const at = parseScheduledAt(scheduledAt)
  const c = parseScheduledAt(center)
  if (!at || !c) return 'sameDay'
  const deltaMin = Math.abs(at.getTime() - c.getTime()) / 60_000
  if (deltaMin <= windowMinutes) return 'near'
  return 'sameDay'
}

/**
 * Resuelve status + fechas al crear/actualizar desde el body admin.
 * @returns {{ status: string, scheduledAt: Date|null, publishedAt: Date|null, error: string|null }}
 */
export function resolvePublishTiming({
  status,
  scheduledAtRaw,
  prevStatus = null,
  prevPublishedAt = null,
  prevScheduledAt = null,
  now = new Date(),
}) {
  const scheduledAt = parseScheduledAt(scheduledAtRaw)

  if (status === 'scheduled') {
    const err = validatePostSchedule({ status, scheduledAt })
    if (err) return { status, scheduledAt: null, publishedAt: null, error: err }
    return {
      status: 'scheduled',
      scheduledAt,
      publishedAt: null,
      error: null,
    }
  }

  if (status === 'published') {
    const publishedAt =
      prevStatus === 'published' && prevPublishedAt ? prevPublishedAt : now
    return {
      status: 'published',
      scheduledAt: null,
      publishedAt,
      error: null,
    }
  }

  // draft / pending_review / rejected / archived: limpiar programación
  return {
    status,
    scheduledAt: status === prevStatus ? prevScheduledAt : null,
    publishedAt: prevPublishedAt,
    error: null,
  }
}
