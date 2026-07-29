/**
 * Autoservicio de legajo (U) — solo campos no críticos.
 */
import { applyLegajoPatch } from './employeeLegajo.js'

const SELF_SERVICE_KEYS = new Set([
  'telefono',
  'genero',
  'estadoCivil',
  'nacionalidad',
  'domicilios',
  'familiares',
  'fichaMedica',
  'carrera',
])

/**
 * Aplica patch restringido: no toca legajo, estado laboral, DNI/CUIL, banco, contratos, notas, líder.
 * @param {object} doc mongoose EmployeeLegajo
 * @param {object} body
 */
export function applySelfServiceLegajoPatch(doc, body = {}) {
  const src = body && typeof body === 'object' ? body : {}
  const safe = {}

  for (const key of SELF_SERVICE_KEYS) {
    if (src[key] === undefined) continue
    safe[key] = src[key]
  }

  // Ficha médica: solo emergencia / alergias / grupo (no observaciones RRHH)
  if (safe.fichaMedica && typeof safe.fichaMedica === 'object') {
    const cur = doc.fichaMedica || {}
    safe.fichaMedica = {
      grupoSanguineo: safe.fichaMedica.grupoSanguineo ?? cur.grupoSanguineo,
      alergias: safe.fichaMedica.alergias ?? cur.alergias,
      observaciones: cur.observaciones || '',
      contactoEmergenciaNombre:
        safe.fichaMedica.contactoEmergenciaNombre ?? cur.contactoEmergenciaNombre,
      contactoEmergenciaTel: safe.fichaMedica.contactoEmergenciaTel ?? cur.contactoEmergenciaTel,
    }
  }

  // Carrera: solo skills (no capacitaciones oficiales)
  if (safe.carrera && typeof safe.carrera === 'object') {
    const cur = doc.carrera || {}
    safe.carrera = {
      capacitaciones: cur.capacitaciones || [],
      skills: Array.isArray(safe.carrera.skills) ? safe.carrera.skills : cur.skills || [],
    }
  }

  return applyLegajoPatch(doc, safe)
}

export { SELF_SERVICE_KEYS }
