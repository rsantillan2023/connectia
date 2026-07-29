/**
 * Seed de aprobaciones / pedidos (workflows §41) para ARCOR.
 * - Definiciones de flujo por módulo/tipo
 * - Pedidos (solicitudes + licencias) con instancias en bandeja
 * - Mezcla: pendientes para aprobar + historial en «Mis pedidos»
 */
import { Request } from '../models/Request.js'
import { RequestType } from '../models/RequestType.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WorkflowInstance } from '../models/WorkflowInstance.js'
import { LicenseType } from '../models/LicenseType.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { startWorkflowForOrigin, decideInstance } from '../services/workflowRuntime.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'

const REQ_PREFIX = 'APPR-ARCOR-'
const LIC_PREFIX = 'LIC-APPR-'
const AUS_PREFIX = 'AUS-APPR-'

const WORKFLOW_DEFS = [
  {
    name: 'Consulta RRHH / vacaciones',
    description: 'Líder aprueba consultas People; RRHH si el caso es sensible.',
    trigger: { module: 'solicitudes', tipoKey: 'rrhh', label: 'Consulta RRHH' },
    steps: [
      {
        orden: 1,
        nombre: 'Aprobación del líder',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
      {
        orden: 2,
        nombre: 'People / RRHH',
        approverType: 'capability',
        approverValue: 'admin.usuarios',
        slaHoras: 72,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Soporte sistemas',
    description: 'Líder → TI para accesos y VPN.',
    trigger: { module: 'solicitudes', tipoKey: 'sistemas', label: 'Soporte sistemas' },
    steps: [
      {
        orden: 1,
        nombre: 'Aprobación del líder',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
      {
        orden: 2,
        nombre: 'TI otorga acceso',
        approverType: 'capability',
        approverValue: 'admin.hub',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Mantenimiento de planta',
    description: 'Supervisor valida OT de mantenimiento.',
    trigger: { module: 'solicitudes', tipoKey: 'mantenimiento', label: 'Mantenimiento' },
    steps: [
      {
        orden: 1,
        nombre: 'Supervisor de planta',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 24,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Calidad / no conformidad',
    description: 'QA líder revisa desvíos de calidad.',
    trigger: { module: 'solicitudes', tipoKey: 'calidad', label: 'Calidad' },
    steps: [
      {
        orden: 1,
        nombre: 'QA líder',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Soporte comercial',
    description: 'Trade / comercial aprueba pedidos de campo.',
    trigger: { module: 'solicitudes', tipoKey: 'comercial', label: 'Comercial' },
    steps: [
      {
        orden: 1,
        nombre: 'Líder comercial',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Licencias / vacaciones',
    description: 'Líder + People para vacaciones.',
    trigger: { module: 'licencias', tipoKey: 'vacaciones', label: 'Vacaciones' },
    steps: [
      {
        orden: 1,
        nombre: 'Aprobación del líder',
        approverType: 'capability',
        approverValue: 'admin.solicitudes',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
      {
        orden: 2,
        nombre: 'People licencias',
        approverType: 'capability',
        approverValue: 'admin.licencias',
        slaHoras: 72,
        condition: '',
        userIds: [],
      },
    ],
  },
  {
    name: 'Ausentismos',
    description: 'RRHH valida registros de ausencia.',
    trigger: { module: 'ausentismos', tipoKey: '', label: 'Ausencias' },
    steps: [
      {
        orden: 1,
        nombre: 'RRHH ausentismos',
        approverType: 'capability',
        approverValue: 'admin.ausentismos',
        slaHoras: 48,
        condition: '',
        userIds: [],
      },
    ],
  },
]

function displayName(u) {
  return `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.usuario || 'Usuario'
}

function daysFromNow(offset) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

/**
 * @param {{ tenant: any, users: Record<string, any>, force?: boolean }} opts
 */
export async function seedArcorAprobaciones({ tenant, users, force = true }) {
  const juan = users['juan.perez']
  const sofia = users['sofia.garcia']
  const diego = users['diego.fernandez']
  const carlos = users['carlos.ruiz']
  const laura = users['laura.martinez']
  const rrhh = users['rrhh.gestor'] || users['admin.arcor']
  const admin = users['admin.arcor'] || rrhh

  if (!juan || !rrhh) {
    throw new Error('Faltan usuarios demo (juan.perez / rrhh.gestor). Corré runSeedArcor.js primero.')
  }

  if (!tenant.solicitudesConfig?.estados?.length) {
    tenant.solicitudesConfig = defaultSolicitudesConfig()
    await tenant.save()
  }

  for (const d of WORKFLOW_DEFS) {
    await WorkflowDefinition.findOneAndUpdate(
      { tenantId: tenant._id, name: d.name },
      {
        tenantId: tenant._id,
        name: d.name,
        description: d.description,
        trigger: d.trigger,
        steps: d.steps,
        activo: true,
        aiNotes: 'seed Arcor aprobaciones',
        createdByName: 'seed',
      },
      { upsert: true, new: true },
    )
  }

  const types = await RequestType.find({ tenantId: tenant._id, activo: true })
  const typesByKey = Object.fromEntries(types.map((t) => [t.key, t]))

  if (force) {
    const delReq = await Request.deleteMany({
      tenantId: tenant._id,
      codigo: { $regex: `^${REQ_PREFIX}` },
    })
    const delLic = await LicenseRequest.deleteMany({
      tenantId: tenant._id,
      codigo: { $regex: `^${LIC_PREFIX}` },
    })
    const delAus = await AbsenceRequest.deleteMany({
      tenantId: tenant._id,
      codigo: { $regex: `^${AUS_PREFIX}` },
    })
    // Instancias huérfanas o de estos orígenes
    const delWf = await WorkflowInstance.deleteMany({
      tenantId: tenant._id,
      $or: [
        { 'origen.codigo': { $regex: `^(${REQ_PREFIX}|${LIC_PREFIX}|${AUS_PREFIX})` } },
        { definitionName: { $in: WORKFLOW_DEFS.map((d) => d.name) } },
      ],
    })
    console.log('Limpieza seed aprobaciones:', {
      requests: delReq.deletedCount,
      licenses: delLic.deletedCount,
      absences: delAus.deletedCount,
      workflows: delWf.deletedCount,
    })
  }

  const pedidoDefs = [
    {
      n: '0001',
      tipoKey: 'rrhh',
      titulo: 'Pedido vacaciones agosto — aprobación líder',
      cuerpo: 'Solicito 5 días de vacaciones la segunda semana de agosto.',
      requester: juan,
      camposValores: [
        { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Vacaciones' },
        { key: 'desde', label: 'Desde', tipo: 'date', value: '2026-08-10' },
        { key: 'hasta', label: 'Hasta', tipo: 'date', value: '2026-08-14' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Franco planificado con el turno.' },
      ],
      decide: null, // queda pendiente para rrhh.gestor
    },
    {
      n: '0002',
      tipoKey: 'mantenimiento',
      titulo: 'OT cinta Línea 2 — pedir aprobación',
      cuerpo: 'Necesitamos orden de trabajo urgente por ruido anormal en reductor.',
      requester: juan,
      camposValores: [
        { key: 'planta', label: 'Planta', tipo: 'select', value: 'Arroyito' },
        { key: 'linea', label: 'Línea / sector', tipo: 'text', value: 'Línea 2' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
        { key: 'detalle', label: 'Descripción del desvío', tipo: 'textarea', value: 'Ruido en reductor.' },
      ],
      decide: null,
    },
    {
      n: '0003',
      tipoKey: 'sistemas',
      titulo: 'Alta VPN notebook nuevo ingreso',
      cuerpo: 'Pedido de acceso VPN para notebook corporativo.',
      requester: carlos || juan,
      camposValores: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'VPN' },
        { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
        { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: true },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Alta de certificado.' },
      ],
      decide: 'aprobar', // líder aprueba → queda en paso TI (si hub tiene cap) o sigue
      decider: rrhh,
    },
    {
      n: '0004',
      tipoKey: 'calidad',
      titulo: 'Desvío alérgenos — lote OP-991',
      cuerpo: 'Posible contaminación cruzada en línea de frutos secos.',
      requester: diego || juan,
      camposValores: [
        { key: 'tipo_desvio', label: 'Tipo de desvío', tipo: 'select', value: 'Alérgenos' },
        { key: 'lote', label: 'Lote / OP', tipo: 'text', value: 'OP-991' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Sospecha de contaminación cruzada.' },
      ],
      decide: null,
    },
    {
      n: '0005',
      tipoKey: 'comercial',
      titulo: 'Desbloqueo pedido Mayorista Sur',
      cuerpo: 'Pedido comercial bloqueado por crédito — necesita aprobación.',
      requester: sofia || juan,
      camposValores: [
        { key: 'tema', label: 'Tema', tipo: 'select', value: 'Pedido bloqueado' },
        { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', value: 'Mayorista Sur' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Pedido #90210.' },
      ],
      decide: 'rechazar',
      decider: rrhh,
    },
    {
      n: '0006',
      tipoKey: 'rrhh',
      titulo: 'Consulta recibo de sueldo marzo',
      cuerpo: 'No veo el recibo de marzo en el portal.',
      requester: laura || juan,
      camposValores: [
        { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Recibo de sueldo' },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Falta PDF de marzo.' },
      ],
      decide: 'aprobar',
      decider: rrhh,
      decideSecond: true, // aprobar ambos pasos
    },
  ]

  let requestsCreated = 0
  let workflowsStarted = 0
  let decisions = 0

  for (const p of pedidoDefs) {
    const tipo = typesByKey[p.tipoKey]
    if (!tipo) {
      console.warn(`Tipo ${p.tipoKey} no existe — saltando ${p.n}`)
      continue
    }
    const requester = p.requester
    const codigo = `${REQ_PREFIX}${p.n}`
    const req = await Request.create({
      tenantId: tenant._id,
      codigo,
      tipoId: tipo._id,
      tipoKey: tipo.key,
      tipoNombre: tipo.nombre,
      area: tipo.area || 'General',
      titulo: p.titulo,
      cuerpo: p.cuerpo,
      estado: 'abierta',
      requesterId: requester._id,
      requesterName: displayName(requester),
      createdById: requester._id,
      createdByName: displayName(requester),
      camposDefinicion: tipo.campos || [],
      camposValores: p.camposValores || [],
      messages: [
        {
          texto: p.cuerpo,
          authorId: requester._id,
          authorName: displayName(requester),
          isAdmin: false,
          interno: false,
          createdAt: new Date(),
        },
      ],
      origen: 'member',
    })
    requestsCreated += 1

    const inst = await startWorkflowForOrigin({
      tenantId: tenant._id,
      module: 'solicitudes',
      refId: req._id,
      titulo: p.titulo,
      codigo,
      tipoKey: tipo.key,
      solicitanteId: requester._id,
      solicitanteName: displayName(requester),
    })
    if (inst) workflowsStarted += 1

    if (inst && p.decide) {
      const decider = p.decider || rrhh
      await decideInstance({
        tenant,
        user: decider,
        instanceId: inst._id,
        decision: p.decide,
        comentario: p.decide === 'aprobar' ? 'OK seed — aprobado' : 'Rechazado en seed demo',
      })
      decisions += 1
      if (p.decideSecond && p.decide === 'aprobar') {
        const again = await WorkflowInstance.findById(inst._id)
        if (again && ['en_curso', 'pendiente'].includes(again.status)) {
          await decideInstance({
            tenant,
            user: rrhh,
            instanceId: again._id,
            decision: 'aprobar',
            comentario: 'People OK — seed',
          })
          decisions += 1
        }
      }
    }
  }

  // Licencia pendiente de Juan → bandeja aprobaciones
  let licensesCreated = 0
  const tipoVac = await LicenseType.findOne({ tenantId: tenant._id, key: 'vacaciones', activo: true })
  if (tipoVac) {
    const codigo = `${LIC_PREFIX}0001`
    const desde = daysFromNow(20)
    const hasta = daysFromNow(24)
    const lic = await LicenseRequest.create({
      tenantId: tenant._id,
      codigo,
      tipoId: tipoVac._id,
      tipoKey: tipoVac.key,
      tipoNombre: tipoVac.nombre,
      requesterId: juan._id,
      requesterName: displayName(juan),
      desde,
      hasta,
      dias: 5,
      motivo: 'Vacaciones seed — aprobación bandeja',
      estado: 'pendiente',
      historial: [
        {
          estado: 'pendiente',
          actorId: juan._id,
          actorName: displayName(juan),
          comentario: 'Solicitud creada (seed)',
          at: new Date(),
        },
      ],
    })
    licensesCreated += 1
    const wf = await startWorkflowForOrigin({
      tenantId: tenant._id,
      module: 'licencias',
      refId: lic._id,
      titulo: `${tipoVac.nombre}: 5 día(s)`,
      codigo,
      tipoKey: tipoVac.key,
      solicitanteId: juan._id,
      solicitanteName: displayName(juan),
    })
    if (wf) workflowsStarted += 1
  }

  // Ausencia pendiente
  let absencesCreated = 0
  {
    const codigo = `${AUS_PREFIX}0001`
    const desde = daysFromNow(-1)
    const hasta = daysFromNow(0)
    const aus = await AbsenceRequest.create({
      tenantId: tenant._id,
      codigo,
      tipoKey: 'injustificada',
      tipoNombre: 'Ausencia',
      requesterId: juan._id,
      requesterName: displayName(juan),
      desde,
      hasta,
      dias: 2,
      motivo: 'Ausencia seed — aprobación RRHH',
      estado: 'pendiente',
      historial: [
        {
          estado: 'pendiente',
          actorId: juan._id,
          actorName: displayName(juan),
          comentario: 'Registro creado (seed)',
          at: new Date(),
        },
      ],
    })
    absencesCreated += 1
    const wf = await startWorkflowForOrigin({
      tenantId: tenant._id,
      module: 'ausentismos',
      refId: aus._id,
      titulo: 'Ausencia: 2 día(s)',
      codigo,
      tipoKey: 'injustificada',
      solicitanteId: juan._id,
      solicitanteName: displayName(juan),
    })
    if (wf) workflowsStarted += 1
  }

  // También enganchar solicitudes SOL-ARCOR-* abiertas sin workflow
  const existingSol = await Request.find({
    tenantId: tenant._id,
    codigo: { $regex: /^SOL-ARCOR-/ },
    estado: { $in: ['abierta', 'en_proceso', 'a_completar'] },
  }).limit(5)
  for (const r of existingSol) {
    const originKey = `solicitudes:${r._id}`
    const exists = await WorkflowInstance.findOne({ tenantId: tenant._id, originKey })
    if (exists) continue
    const wf = await startWorkflowForOrigin({
      tenantId: tenant._id,
      module: 'solicitudes',
      refId: r._id,
      titulo: r.titulo,
      codigo: r.codigo,
      tipoKey: r.tipoKey,
      solicitanteId: r.requesterId,
      solicitanteName: r.requesterName,
    })
    if (wf) workflowsStarted += 1
  }

  const pending = await WorkflowInstance.countDocuments({
    tenantId: tenant._id,
    status: { $in: ['en_curso', 'pendiente'] },
  })
  const done = await WorkflowInstance.countDocuments({
    tenantId: tenant._id,
    status: { $in: ['aprobado', 'rechazado'] },
  })

  return {
    defs: WORKFLOW_DEFS.length,
    requestsCreated,
    licensesCreated,
    absencesCreated,
    workflowsStarted,
    decisions,
    pending,
    done,
  }
}
