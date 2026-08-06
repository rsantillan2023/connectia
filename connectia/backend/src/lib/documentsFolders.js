/** Marcador de carpeta vacía (no es un archivo descargable). */
export const FOLDER_MARKER_SOURCE = 'folder-marker'
export const FOLDER_MARKER_URL = 'connectia://folder'

/** Normaliza rutas de carpeta: " RRHH / Recibos " → "RRHH/Recibos" */
export function normalizeFolderPath(raw) {
  return String(raw || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

export function isFolderMarker(doc) {
  return (
    String(doc?.source || '') === FOLDER_MARKER_SOURCE ||
    String(doc?.fileUrl || '') === FOLDER_MARKER_URL
  )
}

/** Nombre de un segmento (sin / ni ..). */
export function sanitizeFolderSegment(raw) {
  const name = String(raw || '')
    .replace(/[\\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name || name === '.' || name === '..') return ''
  return name.slice(0, 80)
}

/** Une padre + nombre → ruta normalizada, o null si el nombre es inválido. */
export function joinFolderPath(parent, name) {
  const seg = sanitizeFolderSegment(name)
  if (!seg) return null
  const base = normalizeFolderPath(parent)
  return base ? `${base}/${seg}` : seg
}

export function folderMarkerExternalId(path) {
  return `folder:${normalizeFolderPath(path)}`
}

/**
 * Agrupa categorías planas (con /) en carpetas hijas inmediatas bajo `prefix`.
 * Los marcadores de carpeta vacía cuentan para crear la carpeta pero no suman archivos.
 * @param {Array<{ category?: string, source?: string, fileUrl?: string }>} docs
 * @param {string} [prefix]
 * @returns {{ id: string, name: string, count: number, subCount: number }[]}
 */
export function buildChildFolders(docs, prefix = '') {
  const base = normalizeFolderPath(prefix)
  const map = new Map()

  for (const d of docs || []) {
    const cat = normalizeFolderPath(d.category || 'general') || 'general'
    let rest = cat
    if (base) {
      if (cat === base) continue
      if (!cat.startsWith(`${base}/`)) continue
      rest = cat.slice(base.length + 1)
    }
    const parts = rest.split('/').filter(Boolean)
    const next = parts[0]
    if (!next) continue
    const id = base ? `${base}/${next}` : next
    const entry = map.get(id) || { id, name: next, count: 0, _subs: new Set() }
    if (!isFolderMarker(d)) entry.count += 1
    if (parts[1]) entry._subs.add(parts[1])
    map.set(id, entry)
  }

  return [...map.values()]
    .map((f) => ({
      id: f.id,
      name: f.name,
      count: f.count,
      subCount: f._subs.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
