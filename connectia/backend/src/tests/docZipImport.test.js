import { describe, it } from 'node:test'
import assert from 'assert/strict'
import zlib from 'zlib'
import {
  sanitizeZipEntryPath,
  isAllowedDocEntry,
  isZipDirectoryEntry,
  extractDocEntriesFromZipBuffer,
} from '../lib/zipExtract.js'
import { mapZipLibraryEntry, mergeZipAiDraft } from '../services/docZipLibraryImport.js'
import { classifyZipPersonalEntries, mergeZipPersonalAiDraft } from '../services/docZipPersonalImport.js'

/** ZIP mínimo (método store o deflate) para tests. */
function buildSimpleZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8')
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data || '', 'utf8')
    const useDeflate = f.deflate === true
    const payload = useDeflate ? zlib.deflateRawSync(data) : data
    const method = useDeflate ? 8 : 0
    const crc = zlib.crc32(data)

    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc >>> 0, 14)
    local.writeUInt32LE(payload.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    name.copy(local, 30)

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc >>> 0, 16)
    central.writeUInt32LE(payload.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)

    localParts.push(local, payload)
    centralParts.push(central)
    offset += local.length + payload.length
  }

  const centralDir = Buffer.concat(centralParts)
  const locals = Buffer.concat(localParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDir.length, 12)
  end.writeUInt32LE(locals.length, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([locals, centralDir, end])
}

describe('zipExtract sanitize', () => {
  it('normaliza rutas y rechaza traversal / macOS', () => {
    const ok = sanitizeZipEntryPath('RRHH/Politicas/manual.pdf')
    assert.equal(ok.ok, true)
    assert.equal(ok.relativePath, 'RRHH/Politicas/manual.pdf')
    assert.equal(ok.fileName, 'manual.pdf')
    assert.equal(ok.dirPath, 'RRHH/Politicas')

    assert.equal(sanitizeZipEntryPath('../etc/passwd').ok, false)
    assert.equal(sanitizeZipEntryPath('__MACOSX/._x.pdf').ok, false)
    assert.equal(sanitizeZipEntryPath('a/.DS_Store').ok, false)
  })

  it('filtra extensiones y directorios', () => {
    assert.equal(isAllowedDocEntry('a.pdf'), true)
    assert.equal(isAllowedDocEntry('a.exe'), false)
    assert.equal(isZipDirectoryEntry('carpeta/', 0), true)
    assert.equal(isZipDirectoryEntry('a.pdf', 10), false)
  })
})

describe('mapZipLibraryEntry', () => {
  it('combina basePath con dir del ZIP', () => {
    const m = mapZipLibraryEntry(
      { fileName: 'manual.pdf', dirPath: 'Politicas', relativePath: 'Politicas/manual.pdf' },
      { basePath: 'RRHH' },
    )
    assert.equal(m.category, 'RRHH/Politicas')
    assert.equal(m.titulo, 'manual')
  })

  it('sin base ni dir → general', () => {
    const m = mapZipLibraryEntry(
      { fileName: 'hola.pdf', dirPath: '', relativePath: 'hola.pdf' },
      { basePath: '' },
    )
    assert.equal(m.category, 'general')
    assert.equal(m.titulo, 'hola')
  })
})

describe('mergeZipAiDraft', () => {
  it('conserva carpeta del ZIP y toma título/desc de IA', () => {
    const merged = mergeZipAiDraft(
      { category: 'RRHH/Politicas', titulo: 'manual', relativePath: 'RRHH/Politicas/manual.pdf', fileName: 'manual.pdf' },
      {
        titulo: 'Código de ética',
        descripcion: 'Política interna.',
        category: 'Otro',
        requiresSignature: true,
        source: 'ai',
      },
    )
    assert.equal(merged.category, 'RRHH/Politicas')
    assert.equal(merged.titulo, 'Código de ética')
    assert.equal(merged.requiresSignature, true)
    assert.equal(merged.aiSource, 'ai')
  })

  it('si ZIP es general, usa category de IA', () => {
    const merged = mergeZipAiDraft(
      { category: 'general', titulo: 'x', relativePath: 'x.pdf', fileName: 'x.pdf' },
      { titulo: 'Manual', descripcion: 'd', category: 'Manuales', requiresSignature: false, source: 'heuristic' },
    )
    assert.equal(merged.category, 'Manuales')
  })
})

describe('classifyZipPersonalEntries', () => {
  it('matchea por DNI y detecta pattern miss', () => {
    const users = [
      { _id: 'u1', dni: '30.111.222', usuario: 'ana' },
      { _id: 'u2', dni: '20111222', usuario: 'bob' },
    ]
    const entries = [
      { fileName: '30111222_recibo_202603.pdf', relativePath: '30111222_recibo_202603.pdf' },
      { fileName: 'otro.pdf', relativePath: 'otro.pdf' },
      { fileName: '99999999_recibo_202603.pdf', relativePath: '99999999_recibo_202603.pdf' },
    ]
    const { summary, classified } = classifyZipPersonalEntries(entries, users, {
      namePattern: '{dni}_recibo_{periodo}.pdf',
      matchToken: 'dni',
      matchField: 'dni',
      stripNonDigits: true,
      tituloTemplate: 'Recibo {periodo}',
    })
    assert.equal(summary.matched, 1)
    assert.equal(summary.patternMiss, 1)
    assert.equal(summary.unmatched, 1)
    const hit = classified.find((c) => c.status === 'matched')
    assert.equal(hit.titulo, 'Recibo 202603')
    assert.equal(hit.user.usuario, 'ana')
  })
})

describe('mergeZipPersonalAiDraft', () => {
  it('conserva título de plantilla y descripción de IA', () => {
    const merged = mergeZipPersonalAiDraft(
      {
        tituloFromTemplate: 'Recibo 202603',
        categoryFromConfig: 'personal',
        fileName: '30111222_recibo_202603.pdf',
        relativePath: '30111222_recibo_202603.pdf',
      },
      {
        titulo: 'Otro título',
        descripcion: 'Liquidación mensual.',
        category: 'RRHH',
        requiresSignature: true,
        source: 'ai',
      },
    )
    assert.equal(merged.titulo, 'Recibo 202603')
    assert.equal(merged.descripcion, 'Liquidación mensual.')
    assert.equal(merged.category, 'personal')
    assert.equal(merged.requiresSignature, true)
    assert.equal(merged.aiSource, 'ai')
  })

  it('sin plantilla usa título de IA', () => {
    const merged = mergeZipPersonalAiDraft(
      {
        tituloFromTemplate: '',
        categoryFromConfig: 'general',
        fileName: 'x.pdf',
        relativePath: 'x.pdf',
      },
      { titulo: 'Certificado', descripcion: 'd', category: 'Legajos', requiresSignature: false, source: 'heuristic' },
    )
    assert.equal(merged.titulo, 'Certificado')
    assert.equal(merged.category, 'Legajos')
  })
})

describe('extractDocEntriesFromZipBuffer', () => {
  it('extrae PDF y salta exe / macOS', async () => {
    const zip = buildSimpleZip([
      { name: 'docs/a.pdf', data: '%PDF-1.4 test' },
      { name: 'malware.exe', data: 'MZ' },
      { name: '__MACOSX/._a.pdf', data: 'x' },
      { name: 'RRHH/nota.txt', data: 'hola' },
    ])
    const result = await extractDocEntriesFromZipBuffer(zip)
    assert.equal(result.ok, true)
    assert.equal(result.entries.length, 2)
    const names = result.entries.map((e) => e.relativePath).sort()
    assert.deepEqual(names, ['RRHH/nota.txt', 'docs/a.pdf'])
    assert.ok(result.skipped.some((s) => s.reason === 'extensión no permitida'))
  })

  it('rechaza buffer vacío', async () => {
    const result = await extractDocEntriesFromZipBuffer(Buffer.alloc(0))
    assert.equal(result.ok, false)
  })
})

describe('importZipLibrary upsert-first', () => {
  it('dryRun mapea sin upserted', async () => {
    const { importZipLibrary } = await import('../services/docZipLibraryImport.js')
    const zip = buildSimpleZip([
      { name: 'Politicas/codigo.pdf', data: '%PDF-1.4 demo' },
      { name: 'Manuales/guia.txt', data: 'hola mundo' },
    ])
    const result = await importZipLibrary({
      tenantId: null,
      buffer: zip,
      basePath: 'RRHH',
      useAi: true,
      dryRun: true,
      existingCategories: ['RRHH'],
    })
    assert.equal(result.ok, true)
    assert.equal(result.dryRun, true)
    assert.equal(result.summary.mapped, 2)
    assert.equal(result.summary.upserted, 0)
    assert.ok(result.summary.samples.mapped.some((s) => s.category.includes('Politicas')))
  })
})
