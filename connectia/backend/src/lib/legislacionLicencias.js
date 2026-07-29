/**
 * Packs legislativos de licencias/vacaciones — Argentina (LCT) y Chile (Código del Trabajo).
 * Helpers puros (sin Mongo). El tenant elige el pack; los tipos y el cálculo se adaptan.
 *
 * Referencias orientativas (producto configurable; no sustituye asesoría legal):
 * - AR: Ley de Contrato de Trabajo N° 20.744 arts. 150–154 (vacaciones en días corridos).
 * - CL: Código del Trabajo arts. 67–68 (vacaciones en días hábiles + progresivas).
 */

export const LEGISLACION_PAISES = ['AR', 'CL']

export const LEGISLACION_META = {
  AR: {
    pais: 'AR',
    nombre: 'Argentina',
    marco: 'Ley de Contrato de Trabajo N° 20.744',
    timezoneDefault: 'America/Argentina/Buenos_Aires',
    /** Vacaciones LCT: días corridos (calendario). */
    cuentaVacaciones: 'calendario',
    locale: 'es-AR',
  },
  CL: {
    pais: 'CL',
    nombre: 'Chile',
    marco: 'Código del Trabajo (arts. 67–68 y afines)',
    timezoneDefault: 'America/Santiago',
    /** Vacaciones legales: días hábiles (lun–vie; feriados aparte). */
    cuentaVacaciones: 'habiles',
    locale: 'es-CL',
  },
}

/**
 * Tramos de vacaciones por antigüedad (años cumplidos al 31/12 del período o fecha de goce).
 * `hastaAnios` exclusivo del tramo siguiente; null = sin tope.
 */
export const VACACIONES_ANTIGUEDAD = {
  AR: [
    { desdeAnios: 0, hastaAnios: 5, dias: 14, nota: 'LCT art. 150 — hasta 5 años' },
    { desdeAnios: 5, hastaAnios: 10, dias: 21, nota: 'LCT art. 150 — más de 5 hasta 10' },
    { desdeAnios: 10, hastaAnios: 20, dias: 28, nota: 'LCT art. 150 — más de 10 hasta 20' },
    { desdeAnios: 20, hastaAnios: null, dias: 35, nota: 'LCT art. 150 — más de 20 años' },
  ],
  CL: [
    { desdeAnios: 0, hastaAnios: 10, dias: 15, nota: 'CT art. 67 — 15 días hábiles base' },
    // Progresivas: +1 día hábil cada 3 años después de 10 (misma empresa).
    // Se modela como función aparte; este tramo es el piso.
  ],
}

/** Tipos de licencia/permiso por legislación (catálogo producto). */
export const LICENSE_TYPES_BY_PAIS = {
  AR: [
    {
      key: 'vacaciones',
      nombre: 'Vacaciones anuales',
      unidad: 'dias',
      diasAnualesDefault: 14,
      requiereAdjunto: false,
      esVacaciones: true,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-150',
      normativaRef: 'LCT art. 150 — días corridos según antigüedad',
      activo: true,
      orden: 10,
    },
    {
      key: 'enfermedad',
      nombre: 'Licencia por enfermedad / accidente',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-208',
      normativaRef: 'LCT arts. 208–213 — certificado médico',
      activo: true,
      orden: 20,
    },
    {
      key: 'maternidad',
      nombre: 'Licencia por maternidad',
      unidad: 'dias',
      diasAnualesDefault: 90,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-177',
      normativaRef: 'LCT art. 177 — 90 días corridos',
      activo: true,
      orden: 25,
    },
    {
      key: 'paternidad',
      nombre: 'Licencia por paternidad',
      unidad: 'dias',
      diasAnualesDefault: 2,
      requiereAdjunto: false,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-158',
      normativaRef: 'LCT art. 158 c) — 2 días corridos',
      activo: true,
      orden: 26,
    },
    {
      key: 'examen',
      nombre: 'Examen / estudio',
      unidad: 'dias',
      diasAnualesDefault: 10,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-183',
      normativaRef: 'LCT art. 183 — hasta 10 días por año calendario (secundario/universitario)',
      activo: true,
      orden: 30,
    },
    {
      key: 'matrimonio',
      nombre: 'Licencia por matrimonio',
      unidad: 'dias',
      diasAnualesDefault: 10,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-158',
      normativaRef: 'LCT art. 158 a) — 10 días corridos',
      activo: true,
      orden: 35,
    },
    {
      key: 'fallecimiento',
      nombre: 'Fallecimiento de familiar',
      unidad: 'dias',
      diasAnualesDefault: 3,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'LCT-158',
      normativaRef: 'LCT art. 158 b) — 3 días (cónyuge/hijos/padres/hermanos)',
      activo: true,
      orden: 36,
    },
    {
      key: 'donacion_sangre',
      nombre: 'Donación de sangre',
      unidad: 'dias',
      diasAnualesDefault: 1,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'AR-DON',
      normativaRef: 'Normativa provincial / convenio — 1 día típico',
      activo: true,
      orden: 50,
    },
    {
      key: 'particular',
      nombre: 'Día particular / permiso sin goce',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: false,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CONV',
      normativaRef: 'A convenir / política de empresa',
      activo: true,
      orden: 90,
    },
  ],
  CL: [
    {
      key: 'vacaciones',
      nombre: 'Feriado anual (vacaciones)',
      unidad: 'dias',
      diasAnualesDefault: 15,
      requiereAdjunto: false,
      esVacaciones: true,
      cuentaDias: 'habiles',
      codigoLegal: 'CT-67',
      normativaRef: 'CT art. 67 — 15 días hábiles + progresivas art. 68',
      activo: true,
      orden: 10,
    },
    {
      key: 'licencia_medica',
      nombre: 'Licencia médica',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CL-LM',
      normativaRef: 'Licencia médica Fonasa/Isapre — adjunto obligatorio',
      activo: true,
      orden: 20,
    },
    {
      key: 'enfermedad',
      nombre: 'Licencia por enfermedad (alias)',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CL-LM',
      normativaRef: 'Alias de licencia médica para compatibilidad de intents',
      activo: true,
      orden: 21,
    },
    {
      key: 'maternidad',
      nombre: 'Protección a la maternidad',
      unidad: 'dias',
      diasAnualesDefault: 126,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CT-195',
      normativaRef: 'CT — prenatal + postnatal (configurar según régimen vigente)',
      activo: true,
      orden: 25,
    },
    {
      key: 'paternidad',
      nombre: 'Permiso postnatal parental / paternidad',
      unidad: 'dias',
      diasAnualesDefault: 5,
      requiereAdjunto: false,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CT-195',
      normativaRef: 'CT — días de permiso del padre (política / ley vigente)',
      activo: true,
      orden: 26,
    },
    {
      key: 'examen',
      nombre: 'Permiso de estudios / exámenes',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'habiles',
      codigoLegal: 'CONV-CL',
      normativaRef: 'Según contrato / reglamento interno',
      activo: true,
      orden: 30,
    },
    {
      key: 'matrimonio',
      nombre: 'Permiso por matrimonio / unión civil',
      unidad: 'dias',
      diasAnualesDefault: 5,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CT-66',
      normativaRef: 'CT art. 66 — 5 días hábiles en caso de matrimonio',
      activo: true,
      orden: 35,
    },
    {
      key: 'fallecimiento',
      nombre: 'Permiso por fallecimiento',
      unidad: 'dias',
      diasAnualesDefault: 7,
      requiereAdjunto: true,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CT-66',
      normativaRef: 'CT art. 66 — días según parentesco',
      activo: true,
      orden: 36,
    },
    {
      key: 'particular',
      nombre: 'Permiso sin goce de remuneraciones',
      unidad: 'dias',
      diasAnualesDefault: 0,
      requiereAdjunto: false,
      esVacaciones: false,
      cuentaDias: 'calendario',
      codigoLegal: 'CONV-CL',
      normativaRef: 'Acuerdo con el empleador',
      activo: true,
      orden: 90,
    },
  ],
}

/** Feriados nacionales fijos típicos (mes-día). Variables (pascua, etc.) quedan fuera del núcleo. */
export const FERIADOS_FIJOS = {
  AR: [
    '01-01', // Año Nuevo
    '03-24', // Memoria
    '04-02', // Malvinas
    '05-01', // Trabajador
    '05-25', // Revolución de Mayo
    '06-20', // Belgrano
    '07-09', // Independencia
    '12-08', // Inmaculada
    '12-25', // Navidad
  ],
  CL: [
    '01-01', // Año Nuevo
    '05-01', // Trabajador
    '05-21', // Glorias Navales
    '06-29', // San Pedro y San Pablo (si aplica año)
    '07-16', // Virgen del Carmen
    '08-15', // Asunción
    '09-18', // Independencia
    '09-19', // Glorias del Ejército
    '10-12', // Encuentro de Dos Mundos / Día de la Raza (histórico)
    '10-31', // Iglesias Evangélicas
    '11-01', // Todos los Santos
    '12-08', // Inmaculada
    '12-25', // Navidad
  ],
}

export function normalizePaisLegislacion(raw) {
  const p = String(raw || 'AR')
    .trim()
    .toUpperCase()
  return LEGISLACION_PAISES.includes(p) ? p : 'AR'
}

export function defaultLicenciasConfig(pais = 'AR') {
  const p = normalizePaisLegislacion(pais)
  const meta = LEGISLACION_META[p]
  return {
    pais: p,
    marco: meta.marco,
    cuentaVacaciones: meta.cuentaVacaciones,
    /** Si true, al solicitar vacaciones se usa el tramo por antigüedad. */
    usarAntiguedad: true,
    /** Advertir (no bloquear) si el inicio no cumple política local (ej. lunes AR). */
    advertirInicioSemana: p === 'AR',
    /** Feriados propios de la comunidad (además de los nacionales del pack). */
    feriados: [],
  }
}

/**
 * @param {unknown} raw
 * @returns {{ fecha: string, nombre: string, recurrente: boolean }[]}
 */
export function normalizeFeriadosList(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    let fecha = String(item.fecha || '').trim().slice(0, 10)
    const recurrente = Boolean(item.recurrente)
    // Acepta MM-DD como recurrente
    if (/^\d{2}-\d{2}$/.test(fecha)) {
      const y = new Date().getUTCFullYear()
      fecha = `${y}-${fecha}`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue
    const key = recurrente ? `R:${fecha.slice(5)}` : fecha
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      fecha,
      nombre: String(item.nombre || '').trim().slice(0, 120) || 'Feriado',
      recurrente,
    })
    if (out.length >= 366) break
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Fechas YYYY-MM-DD de feriados de comunidad para un año (incluye recurrentes). */
export function feriadosExtraDates(licenciasConfig, anio) {
  const year = Number(anio) || new Date().getUTCFullYear()
  const list = normalizeFeriadosList(licenciasConfig?.feriados)
  const dates = []
  for (const f of list) {
    if (f.recurrente) {
      dates.push(`${year}-${f.fecha.slice(5)}`)
    } else if (f.fecha.startsWith(`${year}-`)) {
      dates.push(f.fecha)
    }
  }
  return dates
}

export function normalizeLicenciasConfig(raw) {
  const base = defaultLicenciasConfig(raw?.pais)
  if (!raw || typeof raw !== 'object') return base
  const pais = normalizePaisLegislacion(raw.pais || base.pais)
  const meta = LEGISLACION_META[pais]
  const cuenta =
    raw.cuentaVacaciones === 'habiles' || raw.cuentaVacaciones === 'calendario'
      ? raw.cuentaVacaciones
      : meta.cuentaVacaciones
  return {
    pais,
    marco: meta.marco,
    cuentaVacaciones: cuenta,
    usarAntiguedad: raw.usarAntiguedad !== false,
    advertirInicioSemana: raw.advertirInicioSemana != null ? Boolean(raw.advertirInicioSemana) : pais === 'AR',
    feriados: normalizeFeriadosList(raw.feriados),
  }
}

export function licenseTypesForPais(pais = 'AR') {
  const p = normalizePaisLegislacion(pais)
  return (LICENSE_TYPES_BY_PAIS[p] || LICENSE_TYPES_BY_PAIS.AR).map((t) => ({
    ...t,
    diasAnualesDefault: Number(t.diasAnualesDefault) || 0,
    pais: p,
  }))
}

/**
 * Días de vacaciones según antigüedad (años).
 * CL: base 15 + progresivas (+1 cada 3 años después de 10).
 */
export function vacationDaysBySeniority(pais, aniosAntiguedad) {
  const p = normalizePaisLegislacion(pais)
  const years = Math.max(0, Number(aniosAntiguedad) || 0)

  if (p === 'CL') {
    let dias = 15
    if (years > 10) {
      const extra = Math.floor((years - 10) / 3)
      dias += Math.max(0, extra)
    }
    return { dias, cuentaDias: 'habiles', tramo: years > 10 ? 'progresivas' : 'base', anios: years }
  }

  const tramos = VACACIONES_ANTIGUEDAD.AR
  for (const t of tramos) {
    const hi = t.hastaAnios
    if (years >= t.desdeAnios && (hi == null || years < hi)) {
      return { dias: t.dias, cuentaDias: 'calendario', tramo: t.nota, anios: years }
    }
  }
  return { dias: 14, cuentaDias: 'calendario', tramo: 'default', anios: years }
}

/** Años de antigüedad entre ingreso y fecha de referencia (UTC). */
export function yearsOfService(fechaIngreso, refDate = new Date()) {
  const a = fechaIngreso instanceof Date ? fechaIngreso : new Date(fechaIngreso)
  const b = refDate instanceof Date ? refDate : new Date(refDate)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0
  let y = b.getUTCFullYear() - a.getUTCFullYear()
  const m = b.getUTCMonth() - a.getUTCMonth()
  if (m < 0 || (m === 0 && b.getUTCDate() < a.getUTCDate())) y -= 1
  return Math.max(0, y)
}

export function feriadosSetForYear(pais, anio, extra = []) {
  const p = normalizePaisLegislacion(pais)
  const year = Number(anio) || new Date().getUTCFullYear()
  const fixed = FERIADOS_FIJOS[p] || []
  const set = new Set(fixed.map((md) => `${year}-${md}`))
  for (const d of extra || []) {
    const s = String(d || '').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) set.add(s)
  }
  return set
}

/**
 * Contar días hábiles inclusivos (lun–vie), excluyendo feriados YYYY-MM-DD.
 */
export function businessDaysInclusive(desde, hasta, feriados = new Set()) {
  const { parseDateInput, toISODate } = requireDateHelpers()
  const a = desde instanceof Date ? desde : parseDateInput(desde)
  const b = hasta instanceof Date ? hasta : parseDateInput(hasta)
  if (!a || !b || b < a) return 0
  let n = 0
  const cur = new Date(a.getTime())
  while (cur <= b) {
    const dow = cur.getUTCDay() // 0=dom … 6=sáb
    const iso = toISODate(cur)
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) n += 1
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return n
}

function requireDateHelpers() {
  // lazy import circular-safe: mismos helpers viven en licenciasConfig
  return {
    parseDateInput: (raw) => {
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
    },
    toISODate: (d) => {
      if (!d) return ''
      const x = d instanceof Date ? d : new Date(d)
      if (Number.isNaN(x.getTime())) return ''
      return x.toISOString().slice(0, 10)
    },
  }
}

export function listLegislacionOptions() {
  return LEGISLACION_PAISES.map((p) => ({
    ...LEGISLACION_META[p],
    tipos: licenseTypesForPais(p).length,
    vacacionesAntiguedad: VACACIONES_ANTIGUEDAD[p] || [],
  }))
}
