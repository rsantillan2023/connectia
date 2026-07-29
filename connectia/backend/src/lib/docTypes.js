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

export function extFromName(nameOrUrl = '') {
  const s = String(nameOrUrl).split('?')[0].split('#')[0]
  const m = s.match(/(\.[a-z0-9]{1,8})$/i)
  return m ? m[1].toLowerCase() : ''
}

export function inferFileType({ mimeType = '', fileName = '', fileUrl = '' } = {}) {
  const mime = String(mimeType || '').toLowerCase().trim()
  const ext = extFromName(fileName) || extFromName(fileUrl)
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
