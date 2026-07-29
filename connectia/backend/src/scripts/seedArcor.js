/**
 * Seed del tenant ARCOR — cliente comercial de ejemplo.
 * Uso: invocado desde seed.js vía seedArcorTenant(passwordHash)
 */
import { Tenant } from '../models/Tenant.js'
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
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { SavedPost } from '../models/SavedPost.js'
import { AppNotification } from '../models/AppNotification.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'
import { defaultPostsConfig } from '../lib/postsConfig.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WORKFLOW_USE_CASE_EXAMPLES } from '../services/workflowAi.js'
import { seedHubKindsForTenant } from './seedHubKinds.js'
import { seedNotificationsForTenant } from './seedNotifications.js'
import { seedGreetingsForTenant } from './seedGreetings.js'
import { seedBenefitsForTenant } from '../lib/benefitsSeed.js'
import { postLedgerEntry } from '../lib/walletService.js'
import { Benefit, BenefitPartnerLink } from '../models/Benefit.js'
import { seedLicenciasForTenant } from './seedLicencias.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { HrCatalog } from '../models/HrCatalog.js'
import { OnboardingTemplate } from '../models/OnboardingTemplate.js'
import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { seedHrCatalogsForTenant } from '../lib/hrCatalog.js'
import { seedFromUser } from '../lib/employeeLegajo.js'
import { snapshotMilestonesFromTemplate, originKeyFor } from '../lib/onboarding.js'
import { ensureOla19MenuItems } from '../lib/ensureOla19Menu.js'
import { seedEventsForTenant } from './seedEvents.js'

const EMP = 'ARCOR'
const PDF_DEMO = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
/** Logo oficial (Wikimedia) — wordmark rojo; splash usa fondo claro para contraste */
const ARCOR_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Grupo_arcor_logo.svg'
const ARCOR_LOGIN_BG =
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80'

const ARCOR_BRANDING = {
  primary: '#E30613',
  secondary: '#8B0000',
  logoUrl: ARCOR_LOGO,
  loginBgUrl: ARCOR_LOGIN_BG,
  splashTitle: 'Arcor',
  splashSubtitle: 'Comunidad interna',
  splashDurationSec: 2,
  splash: {
    enabledPreLogin: true,
    enabledPostLogin: true,
    durationSec: 2,
    title: 'Arcor',
    subtitle: 'Tu comunidad: información, trámites y equipo.',
    logoUrl: ARCOR_LOGO,
    bgColor: '#FFFFFF',
    bgImageUrl: '',
    textColor: '#E30613',
    showLogo: true,
    showTitle: true,
    showSubtitle: true,
  },
}

const MENU = [
  { key: 'muro', label: 'Publicaciones', route: '/muro', icon: 'home', order: 10, channel: 'u' },
  { key: 'mis-publicaciones', label: 'Mis publicaciones', route: '/muro/mias', icon: 'inbox', order: 12, channel: 'u' },
  { key: 'guardados', label: 'Mis guardados', route: '/guardados', icon: 'bookmark', order: 15, channel: 'u' },
  { key: 'solicitudes', label: 'Mis solicitudes', route: '/solicitudes', icon: 'inbox', order: 20, channel: 'u' },
  { key: 'licencias', label: 'Vacaciones y permisos', route: '/licencias', icon: 'clipboard', order: 21, channel: 'u' },
  { key: 'ausencias', label: 'Ausencias', route: '/ausencias', icon: 'list', order: 21.5, channel: 'u' },
  { key: 'aprobaciones', label: 'Aprobaciones', route: '/aprobaciones', icon: 'check', order: 22, channel: 'u' },
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 30, channel: 'u' },
  { key: 'agenda', label: 'Agenda', route: '/agenda', icon: 'calendar', order: 32, channel: 'u' },
  { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file', order: 40, channel: 'u' },
  { key: 'mi-legajo', label: 'Mi legajo', route: '/mi-legajo', icon: 'file', order: 42, channel: 'u' },
  { key: 'bienvenida', label: 'Bienvenida', route: '/bienvenida', icon: 'sparkles', order: 43, channel: 'u' },
  { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 50, channel: 'u' },
  { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 52, channel: 'u' },
  { key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell', order: 55, channel: 'u' },
  { key: 'chat', label: 'Chat', route: '/chat', icon: 'chat', order: 60, channel: 'u' },
  { key: 'admin.home', label: 'Dashboard', route: '/', icon: 'home', order: 10, channel: 'a' },
  { key: 'admin.users', label: 'Usuarios', route: '/usuarios', icon: 'users', order: 15, channel: 'a' },
  { key: 'admin.legajos', label: 'Legajos RRHH', route: '/legajos', icon: 'file', order: 15.5, channel: 'a' },
  { key: 'admin.hrcatalog', label: 'Catálogos RRHH', route: '/catalogos-rrhh', icon: 'tag', order: 15.6, channel: 'a' },
  { key: 'admin.onboarding', label: 'Onboarding y egreso', route: '/onboarding', icon: 'sparkles', order: 15.7, channel: 'a' },
  { key: 'admin.org', label: 'Organización', route: '/organizacion', icon: 'building', order: 16, channel: 'a' },
  { key: 'admin.requests', label: 'Bandeja', route: '/solicitudes', icon: 'inbox', order: 18, channel: 'a' },
  { key: 'admin.reqsend', label: 'Pedir datos a un grupo', route: '/enviar-solicitud', icon: 'send', order: 18.5, channel: 'a' },
  { key: 'admin.reqtypes', label: 'Plantillas', route: '/tipos-solicitud', icon: 'tag', order: 19, channel: 'a' },
  { key: 'admin.reqstates', label: 'Estados solicitud', route: '/estados-solicitud', icon: 'flag', order: 19.5, channel: 'a' },
  { key: 'admin.licencias', label: 'Licencias', route: '/licencias', icon: 'clipboard', order: 19.6, channel: 'a' },
  { key: 'admin.tipos-licencia', label: 'Tipos de licencia', route: '/tipos-licencia', icon: 'tag', order: 19.7, channel: 'a' },
  { key: 'admin.feriados', label: 'Feriados', route: '/feriados', icon: 'calendar', order: 19.55, channel: 'a' },
  { key: 'admin.ausentismos', label: 'Ausentismos', route: '/ausentismos', icon: 'list', order: 19.8, channel: 'a' },
  { key: 'admin.pubs', label: 'Publicaciones', route: '/publicaciones', icon: 'megaphone', order: 40, channel: 'a' },
  { key: 'admin.engagement', label: 'Emociones', route: '/emociones', icon: 'heart', order: 41, channel: 'a' },
  { key: 'admin.surveys', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 45, channel: 'a' },
  { key: 'admin.notifications', label: 'Notificaciones', route: '/notificaciones', icon: 'bell', order: 45.5, channel: 'a' },
  { key: 'admin.comentarios', label: 'Moderación de comentarios', route: '/moderacion-comentarios', icon: 'shield', order: 45.6, channel: 'a' },
  { key: 'admin.saludos', label: 'Saludos automáticos', route: '/saludos', icon: 'heart', order: 45.7, channel: 'a' },
  { key: 'admin.workflows', label: 'Flujos de Aprobación', route: '/workflows', icon: 'flow', order: 45.8, channel: 'a' },
  { key: 'admin.docs', label: 'Documentos', route: '/documentos', icon: 'file', order: 46, channel: 'a' },
  { key: 'admin.directorio', label: 'Datos útiles', route: '/directorio', icon: 'grid', order: 46.1, channel: 'a' },
  { key: 'admin.eventos', label: 'Eventos', route: '/eventos', icon: 'calendar', order: 46.2, channel: 'a' },
  { key: 'admin.beneficios', label: 'Beneficios y billetera', route: '/beneficios', icon: 'gift', order: 46.3, channel: 'a' },
  { key: 'admin.hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 47, channel: 'a' },
  { key: 'admin.tenants', label: 'Comunidad', route: '/comunidad', icon: 'building', order: 50, channel: 'a' },
  { key: 'admin.menu', label: 'Menú dinámico', route: '/menu', icon: 'menu', order: 55, channel: 'a' },
]

/** tipoKey de los ejemplos canónicos → keys reales de plantillas ARCOR */
const ARCOR_WORKFLOW_TIPO_MAP = {
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

/**
 * @param {string} passwordHash
 */
export async function seedArcorTenant(passwordHash) {
  let tenant = await Tenant.findOne({ empCodigo: EMP })
  if (!tenant) {
    tenant = await Tenant.create({
      empCodigo: EMP,
      nombre: 'Arcor',
      allowDesktop: true,
      branding: { ...ARCOR_BRANDING, splash: { ...ARCOR_BRANDING.splash } },
      loginMethods: ['password', 'id'],
      capabilities: ['muro', 'solicitudes', 'licencias', 'ausentismos', 'encuestas', 'docs', 'hub', 'chat', 'menu.dynamic', 'beneficios', 'beneficios.billetera', 'beneficios.partners'],
      timezone: 'America/Argentina/Buenos_Aires',
      uxShell: 'connectia',
      ugc: { enabled: true, requireApproval: true },
      peopleCare: { enabled: true, label: 'Mi legajo' },
    })
    console.log('Tenant ARCOR creado')
  } else {
    tenant.nombre = 'Arcor'
    tenant.branding = {
      ...tenant.branding?.toObject?.() ?? tenant.branding,
      ...ARCOR_BRANDING,
      splash: { ...ARCOR_BRANDING.splash },
    }
    tenant.loginMethods = ['password', 'id']
    tenant.capabilities = [
      'muro',
      'solicitudes',
      'licencias',
      'ausentismos',
      'encuestas',
      'docs',
      'hub',
      'chat',
      'menu.dynamic',
      'beneficios',
      'beneficios.billetera',
      'beneficios.partners',
    ]
    tenant.ugc = { enabled: true, requireApproval: true }
    tenant.peopleCare = { enabled: true, label: 'Mi legajo' }
    await tenant.save()
    console.log('Tenant ARCOR ya existe — branding/capabilities/ugc actualizados')
  }

  const areaDefs = [
    { key: 'rrhh', nombre: 'RRHH', descripcion: 'People & Culture Arcor', orden: 10 },
    { key: 'produccion', nombre: 'Producción', descripcion: 'Plantas y operaciones', orden: 20 },
    { key: 'comercial', nombre: 'Comercial', descripcion: 'Ventas y trade', orden: 30 },
    { key: 'calidad', nombre: 'Calidad', descripcion: 'Aseguramiento y food safety', orden: 40 },
    { key: 'logistica', nombre: 'Logística', descripcion: 'Distribución y abastecimiento', orden: 50 },
    { key: 'it', nombre: 'IT', descripcion: 'Sistemas y transformación digital', orden: 60 },
    { key: 'marketing', nombre: 'Marketing', descripcion: 'Marcas y comunicación de producto', orden: 70 },
  ]
  const areaByKey = {}
  for (const a of areaDefs) {
    areaByKey[a.key] = await OrgArea.findOneAndUpdate(
      { tenantId: tenant._id, key: a.key },
      { ...a, tenantId: tenant._id, activo: true },
      { upsert: true, new: true },
    )
  }

  const groupDefs = [
    { key: 'liderazgo', nombre: 'Liderazgo', descripcion: 'Jefes, coordinadores y gerentes', orden: 10 },
    { key: 'planta_arroyito', nombre: 'Planta Arroyito', descripcion: 'Operarios y staff Arroyito', orden: 20 },
    { key: 'planta_cordoba', nombre: 'Planta Córdoba', descripcion: 'Operarios y staff Córdoba', orden: 30 },
    { key: 'fuerza_ventas', nombre: 'Fuerza de ventas', descripcion: 'Vendedores y supervisores de campo', orden: 40 },
    { key: 'corporativo', nombre: 'Corporativo BA', descripcion: 'Oficinas Buenos Aires', orden: 50 },
  ]
  const groupByKey = {}
  for (const g of groupDefs) {
    groupByKey[g.key] = await UserGroup.findOneAndUpdate(
      { tenantId: tenant._id, key: g.key },
      { ...g, tenantId: tenant._id, activo: true },
      { upsert: true, new: true },
    )
  }
  console.log('Áreas y grupos ARCOR OK')

  const userDefs = [
    {
      usuario: 'admin.arcor',
      idExterno: 'A1000',
      nombre: 'Martín',
      apellido: 'Admin',
      email: 'admin@arcor.connectia.local',
      roles: ['member', 'admin'],
      capabilities: [],
      areaKey: 'rrhh',
      groupKeys: ['liderazgo', 'corporativo'],
    },
    {
      usuario: 'comunicacion',
      idExterno: 'A1001',
      nombre: 'Valentina',
      apellido: 'Ríos',
      email: 'comunicacion@arcor.connectia.local',
      roles: ['member'],
      capabilities: [
        'admin.publicaciones',
        'admin.encuestas',
        'admin.documentos',
        'admin.hub',
        'admin.workflows',
        'admin.beneficios',
      ],
      areaKey: 'marketing',
      groupKeys: ['corporativo', 'liderazgo'],
    },
    {
      usuario: 'rrhh.gestor',
      idExterno: 'A1002',
      nombre: 'Patricia',
      apellido: 'Gómez',
      email: 'rrhh@arcor.connectia.local',
      roles: ['member'],
      capabilities: [
        'admin.solicitudes',
        'admin.tipos-solicitud',
        'admin.usuarios',
        'admin.organizacion',
        'admin.workflows',
        'admin.beneficios',
        'admin.licencias',
        'admin.ausentismos',
        'admin.legajos',
        'admin.onboarding',
        'admin.encuestas',
      ],
      areaKey: 'rrhh',
      groupKeys: ['corporativo', 'liderazgo'],
    },
    {
      usuario: 'maria.lopez',
      idExterno: 'A2001',
      nombre: 'María',
      apellido: 'López',
      email: 'maria.lopez@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'rrhh',
      groupKeys: ['corporativo'],
    },
    {
      usuario: 'juan.perez',
      idExterno: 'A2002',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'produccion',
      groupKeys: ['planta_arroyito'],
    },
    {
      usuario: 'sofia.garcia',
      idExterno: 'A2003',
      nombre: 'Sofía',
      apellido: 'García',
      email: 'sofia.garcia@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'comercial',
      groupKeys: ['fuerza_ventas'],
    },
    {
      usuario: 'diego.fernandez',
      idExterno: 'A2004',
      nombre: 'Diego',
      apellido: 'Fernández',
      email: 'diego.fernandez@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'calidad',
      groupKeys: ['planta_cordoba', 'liderazgo'],
    },
    {
      usuario: 'laura.martinez',
      idExterno: 'A2005',
      nombre: 'Laura',
      apellido: 'Martínez',
      email: 'laura.martinez@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'logistica',
      groupKeys: ['planta_arroyito'],
    },
    {
      usuario: 'carlos.ruiz',
      idExterno: 'A2006',
      nombre: 'Carlos',
      apellido: 'Ruiz',
      email: 'carlos.ruiz@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'it',
      groupKeys: ['corporativo'],
    },
    {
      usuario: 'ana.torres',
      idExterno: 'A2007',
      nombre: 'Ana',
      apellido: 'Torres',
      email: 'ana.torres@arcor.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'marketing',
      groupKeys: ['corporativo'],
    },
  ]

  const usersByUsuario = {}
  for (const def of userDefs) {
    const u = await upsertUser(tenant._id, passwordHash, def)
    u.areaId = areaByKey[def.areaKey]._id
    u.groupIds = def.groupKeys.map((k) => groupByKey[k]._id)
    await u.save()
    usersByUsuario[def.usuario] = u
  }
  console.log(`Usuarios ARCOR: ${userDefs.length}`)

  const admin = usersByUsuario['admin.arcor']
  const comunicacion = usersByUsuario.comunicacion
  const rrhhGestor = usersByUsuario['rrhh.gestor']
  const juan = usersByUsuario['juan.perez']
  const sofia = usersByUsuario['sofia.garcia']
  const diego = usersByUsuario['diego.fernandez']
  const laura = usersByUsuario['laura.martinez']
  const carlos = usersByUsuario['carlos.ruiz']

  for (const item of MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }

  for (const ex of WORKFLOW_USE_CASE_EXAMPLES) {
    const mappedTipo = ARCOR_WORKFLOW_TIPO_MAP[ex.id]
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
  console.log(`Workflows ARCOR: ${WORKFLOW_USE_CASE_EXAMPLES.length} ejemplos (tipoKey alineado a plantillas)`)

  const seedPosts = [
    {
      titulo: 'Bienvenida a la comunidad Arcor',
      cuerpo:
        'Este es el muro interno de Arcor. Acá vas a encontrar comunicados de planta, lanzamientos de marca, ' +
        'beneficios y novedades de People & Culture.\nUsá Solicitudes para trámites y Enlaces para llegar a SAP, recibos y más.',
      tipo: 'noticia',
      layout: 'banner',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
      pinned: true,
      priority: 100,
      hoursAgo: 2,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: comunicacion,
    },
    {
      titulo: 'Lanzamiento: campaña Rocklets Verano',
      cuerpo:
        'Arranca la campaña de verano Rocklets en puntos de venta del Interior.\n' +
        'Fuerza de ventas: revisá el kit de trade en Enlaces → Marketing y confirmá cobertura en tu zona.',
      tipo: 'noticia',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=1000&q=80',
      pinned: false,
      priority: 90,
      hoursAgo: 8,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.comercial._id, areaByKey.marketing._id],
        groupIds: [groupByKey.fuerza_ventas._id],
      },
      author: comunicacion,
    },
    {
      titulo: 'Seguridad industrial: checklist turno noche',
      cuerpo:
        'Recordatorio para Planta Arroyito: completar el checklist de EPP y bloqueo de energía antes del turno noche.\n' +
        'Ante desvíos, abrir solicitud de tipo «Calidad / no conformidad».',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=80',
      pinned: false,
      priority: 85,
      hoursAgo: 14,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.produccion._id, areaByKey.calidad._id],
        groupIds: [groupByKey.planta_arroyito._id],
      },
      author: diego,
    },
    {
      titulo: 'Beneficio del mes: Club Arcor+',
      cuerpo:
        'Este mes sumamos descuentos en gimnasios y farmacias adheridas para colaboradores activos.\n' +
        'Pedí tu código en Accesos → Beneficios o por solicitud a RRHH.',
      tipo: 'beneficio',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=900&q=80',
      pinned: false,
      priority: 70,
      hoursAgo: 30,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: rrhhGestor,
    },
    {
      titulo: 'Día de la Familia — Planta Arroyito',
      cuerpo:
        'El sábado 10:00 abrimos las puertas de Planta Arroyito para familias.\n' +
        'Confirmá asistencia en Encuestas. Cupos limitados por turno.',
      tipo: 'evento',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1100&q=80',
      pinned: false,
      priority: 75,
      hoursAgo: 20,
      audience: {
        mode: 'restricted',
        areaIds: [],
        groupIds: [groupByKey.planta_arroyito._id, groupByKey.liderazgo._id],
      },
      author: comunicacion,
    },
    {
      titulo: 'Nueva ruta de distribución Interior Norte',
      cuerpo:
        'Logística habilita la ruta Interior Norte con salida desde CEDIS Córdoba los martes y jueves.\n' +
        'Supervisores comerciales: actualicen pedidos antes del lunes 15 hs.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1000&q=80',
      pinned: false,
      priority: 65,
      hoursAgo: 40,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.logistica._id, areaByKey.comercial._id],
        groupIds: [],
      },
      author: laura,
    },
    {
      titulo: 'Mantenimiento SAP el domingo 02:00–06:00',
      cuerpo:
        'IT realizará ventana de mantenimiento en SAP ECC. Durante ese lapso no habrá altas de pedidos ni consulta de stock.\n' +
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
      titulo: 'Resultados Q2: marcas líderes en góndola',
      cuerpo:
        'Compartimos un resumen de performance de marcas Arcor en el segundo trimestre.\n' +
        'El detalle completo está en Documentos → Comercial.',
      tipo: 'general',
      layout: 'banner',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
      pinned: false,
      priority: 55,
      hoursAgo: 72,
      audience: {
        mode: 'restricted',
        areaIds: [],
        groupIds: [groupByKey.liderazgo._id, groupByKey.corporativo._id],
      },
      author: admin,
    },
  ]

  const now = new Date()
  let postsCreated = 0
  let postsUpdated = 0
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
      postsUpdated += 1
    } else {
      const created = await Post.create({
        tenantId: tenant._id,
        ...payload,
        reactions: { like: 5, love: 2, clap: 3 },
      })
      postsByTitulo[sp.titulo] = created
      postsCreated += 1
    }
  }
  console.log(`Publicaciones ARCOR: ${postsCreated} nuevas, ${postsUpdated} actualizadas`)

  // Demo UGC pendiente de moderación
  const ugcPendingTitulo = '¡Gran clima en planta Arroyito hoy!'
  const ugcExisting = await Post.findOne({ tenantId: tenant._id, titulo: ugcPendingTitulo, origin: 'member' })
  if (!ugcExisting) {
    await Post.create({
      tenantId: tenant._id,
      titulo: ugcPendingTitulo,
      cuerpo:
        'Equipo de turno mañana: la línea 2 arrancó impecable. Comparto la foto del equipo para el muro.\n' +
        '(Esta publicación está en revisión — seed demo UGC)',
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
        summary: 'Cumple políticas básicas (media, tono y contenido). Contenido de clima laboral positivo.',
        reasons: ['Sin señales de riesgo evidentes'],
        categories: ['ok'],
        policyFlags: [],
        error: '',
      },
    })
    console.log('UGC pendiente de demo creado (Juan Pérez)')
  }

  const ugcRiskTitulo = 'Queja por el aumento de sueldo del mes'
  const ugcRisk = await Post.findOne({ tenantId: tenant._id, titulo: ugcRiskTitulo, origin: 'member' })
  if (!ugcRisk) {
    await Post.create({
      tenantId: tenant._id,
      titulo: ugcRiskTitulo,
      cuerpo:
        'No puede ser que el aumento sea tan bajo. En WhatsApp circula un link http://bit.ly/demo-queja con más info. ' +
        'Quiero que RRHH se pronuncie YA.',
      tipo: 'general',
      layout: 'vertical',
      imageUrl: '',
      status: 'pending_review',
      publishedAt: null,
      authorId: sofia._id,
      authorName: `${sofia.nombre} ${sofia.apellido}`.trim(),
      origin: 'member',
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      reactions: { like: 0, love: 0, clap: 0 },
      moderationAi: {
        status: 'ready',
        analyzedAt: new Date(),
        provider: 'heuristic',
        model: 'rules-v2',
        risk: 'medium',
        score: 62,
        suggestedAction: 'review',
        summary: 'Incumple políticas: sin media, tema salarial sensible y enlace sospechoso.',
        reasons: [
          'Sin media (imagen/video): el muro debe ser visual',
          'tema laboral sensible (mejor canal formal)',
          'enlace externo / posible spam o phishing',
        ],
        categories: ['missing_media', 'sensitive_hr', 'spam_link'],
        policyFlags: ['missing_media', 'sensitive_hr', 'spam_link'],
        error: '',
      },
    })
    console.log('UGC de riesgo medio demo creado (Sofía García)')
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
      key: 'mantenimiento',
      nombre: 'Mantenimiento de planta',
      descripcion: 'Averías, órdenes de trabajo, utilidades',
      area: 'Producción',
      orden: 20,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.produccion._id, areaByKey.calidad._id, areaByKey.logistica._id],
        groupIds: [groupByKey.planta_arroyito._id, groupByKey.planta_cordoba._id],
      },
      campos: [
        {
          key: 'planta',
          label: 'Planta',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Arroyito', 'Córdoba', 'Otra'],
        },
        { key: 'linea', label: 'Línea / sector', tipo: 'text', required: true, orden: 20, placeholder: 'Ej. Línea 3 chocolates' },
        {
          key: 'prioridad',
          label: 'Prioridad',
          tipo: 'select',
          required: true,
          orden: 30,
          opciones: ['Baja', 'Media', 'Alta', 'Parada de línea'],
        },
        { key: 'detalle', label: 'Descripción del desvío', tipo: 'textarea', required: true, orden: 40 },
      ],
    },
    {
      key: 'calidad',
      nombre: 'Calidad / no conformidad',
      descripcion: 'Desvíos de calidad, food safety, reclamos',
      area: 'Calidad',
      orden: 30,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.calidad._id, areaByKey.produccion._id],
        groupIds: [],
      },
      campos: [
        {
          key: 'tipo_desvio',
          label: 'Tipo de desvío',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Producto no conforme', 'Higiene', 'Alérgenos', 'Reclamo cliente', 'Otro'],
        },
        { key: 'lote', label: 'Lote / OP', tipo: 'text', required: false, orden: 20 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'comercial',
      nombre: 'Soporte comercial',
      descripcion: 'Pedidos, precios, trade y cobertura',
      area: 'Comercial',
      orden: 40,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.comercial._id, areaByKey.marketing._id],
        groupIds: [groupByKey.fuerza_ventas._id],
      },
      campos: [
        {
          key: 'tema',
          label: 'Tema',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Pedido bloqueado', 'Lista de precios', 'Material POP', 'Cobertura PDV', 'Otro'],
        },
        { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', required: false, orden: 20 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'sistemas',
      nombre: 'Soporte sistemas',
      descripcion: 'SAP, accesos, notebooks, VPN',
      area: 'IT',
      orden: 50,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', required: true, orden: 10, placeholder: 'Ej. SAP, correo, VPN' },
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
  ]

  const typesByKey = {}
  for (const t of typeDefs) {
    const doc = await RequestType.findOneAndUpdate(
      { tenantId: tenant._id, key: t.key },
      {
        ...t,
        tenantId: tenant._id,
        activo: true,
        audience: t.audience || { mode: 'all', areaIds: [], groupIds: [] },
      },
      { upsert: true, new: true },
    )
    typesByKey[t.key] = doc
  }
  console.log('Tipos de solicitud ARCOR OK')

  tenant.solicitudesConfig = defaultSolicitudesConfig()
  tenant.postsConfig = defaultPostsConfig()
  tenant.ugc = { enabled: true, requireApproval: true }
  await tenant.save()
  console.log('UGC ARCOR habilitado (con moderación)')

  const reqCount = await Request.countDocuments({ tenantId: tenant._id })
  if (reqCount === 0) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const reqSeeds = [
      {
        n: '0001',
        tipoKey: 'rrhh',
        titulo: 'Consulta saldo de vacaciones 2026',
        cuerpo: 'Hola People, ¿cuántos días me quedan pendientes para tomar en agosto?',
        estado: 'abierta',
        requester: juan,
        camposValores: [
          { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Vacaciones' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Necesito planificar franco de agosto.' },
        ],
        messages: [
          {
            texto: 'Hola People, ¿cuántos días me quedan pendientes para tomar en agosto?',
            authorId: juan._id,
            authorName: `${juan.nombre} ${juan.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0002',
        tipoKey: 'mantenimiento',
        titulo: 'Parada intermitente en Línea 3 — chocolates',
        cuerpo: 'La cinta transportadora frena cada ~20 min. Impacta throughput del turno mañana.',
        estado: 'en_proceso',
        requester: juan,
        camposValores: [
          { key: 'planta', label: 'Planta', tipo: 'select', value: 'Arroyito' },
          { key: 'linea', label: 'Línea / sector', tipo: 'text', value: 'Línea 3 chocolates' },
          { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Parada de línea' },
          { key: 'detalle', label: 'Descripción del desvío', tipo: 'textarea', value: 'Freno intermitente en cinta.' },
        ],
        messages: [
          {
            texto: 'La cinta transportadora frena cada ~20 min.',
            authorId: juan._id,
            authorName: `${juan.nombre} ${juan.apellido}`,
            isAdmin: false,
            interno: false,
          },
          {
            texto: 'Tomamos el caso. Mantenimiento va en 30 minutos.',
            authorId: rrhhGestor._id,
            authorName: `${rrhhGestor.nombre} ${rrhhGestor.apellido}`,
            isAdmin: true,
            interno: false,
          },
        ],
      },
      {
        n: '0003',
        tipoKey: 'calidad',
        titulo: 'Desvío de peso en lote OP-45821',
        cuerpo: 'Muestreo detectó sobremesa fuera de tolerancia en 3 unidades del lote OP-45821.',
        estado: 'abierta',
        requester: diego,
        camposValores: [
          { key: 'tipo_desvio', label: 'Tipo de desvío', tipo: 'select', value: 'Producto no conforme' },
          { key: 'lote', label: 'Lote / OP', tipo: 'text', value: 'OP-45821' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Sobremesa fuera de tolerancia en 3 unidades.' },
        ],
        messages: [
          {
            texto: 'Muestreo detectó sobremesa fuera de tolerancia en 3 unidades.',
            authorId: diego._id,
            authorName: `${diego.nombre} ${diego.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0004',
        tipoKey: 'comercial',
        titulo: 'Pedido bloqueado — cliente Mayorista Norte',
        cuerpo: 'El pedido #88421 quedó bloqueado por crédito. Necesito desbloqueo urgente para entrega del jueves.',
        estado: 'abierta',
        requester: sofia,
        camposValores: [
          { key: 'tema', label: 'Tema', tipo: 'select', value: 'Pedido bloqueado' },
          { key: 'cliente', label: 'Cliente / PDV', tipo: 'text', value: 'Mayorista Norte' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Pedido #88421 bloqueado por crédito.' },
        ],
        messages: [
          {
            texto: 'Pedido #88421 bloqueado por crédito. Entrega jueves.',
            authorId: sofia._id,
            authorName: `${sofia.nombre} ${sofia.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0005',
        tipoKey: 'sistemas',
        titulo: 'Sin acceso a VPN desde notebook de planta',
        cuerpo: 'No puedo conectar a la VPN corporativa desde el notebook asignado en Arroyito.',
        estado: 'cerrada',
        requester: carlos,
        camposValores: [
          { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'VPN' },
          { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
          { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: true },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Error de certificado al conectar.' },
        ],
        messages: [
          {
            texto: 'No puedo conectar a la VPN desde Arroyito.',
            authorId: carlos._id,
            authorName: `${carlos.nombre} ${carlos.apellido}`,
            isAdmin: false,
            interno: false,
          },
          {
            texto: 'Renovamos el certificado. Probá de nuevo y avisanos.',
            authorId: admin._id,
            authorName: `${admin.nombre} ${admin.apellido}`,
            isAdmin: true,
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
    console.log(`Solicitudes ARCOR creadas: ${reqSeeds.length}`)
  } else {
    console.log(`Solicitudes ARCOR ya existen (${reqCount})`)
  }

  let survey = await Survey.findOne({ tenantId: tenant._id, titulo: 'Clima y seguridad — pulse Arcor' })
  if (!survey) {
    const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
    survey = await Survey.create({
      tenantId: tenant._id,
      titulo: 'Clima y seguridad — pulse Arcor',
      descripcion:
        'Encuesta trimestral de clima y percepción de seguridad en planta. Tus respuestas ayudan a priorizar acciones.',
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
          texto: '¿Qué tan satisfecho/a estás con la comunicación interna de Arcor?',
          tipo: 'rating',
          required: true,
          grupo: 'Comunicación',
          opciones: [],
        },
        {
          id: 'q_seg',
          texto: '¿Sentís que en tu área se prioriza la seguridad industrial?',
          tipo: 'yesno',
          required: true,
          grupo: 'Seguridad',
          opciones: [],
        },
        {
          id: 'q_tema',
          texto: '¿Qué tema debería priorizar People & Culture este trimestre?',
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
    console.log('Encuesta ARCOR creada')
  } else {
    console.log('Encuesta ARCOR ya existe')
  }

  let surveyVentas = await Survey.findOne({ tenantId: tenant._id, titulo: 'Cobertura campaña Rocklets Verano' })
  if (!surveyVentas) {
    surveyVentas = await Survey.create({
      tenantId: tenant._id,
      titulo: 'Cobertura campaña Rocklets Verano',
      descripcion: 'Solo fuerza de ventas: confirmá si tu zona ya tiene material POP desplegado.',
      status: 'published',
      publishedAt: new Date(Date.now() - 86400000),
      version: 1,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.comercial._id],
        groupIds: [groupByKey.fuerza_ventas._id],
      },
      audienceSnapshot: {
        invitedCount: 1,
        capturedAt: new Date(),
        mode: 'restricted',
        areaIds: [areaByKey.comercial._id],
        groupIds: [groupByKey.fuerza_ventas._id],
      },
      anonymous: false,
      authorId: comunicacion._id,
      authorName: `${comunicacion.nombre} ${comunicacion.apellido}`,
      questions: [
        {
          id: 'q_pop',
          texto: '¿Ya instalaste el kit POP en tus PDV prioritarios?',
          tipo: 'yesno',
          required: true,
          grupo: 'Trade',
          opciones: [],
        },
        {
          id: 'q_obs',
          texto: 'Observaciones de campo',
          tipo: 'textarea',
          required: false,
          grupo: 'Trade',
          opciones: [],
        },
      ],
    })
    console.log('Encuesta comercial ARCOR creada')
  }

  const respDefs = [
    {
      user: juan,
      survey,
      answers: [
        { questionId: 'q_sat', value: 4 },
        { questionId: 'q_seg', value: true },
        { questionId: 'q_tema', value: 'Herramientas de trabajo' },
        { questionId: 'q_com', value: 'Mejoraríamos con más avisos de mantenimiento en el muro.' },
      ],
    },
    {
      user: sofia,
      survey,
      answers: [
        { questionId: 'q_sat', value: 5 },
        { questionId: 'q_seg', value: true },
        { questionId: 'q_tema', value: 'Beneficios' },
        { questionId: 'q_com', value: '' },
      ],
    },
    {
      user: sofia,
      survey: surveyVentas,
      answers: [
        { questionId: 'q_pop', value: true },
        { questionId: 'q_obs', value: 'PDVs del centro listos; falta Interior Sur.' },
      ],
    },
  ]
  for (const rd of respDefs) {
    if (!rd.survey) continue
    await SurveyResponse.findOneAndUpdate(
      { surveyId: rd.survey._id, userId: rd.user._id },
      {
        tenantId: tenant._id,
        surveyId: rd.survey._id,
        surveyVersion: rd.survey.version || 1,
        userId: rd.user._id,
        answers: rd.answers,
        submittedAt: new Date(),
      },
      { upsert: true },
    )
  }
  console.log('Respuestas de encuesta ARCOR OK')

  const docCount = await DocItem.countDocuments({ tenantId: tenant._id })
  if (docCount === 0) {
    await DocItem.create([
      {
        tenantId: tenant._id,
        titulo: 'Política de seguridad alimentaria',
        descripcion: 'Lineamientos HACCP y buenas prácticas de manufactura.',
        category: 'Calidad',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.calidad._id, areaByKey.produccion._id],
          groupIds: [],
        },
        authorName: 'Calidad Arcor',
        publishedAt: new Date(),
      },
      {
        tenantId: tenant._id,
        titulo: 'Código de ética y conducta',
        descripcion: 'Principios de integridad y convivencia laboral.',
        category: 'RRHH',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        authorName: 'People & Culture',
        publishedAt: new Date(Date.now() - 86400000),
      },
      {
        tenantId: tenant._id,
        titulo: 'Manual de EPP — plantas',
        descripcion: 'Equipos de protección personal por puesto en planta.',
        category: 'Producción',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.produccion._id],
          groupIds: [groupByKey.planta_arroyito._id, groupByKey.planta_cordoba._id],
        },
        authorName: 'Higiene y Seguridad',
        publishedAt: new Date(Date.now() - 172800000),
      },
      {
        tenantId: tenant._id,
        titulo: 'Kit trade Rocklets Verano',
        descripcion: 'Instructivo de armado de gondola y material POP.',
        category: 'Comercial',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.comercial._id, areaByKey.marketing._id],
          groupIds: [groupByKey.fuerza_ventas._id],
        },
        authorName: 'Marketing',
        publishedAt: new Date(Date.now() - 43200000),
      },
    ])
    console.log('Documentos ARCOR creados')
  } else {
    console.log(`Documentos ARCOR ya existen (${docCount})`)
  }

  const hubSeed = [
    { titulo: 'Muro Arcor', subtitulo: 'Feed interno', url: '/muro', category: 'Connectia', icon: 'home', order: 5, openMode: 'internal', color: '#0F766E' },
    { titulo: 'Mis solicitudes', subtitulo: 'Trámites y tickets', url: '/solicitudes', category: 'Connectia', icon: 'inbox', order: 6, openMode: 'internal', color: '#0369A1' },
    { titulo: 'Encuestas', subtitulo: 'Pulse y campañas', url: '/encuestas', category: 'Connectia', icon: 'clipboard', order: 7, openMode: 'internal', color: '#7C3AED' },
    { titulo: 'Documentos', subtitulo: 'Políticas y manuals', url: '/docs', category: 'Connectia', icon: 'file', order: 8, openMode: 'internal', color: '#B45309' },
    { titulo: 'SAP ECC', subtitulo: 'Pedidos, stock y finanzas', url: 'https://example.com/arcor/sap', category: 'Sistemas', icon: 'building', order: 10, openMode: 'external', color: '#1D4ED8' },
    { titulo: 'Mesa de ayuda IT', subtitulo: 'Tickets de sistemas', url: 'https://example.com/arcor/helpdesk', category: 'Sistemas', icon: 'chat', order: 11, openMode: 'external', color: '#0E7490' },
    { titulo: 'VPN corporativa', subtitulo: 'Guía de conexión', url: 'https://example.com/arcor/vpn', category: 'Sistemas', icon: 'grid', order: 12, openMode: 'external', color: '#334155' },
    { titulo: 'Recibos de sueldo', subtitulo: 'Consulta y descarga', url: 'https://example.com/arcor/recibos', category: 'People', icon: 'file', order: 20, openMode: 'external', color: '#BE185D' },
    { titulo: 'Vacaciones', subtitulo: 'Saldo y pedidos', url: 'https://example.com/arcor/vacaciones', category: 'People', icon: 'calendar', order: 21, openMode: 'external', color: '#059669' },
    { titulo: 'Club Arcor+', subtitulo: 'Beneficios colaboradores', url: 'https://example.com/arcor/beneficios', category: 'People', icon: 'grid', order: 22, openMode: 'external', color: '#C2410C' },
    { titulo: 'Capacitaciones', subtitulo: 'LMS interno', url: 'https://example.com/arcor/learning', category: 'People', icon: 'clipboard', order: 23, openMode: 'external', color: '#4F46E5' },
    { titulo: 'Portal de calidad', subtitulo: 'No conformidades y HACCP', url: 'https://example.com/arcor/calidad', category: 'Operaciones', icon: 'clipboard', order: 30, openMode: 'external', color: '#15803D' },
    { titulo: 'Órdenes de mantenimiento', subtitulo: 'CMMS plantas', url: 'https://example.com/arcor/cmms', category: 'Operaciones', icon: 'inbox', order: 31, openMode: 'external', color: '#A16207' },
    { titulo: 'Kit trade Rocklets', subtitulo: 'Material POP verano', url: 'https://example.com/arcor/trade-rocklets', category: 'Comercial', icon: 'megaphone', order: 40, openMode: 'external', color: '#DC2626' },
    { titulo: 'Listas de precios', subtitulo: 'Vigentes por canal', url: 'https://example.com/arcor/precios', category: 'Comercial', icon: 'file', order: 41, openMode: 'external', color: '#9333EA' },
  ]

  let hubUpserted = 0
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
    hubUpserted += 1
  }
  await HubLink.updateMany(
    { tenantId: tenant._id },
    { $set: { iconSize: 'md', featured: false } },
  )
  await HubCategory.updateMany({ tenantId: tenant._id }, { $set: { iconSize: 'md' } })

  const hubByCat = new Map()
  for (const item of hubSeed) {
    const cat = item.category || 'General'
    if (!hubByCat.has(cat)) hubByCat.set(cat, [])
    hubByCat.get(cat).push(item.titulo)
  }
  for (const [cat, titles] of hubByCat) {
    for (const titulo of titles.slice(0, 3)) {
      await HubLink.updateOne(
        { tenantId: tenant._id, titulo, category: cat },
        { $set: { featured: true } },
      )
    }
  }

  const hubCatSeed = [
    { nombre: 'Connectia', orden: 10, iconSize: 'md' },
    { nombre: 'Sistemas', orden: 20, iconSize: 'md' },
    { nombre: 'People', orden: 30, iconSize: 'md' },
    { nombre: 'Operaciones', orden: 40, iconSize: 'md' },
    { nombre: 'Comercial', orden: 50, iconSize: 'md' },
  ]
  for (const c of hubCatSeed) {
    await HubCategory.findOneAndUpdate(
      { tenantId: tenant._id, nombre: c.nombre },
      { ...c, tenantId: tenant._id, activo: true },
      { upsert: true },
    )
  }
  console.log(`Hub ARCOR: ${hubUpserted} enlaces + ${hubCatSeed.length} categorías`)

  const kindsN = await seedHubKindsForTenant(tenant)
  console.log(`Hub catálogo kinds ARCOR: ${kindsN} demos`)

  const bienvenida = postsByTitulo['Bienvenida a la comunidad Arcor']
  const beneficio = postsByTitulo['Beneficio del mes: Club Arcor+']
  if (bienvenida) {
    await SavedPost.findOneAndUpdate(
      { userId: juan._id, postId: bienvenida._id },
      { tenantId: tenant._id, userId: juan._id, postId: bienvenida._id },
      { upsert: true },
    )
  }
  if (beneficio) {
    await SavedPost.findOneAndUpdate(
      { userId: sofia._id, postId: beneficio._id },
      { tenantId: tenant._id, userId: sofia._id, postId: beneficio._id },
      { upsert: true },
    )
    await SavedPost.findOneAndUpdate(
      { userId: laura._id, postId: beneficio._id },
      { tenantId: tenant._id, userId: laura._id, postId: beneficio._id },
      { upsert: true },
    )
  }

  const adminArcor = usersByUsuario['admin.arcor']
  const notif = await seedNotificationsForTenant({
    tenant,
    members: [juan, diego, laura, carlos, sofia, usersByUsuario['ana.torres']].filter(Boolean),
    adminUser: adminArcor,
    survey,
    post: beneficio || (await Post.findOne({ tenantId: tenant._id, status: 'published' })),
    brand: 'Arcor',
  })
  if (sofia) {
    await AppNotification.findOneAndUpdate(
      { tenantId: tenant._id, userId: sofia._id, kind: 'generic', title: 'Campaña Rocklets Verano' },
      {
        tenantId: tenant._id,
        userId: sofia._id,
        kind: 'generic',
        title: 'Campaña Rocklets Verano',
        body: 'Ya está disponible el kit trade en Enlaces → Comercial',
        href: '/accesos',
        refType: '',
        refId: null,
      },
      { upsert: true },
    )
  }
  console.log(`Guardados y notificaciones ARCOR OK (${notif.inApp} in-app · ${notif.campaigns} campañas)`)

  const greetings = await seedGreetingsForTenant({ tenantId: tenant._id, brandName: 'Arcor' })
  console.log(`Saludos ARCOR: ${greetings.created} reglas`)

  const benefitsSeed = await seedBenefitsForTenant(tenant._id, { brandName: 'Arcor' })
  // Beneficios propios Arcor (Club Arcor+)
  const arcorExtras = [
    {
      kind: 'benefit',
      titulo: 'Club Arcor+ — descuentos en productos',
      descripcion:
        'Presentá tu credencial digital y obtené precios preferenciales en tiendas y kioscos adheridos del Club Arcor+.',
      condiciones: 'Válido para colaboradores activos. No acumulable con promociones de retail.',
      categoria: 'descuentos',
      imageUrl: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=900&q=80',
      partnerName: 'Club Arcor+',
      partnerUrl: 'https://example.com/arcor/beneficios',
      costoPuntos: 0,
      status: 'published',
      destacado: true,
      orden: 5,
      lat: -34.6037,
      lng: -58.3816,
      sucursal: 'CABA — corporativo',
    },
    {
      kind: 'benefit',
      titulo: 'Comedor de planta — menú del día',
      descripcion: 'Subsidio de almuerzo en comedores de Arroyito y Córdoba para personal de planta.',
      condiciones: 'Solo turnos de producción. Presentá legajo en caja.',
      categoria: 'gastronomia',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
      costoPuntos: 0,
      status: 'published',
      orden: 15,
      lat: -31.4201,
      lng: -64.1888,
      sucursal: 'Planta Córdoba',
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.produccion?._id].filter(Boolean),
        groupIds: [groupByKey.planta_arroyito?._id, groupByKey.planta_cordoba?._id].filter(Boolean),
        userIds: [],
      },
    },
    {
      kind: 'reward',
      titulo: 'Canasta Arcor — pack productos',
      descripcion: 'Canjeá puntos por una canasta de productos Arcor (Rocklets, Bon o Bon, etc.).',
      condiciones: 'Costo 800 puntos. Retiro en RRHH corporativo o planta.',
      categoria: 'premios',
      imageUrl: 'https://images.unsplash.com/photo-1548907040-4d42bfcfd427?w=900&q=80',
      costoPuntos: 800,
      stock: 40,
      limitePorUsuario: 2,
      status: 'published',
      orden: 25,
      lat: -31.3086,
      lng: -64.2745,
      sucursal: 'Arroyito',
    },
  ]
  let arcorCreated = 0
  let arcorUpdated = 0
  for (const row of arcorExtras) {
    const exists = await Benefit.findOne({ tenantId: tenant._id, titulo: row.titulo })
    if (exists) {
      if (row.lat != null) exists.lat = row.lat
      if (row.lng != null) exists.lng = row.lng
      if (row.sucursal) exists.sucursal = row.sucursal
      if (row.imageUrl && !exists.imageUrl) exists.imageUrl = row.imageUrl
      await exists.save()
      arcorUpdated += 1
      continue
    }
    await Benefit.create({
      ...row,
      tenantId: tenant._id,
      audience: row.audience || { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'seed',
    })
    arcorCreated += 1
  }

  // Partner link Club Arcor+
  await BenefitPartnerLink.findOneAndUpdate(
    { tenantId: tenant._id, titulo: 'Club Arcor+' },
    {
      tenantId: tenant._id,
      titulo: 'Club Arcor+',
      descripcion: 'Portal de beneficios y descuentos para colaboradores',
      url: 'https://example.com/arcor/beneficios',
      imageUrl: ARCOR_LOGO,
      orden: 10,
      activo: true,
    },
    { upsert: true },
  )

  const walletUsers = [juan, sofia, diego, laura, carlos, usersByUsuario['maria.lopez'], usersByUsuario['ana.torres']].filter(
    Boolean,
  )
  for (const u of walletUsers) {
    await postLedgerEntry({
      tenantId: tenant._id,
      userId: u._id,
      type: 'credit',
      amount: 2000,
      concept: 'Saldo inicial Club Arcor+',
      idempotencyKey: `seed:arcor:wallet:${u.usuario}`,
      createdBy: admin?._id,
    })
  }
  console.log(
    `Beneficios ARCOR: base ${benefitsSeed.created}+${benefitsSeed.skipped} · extras ${arcorCreated} nuevos / ${arcorUpdated} geo · puntos a ${walletUsers.length} usuarios`,
  )

  const { ensureDefaultPointsRules } = await import('../lib/pointsRules.js')
  const pointsRulesSeed = await ensureDefaultPointsRules(tenant._id, { createdBy: admin?._id })
  console.log(
    `Reglas de puntos comunidad ARCOR: ${pointsRulesSeed.created} nuevas / ${pointsRulesSeed.skipped} existentes`,
  )

  const licSeed = await seedLicenciasForTenant({
    tenant,
    users: usersByUsuario,
    brandName: 'Arcor',
    pais: 'AR',
  })
  console.log(
    `Licencias ARCOR (${licSeed.pais} · ${licSeed.cuentaVacaciones}): tipos ${licSeed.tipos} · saldos ${licSeed.balances} · pedidos ${licSeed.licenses} · ausencias ${licSeed.absences}`,
  )

  // —— Ola 15: eventos / agenda (vista mes, hoy, multimedia, RSVP, avisos) ——
  const eventsSeed = await seedEventsForTenant({
    tenant,
    users: usersByUsuario,
    brandName: 'Arcor',
    author: usersByUsuario.comunicacion || admin,
    force: true,
    notifyDemo: true,
  })
  console.log(
    `Eventos ARCOR: ${eventsSeed.created} nuevos · ${eventsSeed.updated} actualizados · ${eventsSeed.published} publicados · ${eventsSeed.drafts} borradores · ${eventsSeed.rsvps} RSVPs · ${eventsSeed.notifs} avisos`,
  )

  // —— Ola 19: catálogos RRHH + legajos + onboarding / egreso ——
  await ensureOla19MenuItems(tenant._id)
  const hrSeed = await seedHrCatalogsForTenant(HrCatalog, tenant._id)
  // Extras Arcor (Córdoba / Arroyito)
  for (const row of [
    { tipo: 'provincia', codigo: 'CBA', label: 'Córdoba', orden: 3, parentCodigo: 'AR' },
    { tipo: 'obra_social', codigo: 'osde_arcor', label: 'OSDE (convenio Arcor)', orden: 10 },
    { tipo: 'banco', codigo: 'galicia_arcor', label: 'Galicia — convenio sueldo Arcor', orden: 10 },
    { tipo: 'clasificacion_legajo', codigo: 'planta', label: 'Planta', orden: 1 },
    { tipo: 'clasificacion_legajo', codigo: 'corporativo', label: 'Corporativo', orden: 2 },
    { tipo: 'clasificacion_legajo', codigo: 'fuerza_ventas', label: 'Fuerza de ventas', orden: 3 },
  ]) {
    await HrCatalog.findOneAndUpdate(
      { tenantId: tenant._id, tipo: row.tipo, codigo: row.codigo },
      { ...row, tenantId: tenant._id, activo: true },
      { upsert: true },
    )
  }
  console.log(`Catálogos RRHH ARCOR: +${hrSeed.created} defaults + extras planta`)

  const cargoByUsuario = {
    'admin.arcor': 'Administrador de comunidad',
    comunicacion: 'Líder de comunicación interna',
    'rrhh.gestor': 'Analista de People & Culture',
    'maria.lopez': 'Analista RRHH',
    'juan.perez': 'Operario línea Rocklets',
    'sofia.garcia': 'Ejecutiva comercial',
    'diego.fernandez': 'Supervisor de calidad',
    'laura.martinez': 'Analista de logística',
    'carlos.ruiz': 'Analista de sistemas',
    'ana.torres': 'Analista de marketing',
  }
  const localidadByUsuario = {
    'juan.perez': { localidad: 'Arroyito', provincia: 'CBA', calle: 'Ruta 19', numero: 'Km 128' },
    'diego.fernandez': { localidad: 'Córdoba', provincia: 'CBA', calle: 'Av. Colón', numero: '4500' },
    'laura.martinez': { localidad: 'Arroyito', provincia: 'CBA', calle: 'San Martín', numero: '820' },
    'sofia.garcia': { localidad: 'CABA', provincia: 'CABA', calle: 'Av. del Libertador', numero: '7200' },
  }
  const lider = rrhhGestor || admin
  let legajosCreated = 0
  for (const def of userDefs) {
    const u = usersByUsuario[def.usuario]
    if (!u) continue
    const existing = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: u._id })
    if (existing) continue
    const seeded = seedFromUser(u)
    const loc = localidadByUsuario[def.usuario] || {
      localidad: 'Buenos Aires',
      provincia: 'CABA',
      calle: 'Maipú',
      numero: '1210',
    }
    const isPlanta = ['produccion', 'calidad', 'logistica'].includes(def.areaKey)
    await EmployeeLegajo.create({
      tenantId: tenant._id,
      userId: u._id,
      ...seeded,
      cargo: cargoByUsuario[def.usuario] || seeded.cargo || 'Colaborador',
      areaId: u.areaId || null,
      liderUserId: u._id.equals?.(lider._id) ? admin._id : lider._id,
      clasificacion: isPlanta ? 'planta' : def.areaKey === 'comercial' ? 'fuerza_ventas' : 'corporativo',
      subestado: 'ok',
      genero: ['maria.lopez', 'sofia.garcia', 'laura.martinez', 'ana.torres', 'comunicacion', 'rrhh.gestor'].includes(
        def.usuario,
      )
        ? 'F'
        : 'M',
      nacionalidad: 'AR',
      estadoCivil: 'soltero',
      estadoLaboral: 'activo',
      activo: true,
      fechaIngreso: new Date(Date.UTC(2019 + (legajosCreated % 5), (legajosCreated * 2) % 12, 10, 12, 0, 0)),
      fechaNacimiento: new Date(Date.UTC(1985 + (legajosCreated % 12), (legajosCreated * 3) % 12, 15, 12, 0, 0)),
      domicilios: [
        {
          tipo: 'particular',
          calle: loc.calle,
          numero: loc.numero,
          localidad: loc.localidad,
          provincia: loc.provincia,
          pais: 'AR',
          principal: true,
          activo: true,
        },
      ],
      familiares:
        def.usuario === 'juan.perez'
          ? [{ parentesco: 'conyuge', nombre: 'Carla', apellido: 'Pérez', activo: true }]
          : [],
      obraSocial: {
        nombre: 'OSDE',
        numeroAfiliado: `ARCOR-${u.idExterno}`,
        plan: isPlanta ? '210' : '310',
      },
      datosBancarios: [
        {
          banco: 'Banco Galicia',
          tipoCuenta: 'sueldo',
          cbu: `0070${String(100000000000 + legajosCreated).slice(0, 12)}0001`,
          alias: `${def.usuario}.arcor`,
          titular: `${u.nombre} ${u.apellido}`,
          principal: true,
          activo: true,
        },
      ],
      fichaMedica: {
        grupoSanguineo: legajosCreated % 2 === 0 ? 'O+' : 'A+',
        alergias: '',
        contactoEmergenciaNombre: 'Contacto familiar',
        contactoEmergenciaTel: '3515550000',
      },
      contratos: [
        {
          tipo: 'rel_dep',
          numero: `CTR-${u.idExterno}`,
          fechaInicio: new Date(Date.UTC(2019 + (legajosCreated % 5), 0, 1, 12, 0, 0)),
          modalidad: isPlanta ? 'presencial' : 'hibrido',
          activo: true,
        },
      ],
      carrera: {
        capacitaciones: [
          {
            nombre: 'Inducción Arcor',
            institucion: 'Universidad Corporativa Arcor',
            fecha: new Date(Date.UTC(2020, 2, 1)),
            horas: 8,
          },
        ],
        skills: [
          { nombre: isPlanta ? 'BPM / food safety' : 'Comunicación', nivel: 'intermedio' },
          { nombre: 'Trabajo en equipo', nivel: 'avanzado' },
        ],
      },
    })
    legajosCreated += 1
  }
  console.log(`Legajos ARCOR: ${legajosCreated} nuevos`)

  const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
  let onboardSurvey = await Survey.findOne({
    tenantId: tenant._id,
    titulo: 'Bienvenida Arcor — primer día',
  })
  if (!onboardSurvey) {
    onboardSurvey = await Survey.create({
      tenantId: tenant._id,
      titulo: 'Bienvenida Arcor — primer día',
      descripcion: 'Encuesta de onboarding Arcor (reusa motor §15).',
      status: 'published',
      purpose: 'onboarding',
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
      authorId: rrhhGestor?._id || admin._id,
      authorName: 'Patricia Gómez',
      questions: [
        {
          id: 'q_arcor_ob_1',
          texto: '¿Recibiste tu kit de bienvenida Arcor (credencial, EPIs si aplica)?',
          tipo: 'single',
          required: true,
          opciones: ['Sí', 'Parcialmente', 'Aún no'],
          grupo: 'Ingreso',
        },
        {
          id: 'q_arcor_ob_2',
          texto: '¿Conocés tu planta / sede y a tu líder?',
          tipo: 'yesno',
          required: true,
          opciones: [],
          grupo: 'Ingreso',
        },
        {
          id: 'q_arcor_ob_3',
          texto: 'Comentarios para People & Culture',
          tipo: 'textarea',
          required: false,
          opciones: [],
          grupo: 'Ingreso',
        },
      ],
    })
    console.log('Encuesta onboarding ARCOR creada')
  } else if (onboardSurvey.purpose !== 'onboarding') {
    onboardSurvey.purpose = 'onboarding'
    await onboardSurvey.save()
  }

  let exitSurvey = await Survey.findOne({
    tenantId: tenant._id,
    titulo: 'Encuesta de salida Arcor',
  })
  if (!exitSurvey) {
    exitSurvey = await Survey.create({
      tenantId: tenant._id,
      titulo: 'Encuesta de salida Arcor',
      descripcion: 'Offboarding — encuesta de egreso (motor §15).',
      status: 'published',
      purpose: 'offboarding',
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
      authorId: rrhhGestor?._id || admin._id,
      authorName: 'Patricia Gómez',
      questions: [
        {
          id: 'q_arcor_off_1',
          texto: '¿Cuál es el principal motivo de egreso?',
          tipo: 'single',
          required: true,
          opciones: ['Oportunidad externa', 'Motivos personales', 'Reestructuración', 'Otro'],
          grupo: 'Egreso',
        },
        {
          id: 'q_arcor_off_2',
          texto: '¿Recomendarías Arcor como empleador?',
          tipo: 'rating',
          required: true,
          opciones: [],
          grupo: 'Egreso',
        },
        {
          id: 'q_arcor_off_3',
          texto: 'Devolución final',
          tipo: 'textarea',
          required: false,
          opciones: [],
          grupo: 'Egreso',
        },
      ],
    })
    console.log('Encuesta offboarding ARCOR creada')
  } else if (exitSurvey.purpose !== 'offboarding') {
    exitSurvey.purpose = 'offboarding'
    await exitSurvey.save()
  }

  let onboardTpl = await OnboardingTemplate.findOne({
    tenantId: tenant._id,
    nombre: 'Ingreso estándar Arcor',
  })
  if (!onboardTpl) {
    onboardTpl = await OnboardingTemplate.create({
      tenantId: tenant._id,
      kind: 'onboarding',
      nombre: 'Ingreso estándar Arcor',
      descripcion: 'Inducción corporativa + planta / fuerza de ventas',
      version: 1,
      status: 'published',
      publishedAt: new Date(),
      slaDias: 21,
      authorId: rrhhGestor?._id || admin._id,
      authorName: 'Patricia Gómez',
      milestones: [
        {
          key: 'politicas',
          titulo: 'Leer políticas de seguridad alimentaria',
          descripcion: 'Políticas corporativas vigentes',
          tipo: 'content',
          orden: 1,
          contentUrl: '/politicas',
          obligatorio: true,
        },
        {
          key: 'encuesta_dia1',
          titulo: 'Encuesta de bienvenida',
          tipo: 'survey',
          orden: 2,
          dependsOn: ['politicas'],
          surveyId: onboardSurvey._id,
          obligatorio: true,
        },
        {
          key: 'presentacion_lider',
          titulo: 'Reunión con líder / supervisor',
          tipo: 'task',
          orden: 3,
          dependsOn: ['encuesta_dia1'],
          obligatorio: true,
        },
        {
          key: 'accesos_it',
          titulo: 'Confirmar accesos IT / credencial',
          tipo: 'checklist',
          orden: 4,
          dependsOn: ['presentacion_lider'],
          obligatorio: true,
        },
      ],
    })
    console.log('Plantilla onboarding ARCOR creada')
  }

  let offTpl = await OnboardingTemplate.findOne({
    tenantId: tenant._id,
    nombre: 'Egreso estándar Arcor',
  })
  if (!offTpl) {
    offTpl = await OnboardingTemplate.create({
      tenantId: tenant._id,
      kind: 'offboarding',
      nombre: 'Egreso estándar Arcor',
      descripcion: 'Checklist de egreso + encuesta de salida + revocación',
      version: 1,
      status: 'published',
      publishedAt: new Date(),
      slaDias: 10,
      authorId: rrhhGestor?._id || admin._id,
      authorName: 'Patricia Gómez',
      milestones: [
        {
          key: 'devolver_activos',
          titulo: 'Devolver activos (notebook, EPIs, credencial)',
          tipo: 'checklist',
          orden: 1,
          obligatorio: true,
        },
        {
          key: 'encuesta_salida',
          titulo: 'Encuesta de salida',
          tipo: 'survey',
          orden: 2,
          dependsOn: ['devolver_activos'],
          surveyId: exitSurvey._id,
          obligatorio: true,
        },
        {
          key: 'entrevista_salida',
          titulo: 'Entrevista de salida con RRHH',
          tipo: 'task',
          orden: 3,
          dependsOn: ['encuesta_salida'],
          obligatorio: false,
        },
      ],
    })
    console.log('Plantilla offboarding ARCOR creada')
  }

  // Proceso de ingreso activo para Juan (planta) y Sofía (ventas)
  for (const target of [juan, sofia].filter(Boolean)) {
    if (!onboardTpl || !target) continue
    const originKey = originKeyFor({
      userId: target._id,
      kind: 'onboarding',
      templateId: onboardTpl._id,
    })
    const existingInst = await OnboardingInstance.findOne({ tenantId: tenant._id, originKey })
    if (existingInst) continue
    const startedAt = new Date()
    const leg = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: target._id }).lean()
    await OnboardingInstance.create({
      tenantId: tenant._id,
      kind: 'onboarding',
      templateId: onboardTpl._id,
      templateName: onboardTpl.nombre,
      templateVersion: onboardTpl.version || 1,
      milestones: snapshotMilestonesFromTemplate(onboardTpl, startedAt),
      status: 'in_progress',
      userId: target._id,
      userName: [target.nombre, target.apellido].filter(Boolean).join(' ') || target.usuario,
      legajoId: leg?._id || null,
      progressPercent: 0,
      startedAt,
      dueAt: new Date(startedAt.getTime() + 21 * 86400000),
      originKey,
      history: [
        {
          at: startedAt,
          actorId: rrhhGestor?._id || admin._id,
          actorName: 'Patricia Gómez',
          action: 'started',
          detail: onboardTpl.nombre,
        },
      ],
    })
  }
  console.log('Procesos onboarding ARCOR: juan.perez + sofia.garcia (si no existían)')

  // Ejemplo de offboarding en curso para ana.torres (sin revocar aún)
  const ana = usersByUsuario['ana.torres']
  if (ana && offTpl) {
    const originKey = originKeyFor({
      userId: ana._id,
      kind: 'offboarding',
      templateId: offTpl._id,
    })
    const existingOff = await OnboardingInstance.findOne({ tenantId: tenant._id, originKey })
    if (!existingOff) {
      const startedAt = new Date()
      const leg = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: ana._id }).lean()
      await OnboardingInstance.create({
        tenantId: tenant._id,
        kind: 'offboarding',
        templateId: offTpl._id,
        templateName: offTpl.nombre,
        templateVersion: offTpl.version || 1,
        milestones: snapshotMilestonesFromTemplate(offTpl, startedAt),
        status: 'in_progress',
        userId: ana._id,
        userName: [ana.nombre, ana.apellido].filter(Boolean).join(' ') || ana.usuario,
        legajoId: leg?._id || null,
        progressPercent: 0,
        startedAt,
        dueAt: new Date(startedAt.getTime() + 10 * 86400000),
        originKey,
        history: [
          {
            at: startedAt,
            actorId: rrhhGestor?._id || admin._id,
            actorName: 'Patricia Gómez',
            action: 'started',
            detail: offTpl.nombre,
          },
        ],
      })
      console.log('Proceso offboarding ARCOR iniciado para ana.torres')
    }
  }

  return {
    empCodigo: EMP,
    users: userDefs.map((u) => ({ usuario: u.usuario, idExterno: u.idExterno, roles: u.roles })),
  }
}
