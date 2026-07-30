/**
 * Hints y remap de rutas para el asistente en canal Admin (paridad layout Hiryx).
 * Puro / testeable sin Mongo.
 */

export const ADMIN_MODULE_HINTS = [
  { keys: ['usuario', 'miembro', 'colaborador', 'empleado'], route: '/usuarios', label: 'Usuarios' },
  { keys: ['legajo'], route: '/legajos', label: 'Legajos' },
  { keys: ['solicitud', 'consulta', 'ticket', 'tramite', 'trámite'], route: '/solicitudes', label: 'Solicitudes' },
  { keys: ['publicacion', 'publicación', 'muro', 'post', 'noticia'], route: '/publicaciones', label: 'Publicaciones' },
  { keys: ['beneficio'], route: '/beneficios', label: 'Beneficios' },
  { keys: ['evento'], route: '/eventos', label: 'Eventos' },
  { keys: ['documento', 'docs', 'archivo', 'pdf'], route: '/documentos', label: 'Documentos' },
  {
    keys: ['conocimiento', 'kb', 'faq', 'asistente', 'bot', 'ayuda'],
    route: '/asistente-kb',
    label: 'Base de conocimientos',
  },
  { keys: ['menu', 'menú', 'navegacion', 'navegación'], route: '/menu', label: 'Menú' },
  { keys: ['notificacion', 'notificación', 'aviso', 'push'], route: '/notificaciones', label: 'Notificaciones' },
  { keys: ['encuesta', 'cuestionario'], route: '/encuestas', label: 'Encuestas' },
  { keys: ['licencia', 'vacacion', 'vacación', 'permiso'], route: '/licencias', label: 'Licencias' },
  { keys: ['ausencia', 'ausentismo'], route: '/ausentismos', label: 'Ausentismos' },
  { keys: ['reserva', 'sala', 'espacio', 'cochera', 'oficina'], route: '/reservas', label: 'Reservas' },
  { keys: ['workflow', 'aprobacion', 'aprobación'], route: '/workflows', label: 'Workflows' },
  { keys: ['directorio'], route: '/directorio', label: 'Directorio' },
  {
    keys: ['comunicacion', 'comunicación', 'plantilla', 'whatsapp', 'sms'],
    route: '/comunicaciones',
    label: 'Comunicaciones',
  },
  { keys: ['reporte'], route: '/reportes', label: 'Reportes' },
  { keys: ['rol', 'permiso', 'capability', 'capacidad'], route: '/roles', label: 'Roles' },
  { keys: ['parametro', 'parámetro', 'config'], route: '/parametros', label: 'Parámetros' },
  { keys: ['comunidad', 'tenant', 'branding', 'marca'], route: '/comunidad', label: 'Comunidad' },
  { keys: ['onboarding', 'ingreso', 'alta'], route: '/onboarding', label: 'Onboarding' },
  { keys: ['chat', 'moderacion', 'moderación'], route: '/chat-moderacion', label: 'Moderación de chat' },
  { keys: ['tipo de solicitud', 'tipos de solicitud'], route: '/tipos-solicitud', label: 'Tipos de solicitud' },
  { keys: ['politica', 'política'], route: '/politicas', label: 'Políticas' },
  { keys: ['acceso', 'enlace', 'hub'], route: '/accesos', label: 'Accesos' },
]

/** Rutas de la app U → equivalentes Admin. */
export const U_TO_ADMIN_HREF = {
  '/asistente': '/asistente-kb',
  '/docs': '/documentos',
  '/muro': '/publicaciones',
  '/solicitudes': '/solicitudes',
  '/licencias': '/licencias',
  '/ausencias': '/ausentismos',
  '/espacios': '/reservas',
  '/oficina': '/reservas',
  '/encuestas': '/encuestas',
  '/accesos': '/accesos',
  '/avisos': '/notificaciones',
  '/chat': '/chat-moderacion',
  '/perfil': '/usuarios',
  '/aprobaciones': '/workflows',
  '/conocimiento': '/asistente-kb',
}

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function matchAdminModuleHint(text) {
  const t = norm(text)
  for (const mod of ADMIN_MODULE_HINTS) {
    if (mod.keys.some((k) => t.includes(norm(k)))) return mod
  }
  return null
}

export function remapHrefToAdmin(href) {
  const raw = String(href || '').trim()
  if (!raw) return raw
  if (raw.startsWith('/asistente-kb') || Object.values(U_TO_ADMIN_HREF).includes(raw)) return raw
  const path = raw.split('?')[0]
  const mapped = U_TO_ADMIN_HREF[path]
  if (mapped) {
    const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
    return `${mapped}${qs}`
  }
  return raw
}

export function remapAssistantPayloadForAdmin(payload = {}) {
  const links = (payload.links || []).map((l) => ({
    ...l,
    href: remapHrefToAdmin(l.href),
  }))
  const sources = (payload.sources || []).map((s) => ({
    ...s,
    href: remapHrefToAdmin(s.href),
  }))
  return { ...payload, links, sources }
}

export function normalizeAssistantChannel(channel) {
  return String(channel || '').toLowerCase() === 'a' ? 'a' : 'u'
}
