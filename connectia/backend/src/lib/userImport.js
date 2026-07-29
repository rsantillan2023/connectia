/**
 * Parser CSV/TSV/Excel para import de usuarios §27.07.
 * Soporta comillas dobles, separador auto (`,` `;` `\t`) y .xlsx/.xls.
 */
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

export const USER_IMPORT_COLUMNS = [
  'usuario',
  'email',
  'nombre',
  'apellido',
  'idExterno',
  'dni',
  'cuil',
  'cargo',
  'roles',
  'areaKey',
  'groupKeys',
  'activo',
  'password',
]

export function detectSeparator(headerLine) {
  const counts = {
    ',': (headerLine.match(/,/g) || []).length,
    ';': (headerLine.match(/;/g) || []).length,
    '\t': (headerLine.match(/\t/g) || []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ','
}

export function parseCsvLine(line, sep = ',') {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** Bloquea celdas que empiezan con = + - @ (formula injection Excel). */
export function sanitizeCell(raw) {
  const s = String(raw ?? '').trim()
  if (/^[=+\-@]/.test(s)) return `'${s}`
  return s
}

export function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

const HEADER_ALIASES = {
  usuario: ['usuario', 'user', 'username', 'login', 'user_name'],
  email: ['email', 'mail', 'correo'],
  nombre: ['nombre', 'name', 'firstname', 'primer_nombre'],
  apellido: ['apellido', 'lastname', 'surname', 'segundo_nombre'],
  idexterno: ['idexterno', 'legajo', 'employeeid', 'id'],
  dni: ['dni', 'documento'],
  cuil: ['cuil', 'cuit'],
  cargo: ['cargo', 'puesto', 'title', 'jobtitle'],
  roles: ['roles', 'rol', 'role'],
  areakey: ['areakey', 'area', 'area_key'],
  groupkeys: ['groupkeys', 'grupos', 'groups', 'group'],
  activo: ['activo', 'active', 'habilitado'],
  password: ['password', 'clave', 'pass'],
}

function mapHeader(raw) {
  const n = normalizeHeader(raw)
  for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(n)) {
      if (canon === 'idexterno') return 'idExterno'
      if (canon === 'areakey') return 'areaKey'
      if (canon === 'groupkeys') return 'groupKeys'
      return canon
    }
  }
  return null
}

/**
 * @param {string} text
 * @returns {{ headers: string[], rows: Record<string,string>[], errors: { row: number, message: string }[] }}
 */
export function parseUserImportCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)
  const errors = []
  if (!lines.length) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'Archivo vacío' }] }
  }
  const sep = detectSeparator(lines[0])
  const headerCells = parseCsvLine(lines[0], sep)
  const headers = headerCells.map(mapHeader)
  if (!headers.includes('usuario') && !headers.includes('email')) {
    errors.push({
      row: 1,
      message: 'Falta columna obligatoria: usuario o email',
    })
  }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], sep).map(sanitizeCell)
    if (cells.every((c) => !c)) continue
    const obj = {}
    headers.forEach((h, idx) => {
      if (h) obj[h] = cells[idx] ?? ''
    })
    rows.push({ __line: i + 1, ...obj })
  }
  return { headers: headers.filter(Boolean), rows, errors }
}

export function buildImportTemplateCsv() {
  const header = USER_IMPORT_COLUMNS.join(',')
  const example = [
    'jperez',
    'jperez@empresa.com',
    'Juan',
    'Pérez',
    '1001',
    '30111222',
    '20-30111222-3',
    'Analista',
    'member',
    'rrhh',
    'comunicacion',
    '1',
    '',
  ].join(',')
  return `${header}\n${example}\n`
}

const EXAMPLE_ROW = [
  'jperez',
  'jperez@empresa.com',
  'Juan',
  'Pérez',
  '1001',
  '30111222',
  '20-30111222-3',
  'Analista',
  'member',
  'rrhh',
  'comunicacion',
  '1',
  '',
]

/** Detecta Excel por extensión o firma ZIP (PK). */
export function isExcelUpload(filename = '', buffer) {
  const name = String(filename || '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return true
  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 2) {
    return buffer[0] === 0x50 && buffer[1] === 0x4b
  }
  return false
}

/**
 * Convierte la primera hoja de un .xlsx/.xls a texto CSV.
 * @param {Buffer} buffer
 */
export function workbookBufferToCsvText(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    const err = new Error('El Excel no tiene hojas')
    err.status = 400
    throw err
  }
  const sheet = wb.Sheets[sheetName]
  return XLSX.utils.sheet_to_csv(sheet)
}

/** Plantilla Excel (.xlsx) con mismas columnas que CSV. */
export function buildImportTemplateXlsx() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([USER_IMPORT_COLUMNS, EXAMPLE_ROW])
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * Parsea CSV o Excel (buffer + filename).
 * @param {Buffer|string} input
 * @param {string} [filename]
 */
export function parseUserImportFile(input, filename = '') {
  if (Buffer.isBuffer(input) && isExcelUpload(filename, input)) {
    const text = workbookBufferToCsvText(input)
    return { ...parseUserImportCsv(text), format: 'xlsx' }
  }
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '')
  return { ...parseUserImportCsv(text), format: 'csv' }
}

/**
 * Preview de una fila contra catálogos del tenant.
 * No persiste; solo valida.
 */
export function validateImportRow(row, ctx) {
  const line = row.__line || 0
  const issues = []
  let usuario = String(row.usuario || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  const email = String(row.email || '')
    .trim()
    .toLowerCase()
  if (!usuario && email) usuario = email.split('@')[0].replace(/[^a-z0-9._-]/g, '')
  if (!usuario) issues.push('usuario vacío')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('email inválido')

  const rolesRaw = String(row.roles || 'member')
    .split(/[|;,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const roles = rolesRaw.length ? rolesRaw : ['member']
  for (const r of roles) {
    if (!['member', 'admin'].includes(r)) issues.push(`rol no permitido: ${r}`)
    if (r === 'admin' && !ctx.operatorIsFullAdmin) {
      issues.push('no podés asignar admin desde archivo')
    }
  }

  let areaId = null
  const areaKey = String(row.areaKey || '').trim().toLowerCase()
  if (areaKey) {
    const a = ctx.areaByKey.get(areaKey)
    if (!a) issues.push(`área desconocida: ${areaKey}`)
    else areaId = a
  }

  const groupIds = []
  const gkeys = String(row.groupKeys || '')
    .split(/[|;,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  for (const gk of gkeys) {
    const g = ctx.groupByKey.get(gk)
    if (!g) issues.push(`grupo desconocido: ${gk}`)
    else groupIds.push(g)
  }

  const activoRaw = String(row.activo ?? '1').trim().toLowerCase()
  const activo = !['0', 'false', 'no', 'inactivo'].includes(activoRaw)

  const existing = usuario ? ctx.existingByUsuario.get(usuario) : null
  const action = existing ? 'update' : 'create'

  return {
    line,
    action,
    issues,
    ok: issues.length === 0,
    payload: {
      usuario,
      email,
      nombre: String(row.nombre || '').trim(),
      apellido: String(row.apellido || '').trim(),
      idExterno: String(row.idExterno || '').trim(),
      dni: String(row.dni || '').trim(),
      cuil: String(row.cuil || '').trim(),
      cargo: String(row.cargo || '').trim().slice(0, 120),
      roles,
      areaId,
      groupIds,
      activo,
      password: String(row.password || '').trim(),
      existingId: existing || null,
    },
  }
}
