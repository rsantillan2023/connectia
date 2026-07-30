/**
 * Defaults y normalización de perfil para seed genérico de suscriptores.
 * Puro (sin DB / sin IA) — testeable.
 */

export const DEFAULT_SEED_PASSWORD = 'Demo1234!'

export const DEFAULT_CAPS = [
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
  'espacios',
  'espacios.salas',
  'espacios.cocheras',
  'espacios.coworking',
  'supervision.comercial',
  'supervision.equipo',
  'supervision.equipo.muro',
  'supervision.equipo.eventos',
  'supervision.equipo.notif',
  'supervision.equipo.encuestas',
  'supervision.equipo.docs',
  'supervision.equipo.chat',
  'talento',
  'talento.okr',
  'talento.desempeno',
  'talento.carrera',
  'talento.lms',
  'talento.vacantes',
  'cultura',
  'cultura.reconocimientos',
  'cultura.marketplace',
  'cultura.referidos',
  'cultura.pulso',
]

export const GENERIC_MENU = [
  { key: 'muro', label: 'Publicaciones', route: '/muro', icon: 'home', order: 10, channel: 'u' },
  { key: 'mis-publicaciones', label: 'Mis publicaciones', route: '/muro/mias', icon: 'inbox', order: 12, channel: 'u' },
  { key: 'guardados', label: 'Mis guardados', route: '/guardados', icon: 'bookmark', order: 15, channel: 'u' },
  { key: 'solicitudes', label: 'Mis solicitudes', route: '/solicitudes', icon: 'inbox', order: 20, channel: 'u' },
  { key: 'licencias', label: 'Vacaciones y permisos', route: '/licencias', icon: 'clipboard', order: 21, channel: 'u' },
  { key: 'ausencias', label: 'Ausencias', route: '/ausencias', icon: 'list', order: 21.5, channel: 'u' },
  { key: 'aprobaciones', label: 'Aprobaciones', route: '/aprobaciones', icon: 'check', order: 22, channel: 'u' },
  { key: 'encuestas', label: 'Encuestas', route: '/encuestas', icon: 'clipboard', order: 30, channel: 'u' },
  { key: 'docs', label: 'Mis documentos', route: '/docs', icon: 'file', order: 40, channel: 'u' },
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 45, channel: 'u' },
  { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield', order: 46, channel: 'u' },
  { key: 'hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 50, channel: 'u' },
  { key: 'avisos', label: 'Avisos', route: '/avisos', icon: 'bell', order: 55, channel: 'u' },
  { key: 'directorio', label: 'Directorio', route: '/directorio', icon: 'grid', order: 58, channel: 'u' },
  { key: 'mi-legajo', label: 'Mi legajo', route: '/mi-legajo', icon: 'file', order: 58.5, channel: 'u' },
  { key: 'bienvenida', label: 'Tu ingreso', route: '/bienvenida', icon: 'sparkles', order: 58.7, channel: 'u' },
  { key: 'beneficios', label: 'Beneficios', route: '/beneficios', icon: 'gift', order: 59, channel: 'u' },
  { key: 'mi-desarrollo', label: 'Mi desarrollo', route: '/mi-desarrollo', icon: 'sparkles', order: 57, channel: 'u' },
  { key: 'cultura', label: 'Cultura', route: '/cultura', icon: 'heart', order: 57.5, channel: 'u' },
  { key: 'espacios', label: 'Espacios', route: '/espacios', icon: 'building', order: 53, channel: 'u' },
  { key: 'oficina', label: 'Oficina', route: '/oficina', icon: 'grid', order: 54, channel: 'u' },
  { key: 'supervision', label: 'Supervisión', route: '/supervision', icon: 'clipboard', order: 52, channel: 'u' },
  { key: 'supervision.mis-tareas', label: 'Mis tareas', route: '/supervision/mis-tareas', icon: 'list', order: 52.1, channel: 'u' },
  { key: 'mi-equipo', label: 'Mi equipo', route: '/mi-equipo', icon: 'users', order: 51, channel: 'u' },
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
  { key: 'admin.directorio', label: 'Datos útiles', route: '/directorio', icon: 'grid', order: 46.2, channel: 'a' },
  { key: 'admin.beneficios', label: 'Beneficios y billetera', route: '/beneficios', icon: 'gift', order: 46.3, channel: 'a' },
  { key: 'admin.supervision', label: 'Supervisión comercial', route: '/supervision', icon: 'clipboard', order: 46.5, channel: 'a' },
  { key: 'admin.equipos', label: 'Equipos (supervisor)', route: '/equipos', icon: 'users', order: 46.6, channel: 'a' },
  { key: 'admin.reservas', label: 'Reserva de espacios', route: '/reservas', icon: 'building', order: 46.4, channel: 'a' },
  { key: 'admin.talento', label: 'Talento', route: '/talento', icon: 'sparkles', order: 46.55, channel: 'a' },
  { key: 'admin.cultura', label: 'Cultura empresarial', route: '/cultura', icon: 'heart', order: 46.56, channel: 'a' },
  { key: 'admin.ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 46.5, channel: 'a' },
  { key: 'admin.politicas', label: 'Políticas y cumplimiento', route: '/politicas', icon: 'shield', order: 46.7, channel: 'a' },
  { key: 'admin.hub', label: 'Enlaces', route: '/accesos', icon: 'grid', order: 47, channel: 'a' },
  { key: 'admin.tenants', label: 'Comunidad', route: '/comunidad', icon: 'building', order: 50, channel: 'a' },
  { key: 'admin.menu', label: 'Menú dinámico', route: '/menu', icon: 'menu', order: 55, channel: 'a' },
]

export const DEFAULT_AREAS = [
  { key: 'rrhh', nombre: 'RRHH', descripcion: 'People & Culture', orden: 10 },
  { key: 'operaciones', nombre: 'Operaciones', descripcion: 'Operaciones y producción', orden: 20 },
  { key: 'comercial', nombre: 'Comercial', descripcion: 'Ventas y clientes', orden: 30 },
  { key: 'it', nombre: 'IT', descripcion: 'Sistemas y tecnología', orden: 40 },
  { key: 'marketing', nombre: 'Marketing', descripcion: 'Comunicación y marca', orden: 50 },
  { key: 'finanzas', nombre: 'Finanzas', descripcion: 'Administración y finanzas', orden: 60 },
]

export const DEFAULT_GROUPS = [
  { key: 'liderazgo', nombre: 'Liderazgo', descripcion: 'Jefes, coordinadores y gerentes', orden: 10 },
  { key: 'corporativo', nombre: 'Corporativo', descripcion: 'Oficinas centrales', orden: 20 },
  { key: 'campo', nombre: 'Equipo de campo', descripcion: 'Operaciones / ventas en terreno', orden: 30 },
]

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

/** @param {string} value */
export function isHexColor(value) {
  return HEX_RE.test(String(value || '').trim())
}

/** @param {string} empCodigo */
export function adminUsuarioForCode(empCodigo) {
  const code = String(empCodigo || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24)
  return code ? `admin.${code}` : 'admin.tenant'
}

/**
 * @param {string} empCodigo
 * @param {string} nombre
 */
export function heuristicCompanyProfile(empCodigo, nombre) {
  const brand = String(nombre || empCodigo || 'Comunidad').trim() || 'Comunidad'
  const code = String(empCodigo || 'TENANT').toUpperCase().trim()
  return {
    knownCompany: false,
    industry: 'general',
    description: `Comunidad interna de ${brand}.`,
    primary: '#8554C9',
    secondary: '#6B3FA0',
    logoUrl: '',
    loginBgUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80',
    splashSubtitle: 'Tu comunidad Connectia',
    timezone: 'America/Argentina/Buenos_Aires',
    areas: DEFAULT_AREAS.map((a) => ({ ...a })),
    groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
    welcomeTitle: `Bienvenida a la comunidad ${brand}`,
    welcomeBody:
      `Este es el muro interno de ${brand}. Acá vas a encontrar comunicados, beneficios y novedades del equipo.\n` +
      'Usá Solicitudes para trámites y Enlaces para llegar a tus herramientas del día a día.',
    sources: [],
    empCodigo: code,
    brandName: brand,
  }
}

/**
 * Normaliza salida de IA / heurística sobre defaults seguros.
 * @param {object} raw
 * @param {{ empCodigo: string, nombre: string }} opts
 */
export function normalizeCompanyProfile(raw = {}, { empCodigo, nombre } = {}) {
  const base = heuristicCompanyProfile(empCodigo, nombre)
  const brand = String(raw.brandName || raw.nombre || nombre || base.brandName).trim() || base.brandName

  const areasIn = Array.isArray(raw.areas) ? raw.areas : []
  const areas =
    areasIn.length >= 3
      ? areasIn.slice(0, 8).map((a, i) => ({
          key: slugKey(a.key || a.nombre || `area${i + 1}`, `area${i + 1}`),
          nombre: String(a.nombre || a.key || `Área ${i + 1}`).trim().slice(0, 80),
          descripcion: String(a.descripcion || '').trim().slice(0, 160),
          orden: Number(a.orden) || (i + 1) * 10,
        }))
      : base.areas

  const groupsIn = Array.isArray(raw.groups) ? raw.groups : []
  const groups =
    groupsIn.length >= 2
      ? groupsIn.slice(0, 6).map((g, i) => ({
          key: slugKey(g.key || g.nombre || `grupo${i + 1}`, `grupo${i + 1}`),
          nombre: String(g.nombre || g.key || `Grupo ${i + 1}`).trim().slice(0, 80),
          descripcion: String(g.descripcion || '').trim().slice(0, 160),
          orden: Number(g.orden) || (i + 1) * 10,
        }))
      : base.groups

  const primary = isHexColor(raw.primary) ? String(raw.primary).trim() : base.primary
  const secondary = isHexColor(raw.secondary) ? String(raw.secondary).trim() : base.secondary

  return {
    knownCompany: Boolean(raw.knownCompany),
    industry: String(raw.industry || base.industry).trim().slice(0, 80) || base.industry,
    description: String(raw.description || base.description).trim().slice(0, 400) || base.description,
    primary,
    secondary,
    logoUrl: sanitizeUrl(raw.logoUrl) || '',
    loginBgUrl: sanitizeUrl(raw.loginBgUrl) || base.loginBgUrl,
    splashSubtitle: String(raw.splashSubtitle || base.splashSubtitle).trim().slice(0, 120) || base.splashSubtitle,
    timezone: String(raw.timezone || base.timezone).trim() || base.timezone,
    areas,
    groups,
    welcomeTitle: String(raw.welcomeTitle || `Bienvenida a la comunidad ${brand}`).trim().slice(0, 120),
    welcomeBody: String(raw.welcomeBody || base.welcomeBody).trim().slice(0, 1200) || base.welcomeBody,
    sources: Array.isArray(raw.sources) ? raw.sources.slice(0, 5) : [],
    empCodigo: String(empCodigo || base.empCodigo).toUpperCase().trim(),
    brandName: brand,
  }
}

/**
 * @param {ReturnType<typeof normalizeCompanyProfile>} profile
 */
export function brandingFromProfile(profile) {
  const brand = profile.brandName
  const logo = profile.logoUrl || ''
  return {
    primary: profile.primary,
    secondary: profile.secondary,
    logoUrl: logo,
    loginBgUrl: profile.loginBgUrl,
    splashTitle: brand,
    splashSubtitle: profile.splashSubtitle,
    splashDurationSec: 2,
    splash: {
      enabledPreLogin: true,
      enabledPostLogin: true,
      durationSec: 2,
      title: brand,
      subtitle: profile.description || profile.splashSubtitle,
      logoUrl: logo,
      bgColor: '#FFFFFF',
      bgImageUrl: '',
      textColor: profile.primary,
      showLogo: Boolean(logo),
      showTitle: true,
      showSubtitle: true,
    },
  }
}

function slugKey(value, fallback) {
  const s = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return s || fallback
}

function sanitizeUrl(value) {
  const u = String(value || '').trim()
  if (!u) return ''
  if (u.startsWith('/') || /^https?:\/\//i.test(u)) return u.slice(0, 500)
  return ''
}

/**
 * Normaliza URL de sitio del cliente (acepta dominio sin protocolo).
 * @param {string} value
 */
export function sanitizeWebsiteUrl(value) {
  let u = String(value || '').trim()
  if (!u) return ''
  if (u.startsWith('/')) return ''
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  try {
    const parsed = new URL(u)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.href.slice(0, 500)
  } catch {
    return ''
  }
}

/**
 * Contexto opcional del alta (web, rubro, notas) para enriquecer la IA.
 * @param {object} raw
 */
export function normalizeOnboardingContext(raw = {}) {
  const websiteUrl = sanitizeWebsiteUrl(raw.websiteUrl || raw.website || raw.web || '')
  const industryHint = String(raw.industryHint || raw.industry || '').trim().slice(0, 120)
  const country = String(raw.country || raw.pais || '').trim().slice(0, 80)
  const notes = String(raw.notes || raw.notas || raw.context || '').trim().slice(0, 2000)
  const logoUrlHint = sanitizeUrl(raw.logoUrl || raw.logoUrlHint || '')
  return {
    websiteUrl,
    industryHint,
    country,
    notes,
    logoUrlHint,
    hasHints: Boolean(websiteUrl || industryHint || country || notes || logoUrlHint),
  }
}

/**
 * Resumen persistible + mensaje de accesos para el destinatario de la membresía.
 * @param {{
 *   empCodigo: string,
 *   nombre: string,
 *   profile?: object,
 *   context?: object,
 *   credentials?: object,
 *   usedAi?: boolean,
 *   branding?: object,
 *   appUrl?: string,
 *   adminUrl?: string,
 * }} opts
 */
export function buildTenantOnboardingSummary(opts = {}) {
  const empCodigo = String(opts.empCodigo || '').toUpperCase().trim()
  const brand = String(opts.nombre || empCodigo).trim()
  const profile = opts.profile || {}
  const context = opts.context || {}
  const cred = opts.credentials || {}
  const adminUsuario = cred.adminUsuario || adminUsuarioForCode(empCodigo)
  const password = cred.password || DEFAULT_SEED_PASSWORD
  const sampleUsers = Array.isArray(cred.sampleUsers)
    ? cred.sampleUsers
    : ['comunicacion', 'rrhh.gestor', 'juan.perez', 'sofia.garcia']
  const appUrl = String(opts.appUrl || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const adminUrl = String(opts.adminUrl || process.env.ADMIN_URL || 'http://localhost:5174').replace(/\/$/, '')
  const branding = opts.branding || {}
  const logoUrl = branding.logoUrl || profile.logoUrl || context.logoUrlHint || ''
  const primary = branding.primary || profile.primary || '#8554C9'
  const secondary = branding.secondary || profile.secondary || '#6B3FA0'
  const areas = Array.isArray(profile.areas)
    ? profile.areas.map((a) => a.nombre || a.key).filter(Boolean)
    : []
  const groups = Array.isArray(profile.groups)
    ? profile.groups.map((g) => g.nombre || g.key).filter(Boolean)
    : []

  const accessMessage = [
    `Hola,`,
    ``,
    `Tu comunidad Connectia de ${brand} ya está lista para operar.`,
    ``,
    `Accesos:`,
    `• Panel admin: ${adminUrl}`,
    `• App colaboradores: ${appUrl}`,
    ``,
    `Datos de ingreso (admin):`,
    `• Empresa: ${empCodigo}`,
    `• Usuario: ${adminUsuario}`,
    `• Contraseña temporal: ${password}`,
    ``,
    `Usuarios de prueba (misma contraseña): ${sampleUsers.join(', ')}`,
    ``,
    `Te pedimos cambiar la contraseña al primer ingreso.`,
    ``,
    `Saludos,`,
    `Equipo Connectia`,
  ].join('\n')

  return {
    seededAt: new Date().toISOString(),
    knownCompany: Boolean(profile.knownCompany),
    usedAi: Boolean(opts.usedAi),
    industry: String(profile.industry || context.industryHint || '').trim(),
    description: String(profile.description || '').trim(),
    websiteUrl: context.websiteUrl || '',
    country: context.country || '',
    notes: context.notes || '',
    logoUrl,
    primary,
    secondary,
    splashSubtitle: branding.splashSubtitle || profile.splashSubtitle || '',
    timezone: profile.timezone || '',
    areas,
    groups,
    welcomeTitle: profile.welcomeTitle || '',
    credentials: {
      empCodigo,
      adminUsuario,
      password,
      sampleUsers,
      appUrl,
      adminUrl,
    },
    accessMessage,
  }
}
