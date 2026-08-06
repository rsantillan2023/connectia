/**
 * Lógica pura de recurrencia de visitas de supervisión (testeable sin DB).
 */

const FREC = Object.freeze({
  DIARIA: 'diaria',
  SEMANAL: 'semanal',
  SEMANAL_CUSTOM: 'semanal_custom',
  MENSUAL: 'mensual',
  MENSUAL_CUSTOM: 'mensual_custom',
})

export const VISITA_FRECUENCIAS = FREC

const DIAS_NOM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Parsea "HH:mm" → { h, m }. Fallback 09:00. */
export function parseHoraLocal(horaLocal) {
  const raw = String(horaLocal || '09:00').trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!m) return { h: 9, m: 0 }
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const min = Math.min(59, Math.max(0, Number(m[2])))
  return { h, m: min }
}

function atLocalTime(baseDate, horaLocal) {
  const { h, m } = parseHoraLocal(horaLocal)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

/** Días de la semana 0–6 (dom…sáb), únicos y ordenados. */
export function normalizeDiasSemana(raw, fallbackDia = 1) {
  const arr = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : []
  const set = new Set(
    arr.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6),
  )
  if (set.size) return [...set].sort((a, b) => a - b)
  const fb = Math.min(6, Math.max(0, Number(fallbackDia ?? 1)))
  return [fb]
}

/** Semanas del mes 1–4 (días 1–7, 8–14, 15–21, 22–28+). */
export function normalizeSemanasMes(raw) {
  const arr = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : []
  const set = new Set(
    arr.map(Number).filter((n) => Number.isFinite(n) && n >= 1 && n <= 4),
  )
  if (set.size) return [...set].sort((a, b) => a - b)
  return [1]
}

/** Semana del mes: 1 (días 1–7) … 4 (días 22–31). */
export function weekOfMonth(date) {
  const day = date.getDate()
  return Math.min(4, Math.ceil(day / 7))
}

/**
 * Próxima corrida según frecuencia.
 * - diaria / semanal / mensual: igual que antes
 * - semanal_custom: próximos días en diasSemana[]
 * - mensual_custom: próximas fechas en semanasMes[] + diaSemana
 *
 * Si el candidato ya pasó respecto a `now`, avanza un ciclo.
 */
export function computeNextRunAt(rule, now = new Date()) {
  const freq = String(rule?.frecuencia || FREC.DIARIA)
  const hora = rule?.horaLocal || '09:00'
  const base = new Date(now)

  if (freq === FREC.SEMANAL) {
    const want = Math.min(6, Math.max(0, Number(rule?.diaSemana ?? 1)))
    let candidate = atLocalTime(base, hora)
    let guard = 0
    while ((candidate.getDay() !== want || candidate.getTime() <= now.getTime()) && guard < 14) {
      candidate = new Date(candidate.getTime() + 24 * 3600_000)
      candidate = atLocalTime(candidate, hora)
      guard += 1
    }
    return candidate
  }

  if (freq === FREC.SEMANAL_CUSTOM) {
    const days = normalizeDiasSemana(rule?.diasSemana, rule?.diaSemana ?? 1)
    let candidate = atLocalTime(base, hora)
    let guard = 0
    while (guard < 21) {
      if (days.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
        return candidate
      }
      candidate = atLocalTime(new Date(candidate.getTime() + 24 * 3600_000), hora)
      guard += 1
    }
    return candidate
  }

  if (freq === FREC.MENSUAL) {
    const day = Math.min(28, Math.max(1, Number(rule?.diaMes ?? 1)))
    let y = base.getFullYear()
    let mo = base.getMonth()
    let candidate = atLocalTime(new Date(y, mo, day), hora)
    if (candidate.getTime() <= now.getTime()) {
      mo += 1
      if (mo > 11) {
        mo = 0
        y += 1
      }
      candidate = atLocalTime(new Date(y, mo, day), hora)
    }
    return candidate
  }

  if (freq === FREC.MENSUAL_CUSTOM) {
    const weeks = normalizeSemanasMes(rule?.semanasMes)
    const wantDay = Math.min(6, Math.max(0, Number(rule?.diaSemana ?? 1)))
    let candidate = atLocalTime(base, hora)
    let guard = 0
    while (guard < 400) {
      if (
        weeks.includes(weekOfMonth(candidate)) &&
        candidate.getDay() === wantDay &&
        candidate.getTime() > now.getTime()
      ) {
        return candidate
      }
      candidate = atLocalTime(new Date(candidate.getTime() + 24 * 3600_000), hora)
      guard += 1
    }
    return candidate
  }

  // diaria
  let candidate = atLocalTime(base, hora)
  if (candidate.getTime() <= now.getTime()) {
    const tomorrow = new Date(base.getTime() + 24 * 3600_000)
    candidate = atLocalTime(tomorrow, hora)
  }
  return candidate
}

/** Fecha límite de la tarea generada = now + plazoHoras. */
export function computeFechaLimiteFromPlazo(plazoHoras, now = new Date()) {
  const hours = Math.min(24 * 30, Math.max(1, Number(plazoHoras) || 24))
  return new Date(now.getTime() + hours * 3600_000)
}

export function validateRecurrenciaPayload(body = {}) {
  const titulo = String(body.titulo || '').trim()
  if (!titulo) return { ok: false, error: 'Título requerido' }
  if (!body.salaId) return { ok: false, error: 'Sala requerida' }
  const frecuencia = String(body.frecuencia || '')
  if (!Object.values(FREC).includes(frecuencia)) {
    return {
      ok: false,
      error: 'Frecuencia inválida (diaria|semanal|semanal_custom|mensual|mensual_custom)',
    }
  }
  if (frecuencia === FREC.SEMANAL_CUSTOM) {
    const raw = Array.isArray(body.diasSemana) ? body.diasSemana : []
    const explicit = raw.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
    if (!explicit.length) {
      return { ok: false, error: 'Elegí al menos un día de la semana' }
    }
  }
  if (frecuencia === FREC.MENSUAL_CUSTOM) {
    const raw = Array.isArray(body.semanasMes) ? body.semanasMes : []
    const explicit = raw.map(Number).filter((n) => Number.isFinite(n) && n >= 1 && n <= 4)
    if (!explicit.length) {
      return { ok: false, error: 'Elegí al menos una semana del mes (1–4)' }
    }
  }
  return { ok: true }
}

export function labelFrecuencia(rule) {
  const f = rule?.frecuencia
  const hora = rule.horaLocal || '09:00'
  if (f === FREC.DIARIA) return `Todos los días a las ${hora}`
  if (f === FREC.SEMANAL) {
    const d = DIAS_NOM[Math.min(6, Math.max(0, Number(rule.diaSemana ?? 1)))]
    return `Cada ${d} a las ${hora}`
  }
  if (f === FREC.SEMANAL_CUSTOM) {
    const days = normalizeDiasSemana(rule.diasSemana, rule.diaSemana ?? 1)
    const names = days.map((d) => DIAS_NOM[d]).join(', ')
    return `Semanal custom (${names}) a las ${hora}`
  }
  if (f === FREC.MENSUAL) {
    return `El día ${rule.diaMes || 1} de cada mes a las ${hora}`
  }
  if (f === FREC.MENSUAL_CUSTOM) {
    const weeks = normalizeSemanasMes(rule.semanasMes)
    const d = DIAS_NOM[Math.min(6, Math.max(0, Number(rule.diaSemana ?? 1)))]
    return `Mensual custom · sem. ${weeks.join(' y ')} · cada ${d} a las ${hora}`
  }
  return String(f || '')
}
