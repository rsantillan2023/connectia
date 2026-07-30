/**
 * Seed genérico al crear un suscriptor desde plataforma.
 * Deja el tenant listo para operar (menú, org, users demo, muro, solicitudes,
 * FAQs/tutoriales, políticas, hub, etc.).
 * Uso: seedGenericTenant({ tenant, passwordHash, profile })
 */
import { User } from '../models/User.js'
import { MenuItem } from '../models/MenuItem.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { Post } from '../models/Post.js'
import { RequestType } from '../models/RequestType.js'
import { Request } from '../models/Request.js'
import { Survey } from '../models/Survey.js'
import { SurveyResponse } from '../models/SurveyResponse.js'
import { DocItem } from '../models/DocItem.js'
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { Policy } from '../models/Policy.js'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { SavedPost } from '../models/SavedPost.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'
import { defaultPostsConfig } from '../lib/postsConfig.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WORKFLOW_USE_CASE_EXAMPLES } from '../services/workflowAi.js'
import { seedHubKindsForTenant } from './seedHubKinds.js'
import { seedNotificationsForTenant } from './seedNotifications.js'
import { seedGreetingsForTenant } from './seedGreetings.js'
import { seedDirectoryForTenant } from '../lib/directorySeed.js'
import { DEFAULT_CAPS } from '../constants/moduleCatalog.js'
import { seedBenefitsForTenant } from '../lib/benefitsSeed.js'
import { postLedgerEntry } from '../lib/walletService.js'
import { syncKbSource } from '../services/kbIndex.js'
import {
  GENERIC_MENU,
  DEFAULT_SEED_PASSWORD,
  adminUsuarioForCode,
  brandingFromProfile,
  heuristicCompanyProfile,
  normalizeCompanyProfile,
} from '../lib/genericTenantDefaults.js'

const PDF_DEMO = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

const WORKFLOW_TIPO_MAP = {
  vacaciones: 'rrhh',
  acceso: 'sistemas',
}

async function upsertUser(tenantId, passwordHash, def) {
  let u = await User.findOne({ tenantId, usuario: def.usuario })
  const payload = {
    tenantId,
    usuario: def.usuario,
    idExterno: def.idExterno,
    passwordHash,
    nombre: def.nombre,
    apellido: def.apellido,
    email: def.email,
    roles: def.roles,
    capabilities: def.capabilities || [],
    origen: 'MANUAL',
    activo: true,
    termsAcceptedVersion: '1.0',
    termsAcceptedAt: new Date(),
  }
  if (!u) {
    u = await User.create(payload)
  } else {
    Object.assign(u, payload)
    await u.save()
  }
  return u
}

function pickAreaKey(areas, preferred, fallbackIndex = 0) {
  const keys = areas.map((a) => a.key)
  if (preferred && keys.includes(preferred)) return preferred
  return keys[fallbackIndex] || preferred || 'rrhh'
}

/**
 * @param {{
 *   tenant: import('mongoose').Document,
 *   passwordHash: string,
 *   profile?: object,
 * }} opts
 */
export async function seedGenericTenant({ tenant, passwordHash, profile: profileIn } = {}) {
  if (!tenant?._id) throw new Error('tenant requerido')
  if (!passwordHash) throw new Error('passwordHash requerido')

  const empCodigo = String(tenant.empCodigo || '').toUpperCase()
  const profile = normalizeCompanyProfile(
    profileIn || heuristicCompanyProfile(empCodigo, tenant.nombre),
    { empCodigo, nombre: tenant.nombre },
  )
  const brand = profile.brandName
  const branding = brandingFromProfile(profile)
  const codeSlug = empCodigo.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'tenant'
  const domain = `${codeSlug}.connectia.local`

  tenant.nombre = brand
  tenant.branding = {
    ...(tenant.branding?.toObject?.() ?? tenant.branding ?? {}),
    ...branding,
    splash: { ...branding.splash },
  }
  tenant.loginMethods = tenant.loginMethods?.length ? tenant.loginMethods : ['password', 'id']
  tenant.capabilities = tenant.capabilities?.length
    ? tenant.capabilities
    : tenant.licensedCapabilities?.length
      ? [...tenant.licensedCapabilities]
      : [...DEFAULT_CAPS]
  if (!tenant.licensedCapabilities?.length) {
    tenant.licensedCapabilities = [...tenant.capabilities]
  }
  tenant.timezone = profile.timezone || 'America/Argentina/Buenos_Aires'
  tenant.uxShell = tenant.uxShell || 'connectia'
  tenant.ugc = { enabled: true, requireApproval: true }
  tenant.solicitudesConfig = defaultSolicitudesConfig()
  tenant.postsConfig = defaultPostsConfig()
  await tenant.save()

  const areaByKey = {}
  for (const a of profile.areas) {
    areaByKey[a.key] = await OrgArea.findOneAndUpdate(
      { tenantId: tenant._id, key: a.key },
      { ...a, tenantId: tenant._id, activo: true },
      { upsert: true, new: true },
    )
  }

  const groupByKey = {}
  for (const g of profile.groups) {
    groupByKey[g.key] = await UserGroup.findOneAndUpdate(
      { tenantId: tenant._id, key: g.key },
      { ...g, tenantId: tenant._id, activo: true },
      { upsert: true, new: true },
    )
  }

  const areaKeys = Object.keys(areaByKey)
  const groupKeys = Object.keys(groupByKey)
  const aRrhh = pickAreaKey(profile.areas, 'rrhh', 0)
  const aOps = pickAreaKey(profile.areas, 'operaciones', Math.min(1, areaKeys.length - 1))
  const aCom = pickAreaKey(profile.areas, 'comercial', Math.min(2, areaKeys.length - 1))
  const aIt = pickAreaKey(profile.areas, 'it', Math.min(3, areaKeys.length - 1))
  const aMkt = pickAreaKey(profile.areas, 'marketing', Math.min(4, areaKeys.length - 1))
  const gLead = groupKeys.includes('liderazgo') ? 'liderazgo' : groupKeys[0]
  const gCorp = groupKeys.includes('corporativo') ? 'corporativo' : groupKeys[Math.min(1, groupKeys.length - 1)]
  const gCampo = groupKeys.includes('campo') ? 'campo' : groupKeys[Math.min(2, groupKeys.length - 1)] || gCorp

  const adminUsuario = adminUsuarioForCode(empCodigo)
  const userDefs = [
    {
      usuario: adminUsuario,
      idExterno: `${empCodigo.slice(0, 3)}1000`,
      nombre: 'Admin',
      apellido: brand.split(/\s+/)[0] || 'Tenant',
      email: `admin@${domain}`,
      roles: ['member', 'admin'],
      capabilities: [],
      areaKey: aRrhh,
      groupKeys: [gLead, gCorp].filter(Boolean),
    },
    {
      usuario: 'comunicacion',
      idExterno: `${empCodigo.slice(0, 3)}1001`,
      nombre: 'Valentina',
      apellido: 'Comunicación',
      email: `comunicacion@${domain}`,
      roles: ['member'],
      capabilities: [
        'admin.publicaciones',
        'admin.encuestas',
        'admin.documentos',
        'admin.ayuda',
        'admin.politicas',
        'admin.hub',
        'admin.workflows',
        'admin.directorio',
        'admin.beneficios',
      ],
      areaKey: aMkt,
      groupKeys: [gCorp, gLead].filter(Boolean),
    },
    {
      usuario: 'rrhh.gestor',
      idExterno: `${empCodigo.slice(0, 3)}1002`,
      nombre: 'Patricia',
      apellido: 'People',
      email: `rrhh@${domain}`,
      roles: ['member'],
      capabilities: [
        'admin.solicitudes',
        'admin.tipos-solicitud',
        'admin.usuarios',
        'admin.organizacion',
        'admin.reportes',
        'admin.ayuda',
        'admin.politicas',
        'admin.workflows',
        'admin.beneficios',
        'admin.legajos',
        'admin.hrcatalog',
        'admin.onboarding',
        'admin.encuestas',
      ],
      areaKey: aRrhh,
      groupKeys: [gCorp, gLead].filter(Boolean),
    },
    {
      usuario: 'maria.lopez',
      idExterno: `${empCodigo.slice(0, 3)}2001`,
      nombre: 'María',
      apellido: 'López',
      email: `maria.lopez@${domain}`,
      roles: ['member'],
      capabilities: [],
      areaKey: aRrhh,
      groupKeys: [gCorp].filter(Boolean),
    },
    {
      usuario: 'juan.perez',
      idExterno: `${empCodigo.slice(0, 3)}2002`,
      nombre: 'Juan',
      apellido: 'Pérez',
      email: `juan.perez@${domain}`,
      roles: ['member'],
      capabilities: [],
      areaKey: aOps,
      groupKeys: [gCampo].filter(Boolean),
    },
    {
      usuario: 'sofia.garcia',
      idExterno: `${empCodigo.slice(0, 3)}2003`,
      nombre: 'Sofía',
      apellido: 'García',
      email: `sofia.garcia@${domain}`,
      roles: ['member'],
      capabilities: [],
      areaKey: aCom,
      groupKeys: [gCampo].filter(Boolean),
    },
    {
      usuario: 'carlos.ruiz',
      idExterno: `${empCodigo.slice(0, 3)}2004`,
      nombre: 'Carlos',
      apellido: 'Ruiz',
      email: `carlos.ruiz@${domain}`,
      roles: ['member'],
      capabilities: [],
      areaKey: aIt,
      groupKeys: [gCorp].filter(Boolean),
    },
  ]

  const usersByUsuario = {}
  for (const def of userDefs) {
    const u = await upsertUser(tenant._id, passwordHash, def)
    u.areaId = areaByKey[def.areaKey]?._id
    u.groupIds = (def.groupKeys || []).map((k) => groupByKey[k]?._id).filter(Boolean)
    await u.save()
    usersByUsuario[def.usuario] = u
  }

  const admin = usersByUsuario[adminUsuario]
  const comunicacion = usersByUsuario.comunicacion
  const rrhhGestor = usersByUsuario['rrhh.gestor']
  const juan = usersByUsuario['juan.perez']
  const sofia = usersByUsuario['sofia.garcia']
  const carlos = usersByUsuario['carlos.ruiz']

  for (const item of GENERIC_MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }

  for (const ex of WORKFLOW_USE_CASE_EXAMPLES) {
    const mappedTipo = WORKFLOW_TIPO_MAP[ex.id]
    const trigger = {
      ...ex.draft.trigger,
      ...(mappedTipo != null ? { tipoKey: mappedTipo } : {}),
    }
    await WorkflowDefinition.findOneAndUpdate(
      { tenantId: tenant._id, name: ex.draft.name },
      {
        tenantId: tenant._id,
        name: ex.draft.name,
        description: ex.draft.description,
        trigger,
        steps: ex.draft.steps,
        activo: true,
        aiNotes: ex.draft.notes || '',
        createdByName: 'seed',
      },
      { upsert: true, new: true },
    )
  }

  const seedPosts = [
    {
      titulo: profile.welcomeTitle,
      cuerpo: profile.welcomeBody,
      tipo: 'noticia',
      layout: 'banner',
      imageUrl: profile.loginBgUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      pinned: true,
      priority: 100,
      hoursAgo: 2,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: comunicacion,
    },
    {
      titulo: 'Cómo usar Connectia en tu día a día',
      cuerpo:
        '• Publicaciones: novedades del equipo\n' +
        '• Solicitudes: trámites a RRHH, IT y más\n' +
        '• Encuestas: tu voz cuenta\n' +
        '• Enlaces: accesos rápidos a herramientas\n' +
        '• Chat: conversaciones internas',
      tipo: 'aviso',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&q=80',
      pinned: false,
      priority: 90,
      hoursAgo: 6,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: comunicacion,
    },
    {
      titulo: `Beneficio del mes — equipo ${brand}`,
      cuerpo:
        'Este mes sumamos beneficios para colaboradores activos.\n' +
        'Consultá en Enlaces → People o abrí una solicitud a RRHH.',
      tipo: 'beneficio',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=900&q=80',
      pinned: false,
      priority: 70,
      hoursAgo: 24,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: rrhhGestor,
    },
    {
      titulo: 'Mantenimiento de sistemas — domingo 02:00–06:00',
      cuerpo:
        'IT realizará una ventana de mantenimiento. Durante ese lapso pueden fallar algunos accesos.\n' +
        'Si tenés un incidente urgente, abrí ticket de Soporte sistemas.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80',
      pinned: false,
      priority: 80,
      hoursAgo: 5,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: carlos,
    },
    {
      titulo: 'Recordatorio de seguridad y buen clima',
      cuerpo:
        'Cuidemos el espacio de trabajo: reportá desvíos, usá el EPP cuando corresponda y tratemos con respeto en el muro y el chat.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=80',
      pinned: false,
      priority: 65,
      hoursAgo: 36,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey[aOps]?._id].filter(Boolean),
        groupIds: [groupByKey[gCampo]?._id].filter(Boolean),
      },
      author: juan,
    },
  ]

  const now = new Date()
  const postsByTitulo = {}
  for (const sp of seedPosts) {
    const author = sp.author || comunicacion
    const payload = {
      titulo: sp.titulo,
      tipo: sp.tipo,
      layout: sp.layout,
      imageUrl: sp.imageUrl || '',
      audioUrl: '',
      cuerpo: sp.cuerpo,
      pinned: sp.pinned,
      priority: sp.priority,
      audience: sp.audience,
      status: 'published',
      publishedAt: new Date(now.getTime() - sp.hoursAgo * 3600_000),
      authorId: author._id,
      authorName: `${author.nombre} ${author.apellido}`.trim(),
    }
    const existing = await Post.findOne({ tenantId: tenant._id, titulo: sp.titulo })
    if (existing) {
      Object.assign(existing, payload)
      await existing.save()
      postsByTitulo[sp.titulo] = existing
    } else {
      postsByTitulo[sp.titulo] = await Post.create({
        tenantId: tenant._id,
        ...payload,
        reactions: { like: 4, love: 2, clap: 2 },
      })
    }
  }

  const ugcTitulo = `¡Buen arranque de semana en ${brand}!`
  const ugcExisting = await Post.findOne({ tenantId: tenant._id, titulo: ugcTitulo, origin: 'member' })
  if (!ugcExisting) {
    await Post.create({
      tenantId: tenant._id,
      titulo: ugcTitulo,
      cuerpo: 'Equipo motivado y con buenas ondas. Comparto foto del equipo para el muro.\n(Esta publicación está en revisión — seed demo UGC)',
      tipo: 'general',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=80',
      status: 'pending_review',
      publishedAt: null,
      authorId: juan._id,
      authorName: `${juan.nombre} ${juan.apellido}`.trim(),
      origin: 'member',
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      reactions: { like: 0, love: 0, clap: 0 },
      moderationAi: {
        status: 'ready',
        analyzedAt: new Date(),
        provider: 'heuristic',
        model: 'rules-v2',
        risk: 'low',
        score: 12,
        suggestedAction: 'approve',
        summary: 'Contenido de clima laboral positivo.',
        reasons: ['Sin señales de riesgo evidentes'],
        categories: ['ok'],
        policyFlags: [],
        error: '',
      },
    })
  }

  const typeDefs = [
    {
      key: 'rrhh',
      nombre: 'Consulta RRHH',
      descripcion: 'Vacaciones, legajo, recibos, beneficios',
      area: 'RRHH',
      orden: 10,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        {
          key: 'motivo',
          label: 'Motivo',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Vacaciones', 'Legajo', 'Recibo de sueldo', 'Beneficios', 'Otro'],
        },
        { key: 'desde', label: 'Desde', tipo: 'date', required: false, orden: 20 },
        { key: 'hasta', label: 'Hasta', tipo: 'date', required: false, orden: 30 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 40, placeholder: 'Contanos el caso' },
      ],
    },
    {
      key: 'operaciones',
      nombre: 'Soporte operaciones',
      descripcion: 'Incidencias operativas y pedidos de campo',
      area: 'Operaciones',
      orden: 20,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey[aOps]?._id].filter(Boolean),
        groupIds: [groupByKey[gCampo]?._id].filter(Boolean),
      },
      campos: [
        {
          key: 'prioridad',
          label: 'Prioridad',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Baja', 'Media', 'Alta', 'Crítica'],
        },
        { key: 'sector', label: 'Sector / zona', tipo: 'text', required: true, orden: 20 },
        { key: 'detalle', label: 'Descripción', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'comercial',
      nombre: 'Soporte comercial',
      descripcion: 'Pedidos, precios y clientes',
      area: 'Comercial',
      orden: 30,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey[aCom]?._id].filter(Boolean),
        groupIds: [groupByKey[gCampo]?._id].filter(Boolean),
      },
      campos: [
        {
          key: 'tema',
          label: 'Tema',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Pedido bloqueado', 'Lista de precios', 'Cliente', 'Otro'],
        },
        { key: 'cliente', label: 'Cliente', tipo: 'text', required: false, orden: 20 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'sistemas',
      nombre: 'Soporte sistemas',
      descripcion: 'Accesos, notebooks, VPN, apps',
      area: 'IT',
      orden: 40,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', required: true, orden: 10, placeholder: 'Ej. correo, VPN' },
        {
          key: 'prioridad',
          label: 'Prioridad',
          tipo: 'select',
          required: true,
          orden: 20,
          opciones: ['Baja', 'Media', 'Alta'],
        },
        { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', required: false, orden: 30 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 40 },
      ],
    },
    {
      key: 'turno_carnet',
      nombre: 'Turno carnet',
      descripcion: 'Pedido de turno para tramitar carnet / credencial (ex-gap 32.03).',
      area: 'RRHH',
      orden: 50,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        {
          key: 'tipo_carnet',
          label: 'Tipo de carnet',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Credencial de acceso', 'Carnet de identificación', 'Otro'],
        },
        { key: 'fecha_preferida', label: 'Fecha preferida', tipo: 'date', required: true, orden: 20 },
        {
          key: 'franja',
          label: 'Franja horaria',
          tipo: 'select',
          required: true,
          orden: 30,
          opciones: ['Mañana', 'Tarde', 'Indistinto'],
        },
        {
          key: 'motivo',
          label: 'Motivo',
          tipo: 'textarea',
          required: true,
          orden: 40,
          placeholder: 'Alta, renovación, extravío…',
        },
      ],
    },
  ]

  const typesByKey = {}
  for (const t of typeDefs) {
    typesByKey[t.key] = await RequestType.findOneAndUpdate(
      { tenantId: tenant._id, key: t.key },
      {
        ...t,
        tenantId: tenant._id,
        activo: true,
        audience: t.audience || { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true, new: true },
    )
  }

  const reqCount = await Request.countDocuments({ tenantId: tenant._id })
  if (reqCount === 0) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const reqSeeds = [
      {
        n: '0001',
        tipoKey: 'rrhh',
        titulo: 'Consulta saldo de vacaciones',
        cuerpo: 'Hola People, ¿cuántos días me quedan pendientes?',
        estado: 'abierta',
        requester: juan,
        camposValores: [
          { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Vacaciones' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Necesito planificar franco.' },
        ],
        messages: [
          {
            texto: 'Hola People, ¿cuántos días me quedan pendientes?',
            authorId: juan._id,
            authorName: `${juan.nombre} ${juan.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0002',
        tipoKey: 'sistemas',
        titulo: 'Sin acceso a VPN',
        cuerpo: 'No puedo conectar a la VPN corporativa.',
        estado: 'cerrada',
        requester: sofia,
        camposValores: [
          { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'VPN' },
          { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
          { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: true },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Error de certificado.' },
        ],
        messages: [
          {
            texto: 'No puedo conectar a la VPN.',
            authorId: sofia._id,
            authorName: `${sofia.nombre} ${sofia.apellido}`,
            isAdmin: false,
            interno: false,
          },
          {
            texto: 'Renovamos el certificado. Probá de nuevo.',
            authorId: admin._id,
            authorName: `${admin.nombre} ${admin.apellido}`,
            isAdmin: true,
            interno: false,
          },
        ],
      },
      {
        n: '0003',
        tipoKey: 'comercial',
        titulo: 'Pedido bloqueado — cliente demo',
        cuerpo: 'Pedido de ejemplo bloqueado por crédito.',
        estado: 'abierta',
        requester: sofia,
        camposValores: [
          { key: 'tema', label: 'Tema', tipo: 'select', value: 'Pedido bloqueado' },
          { key: 'cliente', label: 'Cliente', tipo: 'text', value: 'Cliente Demo' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Necesito desbloqueo.' },
        ],
        messages: [
          {
            texto: 'Pedido bloqueado por crédito.',
            authorId: sofia._id,
            authorName: `${sofia.nombre} ${sofia.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
    ]
    for (const r of reqSeeds) {
      const tipo = typesByKey[r.tipoKey]
      await Request.create({
        tenantId: tenant._id,
        codigo: `SOL-${day}-${r.n}`,
        tipoId: tipo?._id,
        tipoKey: tipo?.key || r.tipoKey,
        tipoNombre: tipo?.nombre || r.tipoKey,
        area: tipo?.area || 'General',
        titulo: r.titulo,
        cuerpo: r.cuerpo,
        estado: r.estado,
        requesterId: r.requester._id,
        requesterName: `${r.requester.nombre} ${r.requester.apellido}`.trim(),
        camposValores: r.camposValores,
        messages: r.messages,
        origen: 'member',
      })
    }
  }

  const surveyTitulo = `Clima laboral — pulse ${brand}`
  let survey = await Survey.findOne({ tenantId: tenant._id, titulo: surveyTitulo })
  if (!survey) {
    const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
    survey = await Survey.create({
      tenantId: tenant._id,
      titulo: surveyTitulo,
      descripcion: `Encuesta de clima para el equipo de ${brand}. Tus respuestas ayudan a priorizar acciones.`,
      status: 'published',
      publishedAt: new Date(),
      version: 1,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      audienceSnapshot: {
        invitedCount,
        capturedAt: new Date(),
        mode: 'all',
        areaIds: [],
        groupIds: [],
      },
      anonymous: false,
      authorId: comunicacion._id,
      authorName: `${comunicacion.nombre} ${comunicacion.apellido}`,
      questions: [
        {
          id: 'q_sat',
          texto: `¿Qué tan satisfecho/a estás con la comunicación interna de ${brand}?`,
          tipo: 'rating',
          required: true,
          grupo: 'Comunicación',
          opciones: [],
        },
        {
          id: 'q_tema',
          texto: '¿Qué tema debería priorizar People este trimestre?',
          tipo: 'single',
          required: true,
          grupo: 'Agenda',
          opciones: ['Beneficios', 'Carrera y desarrollo', 'Herramientas de trabajo', 'Clima de equipo', 'Otro'],
        },
        {
          id: 'q_com',
          texto: 'Comentario libre (opcional)',
          tipo: 'textarea',
          required: false,
          grupo: 'Agenda',
          opciones: [],
        },
      ],
    })
  }

  if (survey && juan) {
    await SurveyResponse.findOneAndUpdate(
      { surveyId: survey._id, userId: juan._id },
      {
        tenantId: tenant._id,
        surveyId: survey._id,
        surveyVersion: survey.version || 1,
        userId: juan._id,
        answers: [
          { questionId: 'q_sat', value: 4 },
          { questionId: 'q_tema', value: 'Herramientas de trabajo' },
          { questionId: 'q_com', value: 'Más avisos operativos en el muro.' },
        ],
        submittedAt: new Date(),
      },
      { upsert: true },
    )
  }

  const docCount = await DocItem.countDocuments({ tenantId: tenant._id })
  if (docCount === 0) {
    await DocItem.create([
      {
        tenantId: tenant._id,
        titulo: 'Código de ética y conducta',
        descripcion: 'Principios de integridad y convivencia laboral.',
        category: 'RRHH',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        authorName: 'People',
        publishedAt: new Date(),
      },
      {
        tenantId: tenant._id,
        titulo: 'Guía de bienvenida al colaborador',
        descripcion: `Onboarding básico para ${brand}.`,
        category: 'RRHH',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        authorName: 'People',
        publishedAt: new Date(Date.now() - 86400000),
      },
      {
        tenantId: tenant._id,
        titulo: 'Política de seguridad de la información',
        descripcion: 'Uso de dispositivos, VPN y datos sensibles.',
        category: 'IT',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        authorName: 'IT',
        publishedAt: new Date(Date.now() - 172800000),
      },
    ])
  }

  const helpAudience = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
  if ((await Faq.countDocuments({ tenantId: tenant._id })) === 0) {
    const faqs = await Faq.create([
      {
        tenantId: tenant._id,
        category: 'RRHH',
        pregunta: '¿Cómo pido vacaciones?',
        respuesta:
          'Entrá a Mis solicitudes → Nueva → plantilla de vacaciones → completá fechas y enviá. El estado se actualiza en la misma pantalla.',
        keywords: ['vacaciones', 'permiso', 'licencia'],
        orden: 10,
        status: 'published',
        audience: helpAudience,
        authorName: 'People',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'Connectia',
        pregunta: '¿Dónde veo mis documentos?',
        respuesta: `En Mis documentos de ${brand}. Ahí están las carpetas con archivos publicados para vos.`,
        keywords: ['documentos', 'archivos', 'legajo'],
        orden: 20,
        status: 'published',
        audience: helpAudience,
        authorName: 'Soporte',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'Connectia',
        pregunta: '¿Dónde están las novedades de la comunidad?',
        respuesta:
          'En Publicaciones (Home). Ahí aparecen avisos, campañas y reconocimientos. Podés guardar posts importantes en Mis guardados.',
        keywords: ['novedades', 'muro', 'publicaciones'],
        orden: 30,
        status: 'published',
        audience: helpAudience,
        authorName: 'Comunicación',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
      {
        tenantId: tenant._id,
        category: 'Cumplimiento',
        pregunta: '¿Cómo acepto una política corporativa?',
        respuesta:
          'Menú → Políticas → abrí la pendiente → leé el contenido → tocá Acepto. Queda registrado con fecha y versión.',
        keywords: ['politicas', 'acuse', 'aceptar'],
        orden: 40,
        status: 'published',
        audience: helpAudience,
        authorName: 'Legal',
        publishedAt: new Date(),
        revisadoEn: new Date(),
      },
    ])
    for (const f of faqs) {
      await syncKbSource('faq', f)
      await f.save()
    }
  }
  if ((await Tutorial.countDocuments({ tenantId: tenant._id })) === 0) {
    const tutorials = await Tutorial.create([
      {
        tenantId: tenant._id,
        category: 'Primeros pasos',
        titulo: `Primeros pasos en ${brand}`,
        descripcion: 'Cómo usar el muro, solicitudes, Ayuda y Políticas.',
        moduloRelacionado: 'muro',
        keywords: ['onboarding', 'primeros pasos'],
        orden: 10,
        status: 'published',
        showOnFirstLogin: true,
        audience: helpAudience,
        authorName: brand,
        publishedAt: new Date(),
        steps: [
          {
            orden: 1,
            titulo: 'Abrí el menú',
            cuerpo: 'Tocá Menú abajo a la derecha. Ahí están Ayuda, Políticas, Documentos y más.',
            mediaType: 'none',
          },
          {
            orden: 2,
            titulo: 'Mirá el muro',
            cuerpo: 'En Home ves las novedades de tu comunidad. Reaccioná y comentá cuando esté habilitado.',
            mediaType: 'none',
          },
          {
            orden: 3,
            titulo: 'Pedí lo que necesites',
            cuerpo: 'En Mis solicitudes cargás vacaciones, permisos u otros trámites.',
            mediaType: 'none',
          },
        ],
      },
      {
        tenantId: tenant._id,
        category: 'Encuestas',
        titulo: 'Responder una encuesta',
        descripcion: 'Completá las encuestas pendientes de tu comunidad.',
        moduloRelacionado: 'encuestas',
        keywords: ['encuesta', 'responder'],
        orden: 20,
        status: 'published',
        showOnFirstLogin: false,
        audience: helpAudience,
        authorName: brand,
        publishedAt: new Date(),
        steps: [
          {
            orden: 1,
            titulo: 'Entrá a Encuestas',
            cuerpo: 'Desde el menú o un aviso. Las pendientes aparecen arriba.',
            mediaType: 'none',
          },
          {
            orden: 2,
            titulo: 'Respondé y enviá',
            cuerpo: 'Completá las preguntas obligatorias y confirmá el envío.',
            mediaType: 'none',
          },
        ],
      },
    ])
    for (const t of tutorials) {
      await syncKbSource('tutorial', t)
      await t.save()
    }
  }
  if ((await Policy.countDocuments({ tenantId: tenant._id })) === 0) {
    const policies = await Policy.create([
      {
        tenantId: tenant._id,
        codigo: 'ETH-01',
        titulo: 'Código de ética',
        resumen: 'Principios de conducta en la comunidad.',
        cuerpo: `Código de ética — ${brand}\n\n1. Respeto mutuo.\n2. Uso responsable de la información.\n3. Cumplimiento de normas internas.\n\nAl aceptar confirmás haber leído esta versión.`,
        category: 'Ética',
        keywords: ['etica', 'conducta'],
        version: '1',
        status: 'published',
        requiresAck: true,
        mandatory: true,
        audience: helpAudience,
        authorName: 'Legal',
        publishedAt: new Date(),
        acks: [],
      },
      {
        tenantId: tenant._id,
        codigo: 'SEC-01',
        titulo: 'Uso responsable de Connectia',
        resumen: 'Credenciales, datos y dispositivos del equipo.',
        cuerpo:
          `Política de uso de Connectia — ${brand}\n\n` +
          '1. No compartas tu usuario ni contraseña.\n' +
          '2. Bloqueá el dispositivo al alejarte.\n' +
          '3. Reportá incidentes a TI o a tu gestor.\n\n' +
          'Una nueva versión de esta política pide re-aceptación.',
        category: 'Seguridad',
        keywords: ['seguridad', 'password', 'datos'],
        version: '1',
        status: 'published',
        requiresAck: true,
        mandatory: false,
        audience: helpAudience,
        authorName: 'TI',
        publishedAt: new Date(),
        acks: [],
      },
    ])
    for (const p of policies) {
      await syncKbSource('policy', p)
      await p.save()
    }
  }

  const hubSeed = [
    { titulo: 'Muro', subtitulo: 'Feed interno', url: '/muro', category: 'Connectia', icon: 'home', order: 5, openMode: 'internal', color: profile.primary },
    { titulo: 'Mis solicitudes', subtitulo: 'Trámites y tickets', url: '/solicitudes', category: 'Connectia', icon: 'inbox', order: 6, openMode: 'internal', color: '#0369A1' },
    { titulo: 'Encuestas', subtitulo: 'Pulse y campañas', url: '/encuestas', category: 'Connectia', icon: 'clipboard', order: 7, openMode: 'internal', color: '#7C3AED' },
    { titulo: 'Documentos', subtitulo: 'Archivos de la comunidad', url: '/docs', category: 'Connectia', icon: 'file', order: 8, openMode: 'internal', color: '#B45309' },
    { titulo: 'Ayuda', subtitulo: 'FAQs y tutoriales', url: '/ayuda', category: 'Connectia', icon: 'help', order: 9, openMode: 'internal', color: '#0F766E' },
    { titulo: 'Políticas', subtitulo: 'Acuse de lectura', url: '/politicas', category: 'Connectia', icon: 'shield', order: 9.5, openMode: 'internal', color: '#334155' },
    { titulo: 'Mesa de ayuda IT', subtitulo: 'Tickets de sistemas', url: `https://example.com/${codeSlug}/helpdesk`, category: 'Sistemas', icon: 'chat', order: 10, openMode: 'external', color: '#0E7490' },
    { titulo: 'VPN / accesos', subtitulo: 'Guía de conexión', url: `https://example.com/${codeSlug}/vpn`, category: 'Sistemas', icon: 'grid', order: 11, openMode: 'external', color: '#334155' },
    { titulo: 'Recibos de sueldo', subtitulo: 'Consulta y descarga', url: `https://example.com/${codeSlug}/recibos`, category: 'People', icon: 'file', order: 20, openMode: 'external', color: '#BE185D' },
    { titulo: 'Vacaciones', subtitulo: 'Saldo y pedidos', url: `https://example.com/${codeSlug}/vacaciones`, category: 'People', icon: 'calendar', order: 21, openMode: 'external', color: '#059669' },
    { titulo: 'Beneficios', subtitulo: 'Club colaboradores', url: `https://example.com/${codeSlug}/beneficios`, category: 'People', icon: 'grid', order: 22, openMode: 'external', color: '#C2410C' },
    { titulo: 'Capacitaciones', subtitulo: 'LMS interno', url: `https://example.com/${codeSlug}/learning`, category: 'People', icon: 'clipboard', order: 23, openMode: 'external', color: '#4F46E5' },
  ]

  for (const item of hubSeed) {
    await HubLink.findOneAndUpdate(
      { tenantId: tenant._id, titulo: item.titulo },
      {
        ...item,
        kind: item.openMode === 'internal' ? 'route' : 'url',
        target: item.url,
        params: {},
        tenantId: tenant._id,
        activo: true,
        iconSize: 'md',
        featured: false,
        visibleUntil: new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999)),
        audience: { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true, new: true },
    )
  }

  for (const titulo of hubSeed.filter((h) => h.category === 'Connectia').slice(0, 3).map((h) => h.titulo)) {
    await HubLink.updateOne({ tenantId: tenant._id, titulo }, { $set: { featured: true } })
  }

  for (const c of [
    { nombre: 'Connectia', orden: 10, iconSize: 'md' },
    { nombre: 'Sistemas', orden: 20, iconSize: 'md' },
    { nombre: 'People', orden: 30, iconSize: 'md' },
  ]) {
    await HubCategory.findOneAndUpdate(
      { tenantId: tenant._id, nombre: c.nombre },
      { ...c, tenantId: tenant._id, activo: true },
      { upsert: true },
    )
  }

  await seedHubKindsForTenant(tenant)

  const bienvenida = postsByTitulo[profile.welcomeTitle]
  const beneficio = postsByTitulo[`Beneficio del mes — equipo ${brand}`]
  if (bienvenida && juan) {
    await SavedPost.findOneAndUpdate(
      { userId: juan._id, postId: bienvenida._id },
      { tenantId: tenant._id, userId: juan._id, postId: bienvenida._id },
      { upsert: true },
    )
  }
  if (beneficio && sofia) {
    await SavedPost.findOneAndUpdate(
      { userId: sofia._id, postId: beneficio._id },
      { tenantId: tenant._id, userId: sofia._id, postId: beneficio._id },
      { upsert: true },
    )
  }

  await seedNotificationsForTenant({
    tenant,
    members: [juan, sofia, carlos, usersByUsuario['maria.lopez']].filter(Boolean),
    adminUser: admin,
    survey,
    post: beneficio || bienvenida || (await Post.findOne({ tenantId: tenant._id, status: 'published' })),
    brand,
  })

  await seedGreetingsForTenant({ tenantId: tenant._id, brandName: brand })

  const directorySeed = await seedDirectoryForTenant(tenant._id, { brandName: brand })
  const benefitsSeed = await seedBenefitsForTenant(tenant._id, { brandName: brand })

  // Saldo demo para miembros (idempotente por usuario)
  for (const u of [juan, sofia, carlos, usersByUsuario['maria.lopez']].filter(Boolean)) {
    await postLedgerEntry({
      tenantId: tenant._id,
      userId: u._id,
      type: 'credit',
      amount: 1500,
      concept: 'Saldo inicial demo',
      idempotencyKey: `seed:wallet:credit:${empCodigo}:${u.usuario}`,
      createdBy: admin?._id,
    })
  }

  const { ensureDefaultPointsRules } = await import('../lib/pointsRules.js')
  await ensureDefaultPointsRules(tenant._id, { createdBy: admin?._id })

  const { seedOla36ForTenant } = await import('../lib/ola36Seed.js')
  const ola36 = await seedOla36ForTenant(tenant._id, {
    brandName: brand,
    createdBy: admin?._id,
    ensureSpaces: true,
  })
  console.log(
    `[seedGeneric] Ola 36: plantillas +${ola36.templates} · NL ${ola36.newsletterRules} · clientes +${ola36.clients} · pubs +${ola36.posts} · espacios +${ola36.spaceExtras}`,
  )

  const { seedPedidosForTenant, tenantWantsPedidos } = await import('../lib/pedidosSeed.js')
  if (tenantWantsPedidos(tenant)) {
    const ped = await seedPedidosForTenant(tenant, {
      force: false,
      brandName: brand,
    })
    console.log(
      `[seedGeneric] Ola 25: cats +${ped.categoriesCreated} · arts +${ped.articlesCreated} · alarma ${ped.alarmCreated ? 'sí' : '—'}`,
    )
  } else {
    console.log('[seedGeneric] Ola 25 omitida (pack sin módulo pedidos; activar pack todo o cap pedidos)')
  }

  const { seedServiciosForTenant, tenantWantsServicios } = await import('../lib/serviciosSeed.js')
  if (tenantWantsServicios(tenant)) {
    const srv = await seedServiciosForTenant(tenant, { force: false })
    console.log(
      `[seedGeneric] Ola 43: áreas +${srv.areasCreated} · ítems +${srv.itemsCreated} · req +${srv.requestsCreated}`,
    )
  } else {
    console.log('[seedGeneric] Ola 43 omitida (pack sin módulo servicios)')
  }

  console.log(`[seedGeneric] ${empCodigo} listo — admin ${adminUsuario} / ${DEFAULT_SEED_PASSWORD}`)

  return {
    empCodigo,
    brandName: brand,
    knownCompany: profile.knownCompany,
    industry: profile.industry,
    directory: directorySeed,
    benefits: benefitsSeed,
    users: userDefs.map((u) => ({ usuario: u.usuario, idExterno: u.idExterno, roles: u.roles })),
    credentials: {
      empCodigo,
      adminUsuario,
      password: DEFAULT_SEED_PASSWORD,
      sampleUsers: ['comunicacion', 'rrhh.gestor', 'juan.perez', 'sofia.garcia'],
    },
  }
}
