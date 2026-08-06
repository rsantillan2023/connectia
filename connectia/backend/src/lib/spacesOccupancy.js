/**
 * Clases de ocupación de activos reservables.
 * Separa “qué es” (tipo/motor) de “cómo se reserva” (ocupación).
 */

export const OCCUPANCY_CLASSES = ['unitario', 'unidades_numeradas', 'pool', 'aforo']

export const OCCUPANCY_LABELS = {
  unitario: 'Unitario',
  unidades_numeradas: 'Unidades numeradas',
  pool: 'Cupo compartido',
  aforo: 'Aforo / multi-reserva',
}

export function occupancyLabel(cls) {
  return OCCUPANCY_LABELS[cls] || OCCUPANCY_LABELS.unitario
}

export function occupancyShortLabel(resource) {
  const cls = resolveOccupancyClass(resource)
  const n = effectiveUnitCount(resource)
  if (cls === 'unidades_numeradas') {
    const raw = String(resource?.unitLabel || 'Unidad').trim() || 'Unidad'
    const plural = pluralizeUnitLabel(raw, n)
    return `${n} ${plural} numerad${n === 1 ? 'o' : 'os'}`
  }
  if (cls === 'pool') return `Cupo ${n} (sin número)`
  if (cls === 'aforo') return `Aforo ${n} (multi-reserva)`
  return 'Unitario'
}

function pluralizeUnitLabel(label, n) {
  const lower = label.toLowerCase()
  if (n === 1) return lower
  const map = {
    cajón: 'cajones',
    cajon: 'cajones',
    butaca: 'butacas',
    unidad: 'unidades',
    locker: 'lockers',
    plaza: 'plazas',
    lugar: 'lugares',
    puesto: 'puestos',
    asiento: 'asientos',
  }
  if (map[lower]) return map[lower]
  if (lower.endsWith('ón')) return `${lower.slice(0, -2)}ones`
  if (lower.endsWith('a') || lower.endsWith('e') || lower.endsWith('o')) return `${lower}s`
  return `${lower}s`
}

/** Infere clase desde campos legacy si no hay occupancyClass. */
export function resolveOccupancyClass(resource) {
  const raw = String(resource?.occupancyClass || '').trim()
  if (OCCUPANCY_CLASSES.includes(raw)) return raw
  if (resource?.kind === 'zona_cupo') return 'pool'
  if (resource?.kind === 'cochera' && resource?.cupo != null && Number(resource.cupo) > 1) return 'pool'
  if (resource?.kind === 'hora_libre' || resource?.kind === 'grupo') {
    const c = Number(resource?.capacity || resource?.cupo)
    if (Number.isFinite(c) && c > 1) return 'aforo'
  }
  return 'unitario'
}

export function isNumberedOccupancy(resource) {
  return resolveOccupancyClass(resource) === 'unidades_numeradas'
}

export function isSharedOccupancy(resource) {
  const cls = resolveOccupancyClass(resource)
  return cls === 'pool' || cls === 'aforo' || cls === 'unidades_numeradas'
}

/** Cantidad de unidades / cupos concurrentes. */
export function effectiveUnitCount(resource) {
  if (!resource) return 1
  const cls = resolveOccupancyClass(resource)
  if (cls === 'unitario') return 1
  const fromUnits = Number(resource.unitCount)
  if (Number.isFinite(fromUnits) && fromUnits > 0) return Math.min(fromUnits, 5000)
  const fromCupo = Number(resource.cupo)
  if (Number.isFinite(fromCupo) && fromCupo > 0) return Math.min(fromCupo, 5000)
  if (cls === 'aforo') {
    const fromCap = Number(resource.capacity)
    if (Number.isFinite(fromCap) && fromCap > 0) return Math.min(fromCap, 5000)
  }
  return 1
}

export function unitPrefixOf(resource) {
  return String(resource?.unitPrefix || '').trim().slice(0, 12)
}

export function unitPadOf(resource) {
  const p = Number(resource?.unitPad)
  if (Number.isFinite(p) && p >= 1 && p <= 6) return Math.floor(p)
  const n = effectiveUnitCount(resource)
  if (n >= 1000) return 4
  if (n >= 100) return 3
  if (n >= 10) return 2
  return 1
}

export function unitLabelOf(resource) {
  const custom = String(resource?.unitLabel || '').trim()
  if (custom) return custom.slice(0, 40)
  const cls = resolveOccupancyClass(resource)
  if (cls === 'unidades_numeradas') return 'Unidad'
  if (cls === 'pool') return 'Cupo'
  if (cls === 'aforo') return 'Lugar'
  return 'Activo'
}

/** Genera códigos L-001 … L-N */
export function buildUnitCodes(resource) {
  const n = effectiveUnitCount(resource)
  const prefix = unitPrefixOf(resource)
  const pad = unitPadOf(resource)
  const codes = []
  for (let i = 1; i <= n; i += 1) {
    codes.push(`${prefix}${String(i).padStart(pad, '0')}`)
  }
  return codes
}

export function normalizeUnitCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .slice(0, 40)
}

export function isValidUnitCode(resource, code) {
  if (!isNumberedOccupancy(resource)) return !code
  const normalized = normalizeUnitCode(code)
  if (!normalized) return false
  return buildUnitCodes(resource).includes(normalized)
}

/**
 * Normaliza campos de ocupación al guardar.
 */
export function normalizeOccupancyFields(input = {}, { kind } = {}) {
  let occupancyClass = String(input.occupancyClass || '').trim()
  if (!OCCUPANCY_CLASSES.includes(occupancyClass)) {
    occupancyClass = resolveOccupancyClass({ ...input, kind: kind || input.kind })
  }

  let unitCount = input.unitCount == null || input.unitCount === '' ? null : Number(input.unitCount)
  if (!Number.isFinite(unitCount) || unitCount < 1) unitCount = null

  if (occupancyClass === 'unitario') {
    unitCount = 1
  } else if (unitCount == null) {
    const cupo = Number(input.cupo)
    const cap = Number(input.capacity)
    unitCount =
      Number.isFinite(cupo) && cupo > 0 ? cupo : Number.isFinite(cap) && cap > 0 ? cap : 10
  }
  unitCount = Math.min(Math.max(1, Math.floor(unitCount)), 5000)

  const unitLabel = String(input.unitLabel || '').trim().slice(0, 40)
  const unitPrefix = String(input.unitPrefix || '').trim().slice(0, 12)
  let unitPad = Number(input.unitPad)
  if (!Number.isFinite(unitPad) || unitPad < 1 || unitPad > 6) {
    unitPad = unitCount >= 100 ? 3 : unitCount >= 10 ? 2 : 1
  } else {
    unitPad = Math.floor(unitPad)
  }

  // Mantener cupo alineado para motores legacy (zona_cupo / cochera)
  let cupo = input.cupo == null || input.cupo === '' ? null : Number(input.cupo)
  if (occupancyClass === 'unitario') {
    cupo = null
  } else if (occupancyClass === 'pool' || occupancyClass === 'aforo' || occupancyClass === 'unidades_numeradas') {
    cupo = unitCount
  }

  return {
    occupancyClass,
    unitCount: occupancyClass === 'unitario' ? 1 : unitCount,
    unitLabel:
      unitLabel ||
      (occupancyClass === 'unidades_numeradas'
        ? 'Cajón'
        : occupancyClass === 'aforo'
          ? 'Lugar'
          : occupancyClass === 'pool'
            ? 'Cupo'
            : ''),
    unitPrefix,
    unitPad,
    cupo: Number.isFinite(cupo) ? cupo : null,
  }
}

export function spacesOccupancyMeta() {
  return {
    classes: OCCUPANCY_CLASSES.map((id) => ({
      id,
      label: OCCUPANCY_LABELS[id],
      needsUnits: id !== 'unitario',
      numbered: id === 'unidades_numeradas',
    })),
  }
}
