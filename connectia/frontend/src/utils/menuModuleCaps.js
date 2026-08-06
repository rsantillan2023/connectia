/**
 * Menú U ↔ módulos del catálogo (espejo de backend moduleCatalog).
 * Ítems sin mapeo (ayuda, perfil, directorio…) no se ocultan por pack.
 */

const USER_MENU_MODULE_BY_KEY = {
  muro: 'muro',
  'mis-publicaciones': 'muro',
  guardados: 'muro',
  solicitudes: 'solicitudes',
  licencias: 'licencias',
  ausencias: 'ausentismos',
  encuestas: 'encuestas',
  docs: 'docs',
  hub: 'hub',
  beneficios: 'beneficios',
  'beneficios.earn': 'beneficios.billetera',
  espacios: 'espacios',
  oficina: 'espacios.coworking',
  chat: 'chat',
  servicios: 'servicios',
  pedidos: 'pedidos',
  alarma: 'pedidos',
}

export function catalogModuleForUserMenuItem(item) {
  const key = String(item?.key || '').trim()
  if (key && USER_MENU_MODULE_BY_KEY[key]) return USER_MENU_MODULE_BY_KEY[key]

  const route = String(item?.route || '')
    .split('?')[0]
    .replace(/\/$/, '')
  if (route === '/muro' || route.startsWith('/muro/') || route === '/guardados') return 'muro'
  if (route === '/solicitudes' || route.startsWith('/solicitudes/')) return 'solicitudes'
  if (route === '/licencias' || route.startsWith('/licencias/')) return 'licencias'
  if (route === '/ausencias' || route.startsWith('/ausencias/')) return 'ausentismos'
  if (route === '/encuestas' || route.startsWith('/encuestas/')) return 'encuestas'
  if (route === '/docs' || route.startsWith('/docs/')) return 'docs'
  if (route === '/accesos' || route.startsWith('/accesos/')) return 'hub'
  if (route.startsWith('/beneficios')) {
    if (String(item?.route || '').includes('tab=earn') || key === 'beneficios.earn') {
      return 'beneficios.billetera'
    }
    return 'beneficios'
  }
  if (route === '/espacios' || route.startsWith('/espacios/')) return 'espacios'
  if (route === '/oficina' || route.startsWith('/oficina/')) return 'espacios.coworking'
  if (route === '/chat' || route.startsWith('/chat/')) return 'chat'
  if (route === '/servicios' || route.startsWith('/servicios/')) return 'servicios'
  if (route === '/pedidos' || route.startsWith('/pedidos/') || route === '/alarma') return 'pedidos'
  return null
}

export function isUserMenuItemAllowed(item, capsSet) {
  const mod = catalogModuleForUserMenuItem(item)
  if (!mod) return true
  if (!capsSet || typeof capsSet.has !== 'function') return true
  return capsSet.has(mod)
}

export function filterMenuByActiveModules(items, capsList) {
  const caps = new Set(Array.isArray(capsList) ? capsList : [])
  if (!caps.size) return items
  return (items || []).filter((item) => isUserMenuItemAllowed(item, caps))
}
