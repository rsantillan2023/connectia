/** Espejo del catálogo de kinds del backend (labels UI). */
export const HUB_KINDS = [
  { id: 'url', label: 'URL externa', short: 'URL', hint: 'Abre un sitio en nueva pestaña', group: 'Web' },
  { id: 'webview', label: 'Webview in-app', short: 'Webview', hint: 'Muestra la URL dentro de Connectia', group: 'Web' },
  { id: 'route', label: 'Ruta interna', short: 'Ruta', hint: 'Navega a una pantalla de la app', group: 'App' },
  { id: 'request', label: 'Nueva solicitud', short: 'Solicitud', hint: 'Abre el alta de un tipo de solicitud', group: 'App' },
  { id: 'survey', label: 'Encuesta', short: 'Encuesta', hint: 'Va a una encuesta concreta', group: 'App' },
  { id: 'document', label: 'Documento', short: 'Documento', hint: 'Abre o descarga un documento', group: 'App' },
  { id: 'post', label: 'Publicación', short: 'Publicación', hint: 'Abre un post del muro', group: 'App' },
  { id: 'mailto', label: 'Correo (mailto)', short: 'Correo', hint: 'Compone un email', group: 'Contacto' },
  { id: 'tel', label: 'Teléfono', short: 'Teléfono', hint: 'Inicia una llamada', group: 'Contacto' },
  { id: 'whatsapp', label: 'WhatsApp', short: 'WhatsApp', hint: 'Abre chat con mensaje opcional', group: 'Contacto' },
  { id: 'copy', label: 'Copiar texto', short: 'Copiar', hint: 'Copia un código o texto al portapapeles', group: 'Utilidad' },
  { id: 'sso', label: 'SSO / adaptador', short: 'SSO', hint: 'Abre destino vía adaptador SSO (secreto en servidor)', group: 'Integraciones' },
]

export function normalizeKindId(id) {
  if (id === 'external') return 'url'
  if (id === 'internal') return 'route'
  return id || 'url'
}

export function kindMeta(id) {
  const k = normalizeKindId(id)
  return HUB_KINDS.find((x) => x.id === k) || HUB_KINDS[0]
}

export function kindLabel(id) {
  return kindMeta(id).label
}

export function kindShort(id) {
  return kindMeta(id).short || kindMeta(id).label
}

export const HUB_KIND_GROUPS = ['Web', 'App', 'Contacto', 'Utilidad', 'Integraciones']
