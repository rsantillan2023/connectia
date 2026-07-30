/**
 * Catálogo de módulos vendibles (Ola 35 — licenciamiento modular).
 * Fuente única: packs + ids de capability. Sin segundo motor.
 */

export const MODULE_CATALOG = [
  {
    id: 'muro',
    label: 'Muro',
    hint: 'Novedades y comunicados para los miembros.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    hint: 'Pedidos y trámites con seguimiento.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'encuestas',
    label: 'Encuestas',
    hint: 'Cuestionarios y clima laboral.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'docs',
    label: 'Documentos',
    hint: 'Archivos y legajos personales.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'hub',
    label: 'Enlaces',
    hint: 'Atajos a sistemas de la empresa.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'chat',
    label: 'Chat',
    hint: 'Mensajería interna.',
    group: 'comunicacion',
    packs: ['basico', 'todo'],
  },
  {
    id: 'menu.dynamic',
    label: 'Menú configurable',
    hint: 'Permite armar el menú desde el admin.',
    group: 'plataforma',
    packs: ['basico', 'todo'],
  },
  {
    id: 'beneficios',
    label: 'Beneficios',
    hint: 'Catálogo de beneficios y recompensas.',
    group: 'rrhh',
    packs: ['todo'],
  },
  {
    id: 'beneficios.billetera',
    label: 'Billetera / puntos',
    hint: 'Saldo, canjes con puntos y transferencias internas.',
    group: 'rrhh',
    packs: ['todo'],
  },
  {
    id: 'beneficios.partners',
    label: 'Partners / enlaces externos',
    hint: 'Links tipo portal de beneficios.',
    group: 'rrhh',
    packs: ['todo'],
  },
  {
    id: 'espacios',
    label: 'Espacios',
    hint: 'Reservas de salas, cocheras y coworking.',
    group: 'oficina',
    packs: ['todo'],
  },
  {
    id: 'espacios.salas',
    label: 'Salas / espacios',
    hint: 'Catálogo y reserva de salas.',
    group: 'oficina',
    packs: ['todo'],
  },
  {
    id: 'espacios.cocheras',
    label: 'Cocheras',
    hint: 'Plazas de estacionamiento.',
    group: 'oficina',
    packs: ['todo'],
  },
  {
    id: 'espacios.coworking',
    label: 'Coworking / oficina',
    hint: 'Puestos, hot desk y “voy a la oficina”.',
    group: 'oficina',
    packs: ['todo'],
  },
  {
    id: 'licencias',
    label: 'Licencias / vacaciones',
    hint: 'Solicitudes y saldos según la legislación de la comunidad.',
    group: 'rrhh',
    packs: ['todo'],
  },
  {
    id: 'ausentismos',
    label: 'Ausentismos',
    hint: 'Registro y aprobación de ausencias.',
    group: 'rrhh',
    packs: ['todo'],
  },
  {
    id: 'relevamientos',
    label: 'Relevamientos de campo',
    hint: 'Inspecciones en sitio (add-on comercial).',
    group: 'campo',
    packs: ['todo'],
  },
  {
    id: 'pedidos',
    label: 'Pedidos de campo',
    hint: 'Catálogo + canal alarma/pánico con mapa (Ola 25).',
    group: 'campo',
    packs: ['todo'],
  },
  {
    id: 'servicios',
    label: 'Portal de servicios',
    hint: 'Catálogo deskless + agentes/SLA (Ola 43).',
    group: 'tramites',
    packs: ['todo'],
  },
]

export const MODULE_IDS = MODULE_CATALOG.map((m) => m.id)

export const MODULE_ID_SET = new Set(MODULE_IDS)

/** Packs comerciales rápidos. `personalizado` = selección libre. */
export const MODULE_PACKS = {
  basico: MODULE_CATALOG.filter((m) => m.packs.includes('basico')).map((m) => m.id),
  todo: MODULE_CATALOG.filter((m) => m.packs.includes('todo')).map((m) => m.id),
  personalizado: null,
}

/** Alias histórico (pack básico). */
export const DEFAULT_CAPS = [...MODULE_PACKS.basico]

/**
 * Resuelve lista de capabilities a partir de pack + selección opcional.
 * @param {{ pack?: string, capabilities?: string[] }} opts
 * @returns {{ pack: string, capabilities: string[] }}
 */
export function resolveLicensedCapabilities(opts = {}) {
  const rawPack = String(opts.pack || '').trim().toLowerCase()
  const pack = ['basico', 'personalizado', 'todo'].includes(rawPack) ? rawPack : ''
  const incoming = Array.isArray(opts.capabilities)
    ? opts.capabilities.filter((c) => typeof c === 'string' && c.trim())
    : []

  if (pack === 'basico') {
    return { pack: 'basico', capabilities: [...MODULE_PACKS.basico] }
  }
  if (pack === 'todo') {
    return { pack: 'todo', capabilities: [...MODULE_PACKS.todo] }
  }
  if (pack === 'personalizado' || (!pack && incoming.length)) {
    const caps = sanitizeModuleIds(incoming.length ? incoming : MODULE_PACKS.basico)
    return { pack: 'personalizado', capabilities: caps.length ? caps : [...MODULE_PACKS.basico] }
  }
  return { pack: 'basico', capabilities: [...MODULE_PACKS.basico] }
}

/** Filtra a ids conocidos del catálogo (conserva orden y unicidad). */
export function sanitizeModuleIds(ids) {
  const out = []
  const seen = new Set()
  for (const raw of ids || []) {
    const id = String(raw || '').trim()
    if (!id || seen.has(id) || !MODULE_ID_SET.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * ¿Es un id del catálogo comercial (MODULE_CATALOG)?
 * Caps fuera del catálogo (directorio, talento, supervision.equipo, admin.*, …)
 * no se gobiernan por el pack: son operativas / de otra ola.
 */
export function isCatalogModuleId(id) {
  return typeof id === 'string' && MODULE_ID_SET.has(id)
}

/**
 * Candado comercial: módulos del catálogo activos ⊆ licensed.
 * Caps fuera del catálogo se preservan (no se apagan al editar el pack).
 * Si licensed está vacío → sin restricción (tenants legacy).
 */
export function clampCapabilitiesToLicense(active, licensed) {
  const licensedList = Array.isArray(licensed) ? licensed.filter((c) => typeof c === 'string') : []
  const list = Array.isArray(active) ? active.filter((c) => typeof c === 'string') : []
  if (!licensedList.length) return list
  const allow = new Set(licensedList)
  return list.filter((c) => !MODULE_ID_SET.has(c) || allow.has(c))
}

/**
 * Al aplicar un pack desde PLATFORM, el body suele traer solo ids del catálogo.
 * Reinyecta caps operativas previas que no son del MODULE_CATALOG.
 */
export function mergeCapabilitiesPreservingExtras(incoming, previous) {
  const next = Array.isArray(incoming) ? incoming.filter((c) => typeof c === 'string') : []
  const prev = Array.isArray(previous) ? previous.filter((c) => typeof c === 'string') : []
  const incomingExtras = next.filter((c) => !MODULE_ID_SET.has(c))
  const extras = incomingExtras.length ? incomingExtras : prev.filter((c) => !MODULE_ID_SET.has(c))
  const catalog = next.filter((c) => MODULE_ID_SET.has(c))
  return [...new Set([...catalog, ...extras])]
}

export function isLicensed(tenant, capId) {
  const licensed = tenant?.licensedCapabilities
  if (!Array.isArray(licensed) || !licensed.length) return true
  // Caps fuera del catálogo comercial no están sujetas al pack.
  if (!MODULE_ID_SET.has(capId)) return true
  return licensed.includes(capId)
}
