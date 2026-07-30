/**
 * Reglas puras para notificaciones de solicitud/consulta (§9.08).
 * Sin I/O — testeable sin Mongo.
 */

/** Nota interna: nunca notificar al solicitante. */
export function shouldSkipInternalNote(message) {
  return Boolean(message?.interno)
}

/**
 * Destinatarios de un mensaje del hilo.
 * - Admin (gestor) → solicitante (si no es interna)
 * - Solicitante → gestores (si no es interna)
 */
export function messageNotifyTarget(message) {
  if (shouldSkipInternalNote(message)) return 'none'
  if (message?.isAdmin) return 'requester'
  return 'managers'
}

/**
 * Clasifica el cambio de estado/área para elegir copy y canal.
 * @returns {{ kind: string, email: boolean, push: boolean }[]}
 */
export function classifyRequestStateEvents({ fromEstado, toEstado, fromArea, toArea, cfg }) {
  const events = []
  const areaChanged =
    fromArea != null &&
    toArea != null &&
    String(fromArea).trim() !== '' &&
    String(toArea).trim() !== '' &&
    String(fromArea).trim() !== String(toArea).trim()

  if (areaChanged) {
    events.push({ kind: 'request_area_changed', email: true, push: true })
  }

  if (!fromEstado || !toEstado || fromEstado === toEstado) return events

  const inicial = cfg?.estadoInicial || 'abierta'
  const terminales = new Set([...(cfg?.estadosTerminales || []), 'resuelta'])

  if (toEstado === inicial && terminales.has(fromEstado)) {
    events.push({ kind: 'request_reopened', email: true, push: true })
    return events
  }

  if (toEstado === 'en_proceso') {
    events.push({ kind: 'request_in_progress', email: false, push: true })
    return events
  }

  if (toEstado === 'resuelta') {
    events.push({ kind: 'request_resolved', email: false, push: true })
    return events
  }

  if (toEstado === 'a_completar') {
    events.push({ kind: 'request_to_complete', email: false, push: true })
    return events
  }

  // Otros cambios de estado (en_espera, escalada, cerrada, cancelada, …)
  events.push({ kind: 'request_state_changed', email: false, push: true })
  return events
}

export function requestEventCopy({ kind, request, fromEstado, toEstado, fromArea, toArea, stateLabelFn }) {
  const codigo = request?.codigo || 'solicitud'
  const titulo = request?.titulo || codigo
  const label = (k) => (typeof stateLabelFn === 'function' ? stateLabelFn(k) : k)

  switch (kind) {
    case 'request_created':
      return {
        title: `Nueva solicitud · ${codigo}`,
        body: `${request?.requesterName || 'Alguien'}: ${titulo}`.slice(0, 500),
      }
    case 'request_generated':
      return {
        title: `Tenés una solicitud · ${codigo}`,
        body: `Completá o respondé: ${titulo}`.slice(0, 500),
      }
    case 'request_reply':
      return {
        title: `Respuesta en ${codigo}`,
        body: `Hay un nuevo mensaje en tu solicitud: ${titulo}`.slice(0, 500),
      }
    case 'request_member_message':
      return {
        title: `Mensaje en ${codigo}`,
        body: `${request?.requesterName || 'El solicitante'} escribió en: ${titulo}`.slice(0, 500),
      }
    case 'request_reopened':
      return {
        title: `Reabierta · ${codigo}`,
        body: `${titulo} volvió a ${label(toEstado)}`.slice(0, 500),
      }
    case 'request_area_changed':
      return {
        title: `Cambio de área · ${codigo}`,
        body: `${fromArea} → ${toArea} · ${titulo}`.slice(0, 500),
      }
    case 'request_in_progress':
      return {
        title: `En proceso · ${codigo}`,
        body: `${titulo} pasó a ${label(toEstado)}`.slice(0, 500),
      }
    case 'request_resolved':
      return {
        title: `Resuelta · ${codigo}`,
        body: `${titulo} fue marcada como ${label(toEstado)}`.slice(0, 500),
      }
    case 'request_to_complete':
      return {
        title: `A completar · ${codigo}`,
        body: `Te piden completar datos en: ${titulo}`.slice(0, 500),
      }
    case 'request_state_changed':
    default:
      return {
        title: `Actualización · ${codigo}`,
        body: `${titulo}: ${label(fromEstado)} → ${label(toEstado)}`.slice(0, 500),
      }
  }
}
