/**
 * Extracción segura de ZIPs para import de documentos.
 */
import path from 'path'
import yauzl from 'yauzl'
import { extFromName } from './docTypes.js'

export const ZIP_DOC_ALLOWED_EXT = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.md',
])

export const ZIP_DEFAULT_LIMITS = {
  maxEntries: 200,
  maxEntryBytes: 5 * 1024 * 1024,
  maxTotalUncompressed: 80 * 1024 * 1024,
  maxZipBytes: 80 * 1024 * 1024,
}

/**
 * Normaliza y valida una ruta de entrada ZIP.
 * @returns {{ ok: true, relativePath: string, fileName: string, dirPath: string } | { ok: false, reason: string }}
 */
export function sanitizeZipEntryPath(rawName) {
  let name = String(rawName || '').replace(/\\/g, '/').trim()
  if (!name) return { ok: false, reason: 'Nombre vacío' }
  if (name.startsWith('/')) name = name.slice(1)

  const parts = name.split('/').filter((p) => p && p !== '.')
  if (!parts.length) return { ok: false, reason: 'Ruta vacía' }
  if (parts.some((p) => p === '..')) return { ok: false, reason: 'Path traversal' }
  if (parts.some((p) => p.startsWith('__MACOSX') || p === '.DS_Store')) {
    return { ok: false, reason: 'Metadato macOS' }
  }

  const relativePath = parts.join('/')
  const fileName = parts[parts.length - 1]
  const dirPath = parts.slice(0, -1).join('/')
  return { ok: true, relativePath, fileName, dirPath }
}

export function isAllowedDocEntry(fileName, { allowedExt = ZIP_DOC_ALLOWED_EXT } = {}) {
  const ext = extFromName(fileName)
  return Boolean(ext && allowedExt.has(ext))
}

/**
 * ¿Es entrada de directorio? (termina en / o tamaño 0 con nombre de carpeta)
 */
export function isZipDirectoryEntry(fileName, uncompressedSize) {
  const n = String(fileName || '').replace(/\\/g, '/')
  if (n.endsWith('/')) return true
  if (Number(uncompressedSize) === 0 && !path.extname(n)) return true
  return false
}

function streamToBuffer(stream, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    stream.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) {
        stream.destroy()
        reject(new Error(`Archivo supera el límite de ${maxBytes} bytes`))
        return
      }
      chunks.push(chunk)
    })
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

/**
 * Lee un ZIP desde Buffer y devuelve entradas de archivo válidas (con contenido).
 * @param {Buffer} buffer
 * @param {{ maxEntries?: number, maxEntryBytes?: number, maxTotalUncompressed?: number, allowedExt?: Set<string> }} [opts]
 */
export async function extractDocEntriesFromZipBuffer(buffer, opts = {}) {
  const limits = { ...ZIP_DEFAULT_LIMITS, ...opts }
  const allowedExt = opts.allowedExt || ZIP_DOC_ALLOWED_EXT

  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { ok: false, error: 'ZIP vacío o inválido', entries: [], skipped: [] }
  }
  if (buffer.length > limits.maxZipBytes) {
    return {
      ok: false,
      error: `ZIP demasiado grande (máx ${Math.round(limits.maxZipBytes / (1024 * 1024))} MB)`,
      entries: [],
      skipped: [],
    }
  }

  let zipfile
  try {
    zipfile = await yauzl.fromBufferPromise(buffer, { lazyEntries: true, validateEntrySizes: true })
  } catch (e) {
    return { ok: false, error: e?.message || 'No se pudo abrir el ZIP', entries: [], skipped: [] }
  }

  const entries = []
  const skipped = []
  let totalUncompressed = 0

  try {
    await new Promise((resolve, reject) => {
      zipfile.on('error', reject)
      zipfile.on('end', resolve)

      const next = () => zipfile.readEntry()

      zipfile.on('entry', async (entry) => {
        try {
          const rawName = entry.fileName || ''
          if (isZipDirectoryEntry(rawName, entry.uncompressedSize)) {
            skipped.push({ name: rawName, reason: 'directorio' })
            return next()
          }

          const safe = sanitizeZipEntryPath(rawName)
          if (!safe.ok) {
            skipped.push({ name: rawName, reason: safe.reason })
            return next()
          }

          if (!isAllowedDocEntry(safe.fileName, { allowedExt })) {
            skipped.push({ name: safe.relativePath, reason: 'extensión no permitida' })
            return next()
          }

          if (entries.length >= limits.maxEntries) {
            skipped.push({ name: safe.relativePath, reason: 'límite de archivos' })
            return next()
          }

          const size = Number(entry.uncompressedSize) || 0
          if (size > limits.maxEntryBytes) {
            skipped.push({ name: safe.relativePath, reason: 'archivo demasiado grande' })
            return next()
          }
          if (totalUncompressed + size > limits.maxTotalUncompressed) {
            skipped.push({ name: safe.relativePath, reason: 'límite total descomprimido' })
            return next()
          }

          const readStream = await new Promise((res, rej) => {
            zipfile.openReadStream(entry, (err, stream) => (err ? rej(err) : res(stream)))
          })
          const content = await streamToBuffer(readStream, limits.maxEntryBytes)
          totalUncompressed += content.length

          entries.push({
            relativePath: safe.relativePath,
            fileName: safe.fileName,
            dirPath: safe.dirPath,
            size: content.length,
            content,
          })
          next()
        } catch (err) {
          reject(err)
        }
      })

      next()
    })
  } catch (e) {
    try {
      zipfile.close()
    } catch {
      /* ignore */
    }
    return { ok: false, error: e?.message || 'Error al leer el ZIP', entries: [], skipped }
  }

  return { ok: true, entries, skipped, listed: entries.length + skipped.length }
}
