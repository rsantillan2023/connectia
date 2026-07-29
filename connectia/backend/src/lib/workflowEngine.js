/** Helpers puros del motor de workflows (§41) — testeables sin Mongo. */

export const TRIGGER_MODULES = ['solicitudes', 'documentos', 'licencias', 'ausentismos', 'generico']
export const APPROVER_TYPES = ['capability', 'role', 'area', 'users']
export const INSTANCE_STATUSES = ['pendiente', 'en_curso', 'aprobado', 'rechazado', 'cancelado']

/**
 * Normaliza pasos lineales del diseñador.
 * @param {unknown} raw
 */
export function normalizeSteps(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((s, i) => {
      const orden = Number(s?.orden) > 0 ? Number(s.orden) : i + 1
      const nombre = String(s?.nombre || `Paso ${orden}`).trim().slice(0, 120)
      const approverType = APPROVER_TYPES.includes(s?.approverType) ? s.approverType : 'capability'
      const approverValue = String(s?.approverValue || 'admin.solicitudes').trim().slice(0, 120)
      const slaHoras = Math.min(720, Math.max(0, Number(s?.slaHoras) || 48))
      const condition = String(s?.condition || '').trim().slice(0, 240)
      const userIds = Array.isArray(s?.userIds)
        ? s.userIds.map(String).filter(Boolean).slice(0, 50)
        : []
      return { orden, nombre, approverType, approverValue, slaHoras, condition, userIds }
    })
    .sort((a, b) => a.orden - b.orden)
    .map((s, i) => ({ ...s, orden: i + 1 }))
}

export function normalizeTrigger(raw) {
  const module = TRIGGER_MODULES.includes(raw?.module) ? raw.module : 'solicitudes'
  return {
    module,
    tipoKey: String(raw?.tipoKey || '').trim().slice(0, 80),
    label: String(raw?.label || '').trim().slice(0, 120),
  }
}

export function validateWorkflowPayload(body) {
  const name = String(body?.name || '').trim().slice(0, 120)
  const errors = []
  if (name.length < 2) errors.push('Nombre obligatorio')
  const steps = normalizeSteps(body?.steps)
  if (!steps.length) errors.push('Agregá al menos un paso de aprobación')
  for (const s of steps) {
    if (s.approverType === 'users' && !s.userIds.length) {
      errors.push(`Paso «${s.nombre}»: elegí al menos un aprobador`)
    }
    if (s.approverType !== 'users' && !s.approverValue) {
      errors.push(`Paso «${s.nombre}»: falta el criterio de aprobador`)
    }
  }
  return {
    ok: !errors.length,
    errors,
    payload: {
      name,
      description: String(body?.description || '').trim().slice(0, 800),
      trigger: normalizeTrigger(body?.trigger),
      steps,
      activo: body?.activo !== false,
    },
  }
}

export function currentStep(defOrInstanceSteps, stepIndex) {
  const steps = Array.isArray(defOrInstanceSteps) ? defOrInstanceSteps : []
  const idx = Math.max(0, Number(stepIndex) || 0)
  return steps[idx] || null
}

export function isLastStep(steps, stepIndex) {
  return Number(stepIndex) >= (Array.isArray(steps) ? steps.length : 0) - 1
}

/**
 * ¿El usuario puede actuar en el paso actual?
 * @param {{ roles?: string[], capabilities?: string[], areaId?: unknown, _id?: unknown }} user
 * @param {object} step
 * @param {{ isFullAdmin?: boolean }} opts
 */
export function userMatchesStep(user, step, opts = {}) {
  if (!user || !step) return false
  if (opts.isFullAdmin) return true
  const roles = user.roles || []
  const caps = user.capabilities || []
  if (roles.includes('admin') || roles.includes('platform')) return true

  if (step.approverType === 'role') {
    return roles.includes(String(step.approverValue || ''))
  }
  if (step.approverType === 'capability') {
    const need = String(step.approverValue || '')
    return need ? caps.includes(need) : false
  }
  if (step.approverType === 'area') {
    const areaId = String(user.areaId || '')
    return areaId && areaId === String(step.approverValue || '')
  }
  if (step.approverType === 'users') {
    const uid = String(user._id || user.id || '')
    return (step.userIds || []).map(String).includes(uid)
  }
  return false
}

function parseDateLoose(v) {
  if (!v) return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Días entre dos fechas. */
function daysBetween(a, b) {
  const da = parseDateLoose(a)
  const db = parseDateLoose(b)
  if (!da || !db) return null
  const ms = Math.abs(db.getTime() - da.getTime())
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) || 1)
}

/**
 * Normaliza campos de una solicitud a un mapa key→value (+ aliases por label).
 * @param {Array|{[k:string]:unknown}|undefined} campos
 */
export function normalizeCamposMap(campos) {
  const map = {}
  if (!campos) return map
  if (Array.isArray(campos)) {
    for (const c of campos) {
      const key = String(c?.key || '').trim().toLowerCase()
      const label = String(c?.label || '').trim().toLowerCase()
      if (key) map[key] = c.value
      if (label && map[label] === undefined) map[label] = c.value
    }
    return map
  }
  if (typeof campos === 'object') {
    for (const [k, v] of Object.entries(campos)) {
      map[String(k).toLowerCase()] = v
    }
  }
  return map
}

/** Extrae cantidad de días desde campos (número directo o desde/hasta). */
export function extractDaysRequested(camposMap) {
  const m = camposMap || {}
  const dayKeys = ['dias', 'días', 'days', 'cantidad_dias', 'cantidad_días', 'nro_dias', 'cantidad']
  for (const k of dayKeys) {
    if (m[k] == null || m[k] === '') continue
    const n = Number(m[k])
    if (Number.isFinite(n) && n > 0) return n
  }
  for (const [k, v] of Object.entries(m)) {
    if (!/d[ií]a/.test(k)) continue
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  const desde = m.desde || m.start || m.fecha_desde || m.inicio
  const hasta = m.hasta || m.end || m.fecha_hasta || m.fin
  const span = daysBetween(desde, hasta)
  if (span != null) return span
  return null
}

function contextBlob(ctx = {}) {
  const campos = normalizeCamposMap(ctx.campos)
  const parts = [
    ctx.module,
    ctx.tipoKey,
    ctx.category,
    ctx.titulo,
    ctx.descripcion,
    ctx.cuerpo,
    ...Object.entries(campos).flatMap(([k, v]) => [k, String(v ?? '')]),
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/**
 * ¿Aplica este paso según su condición de texto y el contexto del trámite?
 * Sin condición → siempre aplica.
 * Patrones: más de N días; crítico; política; “solo si <texto>”.
 *
 * @param {string} condition
 * @param {object} [ctx]
 * @returns {boolean}
 */
export function stepConditionApplies(condition, ctx = {}) {
  const raw = String(condition || '').trim()
  if (!raw) return true

  const lower = raw.toLowerCase()
  const blob = contextBlob(ctx)
  const campos = normalizeCamposMap(ctx.campos)

  // Días: supera / más de / > N días
  const daysRe =
    /(?:supera|m[aá]s\s+de|>\s*)\s*(\d+)\s*d[ií]as|(?:si\s+)?(?:pide|solicita|son)\s+(?:m[aá]s\s+de\s+)?(\d+)\s*d[ií]as/i
  const daysHit =
    raw.match(daysRe) ||
    (/d[ií]as/.test(lower) && /\d+/.test(lower) && /si|supera|m[aá]s|>/.test(lower)
      ? raw.match(/(\d+)\s*d[ií]as/i)
      : null)
  if (daysHit || (/d[ií]as/.test(lower) && /\d+/.test(lower) && /si|supera|m[aá]s|>/.test(lower))) {
    const n = Number(daysHit?.[1] || daysHit?.[2] || (raw.match(/(\d+)/) || [])[1] || 10)
    const days = extractDaysRequested(campos)
    if (days == null) return false
    return days > n
  }

  // Sistema / acceso crítico
  if (/cr[ií]tic/.test(lower)) {
    const critKeys = ['critico', 'crítico', 'sistema_critico', 'prioridad', 'riesgo', 'nivel']
    for (const k of critKeys) {
      const v = String(campos[k] ?? '').toLowerCase()
      if (!v) continue
      if (/cr[ií]tic|alta|si|true|1|s[ií]/.test(v)) return true
      if (/baja|media|no|false|0/.test(v) && !/cr[ií]tic/.test(v)) return false
    }
    return /cr[ií]tic/.test(blob)
  }

  // Documento política
  if (/pol[ií]tic/.test(lower)) {
    const cat = String(ctx.category || ctx.tipoKey || campos.category || campos.tipo || '').toLowerCase()
    if (/pol[ií]tic/.test(cat)) return true
    return /pol[ií]tic/.test(blob)
  }

  // Genérico: “solo si …” → buscar texto en el contexto
  let needle = raw
    .replace(/^solo\s+si\s+/i, '')
    .replace(/^si\s+/i, '')
    .replace(/\.$/, '')
    .trim()
    .toLowerCase()
  if (needle.length >= 3) {
    needle = needle.replace(/^(la|el|los|las|un|una)\s+/i, '').replace(/\s+es\s+(una|un)\s+/i, ' ')
    return (
      blob.includes(needle) ||
      Object.values(campos).some((v) => String(v || '').toLowerCase().includes(needle))
    )
  }

  // Condición no reconocida: aplicar el paso (no saltar)
  return true
}

/** Primer índice de paso que aplica; -1 si ninguno. */
export function findFirstApplicableStepIndex(steps, context) {
  const list = Array.isArray(steps) ? steps : []
  for (let i = 0; i < list.length; i++) {
    if (stepConditionApplies(list[i]?.condition, context)) return i
  }
  return -1
}

/**
 * Avanza el estado lógico tras una decisión.
 * Al aprobar, salta pasos cuya condición no aplica.
 * @returns {{ status: string, stepIndex: number, done: boolean, skipped: Array<{index:number, step:object}> }}
 */
export function applyDecision({ status, stepIndex, steps, decision, context = {} }) {
  const d = String(decision || '').toLowerCase()
  if (!['aprobar', 'rechazar'].includes(d)) {
    const err = new Error('Decisión inválida')
    err.status = 400
    throw err
  }
  if (!['pendiente', 'en_curso'].includes(status)) {
    const err = new Error('La instancia ya está cerrada')
    err.status = 409
    throw err
  }
  if (d === 'rechazar') {
    return { status: 'rechazado', stepIndex, done: true, skipped: [] }
  }

  const list = Array.isArray(steps) ? steps : []
  const skipped = []
  let next = Number(stepIndex) + 1
  while (next < list.length && !stepConditionApplies(list[next]?.condition, context)) {
    skipped.push({ index: next, step: list[next] })
    next += 1
  }

  if (next >= list.length) {
    return {
      status: 'aprobado',
      stepIndex: Math.max(0, list.length - 1),
      done: true,
      skipped,
    }
  }
  return { status: 'en_curso', stepIndex: next, done: false, skipped }
}

export function deepLinkForOrigin(origen) {
  const mod = origen?.module
  const id = origen?.refId
  if (!id) return '/aprobaciones'
  if (mod === 'solicitudes') return `/solicitudes/${id}`
  if (mod === 'documentos') return `/docs`
  if (mod === 'licencias') return `/licencias/${id}`
  if (mod === 'ausentismos') return `/ausencias/${id}`
  return '/aprobaciones'
}

export function moduleLabel(module) {
  if (module === 'solicitudes') return 'Solicitudes'
  if (module === 'documentos') return 'Documentos'
  if (module === 'licencias') return 'Licencias'
  if (module === 'ausentismos') return 'Ausencias'
  return 'General'
}
