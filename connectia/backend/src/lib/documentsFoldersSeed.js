/**
 * Catálogo demo de documentos multicarpeta:
 * 2 docs por cada combinación tipo × estado (pdf/image/word/excel/powerpoint/text × published/draft/archived).
 */
import { DOC_FILE_TYPES } from './docTypes.js'

const PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const IMG_URL = 'https://picsum.photos/seed/connectia-doc/800/600'
const TXT_URL = 'https://www.w3.org/TR/PNG/iso_8859-1.txt'

const TYPE_META = {
  pdf: { mimeType: 'application/pdf', ext: 'pdf', fileUrl: PDF_URL },
  image: { mimeType: 'image/jpeg', ext: 'jpg', fileUrl: IMG_URL },
  word: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    fileUrl: PDF_URL,
  },
  excel: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    fileUrl: PDF_URL,
  },
  powerpoint: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: 'pptx',
    fileUrl: PDF_URL,
  },
  text: { mimeType: 'text/plain', ext: 'txt', fileUrl: TXT_URL },
}

/** Carpetas anidadas de demo (se rotan en el catálogo). */
export const DOC_SEED_FOLDERS = [
  'RRHH/Recibos',
  'RRHH/Políticas',
  'Legal/Contratos',
  'TI/Guías',
  'Comunicación/Novedades',
  'Compliance/Código de ética',
]

export const DOC_SEED_STATUSES = ['published', 'draft', 'archived']

export const DOC_SEED_TYPES = DOC_FILE_TYPES.map((t) => t.id).filter((id) => id !== 'other')

const STATUS_LABEL = {
  published: 'Publicado',
  draft: 'Borrador',
  archived: 'Archivado',
}

const TYPE_LABEL = Object.fromEntries(DOC_FILE_TYPES.map((t) => [t.id, t.label]))

/**
 * 2 documentos por cada tipo × estado → 6 tipos × 3 estados × 2 = 36.
 * @param {{ tenantId: import('mongoose').Types.ObjectId, authorName?: string }} opts
 */
export function buildMultifoldDocumentsSeed({ tenantId, authorName = 'Admin demo' }) {
  const audience = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
  const docs = []
  let n = 0

  for (const fileType of DOC_SEED_TYPES) {
    for (const status of DOC_SEED_STATUSES) {
      for (let copy = 1; copy <= 2; copy += 1) {
        const meta = TYPE_META[fileType] || TYPE_META.pdf
        const folder = DOC_SEED_FOLDERS[n % DOC_SEED_FOLDERS.length]
        const folderLeaf = folder.split('/').pop()
        const titulo = `${TYPE_LABEL[fileType] || fileType} · ${STATUS_LABEL[status]} ${copy}`
        const fileName = `demo-${fileType}-${status}-${copy}.${meta.ext}`
        docs.push({
          tenantId,
          titulo,
          descripcion: `Demo ${folderLeaf}: ${TYPE_LABEL[fileType]} en estado ${STATUS_LABEL[status]} (#${copy}).`,
          category: folder,
          fileUrl: meta.fileUrl,
          mimeType: meta.mimeType,
          fileType,
          fileName,
          fileSize: 12_000 + n * 137,
          repository: 'url',
          status,
          audience: { ...audience },
          origin: 'admin',
          source: 'seed-folders',
          externalId: `seed-folders:${fileType}:${status}:${copy}`,
          authorName,
          ...(status === 'published'
            ? { publishedAt: new Date(Date.now() - n * 3600_000) }
            : {}),
          downloadCount: status === 'published' ? n % 7 : 0,
          requiresSignature: fileType === 'pdf' && status === 'published' && copy === 1,
        })
        n += 1
      }
    }
  }

  return docs
}

/**
 * Upsert por externalId. No toca documentos que no sean de este seed.
 * @returns {{ created: number, updated: number, total: number }}
 */
export async function seedMultifoldDocuments(DocItem, { tenantId, authorName } = {}) {
  const docs = buildMultifoldDocumentsSeed({ tenantId, authorName })
  let created = 0
  let updated = 0
  for (const doc of docs) {
    const existing = await DocItem.findOne({ tenantId, externalId: doc.externalId }).select('_id').lean()
    await DocItem.findOneAndUpdate(
      { tenantId, externalId: doc.externalId },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    if (existing) updated += 1
    else created += 1
  }
  return { created, updated, total: docs.length }
}
