/**
 * Feriados nacionales Argentina (calendario fijo + fechas conocidas 2025–2027).
 * Se inyecta en el prompt de IA cuando el admin pide “próximo feriado”.
 */

function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatEs(d) {
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Fechas variables / trasladadas conocidas + fijas por año */
function holidaysForYear(year) {
  const fixed = [
    [`${year}-01-01`, 'Año Nuevo'],
    [`${year}-03-24`, 'Día Nacional de la Memoria por la Verdad y la Justicia'],
    [`${year}-04-02`, 'Día del Veterano y de los Caídos en la Guerra de Malvinas'],
    [`${year}-05-01`, 'Día del Trabajador'],
    [`${year}-05-25`, 'Día de la Revolución de Mayo'],
    [`${year}-06-20`, 'Paso a la Inmortalidad del General Manuel Belgrano'],
    [`${year}-07-09`, 'Día de la Independencia'],
    [`${year}-08-17`, 'Paso a la Inmortalidad del General José de San Martín'],
    [`${year}-10-12`, 'Día del Respeto a la Diversidad Cultural'],
    [`${year}-11-20`, 'Día de la Soberanía Nacional'],
    [`${year}-12-08`, 'Inmaculada Concepción de María'],
    [`${year}-12-25`, 'Navidad'],
  ]

  // Semana Santa / Carnaval aproximados conocidos (no inventar fuera de esta tabla)
  const extras = {
    2025: [
      ['2025-03-03', 'Carnaval'],
      ['2025-03-04', 'Carnaval'],
      ['2025-04-17', 'Jueves Santo (no laborable con asueto en varias jurisdicciones)'],
      ['2025-04-18', 'Viernes Santo'],
    ],
    2026: [
      ['2026-02-16', 'Carnaval'],
      ['2026-02-17', 'Carnaval'],
      ['2026-04-02', 'Jueves Santo / Malvinas (según calendario oficial del año)'],
      ['2026-04-03', 'Viernes Santo'],
    ],
    2027: [
      ['2027-02-08', 'Carnaval'],
      ['2027-02-09', 'Carnaval'],
      ['2027-03-26', 'Viernes Santo'],
    ],
  }

  const list = [...fixed, ...(extras[year] || [])]
  // dedupe by date
  const map = new Map()
  for (const [date, name] of list) map.set(date, name)
  return [...map.entries()]
    .map(([date, name]) => ({ date, name, at: parseYmd(date) }))
    .sort((a, b) => a.at - b.at)
}

/**
 * Próximo feriado nacional AR a partir de hoy (timezone local del server).
 */
export function nextArgentinaHoliday(from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const years = [start.getFullYear(), start.getFullYear() + 1]
  const all = years.flatMap((y) => holidaysForYear(y))
  const next = all.find((h) => h.at >= start)
  if (!next) return null
  const daysUntil = Math.round((next.at - start) / 86400000)
  return {
    date: next.date,
    name: next.name,
    label: formatEs(next.at),
    daysUntil,
  }
}

/** Detecta si el prompt pide info de feriado */
export function promptWantsHoliday(text = '') {
  return /feriad|asueto|no\s+laborable|próximo\s+feriad|proximo\s+feriad/i.test(String(text))
}

/**
 * Si el prompt pide feriado, devuelve el próximo feriado AR (o null).
 */
export function holidayFromPrompt(promptText, from = new Date()) {
  if (!promptWantsHoliday(promptText)) return null
  return nextArgentinaHoliday(from)
}

/**
 * Bloque de contexto para inyectar en el prompt del usuario.
 */
export function holidayContextBlock(promptText, from = new Date()) {
  if (!promptWantsHoliday(promptText)) return ''
  const next = nextArgentinaHoliday(from)
  if (!next) {
    return (
      '\n\n[Contexto calendario AR] No se pudo determinar el próximo feriado. ' +
      'Pedile al editor la fecha exacta; no inventes un feriado.'
    )
  }
  return [
    '',
    '[Contexto calendario Argentina — USÁ ESTOS DATOS, no inventes otra fecha]',
    `Hoy: ${formatEs(from)}`,
    `Próximo feriado nacional: ${next.name}`,
    `Fecha: ${next.label} (${next.date})`,
    `Faltan ${next.daysUntil} día(s).`,
    'Si el mensaje dice que “ese día se trabaja”, redactá con empatía dejando claro que NO es día no laborable para esta comunidad, aunque sea feriado nacional.',
  ].join('\n')
}
