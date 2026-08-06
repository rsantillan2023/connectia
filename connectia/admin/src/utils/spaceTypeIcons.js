/** Iconos representativos para tipos de activos reservables. */
export const SPACE_TYPE_ICONS = [
  { id: 'meeting', label: 'Sala / reunión' },
  { id: 'parking', label: 'Cochera' },
  { id: 'desk', label: 'Puesto' },
  { id: 'zone', label: 'Zona' },
  { id: 'box', label: 'Activo / caja' },
  { id: 'projector', label: 'Proyector' },
  { id: 'tool', label: 'Herramienta' },
  { id: 'locker', label: 'Locker' },
  { id: 'clock', label: 'Hora libre' },
  { id: 'group', label: 'Grupo' },
  { id: 'building', label: 'Edificio' },
  { id: 'calendar', label: 'Agenda' },
]

const ENGINE_DEFAULT_ICON = {
  sala: 'meeting',
  cochera: 'parking',
  puesto: 'desk',
  zona_cupo: 'zone',
  activo: 'box',
  hora_libre: 'clock',
  grupo: 'group',
  otro: 'building',
}

export function defaultIconForEngine(engineKind) {
  return ENGINE_DEFAULT_ICON[engineKind] || 'box'
}

export function isKnownSpaceTypeIcon(id) {
  return SPACE_TYPE_ICONS.some((i) => i.id === id)
}
