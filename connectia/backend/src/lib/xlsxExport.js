import XLSX from 'xlsx'

/** Neutraliza fórmula Excel (injection). */
export function sanitizeCell(v) {
  const s = String(v ?? '')
  if (/^[=+\-@]/.test(s)) return `'${s}`
  return s
}

/**
 * Genera buffer .xlsx a partir de fields + rows.
 * @param {string[]} fields
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [sheetName='Reporte']
 * @returns {Buffer}
 */
export function rowsToXlsxBuffer(fields, rows, sheetName = 'Reporte') {
  const cols = Array.isArray(fields) ? fields : []
  const data = [
    cols,
    ...(Array.isArray(rows) ? rows : []).map((r) => cols.map((f) => sanitizeCell(r?.[f]))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Reporte').slice(0, 31))
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * Clasifica canal desde User-Agent.
 * @param {string} ua
 * @returns {'mobile'|'desktop'|'unknown'}
 */
export function channelFromUa(ua) {
  const s = String(ua || '').toLowerCase()
  if (!s) return 'unknown'
  if (/mobile|android|iphone|ipad|ipod|webos|blackberry|opera mini|iemobile/.test(s)) return 'mobile'
  if (/windows|macintosh|linux|cros|x11/.test(s)) return 'desktop'
  return 'unknown'
}

/** Día UTC YYYY-MM-DD */
export function utcDayKey(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10)
}
