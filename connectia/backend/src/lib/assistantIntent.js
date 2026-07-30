/**
 * Clasificación heurística de intents del asistente (sin LLM).
 * Testeable sin Mongo ni red.
 */

import { extractBookingEntities } from './assistantBookingDraft.js'

export const ASSISTANT_INTENTS = [
  'ayuda_kb',
  'mis_solicitudes',
  'estado_consulta',
  'mis_documentos',
  'buscar_documento',
  'donde_modulo',
  'saludo',
  'recibo_sueldo',
  'saldo_vacaciones',
  'solicitar_vacaciones',
  'saldo_y_solicitar_vacaciones',
  'solicitar_ausentismo',
  'abrir_consulta',
  'reservar_sala',
  'reservar_cochera',
  'reservar_puesto',
  'como_marcar',
  'confirmar',
  'cancelar',
  'desconocido',
]

const MODULE_HINTS = [
  { keys: ['muro', 'publicacion', 'feed', 'noticia'], route: '/muro', label: 'Muro' },
  { keys: ['solicitud', 'consulta', 'ticket', 'reclamo'], route: '/solicitudes', label: 'Mis solicitudes' },
  { keys: ['documento', 'docs', 'archivo', 'pdf'], route: '/docs', label: 'Documentos' },
  { keys: ['encuesta', 'cuestionario'], route: '/encuestas', label: 'Encuestas' },
  { keys: ['enlace', 'acceso', 'hub', 'link'], route: '/accesos', label: 'Enlaces' },
  { keys: ['aviso', 'notificacion', 'push'], route: '/avisos', label: 'Avisos' },
  { keys: ['chat', 'mensaje'], route: '/chat', label: 'Chat' },
  { keys: ['perfil', 'cuenta', 'contraseña', 'password'], route: '/perfil', label: 'Mi perfil' },
  { keys: ['aprobacion', 'aprobar', 'workflow'], route: '/aprobaciones', label: 'Aprobaciones' },
  { keys: ['vacacion', 'licencia', 'permiso'], route: '/licencias', label: 'Vacaciones y permisos' },
  { keys: ['ausencia', 'ausentismo'], route: '/ausencias', label: 'Ausencias' },
  { keys: ['sala', 'cochera', 'estacionamiento', 'espacio', 'reserva'], route: '/espacios', label: 'Espacios' },
  { keys: ['puesto', 'hot desk', 'hotdesk', 'oficina', 'coworking'], route: '/oficina', label: 'Oficina' },
  { keys: ['asistente', 'bot', 'ayuda'], route: '/asistente', label: 'Asistente' },
  { keys: ['marcar', 'asistencia', 'fichaje', 'turno'], route: '/avisos', label: 'Avisos' },
]

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function extractDateEntities(t, entities) {
  const range = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g)
  if (range?.length) {
    entities.desde = range[0]
    if (range[1]) entities.hasta = range[1]
  }
}

function attachBooking(text, entities) {
  const b = extractBookingEntities(text)
  for (const [k, v] of Object.entries(b)) {
    if (v !== '' && v != null) entities[k] = String(v)
  }
}

/**
 * @param {string} text
 * @param {{ moduleHints?: typeof MODULE_HINTS }} [opts]
 * @returns {{ intent: string, entities: Record<string, string>, confidence: number }}
 */
export function detectAssistantIntent(text, opts = {}) {
  const hints = Array.isArray(opts.moduleHints) && opts.moduleHints.length ? opts.moduleHints : MODULE_HINTS
  const t = norm(text)
  const entities = {}

  if (!t) {
    return { intent: 'desconocido', entities, confidence: 0 }
  }

  if (/^(si|sí|confirmo|dale|ok|okay|acepto|confirma)$/.test(t) || /^(si|sí)\b/.test(t)) {
    return { intent: 'confirmar', entities, confidence: 0.95 }
  }
  if (/^(no|cancelar|cancelá|cancela|olvidalo|olvidalo|dejalo)$/.test(t) || /^no[, ]/.test(t)) {
    return { intent: 'cancelar', entities, confidence: 0.9 }
  }

  if (/^(hola|buen[oa]s|hey|hi)\b/.test(t) && t.length < 40) {
    return { intent: 'saludo', entities, confidence: 0.9 }
  }

  if (
    /recibo/.test(t) &&
    /(sueldo|haberes|liquidacion|nómina|nomina|pago)/.test(t)
  ) {
    const m = t.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{1,2}\/\d{4}|\d{4}-\d{2})/)
    if (m) entities.periodo = m[1]
    return { intent: 'recibo_sueldo', entities, confidence: 0.85 }
  }

  // E) combinado: saldo + pedido en el mismo mensaje
  const asksSaldo =
    /(cuantas|cuántas|cuanto|cuánto|saldo|tengo).*(vacacion|licencia)/.test(t) ||
    /(vacacion|licencia).*(tengo|saldo|disponib)/.test(t) ||
    /saber\s+(cuantas|cuántas|el\s+saldo)/.test(t)
  const asksPedido =
    /(quiero|solicitar|pedir|tomarme|sacar).*(vacacion|licencia)/.test(t) ||
    /(vacacion|licencia).*(del|desde|el)\s+\d/.test(t) ||
    /tomarme\b/.test(t)
  if (asksSaldo && asksPedido) {
    extractDateEntities(t, entities)
    return { intent: 'saldo_y_solicitar_vacaciones', entities, confidence: 0.9 }
  }

  if (asksSaldo) {
    return { intent: 'saldo_vacaciones', entities, confidence: 0.88 }
  }

  if (asksPedido) {
    extractDateEntities(t, entities)
    return { intent: 'solicitar_vacaciones', entities, confidence: 0.82 }
  }

  if (
    /(quiero|solicitar|pedir|registrar|cargar).*(ausencia|ausentismo)/.test(t) ||
    /(ausencia|ausentismo).*(del|desde|el)\s+\d/.test(t) ||
    /me\s+ausent(e|é|are|aré)/.test(t)
  ) {
    extractDateEntities(t, entities)
    return { intent: 'solicitar_ausentismo', entities, confidence: 0.82 }
  }

  if (
    /(reservar|reserva|quiero).*(sala|espacio|reunion|reunión)/.test(t) ||
    /(sala|espacio).*(libre|disponible|reserv)/.test(t)
  ) {
    attachBooking(text, entities)
    return { intent: 'reservar_sala', entities, confidence: 0.86 }
  }

  if (
    /(reservar|reserva|quiero|necesito|pedir).*(cochera|estacionamiento|garage|parking)/.test(t) ||
    /(cochera|estacionamiento).*(libre|disponible|reserv|manana|mañana)/.test(t)
  ) {
    attachBooking(text, entities)
    return { intent: 'reservar_cochera', entities, confidence: 0.86 }
  }

  if (
    /(reservar|reserva|quiero).*(puesto|hot\s*desk|escritorio)/.test(t) ||
    /voy\s+a\s+la\s+oficina/.test(t) ||
    /(puesto|hot\s*desk|coworking).*(libre|disponible|reserv)/.test(t)
  ) {
    attachBooking(text, entities)
    return { intent: 'reservar_puesto', entities, confidence: 0.86 }
  }

  if (
    /como\s+marco\b/.test(t) ||
    /como\s+marcar\b/.test(t) ||
    /como\s+(hago\s+para\s+)?marcar\b/.test(t) ||
    /como\s+ficho\b/.test(t) ||
    /donde\s+marco\s+(asistencia|entrada|salida)/.test(t)
  ) {
    entities.q = text.trim()
    return { intent: 'como_marcar', entities, confidence: 0.88 }
  }

  if (
    /(mis\s+)?solicitudes?\s+(en\s+curso|abiertas?|pendientes?|activas?)/.test(t) ||
    /(estado|como va|cómo va|seguimiento).*(solicitud|consulta|ticket)/.test(t) ||
    /(solicitud|consulta|ticket).*(estado|curso|pendiente|abierta)/.test(t) ||
    /que\s+solicitudes?\s+(tengo|hay)/.test(t) ||
    /tramites?\s+en\s+curso/.test(t)
  ) {
    return { intent: 'mis_solicitudes', entities, confidence: 0.9 }
  }

  if (
    /(mis\s+)?documentos?\s+(visibles?|disponibles?|que\s+puedo)/.test(t) ||
    /(que|qué)\s+documentos?\s+(tengo|hay|puedo|ve)/.test(t) ||
    /listar\s+documentos?/.test(t) ||
    /biblioteca\s+de\s+documentos?/.test(t)
  ) {
    return { intent: 'mis_documentos', entities, confidence: 0.88 }
  }

  if (
    /(buscar|encontrar|necesito).*(documento|pdf|archivo|manual|politica|política)/.test(t) ||
    /(documento|pdf|archivo).*(sobre|de|llamad)/.test(t)
  ) {
    entities.q = text.replace(/^(buscar|encontrar|necesito)\s+/i, '').trim()
    return { intent: 'buscar_documento', entities, confidence: 0.8 }
  }

  if (/(donde|dónde)\s+(esta|está|queda|encuentro|abro)/.test(t) || /como\s+(entro|voy)\s+a\b/.test(t)) {
    for (const mod of hints) {
      if (mod.keys.some((k) => t.includes(norm(k)))) {
        entities.modulo = mod.label
        entities.route = mod.route
        return { intent: 'donde_modulo', entities, confidence: 0.85 }
      }
    }
    return { intent: 'donde_modulo', entities, confidence: 0.55 }
  }

  // 29.CONV: “quiero hacer un trámite” / “nueva solicitud” (artículo opcional entre verbo y sustantivo)
  if (
    /(abrir|crear|iniciar|cargar|armar|hacer|generar)\s+(un[oa]?\s+)?(consulta|solicitud|ticket|tramite|trámite)/.test(
      t,
    ) ||
    /(consulta|solicitud|ticket|tramite|trámite).*(nueva|cargar|crear|abrir)/.test(t) ||
    /^(quiero\s+)?(hacer|cargar|crear|armar|iniciar|abrir)?\s*(un[oa]?\s+)?(tramite|trámite|solicitud|consulta)\s*$/.test(
      t,
    ) ||
    /^(nueva\s+)?(solicitud|consulta|tramite|trámite)\s*$/.test(t) ||
    /quiero\s+(hablar|consultar)\s+con\s+(rrhh|recursos|soporte)/.test(t) ||
    /quiero\s+(pedir|solicitar|reportar|reclamar)\b/.test(t) ||
    /necesito\s+(ayuda|soporte)\b/.test(t)
  ) {
    entities.motivo = text.trim()
    return { intent: 'abrir_consulta', entities, confidence: 0.85 }
  }

  if (
    /como\s+(hago|hago\s+para|puedo)/.test(t) ||
    /que\s+es\b/.test(t) ||
    /ayuda|faq|tutorial|politica|política|explicame|explicá/.test(t) ||
    /\?$/.test(t)
  ) {
    entities.q = text.trim()
    return { intent: 'ayuda_kb', entities, confidence: 0.7 }
  }

  return { intent: 'ayuda_kb', entities: { q: text.trim() }, confidence: 0.45 }
}

export function matchModuleHint(text, moduleHints = MODULE_HINTS) {
  const hints = Array.isArray(moduleHints) && moduleHints.length ? moduleHints : MODULE_HINTS
  const t = norm(text)
  for (const mod of hints) {
    if (mod.keys.some((k) => t.includes(norm(k)))) return mod
  }
  return null
}

export { MODULE_HINTS }
