/**
 * Armado conversacional de solicitudes desde lenguaje natural.
 */
import { validateCampoValues } from './solicitudesConfig.js'

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/**
 * @param {Array<{_id:any,key:string,nombre:string,descripcion?:string,area?:string,campos?:any[]}>} types
 * @param {string} text
 */
export function matchRequestType(types, text) {
  const t = norm(text)
  if (!types?.length) return null

  // Solo “cargar/crear solicitud” sin tipificar → no adivinar
  if (
    /^(quiero\s+)?(cargar|crear|armar|abrir|hacer|iniciar|generar)?\s*(una\s+)?(solicitud|consulta|ticket|tramite|trámite)\s*$/i.test(
      t,
    ) ||
    /^(nueva\s+)?(solicitud|consulta)\s*$/i.test(t)
  ) {
    return null
  }

  // elección por número "1" / "tipo 2"
  const num = t.match(/^(?:tipo\s*)?(\d{1,2})$/)
  if (num) {
    const i = Number(num[1]) - 1
    if (i >= 0 && i < types.length) return types[i]
  }

  let best = null
  let bestScore = 0
  for (const tipo of types) {
    const key = norm(tipo.key)
    const nombre = norm(tipo.nombre)
    const area = norm(tipo.area)
    let score = 0
    if (key && (t === key || new RegExp(`(?:^|\\s)${key}(?:\\s|$)`).test(t))) score += 5
    if (nombre && (t === nombre || t.includes(nombre))) score += 6
    if (area && new RegExp(`(?:^|\\s)${area}(?:\\s|$)`).test(t)) score += 3
    for (const w of nombre.split(/\s+/).filter((x) => x.length > 4)) {
      if (t.includes(w)) score += 2
    }
    if (/rrhh|vacacion|licencia|recibo|legajo|sueldo/.test(t) && /rrhh|vacacion|licencia|recibo|legajo/.test(`${key} ${nombre}`)) {
      score += 4
    }
    if (/vpn|correo|sistema|it|acceso|password|contraseña|notebook|pc/.test(t) && /sistem|it|acceso|tecn|soporte/.test(`${key} ${nombre} ${area}`)) {
      score += 4
    }
    if (/dato.?personal|direccion|telefono|domicilio/.test(t) && /dato|personal/.test(`${key} ${nombre}`)) {
      score += 4
    }
    if (/carnet|credencial|turno\s+carnet/.test(t) && /carnet|credencial/.test(`${key} ${nombre}`)) {
      score += 5
    }
    if (score > bestScore) {
      bestScore = score
      best = tipo
    }
  }
  return bestScore >= 4 ? best : null
}

/**
 * Extrae valores de campos desde texto libre (heurística).
 * @param {Array} camposDef
 * @param {string} text
 * @param {Record<string, any>} prev
 */
export function extractCamposFromText(camposDef, text, prev = {}) {
  const out = { ...prev }
  const raw = String(text || '')
  const t = norm(raw)

  for (const def of camposDef || []) {
    const key = def.key
    const label = norm(def.label)
    if (def.tipo === 'check') {
      if (
        new RegExp(`(si|sí|true|bloquea|urgente).*(${label}|${norm(key)})|(${label}|${norm(key)}).*(si|sí|true|bloquea)`, 'i').test(
          t,
        ) ||
        (/bloquea|urgente|no puedo trabajar|me traba/.test(t) && /urgente|bloquea/.test(norm(key) + label))
      ) {
        out[key] = true
      }
      continue
    }

    if (def.tipo === 'select' && Array.isArray(def.opciones) && def.opciones.length) {
      for (const opt of def.opciones) {
        if (t.includes(norm(opt))) {
          out[key] = opt
          break
        }
      }
      continue
    }

    if (def.tipo === 'date') {
      const m = raw.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g)
      if (m?.length) {
        if (norm(key).includes('hasta') || label.includes('hasta')) out[key] = m[1] || m[0]
        else if (norm(key).includes('desde') || label.includes('desde')) out[key] = m[0]
        else if (!out[key]) out[key] = m[0]
      }
      continue
    }

    if (def.tipo === 'email') {
      const m = raw.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)
      if (m) out[key] = m[0]
      continue
    }

    if (def.tipo === 'url') {
      const m = raw.match(/https?:\/\/\S+/i)
      if (m) out[key] = m[0]
      continue
    }

    // text / textarea / number: buscar "label: valor" o "label es valor"
    const labelRx = new RegExp(
      `(?:${label}|${norm(key)})\\s*(?:es|:|=|-)\\s*([^\\n.;]+)`,
      'i',
    )
    const m = raw.match(labelRx)
    if (m) {
      out[key] = m[1].trim()
      continue
    }
  }

  // Heurísticas por key conocida
  if (!out.sistema && /vpn|correo|outlook|sap|teams|wifi/i.test(raw)) {
    const m = raw.match(/\b(vpn|correo|outlook|sap|teams|wifi|notebook)\b/i)
    if (m && camposDef.some((c) => c.key === 'sistema')) out.sistema = m[1]
  }
  if (!out.prioridad) {
    if (/prioridad\s*alta|alta prioridad|\balta\b/.test(t) && camposDef.some((c) => c.key === 'prioridad')) {
      out.prioridad = 'Alta'
    } else if (/prioridad\s*media|media prioridad/.test(t) && camposDef.some((c) => c.key === 'prioridad')) {
      out.prioridad = 'Media'
    } else if (/prioridad\s*baja|baja prioridad/.test(t) && camposDef.some((c) => c.key === 'prioridad')) {
      out.prioridad = 'Baja'
    }
  }
  if (!out.motivo) {
    for (const opt of ['Vacaciones', 'Legajo', 'Recibo', 'Otro']) {
      if (t.includes(norm(opt)) && camposDef.some((c) => c.key === 'motivo')) {
        out.motivo = opt
        break
      }
    }
  }
  if (!out.detalle && camposDef.some((c) => c.key === 'detalle')) {
    // usar el texto completo como detalle si es suficientemente largo
    if (raw.trim().length >= 12) out.detalle = raw.trim().slice(0, 2000)
  }
  if (!out.tema && camposDef.some((c) => c.key === 'tema')) {
    out.tema = raw.replace(/^(quiero|necesito|cargar|crear|armar|abrir).{0,40}?solicitud\s*(de|para|sobre)?\s*/i, '').trim().slice(0, 200) || raw.slice(0, 120)
  }

  return out
}

export function buildRequestDraft({ types, text, prevPayload = {} }) {
  const typesList = types || []
  let tipo = null
  if (prevPayload.tipoId) {
    tipo = typesList.find((x) => String(x._id) === String(prevPayload.tipoId)) || null
  }
  if (!tipo) tipo = matchRequestType(typesList, text)

  const stage0 = prevPayload.stage || (tipo ? 'collect_fields' : 'pick_type')

  if (!tipo) {
    const list = typesList
      .slice(0, 8)
      .map((t, i) => `${i + 1}. **${t.nombre}** (${t.area || t.key})`)
      .join('\n')
    return {
      ready: false,
      stage: 'pick_type',
      text:
        typesList.length > 0
          ? `Puedo cargar la solicitud por vos. ¿De qué tipo?\n\n${list}\n\nRespondé con el número o el nombre, y contame el caso.`
          : 'No hay tipos de solicitud habilitados para vos. Pedile a un admin que configure plantillas.',
      payload: {
        stage: 'pick_type',
        titulo: '',
        cuerpo: text,
        campos: {},
      },
      summary: 'Elegir tipo de solicitud',
    }
  }

  const camposPrev = prevPayload.campos && typeof prevPayload.campos === 'object' ? prevPayload.campos : {}
  const campos = extractCamposFromText(tipo.campos || [], text, camposPrev)
  const { values, errors } = validateCampoValues(tipo.campos || [], campos)
  const missing = (tipo.campos || [])
    .filter((d) => d.required)
    .filter((d) => {
      const v = campos[d.key]
      if (d.tipo === 'check') return !v
      return v == null || v === ''
    })
    .map((d) => d.label || d.key)

  const titulo =
    String(prevPayload.titulo || '').trim() ||
    `${tipo.nombre}: ${String(text).replace(/\s+/g, ' ').trim().slice(0, 80)}`
  const cuerpo =
    String(campos.detalle || campos.tema || prevPayload.cuerpo || text).trim().slice(0, 5000)

  if (missing.length) {
    const need = missing.map((m) => `• ${m}`).join('\n')
    const have = values
      .filter((v) => v.value !== '' && v.value !== false)
      .map((v) => `• ${v.label}: ${v.value}`)
      .join('\n')
    return {
      ready: false,
      stage: 'collect_fields',
      text: `Tipo: **${tipo.nombre}**. Me falta:\n${need}${have ? `\n\nYa tengo:\n${have}` : ''}\n\nRespondé con esos datos (podés escribirlos en una sola frase).`,
      payload: {
        stage: 'collect_fields',
        tipoId: String(tipo._id),
        tipoKey: tipo.key,
        tipoNombre: tipo.nombre,
        area: tipo.area || 'General',
        titulo,
        cuerpo,
        campos,
      },
      summary: `Completar campos de ${tipo.nombre}`,
    }
  }

  const resumenCampos = values
    .filter((v) => v.value !== '' && v.value !== false)
    .map((v) => `• ${v.label}: ${v.value}`)
    .join('\n')

  return {
    ready: true,
    stage: 'ready',
    text: `Listo el borrador de solicitud:\n\n**Tipo:** ${tipo.nombre}\n**Título:** ${titulo}\n${resumenCampos ? `\n${resumenCampos}\n` : ''}\n¿Lo confirmo? Decime **sí** o **no** (también podés escribir «cancelar»).`,
    payload: {
      stage: 'ready',
      tipoId: String(tipo._id),
      tipoKey: tipo.key,
      tipoNombre: tipo.nombre,
      area: tipo.area || 'General',
      titulo: titulo.slice(0, 200),
      cuerpo: cuerpo || resumenCampos || titulo,
      campos,
    },
    summary: `Crear solicitud «${tipo.nombre}»`,
    validationErrors: errors,
  }
}

export function isSolicitudCreateIntent(text) {
  const t = norm(text)
  return (
    /(cargar|crear|armar|abrir|hacer|iniciar|generar).*(solicitud|consulta|ticket|tramite|trámite)/.test(t) ||
    /(solicitud|consulta|ticket).*(nueva|cargar|crear|abrir)/.test(t) ||
    /quiero\s+(pedir|solicitar|reportar|reclamar)\b/.test(t) ||
    /necesito\s+(ayuda|soporte|que\s+me\s+ayuden)\b/.test(t)
  )
}
