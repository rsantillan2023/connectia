/**
 * Import de destinatarios de encuesta desde Excel/CSV.
 * Columnas: legajo (idExterno), dni, cuil, email, usuario, nombre, apellido.
 */
import { createRequire } from 'module'
import {
  detectSeparator,
  parseCsvLine,
  sanitizeCell,
  normalizeHeader,
  isExcelUpload,
  workbookBufferToCsvText,
} from './userImport.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

export const AUDIENCE_IMPORT_COLUMNS = [
  'legajo',
  'dni',
  'cuil',
  'email',
  'usuario',
  'nombre',
  'apellido',
]

const HEADER_ALIASES = {
  legajo: ['legajo', 'idexterno', 'employeeid', 'id', 'nrolegajo', 'numerolegajo', 'badge'],
  dni: ['dni', 'documento', 'doc', 'nrodocumento'],
  cuil: ['cuil', 'cuit'],
  email: ['email', 'mail', 'correo'],
  usuario: ['usuario', 'user', 'username', 'login'],
  nombre: ['nombre', 'name', 'firstname', 'primer_nombre'],
  apellido: ['apellido', 'lastname', 'surname'],
}

const EXAMPLE_ROW = ['1001', '30111222', '20-30111222-3', 'jperez@empresa.com', 'jperez', 'Juan', 'Pérez']

function mapHeader(raw) {
  const n = normalizeHeader(raw)
  for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(n)) return canon
  }
  return null
}

/** Digitos solamente (para DNI/CUIL/legajo numérico). */
export function digitsOnly(v) {
  return String(v || '').replace(/\D+/g, '')
}

export function normKey(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} text
 * @returns {{ headers: string[], rows: Record<string,string>[], errors: { row: number, message: string }[] }}
 */
export function parseAudienceImportCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)
  const errors = []
  if (!lines.length) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'Archivo vacío' }] }
  }
  const sep = detectSeparator(lines[0])
  const headerCells = parseCsvLine(lines[0], sep)
  const headers = headerCells.map(mapHeader)
  const known = headers.filter(Boolean)
  if (!known.length) {
    errors.push({
      row: 1,
      message: 'No se reconocieron columnas. Usá legajo, dni, cuil, email, usuario, nombre y/o apellido.',
    })
  }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], sep).map(sanitizeCell)
    if (cells.every((c) => !c)) continue
    const obj = { __line: i + 1 }
    headers.forEach((h, idx) => {
      if (h) obj[h] = cells[idx] ?? ''
    })
    const hasAny = AUDIENCE_IMPORT_COLUMNS.some((k) => String(obj[k] || '').trim())
    if (!hasAny) continue
    rows.push(obj)
  }
  return { headers: known, rows, errors }
}

export function parseAudienceImportFile(input, filename = '') {
  if (Buffer.isBuffer(input) && isExcelUpload(filename, input)) {
    const text = workbookBufferToCsvText(input)
    return { ...parseAudienceImportCsv(text), format: 'xlsx' }
  }
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '')
  return { ...parseAudienceImportCsv(text), format: 'csv' }
}

export function buildAudienceImportTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([AUDIENCE_IMPORT_COLUMNS, EXAMPLE_ROW])
  XLSX.utils.book_append_sheet(wb, ws, 'Destinatarios')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export function buildAudienceImportTemplateCsv() {
  return `${AUDIENCE_IMPORT_COLUMNS.join(',')}\n${EXAMPLE_ROW.join(',')}\n`
}

function mapAudienceCandidate(u) {
  return {
    id: String(u._id),
    usuario: u.usuario || '',
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    idExterno: u.idExterno || '',
    dni: u.dni || '',
    label: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario || String(u._id),
  }
}

/**
 * Indexa usuarios del tenant para match rápido.
 * @param {Array<object>} users lean User docs
 */
export function buildAudienceUserIndexes(users = []) {
  const byIdExterno = new Map()
  const byIdExternoDigits = new Map()
  const byDni = new Map()
  const byCuil = new Map()
  const byEmail = new Map()
  const byUsuario = new Map()
  const byFullName = new Map()

  for (const u of users) {
    const id = String(u._id)
    if (u.idExterno) {
      const k = String(u.idExterno).trim().toLowerCase()
      if (k && !byIdExterno.has(k)) byIdExterno.set(k, u)
      const d = digitsOnly(u.idExterno)
      if (d && !byIdExternoDigits.has(d)) byIdExternoDigits.set(d, u)
    }
    const dni = digitsOnly(u.dni)
    if (dni && !byDni.has(dni)) byDni.set(dni, u)
    const cuil = digitsOnly(u.cuil)
    if (cuil && !byCuil.has(cuil)) byCuil.set(cuil, u)
    if (u.email) {
      const e = String(u.email).trim().toLowerCase()
      if (e && !byEmail.has(e)) byEmail.set(e, u)
    }
    if (u.usuario) {
      const us = String(u.usuario).trim().toLowerCase()
      if (us && !byUsuario.has(us)) byUsuario.set(us, u)
    }
    const full = normKey(`${u.nombre || ''} ${u.apellido || ''}`)
    if (full && !byFullName.has(full)) byFullName.set(full, u)
  }

  return { byIdExterno, byIdExternoDigits, byDni, byCuil, byEmail, byUsuario, byFullName }
}

/**
 * Resuelve una fila del Excel contra índices de usuarios.
 * @returns {{ user: object|null, matchedBy: string|null }}
 */
export function matchAudienceRow(row, indexes) {
  const legajo = String(row.legajo || '').trim()
  if (legajo) {
    const k = legajo.toLowerCase()
    if (indexes.byIdExterno.has(k)) return { user: indexes.byIdExterno.get(k), matchedBy: 'legajo' }
    const d = digitsOnly(legajo)
    if (d && indexes.byIdExternoDigits.has(d)) {
      return { user: indexes.byIdExternoDigits.get(d), matchedBy: 'legajo' }
    }
  }

  const dni = digitsOnly(row.dni)
  if (dni && indexes.byDni.has(dni)) return { user: indexes.byDni.get(dni), matchedBy: 'dni' }

  const cuil = digitsOnly(row.cuil)
  if (cuil && indexes.byCuil.has(cuil)) return { user: indexes.byCuil.get(cuil), matchedBy: 'cuil' }

  const email = String(row.email || '').trim().toLowerCase()
  if (email && indexes.byEmail.has(email)) return { user: indexes.byEmail.get(email), matchedBy: 'email' }

  const usuario = String(row.usuario || '').trim().toLowerCase()
  if (usuario && indexes.byUsuario.has(usuario)) {
    return { user: indexes.byUsuario.get(usuario), matchedBy: 'usuario' }
  }

  const full = normKey(`${row.nombre || ''} ${row.apellido || ''}`)
  if (full && indexes.byFullName.has(full)) {
    return { user: indexes.byFullName.get(full), matchedBy: 'nombre' }
  }

  return { user: null, matchedBy: null }
}

/**
 * @param {Array<Record<string,string>>} rows
 * @param {Array<object>} users
 */
export function resolveAudienceImportRows(rows, users) {
  const indexes = buildAudienceUserIndexes(users)
  const matched = []
  const unmatched = []
  const seenIds = new Set()

  for (const row of rows) {
    const { user, matchedBy } = matchAudienceRow(row, indexes)
    if (!user) {
      unmatched.push({
        row: row.__line || null,
        legajo: row.legajo || '',
        dni: row.dni || '',
        cuil: row.cuil || '',
        email: row.email || '',
        usuario: row.usuario || '',
        nombre: row.nombre || '',
        apellido: row.apellido || '',
        reason: 'No encontrado en la comunidad',
      })
      continue
    }
    const id = String(user._id)
    if (seenIds.has(id)) {
      unmatched.push({
        row: row.__line || null,
        legajo: row.legajo || '',
        dni: row.dni || '',
        email: row.email || '',
        usuario: row.usuario || '',
        nombre: row.nombre || '',
        apellido: row.apellido || '',
        reason: 'Duplicado en el archivo (ya matcheado)',
      })
      continue
    }
    seenIds.add(id)
    matched.push({
      ...mapAudienceCandidate(user),
      matchedBy,
      row: row.__line || null,
    })
  }

  return {
    matched,
    unmatched,
    matchedIds: matched.map((m) => m.id),
    summary: {
      rows: rows.length,
      matched: matched.length,
      unmatched: unmatched.length,
    },
  }
}
