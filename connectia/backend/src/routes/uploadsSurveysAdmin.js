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
    const name = `survey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext === '.jpeg' ? '.jpg' : ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes jpg, png, webp o gif'))
  },
})

router.post(
  '/',
  requireAuth,
  requireCapability('admin.encuestas'),
  (req, res, next) => {
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    const file = req.files?.file?.[0] || req.files?.files?.[0] || req.file
    if (!file) return res.status(400).json({ error: 'No se recibió archivo' })
    const url = toPublicMediaUrl(`/uploads/${file.filename}`)
    res.status(201).json({ url, urls: [url], count: 1 })
  },
)

export default router
