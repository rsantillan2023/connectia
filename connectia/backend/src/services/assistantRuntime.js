import crypto from 'crypto'
import { AssistantConversation } from '../models/AssistantConversation.js'
import { Request } from '../models/Request.js'
import { RequestType } from '../models/RequestType.js'
import { LicenseType } from '../models/LicenseType.js'
import { LicenseRequest } from '../models/LicenseRequest.js'
import { detectAssistantIntent, matchModuleHint, MODULE_HINTS } from '../lib/assistantIntent.js'
import {
  ADMIN_MODULE_HINTS,
  matchAdminModuleHint,
  normalizeAssistantChannel,
  remapAssistantPayloadForAdmin,
} from '../lib/assistantAdminHints.js'
import {
  searchAdminProductKnowledge,
  formatAdminProductKbAnswer,
  buildAdminProductContextForAi,
} from '../lib/connectiaAdminKnowledge.js'
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
import {
  draftSpaceBooking,
  confirmSpaceReservation,
  confirmOfficeDay,
} from '../services/assistantBooking.js'
import {
  mergeLicensePayload,
  buildLicenseDraft,
  extractLicenseDates,
} from '../lib/assistantLicenseDraft.js'

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
    channel: normalizeAssistantChannel(conv.channel),
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

function channelQuery(channel) {
  const ch = normalizeAssistantChannel(channel)
  if (ch === 'a') return { channel: 'a' }
  return { $or: [{ channel: 'u' }, { channel: { $exists: false } }, { channel: null }] }
}

async function getOrCreateConversation({ tenantId, userId, conversationId, channel = 'u' }) {
  const ch = normalizeAssistantChannel(channel)
  if (conversationId) {
    const existing = await AssistantConversation.findOne({
      _id: conversationId,
      tenantId,
      userId,
      ...channelQuery(ch),
    })
    if (existing) return existing
  }
  const isAdmin = ch === 'a'
  return AssistantConversation.create({
    tenantId,
    userId,
    channel: ch,
    title: isAdmin ? 'Asistente Admin' : 'Asistente',
    messages: [
      {
        role: 'assistant',
        text: isAdmin
          ? '¡Hola! Soy el Asistente de Admin. Puedo consultar la base de conocimientos, decirte dónde está una función y orientarte sobre la gestión de la comunidad. ¿En qué te ayudo?'
          : '¡Hola! Soy el Asistente de tu comunidad. Puedo consultar la base de conocimientos, decirte el estado de tus solicitudes en curso, listar documentos visibles e iniciar trámites (siempre con tu confirmación). ¿En qué te ayudo?',
        intent: 'saludo',
        links: isAdmin
          ? [
              { label: 'Base de conocimientos', href: '/asistente-kb' },
              { label: 'Usuarios', href: '/usuarios' },
              { label: 'Solicitudes', href: '/solicitudes' },
            ]
          : [
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

async function draftLicenseReply({
  tenant,
  user,
  kind = 'license',
  entities = {},
  userText = '',
  prevPayload = {},
}) {
  const merged = mergeLicensePayload(prevPayload, entities, userText)
  let tipo = { nombre: 'Vacaciones', key: 'vacaciones' }
  let disponibleNeto = null
  if (kind === 'license') {
    const tipos = await listActiveLicenseTypes(tenant._id)
    tipo =
      tipos.find((t) => t.esVacaciones) || tipos.find((t) => t.key === 'vacaciones') || tipos[0] || tipo
    const row = await getSaldoVacaciones({ tenantId: tenant._id, userId: user._id })
    disponibleNeto = row?.saldo?.disponibleNeto
  }
  const draft = buildLicenseDraft({
    kind,
    tipo,
    payload: merged,
    extras: { disponibleNeto },
  })
  return {
    text: draft.text,
    links: [
      {
        label: kind === 'absence' ? 'Ausencias' : 'Vacaciones y permisos',
        href: kind === 'absence' ? '/ausencias' : '/licencias',
      },
    ],
    sources: [],
    draftAction: draft.draftAction,
    context: {
      modules: toolListModules(),
      notes: draft.ready ? 'licencia_lista_para_confirmar' : 'licencia_en_armado',
    },
  }
}

async function buildReply({ tenant, user, intent, entities, userText, channel = 'u' }) {
  const tenantId = tenant._id
  const isAdmin = normalizeAssistantChannel(channel) === 'a'
  const moduleHints = isAdmin ? ADMIN_MODULE_HINTS : MODULE_HINTS
  const modules = moduleHints.map((m) => ({ label: m.label, href: m.route }))
  let base = { text: '', links: [], sources: [], draftAction: null, context: { modules } }

  if (intent === 'saludo') {
    if (isAdmin) {
      base.text = `Hola ${displayName(user).split(' ')[0] || ''}. En Admin puedo:\n• Responder con la base de conocimientos de producto\n• Decirte dónde está una función (usuarios, solicitudes, KB…)\n• Orientarte sobre la gestión de la comunidad\n\nTambién podés abrir «Funciones de Administración» en el header.`
      base.links = [
        { label: 'Base de conocimientos', href: '/asistente-kb' },
        { label: 'Usuarios', href: '/usuarios' },
        { label: 'Solicitudes', href: '/solicitudes' },
      ]
      base.context = {
        modules,
        productKb: buildAdminProductContextForAi('asistente admin navegacion'),
        notes: 'admin_saludo',
      }
    } else {
      base.text = `Hola ${displayName(user).split(' ')[0] || ''}. Puedo ayudarte hablando, sin formularios:\n• Solicitudes y consultas\n• Vacaciones y ausencias\n• Reservas de sala, cochera u oficina\n• Documentos y base de conocimientos\n\nDecime qué trámite querés hacer o qué necesitás.`
      base.links = [
        { label: 'Mis solicitudes', href: '/solicitudes' },
        { label: 'Documentos', href: '/docs' },
      ]
    }
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
      (entities.route && moduleHints.find((m) => m.route === entities.route)) ||
      (isAdmin ? matchAdminModuleHint(userText) : matchModuleHint(userText))
    if (mod) {
      base.text = isAdmin
        ? `La función **${mod.label}** está en Admin en ${mod.route}. También la encontrás en «Funciones de Administración».`
        : `El módulo **${mod.label}** está en la app en ${mod.route}.`
      base.links = [{ label: `Ir a ${mod.label}`, href: mod.route }]
      if (isAdmin) {
        const productHits = searchAdminProductKnowledge(userText, { limit: 2 })
        if (productHits[0]?.cuerpo) {
          base.text += `\n\n${String(productHits[0].cuerpo).slice(0, 400)}`
          base.sources = productHits.map((h) => ({
            kind: 'product_kb',
            id: h.id,
            titulo: h.titulo,
            href: h.href,
            excerpt: h.excerpt,
          }))
        }
        base.context = {
          modules,
          productKb: buildAdminProductContextForAi(userText),
          notes: 'admin_donde_modulo',
        }
      }
    } else {
      const list = modules.map((m) => `• ${m.label}: ${m.route}`).join('\n')
      base.text = isAdmin
        ? `Estas son funciones frecuentes de Admin:\n${list}\n\nDecime cuál buscás o abrí «Funciones de Administración».`
        : `Estos son los módulos principales:\n${list}\n\nDecime cuál buscás.`
      base.links = modules.slice(0, 6).map((m) => ({ label: m.label, href: m.route }))
      if (isAdmin) {
        base.context = {
          modules,
          productKb: buildAdminProductContextForAi(userText),
          notes: 'admin_donde_modulo',
        }
      }
    }
    return base
  }

  if (intent === 'reservar_sala') {
    return draftSpaceBooking({
      tenant,
      user,
      kind: 'sala',
      entities,
      userText,
    })
  }

  if (intent === 'reservar_cochera') {
    return draftSpaceBooking({
      tenant,
      user,
      kind: 'cochera',
      entities,
      userText,
    })
  }

  if (intent === 'reservar_puesto') {
    return draftSpaceBooking({
      tenant,
      user,
      kind: 'puesto',
      entities,
      userText,
    })
  }

  if (intent === 'recibo_sueldo') {
    // Decisión de producto (Ola 12): sin módulo de recibos aún (§32/ola 30).
    // Sustituto explícito: consulta a RRHH con confirmación — no inventar montos ni PDFs.
    const periodo = entities.periodo || ''
    if (!periodo) {
      base.text = [
        'El **módulo de recibos de sueldo** todavía no está disponible en Connectia (llega en una ola posterior).',
        '',
        'Puedo abrir una **consulta a RRHH** para que te envíen el recibo.',
        '¿De qué período lo necesitás? (ej. marzo, 03/2026).',
      ].join('\n')
      base.links = [
        { label: 'Mis solicitudes', href: '/solicitudes' },
        { label: 'Documentos', href: '/docs' },
      ]
      base.draftAction = {
        type: 'create_request',
        ready: false,
        summary: 'Consulta recibo (falta período)',
        payload: {
          stage: 'need_periodo_recibo',
          preferTipoKey: 'rrhh',
          titulo: 'Consulta recibo de sueldo',
          area: 'RRHH',
        },
      }
      return base
    }
    return draftSolicitudReply({
      tenant,
      user,
      userText: `Consulta RRHH: necesito el recibo de sueldo del período ${periodo}. Motivo: Recibo. ${userText}`,
      prevPayload: {
        preferTipoKey: 'rrhh',
        titulo: `Consulta recibo de sueldo ${periodo}`,
        area: 'RRHH',
      },
    })
  }

  if (intent === 'como_marcar') {
    const kb = await toolSearchKb({
      tenantId,
      user,
      q: entities.q || 'cómo marcar avisos asistencia',
    })
    const kbFmt = formatKbAnswer(kb)
    if (kb.length) {
      base = {
        ...kbFmt,
        text: `${kbFmt.text}\n\nNota: la marcación de asistencia/turnos completa llega en una ola posterior; hoy podés gestionar **avisos** y ver guías de la base.`,
        links: [
          ...kbFmt.links,
          { label: 'Avisos', href: '/avisos' },
        ],
        context: { modules, kb },
      }
    } else {
      base.text =
        'Todavía no hay un módulo de marcación de asistencia en la app. Los avisos se gestionan en **Avisos** (/avisos). Si necesitás fichaje, abrí una consulta a RRHH o Facilities.'
      base.links = [
        { label: 'Avisos', href: '/avisos' },
        { label: 'Mis solicitudes', href: '/solicitudes' },
      ]
    }
    return base
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
      '',
      '¿Querés solicitar vacaciones? Decime las fechas (ej. «del 10/08 al 20/08»).',
    ]
      .filter((l) => l !== null)
      .join('\n')
    base.links = [
      { label: 'Ver saldos y solicitar', href: '/licencias' },
      { label: 'Mis aprobaciones', href: '/aprobaciones' },
    ]
    base.context = { saldo: row }
    return base
  }

  if (intent === 'saldo_y_solicitar_vacaciones') {
    const saldoReply = await buildReply({
      tenant,
      user,
      intent: 'saldo_vacaciones',
      entities: {},
      userText: '¿cuántas vacaciones tengo?',
    })
    const vacReply = await buildReply({
      tenant,
      user,
      intent: 'solicitar_vacaciones',
      entities,
      userText,
    })
    base.text = [saldoReply.text, '', vacReply.text].filter(Boolean).join('\n')
    base.links = [...(vacReply.links || []), ...(saldoReply.links || [])].slice(0, 6)
    base.draftAction = vacReply.draftAction
    base.sources = vacReply.sources || []
    base.context = { ...(saldoReply.context || {}), ...(vacReply.context || {}) }
    return base
  }

  if (intent === 'solicitar_vacaciones') {
    return draftLicenseReply({
      tenant,
      user,
      kind: 'license',
      entities,
      userText,
    })
  }

  if (intent === 'solicitar_ausentismo') {
    return draftLicenseReply({
      tenant,
      user,
      kind: 'absence',
      entities,
      userText,
    })
  }

  if (intent === 'abrir_consulta' || isSolicitudCreateIntent(userText)) {
    // Solo “quiero hacer un trámite” (vago) pregunta el tipo; “cargar solicitud” entra al slot-filling
    const vagueTramite =
      /^(quiero\s+)?(hacer|armar|iniciar|abrir)?\s*(un[oa]?\s+)?(tramite|trámite)\s*$/i.test(
        userText.trim(),
      ) || /^(nuevo\s+)?(tramite|trámite)\s*$/i.test(userText.trim())
    if (vagueTramite) {
      base.text = [
        'Dale, ¿qué trámite querés hacer?',
        '• Vacaciones o licencia',
        '• Una solicitud / consulta (RRHH, IT, etc.)',
        '• Reserva de sala, cochera u oficina',
        '• Consultar saldo de vacaciones o solicitudes en curso',
        '',
        'Escribilo con tus palabras (ej. «vacaciones del 10/08 al 20/08» o «reservar sala mañana a las 10»).',
      ].join('\n')
      return base
    }
    return draftSolicitudReply({ tenant, user, userText })
  }

  // ayuda_kb / desconocido → KB + docs + posts (+ product KB en Admin)
  const q = entities.q || userText

  if (isAdmin) {
    const productHits = searchAdminProductKnowledge(q, { limit: 5 })
    const tenantKb = await toolSearchKb({ tenantId, user, q })
    const productFmt = formatAdminProductKbAnswer(productHits)
    const tenantFmt = formatKbAnswer(tenantKb)
    const hasProduct = productHits.length > 0
    const hasTenant = tenantKb.length > 0
    let text = ''
    if (hasProduct) text = productFmt.text
    if (hasTenant) {
      text = text
        ? `${text}\n\nTambién en la KB del tenant:\n${tenantKb
            .slice(0, 3)
            .map((a) => `• **${a.titulo}** — ${String(a.excerpt || a.cuerpo || '').slice(0, 120)}`)
            .join('\n')}`
        : tenantFmt.text
    }
    if (!text) text = productFmt.text
    base.text = text
    base.links = [
      ...productFmt.links,
      ...tenantFmt.links.filter((l) => !productFmt.links.some((p) => p.href === l.href)),
    ].slice(0, 8)
    base.sources = [...productFmt.sources, ...tenantFmt.sources]
    base.context = {
      modules,
      kb: tenantKb,
      productKb: buildAdminProductContextForAi(q),
      notes: 'admin_ayuda_product_kb',
    }
    return base
  }

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

export async function handleAssistantMessage({ tenant, user, text, conversationId, channel = 'u' }) {
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

  const ch = normalizeAssistantChannel(channel)
  const isAdmin = ch === 'a'
  const moduleHints = isAdmin ? ADMIN_MODULE_HINTS : MODULE_HINTS

  const conv = await getOrCreateConversation({
    tenantId: tenant._id,
    userId: user._id,
    conversationId,
    channel: ch,
  })

  const detected = detectAssistantIntent(userText, { moduleHints })

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
  if (detected.intent === 'cancelar') {
    const hadPending = Boolean(conv.pendingAction)
    conv.pendingAction = null
    conv.messages.push({ role: 'user', text: userText, intent: 'cancelar' })
    conv.messages.push({
      role: 'assistant',
      text: hadPending
        ? 'Listo, cancelé la acción pendiente. ¿En qué más te ayudo?'
        : 'No había ningún trámite en curso para cancelar. Decime qué necesitás.',
      intent: 'cancelar',
    })
    conv.lastIntent = 'cancelar'
    await conv.save()
    return serializeConversation(conv)
  }
  if (detected.intent === 'confirmar') {
    const pendingEarly = conv.pendingAction
    const earlyDraft =
      pendingEarly &&
      (String(pendingEarly.confirmationToken || '').startsWith('draft-') ||
        pendingEarly.payload?.stage !== 'ready')
    conv.messages.push({ role: 'user', text: userText, intent: 'confirmar' })
    conv.messages.push({
      role: 'assistant',
      text: earlyDraft
        ? 'Todavía me faltan datos para cerrar el trámite. Respondeme lo que te pregunté (fechas, motivo, etc.) y al final te pido el sí.'
        : 'No tengo un trámite listo para confirmar. Decime qué querés hacer (vacaciones, solicitud, reserva…) y lo armamos hablando.',
      intent: 'confirmar',
    })
    conv.lastIntent = 'confirmar'
    await conv.save()
    return serializeConversation(conv)
  }

  // Continuar armado de solicitud / booking / licencia / recibo si hay borrador incompleto
  let built
  const pending = conv.pendingAction
  const bookingTypes = [
    'create_reservation',
    'create_reservation_cochera',
    'create_reservation_puesto',
    'create_office_day',
  ]
  const licenseTypes = ['create_license', 'create_absence']
  if (
    pending?.type === 'create_request' &&
    pending.payload &&
    pending.payload.stage &&
    pending.payload.stage !== 'ready' &&
    detected.intent !== 'mis_solicitudes' &&
    detected.intent !== 'mis_documentos' &&
    detected.intent !== 'ayuda_kb' &&
    detected.intent !== 'reservar_sala' &&
    detected.intent !== 'reservar_cochera' &&
    detected.intent !== 'reservar_puesto'
  ) {
    if (pending.payload.stage === 'need_periodo_recibo') {
      const periodo =
        detected.entities.periodo ||
        userText.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{1,2}\/\d{4}|\d{4}-\d{2})/i)?.[1] ||
        userText.trim()
      built = await draftSolicitudReply({
        tenant,
        user,
        userText: `Consulta RRHH: necesito el recibo de sueldo del período ${periodo}. Motivo: Recibo.`,
        prevPayload: {
          ...pending.payload,
          titulo: `Consulta recibo de sueldo ${periodo}`,
        },
      })
    } else {
      built = await draftSolicitudReply({
        tenant,
        user,
        userText,
        prevPayload: pending.payload,
      })
    }
  } else if (
    licenseTypes.includes(pending?.type) &&
    pending.payload &&
    pending.payload.stage &&
    pending.payload.stage !== 'ready' &&
    detected.intent !== 'mis_solicitudes' &&
    detected.intent !== 'cancelar'
  ) {
    // En need_motivo, el turno completo es el motivo (salvo fechas nuevas)
    let entities = { ...detected.entities }
    if (pending.payload.stage === 'need_motivo') {
      const onlyDates = extractLicenseDates(userText)
      if (!onlyDates.desde || String(userText).replace(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/g, '').trim().length > 2) {
        entities.motivo = userText.trim().slice(0, 500)
      }
    }
    built = await draftLicenseReply({
      tenant,
      user,
      kind: pending.type === 'create_absence' ? 'absence' : 'license',
      entities,
      userText,
      prevPayload: pending.payload,
    })
  } else if (
    bookingTypes.includes(pending?.type) &&
    pending.payload &&
    pending.payload.stage &&
    pending.payload.stage !== 'ready' &&
    detected.intent !== 'mis_solicitudes' &&
    detected.intent !== 'cancelar'
  ) {
    const kind =
      pending.type === 'create_office_day' || pending.type === 'create_reservation_puesto'
        ? 'puesto'
        : pending.type === 'create_reservation_cochera'
          ? 'cochera'
          : 'sala'
    // Si eligen sede por número en office_day
    let entities = { ...detected.entities }
    if (pending.type === 'create_office_day' && pending.payload.alternatives?.length) {
      const num = userText.trim().match(/^(\d)$/)
      if (num) {
        const alt = pending.payload.alternatives[Number(num[1]) - 1]
        if (alt) {
          entities.siteId = alt.siteId || alt.id
          entities.sede = alt.nombre
        }
      }
    }
    built = await draftSpaceBooking({
      tenant,
      user,
      kind,
      entities,
      prevPayload: pending.payload,
      userText,
    })
  } else {
    built = await buildReply({
      tenant,
      user,
      intent: detected.intent,
      entities: detected.entities,
      userText,
      channel: ch,
    })
  }

  // En Admin: priorizar orientación/KB; no armar trámites personales U por defecto
  if (isAdmin && built.draftAction) {
    built = {
      text:
        'En Admin te oriento con la base de conocimientos y la navegación. Los trámites personales (vacaciones, reservas) se hacen desde la app del miembro. ¿Querés que busque en la KB o te diga dónde está una función?',
      links: [
        { label: 'Base de conocimientos', href: '/asistente-kb' },
        { label: 'Solicitudes (gestión)', href: '/solicitudes' },
      ],
      sources: [],
      draftAction: null,
      context: { modules: moduleHints.map((m) => ({ label: m.label, href: m.route })), notes: 'admin_no_mutacion_u' },
    }
  }

  // 29.CONV: no reformular con LLM los turnos de slot-filling / confirmación hablada
  const transactional =
    Boolean(built.draftAction) ||
    /_(en_armado|lista_para_confirmar)$/.test(String(built.context?.notes || '')) ||
    ['solicitar_vacaciones', 'solicitar_ausentismo', 'abrir_consulta', 'reservar_sala', 'reservar_cochera', 'reservar_puesto', 'saldo_y_solicitar_vacaciones', 'recibo_sueldo'].includes(
      detected.intent,
    )
  // Admin: sí usa LLM con productKb JSON como contexto (paridad Hiryx), salvo mutaciones bloqueadas
  const adminSkipAi = isAdmin && built.context?.notes === 'admin_no_mutacion_u'
  const polished =
    transactional || adminSkipAi
      ? { text: built.text, suggestedLinks: [], usedAi: false }
      : await polishAssistantAnswer({
          userText,
          intent: detected.intent,
          baseAnswer: built.text,
          context: {
            ...(built.context || {}),
            productKb:
              built.context?.productKb ||
              (isAdmin ? buildAdminProductContextForAi(userText) : undefined),
          },
          channel: ch,
        })

  let links = [...(built.links || [])]
  for (const l of polished.suggestedLinks || []) {
    if (!links.some((x) => x.href === l.href)) links.push(l)
  }
  let sources = built.sources || []

  if (isAdmin) {
    const remapped = remapAssistantPayloadForAdmin({ links, sources })
    links = remapped.links
    sources = remapped.sources
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
    sources,
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
        status: 'pending',
        note: 'Sync ECR pendiente',
        externalId: '',
        at: null,
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
      const { persistEcrSync } = await import('./ecrAusentismoAdapter.js')
      await persistEcrSync(aus, { tenant, user, event: 'create' })
    } catch (syncErr) {
      console.warn('[ecr] assistant ausencia', syncErr?.message || syncErr)
    }
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
  } else if (
    pending.type === 'create_reservation' ||
    pending.type === 'create_reservation_cochera' ||
    pending.type === 'create_reservation_puesto'
  ) {
    const result = await confirmSpaceReservation({
      tenant,
      user,
      payload: pending.payload || {},
    })
    resultText = result.text
    links = result.links
  } else if (pending.type === 'create_office_day') {
    const result = await confirmOfficeDay({
      tenant,
      user,
      payload: pending.payload || {},
    })
    resultText = result.text
    links = result.links
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

export async function listAssistantConversations({ tenantId, userId, limit = 20, channel = 'u' }) {
  const ch = normalizeAssistantChannel(channel)
  const items = await AssistantConversation.find({ tenantId, userId, ...channelQuery(ch) })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('title channel lastIntent updatedAt createdAt messages')
    .lean()
  return items.map((c) => {
    const last = [...(c.messages || [])].reverse().find((m) => m.role === 'assistant' || m.role === 'user')
    return {
      id: String(c._id),
      title: c.title,
      channel: normalizeAssistantChannel(c.channel),
      lastIntent: c.lastIntent || '',
      preview: last?.text ? String(last.text).slice(0, 120) : '',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }
  })
}

export async function getAssistantConversation({ tenantId, userId, conversationId, channel = 'u' }) {
  const ch = normalizeAssistantChannel(channel)
  const conv = await AssistantConversation.findOne({
    _id: conversationId,
    tenantId,
    userId,
    ...channelQuery(ch),
  })
  if (!conv) return null
  return serializeConversation(conv)
}

export { serializeConversation }
