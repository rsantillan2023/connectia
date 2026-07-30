import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { DocItem } from '../models/DocItem.js'
import { DocumentDownload } from '../models/DocumentDownload.js'
import { OrgArea } from '../models/OrgArea.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { channelFromUa } from '../lib/xlsxExport.js'
import {
  audienceFilterForUser,
  userMatchesAudience,
  serializeAudience,
  normalizeAudience,
} from '../lib/audience.js'
import {
  normalizeFileType,
  normalizeRepository,
  fileTypeLabel,
  repositoryLabel,
  inferFileType,
  extFromName,
} from '../lib/docTypes.js'
import { resolveDocumentDownload } from '../services/docStorage.js'
import { toPublicMediaUrl } from '../lib/mediaUrl.js'
import { startWorkflowForOrigin } from '../services/workflowRuntime.js'

const router = Router()
const ObjectId = mongoose.Types.ObjectId
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents')

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

const memberUpload = multer({
  storage: multer.diskStorage({
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
      cb(null, `doc-u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_EXT.has(ext) || /^image\//i.test(file.mimetype) || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido'))
    }
  },
})

async function resolveAudienceIds(tenantId, audience) {
  const a = normalizeAudience(audience)
  if (a.mode === 'all' || a.mode === 'none') {
    return { mode: a.mode, areaIds: [], groupIds: [], userIds: [] }
  }
  const areaIds = a.areaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const groupIds = a.groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const userIds = a.userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const [areas, users] = await Promise.all([
    areaIds.length ? OrgArea.find({ tenantId, _id: { $in: areaIds }, activo: true }).select('_id') : [],
    userIds.length ? User.find({ tenantId, _id: { $in: userIds }, activo: true }).select('_id') : [],
  ])
  if (a.mode === 'users') {
    return { mode: 'users', areaIds: [], groupIds: [], userIds: users.map((u) => u._id) }
  }
  return {
    mode: 'restricted',
    areaIds: areas.map((x) => x._id),
    groupIds: [],
    userIds: users.map((u) => u._id),
  }
}

function serializeDoc(d, userId = null) {
  const sigs = Array.isArray(d.signatures) ? d.signatures : []
  const signedByMe = userId
    ? sigs.some((s) => String(s.userId) === String(userId))
    : false
  const fileType = normalizeFileType(d.fileType, {
    mimeType: d.mimeType,
    fileName: d.fileName,
    fileUrl: d.fileUrl,
  })
  const repository =
    d.repository ||
    (d.source === 'sap' ? 'sap' : d.source === 'manual' && String(d.fileUrl || '').startsWith('/uploads')
      ? 'server'
      : 'url')
  return {
    id: String(d._id),
    titulo: d.titulo,
    descripcion: d.descripcion || '',
    category: d.category || 'general',
    fileUrl: d.fileUrl,
    mimeType: d.mimeType || '',
    fileType,
    fileTypeLabel: fileTypeLabel(fileType),
    fileName: d.fileName || '',
    fileSize: d.fileSize || 0,
    repository: normalizeRepository(repository),
    repositoryLabel: repositoryLabel(normalizeRepository(repository)),
    storageKey: d.storageKey || '',
    status: d.status,
    audience: serializeAudience(d.audience),
    downloadCount: d.downloadCount || 0,
    requiresSignature: Boolean(d.requiresSignature),
    signatureCount: sigs.length,
    signedByMe,
    source: d.source || 'manual',
    origin: d.origin || 'admin',
    authorName: d.authorName || '',
    authorId: d.authorId ? String(d.authorId) : '',
    publishedAt: d.publishedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const fileType = String(req.query.fileType || '').trim()
    const repository = String(req.query.repository || '').trim()
    const audienceClause = audienceFilterForUser(req.user)
    const filter = {
      tenantId: req.tenant._id,
      status: 'published',
      $and: [audienceClause],
    }
    if (category) filter.category = category
    if (fileType) filter.fileType = fileType
    if (repository) filter.repository = repository
    if (q) {
      filter.$and.push({
        $or: [
          { titulo: { $regex: q, $options: 'i' } },
          { descripcion: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { fileName: { $regex: q, $options: 'i' } },
        ],
      })
    }
    const [items, folderDocs] = await Promise.all([
      DocItem.find(filter).sort({ publishedAt: -1 }).lean(),
      DocItem.find({
        tenantId: req.tenant._id,
        status: 'published',
        $and: [audienceClause],
      })
        .select('category')
        .lean(),
    ])
    const serialized = items.map((d) => serializeDoc(d, req.user._id))

    const folderCounts = new Map()
    for (const d of folderDocs) {
      const key = String(d.category || 'general').trim() || 'general'
      folderCounts.set(key, (folderCounts.get(key) || 0) + 1)
    }
    const folders = [...folderCounts.entries()]
      .map(([name, count]) => ({
        id: name,
        name,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))

    res.json({
      items: serialized,
      categories: folders.map((f) => f.name),
      folders,
    })
  } catch (e) {
    next(e)
  }
})

/** Meta para publicar desde la app: áreas + personas. */
router.get('/publish-meta', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const areas = await OrgArea.find({ tenantId: req.tenant._id, activo: true })
      .select('_id nombre key')
      .sort({ orden: 1, nombre: 1 })
      .lean()
    const userFilter = { tenantId: req.tenant._id, activo: true, _id: { $ne: req.user._id } }
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      userFilter.$or = [{ nombre: rx }, { apellido: rx }, { usuario: rx }, { email: rx }]
    }
    const users = await User.find(userFilter)
      .select('nombre apellido usuario')
      .sort({ nombre: 1 })
      .limit(30)
      .lean()
    res.json({
      areas: areas.map((a) => ({ id: String(a._id), nombre: a.nombre, key: a.key || '' })),
      users: users.map((u) => ({
        id: String(u._id),
        nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || u.usuario,
        usuario: u.usuario,
      })),
      categoriesHint: ['general', 'políticas', 'comunicación', 'RRHH', 'TI'],
    })
  } catch (e) {
    next(e)
  }
})

/** Documentos propios en borrador / pendientes de aprobación. */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await DocItem.find({
      tenantId: req.tenant._id,
      authorId: req.user._id,
      origin: 'member',
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()
    res.json({
      items: items.map((d) => serializeDoc(d, req.user._id)),
    })
  } catch (e) {
    next(e)
  }
})

/** Subida de archivo desde la app (colaborador). */
router.post(
  '/upload',
  requireAuth,
  (req, res, next) => {
    memberUpload.single('file')(req, res, (err) => {
      if (err) {
        err.status = 400
        return next(err)
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió el archivo' })
    const fileUrl = toPublicMediaUrl(`/uploads/documents/${req.file.filename}`)
    const fileName = req.file.originalname || req.file.filename
    const mimeType = req.file.mimetype || ''
    const fileType = inferFileType({ mimeType, fileName, fileUrl })
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

/**
 * Publicar documento desde la app → siempre draft + workflow de aprobación.
 * Audiencia: empresa (all) | área (restricted) | persona (users).
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    const titulo = String(body.titulo || '').trim().slice(0, 200)
    const fileUrl = String(body.fileUrl || '').trim()
    if (!titulo || !fileUrl) {
      return res.status(400).json({ error: 'Título y archivo son requeridos' })
    }

    let audienceRaw = body.audience || { mode: 'all' }
    const target = String(body.target || '').toLowerCase()
    if (target === 'empresa' || target === 'all') audienceRaw = { mode: 'all' }
    if (target === 'area') {
      const areaId = String(body.areaId || audienceRaw.areaIds?.[0] || '').trim()
      if (!areaId) return res.status(400).json({ error: 'Elegí un área' })
      audienceRaw = { mode: 'restricted', areaIds: [areaId], groupIds: [], userIds: [] }
    }
    if (target === 'persona' || target === 'user' || target === 'users') {
      const userId = String(body.userId || audienceRaw.userIds?.[0] || '').trim()
      if (!userId) return res.status(400).json({ error: 'Elegí una persona' })
      audienceRaw = { mode: 'users', areaIds: [], groupIds: [], userIds: [userId] }
    }

    const audience = await resolveAudienceIds(req.tenant._id, audienceRaw)
    if (audience.mode === 'restricted' && !audience.areaIds.length) {
      return res.status(400).json({ error: 'Elegí un área válida' })
    }
    if (audience.mode === 'users' && !audience.userIds.length) {
      return res.status(400).json({ error: 'Elegí una persona válida' })
    }

    const fileName = String(body.fileName || '').trim().slice(0, 260)
    const mimeType = String(body.mimeType || '').trim()
    const fileType = normalizeFileType(body.fileType, { mimeType, fileName, fileUrl })
    const authorName = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || req.user.usuario

    const doc = await DocItem.create({
      tenantId: req.tenant._id,
      titulo,
      descripcion: String(body.descripcion || '').trim().slice(0, 4000),
      category: String(body.category || 'general').trim().slice(0, 80) || 'general',
      fileUrl,
      mimeType,
      fileType,
      fileName,
      fileSize: Math.max(0, Number(body.fileSize) || 0),
      repository: 'server',
      storageKey: String(body.storageKey || '').trim().slice(0, 500),
      status: 'draft',
      audience,
      origin: 'member',
      source: 'manual',
      authorId: req.user._id,
      authorName,
      publishedAt: null,
      requiresSignature: false,
    })

    let workflow = null
    try {
      workflow = await startWorkflowForOrigin({
        tenantId: req.tenant._id,
        module: 'documentos',
        refId: doc._id,
        titulo: doc.titulo,
        codigo: '',
        tipoKey: doc.category || '',
        solicitanteId: req.user._id,
        solicitanteName: authorName,
      })
    } catch (wfErr) {
      console.warn('[workflow] member doc', wfErr?.message || wfErr)
    }

    res.status(201).json({
      document: serializeDoc(doc, req.user._id),
      workflowStarted: Boolean(workflow),
      message: workflow
        ? 'Documento enviado a aprobación. Cuando lo aprueben, se publicará para la audiencia elegida.'
        : 'Documento guardado en borrador. No hay un flujo de documentos activo: un gestor debe publicarlo o activar el workflow.',
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const doc = await DocItem.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc || doc.status !== 'published' || !userMatchesAudience(req.user, doc.audience)) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }
    if (doc.requiresSignature) {
      const signed = (doc.signatures || []).some((s) => String(s.userId) === String(req.user._id))
      if (!signed) {
        return res.status(403).json({ error: 'Debés firmar el documento antes de descargarlo' })
      }
    }
    doc.downloadCount = (doc.downloadCount || 0) + 1
    const log = Array.isArray(doc.downloads) ? doc.downloads : []
    log.push({ userId: req.user._id, at: new Date() })
    doc.downloads = log.slice(-200)
    await doc.save()
    // Log escalable para reportes §29.11
    DocumentDownload.create({
      tenantId: req.tenant._id,
      docId: doc._id,
      userId: req.user._id,
      titulo: doc.titulo || '',
      fileType: doc.fileType || 'other',
      result: 'ok',
      channel: channelFromUa(req.headers['user-agent'] || ''),
      ip: String(req.ip || req.headers['x-forwarded-for'] || '').slice(0, 80),
    }).catch(() => {})
    const resolved = resolveDocumentDownload(doc)
    res.json({
      fileUrl: resolved.fileUrl || doc.fileUrl,
      downloadCount: doc.downloadCount,
      repository: resolved.repository,
      fileType: doc.fileType || 'other',
      fileName: doc.fileName || '',
    })
  } catch (e) {
    next(e)
  }
})

/** Firma simple con nombre tipeado + evidencia mínima (17.03). */
router.post('/:id/sign', requireAuth, async (req, res, next) => {
  try {
    const doc = await DocItem.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    if (!doc || doc.status !== 'published' || !userMatchesAudience(req.user, doc.audience)) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }
    if (!doc.requiresSignature) {
      return res.status(400).json({ error: 'Este documento no requiere firma' })
    }
    if ((doc.signatures || []).some((s) => String(s.userId) === String(req.user._id))) {
      return res.status(409).json({ error: 'Ya firmaste este documento' })
    }
    const fullNameTyped = String(req.body?.fullNameTyped || '').trim().slice(0, 120)
    if (fullNameTyped.length < 3) {
      return res.status(400).json({ error: 'Escribí tu nombre completo para firmar' })
    }
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 80)
    doc.signatures = doc.signatures || []
    doc.signatures.push({
      userId: req.user._id,
      fullNameTyped,
      signedAt: new Date(),
      ip,
    })
    await doc.save()
    res.status(201).json({
      ok: true,
      document: serializeDoc(doc.toObject(), req.user._id),
    })
  } catch (e) {
    next(e)
  }
})

export { serializeDoc }
export default router
