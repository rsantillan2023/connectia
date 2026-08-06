/** Feed del muro (clásico o skin portal borrador). No incluye detalle ni /muro/mias. */
export function isMuroFeedPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/$/, '') || '/'
  return p === '/muro' || p === '/muro/portal'
}
