/**
 * Seed del tenant THEFORK — cliente comercial de ejemplo (The Fork).
 * Uso: invocado desde seed.js vía seedTheForkTenant(passwordHash)
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
import { seedHubKindsForTenant } from './seedHubKinds.js'
import { seedNotificationsForTenant } from './seedNotifications.js'
import { seedGreetingsForTenant } from './seedGreetings.js'
import { seedOla19ForTenant } from './seedOla19ForTenant.js'

const EMP = 'THEFORK'
const PDF_DEMO = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
/** Logo local (public/branding) — verde hero TheFork; splash con fondo claro para contraste */
const THEFORK_LOGO = '/branding/thefork-logo.svg'
/** Ambiente gastronómico para login (España / dining) */
const THEFORK_LOGIN_BG =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80'

/** Paleta alineada a thefork.com — verde hero + secundario oscuro */
const THEFORK_BRANDING = {
  primary: '#00665E',
  secondary: '#003D38',
  logoUrl: THEFORK_LOGO,
  loginBgUrl: THEFORK_LOGIN_BG,
  splashTitle: 'TheFork España',
  splashSubtitle: 'Comunidad interna',
  splashDurationSec: 2,
  splash: {
    enabledPreLogin: true,
    enabledPostLogin: true,
    durationSec: 2,
    title: 'TheFork España',
    subtitle: 'Reservas, partners y equipo en un solo lugar.',
    logoUrl: THEFORK_LOGO,
    bgColor: '#FFFFFF',
    bgImageUrl: '',
    textColor: '#00665E',
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
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 30, channel: 'u' },
  { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file', order: 40, channel: 'u' },
  { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 50, channel: 'u' },
  { key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell', order: 55, channel: 'u' },
  { key: 'chat', label: 'Chat', route: '/chat', icon: 'chat', order: 60, channel: 'u' },
  { key: 'admin.home', label: 'Dashboard', route: '/', icon: 'home', order: 10, channel: 'a' },
  { key: 'admin.users', label: 'Usuarios', route: '/usuarios', icon: 'users', order: 15, channel: 'a' },
  { key: 'admin.org', label: 'Organización', route: '/organizacion', icon: 'building', order: 16, channel: 'a' },
  { key: 'admin.requests', label: 'Bandeja', route: '/solicitudes', icon: 'inbox', order: 18, channel: 'a' },
  { key: 'admin.reqsend', label: 'Pedir datos a un grupo', route: '/enviar-solicitud', icon: 'send', order: 18.5, channel: 'a' },
  { key: 'admin.reqtypes', label: 'Plantillas', route: '/tipos-solicitud', icon: 'tag', order: 19, channel: 'a' },
  { key: 'admin.reqstates', label: 'Estados solicitud', route: '/estados-solicitud', icon: 'flag', order: 19.5, channel: 'a' },
  { key: 'admin.pubs', label: 'Publicaciones', route: '/publicaciones', icon: 'megaphone', order: 40, channel: 'a' },
  { key: 'admin.engagement', label: 'Emociones', route: '/emociones', icon: 'heart', order: 41, channel: 'a' },
  { key: 'admin.surveys', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 45, channel: 'a' },
  { key: 'admin.notifications', label: 'Notificaciones', route: '/notificaciones', icon: 'bell', order: 45.5, channel: 'a' },
  { key: 'admin.comentarios', label: 'Moderación de comentarios', route: '/moderacion-comentarios', icon: 'shield', order: 45.6, channel: 'a' },
  { key: 'admin.saludos', label: 'Saludos automáticos', route: '/saludos', icon: 'heart', order: 45.7, channel: 'a' },
  { key: 'admin.docs', label: 'Documentos', route: '/documentos', icon: 'file', order: 46, channel: 'a' },
  { key: 'admin.hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 47, channel: 'a' },
  { key: 'admin.tenants', label: 'Comunidad', route: '/comunidad', icon: 'building', order: 50, channel: 'a' },
  { key: 'admin.menu', label: 'Menú dinámico', route: '/menu', icon: 'menu', order: 55, channel: 'a' },
]

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
export async function seedTheForkTenant(passwordHash) {
  let tenant = await Tenant.findOne({ empCodigo: EMP })
  if (!tenant) {
    tenant = await Tenant.create({
      empCodigo: EMP,
      nombre: 'TheFork España',
      allowDesktop: true,
      branding: { ...THEFORK_BRANDING, splash: { ...THEFORK_BRANDING.splash } },
      loginMethods: ['password', 'id'],
      capabilities: ['muro', 'solicitudes', 'encuestas', 'docs', 'hub', 'chat', 'menu.dynamic'],
      timezone: 'Europe/Madrid',
      uxShell: 'connectia',
    })
    console.log('Tenant THEFORK creado')
  } else {
    tenant.nombre = 'TheFork España'
    tenant.branding = {
      ...tenant.branding?.toObject?.() ?? tenant.branding,
      ...THEFORK_BRANDING,
      splash: { ...THEFORK_BRANDING.splash },
    }
    tenant.loginMethods = ['password', 'id']
    tenant.capabilities = ['muro', 'solicitudes', 'encuestas', 'docs', 'hub', 'chat', 'menu.dynamic']
    tenant.timezone = 'Europe/Madrid'
    await tenant.save()
    console.log('Tenant THEFORK ya existe — branding/capabilities actualizados')
  }

  const areaDefs = [
    { key: 'people', nombre: 'People', descripcion: 'HR y employee experience', orden: 10 },
    { key: 'sales', nombre: 'Sales & Partners', descripcion: 'Adquisición y cuenta de restaurantes', orden: 20 },
    { key: 'customer_care', nombre: 'Customer Care', descripcion: 'Soporte a diners y restaurantes', orden: 30 },
    { key: 'product', nombre: 'Product', descripcion: 'Producto app y Manager', orden: 40 },
    { key: 'marketing', nombre: 'Marketing', descripcion: 'Growth, Yums y brand', orden: 50 },
    { key: 'it', nombre: 'IT', descripcion: 'Sistemas y workplace tech', orden: 60 },
    { key: 'finance', nombre: 'Finance', descripcion: 'Billing, comisiones y reporting', orden: 70 },
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
    { key: 'liderazgo', nombre: 'Liderazgo', descripcion: 'Managers y leads', orden: 10 },
    { key: 'hq_madrid', nombre: 'HQ Madrid', descripcion: 'Oficina Madrid', orden: 20 },
    { key: 'account_managers', nombre: 'Account Managers', descripcion: 'Gestión de partners restaurantes', orden: 30 },
    { key: 'support_desk', nombre: 'Support Desk', descripcion: 'Atención diner & restaurant', orden: 40 },
    { key: 'product_squad', nombre: 'Product Squad', descripcion: 'Squads de producto y data', orden: 50 },
  ]
  const groupByKey = {}
  for (const g of groupDefs) {
    groupByKey[g.key] = await UserGroup.findOneAndUpdate(
      { tenantId: tenant._id, key: g.key },
      { ...g, tenantId: tenant._id, activo: true },
      { upsert: true, new: true },
    )
  }
  console.log('Áreas y grupos THEFORK OK')

  const userDefs = [
    {
      usuario: 'admin.fork',
      idExterno: 'TF1000',
      nombre: 'Elena',
      apellido: 'Admin',
      email: 'admin@thefork.connectia.local',
      roles: ['member', 'admin'],
      capabilities: [],
      areaKey: 'people',
      groupKeys: ['liderazgo', 'hq_madrid'],
    },
    {
      usuario: 'comms',
      idExterno: 'TF1001',
      nombre: 'Lucía',
      apellido: 'Navarro',
      email: 'comms@thefork.connectia.local',
      roles: ['member'],
      capabilities: ['admin.publicaciones', 'admin.encuestas', 'admin.documentos', 'admin.hub'],
      areaKey: 'marketing',
      groupKeys: ['hq_madrid', 'liderazgo'],
    },
    {
      usuario: 'people.ops',
      idExterno: 'TF1002',
      nombre: 'Hugo',
      apellido: 'Serrano',
      email: 'people@thefork.connectia.local',
      roles: ['member'],
      capabilities: ['admin.solicitudes', 'admin.tipos-solicitud', 'admin.usuarios', 'admin.organizacion', 'admin.legajos', 'admin.hrcatalog', 'admin.onboarding', 'admin.encuestas'],
      areaKey: 'people',
      groupKeys: ['hq_madrid', 'liderazgo'],
    },
    {
      usuario: 'clara.mendez',
      idExterno: 'TF2001',
      nombre: 'Clara',
      apellido: 'Méndez',
      email: 'clara.mendez@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'sales',
      groupKeys: ['account_managers'],
    },
    {
      usuario: 'pablo.ruiz',
      idExterno: 'TF2002',
      nombre: 'Pablo',
      apellido: 'Ruiz',
      email: 'pablo.ruiz@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'customer_care',
      groupKeys: ['support_desk'],
    },
    {
      usuario: 'ines.lopez',
      idExterno: 'TF2003',
      nombre: 'Inés',
      apellido: 'López',
      email: 'ines.lopez@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'product',
      groupKeys: ['product_squad', 'hq_madrid'],
    },
    {
      usuario: 'marco.bianchi',
      idExterno: 'TF2004',
      nombre: 'Marco',
      apellido: 'Bianchi',
      email: 'marco.bianchi@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'sales',
      groupKeys: ['account_managers', 'liderazgo'],
    },
    {
      usuario: 'sofia.ortiz',
      idExterno: 'TF2005',
      nombre: 'Sofía',
      apellido: 'Ortiz',
      email: 'sofia.ortiz@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'marketing',
      groupKeys: ['hq_madrid'],
    },
    {
      usuario: 'david.chen',
      idExterno: 'TF2006',
      nombre: 'David',
      apellido: 'Chen',
      email: 'david.chen@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'it',
      groupKeys: ['hq_madrid'],
    },
    {
      usuario: 'nora.gomez',
      idExterno: 'TF2007',
      nombre: 'Nora',
      apellido: 'Gómez',
      email: 'nora.gomez@thefork.connectia.local',
      roles: ['member'],
      capabilities: [],
      areaKey: 'finance',
      groupKeys: ['hq_madrid'],
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
  console.log(`Usuarios THEFORK: ${userDefs.length}`)

  const admin = usersByUsuario['admin.fork']
  const comms = usersByUsuario.comms
  const peopleOps = usersByUsuario['people.ops']
  const clara = usersByUsuario['clara.mendez']
  const pablo = usersByUsuario['pablo.ruiz']
  const ines = usersByUsuario['ines.lopez']
  const marco = usersByUsuario['marco.bianchi']
  const sofia = usersByUsuario['sofia.ortiz']
  const david = usersByUsuario['david.chen']
  const nora = usersByUsuario['nora.gomez']

  for (const item of MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }

  const seedPosts = [
    {
      titulo: 'Bienvenida a la comunidad The Fork',
      cuerpo:
        'Este es el muro interno de The Fork. Acá vas a ver novedades de producto, campañas Yums, ' +
        'avisos de partners y tips de People.\nUsá Solicitudes para trámites y Enlaces para Manager, Salesforce y más.',
      tipo: 'noticia',
      layout: 'banner',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
      pinned: true,
      priority: 100,
      hoursAgo: 2,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: comms,
    },
    {
      titulo: 'Campaña Yums × Valentine: +30% en reservas prime',
      cuerpo:
        'Arranca la campaña Valentine con boost de Yums en ciudades clave (Madrid, Barcelona, París, Milán).\n' +
        'Account Managers: revisá el playbook en Documentos → Marketing y priorizá partners con menú especial.',
      tipo: 'noticia',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80',
      pinned: false,
      priority: 92,
      hoursAgo: 6,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.sales._id, areaByKey.marketing._id],
        groupIds: [groupByKey.account_managers._id],
      },
      author: sofia,
    },
    {
      titulo: 'Nueva feature Manager: waitlist inteligente',
      cuerpo:
        'Product lanzó waitlist con predicción de no-show en The Fork Manager.\n' +
        'Customer Care: actualizá el script de soporte. AMs: ofrecelo en onboarding de partners nuevos.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80',
      pinned: false,
      priority: 88,
      hoursAgo: 12,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.product._id, areaByKey.customer_care._id, areaByKey.sales._id],
        groupIds: [],
      },
      author: ines,
    },
    {
      titulo: 'Beneficio del mes: The Fork Gift + comida en HQ',
      cuerpo:
        'Este mes cada colaborador recibe créditos Yums internos y almuerzo especial el viernes en Madrid HQ.\n' +
        'Inscribite en Encuestas → Almuerzo HQ. Detalle en Accesos → People.',
      tipo: 'beneficio',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=80',
      pinned: false,
      priority: 72,
      hoursAgo: 28,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: peopleOps,
    },
    {
      titulo: 'Partner Summit Madrid — 18 de marzo',
      cuerpo:
        'Invitamos a los top partners de España al Partner Summit en Madrid.\n' +
        'Cupos por AM. Confirmá lista de invitados antes del viernes en Salesforce.',
      tipo: 'evento',
      layout: 'vertical',
      imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1100&q=80',
      pinned: false,
      priority: 78,
      hoursAgo: 18,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.sales._id, areaByKey.marketing._id],
        groupIds: [groupByKey.account_managers._id, groupByKey.liderazgo._id],
      },
      author: marco,
    },
    {
      titulo: 'Pico de tickets: no-shows weekend',
      cuerpo:
        'Customer Care reporta +40% de tickets por no-show este fin de semana.\n' +
        'Recordá el flujo de reembolso Yums y escalá a Product si el diner reporta bug de cancelación.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80',
      pinned: false,
      priority: 80,
      hoursAgo: 9,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.customer_care._id, areaByKey.product._id],
        groupIds: [groupByKey.support_desk._id],
      },
      author: pablo,
    },
    {
      titulo: 'Ventana de mantenimiento CRM el domingo 03:00–05:00',
      cuerpo:
        'IT actualizará Salesforce y el conector de billing. Durante la ventana no habrá sync de leads ni comisiones.\n' +
        'Si tenés un incidente urgente, abrí ticket de Soporte sistemas.',
      tipo: 'aviso',
      layout: 'horizontal',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80',
      pinned: false,
      priority: 75,
      hoursAgo: 4,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      author: david,
    },
    {
      titulo: 'Q2 highlights: GMV y NPS partners',
      cuerpo:
        'Cerramos Q2 con crecimiento de GMV en Southern Europe y mejora de NPS en restaurantes Manager.\n' +
        'El deck completo está en Documentos → Finance & Ops (solo liderazgo).',
      tipo: 'general',
      layout: 'banner',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
      pinned: false,
      priority: 58,
      hoursAgo: 60,
      audience: {
        mode: 'restricted',
        areaIds: [],
        groupIds: [groupByKey.liderazgo._id, groupByKey.hq_madrid._id],
      },
      author: admin,
    },
  ]

  const now = new Date()
  let postsCreated = 0
  let postsUpdated = 0
  const postsByTitulo = {}
  for (const sp of seedPosts) {
    const author = sp.author || comms
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
        reactions: { like: 6, love: 3, clap: 4 },
      })
      postsByTitulo[sp.titulo] = created
      postsCreated += 1
    }
  }
  console.log(`Publicaciones THEFORK: ${postsCreated} nuevas, ${postsUpdated} actualizadas`)

  const typeDefs = [
    {
      key: 'people',
      nombre: 'Consulta People',
      descripcion: 'Vacaciones, onboarding, beneficios, nómina',
      area: 'People',
      orden: 10,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        {
          key: 'motivo',
          label: 'Motivo',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Vacaciones', 'Onboarding', 'Beneficios', 'Nómina', 'Otro'],
        },
        { key: 'desde', label: 'Desde', tipo: 'date', required: false, orden: 20 },
        { key: 'hasta', label: 'Hasta', tipo: 'date', required: false, orden: 30 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 40, placeholder: 'Contanos el caso' },
      ],
    },
    {
      key: 'partner',
      nombre: 'Soporte partner / restaurante',
      descripcion: 'Altas, comisiones, Manager, contratos',
      area: 'Sales & Partners',
      orden: 20,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.sales._id, areaByKey.customer_care._id, areaByKey.finance._id],
        groupIds: [groupByKey.account_managers._id, groupByKey.support_desk._id],
      },
      campos: [
        {
          key: 'tema',
          label: 'Tema',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Alta partner', 'Comisión / facturación', 'Acceso Manager', 'Menú / fotos', 'Contrato', 'Otro'],
        },
        { key: 'restaurant_id', label: 'Restaurant ID / nombre', tipo: 'text', required: true, orden: 20 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'diner',
      nombre: 'Escalado diner (Customer Care)',
      descripcion: 'Reembolsos Yums, cancelaciones, fraude',
      area: 'Customer Care',
      orden: 30,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.customer_care._id, areaByKey.product._id],
        groupIds: [groupByKey.support_desk._id],
      },
      campos: [
        {
          key: 'motivo',
          label: 'Motivo',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['Reembolso Yums', 'No-show', 'Bug app', 'Fraude', 'Otro'],
        },
        { key: 'booking_id', label: 'Booking ID', tipo: 'text', required: false, orden: 20 },
        { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'producto',
      nombre: 'Bug / mejora producto',
      descripcion: 'Incidencias app diner o The Fork Manager',
      area: 'Product',
      orden: 40,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.product._id, areaByKey.customer_care._id, areaByKey.it._id],
        groupIds: [groupByKey.product_squad._id],
      },
      campos: [
        {
          key: 'superficie',
          label: 'Superficie',
          tipo: 'select',
          required: true,
          orden: 10,
          opciones: ['App iOS', 'App Android', 'Web diner', 'The Fork Manager', 'API / integraciones'],
        },
        {
          key: 'severidad',
          label: 'Severidad',
          tipo: 'select',
          required: true,
          orden: 20,
          opciones: ['Baja', 'Media', 'Alta', 'Crítica'],
        },
        { key: 'detalle', label: 'Pasos para reproducir', tipo: 'textarea', required: true, orden: 30 },
      ],
    },
    {
      key: 'sistemas',
      nombre: 'Soporte sistemas',
      descripcion: 'Salesforce, VPN, laptop, accesos',
      area: 'IT',
      orden: 50,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
      campos: [
        { key: 'sistema', label: 'Sistema / app', tipo: 'text', required: true, orden: 10, placeholder: 'Ej. Salesforce, Slack, VPN' },
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
  console.log('Tipos de solicitud THEFORK OK')

  tenant.solicitudesConfig = defaultSolicitudesConfig()
  tenant.postsConfig = defaultPostsConfig()
  tenant.ugc = { enabled: true, requireApproval: true }
  await tenant.save()
  console.log('UGC THEFORK habilitado (con moderación)')

  const reqCount = await Request.countDocuments({ tenantId: tenant._id })
  if (reqCount === 0) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const reqSeeds = [
      {
        n: '0001',
        tipoKey: 'people',
        titulo: 'Días libres para Partner Summit',
        cuerpo: 'Hola People, ¿puedo tomar 1 día de vacaciones el 19/03 post Partner Summit?',
        estado: 'abierta',
        requester: clara,
        camposValores: [
          { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Vacaciones' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Día post Partner Summit Madrid.' },
        ],
        messages: [
          {
            texto: '¿Puedo tomar 1 día de vacaciones el 19/03 post Partner Summit?',
            authorId: clara._id,
            authorName: `${clara.nombre} ${clara.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0002',
        tipoKey: 'partner',
        titulo: 'Partner sin acceso Manager — Trattoria Luna',
        cuerpo: 'El owner de Trattoria Luna (RID 88421) no puede entrar a Manager tras el cambio de email.',
        estado: 'en_proceso',
        requester: marco,
        camposValores: [
          { key: 'tema', label: 'Tema', tipo: 'select', value: 'Acceso Manager' },
          { key: 'restaurant_id', label: 'Restaurant ID / nombre', tipo: 'text', value: '88421 — Trattoria Luna' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Cambio de email del owner; login falla.' },
        ],
        messages: [
          {
            texto: 'Owner de Trattoria Luna no entra a Manager tras cambio de email.',
            authorId: marco._id,
            authorName: `${marco.nombre} ${marco.apellido}`,
            isAdmin: false,
            interno: false,
          },
          {
            texto: 'Tomamos el caso. IT valida el SSO del partner en 1h.',
            authorId: peopleOps._id,
            authorName: `${peopleOps.nombre} ${peopleOps.apellido}`,
            isAdmin: true,
            interno: false,
          },
        ],
      },
      {
        n: '0003',
        tipoKey: 'diner',
        titulo: 'Reembolso Yums — booking cancelado por restaurante',
        cuerpo: 'Diner con booking #BK-99201 cancelado por el restaurante 40 min antes. Pide reembolso íntegro de Yums.',
        estado: 'abierta',
        requester: pablo,
        camposValores: [
          { key: 'motivo', label: 'Motivo', tipo: 'select', value: 'Reembolso Yums' },
          { key: 'booking_id', label: 'Booking ID', tipo: 'text', value: 'BK-99201' },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Cancelación late por restaurante.' },
        ],
        messages: [
          {
            texto: 'Booking BK-99201 cancelado por restaurante 40 min antes. Pedido reembolso Yums.',
            authorId: pablo._id,
            authorName: `${pablo.nombre} ${pablo.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0004',
        tipoKey: 'producto',
        titulo: 'Bug waitlist: no notifica al diner en iOS',
        cuerpo: 'En iOS 18, al liberarse mesa desde waitlist el diner no recibe push. Reproducible en Madrid y Barcelona.',
        estado: 'abierta',
        requester: ines,
        camposValores: [
          { key: 'superficie', label: 'Superficie', tipo: 'select', value: 'App iOS' },
          { key: 'severidad', label: 'Severidad', tipo: 'select', value: 'Alta' },
          { key: 'detalle', label: 'Pasos para reproducir', tipo: 'textarea', value: '1) Entrar waitlist 2) Liberar mesa 3) Sin push' },
        ],
        messages: [
          {
            texto: 'Waitlist iOS no dispara push al liberar mesa. Severidad alta.',
            authorId: ines._id,
            authorName: `${ines.nombre} ${ines.apellido}`,
            isAdmin: false,
            interno: false,
          },
        ],
      },
      {
        n: '0005',
        tipoKey: 'sistemas',
        titulo: 'Salesforce: leads sin sync desde el conector',
        cuerpo: 'Desde el viernes no llegan leads nuevos de inbound web a mi pipeline Southern EU.',
        estado: 'cerrada',
        requester: clara,
        camposValores: [
          { key: 'sistema', label: 'Sistema / app', tipo: 'text', value: 'Salesforce' },
          { key: 'prioridad', label: 'Prioridad', tipo: 'select', value: 'Alta' },
          { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', value: true },
          { key: 'detalle', label: 'Detalle', tipo: 'textarea', value: 'Conector inbound sin sync desde el viernes.' },
        ],
        messages: [
          {
            texto: 'Leads inbound no llegan a pipeline Southern EU.',
            authorId: clara._id,
            authorName: `${clara.nombre} ${clara.apellido}`,
            isAdmin: false,
            interno: false,
          },
          {
            texto: 'Reiniciamos el conector y reprocesamos la cola. Ya deberían verse.',
            authorId: david._id,
            authorName: `${david.nombre} ${david.apellido}`,
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
    console.log(`Solicitudes THEFORK creadas: ${reqSeeds.length}`)
  } else {
    console.log(`Solicitudes THEFORK ya existen (${reqCount})`)
  }

  let survey = await Survey.findOne({ tenantId: tenant._id, titulo: 'eNPS The Fork — pulse Q' })
  if (!survey) {
    const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
    survey = await Survey.create({
      tenantId: tenant._id,
      titulo: 'eNPS The Fork — pulse Q',
      descripcion: 'Pulse trimestral de engagement. Tus respuestas son confidenciales para People.',
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
      authorId: peopleOps._id,
      authorName: `${peopleOps.nombre} ${peopleOps.apellido}`,
      questions: [
        {
          id: 'q_enps',
          texto: '¿Qué tan probable es que recomiendes The Fork como lugar para trabajar?',
          tipo: 'rating',
          required: true,
          grupo: 'eNPS',
          opciones: [],
        },
        {
          id: 'q_tools',
          texto: '¿Las herramientas (Manager, Salesforce, Slack) te permiten trabajar bien?',
          tipo: 'yesno',
          required: true,
          grupo: 'Herramientas',
          opciones: [],
        },
        {
          id: 'q_focus',
          texto: '¿Qué debería priorizar el liderazgo este trimestre?',
          tipo: 'single',
          required: true,
          grupo: 'Agenda',
          opciones: ['Producto', 'Partners', 'Customer Care', 'People & cultura', 'Otro'],
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
    console.log('Encuesta eNPS THEFORK creada')
  } else {
    console.log('Encuesta eNPS THEFORK ya existe')
  }

  let surveyAm = await Survey.findOne({ tenantId: tenant._id, titulo: 'Readiness campaña Yums Valentine' })
  if (!surveyAm) {
    surveyAm = await Survey.create({
      tenantId: tenant._id,
      titulo: 'Readiness campaña Yums Valentine',
      descripcion: 'Solo Account Managers: confirmá si tus partners prioritarios ya tienen menú Valentine publicado.',
      status: 'published',
      publishedAt: new Date(Date.now() - 86400000),
      version: 1,
      audience: {
        mode: 'restricted',
        areaIds: [areaByKey.sales._id],
        groupIds: [groupByKey.account_managers._id],
      },
      audienceSnapshot: {
        invitedCount: 2,
        capturedAt: new Date(),
        mode: 'restricted',
        areaIds: [areaByKey.sales._id],
        groupIds: [groupByKey.account_managers._id],
      },
      anonymous: false,
      authorId: sofia._id,
      authorName: `${sofia.nombre} ${sofia.apellido}`,
      questions: [
        {
          id: 'q_ready',
          texto: '¿Tus top 10 partners ya publicaron menú Valentine?',
          tipo: 'yesno',
          required: true,
          grupo: 'Campaña',
          opciones: [],
        },
        {
          id: 'q_blockers',
          texto: 'Principales blockers',
          tipo: 'textarea',
          required: false,
          grupo: 'Campaña',
          opciones: [],
        },
      ],
    })
    console.log('Encuesta AMs THEFORK creada')
  }

  const respDefs = [
    {
      user: clara,
      survey,
      answers: [
        { questionId: 'q_enps', value: 5 },
        { questionId: 'q_tools', value: true },
        { questionId: 'q_focus', value: 'Partners' },
        { questionId: 'q_com', value: 'Más playbooks de campañas por ciudad ayudarían.' },
      ],
    },
    {
      user: pablo,
      survey,
      answers: [
        { questionId: 'q_enps', value: 4 },
        { questionId: 'q_tools', value: false },
        { questionId: 'q_focus', value: 'Customer Care' },
        { questionId: 'q_com', value: 'Necesitamos mejor visibilidad de no-shows en el ticket.' },
      ],
    },
    {
      user: clara,
      survey: surveyAm,
      answers: [
        { questionId: 'q_ready', value: true },
        { questionId: 'q_blockers', value: '2 partners sin fotos nuevas; resto OK.' },
      ],
    },
    {
      user: marco,
      survey: surveyAm,
      answers: [
        { questionId: 'q_ready', value: false },
        { questionId: 'q_blockers', value: 'Retraso en aprobación de menús en Italia Norte.' },
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
  console.log('Respuestas de encuesta THEFORK OK')

  const docCount = await DocItem.countDocuments({ tenantId: tenant._id })
  if (docCount === 0) {
    await DocItem.create([
      {
        tenantId: tenant._id,
        titulo: 'Playbook campaña Yums Valentine',
        descripcion: 'Mensajes, targeting y checklist para AMs por ciudad.',
        category: 'Marketing',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.sales._id, areaByKey.marketing._id],
          groupIds: [groupByKey.account_managers._id],
        },
        authorName: 'Marketing The Fork',
        publishedAt: new Date(),
      },
      {
        tenantId: tenant._id,
        titulo: 'Código de conducta y hospitality',
        descripcion: 'Principios de trabajo con partners y diners.',
        category: 'People',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: { mode: 'all', areaIds: [], groupIds: [] },
        authorName: 'People',
        publishedAt: new Date(Date.now() - 86400000),
      },
      {
        tenantId: tenant._id,
        titulo: 'Guía The Fork Manager — waitlist',
        descripcion: 'Cómo activar y explicar waitlist inteligente a partners.',
        category: 'Product',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.product._id, areaByKey.sales._id, areaByKey.customer_care._id],
          groupIds: [],
        },
        authorName: 'Product',
        publishedAt: new Date(Date.now() - 172800000),
      },
      {
        tenantId: tenant._id,
        titulo: 'Política de reembolsos Yums',
        descripcion: 'Casuística de cancelaciones, no-shows y fraude.',
        category: 'Customer Care',
        fileUrl: PDF_DEMO,
        mimeType: 'application/pdf',
        status: 'published',
        audience: {
          mode: 'restricted',
          areaIds: [areaByKey.customer_care._id, areaByKey.finance._id],
          groupIds: [groupByKey.support_desk._id],
        },
        authorName: 'Customer Care',
        publishedAt: new Date(Date.now() - 43200000),
      },
    ])
    console.log('Documentos THEFORK creados')
  } else {
    console.log(`Documentos THEFORK ya existen (${docCount})`)
  }

  const hubSeed = [
    { titulo: 'Muro The Fork', subtitulo: 'Feed interno', url: '/muro', category: 'Connectia', icon: 'home', order: 5, openMode: 'internal', color: '#0F766E' },
    { titulo: 'Mis solicitudes', subtitulo: 'Trámites y tickets', url: '/solicitudes', category: 'Connectia', icon: 'inbox', order: 6, openMode: 'internal', color: '#0369A1' },
    { titulo: 'Encuestas', subtitulo: 'eNPS y campañas', url: '/encuestas', category: 'Connectia', icon: 'clipboard', order: 7, openMode: 'internal', color: '#7C3AED' },
    { titulo: 'Documentos', subtitulo: 'Playbooks y políticas', url: '/docs', category: 'Connectia', icon: 'file', order: 8, openMode: 'internal', color: '#B45309' },
    { titulo: 'The Fork Manager', subtitulo: 'Portal partners', url: 'https://example.com/thefork/manager', category: 'Producto', icon: 'building', order: 10, openMode: 'external', color: '#00665E' },
    { titulo: 'App diner (web)', subtitulo: 'Experiencia comensal', url: 'https://example.com/thefork/app', category: 'Producto', icon: 'grid', order: 11, openMode: 'external', color: '#0EA5E9' },
    { titulo: 'Salesforce', subtitulo: 'Pipeline partners', url: 'https://example.com/thefork/salesforce', category: 'Sales', icon: 'inbox', order: 20, openMode: 'external', color: '#00A1E0' },
    { titulo: 'Partner playbooks', subtitulo: 'Onboarding y upsell', url: 'https://example.com/thefork/playbooks', category: 'Sales', icon: 'clipboard', order: 21, openMode: 'external', color: '#C2410C' },
    { titulo: 'Zendesk Care', subtitulo: 'Tickets diner & restaurant', url: 'https://example.com/thefork/zendesk', category: 'Care', icon: 'chat', order: 30, openMode: 'external', color: '#03363D' },
    { titulo: 'Política Yums', subtitulo: 'Reembolsos y fraude', url: 'https://example.com/thefork/yums-policy', category: 'Care', icon: 'file', order: 31, openMode: 'external', color: '#BE185D' },
    { titulo: 'People Hub', subtitulo: 'Vacaciones y beneficios', url: 'https://example.com/thefork/people', category: 'People', icon: 'users', order: 40, openMode: 'external', color: '#059669' },
    { titulo: 'Yums internos', subtitulo: 'Créditos colaboradores', url: 'https://example.com/thefork/yums-staff', category: 'People', icon: 'grid', order: 41, openMode: 'external', color: '#CA8A04' },
    { titulo: 'Billing & comisiones', subtitulo: 'Reporting Finance', url: 'https://example.com/thefork/billing', category: 'Finance', icon: 'file', order: 50, openMode: 'external', color: '#1D4ED8' },
    { titulo: 'VPN / Okta', subtitulo: 'Accesos corporativos', url: 'https://example.com/thefork/okta', category: 'IT', icon: 'grid', order: 60, openMode: 'external', color: '#334155' },
    { titulo: 'Status page', subtitulo: 'Incidentes de plataforma', url: 'https://example.com/thefork/status', category: 'IT', icon: 'megaphone', order: 61, openMode: 'external', color: '#DC2626' },
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
    { nombre: 'Producto', orden: 20, iconSize: 'md' },
    { nombre: 'Sales', orden: 30, iconSize: 'md' },
    { nombre: 'Care', orden: 40, iconSize: 'md' },
    { nombre: 'People', orden: 50, iconSize: 'md' },
    { nombre: 'Finance', orden: 60, iconSize: 'md' },
    { nombre: 'IT', orden: 70, iconSize: 'md' },
  ]
  for (const c of hubCatSeed) {
    await HubCategory.findOneAndUpdate(
      { tenantId: tenant._id, nombre: c.nombre },
      { ...c, tenantId: tenant._id, activo: true },
      { upsert: true },
    )
  }
  console.log(`Hub THEFORK: ${hubUpserted} enlaces + ${hubCatSeed.length} categorías`)

  const kindsN = await seedHubKindsForTenant(tenant)
  console.log(`Hub catálogo kinds THEFORK: ${kindsN} demos`)

  const bienvenida = postsByTitulo['Bienvenida a la comunidad The Fork']
  const beneficio = postsByTitulo['Beneficio del mes: The Fork Gift + comida en HQ']
  if (bienvenida) {
    await SavedPost.findOneAndUpdate(
      { userId: clara._id, postId: bienvenida._id },
      { tenantId: tenant._id, userId: clara._id, postId: bienvenida._id },
      { upsert: true },
    )
  }
  if (beneficio) {
    await SavedPost.findOneAndUpdate(
      { userId: pablo._id, postId: beneficio._id },
      { tenantId: tenant._id, userId: pablo._id, postId: beneficio._id },
      { upsert: true },
    )
    await SavedPost.findOneAndUpdate(
      { userId: nora._id, postId: beneficio._id },
      { tenantId: tenant._id, userId: nora._id, postId: beneficio._id },
      { upsert: true },
    )
  }

  const adminFork = await User.findOne({ tenantId: tenant._id, usuario: 'admin.fork' })
  const notif = await seedNotificationsForTenant({
    tenant,
    members: [clara, pablo, ines, david, nora, marco].filter(Boolean),
    adminUser: adminFork,
    survey,
    post: beneficio || (await Post.findOne({ tenantId: tenant._id, status: 'published' })),
    brand: 'TheFork',
  })
  if (marco) {
    await AppNotification.findOneAndUpdate(
      { tenantId: tenant._id, userId: marco._id, kind: 'generic', title: 'Partner Summit Madrid' },
      {
        tenantId: tenant._id,
        userId: marco._id,
        kind: 'generic',
        title: 'Partner Summit Madrid',
        body: 'Confirmá tu lista de partners invitados antes del viernes',
        href: '/muro',
        refType: '',
        refId: null,
      },
      { upsert: true },
    )
  }
  console.log(`Guardados y notificaciones THEFORK OK (${notif.inApp} in-app · ${notif.campaigns} campañas)`)

  const greetings = await seedGreetingsForTenant({ tenantId: tenant._id, brandName: 'TheFork' })
  console.log(`Saludos THEFORK: ${greetings.created} reglas`)

  const ola19 = await seedOla19ForTenant({
    tenant,
    brandName: 'TheFork',
    author: peopleOps || adminFork,
    onboardUsuarios: ['clara.mendez', 'pablo.ruiz'],
    offboardUsuarios: [],
  })
  console.log(
    `Ola 19 THEFORK: catálogos+${ola19.catalogsCreated} · legajos+${ola19.legajosCreated} · onboard ${ola19.onboardStarted}`,
  )

  return {
    empCodigo: EMP,
    users: userDefs.map((u) => ({ usuario: u.usuario, idExterno: u.idExterno, roles: u.roles })),
  }
}
