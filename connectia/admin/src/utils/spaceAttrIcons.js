/** Iconos compactos para atributos de activos (visión rápida + tooltip). */
export const SPACE_ATTR_ICONS = {
  wifi: { glyph: '⌁', label: 'WiFi' },
  hdmi: { glyph: 'HDMI', label: 'HDMI', compact: true },
  videollamada: { glyph: '◎', label: 'Videollamada' },
  proyector: { glyph: '▣', label: 'Proyector' },
  pizarra: { glyph: '▤', label: 'Pizarra' },
  monitor: { glyph: '▭', label: 'Monitor' },
  '4k': { glyph: '4K', label: '4K', compact: true },
  portatil: { glyph: '◫', label: 'Portátil' },
  accesible: { glyph: '♿', label: 'Accesible' },
  marca: { glyph: '◈', label: 'Marca' },
  potencia: { glyph: '⚡', label: 'Potencia' },
}

export function attrIconMeta(key) {
  const k = String(key || '').toLowerCase()
  return SPACE_ATTR_ICONS[k] || { glyph: '•', label: k || 'Atributo' }
}

export function attrTooltip(attr, labelFn) {
  const key = attr?.key || ''
  const label = typeof labelFn === 'function' ? labelFn(key) : key
  const value = String(attr?.value || '').trim()
  if (value) return `${label}: ${value}`
  return label
}
