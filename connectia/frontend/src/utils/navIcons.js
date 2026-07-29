/** Iconos SVG mínimos para la botonera U (sin deps). */
export const NAV_ICONS = {
  muro: 'home',
  home: 'home',
  'mis-publicaciones': 'inbox',
  solicitudes: 'inbox',
  aprobaciones: 'check',
  check: 'check',
  encuestas: 'clipboard',
  docs: 'file',
  ayuda: 'help',
  help: 'help',
  politicas: 'shield',
  shield: 'shield',
  hub: 'grid',
  accesos: 'grid',
  chat: 'chat',
  guardados: 'bookmark',
  bookmark: 'bookmark',
  perfil: 'user',
  user: 'user',
  avisos: 'bell',
  bell: 'bell',
  asistente: 'sparkles',
  sparkles: 'sparkles',
  'mi-legajo': 'file',
  bienvenida: 'sparkles',
  directorio: 'grid',
  licencias: 'clipboard',
  ausencias: 'list',
  ausentismos: 'list',
  clipboard: 'clipboard',
  list: 'list',
  more: 'menu',
}

export function iconFor(key, iconHint) {
  if (iconHint && NAV_ICONS[iconHint]) return NAV_ICONS[iconHint]
  const k = String(key || '').toLowerCase()
  for (const [id, name] of Object.entries(NAV_ICONS)) {
    if (k.includes(id)) return name
  }
  return 'dot'
}
