/**
 * Catálogo de módulos vendibles (espejo del backend — Ola 35).
 * Mantener alineado con connectia/backend/src/constants/moduleCatalog.js
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
    label: 'Alarmas',
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

export const MODULE_PACKS = {
  basico: MODULE_CATALOG.filter((m) => m.packs.includes('basico')).map((m) => m.id),
  todo: MODULE_CATALOG.filter((m) => m.packs.includes('todo')).map((m) => m.id),
}

/** Default al crear comunidad: suite completa. */
export const DEFAULT_CAPS = [...MODULE_PACKS.todo]

export const PACK_OPTIONS = [
  {
    id: 'basico',
    label: 'Básico',
    hint: 'Comunicación esencial: muro, solicitudes, encuestas, docs, enlaces y chat.',
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    hint: 'Elegís módulo por módulo lo que compra el cliente.',
  },
  {
    id: 'todo',
    label: 'Todo',
    hint: 'Suite completa del catálogo vendible.',
  },
]

export function resolvePackSelection(pack, selectedIds) {
  if (pack === 'basico') return [...MODULE_PACKS.basico]
  if (pack === 'todo') return [...MODULE_PACKS.todo]
  const known = new Set(MODULE_CATALOG.map((m) => m.id))
  const picked = (selectedIds || []).filter((id) => known.has(id))
  return picked.length ? picked : [...MODULE_PACKS.todo]
}

export function detectPack(licensedIds) {
  const ids = [...(licensedIds || [])].sort().join('|')
  if (ids === [...MODULE_PACKS.basico].sort().join('|')) return 'basico'
  if (ids === [...MODULE_PACKS.todo].sort().join('|')) return 'todo'
  return 'personalizado'
}
