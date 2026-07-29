/**
 * Clasificación heurística de intents del asistente (sin LLM).
 * Testeable sin Mongo ni red.
 */

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
  'solicitar_ausentismo',
  'abrir_consulta',
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
  { keys: ['asistente', 'bot', 'ayuda'], route: '/asistente', label: 'Asistente' },
]

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/**
 * @param {string} text
 * @returns {{ intent: string, entities: Record<string, string>, confidence: number }}
 */
export function detectAssistantIntent(text) {
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

  if (
    /(cuantas|cuántas|cuanto|cuánto|saldo|tengo).*(vacacion|licencia)/.test(t) ||
    /(vacacion|licencia).*(tengo|saldo|disponib)/.test(t)
  ) {
    return { intent: 'saldo_vacaciones', entities, confidence: 0.88 }
  }

  if (
    /(quiero|solicitar|pedir|tomarme|sacar).*(vacacion|licencia)/.test(t) ||
    /(vacacion|licencia).*(del|desde|el)\s+\d/.test(t)
  ) {
    const range = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g)
    if (range?.length) {
      entities.desde = range[0]
      if (range[1]) entities.hasta = range[1]
    }
    return { intent: 'solicitar_vacaciones', entities, confidence: 0.82 }
  }

  if (
    /(quiero|solicitar|pedir|registrar|cargar).*(ausencia|ausentismo)/.test(t) ||
    /(ausencia|ausentismo).*(del|desde|el)\s+\d/.test(t) ||
    /me\s+ausent(e|é|are|aré)/.test(t)
  ) {
    const range = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g)
    if (range?.length) {
      entities.desde = range[0]
      if (range[1]) entities.hasta = range[1]
    }
    return { intent: 'solicitar_ausentismo', entities, confidence: 0.82 }
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
    for (const mod of MODULE_HINTS) {
      if (mod.keys.some((k) => t.includes(norm(k)))) {
        entities.modulo = mod.label
        entities.route = mod.route
        return { intent: 'donde_modulo', entities, confidence: 0.85 }
      }
    }
    return { intent: 'donde_modulo', entities, confidence: 0.55 }
  }

  if (
    /(abrir|crear|iniciar|nueva|cargar|armar|hacer|generar)\s+(consulta|solicitud|ticket|tramite|trámite)/.test(t) ||
    /(consulta|solicitud|ticket).*(nueva|cargar|crear|abrir)/.test(t) ||
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

export function matchModuleHint(text) {
  const t = norm(text)
  for (const mod of MODULE_HINTS) {
    if (mod.keys.some((k) => t.includes(norm(k)))) return mod
  }
  return null
}

export { MODULE_HINTS }
