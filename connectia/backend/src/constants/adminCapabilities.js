/** Permisos de pantallas del admin del tenant (no son feature flags del producto). */
export const ADMIN_SCREEN_CAPABILITIES = [
  {
    id: 'admin.publicaciones',
    label: 'Publicaciones',
    description: 'Crear y gestionar el muro',
    routes: ['/publicaciones', '/emociones', '/newsletters', '/categorias-publicaciones'],
    menuKeys: ['admin.pubs', 'admin.engagement', 'admin.newsletters', 'admin.postcats'],
  },
  {
    id: 'admin.solicitudes',
    label: 'Bandeja de solicitudes',
    description: 'Bandeja, envío a audiencia y estados',
    routes: ['/solicitudes', '/estados-solicitud', '/enviar-solicitud'],
    menuKeys: ['admin.requests', 'admin.reqstates', 'admin.reqsend'],
  },
  {
    id: 'admin.tipos-solicitud',
    label: 'Plantillas de solicitud',
    description: 'Configurar tipos y campos dinámicos',
    routes: ['/tipos-solicitud'],
    menuKeys: ['admin.reqtypes'],
  },
  {
    id: 'admin.usuarios',
    label: 'Usuarios',
    description: 'Alta y edición de personas',
    routes: ['/usuarios'],
    menuKeys: ['admin.users'],
  },
  {
    id: 'admin.legajos',
    label: 'Legajos RRHH',
    description: 'Expediente de empleados (miembro puede no ser empleado)',
    routes: ['/legajos', '/catalogos-rrhh'],
    menuKeys: ['admin.legajos', 'admin.hrcatalog'],
  },
  {
    id: 'admin.onboarding',
    label: 'Onboarding y egreso',
    description: 'Plantillas, incorporaciones, offboarding y vínculo con encuestas',
    routes: ['/onboarding'],
    menuKeys: ['admin.onboarding'],
  },
  {
    id: 'admin.licencias',
    label: 'Licencias y vacaciones',
    description: 'Bandeja, tipos, saldos y reportes de licencias',
    routes: ['/licencias', '/tipos-licencia', '/feriados'],
    menuKeys: ['admin.licencias', 'admin.tipos-licencia', 'admin.feriados'],
  },
  {
    id: 'admin.ausentismos',
    label: 'Ausentismos',
    description: 'Bandeja y reportes de ausencias',
    routes: ['/ausentismos'],
    menuKeys: ['admin.ausentismos'],
  },
  {
    id: 'admin.directorio',
    label: 'Datos útiles',
    description: 'Contactos, teléfonos, sedes y datos útiles',
    routes: ['/directorio'],
    menuKeys: ['admin.directorio'],
  },
  {
    id: 'admin.eventos',
    label: 'Eventos y calendario',
    description: 'Gestión de eventos, RSVP y política de calendarios externos',
    routes: ['/eventos'],
    menuKeys: ['admin.eventos'],
  },
  {
    id: 'admin.beneficios',
    label: 'Beneficios y billetera',
    description: 'Catálogo de beneficios, canjes, puntos y partners',
    routes: ['/beneficios'],
    menuKeys: ['admin.beneficios'],
  },
  {
    id: 'admin.reservas',
    label: 'Reserva de espacios',
    description: 'Sedes, salas, cocheras, puestos y políticas de coworking',
    routes: ['/reservas'],
    menuKeys: ['admin.reservas'],
  },
  {
    id: 'admin.asistencia',
    label: 'Asistencia y turnos',
    description: 'Lugares con geocerca, turnos, marcas GPS y novedades',
    routes: ['/asistencia'],
    menuKeys: ['admin.asistencia'],
  },
  {
    id: 'admin.comunicaciones',
    label: 'Centro de comunicaciones',
    description: 'Tipos, plantillas IA y envíos multi-canal (email / WhatsApp / SMS)',
    routes: ['/comunicaciones'],
    menuKeys: ['admin.comunicaciones'],
  },
  {
    id: 'admin.talento',
    label: 'Talento',
    description: 'OKRs, desempeño, LMS, carrera y vacantes internas',
    routes: ['/talento'],
    menuKeys: ['admin.talento'],
  },
  {
    id: 'admin.cultura',
    label: 'Cultura empresarial',
    description: 'Reconocimientos, marketplace, referidos y pulso',
    routes: ['/cultura'],
    menuKeys: ['admin.cultura'],
  },
  {
    id: 'admin.supervision',
    label: 'Supervisión comercial',
    description: 'ABM clientes/salas, plantillas checklist y roles de campo',
    routes: ['/supervision'],
    menuKeys: ['admin.supervision'],
  },
  {
    id: 'admin.equipos',
    label: 'Equipos (supervisor)',
    description: 'Alcance Mi equipo: áreas, grupos, personas y clientes',
    routes: ['/equipos'],
    menuKeys: ['admin.equipos'],
  },
  {
    id: 'admin.organizacion',
    label: 'Organización',
    description: 'Áreas, grupos y organigrama',
    routes: ['/organizacion'],
    menuKeys: ['admin.org'],
  },
  {
    id: 'admin.reportes',
    label: 'Reportes e informes',
    description: 'Adopción, muro, encuestas y trámites',
    routes: ['/reportes'],
    menuKeys: ['admin.reportes'],
  },
  {
    id: 'admin.roles',
    label: 'Roles y permisos',
    description: 'Roles nombrados con capacidades de pantallas',
    routes: ['/roles'],
    menuKeys: ['admin.roles', 'roles'],
  },
  {
    id: 'admin.parametros',
    label: 'Parámetros',
    description: 'Parámetros tipados del tenant',
    routes: ['/parametros'],
    menuKeys: ['admin.params', 'parametros'],
  },
  {
    id: 'admin.comunidad',
    label: 'Comunidad',
    description: 'Branding y módulos del tenant',
    routes: ['/comunidad'],
    menuKeys: ['admin.tenants'],
  },
  {
    id: 'admin.menu',
    label: 'Menú dinámico',
    description: 'Editar menú de la app',
    routes: ['/menu'],
    menuKeys: ['admin.menu'],
  },
  {
    id: 'admin.encuestas',
    label: 'Encuestas',
    description: 'Crear encuestas y ver resultados',
    routes: ['/encuestas'],
    menuKeys: ['admin.surveys'],
  },
  {
    id: 'admin.relevamientos',
    label: 'Relevamientos de campo',
    description: 'Formularios, rutas, agenda diaria y tablero de campo (add-on Ola 37)',
    routes: ['/relevamientos'],
    menuKeys: ['admin.relevamientos'],
  },
  {
    id: 'admin.pedidos',
    label: 'Alarmas',
    description: 'Bandeja, categorías, artículos y mapa de alarmas/pedidos (Ola 25)',
    routes: ['/pedidos'],
    menuKeys: ['admin.pedidos'],
  },
  {
    id: 'admin.servicios',
    label: 'Gestión de servicios',
    description: 'Catálogo, bandeja de agentes y SLA del portal (Ola 43)',
    routes: ['/servicios'],
    menuKeys: ['admin.servicios'],
  },
  {
    id: 'admin.tv',
    label: 'Modo TV',
    description: 'Dispositivos, playlists y emparejamiento de pantallas de sede (Ola 26)',
    routes: ['/modo-tv'],
    menuKeys: ['admin.tv'],
  },
  {
    id: 'admin.live',
    label: 'Live streaming',
    description: 'Broadcasts por URL externa a la comunidad (Ola 26 Track B)',
    routes: ['/live'],
    menuKeys: ['admin.live'],
  },
  {
    id: 'admin.notificaciones',
    label: 'Notificaciones',
    description: 'Campañas push e in-app',
    routes: ['/notificaciones'],
    menuKeys: ['admin.notifications', 'notificaciones'],
  },
  {
    id: 'admin.comentarios',
    label: 'Moderación de comentarios',
    description: 'Bandeja de comentarios asistida por IA',
    routes: ['/moderacion-comentarios'],
    menuKeys: ['admin.comentarios', 'moderacion-comentarios'],
  },
  {
    id: 'admin.saludos',
    label: 'Saludos automáticos',
    description: 'Celebraciones, cumpleaños y aniversarios',
    routes: ['/saludos'],
    menuKeys: ['admin.saludos', 'saludos'],
  },
  {
    id: 'admin.documentos',
    label: 'Documentos',
    description: 'Gestionar documentos de la comunidad',
    routes: ['/documentos'],
    menuKeys: ['admin.docs'],
  },
  {
    id: 'admin.ayuda',
    label: 'Ayuda',
    description: 'FAQs y tutoriales del centro de ayuda',
    routes: ['/ayuda'],
    menuKeys: ['admin.ayuda'],
  },
  {
    id: 'admin.politicas',
    label: 'Políticas y cumplimiento',
    description: 'Políticas corporativas versionadas y acuses',
    routes: ['/politicas'],
    menuKeys: ['admin.politicas'],
  },
  {
    id: 'admin.hub',
    label: 'Enlaces',
    description: 'Atajos y URLs del hub',
    routes: ['/accesos'],
    menuKeys: ['admin.hub'],
  },
  {
    id: 'admin.chat',
    label: 'Moderación de chat',
    description: 'Retención, denuncias y cierre de conversaciones',
    routes: ['/chat-moderacion'],
    menuKeys: ['admin.chatmod'],
  },
  {
    id: 'admin.workflows',
    label: 'Flujos de Aprobación',
    description: 'Diseñador de flujos y bandeja de aprobaciones',
    routes: ['/workflows'],
    menuKeys: ['admin.workflows'],
  },
  {
    id: 'admin.ia',
    label: 'Asistente / base de conocimientos',
    description: 'Artículos FAQ/guías/políticas que usa el chatbot',
    routes: ['/asistente-kb'],
    menuKeys: ['admin.kb', 'asistente-kb'],
  },
]

export const ADMIN_SCREEN_IDS = ADMIN_SCREEN_CAPABILITIES.map((c) => c.id)

export const ADMIN_CAP_PREFIX = 'admin.'

export function isAdminScreenCapability(cap) {
  return typeof cap === 'string' && cap.startsWith(ADMIN_CAP_PREFIX) && cap !== 'platform.admin'
}

export function sanitizeAdminCapabilities(list) {
  const allowed = new Set(ADMIN_SCREEN_IDS)
  return [...new Set((Array.isArray(list) ? list : []).filter((c) => allowed.has(c)))]
}

export function capabilityForRoute(path) {
  const p = String(path || '')
  return ADMIN_SCREEN_CAPABILITIES.find((c) => c.routes.some((r) => p === r || p.startsWith(`${r}/`)))?.id || null
}

export function capabilityForMenuKey(key) {
  return ADMIN_SCREEN_CAPABILITIES.find((c) => c.menuKeys.includes(key))?.id || null
}
