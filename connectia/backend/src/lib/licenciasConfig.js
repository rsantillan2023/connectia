/**
 * Reglas y helpers puros de licencias / vacaciones / ausentismos (§12 · §13).
 * Testeable sin Mongo. Legislación AR/CL vía legislacionLicencias.js.
 */

import {
  licenseTypesForPais,
  normalizeLicenciasConfig,
  feriadosSetForYear,
  feriadosExtraDates,
  businessDaysInclusive,
} from './legislacionLicencias.js'

export {
  normalizeLicenciasConfig,
  normalizePaisLegislacion,
  vacationDaysBySeniority,
  yearsOfService,
  businessDaysInclusive,
  feriadosSetForYear,
  feriadosExtraDates,
  normalizeFeriadosList,
  defaultLicenciasConfig,
  licenseTypesForPais,
  listLegislacionOptions,
  FERIADOS_FIJOS,
} from './legislacionLicencias.js'

export const LICENSE_STATES = [
  { key: 'pendiente', label: 'Pendiente', orden: 10 },
  { key: 'aprobada', label: 'Aprobada', orden: 20 },
  { key: 'rechazada', label: 'Rechazada', orden: 30 },
  { key: 'cancelada', label: 'Cancelada', orden: 40 },
]

export const ABSENCE_STATES = LICENSE_STATES

/** @deprecated Preferí licenseTypesForPais(pais). Compat = AR. */
export const DEFAULT_LICENSE_TYPES = licenseTypesForPais('AR')

export const DEFAULT_ABSENCE_TYPES = [
  { key: 'injustificada', nombre: 'Ausencia', requiereAdjunto: false, activo: true, orden: 10 },
  { key: 'justificada', nombre: 'Ausencia justificada', requiereAdjunto: true, activo: true, orden: 20 },
  { key: 'llegada_tarde', nombre: 'Llegada tarde', requiereAdjunto: false, activo: true, orden: 30 },
]

/** Parsea YYYY-MM-DD o DD/MM[/YYYY] → Date UTC medianoche o null. */
export function parseDateInput(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/)
  if (m) {
    let y = m[3] != null ? +m[3] : new Date().getUTCFullYear()
    if (y < 100) y += 2000
    const d = new Date(Date.UTC(y, +m[2] - 1, +m[1]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function toISODate(d) {
  if (!d) return ''
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  return x.toISOString().slice(0, 10)
}

/** Días calendario inclusivos (desde…hasta). */
export function calendarDaysInclusive(desde, hasta) {
  const a = desde instanceof Date ? desde : parseDateInput(desde)
  const b = hasta instanceof Date ? hasta : parseDateInput(hasta)
  if (!a || !b || b < a) return 0
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / 86400000) + 1
}

/**
 * Valida período según modo de conteo.
 */
export function validatePeriod({
  desde,
  hasta,
  maxDias = 365,
  cuentaDias = 'calendario',
  feriados = new Set(),
} = {}) {
  const d = desde instanceof Date ? desde : parseDateInput(desde)
  const h = hasta instanceof Date ? hasta : parseDateInput(hasta)
  if (!d) return { ok: false, error: 'Fecha desde inválida' }
  if (!h) return { ok: false, error: 'Fecha hasta inválida' }
  if (h < d) return { ok: false, error: 'El período no puede estar invertido' }
  const dias =
    cuentaDias === 'habiles'
      ? businessDaysInclusive(d, h, feriados)
      : calendarDaysInclusive(d, h)
  if (dias < 1) {
    return {
      ok: false,
      error:
        cuentaDias === 'habiles'
          ? 'El período no incluye días hábiles (revisá fines de semana/feriados)'
          : 'El período debe tener al menos 1 día',
    }
  }
  if (dias > maxDias) return { ok: false, error: `Máximo ${maxDias} días por solicitud` }
  return { ok: true, dias, desde: d, hasta: h, cuentaDias }
}

/** True si [a1,a2] se solapa con [b1,b2] (inclusivo). */
export function periodsOverlap(a1, a2, b1, b2) {
  const A1 = a1 instanceof Date ? a1 : parseDateInput(a1)
  const A2 = a2 instanceof Date ? a2 : parseDateInput(a2)
  const B1 = b1 instanceof Date ? b1 : parseDateInput(b1)
  const B2 = b2 instanceof Date ? b2 : parseDateInput(b2)
  if (!A1 || !A2 || !B1 || !B2) return false
  return A1 <= B2 && B1 <= A2
}

export function computeSaldo({
  diasAnualesDefault = 0,
  devengados = null,
  ajuste = 0,
  usadosAprobados = 0,
  pendientes = 0,
}) {
  const base =
    devengados == null || Number.isNaN(Number(devengados))
      ? Number(diasAnualesDefault) || 0
      : Number(devengados)
  const adj = Number(ajuste) || 0
  const usados = Math.max(0, Number(usadosAprobados) || 0)
  const pend = Math.max(0, Number(pendientes) || 0)
  const disponible = base + adj - usados
  return {
    devengados: base,
    ajuste: adj,
    usados,
    pendientes: pend,
    disponible,
    disponibleNeto: disponible - pend,
  }
}

export function labelForState(estado, catalog = LICENSE_STATES) {
  const found = catalog.find((s) => s.key === estado)
  return found?.label || estado || ''
}

export function allowedLicenseTransitions(from) {
  const map = {
    pendiente: ['aprobada', 'rechazada', 'cancelada'],
    aprobada: ['cancelada'],
    rechazada: [],
    cancelada: [],
  }
  return map[from] || []
}

export function canTransitionLicense(from, to) {
  return allowedLicenseTransitions(from).includes(to)
}

export function serializeLicenseType(t) {
  return {
    id: String(t._id || t.id || ''),
    key: t.key,
    nombre: t.nombre,
    unidad: t.unidad || 'dias',
    diasAnualesDefault: Number(t.diasAnualesDefault) || 0,
    requiereAdjunto: Boolean(t.requiereAdjunto),
    esVacaciones: Boolean(t.esVacaciones),
    cuentaDias: t.cuentaDias === 'habiles' ? 'habiles' : 'calendario',
    codigoLegal: t.codigoLegal || '',
    normativaRef: t.normativaRef || '',
    pais: t.pais || '',
    activo: t.activo !== false,
    orden: Number(t.orden) || 100,
  }
}

export function serializeLicense(r, { includeHistorial = false } = {}) {
  const out = {
    id: String(r._id || r.id),
    codigo: r.codigo,
    tipoId: r.tipoId ? String(r.tipoId) : null,
    tipoKey: r.tipoKey || '',
    tipoNombre: r.tipoNombre || '',
    desde: toISODate(r.desde),
    hasta: toISODate(r.hasta),
    dias: Number(r.dias) || 0,
    cuentaDias: r.cuentaDias === 'habiles' ? 'habiles' : 'calendario',
    estado: r.estado,
    estadoLabel: labelForState(r.estado),
    motivo: r.motivo || '',
    saldoAntes: r.saldoAntes == null ? null : Number(r.saldoAntes),
    requesterId: r.requesterId ? String(r.requesterId) : null,
    requesterName: r.requesterName || '',
    decisionByName: r.decisionByName || '',
    decisionAt: r.decisionAt || null,
    decisionComentario: r.decisionComentario || '',
    adjuntos: (r.adjuntos || []).map((a) => ({
      nombre: a.nombre || '',
      url: a.url || '',
    })),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  if (includeHistorial) {
    out.historial = (r.historial || []).map((h) => ({
      estado: h.estado,
      actorName: h.actorName || '',
      comentario: h.comentario || '',
      at: h.at,
    }))
  }
  return out
}

export function serializeAbsence(r, { includeHistorial = false } = {}) {
  const out = {
    id: String(r._id || r.id),
    codigo: r.codigo,
    tipoKey: r.tipoKey || '',
    tipoNombre: r.tipoNombre || '',
    desde: toISODate(r.desde),
    hasta: toISODate(r.hasta),
    dias: Number(r.dias) || 0,
    estado: r.estado,
    estadoLabel: labelForState(r.estado, ABSENCE_STATES),
    motivo: r.motivo || '',
    requesterId: r.requesterId ? String(r.requesterId) : null,
    requesterName: r.requesterName || '',
    decisionByName: r.decisionByName || '',
    decisionAt: r.decisionAt || null,
    decisionComentario: r.decisionComentario || '',
    adjuntos: (r.adjuntos || []).map((a) => ({
      nombre: a.nombre || '',
      url: a.url || '',
    })),
    ecrSync: r.ecrSync || { status: 'none', note: '' },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  if (includeHistorial) {
    out.historial = (r.historial || []).map((h) => ({
      estado: h.estado,
      actorName: h.actorName || '',
      comentario: h.comentario || '',
      at: h.at,
    }))
  }
  return out
}

export function resolveCuentaDias({ tipo, licenciasConfig }) {
  if (tipo?.cuentaDias === 'habiles' || tipo?.cuentaDias === 'calendario') return tipo.cuentaDias
  if (tipo?.esVacaciones) {
    const cfg = normalizeLicenciasConfig(licenciasConfig)
    return cfg.cuentaVacaciones
  }
  return 'calendario'
}

export function buildPeriodValidation({ desde, hasta, tipo, licenciasConfig, anio }) {
  const cfg = normalizeLicenciasConfig(licenciasConfig)
  const cuentaDias = resolveCuentaDias({ tipo, licenciasConfig: cfg })
  const d0 = desde instanceof Date ? desde : null
  const yearHint =
    anio ||
    (d0 && !Number.isNaN(d0.getTime()) ? d0.getUTCFullYear() : null) ||
    (() => {
      const s = String(desde || '')
      const m = s.match(/^(\d{4})-/)
      return m ? Number(m[1]) : new Date().getUTCFullYear()
    })()

  let feriados = new Set()
  if (cuentaDias === 'habiles') {
    const extras = feriadosExtraDates(cfg, yearHint)
    feriados = feriadosSetForYear(cfg.pais, yearHint, extras)
  }
  const result = validatePeriod({ desde, hasta, cuentaDias, feriados })
  if (!result.ok || cuentaDias !== 'habiles') return result

  const y1 = result.desde.getUTCFullYear()
  const y2 = result.hasta.getUTCFullYear()
  if (y1 === y2) return result

  const extras = [...feriadosExtraDates(cfg, y1), ...feriadosExtraDates(cfg, y2)]
  const set = new Set([
    ...feriadosSetForYear(cfg.pais, y1, extras),
    ...feriadosSetForYear(cfg.pais, y2, extras),
  ])
  const dias = businessDaysInclusive(result.desde, result.hasta, set)
  if (dias < 1) {
    return {
      ok: false,
      error: 'El período no incluye días hábiles (revisá fines de semana/feriados)',
    }
  }
  return { ...result, dias }
}
