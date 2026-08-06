import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { inferFileType, extFromName, normalizeDocMime } from '../lib/docTypes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents')

const router = Router()

const ALLOWED_EXT = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.md',
])

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      ensureUploadDir()
      cb(null, UPLOAD_DIR)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const rawExt = path.extname(file.originalname || '').toLowerCase()
    const ext = ALLOWED_EXT.has(rawExt) ? rawExt : '.bin'
    const name = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_EXT.has(ext) || /^image\//i.test(file.mimetype) || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Usá PDF, imágenes, Word, Excel, PowerPoint o texto.'))
    }
  },
})

/**
 * Sube un archivo al servidor local (repositorio "server").
 * multipart field: "file"
 */
router.post(
  '/',
  requireAuth,
  requireCapability('admin.documentos'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió el archivo' })
    }
    const fileUrl = toPublicMediaUrl(`/uploads/documents/${req.file.filename}`)
    const fileName = req.file.originalname || req.file.filename
    const mimeType = normalizeDocMime({
      mimeType: req.file.mimetype || '',
      fileName,
      fileUrl,
    })
    const fileType = inferFileType({
      mimeType,
      fileName,
      fileUrl,
    })
    res.status(201).json({
      url: fileUrl,
      fileUrl,
      fileName,
      fileSize: req.file.size || 0,
      mimeType,
      fileType,
      extension: extFromName(fileName),
      repository: 'server',
      storageKey: `documents/${req.file.filename}`,
    })
  },
)

export default router
