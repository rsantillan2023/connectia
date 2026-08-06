/**
 * Import ZIP con patrón → documentos personales (nombre → usuario).
 * Cada archivo matcheado se completa con IA/heurística (título, descripción, firma).
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { DocItem } from '../models/DocItem.js'
import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import {
  matchFileName,
  extractMatchKey,
  applyTemplate,
  normalizeMatchValue,
  userFieldValue,
} from '../lib/docDropPattern.js'
import { normalizeDocsDropConfig } from '../lib/docsDropConfig.js'
import { extractDocEntriesFromZipBuffer } from '../lib/zipExtract.js'
import { inferFileType } from '../lib/docTypes.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { normalizeFolderPath } from '../lib/documentsFolders.js'
import { draftDocumentFromFile, heuristicDocumentDraft, documentsAiConfigured } from './documentsAi.js'
import { extractPdfText } from './legajoAi.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents')

/** Tope de llamadas LLM por ZIP (el resto usa heurística). */
const AI_LLM_MAX = 40

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function buildUserIndex(users, matchField, stripNonDigits) {
  const map = new Map()
  for (const u of users) {
    const raw = userFieldValue(u, matchField)
    const key = normalizeMatchValue(raw, {
      stripNonDigits: stripNonDigits || matchField === 'dni' || matchField === 'cuil',
    })
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(u)
  }
  return map
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
  const stored = `zip-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), content)
  return {
    fileUrl: toPublicMediaUrl(`/uploads/documents/${stored}`),
    storageKey: `documents/${stored}`,
    storedName: stored,
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

/**
 * Combina plantilla/categoría del patrón con borrador IA/heurística.
 */
export function mergeZipPersonalAiDraft(
  { tituloFromTemplate, categoryFromConfig, fileName, relativePath },
  draft,
  { forceSignature = false } = {},
) {
  const tpl = String(tituloFromTemplate || '').trim()
  const cfgCat = normalizeFolderPath(categoryFromConfig || '') || ''
  const aiCat = normalizeFolderPath(draft?.category || '') || ''
  const category =
    (cfgCat && cfgCat !== 'general' ? cfgCat : aiCat || cfgCat || 'personal') || 'personal'
  return {
    titulo: (tpl || String(draft?.titulo || fileName || 'Documento')).slice(0, 200),
    descripcion: String(
      draft?.descripcion || `Import ZIP con patrón · ${relativePath || fileName}`,
    ).slice(0, 4000),
    category: category.slice(0, 200),
    requiresSignature: forceSignature || Boolean(draft?.requiresSignature),
    fileType: draft?.fileType || null,
    aiSource: draft?.source || 'heuristic',
  }
}

/**
 * Clasifica entradas ZIP contra usuarios (sin escribir DB). Útil para tests.
 */
export function classifyZipPersonalEntries(entries, users, config) {
  const c = normalizeDocsDropConfig(config)
  const index = buildUserIndex(users, c.matchField, c.stripNonDigits)
  const summary = {
    listed: entries.length,
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    patternMiss: 0,
    samples: { matched: [], unmatched: [], ambiguous: [], patternMiss: [] },
  }
  const classified = []

  for (const file of entries) {
    const parsed = matchFileName(file.fileName, c.namePattern)
    if (!parsed.ok) {
      summary.patternMiss += 1
      if (summary.samples.patternMiss.length < 15) {
        summary.samples.patternMiss.push({ name: file.fileName, reason: parsed.error })
      }
      classified.push({ file, status: 'patternMiss', reason: parsed.error })
      continue
    }

    const key = extractMatchKey(parsed.captures, c.matchToken, c.matchField, {
      stripNonDigits: c.stripNonDigits,
    })
    if (!key) {
      summary.unmatched += 1
      if (summary.samples.unmatched.length < 15) {
        summary.samples.unmatched.push({ name: file.fileName, reason: 'Captura vacía' })
      }
      classified.push({ file, status: 'unmatched', reason: 'Captura vacía' })
      continue
    }

    const hits = index.get(key) || []
    if (!hits.length) {
      summary.unmatched += 1
      if (summary.samples.unmatched.length < 15) {
        summary.samples.unmatched.push({
          name: file.fileName,
          matchKey: key,
          reason: `Sin usuario con ${c.matchField}=${key}`,
        })
      }
      classified.push({ file, status: 'unmatched', matchKey: key })
      continue
    }
    if (hits.length > 1) {
      summary.ambiguous += 1
      if (summary.samples.ambiguous.length < 15) {
        summary.samples.ambiguous.push({
          name: file.fileName,
          matchKey: key,
          users: hits.map((u) => u.usuario || String(u._id)),
        })
      }
      classified.push({ file, status: 'ambiguous', matchKey: key, users: hits })
      continue
    }

    const user = hits[0]
    const titulo =
      applyTemplate(c.tituloTemplate, parsed.captures) ||
      file.fileName.replace(/\.[^.]+$/, '') ||
      file.fileName
    summary.matched += 1
    if (summary.samples.matched.length < 15) {
      summary.samples.matched.push({
        name: file.fileName,
        matchKey: key,
        userId: String(user._id),
        usuario: user.usuario,
        titulo,
      })
    }
    classified.push({
      file,
      status: 'matched',
      user,
      matchKey: key,
      titulo,
      captures: parsed.captures,
    })
  }

  summary.skipped = summary.patternMiss + summary.unmatched + summary.ambiguous
  return { summary, classified, config: c }
}

/**
 * @param {{
 *   tenantId: import('mongoose').Types.ObjectId,
 *   buffer: Buffer,
 *   config?: object,
 *   useAi?: boolean,
 *   dryRun?: boolean,
 * }} opts
 */
export async function importZipPersonal({
  tenantId,
  buffer,
  config: configOverride,
  useAi = true,
  dryRun = false,
} = {}) {
  const tenant = await Tenant.findById(tenantId).select('docsDrop').lean()
  if (!tenant) return { ok: false, error: 'Tenant no encontrado' }

  const base = normalizeDocsDropConfig(tenant.docsDrop)
  const merged = normalizeDocsDropConfig({
    ...base,
    ...(configOverride && typeof configOverride === 'object' ? configOverride : {}),
    enabled: true,
  })

  const extracted = await extractDocEntriesFromZipBuffer(buffer)
  if (!extracted.ok) {
    return { ok: false, error: extracted.error || 'No se pudo leer el ZIP', skipped: extracted.skipped }
  }

  const users = await User.find({ tenantId, activo: true })
    .select('_id dni cuil idExterno usuario email nombre apellido')
    .lean()

  const { summary, classified, config } = classifyZipPersonalEntries(extracted.entries, users, merged)
  summary.zipSkipped = extracted.skipped
  summary.upserted = 0
  summary.dryRun = Boolean(dryRun)
  summary.useAi = useAi !== false
  summary.aiConfigured = documentsAiConfigured()
  summary.aiEnriched = 0
  summary.aiLlm = 0
  summary.aiHeuristic = 0

  const aiOn = useAi !== false
  const llmConfigured = documentsAiConfigured()
  let cats = []
  try {
    cats = (await DocItem.distinct('category', { tenantId })).map(String).filter(Boolean).slice(0, 60)
  } catch {
    cats = []
  }

  // 1) Metadatos rápidos (heurística / plantilla) — sin LLM para no bloquear
  const enriched = []
  for (const row of classified) {
    if (row.status !== 'matched') {
      enriched.push(row)
      continue
    }

    const { file, titulo: tituloFromTemplate } = row
    const mimeType = mimeFromName(file.fileName)
    const fileType = inferFileType({ mimeType, fileName: file.fileName })
    let draft
    if (aiOn) {
      draft = heuristicDocumentDraft({
        fileName: file.fileName,
        fileType,
        mimeType,
        categoryHint: config.category,
        textExcerpt: '',
        existingCategories: cats,
      })
      summary.aiHeuristic += 1
      summary.aiEnriched += 1
    } else {
      draft = {
        titulo: tituloFromTemplate,
        descripcion: `Import ZIP con patrón · ${file.relativePath}`,
        category: config.category,
        requiresSignature: false,
        fileType,
        source: 'manual',
      }
    }

    const mergedMeta = mergeZipPersonalAiDraft(
      {
        tituloFromTemplate,
        categoryFromConfig: config.category,
        fileName: file.fileName,
        relativePath: file.relativePath,
      },
      draft,
      { forceSignature: Boolean(config.requiresSignature) },
    )

    const sample = summary.samples.matched.find((s) => s.name === file.fileName)
    if (sample) {
      sample.titulo = mergedMeta.titulo
      sample.aiSource = mergedMeta.aiSource
      sample.category = mergedMeta.category
    }

    enriched.push({
      ...row,
      mimeType,
      fileType,
      ...mergedMeta,
    })
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      summary,
      config: {
        namePattern: config.namePattern,
        matchField: config.matchField,
        matchToken: config.matchToken,
      },
    }
  }

  // 2) Guardar matches ya
  const savedRows = []
  for (const row of enriched) {
    if (row.status !== 'matched') continue
    const {
      file,
      user,
      titulo,
      descripcion,
      category,
      requiresSignature: reqSig,
      mimeType,
      fileType,
    } = row
    const saved = saveUploadedBuffer(file.fileName, file.content)
    const ft =
      fileType ||
      inferFileType({ mimeType, fileName: file.fileName, fileUrl: saved.fileUrl })
    const status = config.publishOnMatch ? 'published' : 'draft'
    const pathHash = crypto.createHash('sha1').update(file.relativePath).digest('hex').slice(0, 16)
    const externalId = `zip:${pathHash}:${file.fileName}`

    const doc = await DocItem.findOneAndUpdate(
      { tenantId, source: 'zip', externalId },
      {
        $set: {
          titulo: String(titulo).slice(0, 200),
          descripcion: String(descripcion || '').slice(0, 4000),
          category: String(category || config.category || 'personal').slice(0, 200),
          fileUrl: saved.fileUrl,
          mimeType,
          fileType: ft,
          fileName: file.fileName,
          fileSize: file.size || 0,
          repository: 'server',
          storageKey: saved.storageKey,
          status,
          source: 'zip',
          externalId,
          requiresSignature: Boolean(reqSig),
          audience: {
            mode: 'users',
            areaIds: [],
            groupIds: [],
            userIds: [user._id],
          },
          authorName: 'Import ZIP con patrón',
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
    summary.upserted += 1
    savedRows.push({ row, doc })
  }

  // 3) Enriquecer con LLM (timeout) después de guardar
  if (aiOn && llmConfigured && savedRows.length) {
    let llmUsed = 0
    for (const { row, doc } of savedRows) {
      if (llmUsed >= AI_LLM_MAX) break
      try {
        const textExcerpt = await textExcerptFromEntry(row.file, row.mimeType)
        const draft = await draftDocumentFromFile({
          fileName: row.file.fileName,
          fileType: row.fileType,
          mimeType: row.mimeType,
          categoryHint: config.category,
          textExcerpt,
          existingCategories: cats,
          timeoutMs: 10000,
        })
        if (draft.source !== 'ai') continue
        llmUsed += 1
        summary.aiLlm += 1
        if (summary.aiHeuristic > 0) summary.aiHeuristic -= 1

        const mergedMeta = mergeZipPersonalAiDraft(
          {
            tituloFromTemplate: row.titulo,
            categoryFromConfig: config.category,
            fileName: row.file.fileName,
            relativePath: row.file.relativePath,
          },
          draft,
          { forceSignature: Boolean(config.requiresSignature) },
        )
        doc.titulo = mergedMeta.titulo
        doc.descripcion = mergedMeta.descripcion
        doc.category = mergedMeta.category
        doc.requiresSignature = Boolean(mergedMeta.requiresSignature)
        await doc.save()

        const sample = summary.samples.matched.find((s) => s.name === row.file.fileName)
        if (sample) {
          sample.titulo = mergedMeta.titulo
          sample.aiSource = 'ai'
          sample.category = mergedMeta.category
        }
      } catch {
        /* ya guardado */
      }
    }
  }

  return {
    ok: true,
    dryRun: false,
    summary,
    config: {
      namePattern: config.namePattern,
      matchField: config.matchField,
      matchToken: config.matchToken,
    },
  }
}
