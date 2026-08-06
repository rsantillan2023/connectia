/**
 * Import ZIP → biblioteca de documentos (rutas → category con /).
 * 1) Guarda todos los archivos (heurística rápida).
 * 2) Opcionalmente enriquece con IA (timeout) sin bloquear el import.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { DocItem } from '../models/DocItem.js'
import { extractDocEntriesFromZipBuffer } from '../lib/zipExtract.js'
import { normalizeFolderPath } from '../lib/documentsFolders.js'
import { inferFileType } from '../lib/docTypes.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { normalizeAudience } from '../lib/audience.js'
import { draftDocumentFromFile, heuristicDocumentDraft, documentsAiConfigured } from './documentsAi.js'
import { extractPdfText } from './legajoAi.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents')

/** Tope de llamadas LLM por ZIP (el resto queda con heurística). */
const AI_LLM_MAX = 40
const AI_TIMEOUT_MS = 10000

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function mimeFromName(fileName) {
  const ext = path.extname(fileName || '').toLowerCase()
  const map = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.md': 'text/markdown',
  }
  return map[ext] || 'application/octet-stream'
}

function saveUploadedBuffer(fileName, content) {
  ensureUploadDir()
  const ext = path.extname(fileName || '').toLowerCase() || '.bin'
  const stored = `zip-lib-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), content)
  return {
    fileUrl: toPublicMediaUrl(`/uploads/documents/${stored}`),
    storageKey: `documents/${stored}`,
  }
}

function titleFromFileName(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  return (base || fileName || 'Documento').slice(0, 200)
}

/**
 * Calcula category y título por entrada (puro, testeable).
 */
export function mapZipLibraryEntry(entry, { basePath = '' } = {}) {
  const base = normalizeFolderPath(basePath)
  const dir = normalizeFolderPath(entry.dirPath || '')
  const category = normalizeFolderPath([base, dir].filter(Boolean).join('/')) || 'general'
  return {
    category: category.slice(0, 200),
    titulo: titleFromFileName(entry.fileName),
    relativePath: entry.relativePath,
    fileName: entry.fileName,
  }
}

/**
 * Combina carpeta del ZIP con borrador IA/heurística.
 */
export function mergeZipAiDraft(mapped, draft, { forceSignature = false } = {}) {
  const zipCat = normalizeFolderPath(mapped.category) || 'general'
  const aiCat = normalizeFolderPath(draft?.category || '') || ''
  // Preferí la estructura de carpetas del ZIP si existe
  const category = zipCat !== 'general' ? zipCat : aiCat || zipCat
  return {
    titulo: String(draft?.titulo || mapped.titulo || mapped.fileName || 'Documento').slice(0, 200),
    descripcion: String(draft?.descripcion || `Import ZIP · ${mapped.relativePath}`).slice(0, 4000),
    category: category.slice(0, 200),
    requiresSignature: forceSignature || Boolean(draft?.requiresSignature),
    fileType: draft?.fileType || null,
    aiSource: draft?.source || 'heuristic',
    notes: draft?.notes || '',
  }
}

async function textExcerptFromEntry(entry, mimeType) {
  const name = String(entry.fileName || '').toLowerCase()
  const buf = entry.content
  if (!Buffer.isBuffer(buf) || !buf.length) return ''
  try {
    if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
      return (await extractPdfText(buf)).slice(0, 8000)
    }
    if (
      mimeType.startsWith('text/') ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.csv') ||
      name.endsWith('.rtf')
    ) {
      return buf.toString('utf8').slice(0, 8000)
    }
  } catch {
    return ''
  }
  return ''
}

async function upsertLibraryRow({
  tenantId,
  entry,
  category,
  titulo,
  descripcion,
  requiresSignature: reqSig,
  mimeType,
  fileType,
  status,
  aud,
  authorName,
}) {
  const saved = saveUploadedBuffer(entry.fileName, entry.content)
  const pathHash = crypto.createHash('sha1').update(entry.relativePath).digest('hex').slice(0, 20)
  const externalId = `zip-lib:${pathHash}`
  const ft =
    fileType ||
    inferFileType({ mimeType, fileName: entry.fileName, fileUrl: saved.fileUrl })

  const doc = await DocItem.findOneAndUpdate(
    { tenantId, source: 'zip-library', externalId },
    {
      $set: {
        titulo,
        descripcion,
        category,
        fileUrl: saved.fileUrl,
        mimeType,
        fileType: ft,
        fileName: entry.fileName,
        fileSize: entry.size || 0,
        repository: 'server',
        storageKey: saved.storageKey,
        status,
        source: 'zip-library',
        externalId,
        requiresSignature: Boolean(reqSig),
        audience: {
          mode: aud.mode,
          areaIds: aud.areaIds || [],
          groupIds: aud.groupIds || [],
          userIds: aud.userIds || [],
        },
        authorName: String(authorName || 'Import ZIP biblioteca').slice(0, 120),
        publishedAt: status === 'published' ? new Date() : null,
      },
      $setOnInsert: {
        tenantId,
        downloadCount: 0,
        downloads: [],
        signatures: [],
      },
    },
    { upsert: true, new: true },
  )
  return { doc, externalId }
}

/**
 * @param {{
 *   tenantId: import('mongoose').Types.ObjectId,
 *   buffer: Buffer,
 *   basePath?: string,
 *   audience?: object,
 *   status?: string,
 *   requiresSignature?: boolean,
 *   useAi?: boolean,
 *   dryRun?: boolean,
 *   authorName?: string,
 *   existingCategories?: string[],
 * }} opts
 */
export async function importZipLibrary({
  tenantId,
  buffer,
  basePath = '',
  audience,
  status: statusIn = 'draft',
  requiresSignature = false,
  useAi = true,
  dryRun = false,
  authorName = 'Import ZIP biblioteca',
  existingCategories = [],
} = {}) {
  const extracted = await extractDocEntriesFromZipBuffer(buffer)
  if (!extracted.ok) {
    return { ok: false, error: extracted.error || 'No se pudo leer el ZIP', skipped: extracted.skipped }
  }

  const aud = normalizeAudience(audience || { mode: 'all' })
  const status = ['draft', 'published', 'archived'].includes(statusIn) ? statusIn : 'draft'
  const aiOn = useAi !== false
  const llmConfigured = documentsAiConfigured()

  let cats = (existingCategories || []).map(String).filter(Boolean)
  if (!cats.length && tenantId) {
    try {
      cats = (await DocItem.distinct('category', { tenantId })).map(String).filter(Boolean).slice(0, 60)
    } catch {
      cats = []
    }
  }

  const summary = {
    listed: extracted.entries.length,
    mapped: 0,
    upserted: 0,
    upsertErrors: 0,
    aiEnriched: 0,
    aiLlm: 0,
    aiHeuristic: 0,
    dryRun: Boolean(dryRun),
    useAi: aiOn,
    aiConfigured: llmConfigured,
    zipSkipped: extracted.skipped,
    samples: { mapped: [], errors: [] },
  }

  // 1) Mapear con heurística rápida (sin LLM) para no bloquear el guardado
  const mapped = []
  for (const entry of extracted.entries) {
    const base = mapZipLibraryEntry(entry, { basePath })
    const mimeType = mimeFromName(entry.fileName)
    const fileType = inferFileType({ mimeType, fileName: entry.fileName })
    let draft
    if (aiOn) {
      draft = heuristicDocumentDraft({
        fileName: entry.fileName,
        fileType,
        mimeType,
        categoryHint: base.category,
        textExcerpt: '',
        existingCategories: cats,
      })
      summary.aiHeuristic += 1
      summary.aiEnriched += 1
    } else {
      draft = {
        titulo: base.titulo,
        descripcion: `Import ZIP biblioteca · ${entry.relativePath}`,
        category: base.category,
        requiresSignature: false,
        fileType,
        source: 'manual',
      }
    }
    const merged = mergeZipAiDraft(base, draft, { forceSignature: requiresSignature })
    summary.mapped += 1
    if (summary.samples.mapped.length < 20) {
      summary.samples.mapped.push({
        path: entry.relativePath,
        category: merged.category,
        titulo: merged.titulo,
        aiSource: merged.aiSource,
        requiresSignature: merged.requiresSignature,
      })
    }
    mapped.push({ entry, mimeType, fileType, ...base, ...merged })
  }

  if (dryRun) {
    return { ok: true, dryRun: true, summary }
  }

  // 2) Guardar TODOS los archivos ya (el import "termina" acá)
  const savedRows = []
  for (const row of mapped) {
    try {
      const { entry, category, titulo, descripcion, requiresSignature: reqSig, mimeType, fileType } = row
      const { doc, externalId } = await upsertLibraryRow({
        tenantId,
        entry,
        category,
        titulo,
        descripcion,
        requiresSignature: reqSig,
        mimeType,
        fileType,
        status,
        aud,
        authorName,
      })
      summary.upserted += 1
      savedRows.push({ row, doc, externalId })
    } catch (e) {
      summary.upsertErrors += 1
      if (summary.samples.errors.length < 15) {
        summary.samples.errors.push({
          path: row.relativePath || row.fileName,
          error: e.message || String(e),
        })
      }
    }
  }

  // 3) Enriquecer con LLM (timeout) sin impedir que los docs ya existan
  if (aiOn && llmConfigured && savedRows.length) {
    let llmUsed = 0
    for (const { row, doc } of savedRows) {
      if (llmUsed >= AI_LLM_MAX) break
      try {
        const textExcerpt = await textExcerptFromEntry(row.entry, row.mimeType)
        const draft = await draftDocumentFromFile({
          fileName: row.fileName,
          fileType: row.fileType,
          mimeType: row.mimeType,
          categoryHint: row.category,
          textExcerpt,
          existingCategories: cats,
          timeoutMs: AI_TIMEOUT_MS,
        })
        if (draft.source !== 'ai') continue
        llmUsed += 1
        summary.aiLlm += 1
        // La heurística previa ya contó: ajustar
        if (summary.aiHeuristic > 0) summary.aiHeuristic -= 1

        const merged = mergeZipAiDraft(row, draft, { forceSignature: requiresSignature })
        doc.titulo = merged.titulo
        doc.descripcion = merged.descripcion
        doc.category = merged.category
        doc.requiresSignature = Boolean(merged.requiresSignature)
        await doc.save()

        const sample = summary.samples.mapped.find((s) => s.path === row.relativePath)
        if (sample) {
          sample.titulo = merged.titulo
          sample.category = merged.category
          sample.aiSource = 'ai'
          sample.requiresSignature = merged.requiresSignature
        }
      } catch {
        /* ya está guardado con heurística */
      }
    }
  }

  return { ok: true, dryRun: false, summary }
}
