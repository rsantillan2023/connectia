import crypto from 'crypto'
import { AssistantConversation } from '../models/AssistantConversation.js'
import { Request } from '../models/Request.js'
import { RequestType } from '../models/RequestType.js'
import { LicenseType } from '../models/LicenseType.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { detectAssistantIntent, matchModuleHint, MODULE_HINTS } from '../lib/assistantIntent.js'
import {
  toolListOpenRequests,
  toolListDocuments,
  toolSearchKb,
  toolSearchPosts,
  toolListModules,
  formatRequestsAnswer,
  formatDocumentsAnswer,
  formatKbAnswer,
} from '../lib/assistantTools.js'
import { polishAssistantAnswer, assistantAiConfigured } from '../services/assistantAi.js'
import { normalizeSolicitudesConfig, validateCampoValues } from '../lib/solicitudesConfig.js'
import { validatePeriod } from '../lib/licenciasConfig.js'
import { userMatchesAudience } from '../lib/audience.js'
import { buildRequestDraft, isSolicitudCreateIntent } from '../lib/assistantRequestDraft.js'
import {
  getSaldoVacaciones,
  listActiveLicenseTypes,
  findOverlappingLicense,
  nextLicenseCodigo,
} from '../services/licenciaSaldo.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'

const TOKEN_TTL_MS = 10 * 60 * 1000

function newToken() {
  return crypto.randomBytes(16).toString('hex')
}

function displayName(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.usuario || 'Usuario'
}

async function nextCodigo(tenantId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `SOL-${day}-`
  const last = await Request.findOne({ tenantId, codigo: new RegExp(`^${prefix}`) })
    .sort({ codigo: -1 })
    .select('codigo')
  let n = 1
  if (last?.codigo) {
    const part = last.codigo.split('-').pop()
    const parsed = Number(part)
    if (!Number.isNaN(parsed)) n = parsed + 1
  }
  return `${prefix}${String(n).padStart(4, '0')}`
}

function serializeConversation(conv) {
  return {
    id: String(conv._id),
    title: conv.title,
    lastIntent: conv.lastIntent || '',
    pendingAction: conv.pendingAction
      ? {
          type: conv.pendingAction.type,
          summary: conv.pendingAction.summary,
          confirmationToken: conv.pendingAction.confirmationToken,
          expiresAt: conv.pendingAction.expiresAt,
        }
      : null,
    messages: (conv.messages || []).map((m) => ({
      id: String(m._id),
      role: m.role,
      text: m.text,
      intent: m.intent || '',
      sources: m.sources || [],
      links: m.links || [],
      draftAction: m.draftAction || null,
      confirmationToken: m.confirmationToken || '',
      createdAt: m.createdAt,
    })),
    updatedAt: conv.updatedAt,
    createdAt: conv.createdAt,
    aiConfigured: assistantAiConfigured(),
  }
}

async function getOrCreateConversation({ tenantId, userId, conversationId }) {
  if (conversationId) {
    const existing = await AssistantConversation.findOne({ _id: conversationId, tenantId, userId })
    if (existing) return existing
  }
  return AssistantConversation.create({
    tenantId,
    userId,
    title: 'Asistente',
    messages: [
      {
        role: 'assistant',
        text: '¡Hola! Soy el Asistente de tu comunidad. Puedo consultar la base de conocimientos, decirte el estado de tus solicitudes en curso, listar documentos visibles e iniciar trámites (siempre con tu confirmación). ¿En qué te ayudo?',
        intent: 'saludo',
        links: [
          { label: 'Solicitudes en curso', href: '/solicitudes' },
          { label: 'Documentos', href: '/docs' },
        ],
      },
    ],
  })
}

function setPending(conv, { type, payload, summary }) {
  const confirmationToken = newToken()
  conv.pendingAction = {
    type,
    payload,
    summary,
    confirmationToken,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  }
  return confirmationToken
}

async function listAvailableTypes(tenantId, user) {
  const items = await RequestType.find({ tenantId, activo: true }).sort({ orden: 1, nombre: 1 }).lean()
  return items.filter((t) => userMatchesAudience(user, t.audience || { mode: 'all' }))
}

async function draftSolicitudReply({ tenant, user, userText, prevPayload = {} }) {
  const types = await listAvailableTypes(tenant._id, user)
  const draft = buildRequestDraft({ types, text: userText, prevPayload })
  return {
    text: draft.text,
    links: [{ label: 'Mis solicitudes', href: '/solicitudes' }],
    sources: [],
    draftAction: {
      type: 'create_request',
      payload: draft.payload,
      summary: draft.summary,
      ready: draft.ready,
    },
    context: {
      modules: toolListModules(),
      types: types.map((t) => ({ id: String(t._id), key: t.key, nombre: t.nombre })),
      notes: draft.ready ? 'solicitud_lista_para_confirmar' : 'solicitud_en_armado',
    },
  }
}

async function buildReply({ tenant, user, intent, entities, userText }) {
  const tenantId = tenant._id
  const modules = toolListModules()
  let base = { text: '', links: [], sources: [], draftAction: null, context: { modules } }

  if (intent === 'saludo') {
    base.text = `Hola ${displayName(user).split(' ')[0] || ''}. Puedo:\n• Estado de tus solicitudes en curso\n• Documentos visibles\n• Responder con la base de conocimientos\n• **Cargar una solicitud** contándome el caso (elegimos tipo, completo campos y confirmás)\n\nDecime qué necesitás.`
    base.links = [
      { label: 'Mis solicitudes', href: '/solicitudes' },
      { label: 'Documentos', href: '/docs' },
    ]
    return base
  }

  if (intent === 'mis_solicitudes' || intent === 'estado_consulta') {
    const requests = await toolListOpenRequests({ tenantId, userId: user._id, tenant })
    const formatted = formatRequestsAnswer(requests)
    base = { ...formatted, draftAction: null, context: { modules, requests } }
    return base
  }

  if (intent === 'mis_documentos') {
    const documents = await toolListDocuments({ tenantId, user })
    const formatted = formatDocumentsAnswer(documents)
    base = { ...formatted, draftAction: null, context: { modules, documents } }
    return base
  }

  if (intent === 'buscar_documento') {
    const q = entities.q || userText
    const documents = await toolListDocuments({ tenantId, user, q })
    const kb = await toolSearchKb({ tenantId, user, q })
    const docsFmt = formatDocumentsAnswer(documents, q)
    const kbFmt = formatKbAnswer(kb)
    if (documents.length) {
      base = {
        text: `${docsFmt.text}${kb.length ? `\n\nTambién en la base:\n${kb
          .slice(0, 3)
          .map((a) => `• ${a.titulo}`)
          .join('\n')}` : ''}`,
        links: docsFmt.links,
        sources: [...docsFmt.sources, ...kbFmt.sources],
        context: { modules, documents, kb },
      }
    } else {
      base = { ...kbFmt, context: { modules, documents, kb } }
    }
    return base
  }

  if (intent === 'donde_modulo') {
    const mod =
      (entities.route && MODULE_HINTS.find((m) => m.route === entities.route)) ||
      matchModuleHint(userText)
    if (mod) {
      base.text = `El módulo **${mod.label}** está en la app en ${mod.route}.`
      base.links = [{ label: `Ir a ${mod.label}`, href: mod.route }]
    } else {
      const list = modules.map((m) => `• ${m.label}: ${m.href}`).join('\n')
      base.text = `Estos son los módulos principales:\n${list}\n\nDecime cuál buscás.`
      base.links = modules.slice(0, 6).map((m) => ({ label: m.label, href: m.href }))
    }
    base.context = { modules }
    return base
  }

  if (intent === 'recibo_sueldo') {
    return draftSolicitudReply({
      tenant,
      user,
      userText: `Consulta RRHH recibo de sueldo${entities.periodo ? ` período ${entities.periodo}` : ''}. Motivo Recibo. ${userText}`,
    })
  }

  if (intent === 'saldo_vacaciones') {
    const row = await getSaldoVacaciones({ tenantId: tenant._id, userId: user._id })
    if (!row) {
      base.text =
        'Todavía no hay tipos de licencia configurados. Pedile a RRHH que active Vacaciones y permisos.'
      base.links = [{ label: 'Vacaciones y permisos', href: '/licencias' }]
      return base
    }
    const s = row.saldo
    base.text = [
      `Tu saldo de **${row.tipo.nombre}** (${row.anio}):`,
      `• Disponibles: **${s.disponible}** día(s)`,
      `• Devengados: ${s.devengados}`,
      `• Usados (aprobados): ${s.usados}`,
      `• Pendientes de aprobación: ${s.pendientes}`,
      s.pendientes
        ? `(Neto si se aprueban los pendientes: ${s.disponibleNeto})`
        : null,
    ]
      .filter(Boolean)
      .join('\n')
    base.links = [
      { label: 'Ver saldos y solicitar', href: '/licencias' },
      { label: 'Mis aprobaciones', href: '/aprobaciones' },
    ]
    base.context = { saldo: row }
    return base
  }

  if (intent === 'solicitar_vacaciones') {
    const tipos = await listActiveLicenseTypes(tenant._id)
    const vac =
      tipos.find((t) => t.esVacaciones) || tipos.find((t) => t.key === 'vacaciones') || tipos[0]
    const desde = entities.desde || ''
    const hasta = entities.hasta || entities.desde || ''
    if (!desde) {
      base.text =
        'Para pedir vacaciones necesito las fechas. Por ejemplo: «quiero vacaciones del 10/08 al 20/08».'
      base.links = [{ label: 'Solicitar en la app', href: '/licencias' }]
      return base
    }
    const period = validatePeriod({ desde, hasta: hasta || desde })
    if (!period.ok) {
      base.text = `No pude armar el pedido: ${period.error}. Probá con fechas DD/MM/AAAA.`
      base.links = [{ label: 'Solicitar en la app', href: '/licencias' }]
      return base
    }
    const row = await getSaldoVacaciones({ tenantId: tenant._id, userId: user._id })
    const disponibleNeto = row?.saldo?.disponibleNeto
    const saldoLine =
      disponibleNeto == null
        ? ''
        : `\nSaldo neto disponible: **${disponibleNeto}** día(s).`
    base.text = [
      `Armé un pedido de **${vac?.nombre || 'Vacaciones'}**:`,
      `• Desde: ${period.desde.toISOString().slice(0, 10)}`,
      `• Hasta: ${period.hasta.toISOString().slice(0, 10)}`,
      `• Días: **${period.dias}**`,
      saldoLine,
      '',
      '¿Confirmás? Respondé «sí» o tocá Confirmar.',
    ]
      .filter((l) => l !== '')
      .join('\n')
    base.links = [{ label: 'Vacaciones y permisos', href: '/licencias' }]
    base.draftAction = {
      type: 'create_license',
      ready: true,
      summary: `${vac?.nombre || 'Vacaciones'} ${period.dias} día(s)`,
      payload: {
        stage: 'ready',
        tipoKey: vac?.key || 'vacaciones',
        desde: period.desde.toISOString().slice(0, 10),
        hasta: period.hasta.toISOString().slice(0, 10),
        dias: period.dias,
        motivo: userText.slice(0, 500),
      },
    }
    return base
  }

  if (intent === 'solicitar_ausentismo') {
    const desde = entities.desde || ''
    const hasta = entities.hasta || entities.desde || ''
    if (!desde) {
      base.text =
        'Para registrar una ausencia necesito la fecha. Ejemplo: «ausencia el 15/08» o «ausencia del 15/08 al 16/08».'
      base.links = [{ label: 'Ausencias', href: '/ausencias' }]
      return base
    }
    const period = validatePeriod({ desde, hasta: hasta || desde })
    if (!period.ok) {
      base.text = `No pude armar la ausencia: ${period.error}.`
      base.links = [{ label: 'Ausencias', href: '/ausencias' }]
      return base
    }
    base.text = [
      'Armé un registro de **ausencia**:',
      `• Desde: ${period.desde.toISOString().slice(0, 10)}`,
      `• Hasta: ${period.hasta.toISOString().slice(0, 10)}`,
      `• Días: **${period.dias}**`,
      '',
      '¿Confirmás? Respondé «sí» o tocá Confirmar.',
    ].join('\n')
    base.links = [{ label: 'Ausencias', href: '/ausencias' }]
    base.draftAction = {
      type: 'create_absence',
      ready: true,
      summary: `Ausencia ${period.dias} día(s)`,
      payload: {
        stage: 'ready',
        tipoKey: 'injustificada',
        desde: period.desde.toISOString().slice(0, 10),
        hasta: period.hasta.toISOString().slice(0, 10),
        dias: period.dias,
        motivo: userText.slice(0, 500),
      },
    }
    return base
  }

  if (intent === 'abrir_consulta' || isSolicitudCreateIntent(userText)) {
    return draftSolicitudReply({ tenant, user, userText })
  }

  // ayuda_kb / desconocido → KB + docs + posts
  const q = entities.q || userText
  const [kb, posts, documents, requests] = await Promise.all([
    toolSearchKb({ tenantId, user, q }),
    toolSearchPosts({ tenantId, user, q }),
    toolListDocuments({ tenantId, user, q, limit: 4 }),
    toolListOpenRequests({ tenantId, userId: user._id, tenant, limit: 4 }),
  ])
  const kbFmt = formatKbAnswer(kb, posts)
  const extras = []
  if (documents.length) {
    extras.push(
      `Documentos visibles relacionados:\n${documents.map((d) => `• ${d.titulo}`).join('\n')}`,
    )
  }
  if (requests.length && /solicitud|tramite|trámite|consulta|estado/i.test(userText)) {
    extras.push(
      `Tus solicitudes en curso:\n${requests.map((r) => `• ${r.codigo} ${r.titulo} (${r.estadoLabel})`).join('\n')}`,
    )
  }
  // Si parece un pedido de trámite aunque el intent haya caído en KB, ofrecer armar solicitud
  if (isSolicitudCreateIntent(userText) || /quiero\s+(una\s+)?solicitud/i.test(userText)) {
    return draftSolicitudReply({ tenant, user, userText })
  }
  base.text = [kbFmt.text, ...extras].filter(Boolean).join('\n\n')
  base.links = [
    ...kbFmt.links,
    ...(documents.length ? [{ label: 'Documentos', href: '/docs' }] : []),
    ...(requests.length ? [{ label: 'Mis solicitudes', href: '/solicitudes' }] : []),
  ]
  base.sources = [
    ...kbFmt.sources,
    ...documents.map((d) => ({
      kind: 'document',
      id: d.id,
      titulo: d.titulo,
      href: '/docs',
      excerpt: d.descripcion,
    })),
  ]
  base.context = { modules, kb, posts, documents, requests }
  return base
}

export async function handleAssistantMessage({ tenant, user, text, conversationId }) {
  const userText = String(text || '').trim()
  if (!userText) {
    const err = new Error('Mensaje vacío')
    err.status = 400
    throw err
  }
  if (userText.length > 2000) {
    const err = new Error('Mensaje demasiado largo')
    err.status = 400
    throw err
  }

  const conv = await getOrCreateConversation({
    tenantId: tenant._id,
    userId: user._id,
    conversationId,
  })

  const detected = detectAssistantIntent(userText)

  if (
    detected.intent === 'confirmar' &&
    conv.pendingAction?.confirmationToken &&
    !String(conv.pendingAction.confirmationToken).startsWith('draft-') &&
    conv.pendingAction.payload?.stage === 'ready'
  ) {
    return confirmAssistantAction({
      tenant,
      user,
      conversationId: conv._id,
      confirmationToken: conv.pendingAction.confirmationToken,
    })
  }
  if (detected.intent === 'cancelar' && conv.pendingAction) {
    conv.pendingAction = null
    conv.messages.push({ role: 'user', text: userText, intent: 'cancelar' })
    conv.messages.push({
      role: 'assistant',
      text: 'Listo, cancelé la acción pendiente. ¿En qué más te ayudo?',
      intent: 'cancelar',
    })
    conv.lastIntent = 'cancelar'
    await conv.save()
    return serializeConversation(conv)
  }

  // Continuar armado de solicitud si hay borrador incompleto
  let built
  const pending = conv.pendingAction
  if (
    pending?.type === 'create_request' &&
    pending.payload &&
    pending.payload.stage &&
    pending.payload.stage !== 'ready' &&
    detected.intent !== 'mis_solicitudes' &&
    detected.intent !== 'mis_documentos' &&
    detected.intent !== 'ayuda_kb'
  ) {
    built = await draftSolicitudReply({
      tenant,
      user,
      userText,
      prevPayload: pending.payload,
    })
  } else {
    built = await buildReply({
      tenant,
      user,
      intent: detected.intent,
      entities: detected.entities,
      userText,
    })
  }

  const polished = await polishAssistantAnswer({
    userText,
    intent: detected.intent,
    baseAnswer: built.text,
    context: built.context || {},
  })

  const links = [...(built.links || [])]
  for (const l of polished.suggestedLinks || []) {
    if (!links.some((x) => x.href === l.href)) links.push(l)
  }

  let confirmationToken = ''
  let draftAction = null
  if (built.draftAction) {
    const ready = built.draftAction.ready !== false && built.draftAction.payload?.stage === 'ready'
    // Guardar pending siempre (para multi-turno); token de confirmación solo si está listo
    const token = setPending(conv, built.draftAction)
    if (ready) {
      confirmationToken = token
      draftAction = {
        type: built.draftAction.type,
        summary: built.draftAction.summary,
        payload: built.draftAction.payload,
        ready: true,
      }
    } else {
      draftAction = {
        type: built.draftAction.type,
        summary: built.draftAction.summary,
        payload: built.draftAction.payload,
        ready: false,
      }
      // pending sin exponer token en UI hasta que esté ready
      conv.pendingAction.confirmationToken = `draft-${token}`
    }
  } else {
    conv.pendingAction = null
  }

  conv.messages.push({ role: 'user', text: userText, intent: detected.intent })
  conv.messages.push({
    role: 'assistant',
    text: polished.text || built.text,
    intent: detected.intent,
    sources: built.sources || [],
    links: links.slice(0, 8),
    draftAction,
    confirmationToken,
  })
  conv.lastIntent = detected.intent
  if (conv.messages.length > 80) {
    conv.messages = conv.messages.slice(-80)
  }
  await conv.save()
  return serializeConversation(conv)
}

export async function confirmAssistantAction({ tenant, user, conversationId, confirmationToken }) {
  const conv = await AssistantConversation.findOne({
    _id: conversationId,
    tenantId: tenant._id,
    userId: user._id,
  })
  if (!conv) {
    const err = new Error('Conversación no encontrada')
    err.status = 404
    throw err
  }
  const pending = conv.pendingAction
  if (!pending || pending.confirmationToken !== confirmationToken) {
    const err = new Error('No hay acción pendiente para confirmar (o el token expiró)')
    err.status = 400
    throw err
  }
  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    conv.pendingAction = null
    await conv.save()
    const err = new Error('La confirmación expiró. Pedí de nuevo la acción.')
    err.status = 400
    throw err
  }

  let resultText = 'Listo.'
  let links = []

  if (pending.type === 'create_request') {
    const payload = pending.payload || {}
    if (payload.stage && payload.stage !== 'ready') {
      const err = new Error('Todavía faltan datos para crear la solicitud')
      err.status = 400
      throw err
    }
    const cfg = normalizeSolicitudesConfig(tenant.solicitudesConfig)
    let tipo = null
    if (payload.tipoId) {
      tipo = await RequestType.findOne({
        _id: payload.tipoId,
        tenantId: tenant._id,
        activo: true,
      })
      if (tipo && !userMatchesAudience(user, tipo.audience)) tipo = null
    }
    if (!tipo && payload.preferTipoKey) {
      tipo = await RequestType.findOne({
        tenantId: tenant._id,
        key: payload.preferTipoKey,
        activo: true,
      })
      if (tipo && !userMatchesAudience(user, tipo.audience)) tipo = null
    }
    if (!tipo && payload.tipoKey) {
      tipo = await RequestType.findOne({
        tenantId: tenant._id,
        key: payload.tipoKey,
        activo: true,
      })
      if (tipo && !userMatchesAudience(user, tipo.audience)) tipo = null
    }

    const camposDef = tipo?.campos || []
    const { values, errors } = validateCampoValues(camposDef, payload.campos || {})
    if (errors.length) {
      const err = new Error(errors.join('; '))
      err.status = 400
      throw err
    }
    if (!camposDef.length && !payload.cuerpo) {
      const err = new Error('Falta la descripción de la solicitud')
      err.status = 400
      throw err
    }

    const codigo = await nextCodigo(tenant._id)
    const titulo = String(payload.titulo || tipo?.nombre || 'Consulta desde Asistente').slice(0, 200)
    const resumenCampos = values
      .filter((v) => v.value !== '' && v.value !== false)
      .map((v) => `${v.label}: ${v.value}`)
      .join('\n')
    const cuerpo = String(payload.cuerpo || resumenCampos || titulo).slice(0, 5000)
    const authorName = displayName(user)
    const r = await Request.create({
      tenantId: tenant._id,
      codigo,
      tipoId: tipo?._id || null,
      tipoKey: tipo?.key || payload.tipoKey || '',
      tipoNombre: tipo?.nombre || payload.tipoNombre || 'Consulta',
      area: payload.area || tipo?.area || 'General',
      titulo,
      cuerpo,
      estado: cfg.estadoInicial || 'abierta',
      origen: 'member',
      camposDefinicion: camposDef,
      camposValores: values,
      completada: true,
      completadaAt: new Date(),
      requesterId: user._id,
      requesterName: authorName,
      createdById: user._id,
      createdByName: authorName,
      messages: [
        {
          texto: cuerpo || resumenCampos || titulo,
          authorId: user._id,
          authorName,
          isAdmin: false,
          interno: false,
        },
      ],
    })
    resultText = `Creé la solicitud **${codigo}**: ${titulo}. Estado: ${cfg.estadoInicial || 'abierta'}.`
    links = [
      { label: `Ver ${codigo}`, href: `/solicitudes/${r._id}` },
      { label: 'Mis solicitudes', href: '/solicitudes' },
    ]
  } else if (pending.type === 'create_license') {
    const payload = pending.payload || {}
    await listActiveLicenseTypes(tenant._id)
    const tipo = await LicenseType.findOne({
      tenantId: tenant._id,
      key: String(payload.tipoKey || 'vacaciones').toLowerCase(),
      activo: true,
    })
    if (!tipo) {
      const err = new Error('Tipo de licencia no disponible')
      err.status = 400
      throw err
    }
    const period = validatePeriod({ desde: payload.desde, hasta: payload.hasta || payload.desde })
    if (!period.ok) {
      const err = new Error(period.error)
      err.status = 400
      throw err
    }
    const overlap = await findOverlappingLicense({
      tenantId: tenant._id,
      userId: user._id,
      desde: period.desde,
      hasta: period.hasta,
    })
    if (overlap) {
      const err = new Error(`Se solapa con ${overlap.codigo}`)
      err.status = 409
      throw err
    }
    const authorName = displayName(user)
    const codigo = await nextLicenseCodigo(tenant._id)
    const lic = await LicenseRequest.create({
      tenantId: tenant._id,
      codigo,
      tipoId: tipo._id,
      tipoKey: tipo.key,
      tipoNombre: tipo.nombre,
      desde: period.desde,
      hasta: period.hasta,
      dias: period.dias,
      estado: 'pendiente',
      motivo: String(payload.motivo || '').slice(0, 2000),
      requesterId: user._id,
      requesterName: authorName,
      historial: [
        {
          estado: 'pendiente',
          actorId: user._id,
          actorName: authorName,
          comentario: 'Creada desde asistente',
          at: new Date(),
        },
      ],
    })
    try {
      await startWorkflowForOrigin({
        tenantId: tenant._id,
        module: 'licencias',
        refId: lic._id,
        titulo: `${tipo.nombre}: ${period.dias} día(s)`,
        codigo: lic.codigo,
        tipoKey: lic.tipoKey,
        solicitanteId: user._id,
        solicitanteName: authorName,
      })
    } catch (wfErr) {
      console.warn('[workflow] assistant licencia', wfErr?.message || wfErr)
    }
    resultText = `Listo: creé **${codigo}** (${tipo.nombre}, ${period.dias} día(s)). Quedó pendiente de aprobación.`
    links = [
      { label: `Ver ${codigo}`, href: `/licencias/${lic._id}` },
      { label: 'Vacaciones y permisos', href: '/licencias' },
    ]
  } else if (pending.type === 'create_absence') {
    const { AbsenceRequest } = await import('../models/AbsenceRequest.js')
    const { nextAbsenceCodigo } = await import('../services/licenciaSaldo.js')
    const payload = pending.payload || {}
    const period = validatePeriod({ desde: payload.desde, hasta: payload.hasta || payload.desde })
    if (!period.ok) {
      const err = new Error(period.error)
      err.status = 400
      throw err
    }
    const authorName = displayName(user)
    const codigo = await nextAbsenceCodigo(tenant._id)
    const aus = await AbsenceRequest.create({
      tenantId: tenant._id,
      codigo,
      tipoKey: String(payload.tipoKey || 'injustificada'),
      tipoNombre: 'Ausencia',
      desde: period.desde,
      hasta: period.hasta,
      dias: period.dias,
      estado: 'pendiente',
      motivo: String(payload.motivo || '').slice(0, 2000),
      requesterId: user._id,
      requesterName: authorName,
      ecrSync: {
        status: 'deferred',
        note: 'Integración ECR diferida',
      },
      historial: [
        {
          estado: 'pendiente',
          actorId: user._id,
          actorName: authorName,
          comentario: 'Creada desde asistente',
          at: new Date(),
        },
      ],
    })
    try {
      await startWorkflowForOrigin({
        tenantId: tenant._id,
        module: 'ausentismos',
        refId: aus._id,
        titulo: `Ausencia: ${period.dias} día(s)`,
        codigo: aus.codigo,
        tipoKey: aus.tipoKey,
        solicitanteId: user._id,
        solicitanteName: authorName,
      })
    } catch (wfErr) {
      console.warn('[workflow] assistant ausencia', wfErr?.message || wfErr)
    }
    resultText = `Listo: registré **${codigo}** (${period.dias} día(s)). Quedó pendiente de aprobación.`
    links = [
      { label: `Ver ${codigo}`, href: `/ausencias/${aus._id}` },
      { label: 'Ausencias', href: '/ausencias' },
    ]
  } else {
    resultText = 'No pude ejecutar esa acción.'
  }

  conv.pendingAction = null
  conv.messages.push({
    role: 'user',
    text: 'Confirmo',
    intent: 'confirmar',
  })
  conv.messages.push({
    role: 'assistant',
    text: resultText,
    intent: 'confirmar',
    links,
    sources: [],
  })
  conv.lastIntent = 'confirmar'
  await conv.save()
  return serializeConversation(conv)
}

export async function listAssistantConversations({ tenantId, userId, limit = 20 }) {
  const items = await AssistantConversation.find({ tenantId, userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('title lastIntent updatedAt createdAt messages')
    .lean()
  return items.map((c) => {
    const last = [...(c.messages || [])].reverse().find((m) => m.role === 'assistant' || m.role === 'user')
    return {
      id: String(c._id),
      title: c.title,
      lastIntent: c.lastIntent || '',
      preview: last?.text ? String(last.text).slice(0, 120) : '',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }
  })
}

export async function getAssistantConversation({ tenantId, userId, conversationId }) {
  const conv = await AssistantConversation.findOne({ _id: conversationId, tenantId, userId })
  if (!conv) return null
  return serializeConversation(conv)
}

export { serializeConversation }
