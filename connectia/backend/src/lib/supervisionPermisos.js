/**
 * permisos_config por rol — pantallas/acciones del módulo supervisión (Ola 31).
 */

export const SUP_SCREENS = Object.freeze([
  'inicio',
  'historial_tareas',
  'templates',
  'abm_cliente',
  'abm_sala',
  'abm_cadena',
  'abm_subcadena',
  'abm_asignaciones',
  'roles',
  'configuracion',
  'ecr',
])

export const SUP_ACTIONS = Object.freeze([
  'ver',
  'crear',
  'editar',
  'eliminar',
  'asignar',
  'completar',
  'importar',
])

/** Defaults por rol (admin_mod = todo true). */
export function defaultPermisosForRole(role) {
  const allTrue = Object.fromEntries(
    SUP_SCREENS.map((s) => [s, Object.fromEntries(SUP_ACTIONS.map((a) => [a, true]))]),
  )
  if (role === 'admin_mod' || role === 'gestor') return allTrue

  const base = Object.fromEntries(
    SUP_SCREENS.map((s) => [s, Object.fromEntries(SUP_ACTIONS.map((a) => [a, false]))]),
  )

  if (role === 'operario') {
    base.historial_tareas = { ver: true, crear: false, editar: true, eliminar: false, asignar: false, completar: true, importar: false }
    base.inicio = { ver: true, crear: false, editar: false, eliminar: false, asignar: false, completar: false, importar: false }
    base.configuracion = { ver: true, crear: false, editar: true, eliminar: false, asignar: false, completar: false, importar: false }
    return base
  }

  if (role === 'supervisor' || role === 'plataforma_comercial') {
    for (const s of SUP_SCREENS) {
      base[s] = { ver: true, crear: true, editar: true, eliminar: false, asignar: true, completar: true, importar: false }
    }
    base.roles = { ver: false, crear: false, editar: false, eliminar: false, asignar: false, completar: false, importar: false }
    base.abm_cadena.eliminar = false
    base.ecr = { ver: true, crear: true, editar: true, eliminar: false, asignar: false, completar: true, importar: false }
    return base
  }

  return base
}

export function mergePermisos(role, stored) {
  const defaults = defaultPermisosForRole(role)
  if (!stored || typeof stored !== 'object') return defaults
  const out = { ...defaults }
  for (const screen of SUP_SCREENS) {
    out[screen] = { ...defaults[screen], ...(stored[screen] || {}) }
  }
  return out
}

export function canDo(permisos, screen, action) {
  return Boolean(permisos?.[screen]?.[action])
}
