/** Catálogo base de estados posibles (el tenant activa un subconjunto). */
export const STATE_CATALOG = [
  { key: 'abierta', label: 'Abierta', orden: 10 },
  { key: 'en_proceso', label: 'En proceso', orden: 20 },
  { key: 'a_completar', label: 'A completar', orden: 30 },
  { key: 'en_espera', label: 'En espera', orden: 40 },
  { key: 'escalada', label: 'Escalada', orden: 50 },
  { key: 'resuelta', label: 'Resuelta', orden: 60 },
  { key: 'cerrada', label: 'Cerrada', orden: 70 },
  { key: 'cancelada', label: 'Cancelada', orden: 80 },
]

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'check', 'select', 'email', 'url']

export function defaultSolicitudesConfig() {
  return {
    estados: STATE_CATALOG.map((s) => ({
      key: s.key,
      label: s.label,
      orden: s.orden,
      /** Por defecto: núcleo clásico activo; el resto disponible para activar */
      activo: ['abierta', 'en_proceso', 'a_completar', 'resuelta', 'cerrada'].includes(s.key),
    })),
    estadoInicial: 'abierta',
    /** Desde estos estados el solicitante puede calificar/cerrar */
    estadosCalificables: ['resuelta'],
    /** Estados terminales (U no responde salvo reopen) */
    estadosTerminales: ['cerrada', 'cancelada'],
    /** Transiciones permitidas (solo entre estados activos) */
    transiciones: {
      abierta: ['en_proceso', 'a_completar', 'en_espera', 'escalada', 'resuelta', 'cerrada', 'cancelada'],
      en_proceso: ['a_completar', 'en_espera', 'escalada', 'resuelta', 'cerrada', 'abierta', 'cancelada'],
      a_completar: ['en_proceso', 'resuelta', 'cerrada', 'abierta', 'cancelada'],
      en_espera: ['en_proceso', 'a_completar', 'resuelta', 'cerrada', 'cancelada'],
      escalada: ['en_proceso', 'resuelta', 'cerrada', 'cancelada'],
      resuelta: ['cerrada', 'abierta', 'en_proceso'],
      cerrada: ['abierta'],
      cancelada: ['abierta'],
    },
    /**
     * Transiciones del dueño (app user): resolver, cerrar sin calificar y reabrir.
     * El admin usa la matriz completa `transiciones`.
     */
    transicionesUsuario: {
      abierta: ['resuelta', 'cerrada'],
      en_proceso: ['resuelta', 'cerrada'],
      a_completar: ['resuelta', 'cerrada'],
      en_espera: ['resuelta', 'cerrada'],
      escalada: ['resuelta', 'cerrada'],
      resuelta: ['cerrada', 'abierta'],
      cerrada: ['abierta'],
      cancelada: ['abierta'],
    },
  }
}

export function normalizeSolicitudesConfig(raw) {
  const base = defaultSolicitudesConfig()
  if (!raw || typeof raw !== 'object') return base

  const byKey = new Map(STATE_CATALOG.map((s) => [s.key, s]))
  const incoming = Array.isArray(raw.estados) ? raw.estados : []
  const merged = STATE_CATALOG.map((cat) => {
    const found = incoming.find((e) => e && e.key === cat.key)
    return {
      key: cat.key,
      label: (found?.label && String(found.label).trim()) || cat.label,
      orden: Number(found?.orden) || cat.orden,
      activo: found ? found.activo !== false : base.estados.find((e) => e.key === cat.key)?.activo !== false,
    }
  })

  // permitir solo keys del catálogo
  const activos = new Set(merged.filter((e) => e.activo).map((e) => e.key))
  let estadoInicial = String(raw.estadoInicial || base.estadoInicial)
  if (!activos.has(estadoInicial)) {
    estadoInicial = [...activos][0] || 'abierta'
    if (!activos.has(estadoInicial)) {
      merged.find((e) => e.key === 'abierta').activo = true
      activos.add('abierta')
      estadoInicial = 'abierta'
    }
  }

  const estadosCalificables = (Array.isArray(raw.estadosCalificables) ? raw.estadosCalificables : base.estadosCalificables)
    .map(String)
    .filter((k) => byKey.has(k) && activos.has(k))
  const estadosTerminales = (Array.isArray(raw.estadosTerminales) ? raw.estadosTerminales : base.estadosTerminales)
    .map(String)
    .filter((k) => byKey.has(k))

  const transiciones = {}
  const srcT = raw.transiciones && typeof raw.transiciones === 'object' ? raw.transiciones : base.transiciones
  for (const from of Object.keys(base.transiciones)) {
    const list = Array.isArray(srcT[from]) ? srcT[from] : base.transiciones[from]
    transiciones[from] = [...new Set(list.map(String).filter((k) => byKey.has(k)))]
  }

  const transicionesUsuario = {}
  const srcU =
    raw.transicionesUsuario && typeof raw.transicionesUsuario === 'object'
      ? raw.transicionesUsuario
      : null
  for (const from of Object.keys(base.transicionesUsuario)) {
    // Si el tenant no definió este "from", o mandó lista vacía, usamos el default
    // (dueño siempre puede resolver / cerrar / reabrir según el estado).
    const incoming = srcU && Array.isArray(srcU[from]) ? srcU[from] : null
    const list = incoming && incoming.length ? incoming : base.transicionesUsuario[from]
    const merged = [...new Set([...list.map(String), ...base.transicionesUsuario[from]].filter((k) => byKey.has(k)))]
    transicionesUsuario[from] = merged
  }

  return {
    estados: merged.sort((a, b) => a.orden - b.orden),
    estadoInicial,
    estadosCalificables: estadosCalificables.length ? estadosCalificables : ['resuelta'].filter((k) => activos.has(k)),
    estadosTerminales,
    transiciones,
    transicionesUsuario,
  }
}

export function activeStates(cfg) {
  return (cfg?.estados || []).filter((e) => e.activo)
}

export function stateLabel(cfg, key) {
  return (cfg?.estados || []).find((e) => e.key === key)?.label || key
}

export function allowedTransitions(cfg, from, { isAdmin } = {}) {
  const activos = new Set(activeStates(cfg).map((e) => e.key))
  if (!activos.has(from)) return []
  const map = isAdmin ? cfg.transiciones : cfg.transicionesUsuario
  return (map?.[from] || []).filter((k) => activos.has(k))
}

export function normalizeCampos(campos) {
  if (!Array.isArray(campos)) return []
  return campos
    .map((c, i) => {
      const key = String(c.key || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
      if (!key) return null
      const tipo = FIELD_TYPES.includes(c.tipo) ? c.tipo : 'text'
      let opciones = []
      if (tipo === 'select') {
        opciones = Array.isArray(c.opciones)
          ? c.opciones.map(String).map((s) => s.trim()).filter(Boolean)
          : String(c.opciones || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
      }
      return {
        key,
        label: String(c.label || key).trim(),
        tipo,
        required: Boolean(c.required),
        opciones,
        placeholder: String(c.placeholder || ''),
        orden: Number(c.orden) || (i + 1) * 10,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.orden - b.orden)
}

export function validateCampoValues(camposDef, valuesInput) {
  const values = valuesInput && typeof valuesInput === 'object' ? valuesInput : {}
  const out = []
  const errors = []
  for (const def of camposDef || []) {
    let raw = values[def.key]
    if (def.tipo === 'check') {
      raw = Boolean(raw)
      out.push({ key: def.key, label: def.label, tipo: def.tipo, value: raw })
      if (def.required && !raw) errors.push(`${def.label} es obligatorio`)
      continue
    }
    if (raw == null || raw === '') {
      if (def.required) errors.push(`${def.label} es obligatorio`)
      out.push({ key: def.key, label: def.label, tipo: def.tipo, value: '' })
      continue
    }
    let value = raw
    if (def.tipo === 'number') {
      value = Number(raw)
      if (Number.isNaN(value)) errors.push(`${def.label} debe ser numérico`)
    } else if (def.tipo === 'select') {
      value = String(raw)
      if (def.opciones.length && !def.opciones.includes(value)) {
        errors.push(`${def.label}: opción inválida`)
      }
    } else if (def.tipo === 'email') {
      value = String(raw).trim()
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${def.label}: email inválido`)
    } else if (def.tipo === 'url') {
      value = String(raw).trim()
      if (value && !/^https?:\/\//i.test(value)) errors.push(`${def.label}: URL inválida (http/https)`)
    } else {
      value = String(raw).trim()
    }
    out.push({ key: def.key, label: def.label, tipo: def.tipo, value })
  }
  return { values: out, errors }
}
