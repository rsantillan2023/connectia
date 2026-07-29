/**
 * Orígenes de la bandeja externa: URL manifiesto, S3, Google Drive.
 */
import { listS3DropFiles, s3DropConfigured } from './docDropS3.js'
import { applyTemplate } from '../lib/docDropPattern.js'

/**
 * @typedef {{ name: string, url: string, storageKey?: string, size?: number, mimeType?: string, source?: string }} DropFile
 */

function applyFileUrlTemplate(template, name, item = {}) {
  const t = String(template || '').trim()
  if (!t) return String(item.url || '').trim()
  return applyTemplate(t, { name, ...(item.captures || {}) }).replace(/\{name\}/gi, name)
}

/**
 * Parsea un manifiesto JSON flexible.
 * Acepta: array, { items }, { files }, { documents }
 * Cada ítem: name|fileName|key + url|fileUrl|link
 */
export function parseManifestPayload(data, { fileUrlTemplate = '' } = {}) {
  const raw = Array.isArray(data)
    ? data
    : data?.items || data?.files || data?.documents || data?.objects || []
  if (!Array.isArray(raw)) return []

  return raw
    .map((d, i) => {
      const name = String(d.name || d.fileName || d.filename || d.key || d.Key || '').trim()
      const storageKey = String(d.storageKey || d.key || d.Key || name).trim()
      let url = String(d.url || d.fileUrl || d.link || d.webContentLink || d.href || '').trim()
      if (!url && fileUrlTemplate && name) {
        url = applyFileUrlTemplate(fileUrlTemplate, name, d)
      }
      if (!name || !url) return null
      return {
        name: name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name,
        url,
        storageKey: storageKey || name,
        size: Number(d.size || d.Size || 0) || 0,
        mimeType: String(d.mimeType || d.mime || ''),
        source: 'url',
        externalHint: String(d.id || d.externalId || `${name}-${i}`),
      }
    })
    .filter(Boolean)
}

export async function fetchManifestList(listUrl, { fileUrlTemplate = '' } = {}) {
  const url = String(listUrl || '').trim()
  if (!url) return { ok: false, error: 'Falta listUrl', items: [] }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      return { ok: false, error: `Manifiesto respondió ${res.status}`, items: [] }
    }
    const data = await res.json()
    const items = parseManifestPayload(data, { fileUrlTemplate })
    return { ok: true, items, message: `${items.length} archivo(s) en manifiesto` }
  } catch (e) {
    return { ok: false, error: e?.message || 'Error al leer manifiesto', items: [] }
  }
}

export async function fetchGdriveList(gdrive = {}, { listUrlFallback = '', fileUrlTemplate = '' } = {}) {
  const listUrl = String(gdrive.listUrl || listUrlFallback || '').trim()
  if (listUrl) {
    const r = await fetchManifestList(listUrl, { fileUrlTemplate })
    if (r.ok) {
      return {
        ...r,
        items: r.items.map((x) => ({ ...x, source: 'gdrive' })),
      }
    }
    if (!gdrive.folderId || !gdrive.apiKey) return r
  }

  const folderId = String(gdrive.folderId || '').trim()
  const apiKey = String(gdrive.apiKey || '').trim()
  if (!folderId || !apiKey) {
    return {
      ok: false,
      error: 'Drive: configurá listUrl o folderId + apiKey',
      items: [],
    }
  }

  try {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
    const fields = encodeURIComponent('files(id,name,mimeType,size,webContentLink,webViewLink)')
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${encodeURIComponent(apiKey)}&fields=${fields}&pageSize=1000`
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Drive API ${res.status}: ${body.slice(0, 180)}`, items: [] }
    }
    const data = await res.json()
    const files = Array.isArray(data.files) ? data.files : []
    const items = files
      .filter((f) => f.name && !String(f.mimeType || '').includes('folder'))
      .map((f) => {
        const urlOut =
          f.webContentLink ||
          f.webViewLink ||
          (fileUrlTemplate ? applyFileUrlTemplate(fileUrlTemplate, f.name, f) : '') ||
          `https://drive.google.com/uc?id=${f.id}&export=download`
        return {
          name: f.name,
          url: urlOut,
          storageKey: f.id,
          size: Number(f.size) || 0,
          mimeType: f.mimeType || '',
          source: 'gdrive',
          externalHint: f.id,
        }
      })
      .filter((x) => x.url)
    return { ok: true, items, message: `${items.length} archivo(s) en Drive` }
  } catch (e) {
    return { ok: false, error: e?.message || 'Error Drive API', items: [] }
  }
}

/**
 * Lista archivos según config normalizada docsDrop.
 */
export async function listDropFiles(config) {
  const c = config || {}
  if (c.source === 's3') {
    if (!s3DropConfigured(c.s3)) {
      // Fallback: si hay listUrl, usarlo como índice del bucket
      if (c.listUrl) {
        const r = await fetchManifestList(c.listUrl, { fileUrlTemplate: c.fileUrlTemplate })
        return {
          ...r,
          items: (r.items || []).map((x) => ({ ...x, source: 's3' })),
          note: r.ok ? 'S3 vía manifiesto (sin ListObjects)' : undefined,
        }
      }
      return {
        ok: false,
        error:
          'S3 no listo: definí bucket + AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, o un listUrl índice.',
        items: [],
      }
    }
    const r = await listS3DropFiles(c.s3)
    if (!r.ok) {
      if (c.listUrl) {
        const fallback = await fetchManifestList(c.listUrl, { fileUrlTemplate: c.fileUrlTemplate })
        if (fallback.ok) {
          return {
            ok: true,
            items: fallback.items.map((x) => ({ ...x, source: 's3' })),
            note: `ListObjects falló (${r.error}); se usó listUrl`,
          }
        }
      }
      return { ok: false, error: r.error, items: [] }
    }
    return { ok: true, items: r.items, message: `${r.items.length} objeto(s) en S3` }
  }

  if (c.source === 'gdrive') {
    return fetchGdriveList(c.gdrive, {
      listUrlFallback: c.listUrl,
      fileUrlTemplate: c.fileUrlTemplate,
    })
  }

  // url (default)
  return fetchManifestList(c.listUrl, { fileUrlTemplate: c.fileUrlTemplate })
}
