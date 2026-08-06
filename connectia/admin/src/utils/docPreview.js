/**
 * Clasificación de vista previa de documentos (admin).
 */

export function previewExtFromDoc(d) {
  const raw = String(d?.fileName || d?.fileUrl || '')
    .split('?')[0]
    .split('#')[0]
  const m = raw.match(/(\.[a-z0-9]{1,8})$/i)
  return m ? m[1].toLowerCase() : ''
}

/**
 * @returns {'image'|'pdf'|'text'|'csv'|'office'|'other'}
 */
export function detectDocPreviewKind(d) {
  if (!d) return 'other'
  const ft = String(d.fileType || '').toLowerCase()
  const mime = String(d.mimeType || '').toLowerCase()
  const ext = previewExtFromDoc(d)

  if (ft === 'image' || mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
    return 'image'
  }
  if (ft === 'pdf' || mime === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (ext === '.csv' || mime === 'text/csv' || mime === 'application/csv') return 'csv'
  if (
    ft === 'text' ||
    mime.startsWith('text/') ||
    mime === 'text/markdown' ||
    mime === 'application/rtf' ||
    ['.txt', '.md', '.rtf'].includes(ext)
  ) {
    return 'text'
  }
  if (
    ft === 'word' ||
    ft === 'excel' ||
    ft === 'powerpoint' ||
    ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext) ||
    /msword|officedocument|ms-excel|ms-powerpoint/i.test(mime) ||
    // Browsers often report OOXML as application/zip
    ((mime.includes('zip') || mime === 'application/octet-stream') &&
      ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext))
  ) {
    return 'office'
  }
  return 'other'
}

export function isPublicHttpUrl(url) {
  try {
    const u = new URL(url)
    if (!/^https?:$/i.test(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false
    return true
  } catch {
    return false
  }
}

export function officeEmbedUrlFor(fileUrl) {
  if (!fileUrl || !isPublicHttpUrl(fileUrl)) return ''
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
}
