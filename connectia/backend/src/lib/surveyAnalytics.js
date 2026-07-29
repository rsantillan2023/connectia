/**
 * Agregados y exportación de una encuesta (= conjunto de cuestionarios respondidos).
 */

function answerMap(response) {
  const map = {}
  for (const a of response.answers || []) {
    map[a.questionId] = a.value
  }
  return map
}

function formatCell(value) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

export function buildByQuestion(survey, responses) {
  return (survey.questions || []).map((q) => {
    const vals = responses
      .map((r) => answerMap(r)[q.id])
      .filter((v) => v !== undefined && v !== null && v !== '')
    const base = {
      questionId: q.id,
      texto: q.texto,
      tipo: q.tipo,
      grupo: q.grupo || 'General',
    }
    if (q.tipo === 'rating' || q.tipo === 'number') {
      const nums = vals.map(Number).filter((n) => Number.isFinite(n))
      const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      return {
        ...base,
        count: nums.length,
        average: avg,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      }
    }
    if (q.tipo === 'yesno') {
      const yes = vals.filter((v) => v === true || v === 'true').length
      return { ...base, count: vals.length, yes, no: vals.length - yes }
    }
    if (['single', 'multiple', 'date', 'time', 'datetime'].includes(q.tipo)) {
      const tally = {}
      for (const v of vals) {
        for (const x of Array.isArray(v) ? v : [v]) tally[String(x)] = (tally[String(x)] || 0) + 1
      }
      return { ...base, count: vals.length, options: tally }
    }
    return {
      ...base,
      count: vals.length,
      samples: vals.map(String).slice(0, 40),
    }
  })
}

/** Resultados agrupados por sección temática del cuestionario. */
export function buildByQuestionGroup(survey, responses) {
  const byQ = buildByQuestion(survey, responses)
  const map = new Map()
  for (const q of byQ) {
    const g = q.grupo || 'General'
    if (!map.has(g)) map.set(g, { grupo: g, questions: [], metrics: { answeredSlots: 0, closedAvg: [] } })
    const bucket = map.get(g)
    bucket.questions.push(q)
    bucket.metrics.answeredSlots += q.count || 0
    if ((q.tipo === 'rating' || q.tipo === 'number') && q.average != null) {
      bucket.metrics.closedAvg.push(q.average)
    }
  }
  return [...map.values()].map((b) => ({
    grupo: b.grupo,
    questionCount: b.questions.length,
    groupAverage:
      b.metrics.closedAvg.length > 0
        ? b.metrics.closedAvg.reduce((a, x) => a + x, 0) / b.metrics.closedAvg.length
        : null,
    questions: b.questions,
  }))
}

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Estadísticas de participación en ventanas temporales + serie diaria.
 * invited = snapshot al publicar (preferido) o conteo live.
 */
export function buildParticipationStats(responses, invited, now = new Date()) {
  const startToday = startOfLocalDay(now)
  const start7 = new Date(startToday)
  start7.setDate(start7.getDate() - 6)
  const start30 = new Date(startToday)
  start30.setDate(start30.getDate() - 29)

  const inRange = (from) => responses.filter((r) => r.submittedAt && new Date(r.submittedAt) >= from).length
  const answered = responses.length
  const windows = {
    today: {
      label: 'Hoy',
      answered: inRange(startToday),
      invited,
      rate: invited ? Math.round((inRange(startToday) / invited) * 1000) / 10 : null,
    },
    last7d: {
      label: 'Últimos 7 días',
      answered: inRange(start7),
      invited,
      rate: invited ? Math.round((inRange(start7) / invited) * 1000) / 10 : null,
    },
    last30d: {
      label: 'Últimos 30 días',
      answered: inRange(start30),
      invited,
      rate: invited ? Math.round((inRange(start30) / invited) * 1000) / 10 : null,
    },
    all: {
      label: 'Desde el envío',
      answered,
      invited,
      pending: Math.max(0, (invited || 0) - answered),
      rate: invited ? Math.round((answered / invited) * 1000) / 10 : null,
    },
  }

  // Serie diaria últimos 30 días (acumulado y nuevos del día)
  const series = []
  const byDay = {}
  for (const r of responses) {
    if (!r.submittedAt) continue
    const key = ymd(new Date(r.submittedAt))
    byDay[key] = (byDay[key] || 0) + 1
  }
  let cumulative = 0
  // count responses before window for cumulative start
  const before = responses.filter((r) => r.submittedAt && new Date(r.submittedAt) < start30).length
  cumulative = before
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30)
    d.setDate(start30.getDate() + i)
    const key = ymd(d)
    const neu = byDay[key] || 0
    cumulative += neu
    series.push({
      date: key,
      newAnswers: neu,
      cumulative,
      rate: invited ? Math.round((cumulative / invited) * 1000) / 10 : null,
    })
  }

  return { windows, series, invited, answered, pending: Math.max(0, (invited || 0) - answered) }
}

/** Resumen ejecutivo del cuestionario como un todo (cuantitativo determinístico). */
export function buildSurveyOverview(survey, responses, participation) {
  const byQuestion = buildByQuestion(survey, responses)
  const closed = byQuestion.filter((q) =>
    ['rating', 'number', 'yesno', 'single', 'multiple'].includes(q.tipo),
  )
  const open = byQuestion.filter((q) => ['text', 'textarea', 'email', 'phone'].includes(q.tipo))
  const highlights = []

  for (const q of closed) {
    if (q.tipo === 'rating' || q.tipo === 'number') {
      if (q.average != null) {
        highlights.push({
          questionId: q.questionId,
          kind: 'metric',
          text: `«${q.texto}»: promedio ${Number(q.average).toFixed(2)} (n=${q.count})`,
        })
      }
    } else if (q.tipo === 'yesno' && q.count) {
      const pctYes = Math.round((q.yes / q.count) * 100)
      highlights.push({
        questionId: q.questionId,
        kind: 'share',
        text: `«${q.texto}»: ${pctYes}% Sí · ${100 - pctYes}% No (n=${q.count})`,
      })
    } else if (q.options && q.count) {
      const top = Object.entries(q.options).sort((a, b) => b[1] - a[1])[0]
      if (top) {
        const pct = Math.round((top[1] / q.count) * 100)
        highlights.push({
          questionId: q.questionId,
          kind: 'top',
          text: `«${q.texto}»: opción más elegida «${top[0]}» (${pct}%, ${top[1]}/${q.count})`,
        })
      }
    }
  }

  return {
    title: survey.titulo,
    description: survey.descripcion || '',
    questionCount: (survey.questions || []).length,
    closedQuestionCount: closed.length,
    openQuestionCount: open.length,
    participation,
    highlights,
    byQuestion,
  }
}

/**
 * Filas planas para export.
 * @param {object} opts.questionIds - si viene, solo esas columnas de respuesta
 * @param {boolean} opts.includeRespondents - incluir userId (si la encuesta no es anónima)
 */
export function buildExportRows(survey, responses, usersById = {}, opts = {}) {
  const qIds = Array.isArray(opts.questionIds) && opts.questionIds.length
    ? opts.questionIds.map(String)
    : (survey.questions || []).map((q) => q.id)
  const questions = (survey.questions || []).filter((q) => qIds.includes(q.id))
  const includeRespondents = Boolean(opts.includeRespondents) && !survey.anonymous

  const headers = [
    'responseId',
    'submittedAt',
    'surveyVersion',
    ...(includeRespondents ? ['userId', 'userName', 'userEmail'] : []),
    ...questions.map((q) => `${q.id}::${q.texto}`),
  ]

  const rows = responses.map((r) => {
    const map = answerMap(r)
    const u = usersById[String(r.userId)] || {}
    const base = {
      responseId: String(r._id),
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
      surveyVersion: r.surveyVersion || '',
    }
    if (includeRespondents) {
      base.userId = String(r.userId || '')
      base.userName = [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || ''
      base.userEmail = u.email || ''
    }
    for (const q of questions) {
      base[`${q.id}::${q.texto}`] = formatCell(map[q.id])
    }
    return base
  })

  return { headers, rows, questions }
}

export function rowsToCsv({ headers, rows }) {
  const esc = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(esc).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(','))
  }
  return `${lines.join('\n')}\n`
}

/** Payload compacto para la IA (agregados + muestra de abiertas). */
export function buildAiAnalysisPayload(survey, responses, participation, opts = {}) {
  const overview = buildSurveyOverview(survey, responses, participation)
  const qIds = Array.isArray(opts.questionIds) && opts.questionIds.length
    ? new Set(opts.questionIds.map(String))
    : null

  const byQuestion = overview.byQuestion.filter((q) => !qIds || qIds.has(q.questionId))
  const openSamples = {}
  for (const q of survey.questions || []) {
    if (qIds && !qIds.has(q.id)) continue
    if (!['text', 'textarea'].includes(q.tipo)) continue
    openSamples[q.id] = {
      texto: q.texto,
      samples: responses
        .map((r) => answerMap(r)[q.id])
        .filter((v) => v !== undefined && v !== null && String(v).trim())
        .map(String)
        .slice(0, 40),
    }
  }

  return {
    survey: {
      titulo: survey.titulo,
      descripcion: survey.descripcion || '',
      questions: (survey.questions || [])
        .filter((q) => !qIds || qIds.has(q.id))
        .map((q) => ({ id: q.id, texto: q.texto, tipo: q.tipo })),
    },
    participation,
    quantitative: {
      highlights: overview.highlights.filter((h) => !qIds || qIds.has(h.questionId)),
      byQuestion,
    },
    qualitativeSamples: openSamples,
    focus: String(opts.focus || '').trim().slice(0, 800),
  }
}
