import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { MenuItem } from '../models/MenuItem.js'
import { LegalDoc } from '../models/LegalDoc.js'
import { Post } from '../models/Post.js'
import { OrgArea } from '../models/OrgArea.js'
import { UserGroup } from '../models/UserGroup.js'
import { RequestType } from '../models/RequestType.js'
import { Request } from '../models/Request.js'
import { Survey } from '../models/Survey.js'
import { DocItem } from '../models/DocItem.js'
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { Policy } from '../models/Policy.js'
import { HubLink } from '../models/HubLink.js'
import { HubCategory } from '../models/HubCategory.js'
import { EmployeeLegajo } from '../models/EmployeeLegajo.js'
import { HrCatalog } from '../models/HrCatalog.js'
import { OnboardingTemplate } from '../models/OnboardingTemplate.js'
import { OnboardingInstance } from '../models/OnboardingInstance.js'
import { seedHrCatalogsForTenant } from '../lib/hrCatalog.js'
import { seedFromUser } from '../lib/employeeLegajo.js'
import { snapshotMilestonesFromTemplate, originKeyFor } from '../lib/onboarding.js'
import { syncKbSource } from '../services/kbIndex.js'
import { WorkflowDefinition } from '../models/WorkflowDefinition.js'
import { WORKFLOW_USE_CASE_EXAMPLES } from '../services/workflowAi.js'
import { defaultSolicitudesConfig } from '../lib/solicitudesConfig.js'
import { defaultPostsConfig } from '../lib/postsConfig.js'

await connectDB()

const passwordHash = await bcrypt.hash('Demo1234!', 12)

/** —— Tenant PLATFORM (vendedor / Sooft) —— */
let platform = await Tenant.findOne({ empCodigo: 'PLATFORM' })
if (!platform) {
  platform = await Tenant.create({
    empCodigo: 'PLATFORM',
    nombre: 'Connectia Plataforma',
    allowDesktop: true,
    branding: {
      primary: '#0F172A',
      secondary: '#1E293B',
      splashTitle: 'Connectia Plataforma',
      splashSubtitle: 'Administración de suscriptores',
    },
    loginMethods: ['password'],
    capabilities: ['platform.admin'],
    uxShell: 'connectia',
  })
  console.log('Tenant PLATFORM creado')
} else {
  platform.capabilities = ['platform.admin']
  platform.nombre = 'Connectia Plataforma'
  await platform.save()
  console.log('Tenant PLATFORM ya existe')
}

let sooft = await User.findOne({ tenantId: platform._id, usuario: 'sooft' })
if (!sooft) {
  sooft = await User.create({
    tenantId: platform._id,
    usuario: 'sooft',
    passwordHash,
    nombre: 'Admin Plataforma Sooft',
    email: 'plataforma@connectia.local',
    roles: ['platform', 'admin'],
    capabilities: ['platform.admin'],
    termsAcceptedVersion: '1.0',
    termsAcceptedAt: new Date(),
  })
  console.log('Usuario sooft (plataforma) creado')
} else {
  sooft.passwordHash = passwordHash
  sooft.roles = ['platform', 'admin']
  sooft.capabilities = ['platform.admin']
  sooft.termsAcceptedVersion = '1.0'
  await sooft.save()
  console.log('Usuario sooft (plataforma) actualizado')
}

const platformMenu = [
  { key: 'platform.home', label: 'Dashboard', route: '/', icon: 'home', order: 10, channel: 'a' },
  { key: 'platform.subs', label: 'Suscriptores', route: '/suscriptores', icon: 'building', order: 20, channel: 'a' },
]

for (const item of platformMenu) {
  await MenuItem.findOneAndUpdate(
    { tenantId: platform._id, key: item.key },
    {
      ...item,
      tenantId: platform._id,
      activo: true,
      audience: { roles: ['platform', 'admin'], capabilities: [] },
    },
    { upsert: true },
  )
}

/** —— Tenant DEMO (cliente de ejemplo) —— */
/** Lila Talent = color base de producto / marca (Ola 36-j); DEMO arranca alineado. */
const DEMO_BRANDING = {
  primary: '#8554C9',
  secondary: '#6B3FA0',
  logoUrl: '',
  splashTitle: 'Comunidad Demo',
  splashDurationSec: 2,
  splash: {
    enabledPreLogin: true,
    enabledPostLogin: true,
    durationSec: 2,
    title: 'Comunidad Demo',
    subtitle: 'Tu comunidad: información y trámites, fácil.',
    showLogo: true,
    showTitle: true,
    showSubtitle: true,
  },
}
const empCodigo = 'DEMO'
let tenant = await Tenant.findOne({ empCodigo })
if (!tenant) {
  tenant = await Tenant.create({
    empCodigo,
    nombre: 'Comunidad Demo Connectia',
    allowDesktop: true,
    branding: { ...DEMO_BRANDING, splash: { ...DEMO_BRANDING.splash } },
    loginMethods: ['password', 'id'],
    peopleCare: { enabled: true, label: 'Mi legajo' },
    capabilities: [
      'muro',
      'solicitudes',
      'encuestas',
      'docs',
      'hub',
      'chat',
      'menu.dynamic',
    ],
  })
  console.log('Tenant DEMO creado')
} else {
  tenant.loginMethods = ['password', 'id']
  tenant.peopleCare = { enabled: true, label: 'Mi legajo' }
  tenant.branding = {
    ...(tenant.branding?.toObject?.() || tenant.branding || {}),
    primary: DEMO_BRANDING.primary,
    secondary: DEMO_BRANDING.secondary,
  }
  await tenant.save()
  console.log('Tenant DEMO ya existe (branding lila sincronizado)')
}

const usuario = 'demo'
let user = await User.findOne({ tenantId: tenant._id, usuario })
if (!user) {
  user = await User.create({
    tenantId: tenant._id,
    usuario,
    idExterno: '1001',
    passwordHash,
    nombre: 'Usuario Demo',
    email: process.env.SEED_DEMO_EMAIL || process.env.EMAIL_USER || 'demo@connectia.local',
    roles: ['member', 'admin'],
    capabilities: [],
    termsAcceptedVersion: '',
  })
  console.log('Usuario demo creado')
} else {
  user.passwordHash = passwordHash
  user.roles = ['member', 'admin']
  user.idExterno = user.idExterno || '1001'
  if (process.env.SEED_DEMO_EMAIL || process.env.EMAIL_USER) {
    user.email = process.env.SEED_DEMO_EMAIL || process.env.EMAIL_USER
  }
  await user.save()
  console.log('Usuario demo actualizado')
}

let member = await User.findOne({ tenantId: tenant._id, usuario: 'maria' })
if (!member) {
  member = await User.create({
    tenantId: tenant._id,
    usuario: 'maria',
    idExterno: '1002',
    passwordHash,
    nombre: 'María',
    apellido: 'Pérez',
    email: 'maria@connectia.local',
    roles: ['member'],
    origen: 'MANUAL',
    termsAcceptedVersion: '1.0',
    termsAcceptedAt: new Date(),
  })
  console.log('Usuario maria (member) creado')
} else {
  member.passwordHash = passwordHash
  member.roles = ['member']
  member.activo = true
  await member.save()
  console.log('Usuario maria actualizado')
}

{
  const now = new Date()
  const birth = new Date(Date.UTC(1992, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  const hire = new Date(Date.UTC(2020, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  member.fechaNacimiento = birth
  member.fechaIngreso = hire
  member.cargo = member.cargo || 'Analista'
  await member.save()
}

let staff = await User.findOne({ tenantId: tenant._id, usuario: 'lucia' })
if (!staff) {
  staff = await User.create({
    tenantId: tenant._id,
    usuario: 'lucia',
    idExterno: '1003',
    passwordHash,
    nombre: 'Lucía',
    apellido: 'Gestora',
    email: 'lucia@connectia.local',
    roles: ['member'],
    capabilities: ['admin.publicaciones', 'admin.solicitudes', 'admin.encuestas', 'admin.notificaciones', 'admin.comentarios', 'admin.saludos', 'admin.documentos', 'admin.ayuda', 'admin.politicas', 'admin.hub', 'admin.workflows', 'admin.ia', 'admin.legajos', 'admin.onboarding', 'admin.asistencia'],
    origen: 'MANUAL',
    termsAcceptedVersion: '1.0',
    termsAcceptedAt: new Date(),
  })
  console.log('Usuario lucia (gestora pubs+solicitudes+ola5) creado')
} else {
  staff.passwordHash = passwordHash
  staff.roles = ['member']
  staff.capabilities = ['admin.publicaciones', 'admin.solicitudes', 'admin.encuestas', 'admin.notificaciones', 'admin.comentarios', 'admin.saludos', 'admin.documentos', 'admin.ayuda', 'admin.politicas', 'admin.hub', 'admin.workflows', 'admin.ia', 'admin.legajos', 'admin.onboarding', 'admin.asistencia']
  staff.activo = true
  await staff.save()
  console.log('Usuario lucia actualizado')
}

await LegalDoc.findOneAndUpdate(
  { tenantId: null, tipo: 'terms', version: '1.0' },
  {
    tenantId: null,
    tipo: 'terms',
    version: '1.0',
    titulo: 'Términos y condiciones Connectia',
    cuerpo:
      'Al usar Connectia aceptás el uso de la plataforma para comunicación y trámites de tu comunidad. ' +
      'Tus datos se tratan según la política de privacidad del suscriptor. Versión 1.0.',
    vigente: true,
  },
  { upsert: true },
)

await LegalDoc.findOneAndUpdate(
  { tenantId: null, tipo: 'privacy', version: '1.0' },
  {
    tenantId: null,
    tipo: 'privacy',
    version: '1.0',
    titulo: 'Política de privacidad Connectia',
    cuerpo:
      'Tratamos datos de identidad, uso de la app y trámites necesarios para operar la comunidad. ' +
      'No vendemos datos. Retention según §43. Versión 1.0.',
    vigente: true,
  },
  { upsert: true },
)

const menuSeed = [
  { key: 'muro', label: 'Publicaciones', route: '/muro', icon: 'home', order: 10, channel: 'u' },
  { key: 'mis-publicaciones', label: 'Mis publicaciones', route: '/muro/mias', icon: 'inbox', order: 12, channel: 'u' },
  { key: 'guardados', label: 'Mis guardados', route: '/guardados', icon: 'bookmark', order: 15, channel: 'u' },
  { key: 'solicitudes', label: 'Mis solicitudes', route: '/solicitudes', icon: 'inbox', order: 20, channel: 'u' },
  { key: 'aprobaciones', label: 'Aprobaciones', route: '/aprobaciones', icon: 'check', order: 22, channel: 'u' },
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 30, channel: 'u' },
  { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file', order: 40, channel: 'u' },
  { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid', order: 41, channel: 'u' },
  { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 42, channel: 'u' },
  { key: 'mi-legajo', label: 'Mi legajo', route: '/mi-legajo', icon: 'file', order: 42, channel: 'u' },
  { key: 'bienvenida', label: 'Tu ingreso', route: '/bienvenida', icon: 'sparkles', order: 43, channel: 'u' },
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 45, channel: 'u' },
  { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield', order: 46, channel: 'u' },
  { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 50, channel: 'u' },
  { key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell', order: 55, channel: 'u' },
  { key: 'asistente', label: 'Asistente', route: '/asistente', icon: 'sparkles', order: 58, channel: 'u' },
  { key: 'chat', label: 'Chat', route: '/chat', icon: 'chat', order: 60, channel: 'u' },
  { key: 'admin.home', label: 'Dashboard', route: '/', icon: 'home', order: 10, channel: 'a' },
  { key: 'admin.users', label: 'Usuarios', route: '/usuarios', icon: 'users', order: 15, channel: 'a' },
  { key: 'admin.legajos', label: 'Fichas de empleado', route: '/legajos', icon: 'file', order: 15.5, channel: 'a' },
  { key: 'admin.hrcatalog', label: 'Listas del legajo', route: '/catalogos-rrhh', icon: 'tag', order: 15.6, channel: 'a' },
  { key: 'admin.onboarding', label: 'Ingreso y egreso', route: '/onboarding', icon: 'sparkles', order: 15.7, channel: 'a' },
  { key: 'admin.org', label: 'Organización', route: '/organizacion', icon: 'building', order: 16, channel: 'a' },
  { key: 'admin.requests', label: 'Bandeja', route: '/solicitudes', icon: 'inbox', order: 18, channel: 'a' },
  { key: 'admin.reqsend', label: 'Pedir datos a un grupo', route: '/enviar-solicitud', icon: 'send', order: 18.5, channel: 'a' },
  { key: 'admin.reqtypes', label: 'Plantillas', route: '/tipos-solicitud', icon: 'tag', order: 19, channel: 'a' },
  { key: 'admin.reqstates', label: 'Estados solicitud', route: '/estados-solicitud', icon: 'flag', order: 19.5, channel: 'a' },
  { key: 'admin.pubs', label: 'Publicaciones', route: '/publicaciones', icon: 'megaphone', order: 40, channel: 'a' },
  { key: 'admin.stories', label: 'Stories', route: '/stories', icon: 'sparkles', order: 40.5, channel: 'a' },
  { key: 'admin.engagement', label: 'Emociones', route: '/emociones', icon: 'heart', order: 41, channel: 'a' },
  { key: 'admin.surveys', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 45, channel: 'a' },
  { key: 'admin.notifications', label: 'Notificaciones', route: '/notificaciones', icon: 'bell', order: 45.5, channel: 'a' },
  { key: 'admin.comentarios', label: 'Moderación de comentarios', route: '/moderacion-comentarios', icon: 'shield', order: 45.6, channel: 'a' },
  { key: 'admin.saludos', label: 'Saludos automáticos', route: '/saludos', icon: 'heart', order: 45.7, channel: 'a' },
  { key: 'admin.workflows', label: 'Flujos de Aprobación', route: '/workflows', icon: 'flow', order: 45.8, channel: 'a' },
  { key: 'admin.kb', label: 'Base de conocimientos', route: '/asistente-kb', icon: 'sparkles', order: 45.9, channel: 'a' },
  { key: 'admin.docs', label: 'Documentos', route: '/documentos', icon: 'file', order: 46, channel: 'a' },
  { key: 'admin.directorio', label: 'Datos útiles', route: '/directorio', icon: 'grid', order: 46.2, channel: 'a' },
  { key: 'admin.beneficios', label: 'Beneficios y billetera', route: '/beneficios', icon: 'gift', order: 46.3, channel: 'a' },
  { key: 'admin.ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 46.5, channel: 'a' },
  { key: 'admin.politicas', label: 'Políticas y cumplimiento', route: '/politicas', icon: 'shield', order: 46.7, channel: 'a' },
  { key: 'admin.hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 47, channel: 'a' },
  { key: 'admin.chatmod', label: 'Moderación de chat', route: '/chat-moderacion', icon: 'chat', order: 48, channel: 'a' },
  { key: 'admin.tenants', label: 'Comunidad', route: '/comunidad', icon: 'building', order: 50, channel: 'a' },
  { key: 'admin.menu', label: 'Menú dinámico', route: '/menu', icon: 'menu', order: 55, channel: 'a' },
]

for (const item of menuSeed) {
  await MenuItem.findOneAndUpdate(
    { tenantId: tenant._id, key: item.key },
    { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
    { upsert: true, new: true },
  )
}

for (const ex of WORKFLOW_USE_CASE_EXAMPLES) {
  await WorkflowDefinition.findOneAndUpdate(
    { tenantId: tenant._id, name: ex.draft.name },
    {
      tenantId: tenant._id,
      name: ex.draft.name,
      description: ex.draft.description,
      trigger: ex.draft.trigger,
      steps: ex.draft.steps,
      activo: true,
      aiNotes: ex.draft.notes || '',
      createdByName: 'seed',
    },
    { upsert: true, new: true },
  )
}

const { seedOla8ForTenant } = await import('./seedOla8ForTenant.js')
const ola8Seed = await seedOla8ForTenant(tenant._id, {
  brandName: tenant.nombre || 'Connectia',
})
console.log(
  `Ola 8 DEMO: ${ola8Seed.greetingRules} reglas · ${ola8Seed.usersTouched}/${ola8Seed.usersTotal} usuarios con fechas/hitos`,
)

const areaDefs = [
  { key: 'rrhh', nombre: 'RRHH', descripcion: 'Recursos humanos', orden: 10 },
  { key: 'it', nombre: 'IT', descripcion: 'Sistemas y tecnología', orden: 20 },
  { key: 'comercial', nombre: 'Comercial', descripcion: 'Ventas y atención', orden: 30 },
]
const areaByKey = {}
for (const a of areaDefs) {
  const doc = await OrgArea.findOneAndUpdate(
    { tenantId: tenant._id, key: a.key },
    { ...a, tenantId: tenant._id, activo: true },
    { upsert: true, new: true },
  )
  areaByKey[a.key] = doc
}
const groupDefs = [
  { key: 'liderazgo', nombre: 'Liderazgo', descripcion: 'Jefes y coordinadores', orden: 10 },
  { key: 'planta', nombre: 'Planta', descripcion: 'Operarios de planta', orden: 20 },
]
const groupByKey = {}
for (const g of groupDefs) {
  const doc = await UserGroup.findOneAndUpdate(
    { tenantId: tenant._id, key: g.key },
    { ...g, tenantId: tenant._id, activo: true },
    { upsert: true, new: true },
  )
  groupByKey[g.key] = doc
}
console.log('Áreas y grupos DEMO OK')

// Asignar org a usuarios demo
user.areaId = areaByKey.comercial._id
user.groupIds = [groupByKey.liderazgo._id]
user.cargo = user.cargo || 'Gerente general'
user.managerId = null
await user.save()
if (member) {
  member.areaId = areaByKey.rrhh._id
  member.groupIds = [groupByKey.planta._id]
  member.cargo = member.cargo || 'Analista RRHH'
  member.managerId = user._id
  await member.save()
}
if (staff) {
  staff.areaId = areaByKey.it._id
  staff.groupIds = [groupByKey.liderazgo._id]
  staff.cargo = staff.cargo || 'Líder IT'
  staff.managerId = user._id
  if (!staff.capabilities.includes('admin.reportes')) {
    staff.capabilities = [...new Set([...(staff.capabilities || []), 'admin.reportes', 'admin.organizacion'])]
  }
  await staff.save()
}
console.log('Organigrama DEMO (managerId) OK')

const seedPosts = [
  {
    titulo: 'Bienvenida a Connectia',
    cuerpo:
      'Este es el muro de tu comunidad. Acá vas a ver comunicados, avisos y novedades.\n' +
      'Desde el admin podés publicar, fijar y elegir el formato de cada tarjeta.',
    tipo: 'noticia',
    layout: 'banner',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
    audioUrl: '',
    pinned: true,
    priority: 100,
    hoursAgo: 1,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
  {
    titulo: 'Recordatorio: actualizá tus datos',
    cuerpo:
      'Revisá tu perfil y confirmá email y teléfono para no perderte notificaciones importantes.\n' +
      'Si cambiaste de área o legajo, avisá a RRHH.',
    tipo: 'aviso',
    layout: 'horizontal',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    audioUrl: '',
    pinned: false,
    priority: 80,
    hoursAgo: 6,
    audience: {
      mode: 'restricted',
      areaIds: [areaByKey.rrhh._id],
      groupIds: [],
    },
  },
  {
    titulo: 'Beneficio del mes: alianzas con descuento',
    cuerpo:
      'Este mes hay descuentos en comercios adheridos para toda la comunidad.\n' +
      'Pedí el código en Accesos o escribinos por una solicitud de tipo Beneficios.',
    tipo: 'beneficio',
    layout: 'vertical',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    audioUrl: '',
    pinned: false,
    priority: 60,
    hoursAgo: 24,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
  {
    titulo: 'Evento: encuentro de equipo el viernes',
    cuerpo:
      'Te esperamos el viernes 18:00 en el SUM para el encuentro trimestral.\n' +
      'Habrá café, networking y un espacio para preguntas. Confirmá asistencia en Encuestas.',
    tipo: 'evento',
    layout: 'vertical',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    audioUrl: '',
    pinned: false,
    priority: 70,
    hoursAgo: 12,
    audience: {
      mode: 'restricted',
      areaIds: [],
      groupIds: [groupByKey.liderazgo._id],
    },
  },
  {
    titulo: 'Novedades generales de la comunidad',
    cuerpo:
      'Compartimos información útil del día a día: horarios, canales de contacto y tips para usar Connectia.\n' +
      'Si tenés una idea para el muro, escribinos por Solicitudes.',
    tipo: 'general',
    layout: 'horizontal',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&q=80',
    audioUrl: '',
    pinned: false,
    priority: 40,
    hoursAgo: 48,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
  // —— Demos de media: imagen / video archivo / YouTube ——
  {
    titulo: '[Seed] Demo imagen',
    cuerpo:
      'Publicación de prueba con imagen. En el muro se ve como foto del feed.\n' +
      'Podés asociar audio opcional cuando la media es imagen.',
    tipo: 'noticia',
    layout: 'vertical',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    audioUrl: '',
    pinned: false,
    priority: 90,
    hoursAgo: 0.5,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
  {
    titulo: '[Seed] Demo video MP4',
    cuerpo:
      'Publicación de prueba con video de archivo (mp4).\n' +
      'En la app debería reproducirse solo (sin sonido) apenas aparece en pantalla.',
    tipo: 'general',
    layout: 'vertical',
    imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    audioUrl: '',
    pinned: false,
    priority: 95,
    hoursAgo: 0.25,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
  {
    titulo: '[Seed] Demo YouTube',
    cuerpo:
      'Publicación de prueba con video de YouTube.\n' +
      'En la app se embebe y se lanza en autoplay (mute) al entrar en el viewport.',
    tipo: 'noticia',
    layout: 'vertical',
    imageUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    audioUrl: '',
    pinned: false,
    priority: 98,
    hoursAgo: 0.1,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
  },
]

const now = new Date()
let postsCreated = 0
let postsUpdated = 0
await Post.deleteMany({ tenantId: tenant._id, titulo: { $regex: /^\[Seed\]/i } })
for (const sp of seedPosts) {
  const existing = await Post.findOne({ tenantId: tenant._id, titulo: sp.titulo })
  const payload = {
    titulo: sp.titulo,
    tipo: sp.tipo,
    layout: sp.layout,
    imageUrl: sp.imageUrl || '',
    audioUrl: sp.audioUrl || '',
    cuerpo: sp.cuerpo,
    pinned: sp.pinned,
    priority: sp.priority,
    audience: sp.audience || { mode: 'all', areaIds: [], groupIds: [] },
    status: 'published',
    publishedAt: new Date(now.getTime() - sp.hoursAgo * 3600_000),
    authorId: user._id,
    authorName: user.nombre,
  }
  if (existing) {
    Object.assign(existing, payload)
    await existing.save()
    postsUpdated += 1
    continue
  }
  await Post.create({
    tenantId: tenant._id,
    ...payload,
    reactions: { like: 2, love: 1, clap: 0 },
  })
  postsCreated += 1
}
console.log(
  `Publicaciones seed: ${postsCreated} nuevas, ${postsUpdated} actualizadas ` +
    `(${seedPosts.length} total; incluye demos imagen / video MP4 / YouTube)`,
)

{
  const { seedStoriesForTenant } = await import('../lib/storiesSeed.js')
  const storiesSeed = await seedStoriesForTenant(tenant._id, {
    brandName: tenant.nombre || 'Connectia',
    variant: 'demo',
    authorId: user._id,
    authorName: user.nombre || 'demo',
    force: true,
  })
  console.log(
    `Stories DEMO: ${storiesSeed.created} nuevas · ${storiesSeed.updated} actualizadas · ${storiesSeed.skipped} omitidas`,
  )
}

await Post.updateMany(
  { tenantId: tenant._id, layout: { $exists: false } },
  { $set: { layout: 'vertical' } },
)

/** —— Ola 36 (plantillas, newsletter, audiencia, hub dinámico, espacios ampliados) —— */
const { seedOla36ForTenant } = await import('../lib/ola36Seed.js')
const ola36Demo = await seedOla36ForTenant(tenant._id, {
  brandName: tenant.nombre || 'DEMO',
  createdBy: user?._id,
  ensureSpaces: true,
})
console.log(
  `Ola 36 DEMO: plantillas +${ola36Demo.templates} · NL ${ola36Demo.newsletterRules} · clientes +${ola36Demo.clients} · pubs +${ola36Demo.posts} · espacios +${ola36Demo.spaceExtras}`,
)

const typeDefs = [
  {
    key: 'rrhh',
    nombre: 'Consulta RRHH',
    descripcion: 'Legajo, vacaciones, recibos',
    area: 'RRHH',
    orden: 10,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
    campos: [
      { key: 'motivo', label: 'Motivo', tipo: 'select', required: true, orden: 10, opciones: ['Vacaciones', 'Legajo', 'Recibo', 'Otro'] },
      { key: 'desde', label: 'Desde', tipo: 'date', required: false, orden: 20 },
      { key: 'hasta', label: 'Hasta', tipo: 'date', required: false, orden: 30 },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', required: true, orden: 40, placeholder: 'Contanos el caso' },
    ],
  },
  {
    key: 'sistemas',
    nombre: 'Soporte sistemas',
    descripcion: 'Accesos, equipos, apps',
    area: 'IT',
    orden: 20,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
    campos: [
      { key: 'sistema', label: 'Sistema / app', tipo: 'text', required: true, orden: 10, placeholder: 'Ej. VPN, correo' },
      { key: 'prioridad', label: 'Prioridad', tipo: 'select', required: true, orden: 20, opciones: ['Baja', 'Media', 'Alta'] },
      { key: 'urgente', label: 'Bloquea mi trabajo', tipo: 'check', required: false, orden: 30 },
      { key: 'contacto', label: 'Email de contacto', tipo: 'email', required: false, orden: 40 },
    ],
  },
  {
    key: 'general',
    nombre: 'Consulta general',
    descripcion: 'Otras gestiones',
    area: 'General',
    orden: 30,
    audience: { mode: 'all', areaIds: [], groupIds: [] },
    campos: [
      { key: 'tema', label: 'Tema', tipo: 'text', required: true, orden: 10 },
      { key: 'link', label: 'Link de referencia', tipo: 'url', required: false, orden: 20, placeholder: 'https://…' },
    ],
  },
  {
    key: 'datos_personales',
    nombre: 'Actualización de datos',
    descripcion: 'Para envíos dirigidos (dirección, contacto). Visible al crear propias solo en RRHH/planta.',
    area: 'RRHH',
    orden: 40,
    audience: {
      mode: 'restricted',
      areaIds: [areaByKey.rrhh._id],
      groupIds: [groupByKey.planta._id],
    },
    campos: [
      { key: 'direccion', label: 'Dirección actual', tipo: 'textarea', required: true, orden: 10, placeholder: 'Calle, número, localidad' },
      { key: 'cp', label: 'Código postal', tipo: 'text', required: false, orden: 20 },
      { key: 'telefono', label: 'Teléfono', tipo: 'text', required: true, orden: 30 },
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
for (const t of typeDefs) {
  const payload = {
    ...t,
    tenantId: tenant._id,
    activo: true,
    audience: t.audience || { mode: 'all', areaIds: [], groupIds: [] },
  }
  await RequestType.findOneAndUpdate({ tenantId: tenant._id, key: t.key }, payload, { upsert: true })
}
console.log('Tipos de solicitud DEMO OK (audiencia + campos dinámicos)')

tenant.solicitudesConfig = defaultSolicitudesConfig()
tenant.postsConfig = defaultPostsConfig()
tenant.ugc = { enabled: true, requireApproval: true }
tenant.commentsModeration = {
  enabled: true,
  requireApproval: false,
  autoHideMinScore: 0,
  notifyModeratorsMinScore: 80,
  glossary: ['confidencial'],
}
await tenant.save()
console.log('solicitudesConfig + postsConfig + ugc + commentsModeration DEMO sincronizado')

const reqCount = await Request.countDocuments({ tenantId: tenant._id })
if (reqCount === 0) {
  const tipo = await RequestType.findOne({ tenantId: tenant._id, key: 'rrhh' })
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  await Request.create({
    tenantId: tenant._id,
    codigo: `SOL-${day}-0001`,
    tipoId: tipo?._id,
    tipoKey: tipo?.key || 'rrhh',
    tipoNombre: tipo?.nombre || 'Consulta RRHH',
    area: tipo?.area || 'RRHH',
    titulo: 'Consulta sobre días de vacaciones',
    cuerpo: 'Hola, ¿cuántos días me quedan pendientes este año?',
    estado: 'abierta',
    requesterId: user._id,
    requesterName: user.nombre,
    messages: [
      {
        texto: 'Hola, ¿cuántos días me quedan pendientes este año?',
        authorId: user._id,
        authorName: user.nombre,
        isAdmin: false,
        interno: false,
      },
    ],
  })
  console.log('Solicitud DEMO de ejemplo creada')
} else {
  console.log(`Solicitudes DEMO ya existen (${reqCount})`)
}

// —— Ola 5: encuesta + docs + hub ——
const surveyCount = await Survey.countDocuments({ tenantId: tenant._id })
if (surveyCount === 0) {
  const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
  await Survey.create({
    tenantId: tenant._id,
    titulo: 'Clima laboral — pulse check',
    descripcion: 'Encuesta corta de ejemplo (Ola 5). Respondé con sinceridad.',
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
    authorId: staff?._id || user._id,
    authorName: 'Lucía Gestora',
    questions: [
      {
        id: 'q_sat',
        texto: '¿Qué tan satisfecho/a estás con la comunicación interna?',
        tipo: 'rating',
        required: true,
        grupo: 'Comunicación',
        opciones: [],
      },
      {
        id: 'q_rec',
        texto: '¿Recomendarías trabajar acá a un amigo?',
        tipo: 'yesno',
        required: true,
        grupo: 'Clima general',
        opciones: [],
      },
      {
        id: 'q_tema',
        texto: '¿Qué tema te gustaría que tratemos en el próximo encuentro?',
        tipo: 'single',
        required: true,
        grupo: 'Agenda',
        opciones: ['Beneficios', 'Carrera', 'Herramientas', 'Otro'],
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
  console.log('Encuesta DEMO creada')
} else {
  console.log(`Encuestas DEMO ya existen (${surveyCount})`)
}

const docCount = await DocItem.countDocuments({ tenantId: tenant._id })
if (docCount === 0) {
  await DocItem.create([
    {
      tenantId: tenant._id,
      titulo: 'Recibo marzo 2026',
      descripcion: 'Liquidación de haberes.',
      category: 'Recibos de sueldo',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'RRHH',
      publishedAt: new Date(),
    },
    {
      tenantId: tenant._id,
      titulo: 'Recibo febrero 2026',
      descripcion: 'Liquidación de haberes.',
      category: 'Recibos de sueldo',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'RRHH',
      publishedAt: new Date(Date.now() - 86400000 * 30),
    },
    {
      tenantId: tenant._id,
      titulo: 'Código de ética 2026',
      descripcion: 'Normas de conducta de la comunidad.',
      category: 'Código de ética',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Compliance',
      publishedAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      tenantId: tenant._id,
      titulo: 'Contrato marco de servicios',
      descripcion: 'Modelo vigente para proveedores.',
      category: 'Contratos',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Legal',
      publishedAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      tenantId: tenant._id,
      titulo: 'Política de home office',
      descripcion: 'Lineamientos actualizados de trabajo remoto.',
      category: 'RRHH',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'RRHH',
      publishedAt: new Date(Date.now() - 86400000),
    },
    {
      tenantId: tenant._id,
      titulo: 'Manual de marca (resumen)',
      descripcion: 'Colores y tipografías de la comunidad.',
      category: 'Comunicación',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Comunicación',
      publishedAt: new Date(Date.now() - 86400000 * 3),
    },
  ])
  console.log('Documentos DEMO creados')
} else {
  console.log(`Documentos DEMO ya existen (${docCount})`)
}

const faqCount = await Faq.countDocuments({ tenantId: tenant._id })
if (faqCount === 0) {
  const faqs = await Faq.create([
    {
      tenantId: tenant._id,
      category: 'Vacaciones',
      pregunta: '¿Cómo pido vacaciones?',
      respuesta:
        'Entrá a Mis solicitudes → Nueva → elegí la plantilla de vacaciones → completá fechas y enviá. Vas a ver el estado en la misma pantalla.',
      keywords: ['vacaciones', 'licencia', 'permiso'],
      orden: 10,
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'RRHH',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Connectia',
      pregunta: '¿Dónde veo mis documentos?',
      respuesta: 'En el menú Abrí Mis documentos. Ahí están carpetas por categoría con los archivos publicados para vos.',
      keywords: ['documentos', 'archivos', 'legajo'],
      orden: 20,
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Soporte',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
  ])
  for (const f of faqs) {
    await syncKbSource('faq', f)
    await f.save()
  }
  console.log('FAQs DEMO creadas')
} else {
  console.log(`FAQs DEMO ya existen (${faqCount})`)
}

const tutorialCount = await Tutorial.countDocuments({ tenantId: tenant._id })
if (tutorialCount === 0) {
  const tutorials = await Tutorial.create([
    {
      tenantId: tenant._id,
      category: 'Primeros pasos',
      titulo: 'Publicar en el muro',
      descripcion: 'Aprendé a compartir una novedad con tu comunidad.',
      moduloRelacionado: 'muro',
      keywords: ['muro', 'publicar'],
      orden: 10,
      status: 'published',
      showOnFirstLogin: true,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Connectia',
      publishedAt: new Date(),
      steps: [
        { orden: 1, titulo: 'Abrí Publicaciones', cuerpo: 'Desde el menú inferior o el drawer, tocá Publicaciones.', mediaType: 'none' },
        { orden: 2, titulo: 'Creá la publicación', cuerpo: 'Usá el botón de nueva publicación, escribí el texto y agregá media si querés.', mediaType: 'none' },
        { orden: 3, titulo: 'Publicá', cuerpo: 'Confirmá. Si tu comunidad pide aprobación, quedará pendiente hasta que la aprueben.', mediaType: 'none' },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Primeros pasos',
      titulo: 'Responder una encuesta',
      descripcion: 'Cómo completar una encuesta pendiente.',
      moduloRelacionado: 'encuestas',
      keywords: ['encuesta', 'responder'],
      orden: 20,
      status: 'published',
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Connectia',
      publishedAt: new Date(),
      steps: [
        { orden: 1, titulo: 'Entrá a Encuestas', cuerpo: 'Vas a ver las pendientes arriba.', mediaType: 'none' },
        { orden: 2, titulo: 'Respondé', cuerpo: 'Completá todas las preguntas obligatorias y enviá.', mediaType: 'none' },
      ],
    },
  ])
  for (const t of tutorials) {
    await syncKbSource('tutorial', t)
    await t.save()
  }
  console.log('Tutoriales DEMO creados')
} else {
  console.log(`Tutoriales DEMO ya existen (${tutorialCount})`)
}

const policyCount = await Policy.countDocuments({ tenantId: tenant._id })
if (policyCount === 0) {
  const policies = await Policy.create([
    {
      tenantId: tenant._id,
      codigo: 'ETH-01',
      titulo: 'Código de ética',
      resumen: 'Principios de conducta esperados en la comunidad.',
      cuerpo:
        '1. Respeto mutuo.\n2. Uso responsable de la información.\n3. Cumplimiento de normas internas.\n\nAl aceptar, confirmás haber leído esta versión del código de ética.',
      category: 'Ética',
      keywords: ['etica', 'conducta'],
      version: '1',
      status: 'published',
      requiresAck: true,
      mandatory: true,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'Legal',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'SEC-01',
      titulo: 'Política de seguridad de la información',
      resumen: 'Cuidado de credenciales y datos de la empresa.',
      cuerpo:
        'No compartas tu contraseña. Bloqueá tu dispositivo al alejarte. Reportá incidentes a TI. Esta política se actualiza periódicamente; una nueva versión requiere re-aceptación.',
      category: 'Seguridad',
      keywords: ['seguridad', 'password'],
      version: '1',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: { mode: 'all', areaIds: [], groupIds: [], userIds: [] },
      authorName: 'TI',
      publishedAt: new Date(),
      acks: [],
    },
  ])
  for (const p of policies) {
    await syncKbSource('policy', p)
    await p.save()
  }
  console.log('Políticas DEMO creadas')
} else {
  console.log(`Políticas DEMO ya existen (${policyCount})`)
}

const hubSeed = [
  {
    titulo: 'Muro Connectia',
    subtitulo: 'Ir al feed',
    url: '/muro',
    category: 'Connectia',
    icon: 'home',
    order: 5,
    openMode: 'internal',
    color: '#0F766E',
  },
  {
    titulo: 'Mis solicitudes',
    subtitulo: 'Estado de trámites',
    url: '/solicitudes',
    category: 'Connectia',
    icon: 'inbox',
    order: 6,
    openMode: 'internal',
    color: '#0369A1',
  },
  {
    titulo: 'Encuestas',
    subtitulo: 'Participá y mirá resultados',
    url: '/encuestas',
    category: 'Connectia',
    icon: 'clipboard',
    order: 7,
    openMode: 'internal',
    color: '#7C3AED',
  },
  {
    titulo: 'Mis documentos',
    subtitulo: 'Legajos y archivos',
    url: '/docs',
    category: 'Connectia',
    icon: 'file',
    order: 8,
    openMode: 'internal',
    color: '#B45309',
  },
  {
    titulo: 'Intranet',
    subtitulo: 'Portal interno',
    url: 'https://example.com/intranet',
    category: 'TI',
    icon: 'building',
    order: 10,
    openMode: 'external',
    color: '#1D4ED8',
  },
  {
    titulo: 'Mesa de ayuda',
    subtitulo: 'Tickets y soporte',
    url: 'https://example.com/helpdesk',
    category: 'TI',
    icon: 'chat',
    order: 11,
    openMode: 'external',
    color: '#0E7490',
  },
  {
    titulo: 'VPN corporativa',
    subtitulo: 'Guía de conexión',
    url: 'https://example.com/vpn',
    category: 'TI',
    icon: 'grid',
    order: 12,
    openMode: 'external',
    color: '#334155',
  },
  {
    titulo: 'Correo web',
    subtitulo: 'Outlook / mail',
    url: 'https://example.com/mail',
    category: 'TI',
    icon: 'inbox',
    order: 13,
    openMode: 'external',
    color: '#4F46E5',
  },
  {
    titulo: 'Beneficios',
    subtitulo: 'Portal de perks',
    url: 'https://example.com/beneficios',
    category: 'RRHH',
    icon: 'grid',
    order: 20,
    openMode: 'external',
    color: '#C2410C',
  },
  {
    titulo: 'Recibos de sueldo',
    subtitulo: 'Consulta y descarga',
    url: 'https://example.com/recibos',
    category: 'RRHH',
    icon: 'file',
    order: 21,
    openMode: 'external',
    color: '#BE185D',
  },
  {
    titulo: 'Vacaciones',
    subtitulo: 'Saldo y pedidos',
    url: 'https://example.com/vacaciones',
    category: 'RRHH',
    icon: 'calendar',
    order: 22,
    openMode: 'external',
    color: '#059669',
  },
  {
    titulo: 'Capacitaciones',
    subtitulo: 'Cursos internos',
    url: 'https://example.com/learning',
    category: 'RRHH',
    icon: 'clipboard',
    order: 23,
    openMode: 'external',
    color: '#9333EA',
  },
  {
    titulo: 'Manual de marca',
    subtitulo: 'Logos y tipografías',
    url: 'https://example.com/marca',
    category: 'Comunicación',
    icon: 'megaphone',
    order: 30,
    openMode: 'external',
    color: '#DC2626',
  },
  {
    titulo: 'Cartelera digital',
    subtitulo: 'Avisos de planta',
    url: 'https://example.com/cartelera',
    category: 'Comunicación',
    icon: 'megaphone',
    order: 31,
    openMode: 'external',
    color: '#CA8A04',
  },
  {
    titulo: 'Calendario de eventos',
    subtitulo: 'Fechas clave',
    url: 'https://example.com/eventos',
    category: 'Comunicación',
    icon: 'calendar',
    order: 32,
    openMode: 'external',
    color: '#15803D',
  },
]

let hubUpserted = 0
for (const item of hubSeed) {
  const r = await HubLink.findOneAndUpdate(
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
  if (r) hubUpserted += 1
}
await HubLink.updateMany(
  { tenantId: tenant._id },
  { $set: { iconSize: 'md', featured: false } },
)
await HubCategory.updateMany({ tenantId: tenant._id }, { $set: { iconSize: 'md' } })

// Hasta 3 accesos rápidos por grupo (orden del seed)
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
await HubLink.updateMany(
  { tenantId: tenant._id, $or: [{ visibleUntil: { $exists: false } }, { visibleUntil: null }] },
  { $set: { visibleUntil: new Date(Date.UTC(2099, 0, 1, 23, 59, 59, 999)) } },
)
await HubLink.updateMany(
  { tenantId: tenant._id, $or: [{ kind: { $exists: false } }, { kind: null }] },
  [
    {
      $set: {
        kind: {
          $cond: [{ $eq: ['$openMode', 'internal'] }, 'route', 'url'],
        },
        target: { $ifNull: ['$target', '$url'] },
        params: { $ifNull: ['$params', {}] },
      },
    },
  ],
)

const hubCatSeed = [
  { nombre: 'Connectia', orden: 10, iconSize: 'md' },
  { nombre: 'TI', orden: 20, iconSize: 'md' },
  { nombre: 'RRHH', orden: 30, iconSize: 'md' },
  { nombre: 'Comunicación', orden: 40, iconSize: 'md' },
]
for (const c of hubCatSeed) {
  await HubCategory.findOneAndUpdate(
    { tenantId: tenant._id, nombre: c.nombre },
    { ...c, tenantId: tenant._id, activo: true },
    { upsert: true },
  )
}
console.log(`Hub Enlaces DEMO: ${hubUpserted} ítems + ${hubCatSeed.length} grupos`)

const { seedHubKindsForTenant } = await import('./seedHubKinds.js')
const kindsN = await seedHubKindsForTenant(tenant)
console.log(`Hub catálogo 11 kinds: ${kindsN} demos`)

/** —— §7 Notificaciones (in-app + campañas admin) —— */
const { seedNotificationsForTenant } = await import('./seedNotifications.js')
const demoSurvey = await Survey.findOne({ tenantId: tenant._id }).sort({ createdAt: -1 })
const demoPost = await Post.findOne({ tenantId: tenant._id, status: 'published' }).sort({ priority: -1, createdAt: -1 })
const notifDemo = await seedNotificationsForTenant({
  tenant,
  members: [user, member, staff].filter(Boolean),
  adminUser: user,
  survey: demoSurvey,
  post: demoPost,
  brand: tenant.nombre || 'Connectia DEMO',
})
console.log(`Notificaciones DEMO: ${notifDemo.inApp} in-app · ${notifDemo.campaigns} campañas`)

/** —— §10 Comentarios + moderación —— */
const { seedCommentsForTenant } = await import('./seedComments.js')
const commentsDemo = await seedCommentsForTenant({
  tenant,
  post: demoPost,
  authors: [user, member, staff].filter(Boolean),
})
console.log(`Comentarios DEMO: ${commentsDemo.created} creados`)

/** —— §8 Chat —— */
const { seedChatForTenant } = await import('./seedChat.js')
const chatDemo = await seedChatForTenant({
  tenant,
  users: [user, member, staff].filter(Boolean),
})
console.log(`Chat DEMO: ${chatDemo.chats} chats · ${chatDemo.messages} mensajes`)

/** —— §24 Asistente / KB —— */
const { seedKbForTenant } = await import('./seedKb.js')
const kbDemo = await seedKbForTenant(tenant)
console.log(`KB DEMO: ${kbDemo.created} nuevos · ${kbDemo.total} artículos`)

/** —— §13 Licencias (diálogos asistente A–E en DEMO) —— */
const { seedLicenciasForTenant } = await import('./seedLicencias.js')
const licDemo = await seedLicenciasForTenant({
  tenant,
  users: { admin: user, member, staff },
  brandName: tenant.nombre || 'Connectia DEMO',
  pais: 'AR',
})
console.log(
  `Licencias DEMO: tipos ${licDemo.tipos || '?'} · saldos ${licDemo.balances || '?'}`,
)

/** —— §34/§35 Espacios (booking conversacional asistente) —— */
const { seedSpacesForTenant } = await import('../lib/spacesSeed.js')
const spacesDemo = await seedSpacesForTenant(tenant._id, {
  brandName: tenant.nombre || 'Connectia DEMO',
  empCodigo: tenant.empCodigo || 'DEMO',
})
console.log(
  `Espacios DEMO: ${spacesDemo.sites} sedes · ${spacesDemo.resourcesCreated} nuevos / ${spacesDemo.resourcesUpdated} actualizados`,
)

/** —— §11 Asistencia / turnos / marcación (Ola 18) —— */
const { seedAttendanceForTenant } = await import('../lib/attendanceSeed.js')
const attDemo = await seedAttendanceForTenant(tenant._id, {
  brandName: tenant.nombre || 'Connectia DEMO',
  userIds: [member?._id, user?._id].filter(Boolean),
})
console.log(
  `Asistencia DEMO: lugar ${attDemo.placeId} · turnos nuevos ${attDemo.shiftsCreated} · marcas ${attDemo.punchesCreated}`,
)

/** —— §21 Directorio DEMO —— */
const { DirectoryEntry } = await import('../models/DirectoryEntry.js')
const dirSeed = [
  {
    tipo: 'emergencia',
    nombre: 'Emergencias médicas',
    categoria: 'Urgencias',
    descripcion: 'Línea interna de emergencias 24 hs',
    telefono: '08001234567',
    destacado: true,
    orden: 1,
    color: '#b91c1c',
    imageUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'emergencia',
    nombre: 'Seguridad edificio',
    categoria: 'Urgencias',
    descripcion: 'Control de accesos y seguridad',
    telefono: '1145550100',
    interno: '100',
    orden: 2,
    color: '#b91c1c',
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'Recepción',
    categoria: 'Planta baja',
    descripcion: 'Informes, visitas y mensajería',
    telefono: '1145550200',
    interno: '200',
    email: 'recepcion@demo.connectia.local',
    horario: 'Lun–Vie 8:30 a 18:00',
    orden: 10,
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'servicio',
    nombre: 'Mesa de ayuda IT',
    categoria: 'Sistemas',
    descripcion: 'Soporte de notebook, VPN y accesos',
    telefono: '1145550300',
    interno: '300',
    email: 'it@demo.connectia.local',
    whatsapp: '5491145550300',
    horario: 'Lun–Vie 9 a 18',
    orden: 20,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'sede',
    nombre: 'Casa central',
    categoria: 'Sedes',
    descripcion: 'Oficinas principales',
    direccion: 'Av. Corrientes 1234',
    ciudad: 'CABA',
    lat: -34.6037,
    lng: -58.3816,
    telefono: '1145550000',
    horario: 'Lun–Vie 9 a 18',
    orden: 30,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'sede',
    nombre: 'Sucursal Norte',
    categoria: 'Sedes',
    descripcion: 'Atención regional',
    direccion: 'Av. Maipú 2500',
    ciudad: 'Vicente López',
    lat: -34.526,
    lng: -58.475,
    telefono: '1145550400',
    orden: 31,
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'telefono',
    nombre: 'RRHH — consultas generales',
    categoria: 'Personas',
    interno: '450',
    email: 'rrhh@demo.connectia.local',
    horario: 'Lun–Vie 10 a 16',
    orden: 40,
    imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f47?w=240&h=240&fit=crop&q=80',
  },
  {
    tipo: 'persona',
    nombre: 'Comedor / catering',
    categoria: 'Servicios',
    telefono: '1145550500',
    interno: '510',
    horario: 'Almuerzo 12 a 14:30',
    orden: 50,
    imageUrl: 'https://images.unsplash.com/photo-1567521463890-bec6f0a9a3a5?w=240&h=240&fit=crop&q=80',
  },
]
for (const row of dirSeed) {
  await DirectoryEntry.findOneAndUpdate(
    { tenantId: tenant._id, nombre: row.nombre },
    { ...row, tenantId: tenant._id, activo: true, audience: { mode: 'all', areaIds: [], groupIds: [] } },
    { upsert: true, new: true },
  )
}
console.log(`Directorio DEMO: ${dirSeed.length} contactos/sedes`)

// —— Ola 19: catálogos RRHH + legajos + onboarding (encuesta reusa §15) ——
const hrSeed = await seedHrCatalogsForTenant(HrCatalog, tenant._id)
console.log(`Catálogos RRHH DEMO: +${hrSeed.created} (base ${hrSeed.totalDefaults})`)

for (const u of [user, member, staff].filter(Boolean)) {
  const existingLeg = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: u._id })
  if (!existingLeg) {
    const seeded = seedFromUser(u)
    await EmployeeLegajo.create({
      tenantId: tenant._id,
      userId: u._id,
      ...seeded,
      estadoLaboral: 'activo',
      activo: true,
      domicilios: [
        {
          tipo: 'particular',
          calle: 'Av. Demo',
          numero: '100',
          localidad: 'CABA',
          provincia: 'CABA',
          pais: 'AR',
          principal: true,
        },
      ],
    })
  }
}
console.log('Legajos DEMO: demo / maria / lucia')

let onboardSurvey = await Survey.findOne({
  tenantId: tenant._id,
  titulo: 'Bienvenida — primer día',
})
if (!onboardSurvey) {
  const invitedCount = await User.countDocuments({ tenantId: tenant._id, activo: true })
  onboardSurvey = await Survey.create({
    tenantId: tenant._id,
    titulo: 'Bienvenida — primer día',
    descripcion: 'Encuesta de onboarding (Ola 19). Misma UI de encuestas §15.',
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
    authorId: staff?._id || user._id,
    authorName: 'Lucía Gestora',
    questions: [
      {
        id: 'q_bienvenida_1',
        texto: '¿Recibiste tu kit de bienvenida?',
        tipo: 'single',
        required: true,
        opciones: ['Sí', 'Parcialmente', 'Aún no'],
        grupo: 'Ingreso',
      },
      {
        id: 'q_bienvenida_2',
        texto: '¿Qué necesitás para arrancar?',
        tipo: 'text',
        required: false,
        opciones: [],
        grupo: 'Ingreso',
      },
    ],
  })
  console.log('Encuesta onboarding DEMO creada')
} else if (!onboardSurvey.purpose || onboardSurvey.purpose === 'general') {
  onboardSurvey.purpose = 'onboarding'
  await onboardSurvey.save()
}

let onboardTpl = await OnboardingTemplate.findOne({
  tenantId: tenant._id,
  nombre: 'Ingreso estándar DEMO',
})
if (!onboardTpl) {
  onboardTpl = await OnboardingTemplate.create({
    tenantId: tenant._id,
    kind: 'onboarding',
    nombre: 'Ingreso estándar DEMO',
    descripcion: 'Plantilla de ejemplo Ola 19',
    version: 1,
    status: 'published',
    publishedAt: new Date(),
    slaDias: 14,
    authorId: staff?._id || user._id,
    authorName: 'Lucía Gestora',
    milestones: [
      {
        key: 'leer_guia',
        titulo: 'Leer guía de bienvenida',
        descripcion: 'Repasá políticas y cultura',
        tipo: 'content',
        orden: 1,
        contentUrl: '/politicas',
        obligatorio: true,
      },
      {
        key: 'encuesta_dia1',
        titulo: 'Encuesta de primer día',
        descripcion: 'Completá la encuesta de bienvenida',
        tipo: 'survey',
        orden: 2,
        dependsOn: ['leer_guia'],
        surveyId: onboardSurvey._id,
        obligatorio: true,
      },
      {
        key: 'presentarse',
        titulo: 'Presentarte al equipo',
        tipo: 'task',
        orden: 3,
        dependsOn: ['encuesta_dia1'],
        obligatorio: true,
      },
    ],
  })
  console.log('Plantilla onboarding DEMO creada')
}

const maria = member
if (maria && onboardTpl) {
  const originKey = originKeyFor({
    userId: maria._id,
    kind: 'onboarding',
    templateId: onboardTpl._id,
  })
  const existingInst = await OnboardingInstance.findOne({ tenantId: tenant._id, originKey })
  if (!existingInst) {
    const startedAt = new Date()
    const leg = await EmployeeLegajo.findOne({ tenantId: tenant._id, userId: maria._id }).lean()
    await OnboardingInstance.create({
      tenantId: tenant._id,
      kind: 'onboarding',
      templateId: onboardTpl._id,
      templateName: onboardTpl.nombre,
      templateVersion: onboardTpl.version || 1,
      milestones: snapshotMilestonesFromTemplate(onboardTpl, startedAt),
      status: 'in_progress',
      userId: maria._id,
      userName: [maria.nombre, maria.apellido].filter(Boolean).join(' ') || maria.usuario,
      legajoId: leg?._id || null,
      progressPercent: 0,
      startedAt,
      dueAt: new Date(startedAt.getTime() + 14 * 86400000),
      originKey,
      history: [
        {
          at: startedAt,
          actorId: staff?._id || user._id,
          actorName: 'Seed',
          action: 'started',
          detail: onboardTpl.nombre,
        },
      ],
    })
    console.log('Proceso onboarding DEMO iniciado para maria')
  }
}

/** —— Ola 25 Pedidos de campo + canal alarma —— */
{
  const { seedPedidosForTenant } = await import('../lib/pedidosSeed.js')
  const ped = await seedPedidosForTenant(tenant, { force: true, brandName: 'DEMO' })
  console.log(
    `Ola 25 DEMO: cats +${ped.categoriesCreated} · arts +${ped.articlesCreated} · alarma demo ${ped.alarmCreated ? 'sí' : 'ya existía'}`,
  )
}

/** —— Ola 43 Portal de servicios —— */
{
  const { seedServiciosForTenant } = await import('../lib/serviciosSeed.js')
  const srv = await seedServiciosForTenant(tenant, { force: true })
  console.log(
    `Ola 43 DEMO: áreas +${srv.areasCreated} · ítems +${srv.itemsCreated} · req +${srv.requestsCreated}`,
  )
}

/** —— Tenant ARCOR (cliente comercial de ejemplo) —— */
const { seedArcorTenant } = await import('./seedArcor.js')
await seedArcorTenant(passwordHash)

/** —— Tenant THEFORK (cliente comercial de ejemplo) —— */
const { seedTheForkTenant } = await import('./seedTheFork.js')
await seedTheForkTenant(passwordHash)

/** —— Tenant GRIDO (Grido Helados) —— */
const { seedGridoTenant } = await import('./seedGrido.js')
await seedGridoTenant(passwordHash)

console.log('—— Credenciales ——')
console.log('PLATAFORMA (vendedor): PLATFORM / sooft / Demo1234!  → Admin :5174')
console.log('TENANT DEMO (admin):   DEMO / demo / Demo1234!')
console.log('Gestora (pubs+bandeja+ola5): DEMO / lucia / Demo1234!')
console.log('App U ID:               DEMO / 1001 / Demo1234!')
console.log('—— ARCOR ——')
console.log('Admin:     ARCOR / admin.arcor / Demo1234!  (también ID A1000)')
console.log('Comunic.:  ARCOR / comunicacion / Demo1234!')
console.log('RRHH:      ARCOR / rrhh.gestor / Demo1234!')
console.log('Planta:    ARCOR / juan.perez / Demo1234!  (ID A2002)')
console.log('Ventas:    ARCOR / sofia.garcia / Demo1234!  (ID A2003)')
console.log('Password de todos los users ARCOR: Demo1234!')
console.log('—— THE FORK ——')
console.log('Admin:     THEFORK / admin.fork / Demo1234!  (también ID TF1000)')
console.log('Comms:     THEFORK / comms / Demo1234!')
console.log('People:    THEFORK / people.ops / Demo1234!')
console.log('AM:        THEFORK / clara.mendez / Demo1234!  (ID TF2001)')
console.log('Care:      THEFORK / pablo.ruiz / Demo1234!  (ID TF2002)')
console.log('Password de todos los users THEFORK: Demo1234!')
console.log('—— GRIDO HELADOS ——')
console.log('Admin:     GRIDO / admin.grido / Demo1234!')
console.log('Comunic.:  GRIDO / comunicacion / Demo1234!')
console.log('People:    GRIDO / rrhh.gestor / Demo1234!')
console.log('Campo:     GRIDO / juan.perez / Demo1234!')
console.log('Password de todos los users GRIDO: Demo1234!')
await mongoose.disconnect()
