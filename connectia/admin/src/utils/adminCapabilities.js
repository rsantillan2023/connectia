/** Catálogo de permisos de pantallas del admin (espejo del backend). */
export const ADMIN_SCREEN_CAPABILITIES = [
  {
    id: 'admin.publicaciones',
    label: 'Publicaciones',
    description: 'Crear y gestionar el muro',
    routes: ['/publicaciones', '/emociones', '/newsletters', '/categorias-publicaciones'],
  },
  {
    id: 'admin.solicitudes',
    label: 'Bandeja de solicitudes',
    description: 'Bandeja, envío a audiencia y estados',
    routes: ['/solicitudes', '/estados-solicitud', '/enviar-solicitud'],
  },
  {
    id: 'admin.tipos-solicitud',
    label: 'Plantillas de solicitud',
    description: 'Configurar tipos y campos dinámicos',
    routes: ['/tipos-solicitud'],
  },
  {
    id: 'admin.usuarios',
    label: 'Usuarios',
    description: 'Alta y edición de personas',
    routes: ['/usuarios'],
  },
  {
    id: 'admin.legajos',
    label: 'Legajos RRHH',
    description: 'Expediente de empleados (miembro puede no ser empleado)',
    routes: ['/legajos', '/catalogos-rrhh'],
  },
  {
    id: 'admin.onboarding',
    label: 'Onboarding y egreso',
    description: 'Plantillas, incorporaciones, offboarding y vínculo con encuestas',
    routes: ['/onboarding'],
  },
  {
    id: 'admin.licencias',
    label: 'Licencias y vacaciones',
    description: 'Bandeja, tipos, saldos y reportes de licencias',
    routes: ['/licencias', '/tipos-licencia'],
  },
  {
    id: 'admin.ausentismos',
    label: 'Ausentismos',
    description: 'Bandeja y reportes de ausencias',
    routes: ['/ausentismos'],
  },
  {
    id: 'admin.directorio',
    label: 'Datos útiles',
    description: 'Contactos, teléfonos, sedes y datos útiles',
    routes: ['/directorio'],
  },
  {
    id: 'admin.eventos',
    label: 'Eventos y calendario',
    description: 'Gestión de eventos, RSVP y política de calendarios externos',
    routes: ['/eventos'],
  },
  {
    id: 'admin.beneficios',
    label: 'Beneficios y billetera',
    description: 'Catálogo de beneficios, canjes, puntos y partners',
    routes: ['/beneficios'],
  },
  {
    id: 'admin.organizacion',
    label: 'Organización',
    description: 'Áreas y grupos de usuarios',
    routes: ['/organizacion'],
  },
  {
    id: 'admin.roles',
    label: 'Roles y permisos',
    description: 'Roles nombrados con capacidades de pantallas',
    routes: ['/roles'],
  },
  {
    id: 'admin.parametros',
    label: 'Parámetros',
    description: 'Parámetros tipados del tenant',
    routes: ['/parametros'],
  },
  {
    id: 'admin.comunidad',
    label: 'Comunidad',
    description: 'Branding y módulos del tenant',
    routes: ['/comunidad'],
  },
  {
    id: 'admin.menu',
    label: 'Menú dinámico',
    description: 'Editar menú de la app',
    routes: ['/menu'],
  },
  {
    id: 'admin.encuestas',
    label: 'Encuestas',
    description: 'Crear encuestas y ver resultados',
    routes: ['/encuestas'],
  },
  {
    id: 'admin.notificaciones',
    label: 'Notificaciones',
    description: 'Campañas push e in-app',
    routes: ['/notificaciones'],
  },
  {
    id: 'admin.comentarios',
    label: 'Moderación de comentarios',
    description: 'Bandeja de comentarios asistida por IA',
    routes: ['/moderacion-comentarios'],
  },
  {
    id: 'admin.saludos',
    label: 'Saludos automáticos',
    description: 'Celebraciones, cumpleaños y aniversarios',
    routes: ['/saludos'],
  },
  {
    id: 'admin.documentos',
    label: 'Documentos',
    description: 'Gestionar documentos de la comunidad',
    routes: ['/documentos'],
  },
  {
    id: 'admin.ayuda',
    label: 'Ayuda',
    description: 'FAQs y tutoriales del centro de ayuda',
    routes: ['/ayuda'],
  },
  {
    id: 'admin.politicas',
    label: 'Políticas y cumplimiento',
    description: 'Políticas corporativas versionadas y acuses',
    routes: ['/politicas'],
  },
  {
    id: 'admin.hub',
    label: 'Enlaces',
    description: 'Atajos y URLs del hub',
    routes: ['/accesos'],
  },
  {
    id: 'admin.chat',
    label: 'Moderación de chat',
    description: 'Retención, denuncias y cierre de conversaciones',
    routes: ['/chat-moderacion'],
  },
  {
    id: 'admin.workflows',
    label: 'Flujos de Aprobación',
    description: 'Diseñador de flujos y bandeja de aprobaciones',
    routes: ['/workflows'],
  },
  {
    id: 'admin.ia',
    label: 'Asistente / base de conocimientos',
    description: 'Artículos FAQ/guías/políticas que usa el chatbot',
    routes: ['/asistente-kb'],
  },
]

export function isAdminScreenCapability(cap) {
  return typeof cap === 'string' && cap.startsWith('admin.') && cap !== 'platform.admin'
}

export function capabilityForRoute(path) {
  const p = String(path || '')
  return (
    ADMIN_SCREEN_CAPABILITIES.find((c) => c.routes.some((r) => p === r || p.startsWith(`${r}/`)))?.id ||
    null
  )
}

export function hasAdminPanelAccess(user) {
  const roles = user?.roles || []
  if (roles.includes('admin') || roles.includes('platform')) return true
  return (user?.capabilities || []).some(isAdminScreenCapability)
}

export function isFullAdminUser(user) {
  const roles = user?.roles || []
  return roles.includes('admin') || roles.includes('platform')
}

export function userHasCapability(user, cap) {
  if (isFullAdminUser(user)) return true
  return (user?.capabilities || []).includes(cap)
}
