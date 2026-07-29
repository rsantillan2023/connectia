/**
 * Resolución de URL de descarga según repositorio.
 * S3/Azure: si hay config + SDK futuro, firmar; hoy usa fileUrl guardada.
 */
export function s3Configured() {
  return Boolean(
    process.env.S3_BUCKET &&
      (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.S3_ENDPOINT),
  )
}

export function azureBlobConfigured() {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_ACCOUNT)
}

/**
 * @param {object} doc
 * @returns {{ fileUrl: string, repository: string, note?: string }}
 */
export function resolveDocumentDownload(doc) {
  const repository = doc?.repository || (doc?.source === 'sap' ? 'sap' : 'url')
  const fileUrl = String(doc?.fileUrl || '').trim()
  if (!fileUrl && !doc?.storageKey) {
    return { fileUrl: '', repository, note: 'Sin URL ni storageKey' }
  }

  if (repository === 's3') {
    if (!s3Configured()) {
      return {
        fileUrl,
        repository,
        note: fileUrl
          ? 'S3 sin credenciales: se usa la URL guardada'
          : 'S3 no configurado (S3_BUCKET / AWS_*)',
      }
    }
    // Futuro: presign con @aws-sdk/s3-request-presigner usando storageKey
    return { fileUrl: fileUrl || '', repository, note: 'S3: URL directa / pendiente firmar' }
  }

  if (repository === 'azure_blob') {
    if (!azureBlobConfigured()) {
      return {
        fileUrl,
        repository,
        note: fileUrl
          ? 'Azure Blob sin credenciales: se usa la URL guardada'
          : 'Azure Blob no configurado',
      }
    }
    return { fileUrl: fileUrl || '', repository, note: 'Azure: URL directa / pendiente SAS' }
  }

  return { fileUrl, repository }
}

export function storageStatus() {
  return {
    server: true,
    url: true,
    sap: true,
    s3: s3Configured(),
    azure_blob: azureBlobConfigured(),
    sharepoint: 'link',
    onedrive: 'link',
    gdrive: 'link',
  }
}
