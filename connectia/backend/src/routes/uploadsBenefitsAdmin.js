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
    const ext = /^\.(jpe?g|png|webp|gif)$/i.test(rawExt) ? rawExt.replace('jpeg', 'jpg') : '.jpg'
    const name = `benefit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext === '.jpeg' ? '.jpg' : ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes jpg, png, webp o gif'))
  },
})

router.post(
  '/',
  requireAuth,
  requireCapability('admin.beneficios'),
  (req, res, next) => {
    upload.array('files', 4)(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    const files = Array.isArray(req.files) ? req.files : []
    if (!files.length) return res.status(400).json({ error: 'No se recibieron archivos' })
    const urls = files.map((f) => toPublicMediaUrl(`/uploads/${f.filename}`))
    res.status(201).json({ urls, url: urls[0] || '', count: urls.length })
  },
)

export default router
