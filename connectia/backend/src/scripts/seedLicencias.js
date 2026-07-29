/**
 * Seed de licencias, vacaciones y ausentismos (§12 · §13) para un tenant.
 */
import { LicenseType } from '../models/LicenseType.js'
import { LicenseBalance } from '../models/LicenseBalance.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { MenuItem } from '../models/MenuItem.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { ensureOla17MenuItems } from '../lib/ensureOla17Menu.js'
import { applyLegislacionPack, nextLicenseCodigo, nextAbsenceCodigo } from '../services/licenciaSaldo.js'
import { normalizePaisLegislacion, normalizeLicenciasConfig } from '../lib/legislacionLicencias.js'

function daysFromNow(n) {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function actorName(u) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ') || u?.usuario || 'Usuario'
}

/**
 * @param {{
 *   tenant: object,
 *   users?: Record<string, object>,
 *   brandName?: string,
 *   pais?: 'AR'|'CL',
 *   forceLicenses?: boolean,
 *   forceAbsences?: boolean,
 * }} opts
 */
export async function seedLicenciasForTenant({
  tenant,
  users = {},
  brandName = 'Connectia',
  pais = 'AR',
  forceLicenses = false,
  forceAbsences = false,
} = {}) {
  if (!tenant?._id) throw new Error('tenant requerido')
  const tenantId = tenant._id
  const anio = new Date().getUTCFullYear()
  const legis = normalizePaisLegislacion(pais)

  await ensureOla17MenuItems(tenantId)
  const cfg = await applyLegislacionPack(tenant, legis, { replaceTypes: true })

  // Feriados de ejemplo de la comunidad (además de nacionales del pack)
  if (!cfg.feriados?.length) {
    const y = anio
    const sample =
      legis === 'CL'
        ? [
            { fecha: `${y}-06-29`, nombre: 'San Pedro y San Pablo (planta)', recurrente: true },
            { fecha: `${y}-12-31`, nombre: 'Cierre de planta', recurrente: false },
          ]
        : [
            { fecha: `${y}-11-20`, nombre: 'Día de la Soberanía (planta)', recurrente: true },
            { fecha: `${y}-12-24`, nombre: 'Víspera Navidad (planta)', recurrente: false },
          ]
    const next = normalizeLicenciasConfig({ ...cfg, feriados: sample })
    tenant.licenciasConfig = next
    await tenant.save()
    Object.assign(cfg, next)
  }

  // Menú U con labels comerciales explícitos
  for (const item of [
    {
      key: 'licencias',
      label: 'Vacaciones y permisos',
      route: '/licencias',
      icon: 'clipboard',
      order: 21,
      channel: 'u',
    },
    {
      key: 'ausencias',
      label: 'Ausencias',
      route: '/ausencias',
      icon: 'list',
      order: 21.5,
      channel: 'u',
    },
  ]) {
    await MenuItem.findOneAndUpdate(
      { tenantId, key: item.key },
      { ...item, tenantId, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true },
    )
  }

  const tipoVac = await LicenseType.findOne({ tenantId, key: 'vacaciones' })
  const tipoEnf = await LicenseType.findOne({
    tenantId,
    key: legis === 'CL' ? 'licencia_medica' : 'enfermedad',
  })
  const tipoPart = await LicenseType.findOne({ tenantId, key: 'particular' })
  const tiposCount = await LicenseType.countDocuments({ tenantId, activo: true })

  const juan = users['juan.perez'] || users.juan
  const sofia = users['sofia.garcia'] || users.sofia
  const diego = users['diego.fernandez'] || users.diego
  const laura = users['laura.martinez'] || users.laura
  const carlos = users['carlos.ruiz'] || users.carlos
  const maria = users['maria.lopez'] || users.maria
  const rrhh = users['rrhh.gestor'] || users.rrhh
  const members = [juan, sofia, diego, laura, carlos, maria].filter(Boolean)

  let balances = 0
  const vacBase = legis === 'CL' ? 15 : 14
  for (const u of members) {
    const rows = [
      { tipoKey: 'vacaciones', devengados: vacBase, ajuste: u === juan ? 2 : 0 },
      ...(legis === 'AR' ? [{ tipoKey: 'examen', devengados: 10, ajuste: 0 }] : []),
      { tipoKey: 'particular', devengados: legis === 'CL' ? 0 : 2, ajuste: 0 },
    ]
    for (const row of rows) {
      await LicenseBalance.findOneAndUpdate(
        { tenantId, userId: u._id, tipoKey: row.tipoKey, anio },
        {
          tenantId,
          userId: u._id,
          tipoKey: row.tipoKey,
          anio,
          devengados: row.devengados,
          ajuste: row.ajuste,
          notas: `Saldo seed ${brandName} ${anio} (${legis})`,
        },
        { upsert: true },
      )
      balances += 1
    }
  }

  let licenses = 0
  const existingLic = await LicenseRequest.countDocuments({ tenantId })
  if ((forceLicenses || existingLic === 0) && juan && sofia && tipoVac) {
    if (forceLicenses && existingLic > 0) {
      await LicenseRequest.deleteMany({ tenantId })
    }
    const samples = [
      {
        user: juan,
        tipo: tipoVac,
        desde: daysFromNow(14),
        hasta: daysFromNow(20),
        estado: 'pendiente',
        motivo: 'Vacaciones de invierno — planta',
      },
      {
        user: sofia,
        tipo: tipoVac,
        desde: daysFromNow(-30),
        hasta: daysFromNow(-24),
        estado: 'aprobada',
        motivo: 'Vacaciones ya gozadas (historial seed)',
        decisionBy: rrhh,
      },
      {
        user: diego || juan,
        tipo: tipoPart || tipoVac,
        desde: daysFromNow(5),
        hasta: daysFromNow(5),
        estado: 'pendiente',
        motivo: 'Día particular — trámite personal',
      },
      {
        user: laura || sofia,
        tipo: tipoEnf || tipoVac,
        desde: daysFromNow(-3),
        hasta: daysFromNow(-2),
        estado: 'aprobada',
        motivo: 'Licencia por enfermedad (seed)',
        decisionBy: rrhh,
      },
    ]

    for (const s of samples) {
      if (!s.user || !s.tipo) continue
      const dias =
        Math.floor((s.hasta.getTime() - s.desde.getTime()) / 86400000) + 1
      const codigo = await nextLicenseCodigo(tenantId)
      const name = actorName(s.user)
      await LicenseRequest.create({
        tenantId,
        codigo,
        tipoId: s.tipo._id,
        tipoKey: s.tipo.key,
        tipoNombre: s.tipo.nombre,
        desde: s.desde,
        hasta: s.hasta,
        dias,
        cuentaDias: s.tipo.cuentaDias === 'habiles' ? 'habiles' : 'calendario',
        estado: s.estado,
        motivo: s.motivo,
        saldoAntes: vacBase,
        requesterId: s.user._id,
        requesterName: name,
        decisionById: s.decisionBy?._id || null,
        decisionByName: s.decisionBy ? actorName(s.decisionBy) : '',
        decisionAt: s.estado === 'aprobada' ? new Date() : null,
        decisionComentario: s.estado === 'aprobada' ? 'Aprobado en seed' : '',
        historial: [
          {
            estado: 'pendiente',
            actorId: s.user._id,
            actorName: name,
            comentario: 'Creada (seed)',
            at: new Date(),
          },
          ...(s.estado === 'aprobada'
            ? [
                {
                  estado: 'aprobada',
                  actorId: s.decisionBy?._id || null,
                  actorName: s.decisionBy ? actorName(s.decisionBy) : 'RRHH',
                  comentario: 'Aprobado (seed)',
                  at: new Date(),
                },
              ]
            : []),
        ],
      })
      licenses += 1
    }
  }

  let absences = 0
  const existingAus = await AbsenceRequest.countDocuments({ tenantId })
  if ((forceAbsences || existingAus === 0) && (carlos || juan)) {
    if (forceAbsences && existingAus > 0) {
      await AbsenceRequest.deleteMany({ tenantId })
    }
    const absenceSamples = [
      {
        user: carlos || juan,
        tipoKey: 'justificada',
        tipoNombre: 'Ausencia justificada',
        desde: daysFromNow(-1),
        hasta: daysFromNow(-1),
        estado: 'pendiente',
        motivo: 'Demora en traslado a planta — certificado de tránsito (seed)',
      },
      {
        user: juan,
        tipoKey: 'injustificada',
        tipoNombre: 'Ausencia',
        desde: daysFromNow(-7),
        hasta: daysFromNow(-7),
        estado: 'aprobada',
        motivo: 'No se presentó a turno mañana — registrado por líder (seed)',
        decisionBy: rrhh,
      },
      {
        user: sofia || juan,
        tipoKey: 'justificada',
        tipoNombre: 'Ausencia justificada',
        desde: daysFromNow(-4),
        hasta: daysFromNow(-3),
        estado: 'aprobada',
        motivo: 'Consulta médica de urgencia — comprobante adjunto (seed)',
        decisionBy: rrhh,
      },
      {
        user: diego || juan,
        tipoKey: 'injustificada',
        tipoNombre: 'Ausencia',
        desde: daysFromNow(1),
        hasta: daysFromNow(1),
        estado: 'pendiente',
        motivo: 'Aviso anticipado de inasistencia (seed)',
      },
      {
        user: laura || sofia || juan,
        tipoKey: 'justificada',
        tipoNombre: 'Ausencia justificada',
        desde: daysFromNow(-14),
        hasta: daysFromNow(-14),
        estado: 'rechazada',
        motivo: 'Sin documentación suficiente (seed)',
        decisionBy: rrhh,
        decisionComentario: 'Falta certificado; reingresar con adjunto',
      },
      {
        user: maria || carlos || juan,
        tipoKey: 'justificada',
        tipoNombre: 'Ausencia justificada',
        desde: daysFromNow(3),
        hasta: daysFromNow(3),
        estado: 'pendiente',
        motivo: 'Trámite personal ineludible (seed)',
      },
    ]

    for (const s of absenceSamples) {
      if (!s.user) continue
      const dias =
        Math.floor((s.hasta.getTime() - s.desde.getTime()) / 86400000) + 1
      const codigo = await nextAbsenceCodigo(tenantId)
      const name = actorName(s.user)
      await AbsenceRequest.create({
        tenantId,
        codigo,
        tipoKey: s.tipoKey,
        tipoNombre: s.tipoNombre,
        desde: s.desde,
        hasta: s.hasta,
        dias,
        estado: s.estado,
        motivo: s.motivo,
        requesterId: s.user._id,
        requesterName: name,
        decisionById: s.decisionBy?._id || null,
        decisionByName: s.decisionBy ? actorName(s.decisionBy) : '',
        decisionAt: ['aprobada', 'rechazada'].includes(s.estado) ? new Date() : null,
        decisionComentario:
          s.decisionComentario ||
          (s.estado === 'aprobada' ? 'Aprobado en seed' : s.estado === 'rechazada' ? 'Rechazado en seed' : ''),
        ecrSync: {
          status: 'deferred',
          note: 'Integración ECR diferida (12.04); gestión local Connectia.',
        },
        historial: [
          {
            estado: 'pendiente',
            actorId: s.user._id,
            actorName: name,
            comentario: 'Creada (seed)',
            at: new Date(),
          },
          ...(['aprobada', 'rechazada'].includes(s.estado)
            ? [
                {
                  estado: s.estado,
                  actorId: s.decisionBy?._id || null,
                  actorName: s.decisionBy ? actorName(s.decisionBy) : 'RRHH',
                  comentario: s.decisionComentario || `${s.estado} (seed)`,
                  at: new Date(),
                },
              ]
            : []),
        ],
      })
      absences += 1
    }
  }

  await WorkflowDefinition.findOneAndUpdate(
    { tenantId, name: `Vacaciones ${brandName}` },
    {
      tenantId,
      name: `Vacaciones ${brandName}`,
      description: 'Aprobación de licencias / vacaciones (módulo licencias)',
      trigger: { module: 'licencias', tipoKey: 'vacaciones', label: 'Vacaciones' },
      steps: [
        {
          orden: 1,
          nombre: 'Líder / RRHH',
          approverType: 'capability',
          approverValue: 'admin.licencias',
          slaHoras: 48,
          condition: '',
          userIds: [],
        },
      ],
      activo: true,
      aiNotes: 'Seed ola 17',
      createdByName: 'seed',
    },
    { upsert: true },
  )

  await WorkflowDefinition.findOneAndUpdate(
    { tenantId, name: `Ausencias ${brandName}` },
    {
      tenantId,
      name: `Ausencias ${brandName}`,
      description: 'Aprobación de ausentismos',
      trigger: { module: 'ausentismos', tipoKey: '', label: 'Ausencias' },
      steps: [
        {
          orden: 1,
          nombre: 'RRHH',
          approverType: 'capability',
          approverValue: 'admin.ausentismos',
          slaHoras: 24,
          condition: '',
          userIds: [],
        },
      ],
      activo: true,
      aiNotes: 'Seed ola 17',
      createdByName: 'seed',
    },
    { upsert: true },
  )

  // Caps tenant (preserve licenciasConfig from applyLegislacionPack)
  const caps = new Set([...(tenant.capabilities || []), 'licencias', 'ausentismos'])
  tenant.capabilities = [...caps]
  if (!tenant.licenciasConfig?.pais) tenant.licenciasConfig = cfg
  await tenant.save()

  // Caps RRHH admin screens
  if (rrhh) {
    const rc = new Set([
      ...(rrhh.capabilities || []),
      'admin.licencias',
      'admin.ausentismos',
      'admin.solicitudes',
    ])
    rrhh.capabilities = [...rc]
    await rrhh.save()
  }

  return {
    tipos: tiposCount,
    pais: legis,
    marco: cfg.marco,
    cuentaVacaciones: cfg.cuentaVacaciones,
    balances,
    licenses,
    absences,
    members: members.length,
  }
}
