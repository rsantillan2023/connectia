import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

const IMAGE_MIME = /^image\/(jpeg|pjpeg|png|webp|gif)$/i
const VIDEO_MIME = /^video\/(mp4|webm|quicktime|x-m4v)$/i
const MAX_FILES = 12
const MAX_SIZE = 40 * 1024 * 1024

const router = Router()

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function extForFile(file) {
  const rawExt = path.extname(file.originalname || '').toLowerCase()
  if (IMAGE_MIME.test(file.mimetype)) {
    if (/^\.(jpe?g|png|webp|gif)$/i.test(rawExt)) return rawExt.replace('jpeg', 'jpg')
    return '.jpg'
  }
  if (VIDEO_MIME.test(file.mimetype)) {
    if (/^\.(mp4|webm|mov|m4v)$/i.test(rawExt)) return rawExt === '.mov' ? '.mov' : rawExt
    if (/quicktime/i.test(file.mimetype)) return '.mov'
    if (/webm/i.test(file.mimetype)) return '.webm'
    return '.mp4'
  }
  return '.bin'
}

function kindForMime(mime) {
  if (VIDEO_MIME.test(mime)) return 'video'
  if (IMAGE_MIME.test(mime)) return 'image'
  return 'file'
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
    const ext = extForFile(file)
    const name = `survey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter(_req, file, cb) {
    if (IMAGE_MIME.test(file.mimetype) || VIDEO_MIME.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif) o videos (mp4, webm, mov)'))
  },
})

router.post(
  '/',
  requireAuth,
  requireCapability('admin.encuestas'),
  (req, res, next) => {
    upload.fields([
      { name: 'file', maxCount: MAX_FILES },
      { name: 'files', maxCount: MAX_FILES },
    ])(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    const list = [
      ...(req.files?.file || []),
      ...(req.files?.files || []),
      ...(req.file ? [req.file] : []),
    ]
    if (!list.length) return res.status(400).json({ error: 'No se recibió archivo' })

    const items = list.map((f) => {
      const url = toPublicMediaUrl(`/uploads/${f.filename}`)
      return { url, kind: kindForMime(f.mimetype) }
    })
    const urls = items.map((i) => i.url)
    const kinds = items.map((i) => i.kind)
    const kind = kinds.length === 1 ? kinds[0] : kinds.includes('video') ? 'mixed' : 'image'
    res.status(201).json({
      url: urls[0],
      urls,
      kinds,
      kind,
      count: urls.length,
      items,
    })
  },
)

export default router
