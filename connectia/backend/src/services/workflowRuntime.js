import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WorkflowInstance } from '../models/WorkflowInstance.js'
import { Request } from '../models/Request.js'
import { DocItem } from '../models/DocItem.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { AbsenceRequest } from '../models/AbsenceRequest.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { ServiceCatalogItem } from '../models/ServiceCatalogItem.js'
import {
  applyDecision,
  currentStep,
  deepLinkForOrigin,
  findFirstApplicableStepIndex,
  moduleLabel,
  userMatchesStep,
} from '../lib/workflowEngine.js'
import { isFullAdmin } from '../middleware/auth.js'
import { normalizeSolicitudesConfig } from '../lib/solicitudesConfig.js'
import { syncKbSource } from './kbIndex.js'
import { buildHistoryEntry, canTransitionServicio } from '../lib/servicios.js'

function actorName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || 'Usuario'
}

/**
 * Contexto del trámite para evaluar condiciones de pasos.
 */
export async function loadOriginContext(instOrOrigen, tenantId) {
  const origen = instOrOrigen?.origen || instOrOrigen || {}
  const mod = origen.module
  const refId = origen.refId
  const tid = tenantId || instOrOrigen?.tenantId
  const ctx = {
    module: mod || '',
    tipoKey: origen.tipoKey || '',
    titulo: origen.titulo || '',
    category: '',
    descripcion: '',
    cuerpo: '',
    campos: [],
  }
  if (!refId || !tid) return ctx

  if (mod === 'solicitudes') {
    const r = await Request.findOne({ _id: refId, tenantId: tid })
      .select('titulo cuerpo camposValores tipoKey category')
      .lean()
    if (r) {
      ctx.titulo = r.titulo || ctx.titulo
      ctx.cuerpo = r.cuerpo || ''
      ctx.descripcion = r.cuerpo || ''
      ctx.tipoKey = r.tipoKey || ctx.tipoKey
      ctx.campos = r.camposValores || []
    }
  } else if (mod === 'documentos') {
    const d = await DocItem.findOne({ _id: refId, tenantId: tid })
      .select('titulo descripcion category')
      .lean()
    if (d) {
      ctx.titulo = d.titulo || ctx.titulo
      ctx.descripcion = d.descripcion || ''
      ctx.category = d.category || ''
      ctx.tipoKey = d.category || ctx.tipoKey
      ctx.campos = d.category ? [{ key: 'category', label: 'Categoría', value: d.category }] : []
    }
  } else if (mod === 'licencias') {
    const lic = await LicenseRequest.findOne({ _id: refId, tenantId: tid })
      .select('tipoKey tipoNombre motivo dias desde hasta codigo')
      .lean()
    if (lic) {
      ctx.titulo = ctx.titulo || `${lic.tipoNombre || 'Licencia'} (${lic.codigo})`
      ctx.tipoKey = lic.tipoKey || ctx.tipoKey
      ctx.descripcion = lic.motivo || ''
      ctx.cuerpo = lic.motivo || ''
      ctx.campos = [
        { key: 'dias', label: 'Días', value: lic.dias },
        { key: 'desde', label: 'Desde', value: lic.desde },
        { key: 'hasta', label: 'Hasta', value: lic.hasta },
      ]
    }
  } else if (mod === 'ausentismos') {
    const aus = await AbsenceRequest.findOne({ _id: refId, tenantId: tid })
      .select('tipoKey tipoNombre motivo dias desde hasta codigo')
      .lean()
    if (aus) {
      ctx.titulo = ctx.titulo || `${aus.tipoNombre || 'Ausencia'} (${aus.codigo})`
      ctx.tipoKey = aus.tipoKey || ctx.tipoKey
      ctx.descripcion = aus.motivo || ''
      ctx.cuerpo = aus.motivo || ''
      ctx.campos = [
        { key: 'dias', label: 'Días', value: aus.dias },
        { key: 'desde', label: 'Desde', value: aus.desde },
        { key: 'hasta', label: 'Hasta', value: aus.hasta },
      ]
    }
  } else if (mod === 'servicios') {
    const srv = await ServiceRequest.findOne({ _id: refId, tenantId: tid })
      .select('number note formAnswers catalogItemId status')
      .lean()
    if (srv) {
      const cat = srv.catalogItemId
        ? await ServiceCatalogItem.findOne({ _id: srv.catalogItemId, tenantId: tid })
            .select('label')
            .lean()
        : null
      ctx.titulo = ctx.titulo || `${cat?.label || 'Servicio'} #${srv.number}`
      ctx.descripcion = srv.note || ''
      ctx.cuerpo = srv.note || ''
      ctx.tipoKey = srv.catalogItemId ? String(srv.catalogItemId) : ctx.tipoKey
      ctx.campos = (srv.formAnswers || []).map((a) => ({
        key: a.key,
        label: a.key,
        value: a.value,
      }))
    }
  }
  return ctx
}

function pushSkipHistory(inst, skipped) {
  for (const sk of skipped || []) {
    const s = sk.step || {}
    inst.history.push({
      pasoOrden: s.orden || sk.index + 1,
      pasoNombre: s.nombre || `Paso ${sk.index + 1}`,
      actorId: null,
      actorName: 'Sistema',
      decision: 'omitido',
      comentario: s.condition
        ? `Paso omitido: no aplica la condición «${s.condition}»`
        : 'Paso omitido: no aplica',
      at: new Date(),
    })
  }
}

export function serializeDefinition(d) {
  return {
    id: String(d._id),
    name: d.name,
    description: d.description || '',
    trigger: {
      module: d.trigger?.module || 'solicitudes',
      tipoKey: d.trigger?.tipoKey || '',
      label: d.trigger?.label || '',
    },
    steps: (d.steps || []).map((s) => ({
      orden: s.orden,
      nombre: s.nombre,
      approverType: s.approverType,
      approverValue: s.approverValue,
      userIds: (s.userIds || []).map(String),
      slaHoras: s.slaHoras,
      condition: s.condition || '',
    })),
    activo: d.activo !== false,
    aiNotes: d.aiNotes || '',
    createdByName: d.createdByName || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function serializeInstance(inst, { user, cfg } = {}) {
  const step = currentStep(inst.steps, inst.stepIndex)
  const open = ['pendiente', 'en_curso'].includes(inst.status)
  const canDecide =
    open &&
    user &&
    (userMatchesStep(user, step, { isFullAdmin: isFullAdmin(user) }) ||
      (user.capabilities || []).includes('admin.workflows'))
  return {
    id: String(inst._id),
    definitionId: String(inst.definitionId),
    definitionName: inst.definitionName || '',
    status: inst.status,
    stepIndex: inst.stepIndex,
    currentStep: step
      ? {
          orden: step.orden,
          nombre: step.nombre,
          slaHoras: step.slaHoras,
          condition: step.condition || '',
          approverType: step.approverType,
          approverValue: step.approverValue || '',
        }
      : null,
    steps: inst.steps || [],
    origen: {
      module: inst.origen?.module,
      moduleLabel: moduleLabel(inst.origen?.module),
      refId: String(inst.origen?.refId || ''),
      titulo: inst.origen?.titulo || '',
      codigo: inst.origen?.codigo || '',
      tipoKey: inst.origen?.tipoKey || '',
      deepLink: deepLinkForOrigin(inst.origen),
    },
    solicitanteName: inst.solicitanteName || '',
    solicitanteId: String(inst.solicitanteId || ''),
    history: (inst.history || []).map((h) => ({
      pasoOrden: h.pasoOrden,
      pasoNombre: h.pasoNombre,
      actorName: h.actorName,
      decision: h.decision,
      comentario: h.comentario || '',
      at: h.at,
    })),
    canDecide: Boolean(canDecide),
    createdAt: inst.createdAt,
    updatedAt: inst.updatedAt,
    /** Detalle del origen (solicitud/doc) — se completa en enrich */
    origenDetalle: null,
    estadoLabel: cfg && inst.origen?.module === 'solicitudes' ? undefined : undefined,
  }
}

function formatCampoDisplay(c) {
  if (c == null) return ''
  if (c.tipo === 'check') return c.value ? 'Sí' : 'No'
  if (c.value == null || c.value === '') return ''
  return String(c.value)
}

/**
 * Adjunta motivo, fechas y campos del origen (solicitud / documento) a las instancias.
 */
export async function enrichApprovalsWithOrigin(items, tenantId) {
  if (!items?.length) return items
  const reqIds = []
  const docIds = []
  for (const it of items) {
    const mod = it.origen?.module
    const ref = it.origen?.refId
    if (!ref) continue
    if (mod === 'solicitudes') reqIds.push(ref)
    else if (mod === 'documentos') docIds.push(ref)
  }

  const [reqs, docs] = await Promise.all([
    reqIds.length
      ? Request.find({ tenantId, _id: { $in: reqIds } })
          .select('titulo cuerpo camposValores estado createdAt updatedAt tipoNombre area codigo')
          .lean()
      : [],
    docIds.length
      ? DocItem.find({ tenantId, _id: { $in: docIds } })
          .select('titulo category status createdAt updatedAt publishedAt')
          .lean()
      : [],
  ])

  const reqMap = Object.fromEntries(reqs.map((r) => [String(r._id), r]))
  const docMap = Object.fromEntries(docs.map((d) => [String(d._id), d]))

  for (const it of items) {
    const mod = it.origen?.module
    const ref = it.origen?.refId
    if (mod === 'solicitudes' && reqMap[ref]) {
      const r = reqMap[ref]
      const campos = (r.camposValores || [])
        .map((c) => ({
          key: c.key,
          label: c.label || c.key,
          tipo: c.tipo || 'text',
          value: formatCampoDisplay(c),
        }))
        .filter((c) => c.value !== '')
      it.origenDetalle = {
        kind: 'solicitud',
        titulo: r.titulo || '',
        cuerpo: r.cuerpo || '',
        tipoNombre: r.tipoNombre || '',
        area: r.area || '',
        codigo: r.codigo || '',
        estado: r.estado || '',
        campos,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }
    } else if (mod === 'documentos' && docMap[ref]) {
      const d = docMap[ref]
      it.origenDetalle = {
        kind: 'documento',
        titulo: d.titulo || '',
        cuerpo: '',
        tipoNombre: d.category || 'Documento',
        area: '',
        codigo: '',
        estado: d.status || '',
        campos: d.category
          ? [{ key: 'category', label: 'Categoría', tipo: 'text', value: d.category }]
          : [],
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        publishedAt: d.publishedAt || null,
      }
    }
  }
  return items
}

/**
 * Busca def activa que matchee el origen y crea instancia (idempotente).
 * Salta pasos iniciales cuya condición no aplica.
 */
export async function startWorkflowForOrigin({
  tenantId,
  module,
  refId,
  titulo,
  codigo = '',
  tipoKey = '',
  solicitanteId,
  solicitanteName,
}) {
  const filter = {
    tenantId,
    activo: true,
    'trigger.module': module,
  }
  const defs = await WorkflowDefinition.find(filter).sort({ updatedAt: -1 }).lean()
  const def =
    defs.find((d) => d.trigger?.tipoKey && d.trigger.tipoKey === tipoKey) ||
    defs.find((d) => !d.trigger?.tipoKey) ||
    null
  if (!def || !def.steps?.length) return null

  const originKey = `${module}:${refId}`
  const existing = await WorkflowInstance.findOne({ tenantId, originKey })
  if (existing) return existing

  const steps = (def.steps || []).map((s) => ({
    orden: s.orden,
    nombre: s.nombre,
    approverType: s.approverType,
    approverValue: s.approverValue,
    userIds: (s.userIds || []).map(String),
    slaHoras: s.slaHoras,
    condition: s.condition || '',
  }))

  const origen = { module, refId, titulo, codigo, tipoKey }
  const context = await loadOriginContext({ origen, tenantId }, tenantId)
  const first = findFirstApplicableStepIndex(steps, context)
  let stepIndex = first
  const skippedAtStart = []
  const autoApproved = first < 0
  if (autoApproved) {
    stepIndex = Math.max(0, steps.length - 1)
  } else {
    for (let i = 0; i < stepIndex; i++) {
      skippedAtStart.push({ index: i, step: steps[i] })
    }
  }

  try {
    const inst = await WorkflowInstance.create({
      tenantId,
      definitionId: def._id,
      definitionName: def.name,
      steps,
      stepIndex,
      status: autoApproved ? 'aprobado' : 'en_curso',
      origen,
      solicitanteId,
      solicitanteName,
      originKey,
      history: [
        {
          pasoOrden: 0,
          pasoNombre: 'Inicio',
          actorId: solicitanteId,
          actorName: solicitanteName,
          decision: 'inicio',
          comentario: 'Trámite iniciado',
          at: new Date(),
        },
      ],
    })
    pushSkipHistory(inst, skippedAtStart)
    if (autoApproved) {
      inst.history.push({
        pasoOrden: 0,
        pasoNombre: 'Sistema',
        actorId: null,
        actorName: 'Sistema',
        decision: 'aprobado',
        comentario: 'Ningún paso de aprobación aplicaba; trámite cerrado automáticamente',
        at: new Date(),
      })
    }
    if (skippedAtStart.length || autoApproved) {
      await inst.save()
    }
    if (autoApproved) {
      await applyOriginSideEffects(inst, 'aprobar', { _id: tenantId })
    }
    return inst
  } catch (e) {
    if (e?.code === 11000) {
      return WorkflowInstance.findOne({ tenantId, originKey })
    }
    throw e
  }
}

async function applyOriginSideEffects(inst, decision, tenant) {
  const mod = inst.origen?.module
  const refId = inst.origen?.refId
  if (!refId) return

  if (mod === 'solicitudes') {
    const r = await Request.findOne({ _id: refId, tenantId: inst.tenantId })
    if (!r) return
    const cfg = normalizeSolicitudesConfig(tenant?.solicitudesConfig)
    if (decision === 'rechazar') {
      if ((cfg.estados || []).some((e) => e.key === 'cancelada' && e.activo !== false)) {
        r.estado = 'cancelada'
      }
    } else if (inst.status === 'aprobado') {
      if ((cfg.estados || []).some((e) => e.key === 'resuelta' && e.activo !== false)) {
        r.estado = 'resuelta'
      } else if ((cfg.estados || []).some((e) => e.key === 'en_proceso' && e.activo !== false)) {
        r.estado = 'en_proceso'
      }
    } else if (inst.status === 'en_curso') {
      if ((cfg.estados || []).some((e) => e.key === 'en_proceso' && e.activo !== false)) {
        r.estado = 'en_proceso'
      }
    }
    await r.save()
    return
  }

  if (mod === 'documentos') {
    const doc = await DocItem.findOne({ _id: refId, tenantId: inst.tenantId })
    if (!doc) return
    if (inst.status === 'aprobado') {
      doc.status = 'published'
      doc.publishedAt = new Date()
      await doc.save()
      await syncKbSource('document', doc)
    } else if (decision === 'rechazar') {
      doc.status = 'draft'
      await doc.save()
      await syncKbSource('document', doc)
    }
    return
  }

  if (mod === 'licencias') {
    const lic = await LicenseRequest.findOne({ _id: refId, tenantId: inst.tenantId })
    if (!lic) return
    const prev = lic.estado
    if (decision === 'rechazar' || inst.status === 'rechazado') {
      lic.estado = 'rechazada'
    } else if (inst.status === 'aprobado') {
      lic.estado = 'aprobada'
    }
    if (lic.estado !== prev) {
      lic.historial.push({
        estado: lic.estado,
        actorId: null,
        actorName: 'Workflow',
        comentario: `Decisión vía bandeja §41 (${decision})`,
        at: new Date(),
      })
      await lic.save()
      try {
        const { notifyLicenseDecided } = await import('./notifyTramite.js')
        await notifyLicenseDecided({ tenant: tenant || { _id: inst.tenantId }, license: lic })
      } catch (err) {
        console.warn('[notify] wf license', err?.message || err)
      }
    }
    return
  }

  if (mod === 'ausentismos') {
    const aus = await AbsenceRequest.findOne({ _id: refId, tenantId: inst.tenantId })
    if (!aus) return
    const prev = aus.estado
    if (decision === 'rechazar' || inst.status === 'rechazado') {
      aus.estado = 'rechazada'
    } else if (inst.status === 'aprobado') {
      aus.estado = 'aprobada'
    }
    if (aus.estado !== prev) {
      aus.historial.push({
        estado: aus.estado,
        actorId: null,
        actorName: 'Workflow',
        comentario: `Decisión vía bandeja §41 (${decision})`,
        at: new Date(),
      })
      await aus.save()
      try {
        const { persistEcrSync } = await import('./ecrAusentismoAdapter.js')
        await persistEcrSync(aus, {
          tenant: tenant || { _id: inst.tenantId, capabilities: tenant?.capabilities },
          event: 'decide',
        })
      } catch (syncErr) {
        console.warn('[ecr] wf absence', syncErr?.message || syncErr)
      }
      try {
        const { notifyAbsenceDecided } = await import('./notifyTramite.js')
        await notifyAbsenceDecided({ tenant: tenant || { _id: inst.tenantId }, absence: aus })
      } catch (err) {
        console.warn('[notify] wf absence', err?.message || err)
      }
    }
    return
  }

  if (mod === 'servicios') {
    const srv = await ServiceRequest.findOne({ _id: refId, tenantId: inst.tenantId })
    if (!srv) return
    const from = srv.status
    if (decision === 'rechazar' || inst.status === 'rechazado') {
      if (canTransitionServicio(from, 'cancelado')) {
        srv.status = 'cancelado'
        srv.history.push(
          buildHistoryEntry({
            actorId: null,
            from,
            to: 'cancelado',
            reason: 'Rechazado vía workflow §41',
          }),
        )
        await srv.save()
      }
    } else if (inst.status === 'aprobado') {
      // Queda en recibido/en_curso para agentes; solo marca history
      srv.history.push(
        buildHistoryEntry({
          actorId: null,
          from,
          to: from,
          reason: 'Aprobado vía workflow §41',
        }),
      )
      await srv.save()
    }
  }
}

/**
 * Decide (aprobar/rechazar) una instancia.
 */
export async function decideInstance({ tenant, user, instanceId, decision, comentario }) {
  const inst = await WorkflowInstance.findOne({ _id: instanceId, tenantId: tenant._id })
  if (!inst) {
    const err = new Error('Trámite no encontrado')
    err.status = 404
    throw err
  }
  const step = currentStep(inst.steps, inst.stepIndex)
  const asWorkflowAdmin = isFullAdmin(user) || (user.capabilities || []).includes('admin.workflows')
  if (!userMatchesStep(user, step, { isFullAdmin: asWorkflowAdmin })) {
    const err = new Error('No tenés permiso para decidir este paso')
    err.status = 403
    throw err
  }

  const context = await loadOriginContext(inst, tenant._id)
  const next = applyDecision({
    status: inst.status,
    stepIndex: inst.stepIndex,
    steps: inst.steps,
    decision,
    context,
  })

  inst.history.push({
    pasoOrden: step?.orden || inst.stepIndex + 1,
    pasoNombre: step?.nombre || '',
    actorId: user._id,
    actorName: actorName(user),
    decision,
    comentario: String(comentario || '').trim().slice(0, 500),
    at: new Date(),
  })
  pushSkipHistory(inst, next.skipped)
  inst.status = next.status
  inst.stepIndex = next.stepIndex
  await inst.save()
  await applyOriginSideEffects(inst, decision, tenant)
  return inst
}

/**
 * Lista pendientes donde el usuario puede actuar + opcionales propias.
 */
export async function listApprovalsForUser({ tenant, user, scope = 'mine', status = '', page = 1, limit = 30 }) {
  const filter = { tenantId: tenant._id }
  if (status) filter.status = status
  else if (scope === 'mine') filter.status = { $in: ['pendiente', 'en_curso'] }

  const skip = (Math.max(1, page) - 1) * limit
  const rows = await WorkflowInstance.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit + 1)
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows

  const items = []
  for (const inst of slice) {
    const ser = serializeInstance(inst, { user })
    if (scope === 'mine') {
      if (ser.canDecide) items.push(ser)
    } else if (scope === 'requested') {
      if (String(inst.solicitanteId) === String(user._id)) items.push(ser)
    } else {
      items.push(ser)
    }
  }

  // Si filtramos mine en memoria, puede haber menos items; para MVP está ok
  await enrichApprovalsWithOrigin(items, tenant._id)
  return { items, hasMore, page }
}
