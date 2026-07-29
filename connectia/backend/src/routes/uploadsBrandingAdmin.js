import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const router = Router()

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
    let ext = '.png'
    if (/^\.(jpe?g|png|webp|gif|svg)$/i.test(rawExt)) {
      ext = rawExt === '.jpeg' ? '.jpg' : rawExt
    } else if (/svg/i.test(file.mimetype || '')) {
      ext = '.svg'
    } else if (/jpeg|jpg/i.test(file.mimetype || '')) {
      ext = '.jpg'
    } else if (/webp/i.test(file.mimetype || '')) {
      ext = '.webp'
    } else if (/gif/i.test(file.mimetype || '')) {
      ext = '.gif'
    }
    const kind = String(_req.query?.kind || _req.body?.kind || 'brand').replace(/[^a-z0-9_-]/gi, '') || 'brand'
    const name = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|pjpeg|png|webp|gif|svg\+xml)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes jpg, png, webp, gif o svg'))
  },
})

/**
 * Sube 1 imagen de marca (logo, fondo login, splash).
 * multipart field: "file"
 * Respuesta: { url: '/uploads/...' }
 */
router.post(
  '/',
  requireAuth,
  requireCapability('admin.comunidad'),
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
    const url = toPublicMediaUrl(`/uploads/${req.file.filename}`)
    res.status(201).json({ url, filename: req.file.filename })
  },
)

export default router
