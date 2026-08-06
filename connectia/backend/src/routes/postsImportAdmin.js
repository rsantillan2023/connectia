import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireCapability } from '../middleware/auth.js'
import { Post } from '../models/Post.js'
import {
  parsePostImportFile,
  buildPostImportTemplateCsv,
  buildPostImportTemplateXlsx,
  validatePostImportRow,
} from '../lib/postImport.js'
import { recordActivity, reqMeta } from '../lib/activityLog.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

function parseUploaded(req) {
  if (req.file?.buffer) {
    return parsePostImportFile(req.file.buffer, req.file.originalname || '')
  }
  if (req.body?.csv) {
    return parsePostImportFile(String(req.body.csv), 'paste.csv')
  }
  return null
}

router.get('/template', requireAuth, requireCapability('admin.publicaciones'), (req, res) => {
  const format = String(req.query.format || 'xlsx').toLowerCase()
  if (format === 'csv') {
    const csv = buildPostImportTemplateCsv()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-publicaciones.csv"')
    return res.send(csv)
  }
  const buf = buildPostImportTemplateXlsx()
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-publicaciones.xlsx"')
  return res.send(Buffer.from(buf))
})

router.post(
  '/preview',
  requireAuth,
  requireCapability('admin.publicaciones'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const parsed = parseUploaded(req)
      if (!parsed) return res.status(400).json({ error: 'Archivo o CSV requerido' })
      const rows = parsed.items.map((item) => {
        const v = validatePostImportRow(item)
        return {
          row: item.row,
          ok: v.ok,
          errors: v.errors,
          data: v.data,
        }
      })
      const okCount = rows.filter((r) => r.ok).length
      res.json({
        format: parsed.format,
        total: rows.length,
        okCount,
        errorCount: rows.length - okCount,
        rows,
      })
    } catch (e) {
      next(e)
    }
  },
)

router.post(
  '/commit',
  requireAuth,
  requireCapability('admin.publicaciones'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const parsed = parseUploaded(req)
      if (!parsed) return res.status(400).json({ error: 'Archivo o CSV requerido' })

      const created = []
      const failed = []
      for (const item of parsed.items) {
        const v = validatePostImportRow(item)
        if (!v.ok) {
          failed.push({ row: item.row, errors: v.errors })
          continue
        }
        try {
          const d = v.data
          const status = d.status
          const p = await Post.create({
            tenantId: req.tenant._id,
            titulo: d.titulo,
            cuerpo: d.cuerpo,
            tipo: d.tipo,
            section: d.section,
            priority: d.priority,
            pinned: d.pinned,
            isKnowledge: d.isKnowledge,
            imageUrl: d.imageUrl,
            status,
            scheduledAt: status === 'scheduled' ? d.scheduledAt : null,
            publishedAt: status === 'published' ? new Date() : null,
            expiresAt: d.expiresAt,
            authorId: req.user._id,
            authorName: req.user.nombre || req.user.usuario,
            origin: 'admin',
            audience: { mode: 'all' },
          })
          created.push({ row: item.row, id: String(p._id), titulo: p.titulo, status: p.status })
        } catch (err) {
          failed.push({ row: item.row, errors: [err?.message || 'error al crear'] })
        }
      }

      await recordActivity({
        tenantId: req.tenant._id,
        userId: req.user._id,
        action: 'admin.post_import',
        meta: {
          created: created.length,
          failed: failed.length,
        },
        ...reqMeta(req),
      }).catch(() => {})

      res.json({
        created: created.length,
        failed: failed.length,
        items: created,
        errors: failed,
      })
    } catch (e) {
      next(e)
    }
  },
)

export default router
