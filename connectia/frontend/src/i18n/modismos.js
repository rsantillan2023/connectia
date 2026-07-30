/**
 * Diccionario liviano de modismos (Ola 36-o).
 * Sin vue-i18n: overlay de ~strings clave sobre español rioplatense (es-AR).
 */
const CL = {
  'Hola,': 'Hola,',
  Avisos: 'Avisos',
  Buscar: 'Buscar',
  Muro: 'Muro',
  Chat: 'Chat',
  Asistente: 'Asistente',
  Menú: 'Menú',
  'Mis puntos': 'Mis puntos',
  'Cómo sumar': 'Cómo sumar',
  'Cómo sumar puntos': 'Cómo sumar puntos',
  Beneficios: 'Beneficios',
  pts: 'pts',
  'Tenés': 'Tenís',
  'Quedá': 'Quedai',
  'Publicá': 'Publicá',
  'Guardá': 'Guardá',
  'Cancelá': 'Cancelá',
  'Reservá': 'Reservá',
  'Marcá': 'Marcá',
  'Ingresá': 'Ingresá',
  'Elegí': 'Elegí',
  'Pedí': 'Pedí',
  'Vos': 'Tú',
  'tu equipo': 'tu equipo',
  Novedades: 'Novedades',
  'Home alternativa': 'Inicio alternativo',
  'Usar home clásica': 'Usar home clásica',
  'Usar home moderna': 'Usar home moderna',
}

export function translateUi(text, locale = 'es-AR') {
  if (!text) return text
  if (locale !== 'es-CL') return text
  if (CL[text] != null) return CL[text]
  // Reemplazos parciales comunes
  return String(text)
    .replace(/\bTenés\b/g, 'Tenís')
    .replace(/\bQuedás\b/g, 'Quedai')
    .replace(/\bvos\b/gi, (m) => (m[0] === 'V' ? 'Tú' : 'tú'))
}

export function uiLocaleFromTenant(tenant) {
  return tenant?.uiLocale === 'es-CL' ? 'es-CL' : 'es-AR'
}
