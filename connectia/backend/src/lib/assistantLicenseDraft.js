/**
 * Slot-filling multi-turno para vacaciones / ausencias (ola 29 · 29.CONV).
 * Helpers puros — testeable sin Mongo.
 */
import { validatePeriod } from './licenciasConfig.js'

const CONFIRM_PROMPT = '¿Lo confirmo? Decime **sí** o **no** (también podés escribir «cancelar»).'

/**
 * Extrae fechas DD/MM… desde texto libre.
 * @param {string} text
 * @returns {{ desde: string, hasta: string }}
 */
export function extractLicenseDates(text) {
  const range = String(text || '').match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g)
  if (!range?.length) return { desde: '', hasta: '' }
  return { desde: range[0], hasta: range[1] || range[0] }
}

/**
 * Une payload previo con el turno actual.
 * @param {Record<string, any>} prev
 * @param {{ desde?: string, hasta?: string, motivo?: string }} entities
 * @param {string} userText
 */
export function mergeLicensePayload(prev = {}, entities = {}, userText = '') {
  const fromText = extractLicenseDates(userText)
  const desde = entities.desde || fromText.desde || prev.desde || ''
  const hasta = entities.hasta || fromText.hasta || prev.hasta || desde || ''
  let motivo = prev.motivo || ''
  const t = String(userText || '').trim()
  // Motivo solo si el mensaje no es solo fechas / sí-no
  if (
    t &&
    !/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)(\s*(al|a|-|–)\s*\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)?$/i.test(
      t,
    ) &&
    !/^(si|sí|no|cancelar|confirmo|dale)$/i.test(t)
  ) {
    const stripped = t
      .replace(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g, '')
      .replace(/\b(del|desde|hasta|al|vacaciones?|licencia|ausencia|ausentismo|quiero|pedir|solicitar|tomar(me)?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (stripped.length >= 3) motivo = stripped.slice(0, 500)
  }
  if (entities.motivo) motivo = String(entities.motivo).slice(0, 500)
  return {
    ...prev,
    desde,
    hasta: hasta || desde,
    motivo,
  }
}

/**
 * @param {'license'|'absence'} kind
 * @param {{ nombre?: string, key?: string }} tipo
 * @param {Record<string, any>} payload
 * @param {{ disponibleNeto?: number|null }} extras
 */
export function buildLicenseDraft({ kind, tipo, payload, extras = {} }) {
  const label = kind === 'absence' ? 'ausencia' : tipo?.nombre || 'Vacaciones'
  const merged = { ...payload }

  if (!merged.desde) {
    const ask =
      kind === 'absence'
        ? '¿Qué día te ausentás? (ej. el 15/08 o del 15/08 al 16/08).'
        : '¿Desde qué fecha? Si es un rango, decime también hasta cuándo (ej. del 10/08 al 20/08).'
    return {
      ready: false,
      text: `Para armar **${label}** necesito las fechas.\n${ask}`,
      summary: `Completar fechas de ${label}`,
      draftAction: {
        type: kind === 'absence' ? 'create_absence' : 'create_license',
        ready: false,
        summary: `Completar fechas de ${label}`,
        payload: {
          stage: 'need_dates',
          tipoKey: kind === 'absence' ? 'injustificada' : tipo?.key || 'vacaciones',
          tipoNombre: label,
          desde: '',
          hasta: '',
          motivo: merged.motivo || '',
        },
      },
    }
  }

  const period = validatePeriod({ desde: merged.desde, hasta: merged.hasta || merged.desde })
  if (!period.ok) {
    return {
      ready: false,
      text: `No pude armar el pedido: ${period.error}. Probá con fechas DD/MM/AAAA.`,
      summary: `Corregir fechas de ${label}`,
      draftAction: {
        type: kind === 'absence' ? 'create_absence' : 'create_license',
        ready: false,
        summary: `Corregir fechas de ${label}`,
        payload: {
          stage: 'need_dates',
          tipoKey: kind === 'absence' ? 'injustificada' : tipo?.key || 'vacaciones',
          tipoNombre: label,
          desde: '',
          hasta: '',
          motivo: merged.motivo || '',
        },
      },
    }
  }

  const desdeIso = period.desde.toISOString().slice(0, 10)
  const hastaIso = period.hasta.toISOString().slice(0, 10)

  if (!merged.motivo || String(merged.motivo).trim().length < 2) {
    return {
      ready: false,
      text: [
        `Ya tengo las fechas de **${label}**:`,
        `• Desde: ${desdeIso}`,
        `• Hasta: ${hastaIso}`,
        `• Días: **${period.dias}**`,
        '',
        '¿Querés agregar un motivo? Escribilo, o decime «sin motivo» para seguir.',
      ].join('\n'),
      summary: `Motivo de ${label}`,
      draftAction: {
        type: kind === 'absence' ? 'create_absence' : 'create_license',
        ready: false,
        summary: `Motivo de ${label}`,
        payload: {
          stage: 'need_motivo',
          tipoKey: kind === 'absence' ? 'injustificada' : tipo?.key || 'vacaciones',
          tipoNombre: label,
          desde: desdeIso,
          hasta: hastaIso,
          dias: period.dias,
          motivo: '',
        },
      },
    }
  }

  let motivo = String(merged.motivo).trim()
  if (/^(sin motivo|ninguno|no|n\/a|na)$/i.test(motivo)) {
    motivo = kind === 'absence' ? 'Ausencia' : label
  }

  const saldoLine =
    kind === 'license' && extras.disponibleNeto != null
      ? `\nSaldo neto disponible: **${extras.disponibleNeto}** día(s).`
      : ''

  const text = [
    `Armé un pedido de **${label}**:`,
    `• Desde: ${desdeIso}`,
    `• Hasta: ${hastaIso}`,
    `• Días: **${period.dias}**`,
    `• Motivo: ${motivo}`,
    saldoLine,
    '',
    CONFIRM_PROMPT,
  ]
    .filter((l) => l !== '')
    .join('\n')

  return {
    ready: true,
    text,
    summary: `${label} ${period.dias} día(s)`,
    draftAction: {
      type: kind === 'absence' ? 'create_absence' : 'create_license',
      ready: true,
      summary: `${label} ${period.dias} día(s)`,
      payload: {
        stage: 'ready',
        tipoKey: kind === 'absence' ? 'injustificada' : tipo?.key || 'vacaciones',
        tipoNombre: label,
        desde: desdeIso,
        hasta: hastaIso,
        dias: period.dias,
        motivo: motivo.slice(0, 500),
      },
    },
  }
}

export { CONFIRM_PROMPT }
