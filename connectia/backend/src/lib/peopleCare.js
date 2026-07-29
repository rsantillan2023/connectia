/**
 * Expediente en perfil (§3.08) — legajo RRHH local en Connectia.
 * Sin conector HTTP externo: los datos viven en EmployeeLegajo.
 * Un miembro puede no tener legajo (no es empleado).
 * Si el usuario tiene legajo vinculado, siempre se expone (aunque el toggle de
 * comunidad esté apagado): el empleado debe ver "Mi legajo".
 */

import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { serializeLegajo } from './employeeLegajo.js'
import { applySelfServiceLegajoPatch } from './legajoSelfService.js'
import { getSaldoVacaciones } from '../services/licenciaSaldo.js'
import { getOrCreateWalletAccount } from './walletService.js'

export function normalizePeopleCareConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: Boolean(src.enabled),
    /** @deprecated Ya no se usa API externa; se ignora. */
    baseUrl: '',
    label: String(src.label || 'Mi legajo').trim().slice(0, 80) || 'Mi legajo',
  }
}

/**
 * Expediente del usuario autenticado.
 * - Con legajo activo → siempre enabled + data (aunque toggle tenant off).
 * - Sin legajo + toggle off → enabled:false.
 * - Sin legajo + toggle on → enabled + hasLegajo:false (aviso; no bloquea).
 */
export async function fetchPeopleCareProfile({ tenant, user }) {
  const cfg = normalizePeopleCareConfig(tenant?.peopleCare)

  const legajo = await EmployeeLegajo.findOne({
    tenantId: tenant._id,
    userId: user._id,
    activo: true,
  }).lean()

  if (!legajo) {
    if (!cfg.enabled) {
      return { enabled: false, label: cfg.label, hasLegajo: false, data: null }
    }
    return {
      enabled: true,
      label: cfg.label,
      source: 'local',
      hasLegajo: false,
      data: null,
      mensaje:
        'Sos miembro de la comunidad, pero aún no tenés un legajo de empleado. Si ingresás a la empresa, RRHH te dará de alta.',
    }
  }

  const full = serializeLegajo(legajo, { maskSensitive: true, includeNotas: false })

  let licenciasPayload = {
    disponibles: null,
    nota: 'Sin saldo de vacaciones calculado.',
  }
  try {
    const vac = await getSaldoVacaciones({ tenantId: tenant._id, userId: user._id })
    if (vac) {
      licenciasPayload = {
        disponibles: vac.saldo.disponible,
        disponibleNeto: vac.saldo.disponibleNeto,
        usados: vac.saldo.usados,
        pendientes: vac.saldo.pendientes,
        devengados: vac.saldo.devengados,
        anio: vac.anio,
        tipo: vac.tipo.nombre,
        nota: '',
      }
    }
  } catch {
    licenciasPayload = {
      disponibles: null,
      nota: 'No se pudo consultar el saldo de licencias.',
    }
  }

  return {
    enabled: true,
    label: cfg.label,
    source: 'local',
    hasLegajo: true,
    canSelfEdit: true,
    data: {
      colaborador: {
        nombre: [full.nombre, full.apellido].filter(Boolean).join(' ') || user.usuario,
        legajo: full.numeroLegajo,
        cargo: full.cargo,
        email: full.email,
        areaId: full.areaId,
        estadoLaboral: full.estadoLaboral,
        fechaIngreso: full.fechaIngreso,
        fechaNacimiento: full.fechaNacimiento,
        dni: full.dni,
        cuil: full.cuil,
        telefono: full.telefono,
        genero: full.genero,
        estadoCivil: full.estadoCivil,
        nacionalidad: full.nacionalidad,
      },
      domicilios: full.domicilios,
      familiares: full.familiares,
      obraSocial: full.obraSocial,
      datosBancarios: full.datosBancarios,
      fichaMedica: full.fichaMedica,
      contratos: full.contratos,
      carrera: full.carrera,
      licencias: licenciasPayload,
      puntos: await (async () => {
        const caps = tenant?.capabilities || []
        if (!caps.includes('beneficios.billetera')) {
          return {
            saldo: null,
            nota: 'Puntos/beneficios: solo si capability beneficios.billetera está activa.',
          }
        }
        const acc = await getOrCreateWalletAccount(tenant._id, user._id)
        return { saldo: acc.balance, currency: 'POINTS', nota: null }
      })(),
    },
  }
}

/**
 * PATCH autoservicio del legajo propio.
 */
export async function patchOwnLegajo({ tenant, user, body }) {
  const legajo = await EmployeeLegajo.findOne({
    tenantId: tenant._id,
    userId: user._id,
    activo: true,
  })
  if (!legajo) {
    const err = new Error('No tenés legajo para editar')
    err.status = 404
    throw err
  }
  applySelfServiceLegajoPatch(legajo, body)
  await legajo.save()
  return fetchPeopleCareProfile({ tenant, user })
}
