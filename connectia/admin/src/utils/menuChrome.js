/** Iconos de MenuItem (nombres cortos) → Font Awesome. */
const MAP = {
  home: 'fas fa-home',
  inbox: 'fas fa-inbox',
  megaphone: 'fas fa-bullhorn',
  users: 'fas fa-users',
  user: 'fas fa-user',
  grid: 'fas fa-th-large',
  file: 'fas fa-file-alt',
  calendar: 'fas fa-calendar-alt',
  clipboard: 'fas fa-clipboard-list',
  chart: 'fas fa-chart-bar',
  building: 'fas fa-building',
  menu: 'fas fa-bars',
  sparkles: 'fas fa-magic',
  tag: 'fas fa-tags',
  bookmark: 'fas fa-bookmark',
  chat: 'fas fa-comments',
  circle: 'fas fa-circle',
  flow: 'fas fa-project-diagram',
  newspaper: 'fas fa-newspaper',
  bell: 'fas fa-bell',
  cog: 'fas fa-cog',
  settings: 'fas fa-cog',
  star: 'fas fa-star',
  heart: 'fas fa-heart',
  lock: 'fas fa-lock',
  key: 'fas fa-key',
  search: 'fas fa-search',
  list: 'fas fa-list',
  map: 'fas fa-map-marked-alt',
  shield: 'fas fa-shield-alt',
  sliders: 'fas fa-sliders-h',
  help: 'fas fa-question-circle',
  mail: 'fas fa-envelope',
  gift: 'fas fa-gift',
  compass: 'fas fa-compass',
  book: 'fas fa-book',
  image: 'fas fa-images',
  video: 'fas fa-video',
  check: 'fas fa-check-circle',
  clock: 'fas fa-clock',
  plane: 'fas fa-plane-departure',
  umbrella: 'fas fa-umbrella-beach',
  wallet: 'fas fa-wallet',
  link: 'fas fa-link',
  robot: 'fas fa-robot',
  layer: 'fas fa-layer-group',
  filter: 'fas fa-filter',
  edit: 'fas fa-edit',
  eye: 'fas fa-eye',
  ban: 'fas fa-ban',
  flag: 'fas fa-flag',
  trophy: 'fas fa-trophy',
  handshake: 'fas fa-handshake',
  idcard: 'fas fa-id-card',
  briefcase: 'fas fa-briefcase',
  chartline: 'fas fa-chart-line',
  database: 'fas fa-database',
  plug: 'fas fa-plug',
  tools: 'fas fa-tools',
  wrench: 'fas fa-wrench',
}

/** Fallback por ruta cuando el ítem no trae icono útil. */
const ROUTE_FA = {
  '/': 'fas fa-home',
  '/usuarios': 'fas fa-users',
  '/suscriptores': 'fas fa-building',
  '/legajos': 'fas fa-id-card',
  '/catalogos-rrhh': 'fas fa-tags',
  '/onboarding': 'fas fa-user-plus',
  '/talento': 'fas fa-graduation-cap',
  '/cultura': 'fas fa-hands-helping',
  '/organizacion': 'fas fa-sitemap',
  '/roles': 'fas fa-user-shield',
  '/parametros': 'fas fa-sliders-h',
  '/solicitudes': 'fas fa-inbox',
  '/enviar-solicitud': 'fas fa-paper-plane',
  '/tipos-solicitud': 'fas fa-file-alt',
  '/estados-solicitud': 'fas fa-flag',
  '/workflows': 'fas fa-project-diagram',
  '/licencias': 'fas fa-umbrella-beach',
  '/tipos-licencia': 'fas fa-tags',
  '/feriados': 'fas fa-calendar-day',
  '/ausentismos': 'fas fa-user-clock',
  '/publicaciones': 'fas fa-newspaper',
  '/stories': 'fas fa-camera',
  '/categorias-publicaciones': 'fas fa-folder-open',
  '/newsletters': 'fas fa-envelope-open-text',
  '/comunicaciones': 'fas fa-broadcast-tower',
  '/emociones': 'fas fa-heart',
  '/encuestas': 'fas fa-poll',
  '/notificaciones': 'fas fa-bell',
  '/saludos': 'fas fa-smile',
  '/moderacion-comentarios': 'fas fa-comments',
  '/chat-moderacion': 'fas fa-comment-dots',
  '/documentos': 'fas fa-folder',
  '/directorio': 'fas fa-address-book',
  '/eventos': 'fas fa-calendar-check',
  '/beneficios': 'fas fa-gift',
  '/reservas': 'fas fa-door-open',
  '/asistencia': 'fas fa-user-clock',
  '/ayuda': 'fas fa-question-circle',
  '/politicas': 'fas fa-balance-scale',
  '/accesos': 'fas fa-th-large',
  '/menu': 'fas fa-bars',
  '/comunidad': 'fas fa-building',
  '/reportes': 'fas fa-chart-bar',
  '/modo-tv': 'fas fa-tv',
  '/live': 'fas fa-broadcast-tower',
  '/pedidos': 'fas fa-clipboard-list',
  '/asistente-kb': 'fas fa-book',
  '/relevamientos': 'fas fa-map-marked-alt',
  '/asistencia': 'fas fa-robot',
  '/integraciones': 'fas fa-plug',
}

/** Iconos de sección del mapa del sitio. */
export const GROUP_HEADER_FA = {
  solicitudes: 'fas fa-inbox',
  licencias: 'fas fa-umbrella-beach',
  personas: 'fas fa-users',
  empleados: 'fas fa-id-card',
  negocio: 'fas fa-briefcase',
  contenido: 'fas fa-newspaper',
  analisis: 'fas fa-chart-bar',
  recursos: 'fas fa-folder',
  herramientas: 'fas fa-toolbox',
  config: 'fas fa-cog',
  configuracion: 'fas fa-cog',
  inicio: 'fas fa-home',
}

/**
 * @param {string} [icon]
 * @returns {string} clases FA
 */
export function menuIconToFa(icon) {
  if (!icon) return ''
  const s = String(icon).trim()
  if (!s || s === 'circle') return ''
  if (s.startsWith('fa ') || s.startsWith('fas ') || s.startsWith('far ') || s.startsWith('fab ')) return s
  return MAP[s] || ''
}

/**
 * Icono representativo para un ítem de menú (mapa / sidebar / header).
 * @param {{ icon?: string, route?: string, key?: string }} item
 */
export function resolveMenuFaIcon(item) {
  const fromIcon = menuIconToFa(item?.icon)
  if (fromIcon) return fromIcon
  const route = String(item?.route || '').split('?')[0]
  if (ROUTE_FA[route]) return ROUTE_FA[route]
  // Prefijos comunes
  if (route.startsWith('/solicitud')) return 'fas fa-inbox'
  if (route.startsWith('/licencia')) return 'fas fa-umbrella-beach'
  if (route.startsWith('/publicacion') || route.startsWith('/muro')) return 'fas fa-newspaper'
  if (route.startsWith('/encuesta')) return 'fas fa-poll'
  if (route.startsWith('/doc')) return 'fas fa-folder'
  if (route.startsWith('/chat')) return 'fas fa-comments'
  if (route.startsWith('/report')) return 'fas fa-chart-bar'
  return 'fas fa-circle'
}

/** Rutas que históricamente iban al header si el backend aún no tiene el flag. */
export const DEFAULT_ADMIN_HEADER_ROUTES = ['/usuarios', '/publicaciones', '/solicitudes']
/** Rutas que históricamente iban al sidebar. */
export const DEFAULT_ADMIN_SIDEBAR_ROUTES = ['/reportes']

export function withAdminChromeDefaults(item) {
  const route = item?.route || ''
  const hasSidebar = typeof item?.showInAdminSidebar === 'boolean'
  const hasHeader = typeof item?.showInAdminHeader === 'boolean'
  return {
    ...item,
    showInAdminSidebar: hasSidebar
      ? item.showInAdminSidebar
      : DEFAULT_ADMIN_SIDEBAR_ROUTES.includes(route),
    showInAdminHeader: hasHeader
      ? item.showInAdminHeader
      : DEFAULT_ADMIN_HEADER_ROUTES.includes(route),
  }
}
