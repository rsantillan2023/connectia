/**
 * Servicio de saldos y tipos de licencia (capa con Mongo).
 */

import { LicenseType } from '../models/LicenseType.js'
import { LicenseBalance } from '../models/LicenseBalance.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import {
  licenseTypesForPais,
  normalizeLicenciasConfig,
  serializeLicenseType,
  computeSaldo,
  vacationDaysBySeniority,
  yearsOfService,
} from '../lib/licenciasConfig.js'

export async function ensureDefaultLicenseTypes(tenantId, pais = 'AR') {
  const types = licenseTypesForPais(pais)
  for (const t of types) {
    await LicenseType.findOneAndUpdate(
      { tenantId, key: t.key },
      {
        $setOnInsert: {
          tenantId,
          key: t.key,
        },
        $set: {
          nombre: t.nombre,
          unidad: t.unidad || 'dias',
          diasAnualesDefault: t.diasAnualesDefault,
          requiereAdjunto: Boolean(t.requiereAdjunto),
          esVacaciones: Boolean(t.esVacaciones),
          cuentaDias: t.cuentaDias === 'habiles' ? 'habiles' : 'calendario',
          codigoLegal: t.codigoLegal || '',
          normativaRef: t.normativaRef || '',
          pais: t.pais || pais,
          activo: t.activo !== false,
          orden: t.orden || 100,
        },
      },
      { upsert: true },
    )
  }
  return types.length
}

/**
 * Aplica pack legislativo: actualiza config del tenant + sincroniza tipos.
 * @param {{ replaceTypes?: boolean }} opts — si replaceTypes, desactiva tipos que no están del pack.
 */
export async function applyLegislacionPack(tenant, pais, { replaceTypes = false } = {}) {
  const prevFeriados = normalizeLicenciasConfig(tenant.licenciasConfig).feriados
  const cfg = normalizeLicenciasConfig({
    ...(tenant.licenciasConfig || {}),
    pais,
    feriados: prevFeriados,
  })
  tenant.licenciasConfig = cfg
  await tenant.save()
  await ensureDefaultLicenseTypes(tenant._id, cfg.pais)

  if (replaceTypes) {
    const keys = new Set(licenseTypesForPais(cfg.pais).map((t) => t.key))
    await LicenseType.updateMany(
      { tenantId: tenant._id, key: { $nin: [...keys] } },
      { $set: { activo: false } },
    )
  }
  return cfg
}

export async function listActiveLicenseTypes(tenantId, pais) {
  const p = pais || 'AR'
  await ensureDefaultLicenseTypes(tenantId, p)
  const rows = await LicenseType.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }).lean()
  return rows.map(serializeLicenseType)
}

/**
 * Devengado sugerido de vacaciones por antigüedad (legajo.fechaIngreso).
 */
export async function suggestedVacationDevengados({ tenant, userId }) {
  const cfg = normalizeLicenciasConfig(tenant?.licenciasConfig)
  if (!cfg.usarAntiguedad) return null
  const legajo = await EmployeeLegajo.findOne({
    tenantId: tenant._id,
    userId,
    activo: true,
  })
    .select('fechaIngreso')
    .lean()
  if (!legajo?.fechaIngreso) return null
  const anios = yearsOfService(legajo.fechaIngreso)
  return vacationDaysBySeniority(cfg.pais, anios)
}

export async function getSaldosForUser({ tenantId, userId, anio, tenant }) {
  const year = anio || new Date().getUTCFullYear()
  const cfg = normalizeLicenciasConfig(tenant?.licenciasConfig)
  await ensureDefaultLicenseTypes(tenantId, cfg.pais)
  const tipos = await LicenseType.find({ tenantId, activo: true }).sort({ orden: 1 }).lean()
  const balances = await LicenseBalance.find({ tenantId, userId, anio: year }).lean()
  const byKey = new Map(balances.map((b) => [b.tipoKey, b]))

  const suggested = await suggestedVacationDevengados({ tenant: tenant || { _id: tenantId, licenciasConfig: cfg }, userId })

  const approved = await LicenseRequest.aggregate([
    {
      $match: {
        tenantId,
        requesterId: userId,
        estado: 'aprobada',
        $expr: { $eq: [{ $year: '$desde' }, year] },
      },
    },
    { $group: { _id: '$tipoKey', dias: { $sum: '$dias' } } },
  ])
  const pending = await LicenseRequest.aggregate([
    {
      $match: {
        tenantId,
        requesterId: userId,
        estado: 'pendiente',
        $expr: { $eq: [{ $year: '$desde' }, year] },
      },
    },
    { $group: { _id: '$tipoKey', dias: { $sum: '$dias' } } },
  ])
  const usadosMap = new Map(approved.map((r) => [r._id, r.dias]))
  const pendMap = new Map(pending.map((r) => [r._id, r.dias]))

  return tipos.map((t) => {
    const bal = byKey.get(t.key)
    let defaultDias = t.diasAnualesDefault
    let antiguedad = null
    if (t.esVacaciones && suggested && bal?.devengados == null) {
      defaultDias = suggested.dias
      antiguedad = suggested
    }
    const saldo = computeSaldo({
      diasAnualesDefault: defaultDias,
      devengados: bal?.devengados ?? null,
      ajuste: bal?.ajuste ?? 0,
      usadosAprobados: usadosMap.get(t.key) || 0,
      pendientes: pendMap.get(t.key) || 0,
    })
    return {
      tipo: serializeLicenseType(t),
      anio: year,
      saldo,
      antiguedad,
      legislacion: {
        pais: cfg.pais,
        marco: cfg.marco,
        cuentaVacaciones: cfg.cuentaVacaciones,
      },
    }
  })
}

export async function getSaldoVacaciones({ tenantId, userId, anio, tenant }) {
  const all = await getSaldosForUser({ tenantId, userId, anio, tenant })
  const vac = all.find((s) => s.tipo.esVacaciones) || all.find((s) => s.tipo.key === 'vacaciones')
  return vac || all[0] || null
}

export async function findOverlappingLicense({
  tenantId,
  userId,
  desde,
  hasta,
  excludeId = null,
}) {
  const q = {
    tenantId,
    requesterId: userId,
    estado: { $in: ['pendiente', 'aprobada'] },
    desde: { $lte: hasta },
    hasta: { $gte: desde },
  }
  if (excludeId) q._id = { $ne: excludeId }
  return LicenseRequest.findOne(q).lean()
}

export async function findOverlappingAbsence({
  tenantId,
  userId,
  desde,
  hasta,
  excludeId = null,
}) {
  const q = {
    tenantId,
    requesterId: userId,
    estado: { $in: ['pendiente', 'aprobada'] },
    desde: { $lte: hasta },
    hasta: { $gte: desde },
  }
  if (excludeId) q._id = { $ne: excludeId }
  return AbsenceRequest.findOne(q).lean()
}

export async function nextLicenseCodigo(tenantId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `LIC-${day}-`
  const last = await LicenseRequest.findOne({ tenantId, codigo: new RegExp(`^${prefix}`) })
    .sort({ codigo: -1 })
    .select('codigo')
    .lean()
  let n = 1
  if (last?.codigo) {
    const part = last.codigo.slice(prefix.length)
    const parsed = parseInt(part, 10)
    if (!Number.isNaN(parsed)) n = parsed + 1
  }
  return `${prefix}${String(n).padStart(4, '0')}`
}

export async function nextAbsenceCodigo(tenantId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `AUS-${day}-`
  const last = await AbsenceRequest.findOne({ tenantId, codigo: new RegExp(`^${prefix}`) })
    .sort({ codigo: -1 })
    .select('codigo')
    .lean()
  let n = 1
  if (last?.codigo) {
    const part = last.codigo.slice(prefix.length)
    const parsed = parseInt(part, 10)
    if (!Number.isNaN(parsed)) n = parsed + 1
  }
  return `${prefix}${String(n).padStart(4, '0')}`
}
