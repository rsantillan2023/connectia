/**
 * Import XLSX/CSV para ABM supervisión (Ola 31).
 */
import XLSX from 'xlsx'

function sheetToRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return Array.isArray(rows) ? rows : []
}

function normKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function pick(row, aliases) {
  const map = {}
  for (const [k, v] of Object.entries(row || {})) map[normKey(k)] = v
  for (const a of aliases) {
    const v = map[normKey(a)]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export function parseSupervisionImport(buffer, kind) {
  const rows = sheetToRows(buffer)
  const items = []
  for (const row of rows) {
    if (kind === 'cadenas') {
      const nombre = pick(row, ['nombre', 'cadena', 'name'])
      if (nombre) items.push({ nombre })
    } else if (kind === 'subcadenas') {
      const nombre = pick(row, ['nombre', 'subcadena', 'name'])
      const cadena = pick(row, ['cadena', 'cadena_nombre', 'cadenaNombre'])
      if (nombre) items.push({ nombre, cadena })
    } else if (kind === 'clientes') {
      const nombre = pick(row, ['nombre', 'cliente', 'name'])
      const codigo = pick(row, ['codigo', 'code', 'sku'])
      if (nombre) items.push({ nombre, codigo })
    } else if (kind === 'salas') {
      const nombre = pick(row, ['nombre', 'sala', 'name'])
      const codigo = pick(row, ['codigo', 'code'])
      const cadena = pick(row, ['cadena', 'cadena_nombre'])
      const comuna = pick(row, ['comuna', 'ciudad'])
      const region = pick(row, ['region', 'región'])
      if (nombre) items.push({ nombre, codigo, cadena, comuna, region })
    } else if (kind === 'asignaciones') {
      const cliente = pick(row, ['cliente', 'cliente_nombre', 'clienteNombre'])
      const sala = pick(row, ['sala', 'sala_nombre', 'salaNombre'])
      const usuario = pick(row, ['usuario', 'user', 'email', 'legajo'])
      const role = pick(row, ['rol', 'role', 'supervisionRole']) || 'operario'
      if (cliente && sala) items.push({ cliente, sala, usuario, role })
    }
  }
  return { format: 'xlsx', count: items.length, items }
}

export function buildImportTemplate(kind) {
  const headers = {
    cadenas: [['nombre']],
    subcadenas: [['nombre', 'cadena']],
    clientes: [['nombre', 'codigo']],
    salas: [['nombre', 'codigo', 'cadena', 'comuna', 'region']],
    asignaciones: [['cliente', 'sala', 'usuario', 'rol']],
  }
  const data = headers[kind] || [['nombre']]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'import')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
