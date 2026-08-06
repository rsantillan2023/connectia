/**
 * Helpers puros — Ola 31 supervisión comercial (estados / defaults / roles).
 * Sin DB.
 */

/** Estados canónicos Connectia (nombres estables; no depender de ids numéricos legado). */
export const TASK_STATUS = Object.freeze({
  PENDING: 'pendiente',
  ASSIGNED: 'asignacion',
  IN_PROGRESS: 'en_progreso',
  COMPLETED: 'completada',
  CANCELLED: 'cancelada',
})

export const TASK_STATUS_LABEL = Object.freeze({
  [TASK_STATUS.PENDING]: 'Pendiente',
  [TASK_STATUS.ASSIGNED]: 'Asignación',
  [TASK_STATUS.IN_PROGRESS]: 'En progreso',
  [TASK_STATUS.COMPLETED]: 'Completada',
  [TASK_STATUS.CANCELLED]: 'Cancelada',
})

/** Roles de supervisión (ADR-D31-1: operario canónico). */
export const SUP_ROLE = Object.freeze({
  OPERARIO: 'operario',
  SUPERVISOR: 'supervisor',
  PLATAFORMA_COMERCIAL: 'plataforma_comercial',
  GESTOR: 'gestor',
  ADMIN_MOD: 'admin_mod',
})

const FIELD_ROLES = new Set([
  SUP_ROLE.SUPERVISOR,
  SUP_ROLE.PLATAFORMA_COMERCIAL,
  SUP_ROLE.GESTOR,
  SUP_ROLE.ADMIN_MOD,
])

/**
 * Estado inicial al crear tarea (legado: 2 pendiente / 8 asignación).
 * @param {{ usuarioAsignadoId?: string|null }} input
 */
export function defaultStatusOnCreate(input = {}) {
  return input.usuarioAsignadoId ? TASK_STATUS.ASSIGNED : TASK_STATUS.PENDING
}

/**
 * Si se asigna por primera vez estando pendiente → asignación.
 * @param {{ prevStatus: string, prevAssignee: string|null|undefined, nextAssignee: string|null|undefined }} input
 */
export function statusAfterAssign(input) {
  const prev = String(input.prevStatus || '')
  const had = input.prevAssignee ? String(input.prevAssignee) : ''
  const next = input.nextAssignee ? String(input.nextAssignee) : ''
  if (next && !had && prev === TASK_STATUS.PENDING) return TASK_STATUS.ASSIGNED
  return prev || TASK_STATUS.PENDING
}

/**
 * ¿Puede abrir detalle offline? Legado: asignada + en progreso.
 */
export function canOpenDetailOffline({ status, usuarioAsignadoId }) {
  return Boolean(usuarioAsignadoId) && String(status) === TASK_STATUS.IN_PROGRESS
}

/**
 * ¿Crear tarea permitido offline? Legado: no.
 */
export function canCreateOffline() {
  return false
}

/**
 * Validar completar: foto obligatoria si requiereFoto.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateComplete({ requiereFoto, hasPhoto, observacion }) {
  if (requiereFoto && !hasPhoto) {
    return { ok: false, error: 'Esta tarea requiere foto de evidencia' }
  }
  if (!String(observacion || '').trim()) {
    return { ok: false, error: 'La observación es obligatoria' }
  }
  return { ok: true }
}

/**
 * Snapshot de mediciones de un template (no mutar plantilla después).
 * @param {Array<{ nombre?: string, tipo?: string, obligatorio?: boolean, orden?: number, requiereFoto?: boolean, requiereTexto?: boolean, key?: string }>} mediciones
 */
export function snapshotMediciones(mediciones = []) {
  return (Array.isArray(mediciones) ? mediciones : []).map((m, i) => ({
    key: String(m.key || m._id || `m${i + 1}`),
    nombre: String(m.nombre || `Medición ${i + 1}`).slice(0, 200),
    tipo: String(m.tipo || 'check').slice(0, 40),
    obligatorio: m.obligatorio !== false,
    orden: Number.isFinite(m.orden) ? m.orden : i,
    requiereFoto: Boolean(m.requiereFoto),
    requiereTexto: Boolean(m.requiereTexto),
  }))
}

export function isFieldManagerRole(role) {
  return FIELD_ROLES.has(String(role || ''))
}

export function isOperarioRole(role) {
  return String(role || '') === SUP_ROLE.OPERARIO
}

/** Mapear rol_id legado → canónico Connectia. */
export function mapLegacyRolId(rolId) {
  const n = Number(rolId)
  if (n === 5) return SUP_ROLE.ADMIN_MOD
  if (n === 2) return SUP_ROLE.SUPERVISOR
  if (n === 3) return SUP_ROLE.PLATAFORMA_COMERCIAL
  if (n === 1 || n === 4) return SUP_ROLE.OPERARIO
  return SUP_ROLE.OPERARIO
}

export function serializeTaskStatus(status) {
  const s = String(status || TASK_STATUS.PENDING)
  return {
    id: s,
    label: TASK_STATUS_LABEL[s] || s,
  }
}

/** Acciones masivas permitidas (UI ultra). */
export const BULK_ACTIONS = Object.freeze({
  ASSIGN: 'assign',
  CANCEL: 'cancel',
  PRIORITIZE: 'prioritize',
  START: 'start',
  COMPLETE: 'complete',
  SET_DEADLINE: 'set_deadline',
})

/**
 * Valida payload de acción masiva.
 * @returns {{ ok: boolean, error?: string, ids?: string[], action?: string }}
 */
export function validateBulkPayload(body = {}) {
  const action = String(body.action || '')
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String).filter(Boolean))] : []
  if (!ids.length) return { ok: false, error: 'Seleccioná al menos una tarea' }
  if (ids.length > 100) return { ok: false, error: 'Máximo 100 tareas por lote' }
  if (!Object.values(BULK_ACTIONS).includes(action)) {
    return { ok: false, error: 'Acción masiva inválida' }
  }
  if (action === BULK_ACTIONS.ASSIGN && !body.asignadoId) {
    return { ok: false, error: 'asignadoId requerido' }
  }
  if (action === BULK_ACTIONS.PRIORITIZE && !['alta', 'media', 'baja'].includes(body.prioridad)) {
    return { ok: false, error: 'prioridad inválida' }
  }
  if (action === BULK_ACTIONS.COMPLETE && !String(body.observacion || '').trim()) {
    return { ok: false, error: 'Observación obligatoria para completar' }
  }
  if (action === BULK_ACTIONS.SET_DEADLINE && !body.fechaLimite) {
    return { ok: false, error: 'fechaLimite requerida' }
  }
  return { ok: true, ids, action }
}

/**
 * ¿Se puede aplicar la acción a esta tarea en su estado actual?
 */
export function canApplyBulkAction(action, tarea) {
  const st = String(tarea?.status || '')
  if ([TASK_STATUS.CANCELLED, TASK_STATUS.COMPLETED].includes(st)) {
    if (action === BULK_ACTIONS.CANCEL || action === BULK_ACTIONS.COMPLETE) return false
    if (action === BULK_ACTIONS.START || action === BULK_ACTIONS.ASSIGN) return false
  }
  if (action === BULK_ACTIONS.COMPLETE && tarea?.requiereFoto && !tarea?.fotoUrl) return false
  if (action === BULK_ACTIONS.START && st === TASK_STATUS.IN_PROGRESS) return false
  return true
}

