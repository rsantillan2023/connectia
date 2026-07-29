import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseUserImportCsv,
  parseUserImportFile,
  validateImportRow,
  buildImportTemplateCsv,
  buildImportTemplateXlsx,
  sanitizeCell,
  detectSeparator,
  isExcelUpload,
} from '../lib/userImport.js'
import {
  normalizeDirectoryEntries,
  planDirectorySync,
  googleWorkspaceConfigured,
  entraConfigured,
} from '../lib/directorySync.js'

test('detectSeparator prefers commas', () => {
  assert.equal(detectSeparator('a,b,c'), ',')
  assert.equal(detectSeparator('a;b;c'), ';')
})

test('sanitizeCell blocks formula injection', () => {
  assert.equal(sanitizeCell('=CMD()'), "'=CMD()")
  assert.equal(sanitizeCell('jperez'), 'jperez')
})

test('parseUserImportCsv maps headers and rows', () => {
  const csv = buildImportTemplateCsv()
  const parsed = parseUserImportCsv(csv)
  assert.ok(parsed.headers.includes('usuario'))
  assert.ok(parsed.headers.includes('email'))
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].usuario, 'jperez')
})

test('parseUserImportFile lee plantilla xlsx', () => {
  const buf = Buffer.from(buildImportTemplateXlsx())
  assert.equal(isExcelUpload('plantilla.xlsx', buf), true)
  const parsed = parseUserImportFile(buf, 'plantilla.xlsx')
  assert.equal(parsed.format, 'xlsx')
  assert.ok(parsed.headers.includes('usuario'))
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].email, 'jperez@empresa.com')
})

test('validateImportRow create vs update', () => {
  const ctx = {
    existingByUsuario: new Map([['jperez', 'id1']]),
    areaByKey: new Map([['rrhh', 'area1']]),
    groupByKey: new Map([['comunicacion', 'g1']]),
    operatorIsFullAdmin: true,
  }
  const create = validateImportRow(
    { __line: 2, usuario: 'nuevo', email: 'n@x.com', roles: 'member', activo: '1' },
    ctx,
  )
  assert.equal(create.action, 'create')
  assert.equal(create.ok, true)

  const update = validateImportRow(
    { __line: 3, usuario: 'jperez', email: 'j@x.com', roles: 'member', areaKey: 'rrhh' },
    ctx,
  )
  assert.equal(update.action, 'update')
  assert.equal(update.ok, true)
  assert.equal(update.payload.areaId, 'area1')
})

test('validateImportRow rejects admin grant for non-full-admin', () => {
  const ctx = {
    existingByUsuario: new Map(),
    areaByKey: new Map(),
    groupByKey: new Map(),
    operatorIsFullAdmin: false,
  }
  const row = validateImportRow(
    { __line: 2, usuario: 'x', email: 'x@y.com', roles: 'admin' },
    ctx,
  )
  assert.equal(row.ok, false)
  assert.ok(row.issues.some((i) => i.includes('admin')))
})

test('directory sync plan', () => {
  const entries = normalizeDirectoryEntries([
    { email: 'a@empresa.com', nombre: 'Ana', apellido: 'Lopez' },
    { email: 'b@empresa.com', usuario: 'blob' },
  ])
  assert.equal(entries.length, 2)
  assert.equal(entries[0].usuario, 'a')

  const plan = planDirectorySync(entries, {
    existingByUsuario: new Map([['blob', 'u2']]),
    existingByEmail: new Map(),
    origen: 'GOOGLE',
  })
  assert.equal(plan[0].action, 'create')
  assert.equal(plan[1].action, 'update')
  assert.equal(plan[1].origen, 'GOOGLE')
})

test('directory configured flags son boolean', () => {
  assert.equal(typeof googleWorkspaceConfigured(), 'boolean')
  assert.equal(typeof entraConfigured(), 'boolean')
})
