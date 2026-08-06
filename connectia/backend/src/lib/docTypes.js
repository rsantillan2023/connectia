/**
 * Tipos de archivo y repositorios de documentos Connectia.
 */

export const DOC_FILE_TYPES = [
  { id: 'pdf', label: 'PDF', extensions: ['.pdf'], mime: ['application/pdf'] },
  {
    id: 'image',
    label: 'Imagen',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    mime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  },
  {
    id: 'word',
    label: 'Word',
    extensions: ['.doc', '.docx'],
    mime: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    id: 'excel',
    label: 'Excel',
    extensions: ['.xls', '.xlsx', '.csv'],
    mime: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
  {
    id: 'powerpoint',
    label: 'PowerPoint',
    extensions: ['.ppt', '.pptx'],
    mime: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  {
    id: 'text',
    label: 'Texto',
    extensions: ['.txt', '.rtf', '.md'],
    mime: ['text/plain', 'application/rtf', 'text/markdown'],
  },
  { id: 'other', label: 'Otro', extensions: [], mime: [] },
]

/**
 * Repositorios posibles.
 * - server / url / sap: operativos hoy
 * - s3 / azure_blob: listos para config (stub si no hay credenciales)
 * - sharepoint / gdrive / onedrive: modo enlace (como URL) + futuro OAuth
 */
export const DOC_REPOSITORIES = [
  {
    id: 'server',
    label: 'Servidor (local)',
    description: 'Archivo subido y guardado en el servidor Connectia (/uploads/documents).',
    needsUpload: true,
    needsUrl: false,
    implemented: true,
  },
  {
    id: 'url',
    label: 'URL externa',
    description: 'Link directo a un archivo público o accesible por la red.',
    needsUpload: false,
    needsUrl: true,
    implemented: true,
  },
  {
    id: 's3',
    label: 'Amazon S3',
    description: 'Bucket S3. Guardá la key o URL; con credenciales se pueden firmar descargas.',
    needsUpload: false,
    needsUrl: true,
    needsStorageKey: true,
    implemented: 'partial',
  },
  {
    id: 'azure_blob',
    label: 'Azure Blob',
    description: 'Contenedor Azure Blob Storage (URL o path del blob).',
    needsUpload: false,
    needsUrl: true,
    needsStorageKey: true,
    implemented: 'partial',
  },
  {
    id: 'sap',
    label: 'SAP',
    description: 'Documentos sincronizados desde SAP (sync admin).',
    needsUpload: false,
    needsUrl: true,
    implemented: true,
    syncOnly: true,
  },
  {
    id: 'sharepoint',
    label: 'SharePoint',
    description: 'Enlace de SharePoint/OneDrive for Business (modo link hoy; OAuth Graph después).',
    needsUpload: false,
    needsUrl: true,
    implemented: 'link',
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    description: 'Enlace compartido de OneDrive.',
    needsUpload: false,
    needsUrl: true,
    implemented: 'link',
  },
  {
    id: 'gdrive',
    label: 'Google Drive',
    description: 'Enlace compartido de Google Drive.',
    needsUpload: false,
    needsUrl: true,
    implemented: 'link',
  },
]

export const DOC_FILE_TYPE_IDS = DOC_FILE_TYPES.map((t) => t.id)
export const DOC_REPOSITORY_IDS = DOC_REPOSITORIES.map((r) => r.id)

/** Browsers often report OOXML (docx/xlsx/pptx) as zip. */
const UNRELIABLE_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'multipart/x-zip',
  'application/octet-stream',
  '',
])

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  '.md': 'text/markdown',
}

const OFFICE_EXT = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'])

export function extFromName(nameOrUrl = '') {
  const s = String(nameOrUrl).split('?')[0].split('#')[0]
  const m = s.match(/(\.[a-z0-9]{1,8})$/i)
  return m ? m[1].toLowerCase() : ''
}

export function mimeFromExt(extOrName = '') {
  const ext = String(extOrName || '').startsWith('.')
    ? String(extOrName).toLowerCase()
    : extFromName(extOrName)
  return MIME_BY_EXT[ext] || ''
}

/**
 * Corrige MIME engañoso (zip/octet) usando la extensión real del archivo.
 * Evita que .docx/.xlsx/.pptx se traten como ZIP al abrir/previewear.
 */
export function normalizeDocMime({ mimeType = '', fileName = '', fileUrl = '' } = {}) {
  const ext = extFromName(fileName) || extFromName(fileUrl)
  const fromExt = mimeFromExt(ext)
  const mime = String(mimeType || '').toLowerCase().trim()
  if (fromExt && (UNRELIABLE_MIME.has(mime) || (OFFICE_EXT.has(ext) && mime.includes('zip')))) {
    return fromExt
  }
  return mime || fromExt || 'application/octet-stream'
}

export function inferFileType({ mimeType = '', fileName = '', fileUrl = '' } = {}) {
  const ext = extFromName(fileName) || extFromName(fileUrl)
  const mime = normalizeDocMime({ mimeType, fileName, fileUrl })

  // Extensión Office primero: el MIME suele venir como application/zip
  if (ext && OFFICE_EXT.has(ext)) {
    for (const t of DOC_FILE_TYPES) {
      if (t.extensions.includes(ext)) return t.id
    }
  }

  if (mime.startsWith('image/')) return 'image'
  for (const t of DOC_FILE_TYPES) {
    if (t.id === 'other') continue
    if (mime && t.mime.includes(mime)) return t.id
  }
  for (const t of DOC_FILE_TYPES) {
    if (t.id === 'other') continue
    if (ext && t.extensions.includes(ext)) return t.id
  }
  return 'other'
}

export function normalizeRepository(raw) {
  const id = String(raw || 'url').trim().toLowerCase()
  return DOC_REPOSITORY_IDS.includes(id) ? id : 'url'
}

export function normalizeFileType(raw, hints = {}) {
  const id = String(raw || '').trim().toLowerCase()
  const ext = extFromName(hints.fileName) || extFromName(hints.fileUrl)
  // Si la extensión es Office, confiar en ella (evita "other"/zip heredado)
  if (OFFICE_EXT.has(ext)) {
    return inferFileType(hints)
  }
  if (DOC_FILE_TYPE_IDS.includes(id)) return id
  return inferFileType(hints)
}

export function fileTypeLabel(id) {
  return DOC_FILE_TYPES.find((t) => t.id === id)?.label || 'Otro'
}

export function repositoryLabel(id) {
  return DOC_REPOSITORIES.find((r) => r.id === id)?.label || id || 'URL'
}

/** Meta para el admin (selectores). */
export function documentsMeta() {
  return {
    fileTypes: DOC_FILE_TYPES.map(({ id, label, extensions }) => ({ id, label, extensions })),
    repositories: DOC_REPOSITORIES.map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      needsUpload: Boolean(r.needsUpload),
      needsUrl: Boolean(r.needsUrl),
      needsStorageKey: Boolean(r.needsStorageKey),
      implemented: r.implemented,
      syncOnly: Boolean(r.syncOnly),
    })),
  }
}
