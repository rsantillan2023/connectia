import XLSX from 'xlsx'
import { POST_TIPOS } from './postsConfig.js'

const COLS = [
  'titulo',
  'cuerpo',
  'tipo',
  'status',
  'section',
  'priority',
  'pinned',
  'isKnowledge',
  'scheduledAt',
  'expiresAt',
  'imageUrl',
]

const STATUSES = ['draft', 'scheduled', 'published']

export function buildPostImportTemplateCsv() {
  const header = COLS.join(',')
  const example = [
    'Bienvenida al muro',
    'Texto de ejemplo para la comunidad',
    'noticia',
    'draft',
    '',
    '0',
    'false',
    'false',
    '',
    '',
    '',
  ]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(',')
  return `${header}\n${example}\n`
}

export function buildPostImportTemplateXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLS,
    [
      'Bienvenida al muro',
      'Texto de ejemplo para la comunidad',
      'noticia',
      'draft',
      '',
      0,
      false,
      false,
      '',
      '',
      '',
    ],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Publicaciones')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function sheetToRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

function csvToRows(text) {
  const wb = XLSX.read(String(text || ''), { type: 'string' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

function normKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function boolish(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
  if (!s) return false
  return s === '1' || s === 'true' || s === 'si' || s === 'sí' || s === 'yes'
}

function parseDate(v) {
  if (v == null || v === '') return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  const d = new Date(String(v).trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * @param {Buffer|string} input
 * @param {string} filename
 */
export function parsePostImportFile(input, filename = '') {
  const name = String(filename || '').toLowerCase()
  let rawRows
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    rawRows = sheetToRows(Buffer.from(input))
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    rawRows = sheetToRows(Buffer.from(String(input), 'binary'))
  } else {
    rawRows = csvToRows(String(input || ''))
  }
  const items = []
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] || {}
    const mapped = {}
    for (const [k, v] of Object.entries(row)) {
      const nk = normKey(k)
      if (COLS.includes(nk)) mapped[nk] = v
    }
    items.push({ row: i + 2, ...mapped })
  }
  return { format: name.endsWith('.xls') ? 'xlsx' : name.endsWith('.csv') ? 'csv' : 'xlsx', items }
}

/**
 * @param {Record<string, unknown>} row
 */
export function validatePostImportRow(row) {
  const errors = []
  const titulo = String(row.titulo || '').trim()
  if (!titulo) errors.push('titulo obligatorio')
  if (titulo.length > 120) errors.push('titulo máx 120')

  const tipoRaw = String(row.tipo || 'noticia')
    .trim()
    .toLowerCase()
  const tipo = POST_TIPOS.includes(tipoRaw) ? tipoRaw : ''
  if (!tipo) errors.push(`tipo inválido (usar: ${POST_TIPOS.join(', ')})`)

  const statusRaw = String(row.status || 'draft')
    .trim()
    .toLowerCase()
  const status = STATUSES.includes(statusRaw) ? statusRaw : ''
  if (!status) errors.push(`status inválido (usar: ${STATUSES.join(', ')})`)

  const scheduledAt = parseDate(row.scheduledAt)
  if (status === 'scheduled' && !scheduledAt) {
    errors.push('scheduledAt obligatorio si status=scheduled')
  }

  const expiresAt = parseDate(row.expiresAt)
  if (row.expiresAt && !expiresAt) errors.push('expiresAt inválido')

  return {
    ok: errors.length === 0,
    errors,
    data: {
      titulo,
      cuerpo: String(row.cuerpo || ''),
      tipo: tipo || 'noticia',
      status: status || 'draft',
      section: String(row.section || '').trim().slice(0, 80),
      priority: Number(row.priority) || 0,
      pinned: boolish(row.pinned),
      isKnowledge: boolish(row.isKnowledge),
      scheduledAt: status === 'scheduled' ? scheduledAt : null,
      expiresAt,
      imageUrl: String(row.imageUrl || '').trim(),
    },
  }
}
